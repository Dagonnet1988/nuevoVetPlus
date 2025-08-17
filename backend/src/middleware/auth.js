import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Configuración JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'vetplus_super_secret_key_2024',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  issuer: 'VetPlus',
  audience: 'vetplus-users'
};

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Datos del usuario
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user.id_usuario,
    email: user.email,
    rol: user.rol,
    nombre: user.nombre,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
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

    // Verificar si el token está en la blacklist
    const blacklistedToken = await query(
      'SELECT token FROM auth.blacklisted_tokens WHERE token = $1',
      [token]
    );

    if (blacklistedToken.rows.length > 0) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        error: 'BLACKLISTED_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    
    // Verificar que el usuario existe y está activo
    const userResult = await query(
      'SELECT id_usuario, email, nombre, rol, activo FROM auth.usuarios WHERE id_usuario = $1',
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

    // Agregar información actualizada del usuario al request
    req.user = {
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol
    };

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
          'SELECT id_usuario, email, nombre, rol, activo FROM auth.usuarios WHERE id_usuario = $1',
          [decoded.id]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].activo) {
          const user = userResult.rows[0];
          req.user = {
            id: user.id_usuario,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol
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
  verifyToken,
  decodeToken,
  authenticateToken,
  authorize,
  optionalAuth
};
