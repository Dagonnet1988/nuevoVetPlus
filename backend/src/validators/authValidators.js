import { body } from 'express-validator';

/**
 * Validaciones para autenticación
 */

// Validación para login
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres')
];

// Validación para cambio de contraseña
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
    
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmación de contraseña no coincide');
      }
      return true;
    })
];

// Validación para crear usuario
export const validateCreateUser = [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nombre solo debe contener letras y espacios'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
  body('rol')
    .isIn(['admin', 'vet', 'aux'])
    .withMessage('Rol debe ser admin, vet o aux')
];

// Validación para actualizar usuario
export const validateUpdateUser = [
  body('nombre')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nombre solo debe contener letras y espacios'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),
    
  body('rol')
    .optional()
    .isIn(['admin', 'vet', 'aux'])
    .withMessage('Rol debe ser admin, vet o aux'),
    
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false')
];
