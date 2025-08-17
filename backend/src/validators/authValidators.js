import { body } from 'express-validator';

/**
 * Validaciones para autenticación
 */

// Validación para login
export const validateLogin = [
  body('documento')
    .notEmpty()
    .withMessage('Documento es requerido')
    .isLength({ min: 5, max: 20 })
    .withMessage('Documento debe tener entre 5 y 20 caracteres'),
    
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

  body('apellido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Apellido debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Apellido solo debe contener letras y espacios'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),

  body('documento')
    .isLength({ min: 5, max: 20 })
    .withMessage('Documento debe tener entre 5 y 20 caracteres'),

  body('tipo_documento')
    .isIn(['CC', 'CE', 'TI', 'PP'])
    .withMessage('Tipo de documento debe ser CC, CE, TI o PP'),
    
  body('password_temporal')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Contraseña temporal debe tener al menos 8 caracteres'),
    
  body('rol')
    .isIn(['admin', 'vet', 'aux'])
    .withMessage('Rol debe ser admin, vet o aux'),

  body('telefono')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/)
    .withMessage('Teléfono debe tener un formato válido'),

  body('direccion')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Dirección no puede exceder 200 caracteres'),

  body('especialidad')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Especialidad no puede exceder 100 caracteres'),

  body('numero_licencia')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Número de licencia no puede exceder 50 caracteres'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false'),

  body('enviar_credenciales')
    .optional()
    .isBoolean()
    .withMessage('Enviar credenciales debe ser true o false'),

  body('forzar_cambio_password')
    .optional()
    .isBoolean()
    .withMessage('Forzar cambio de password debe ser true o false')
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
