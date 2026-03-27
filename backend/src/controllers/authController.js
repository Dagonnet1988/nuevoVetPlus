import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator/lib/index.js';

/**
 * Controlador de autenticación
 */
class AuthController {
  
  /**
   * Login de usuario
   */
  async login(req, res) {
    try {
      // Verificar validaciones
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { documento, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Buscar usuario por documento
      const userResult = await query(
        'SELECT id_usuario, id_tenant, nombre, apellido, email, documento, password_hash, rol, activo, intentos_login, bloqueado_hasta, password_temporal, debe_cambiar_password FROM vetplus_auth.usuarios WHERE documento = $1',
        [documento]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
          error: 'INVALID_CREDENTIALS'
        });
      }

      const user = userResult.rows[0];

      // Verificar si el usuario está activo
      if (!user.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado',
          error: 'USER_DISABLED'
        });
      }

      // Verificar si el usuario está bloqueado
      if (user.bloqueado_hasta && new Date() < new Date(user.bloqueado_hasta)) {
        const minutosRestantes = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Usuario bloqueado temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
          error: 'USER_LOCKED',
          bloqueado_hasta: user.bloqueado_hasta,
          minutos_restantes: minutosRestantes
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        // DESARROLLO: Rate limiting más permisivo
        const nuevosIntentos = (user.intentos_login || 0) + 1;
        const bloqueadoHasta = nuevosIntentos >= 50  // Aumentado de 5 a 50 intentos
          ? new Date(Date.now() + 2 * 60 * 1000)     // Reducido de 15 a 2 minutos
          : null;

        await query(
          'UPDATE vetplus_auth.usuarios SET intentos_login = $1, bloqueado_hasta = $2 WHERE id_usuario = $3',
          [nuevosIntentos, bloqueadoHasta, user.id_usuario]
        );

        // Log de intento fallido (simplificado)
        console.log(`⚠️  Login fallido para ${documento} desde IP ${ip} (Intento ${nuevosIntentos}/50)`);

        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
          error: 'INVALID_CREDENTIALS',
          intentos_restantes: Math.max(0, 50 - nuevosIntentos)
        });
      }

      // Login exitoso - resetear intentos
      await query(
        'UPDATE vetplus_auth.usuarios SET intentos_login = 0, bloqueado_hasta = NULL, ultimo_login = CURRENT_TIMESTAMP WHERE id_usuario = $1',
        [user.id_usuario]
      );

      // Verificar si debe cambiar contraseña
      const needsPasswordChange = user.debe_cambiar_password || user.password_temporal;

      // Generar tokens JWT
      const token = generateToken({
        id_usuario: user.id_usuario,
        id_tenant: user.id_tenant,
        email: user.email,
        documento: user.documento,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol
      });

      const refreshToken = generateRefreshToken({
        id_usuario: user.id_usuario,
        email: user.email
      });

      // Log de login exitoso (simplificado)
      console.log(`✅ Login exitoso para ${user.documento} (${user.email}) desde IP ${ip}`);

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          refreshToken,
          user: {
            id: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            documento: user.documento,
            rol: user.rol
          },
          must_change_password: needsPasswordChange
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
    * Logout de usuario
    */
   async logout(req, res) {
     try {
       const authHeader = req.headers['authorization'];
       const token = authHeader && authHeader.split(' ')[1];

       if (token) {
         // Agregar token a blacklist
         await query(
           'INSERT INTO vetplus_auth.blacklisted_tokens (token, id_usuario, razon) VALUES ($1, $2, $3)',
           [token, req.user?.id_usuario, 'logout']
         );

         // Log de logout (simplificado)
         if (req.user) {
           console.log(`👋 Logout exitoso para usuario ${req.user.email}`);
         }
       }

       res.json({
         success: true,
         message: 'Logout exitoso'
       });

     } catch (error) {
       console.error('Error en logout:', error);
       res.status(500).json({
         success: false,
         message: 'Error interno del servidor',
         error: 'INTERNAL_ERROR'
       });
     }
   }

   /**
    * Refresh token - genera un nuevo token de acceso
    */
   async refreshToken(req, res) {
     try {
       const { refreshToken } = req.body;

       if (!refreshToken) {
         return res.status(400).json({
           success: false,
           message: 'Refresh token requerido',
           error: 'MISSING_REFRESH_TOKEN'
         });
       }

       // Verificar refresh token
       const decoded = verifyRefreshToken(refreshToken);

       // Verificar que el usuario existe y está activo
       const userResult = await query(
         'SELECT id_usuario, id_tenant, nombre, apellido, email, documento, rol, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
         [decoded.id]
       );

       if (userResult.rows.length === 0) {
         return res.status(401).json({
           success: false,
           message: 'Usuario no encontrado',
           error: 'USER_NOT_FOUND'
         });
       }

       const user = userResult.rows[0];

       if (!user.activo) {
         return res.status(401).json({
           success: false,
           message: 'Usuario desactivado',
           error: 'USER_DISABLED'
         });
       }

       // Generar nuevo token de acceso
       const newToken = generateToken({
         id_usuario: user.id_usuario,
         id_tenant: user.id_tenant,
         email: user.email,
         documento: user.documento,
         nombre: user.nombre,
         apellido: user.apellido,
         rol: user.rol
       });

       // Opcional: generar nuevo refresh token
       const newRefreshToken = generateRefreshToken({
         id_usuario: user.id_usuario,
         email: user.email
       });

       console.log(`🔄 Token refrescado para usuario ${user.email}`);

       res.json({
         success: true,
         message: 'Token refrescado exitosamente',
         data: {
           token: newToken,
           refreshToken: newRefreshToken
         }
       });

     } catch (error) {
       console.error('Error en refresh token:', error);

       if (error.message === 'Refresh token inválido o expirado') {
         return res.status(401).json({
           success: false,
           message: error.message,
           error: 'INVALID_REFRESH_TOKEN'
         });
       }

       res.status(500).json({
         success: false,
         message: 'Error interno del servidor',
         error: 'INTERNAL_ERROR'
       });
     }
   }

  /**
   * Obtener información del usuario actual
   */
  async me(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }

      // Obtener información actualizada del usuario
      const userResult = await query(
        'SELECT id_usuario, nombre, email, rol, activo, ultimo_login, created_at FROM vetplus_auth.usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const user = userResult.rows[0];

      res.json({
        success: true,
        data: {
          id: user.id_usuario,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          activo: user.activo,
          ultimo_login: user.ultimo_login,
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error('Error en obtener usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Obtener información del usuario incluyendo flags de password temporal
      const userResult = await query(
        'SELECT password_hash, password_temporal, debe_cambiar_password FROM vetplus_auth.usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const user = userResult.rows[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta',
          error: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hashear nueva contraseña
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y limpiar flags de password temporal
      await query(
        `UPDATE vetplus_auth.usuarios 
         SET password_hash = $1, 
             password_temporal = false, 
             debe_cambiar_password = false,
             password_reset_date = NULL,
             password_reset_by = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id_usuario = $2`,
        [newPasswordHash, req.user.id_usuario]
      );

      // Registrar el cambio en el historial si era una contraseña temporal
      if (user.password_temporal || user.debe_cambiar_password) {
        await query(
          `INSERT INTO vetplus_auth.password_resets 
           (id_usuario, tipo_reset, realizado_por, motivo, completado, completed_at) 
           VALUES ($1, 'user_change', $1, 'Cambio de contraseña temporal', true, CURRENT_TIMESTAMP)`,
          [req.user.id_usuario]
        );
      }

      // Log de cambio de contraseña (simplificado)
      console.log(`🔑 Cambio de contraseña exitoso para usuario ${req.user.email}`);

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error en cambio de contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default new AuthController();
