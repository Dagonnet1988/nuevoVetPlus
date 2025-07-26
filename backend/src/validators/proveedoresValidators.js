import { body, param, query, validationResult } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

/**
 * VALIDADORES PARA PROVEEDORES
 */

export const validateCreateProveedor = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre del proveedor es requerido')
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  
  body('nit')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('El NIT debe tener entre 5 y 20 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .matches(/^[\d\-\+\(\)\s]+$/)
    .withMessage('El teléfono solo puede contener números, espacios y símbolos telefónicos'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .isLength({ max: 150 })
    .withMessage('El email no puede exceder 150 caracteres'),
  
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  
  body('contacto_principal')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El contacto principal no puede exceder 100 caracteres'),
  
  body('terminos_pago')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Los términos de pago deben ser un número entre 0 y 365 días'),
  
  handleValidationErrors
];

export const validateUpdateProveedor = [
  param('id')
    .isUUID()
    .withMessage('ID de proveedor inválido'),
  
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre del proveedor es requerido')
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  
  body('nit')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('El NIT debe tener entre 5 y 20 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .matches(/^[\d\-\+\(\)\s]+$/)
    .withMessage('El teléfono solo puede contener números, espacios y símbolos telefónicos'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .isLength({ max: 150 })
    .withMessage('El email no puede exceder 150 caracteres'),
  
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  
  body('contacto_principal')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El contacto principal no puede exceder 100 caracteres'),
  
  body('terminos_pago')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Los términos de pago deben ser un número entre 0 y 365 días'),
  
  handleValidationErrors
];

export const validateProveedorId = [
  param('id')
    .isUUID()
    .withMessage('ID de proveedor inválido'),
  
  handleValidationErrors
];

export const validateQueryProveedores = [
  query('activo')
    .optional()
    .isBoolean()
    .withMessage('El parámetro activo debe ser true o false'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La búsqueda debe tener entre 2 y 100 caracteres'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('El límite debe ser un número entre 1 y 200'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser un número mayor o igual a 0'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA ÓRDENES DE COMPRA
 */

export const validateCreateOrdenCompra = [
  body('id_proveedor')
    .isUUID()
    .withMessage('ID de proveedor inválido'),
  
  body('tipo_pago')
    .isIn(['Contado', 'Crédito'])
    .withMessage('El tipo de pago debe ser Contado o Crédito'),
  
  body('fecha_vencimiento')
    .optional()
    .isISO8601()
    .withMessage('La fecha de vencimiento debe tener formato válido (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.body.tipo_pago === 'Crédito' && !value) {
        throw new Error('La fecha de vencimiento es requerida para compras a crédito');
      }
      if (value && new Date(value) <= new Date()) {
        throw new Error('La fecha de vencimiento debe ser posterior a hoy');
      }
      return true;
    }),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres'),
  
  body('lineas')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos una línea de productos'),
  
  body('lineas.*.id_producto')
    .isUUID()
    .withMessage('ID de producto inválido en las líneas'),
  
  body('lineas.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero mayor a 0'),
  
  body('lineas.*.precio_unitario')
    .isFloat({ min: 0.01 })
    .withMessage('El precio unitario debe ser mayor a 0'),
  
  handleValidationErrors
];

export const validateOrdenCompraId = [
  param('id')
    .isUUID()
    .withMessage('ID de orden de compra inválido'),
  
  handleValidationErrors
];

export const validateRecibirOrden = [
  param('id')
    .isUUID()
    .withMessage('ID de orden de compra inválido'),
  
  body('crear_egreso')
    .optional()
    .isBoolean()
    .withMessage('crear_egreso debe ser true o false'),
  
  body('notas_recepcion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas de recepción no pueden exceder 500 caracteres'),
  
  handleValidationErrors
];

export const validatePagarOrden = [
  param('id')
    .isUUID()
    .withMessage('ID de orden de compra inválido'),
  
  body('metodo_pago')
    .trim()
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'])
    .withMessage('Método de pago inválido'),
  
  body('referencia_pago')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La referencia de pago no puede exceder 100 caracteres'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
  
  handleValidationErrors
];

export const validateQueryOrdenes = [
  query('estado')
    .optional()
    .isIn(['Pendiente', 'Recibida', 'Pagada', 'Cancelada'])
    .withMessage('Estado inválido'),
  
  query('proveedor_id')
    .optional()
    .isUUID()
    .withMessage('ID de proveedor inválido'),
  
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida (formato: YYYY-MM-DD)'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida (formato: YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query.fecha_inicio && value < req.query.fecha_inicio) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  
  query('vencidas')
    .optional()
    .isBoolean()
    .withMessage('El parámetro vencidas debe ser true o false'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('El límite debe ser un número entre 1 y 200'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser un número mayor o igual a 0'),
  
  handleValidationErrors
];

export const validateQueryVencimientos = [
  query('dias')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Los días deben ser un número entre 1 y 365'),
  
  handleValidationErrors
];