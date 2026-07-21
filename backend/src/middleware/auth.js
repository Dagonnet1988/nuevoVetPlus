import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

// Configuración JWT — fail-fast en producción si no hay secreto configurado
const _jwtSecret = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] JWT_SECRET no está configurada. El servidor no puede iniciar en producción sin esta variable de entorno.');
  }
  console.warn('[WARN] JWT_SECRET no configurada. Usando clave de desarrollo. NUNCA usar en producción.');
  return 'vetplus_dev_only_secret_do_not_use_in_prod';
})();

const JWT_CONFIG = {
  secret: _jwtSecret,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '12h',
  issuer: 'VetPlus',
  audience: 'vetplus-users'
};

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Datos del usuario
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  const sessionKey = randomUUID();
  const payload = {
    id: user.id_usuario,
    email: user.email,
    rol: user.rol,
    nombre: user.nombre,
    tenant_id: user.id_tenant,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_CONFIG.secret, {
    jwtid: sessionKey,
    expiresIn: JWT_CONFIG.expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
};

/**
 * Genera un refresh token JWT para un usuario
 * @param {Object} user - Datos del usuario
 * @returns {String} Refresh token JWT
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id_usuario,
    email: user.email,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.refreshExpiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
};

/**
 * Verifica un token JWT
 * @param {String} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

/**
 * Verifica un refresh token JWT
 * @param {String} token - Refresh token a verificar
 * @returns {Object} Payload decodificado
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Token no es un refresh token válido');
    }

    return decoded;
  } catch (error) {
    throw new Error('Refresh token inválido o expirado');
  }
};

/**
 * Decodifica un token sin verificar (para debugging)
 * @param {String} token - Token a decodificar
 * @returns {Object} Payload decodificado
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Middleware de autenticación
 * Verifica que el usuario esté autenticado
 */
const authenticateToken = async (req, res, next) => {
  try {
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ Token no encontrado en headers');
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    const tokenJtiKey = decoded?.jti ? `jti:${decoded.jti}` : null;

    // Verificar revocación por token exacto o por jti de sesión
    const blacklistedToken = await query(
      `SELECT token
       FROM vetplus_auth.blacklisted_tokens
       WHERE token = $1 OR ($2::text IS NOT NULL AND token = $2)
       LIMIT 1`,
      [token, tokenJtiKey]
    );

    if (blacklistedToken.rows.length > 0) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        error: 'BLACKLISTED_TOKEN'
      });
    }

    // Verificar si hubo cierre forzado posterior para esta sesión/token.
    const forcedLogout = await query(
      `SELECT 1
       FROM system.session_audit
       WHERE id_usuario = $1
         AND tipo_evento = 'FORCE_LOGOUT'
         AND (
               ($2::text IS NOT NULL AND COALESCE(detalles->>'session_key', '') = $2)
               OR ($2::text IS NULL AND $3::bigint IS NOT NULL AND timestamp >= to_timestamp($3))
             )
       LIMIT 1`,
      [decoded.id, decoded?.jti || null, decoded?.iat || null]
    );

    if (forcedLogout.rows.length > 0) {
      return res.status(401).json({
        success: false,
        message: 'Sesión cerrada por administrador',
        error: 'FORCE_LOGOUT'
      });
    }

    // Verificar que el usuario existe y está activo
    const userResult = await query(
      `SELECT u.id_usuario, u.email, u.nombre, u.rol, u.activo, u.id_tenant,
              t.estado AS tenant_estado
       FROM vetplus_auth.usuarios u
       LEFT JOIN system.tenants t ON t.id_tenant = u.id_tenant
       WHERE u.id_usuario = $1`,
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

    if (user.id_tenant && user.tenant_estado !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'La clínica está suspendida o inactiva',
        error: 'TENANT_INACTIVE'
      });
    }

    // Agregar información actualizada del usuario al request
    req.user = {
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      tenant_id: user.id_tenant
    };

    req.authToken = {
      raw: token,
      jti: decoded?.jti || null,
      exp: decoded?.exp || null,
      iat: decoded?.iat || null
    };

    // Debug logging temporal
    if (user.email === 'diego@correo.com') {
      console.log(`🔍 DEBUG: Usuario Diego autenticado con rol: ${user.rol}`);
    }

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    
    if (error.message === 'Token inválido o expirado') {
      return res.status(403).json({
        success: false,
        message: error.message,
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware de autorización por rol
 * @param {Array} allowedRoles - Roles permitidos
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      // Debug logging temporal
      if (req.user.email === 'diego@correo.com') {
        console.log(`🔍 DEBUG: Acceso denegado para Diego. Rol actual: ${req.user.rol}, Roles permitidos: ${allowedRoles.join(', ')}`);
      }
      
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso',
        error: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        current_role: req.user.rol
      });
    }

    next();
  };
};

/**
 * Middleware de autenticación opcional
 * Verifica el token si existe, pero no requiere autenticación
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyToken(token);
        
        // Verificar que el usuario existe y está activo
        const userResult = await query(
          `SELECT u.id_usuario, u.email, u.nombre, u.rol, u.activo, u.id_tenant,
                  t.estado AS tenant_estado
           FROM vetplus_auth.usuarios u
           LEFT JOIN system.tenants t ON t.id_tenant = u.id_tenant
           WHERE u.id_usuario = $1`,
          [decoded.id]
        );

        if (
          userResult.rows.length > 0 &&
          userResult.rows[0].activo &&
          (!userResult.rows[0].id_tenant || userResult.rows[0].tenant_estado === 'active')
        ) {
          const user = userResult.rows[0];
          req.user = {
            id: user.id_usuario,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            tenant_id: user.id_tenant
          };
        }
      } catch (error) {
        // Token inválido, pero continuamos sin autenticación
        req.user = null;
      }
    }

    next();
  } catch (error) {
    // Error en base de datos, continuar sin autenticación
    next();
  }
};

export {
  JWT_CONFIG,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  authenticateToken,
  authorize,
  optionalAuth
};
