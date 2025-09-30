import { body, param, query } from 'express-validator/lib/index.js';

/**
 * Validadores para la configuración del sistema financiero
 */

// Validación para crear categoría de ingresos
export const validateCreateCategoriaIngreso = [
  body('nombre')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nombre debe tener entre 3 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Nombre solo debe contener letras y espacios'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
];

// Validación para crear categoría de egresos
export const validateCreateCategoriaEgreso = [
  body('nombre')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nombre debe tener entre 3 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Nombre solo debe contener letras y espacios'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
];

// Validación para crear concepto
export const validateCreateConcepto = [
  param('categoryId')
    .isUUID()
    .withMessage('ID de categoría debe ser un UUID válido'),
  
  body('nombre')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ min: 3, max: 150 })
    .withMessage('Nombre debe tener entre 3 y 150 caracteres'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
];

// Validación para obtener conceptos
export const validateGetConceptos = [
  param('categoryId')
    .isUUID()
    .withMessage('ID de categoría debe ser un UUID válido'),
  
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive debe ser booleano')
];

// Validación para toggle de categoría
export const validateToggleCategoria = [
  param('type')
    .isIn(['ingresos', 'egresos'])
    .withMessage('Tipo debe ser "ingresos" o "egresos"'),
  
  param('categoryId')
    .isUUID()
    .withMessage('ID de categoría debe ser un UUID válido'),
  
  body('activa')
    .isBoolean()
    .withMessage('Activa debe ser booleano')
];

// Validación para query de listados
export const validateListQuery = [
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive debe ser booleano')
];
