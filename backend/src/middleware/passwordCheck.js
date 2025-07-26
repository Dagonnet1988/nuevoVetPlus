import { query } from '../config/database.js';

/**
 * Middleware para verificar si el usuario debe cambiar su contraseña
 * Este middleware debe usarse en rutas que requieren que el usuario
 * tenga una contraseña permanente (no temporal)
 */
export const requirePasswordChange = async (req, res, next) => {
  try {
    // Verificar si el usuario tiene información de autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'UNAUTHORIZED'
      });
    }

    // Obtener información del usuario sobre contraseña temporal
    const userResult = await query(
      'SELECT password_temporal, debe_cambiar_password FROM auth.usuarios WHERE id_usuario = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // Si el usuario debe cambiar su contraseña, bloquear acceso
    if (user.password_temporal || user.debe_cambiar_password) {
      return res.status(403).json({
        success: false,
        message: 'Debe cambiar su contraseña antes de continuar',
        error: 'PASSWORD_CHANGE_REQUIRED',
        action_required: 'change_password'
      });
    }

    // Si todo está bien, continuar
    next();

  } catch (error) {
    console.error('Error en middleware requirePasswordChange:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware más permisivo que solo informa si debe cambiar contraseña
 * pero no bloquea el acceso
 */
export const checkPasswordChangeStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    const userResult = await query(
      'SELECT password_temporal, debe_cambiar_password FROM auth.usuarios WHERE id_usuario = $1',
      [req.user.id]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      req.passwordChangeRequired = user.password_temporal || user.debe_cambiar_password;
    }

    next();

  } catch (error) {
    console.error('Error en middleware checkPasswordChangeStatus:', error);
    // En caso de error, continuar sin bloquear
    next();
  }
};
