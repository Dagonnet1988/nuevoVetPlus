import { body, param, query } from 'express-validator/lib/index.js';

// Validación para generar contraseña temporal
export const validateGenerateTempPassword = [
  body('userId')
    .isUUID()
    .withMessage('ID de usuario debe ser un UUID válido'),
  
  body('motivo')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Motivo debe tener entre 5 y 255 caracteres')
];

// Validación para reset directo por admin
export const validateAdminResetPassword = [
  body('userId')
    .isUUID()
    .withMessage('ID de usuario debe ser un UUID válido'),
    
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
  body('motivo')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Motivo debe tener entre 5 y 255 caracteres')
];

// Validación para historial de resets
export const validatePasswordResetHistory = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100'),
    
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser mayor o igual a 0'),
    
  query('userId')
    .optional()
    .isUUID()
    .withMessage('userId debe ser un UUID válido'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida')
];

// Validación para forzar cambio de contraseña
export const validateForcePasswordChange = [
  param('userId')
    .isUUID()
    .withMessage('ID de usuario debe ser un UUID válido')
];
