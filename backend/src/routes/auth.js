import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimiter.js';
import { 
  validateLogin, 
  validateChangePassword
} from '../validators/authValidators.js';
import userRoutes from './users.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', authRateLimit, validateLogin, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Private
 */
router.put('/change-password', authenticateToken, validateChangePassword, authController.changePassword);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario actual
 * @access  Private
 */
router.get('/me', authenticateToken, authController.me);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de acceso
 * @access  Public (con refresh token válido)
 */
router.post('/refresh', authRateLimit, authController.refreshToken);

/**
 * @route   GET /api/auth/check-email
 * @desc    Verificar disponibilidad de email
 * @access  Public
 */
// Alias para compatibilidad con frontend
router.get('/validar-email', authRateLimit, async (req, res) => {
  try {
    const { email, exclude_id } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM vetplus_auth.usuarios WHERE email = $1';
    let queryParams = [email];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const emailExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !emailExists
    });
  } catch (error) {
    console.error('Error validando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/auth/check-email
 * @desc    Verificar disponibilidad de email
 * @access  Public
 */
router.get('/check-email', authRateLimit, async (req, res) => {
  try {
    const { email, exclude_id } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM vetplus_auth.usuarios WHERE email = $1';
    let queryParams = [email];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const emailExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !emailExists
    });
  } catch (error) {
    console.error('Error validando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/auth/check-documento
 * @desc    Verificar disponibilidad de documento
 * @access  Public
 */
// Alias para compatibilidad con frontend
router.get('/validar-documento', authRateLimit, async (req, res) => {
  try {
    const { documento, exclude_id } = req.query;
    
    if (!documento) {
      return res.status(400).json({
        success: false,
        message: 'Documento es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM vetplus_auth.usuarios WHERE documento = $1';
    let queryParams = [documento];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const documentoExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !documentoExists
    });
  } catch (error) {
    console.error('Error validando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/auth/check-documento
 * @desc    Verificar disponibilidad de documento
 * @access  Public
 */
router.get('/check-documento', authRateLimit, async (req, res) => {
  try {
    const { documento, exclude_id } = req.query;
    
    if (!documento) {
      return res.status(400).json({
        success: false,
        message: 'Documento es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM vetplus_auth.usuarios WHERE documento = $1';
    let queryParams = [documento];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const documentoExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !documentoExists
    });
  } catch (error) {
    console.error('Error validando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/auth/admin/generate-temp-password
 * @desc    Generar contraseña temporal (alias para compatibilidad frontend)
 * @access  Private (solo admin)
 */
router.post('/admin/generate-temp-password', 
    authenticateToken, 
    (req, res, next) => {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden resetear contraseñas'
            });
        }
        next();
    },
    async (req, res) => {
        const { userId, motivo } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId es requerido'
            });
        }

        // Importar controlador dinámicamente
        const passwordResetController = await import('../controllers/passwordResetController.js');
        
        // Configurar el body para el controlador
        req.body.userId = userId;
        req.body.motivo = motivo || 'Reset desde panel admin';
        
        // Llamar al método del controlador
        passwordResetController.default.generateTempPassword(req, res);
    }
);

// ===============================
// SESIONES ACTIVAS
// ===============================

function parseDevice(userAgent) {
    if (!userAgent) return 'Desconocido';
    if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'Móvil';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Escritorio';
}

function parseBrowser(userAgent) {
    if (!userAgent) return 'Desconocido';
    if (/edg\//i.test(userAgent)) return 'Edge';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/opera|opr\//i.test(userAgent)) return 'Opera';
    return 'Otro';
}

/**
 * @route   GET /api/auth/sesiones-activas
 * @desc    Obtener sesiones activas (historial de logins recientes)
 * @access  Private (solo admin)
 */
router.get('/sesiones-activas',
    authenticateToken,
    authorize(['admin']),
    async (req, res) => {
        try {
            const tenantId = req.tenantId ?? req.user?.tenant_id;
            const { id_usuario } = req.query;
            const { query: dbQuery } = await import('../config/database.js');

            let sql = `
                SELECT
                    sa.id_session AS id_sesion,
                    sa.id_usuario,
                    u.nombre || ' ' || COALESCE(u.apellido, '') AS usuario_nombre,
                    sa.ip_address::text AS ip_address,
                    sa.user_agent,
                    sa.timestamp AS fecha_inicio,
                    sa.timestamp AS ultima_actividad
                FROM system.session_audit sa
                JOIN vetplus_auth.usuarios u ON sa.id_usuario = u.id_usuario
                WHERE u.id_tenant = $1
                  AND sa.tipo_evento = 'LOGIN'
                  AND sa.exito = true
            `;
            const values = [tenantId];

            if (id_usuario) {
                sql += ` AND sa.id_usuario = $2`;
                values.push(id_usuario);
            }

            sql += ` ORDER BY sa.timestamp DESC LIMIT 100`;

            const result = await dbQuery(sql, values);

            const sessions = result.rows.map(row => ({
                id_sesion: row.id_sesion,
                id_usuario: row.id_usuario,
                usuario_nombre: row.usuario_nombre.trim(),
                ip_address: row.ip_address || 'Desconocida',
                user_agent: row.user_agent || '',
                ubicacion: null,
                fecha_inicio: row.fecha_inicio,
                ultima_actividad: row.ultima_actividad,
                dispositivo: parseDevice(row.user_agent),
                navegador: parseBrowser(row.user_agent),
                activa: true
            }));

            res.json({ success: true, data: sessions });
        } catch (error) {
            console.error('Error obteniendo sesiones activas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   DELETE /api/auth/sesiones/:id
 * @desc    Cerrar una sesión específica
 * @access  Private (solo admin)
 */
router.delete('/sesiones/:id',
    authenticateToken,
    authorize(['admin']),
    async (req, res) => {
        try {
            const tenantId = req.tenantId ?? req.user?.tenant_id;
            const { id } = req.params;
            const { query: dbQuery } = await import('../config/database.js');

            // Verify the session belongs to a user of this tenant
            const check = await dbQuery(`
                SELECT sa.id_usuario
                FROM system.session_audit sa
                JOIN vetplus_auth.usuarios u ON sa.id_usuario = u.id_usuario
                WHERE sa.id_session = $1 AND u.id_tenant = $2
            `, [id, tenantId]);

            if (check.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sesión no encontrada'
                });
            }

            // Insert FORCE_LOGOUT event to mark the session as closed
            await dbQuery(`
                INSERT INTO system.session_audit (id_usuario, tipo_evento, exito, ip_address, detalles)
                VALUES ($1, 'FORCE_LOGOUT', true, $2::inet, $3)
            `, [
                check.rows[0].id_usuario,
                req.ip || '0.0.0.0',
                JSON.stringify({ closed_by: req.user.id, original_session: id })
            ]);

            res.json({ success: true, message: 'Sesión cerrada exitosamente' });
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   DELETE /api/auth/usuarios/:id/sesiones
 * @desc    Cerrar todas las sesiones de un usuario
 * @access  Private (solo admin)
 */
router.delete('/usuarios/:id/sesiones',
    authenticateToken,
    authorize(['admin']),
    async (req, res) => {
        try {
            const tenantId = req.tenantId ?? req.user?.tenant_id;
            const { id } = req.params;
            const { query: dbQuery } = await import('../config/database.js');

            // Verify user belongs to this tenant
            const check = await dbQuery(
                'SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_usuario = $1 AND id_tenant = $2',
                [id, tenantId]
            );

            if (check.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Insert FORCE_LOGOUT event for all sessions
            await dbQuery(`
                INSERT INTO system.session_audit (id_usuario, tipo_evento, exito, ip_address, detalles)
                VALUES ($1, 'FORCE_LOGOUT', true, $2::inet, $3)
            `, [
                id,
                req.ip || '0.0.0.0',
                JSON.stringify({ closed_by: req.user.id, closed_all: true, timestamp: new Date() })
            ]);

            res.json({ success: true, message: 'Todas las sesiones han sido cerradas' });
        } catch (error) {
            console.error('Error cerrando sesiones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Usar rutas de usuarios como sub-rutas
router.use('/users', userRoutes);

export default router;
