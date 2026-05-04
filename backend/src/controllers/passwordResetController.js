import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Controlador para reset de contraseñas por administrador
 */
class PasswordResetController {

  /**
   * Generar contraseña temporal para un usuario (solo admin)
   */
  async generateTempPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { userId, motivo } = req.body;
      const adminId = req.user.id_usuario;

      // Verificar que el usuario objetivo existe
      const userResult = await query(
        'SELECT id_usuario, nombre, email, rol, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const targetUser = userResult.rows[0];

      if (!targetUser.activo) {
        return res.status(400).json({
          success: false,
          message: 'No se puede resetear la contraseña de un usuario inactivo',
          error: 'USER_INACTIVE'
        });
      }

      // Generar contraseña temporal (8 caracteres: letras + números)
      const tempPassword = generateSecurePassword();
      
      // Hashear la contraseña temporal
      const saltRounds = 12;
      const tempPasswordHash = await bcrypt.hash(tempPassword, saltRounds);

      // Actualizar contraseña y marcar como temporal
      await query(`
        UPDATE vetplus_auth.usuarios 
        SET 
          password_hash = $1,
          password_temporal = true,
          password_reset_date = CURRENT_TIMESTAMP,
          password_reset_by = $2,
          intentos_login = 0,
          bloqueado_hasta = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_usuario = $3
      `, [tempPasswordHash, adminId, userId]);

      // Log de auditoría
      await logPasswordReset(adminId, userId, 'temp_password', req.ip);

      console.log(`🔑 Contraseña temporal generada para ${targetUser.email} por admin ${req.user.email}`);

      res.json({
        success: true,
        message: `Contraseña temporal generada para ${targetUser.nombre}`,
        data: {
          user: {
            id: targetUser.id_usuario,
            nombre: targetUser.nombre,
            email: targetUser.email
          },
          tempPassword: tempPassword,
          expiresIn: '24 horas',
          mustChangeOnLogin: true,
          email: {
            attempted: true,
            sent: false,
            status: 'not_configured',
            message: 'Envio por email pendiente de configuracion SMTP'
          }
        }
      });

    } catch (error) {
      console.error('Error generando contraseña temporal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Resetear contraseña directamente (solo admin)
   */
  async adminResetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { userId, newPassword, motivo, forceChange = true } = req.body;
      const adminId = req.user.id_usuario;

      // Verificar que el usuario objetivo existe
      const userResult = await query(
        'SELECT id_usuario, nombre, email, rol, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const targetUser = userResult.rows[0];

      if (!targetUser.activo) {
        return res.status(400).json({
          success: false,
          message: 'No se puede resetear la contraseña de un usuario inactivo',
          error: 'USER_INACTIVE'
        });
      }

      // Hashear la nueva contraseña
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await query(`
        UPDATE vetplus_auth.usuarios 
        SET 
          password_hash = $1,
          password_temporal = $2,
          password_reset_date = CURRENT_TIMESTAMP,
          password_reset_by = $3,
          intentos_login = 0,
          bloqueado_hasta = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_usuario = $4
      `, [newPasswordHash, forceChange, adminId, userId]);

      // Log de auditoría
      await logPasswordReset(adminId, userId, 'admin_reset', req.ip);

      console.log(`🔑 Contraseña reseteada para ${targetUser.email} por admin ${req.user.email}`);

      res.json({
        success: true,
        message: `Contraseña actualizada para ${targetUser.nombre}`,
        data: {
          user: {
            id: targetUser.id_usuario,
            nombre: targetUser.nombre,
            email: targetUser.email
          },
          mustChangeOnLogin: forceChange
        }
      });

    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener historial de resets de contraseña
   */
  async getPasswordResetHistory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { limit = 50, offset = 0, tipo, startDate, endDate } = req.query;

      let query_text = `
        SELECT 
          pr.id,
          pr.id_usuario,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          pr.tipo_reset,
          pr.motivo,
          pr.realizado_por,
          admin_user.nombre as admin_nombre,
          pr.completado,
          pr.created_at,
          pr.completed_at
        FROM vetplus_auth.password_resets pr
        LEFT JOIN vetplus_auth.usuarios u ON pr.id_usuario = u.id_usuario
        LEFT JOIN vetplus_auth.usuarios admin_user ON pr.realizado_por = admin_user.id_usuario
        WHERE 1=1
      `;

      const queryParams = [];
      let paramIndex = 1;

      // Filtrar por usuario específico si se proporciona
      if (userId) {
        query_text += ` AND pr.id_usuario = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }

      // Filtrar por tipo si se proporciona
      if (tipo) {
        query_text += ` AND pr.tipo_reset = $${paramIndex}`;
        queryParams.push(tipo);
        paramIndex++;
      }

      // Filtrar por fecha de inicio
      if (startDate) {
        query_text += ` AND pr.created_at >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      // Filtrar por fecha de fin
      if (endDate) {
        query_text += ` AND pr.created_at <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      // Ordenar y paginar
      query_text += ` ORDER BY pr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));

      const result = await query(query_text, queryParams);

      // Obtener conteo total para paginación
      let countQuery = `
        SELECT COUNT(*) as total
        FROM vetplus_auth.password_resets pr
        WHERE 1=1
      `;
      const countParams = [];
      let countIndex = 1;

      if (userId) {
        countQuery += ` AND pr.id_usuario = $${countIndex}`;
        countParams.push(userId);
        countIndex++;
      }

      if (tipo) {
        countQuery += ` AND pr.tipo_reset = $${countIndex}`;
        countParams.push(tipo);
        countIndex++;
      }

      if (startDate) {
        countQuery += ` AND pr.created_at >= $${countIndex}`;
        countParams.push(startDate);
        countIndex++;
      }

      if (endDate) {
        countQuery += ` AND pr.created_at <= $${countIndex}`;
        countParams.push(endDate);
        countIndex++;
      }

      const countResult = await query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        message: 'Historial obtenido exitosamente',
        data: {
          resets: result.rows,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }  /**
   * Marcar que el usuario debe cambiar contraseña en próximo login
   */
  async forcePasswordChange(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id_usuario;

      // Verificar que el usuario existe
      const userResult = await query(
        'SELECT id_usuario, nombre, email FROM vetplus_auth.usuarios WHERE id_usuario = $1 AND activo = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const targetUser = userResult.rows[0];

      // Marcar contraseña como temporal (forzar cambio)
      await query(`
        UPDATE vetplus_auth.usuarios 
        SET 
          password_temporal = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_usuario = $1
      `, [userId]);

      // Log de auditoría
      await logPasswordReset(adminId, userId, 'force_change', req.ip);

      res.json({
        success: true,
        message: `${targetUser.nombre} deberá cambiar su contraseña en el próximo login`,
        data: {
          user: {
            id: targetUser.id_usuario,
            nombre: targetUser.nombre,
            email: targetUser.email
          }
        }
      });

    } catch (error) {
      console.error('Error forzando cambio de contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

/**
 * Generar contraseña segura de 8 caracteres
 */
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

/**
 * Registrar reset de contraseña en auditoría
 */
async function logPasswordReset(adminId, targetUserId, action, ipAddress) {
  try {
    await query(`
      INSERT INTO vetplus_auth.password_resets 
      (id_usuario, tipo_reset, realizado_por, motivo, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [targetUserId, action, adminId, `Password reset from IP: ${ipAddress}`]);
  } catch (error) {
    console.error('Error logging password reset:', error);
  }
}

export default new PasswordResetController();
