import { body } from 'express-validator/lib/index.js';

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
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('Contraseña actual inválida'),
    
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

export const validateForgotPassword = [
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email inválido'),

  body('documento')
    .optional({ values: 'falsy' })
    .isLength({ min: 5, max: 20 })
    .withMessage('Documento inválido'),

  body().custom((value) => {
    const hasEmail = Boolean(String(value?.email || '').trim());
    const hasDocumento = Boolean(String(value?.documento || '').trim());
    if (!hasEmail && !hasDocumento) {
      throw new Error('Debes enviar email o documento');
    }
    return true;
  })
];

export const validateResetPasswordByToken = [
  body('token')
    .notEmpty()
    .withMessage('Token es requerido')
    .isLength({ min: 32 })
    .withMessage('Token inválido'),

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
    .optional()
    .isIn(['CC', 'CE', 'Pasaporte'])
    .withMessage('Tipo de documento debe ser CC, CE o Pasaporte'),
    
  body('password_temporal')
    .optional({ values: 'falsy' })
    .isLength({ min: 8 })
    .withMessage('Contraseña temporal debe tener al menos 8 caracteres'),
    
  body('rol')
    .isIn(['admin', 'vet', 'aux_admin', 'aux_vet'])
    .withMessage('Rol debe ser admin, vet, aux_admin o aux_vet'),

  body('telefono')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (!value || value.trim() === '') {
        return true; // Permitir valores vacíos
      }
      if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(value)) {
        throw new Error('Teléfono debe tener un formato válido');
      }
      return true;
    }),

  body('direccion')
    .optional({ values: 'falsy' })
    .isLength({ max: 200 })
    .withMessage('Dirección no puede exceder 200 caracteres'),

  // Validaciones condicionales para veterinarios
  body('especialidad')
    .if(body('rol').equals('vet'))
    .notEmpty()
    .withMessage('Especialidad es requerida para veterinarios')
    .isLength({ min: 2, max: 100 })
    .withMessage('Especialidad debe tener entre 2 y 100 caracteres'),

  body('numero_licencia')
    .if(body('rol').equals('vet'))
    .notEmpty()
    .withMessage('Número de licencia es requerido para veterinarios')
    .isLength({ min: 3, max: 50 })
    .withMessage('Número de licencia debe tener entre 3 y 50 caracteres'),

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
    .isIn(['admin', 'vet', 'aux_admin', 'aux_vet'])
    .withMessage('Rol debe ser admin, vet, aux_admin o aux_vet'),
    
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false')
];
