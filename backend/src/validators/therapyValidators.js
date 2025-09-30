import { body, param, query } from 'express-validator/lib/index.js';

export const validateRecordSession = [
  body('id_control')
    .isUUID()
    .withMessage('ID de control debe ser un UUID válido'),

  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones no pueden exceder 500 caracteres'),

  body('duracion_real')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Duración real debe ser un número entre 1 y 300 minutos')
];

export const validatePetId = [
  param('petId')
    .isUUID()
    .withMessage('ID de mascota debe ser un UUID válido')
];

export const validateTherapyControlId = [
  param('id')
    .isUUID()
    .withMessage('ID de control debe ser un UUID válido')
];

export const validateUpdateTherapyControl = [
  param('id')
    .isUUID()
    .withMessage('ID de control debe ser un UUID válido'),

  body('fecha_vencimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento debe estar en formato ISO 8601'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser un valor booleano'),

  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

export const validateTherapyStatsQuery = [
  query('fecha_desde')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde debe estar en formato ISO 8601'),

  query('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta debe estar en formato ISO 8601'),

  // Validación personalizada: fecha_desde debe ser menor que fecha_hasta
  query('fecha_desde').custom((value, { req }) => {
    if (value && req.query.fecha_hasta) {
      const desde = new Date(value);
      const hasta = new Date(req.query.fecha_hasta);
      if (desde > hasta) {
        throw new Error('Fecha desde debe ser anterior a fecha hasta');
      }
    }
    return true;
  })
];

export const validateTherapyPackagesQuery = [
  query('categoria')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoría debe tener entre 2 y 50 caracteres')
];

export const validateTherapyControlQuery = [
  query('activo')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Activo debe ser true o false')
];

export const validateUseTherapy = [
  body('id_control')
    .isUUID()
    .withMessage('ID de control debe ser un UUID válido'),

  body('sesiones_usadas')
    .isInt({ min: 1 })
    .withMessage('Sesiones usadas debe ser un número entero positivo')
];

export const validateCreateTherapyPackage = [
  body('id_mascota')
    .isUUID()
    .withMessage('ID de mascota debe ser un UUID válido'),

  body('id_factura')
    .optional()
    .isString()
    .withMessage('ID de factura debe ser un string válido'),

  body('id_producto')
    .isUUID()
    .withMessage('ID de producto debe ser un UUID válido'),

  body('sesiones_total')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Sesiones total debe ser un número entre 1 y 100'),

  body('precio_pagado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio pagado debe ser un número positivo')
];

export const validateActivateTherapyPackage = [
  body('id_mascota')
    .isUUID()
    .withMessage('ID de mascota debe ser un UUID válido'),

  body('id_factura')
    .notEmpty()
    .withMessage('ID de factura es requerido')
    .isString()
    .withMessage('ID de factura debe ser un string'),

  body('id_producto')
    .isUUID()
    .withMessage('ID de producto debe ser un UUID válido')
];
