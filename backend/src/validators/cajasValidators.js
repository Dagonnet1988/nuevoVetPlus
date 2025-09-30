import { body, param, query, validationResult } from 'express-validator/lib/index.js';

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
 * VALIDADORES PARA CAJAS
 */

export const validateCreateCaja = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la caja es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  
  body('saldo_inicial')
    .isNumeric()
    .withMessage('El saldo inicial debe ser un número válido')
    .isFloat({ min: 0 })
    .withMessage('El saldo inicial debe ser mayor o igual a 0'),
  
  handleValidationErrors
];

export const validateCerrarCaja = [
  param('caja_id')
    .isUUID()
    .withMessage('ID de caja inválido'),
  
  body('motivo_cierre')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El motivo de cierre no puede exceder 500 caracteres'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA INGRESOS
 */

export const validateRegistrarIngreso = [
  body('id_concepto_ingreso')
    .isUUID()
    .withMessage('ID de concepto de ingreso inválido'),
  
  body('monto')
    .isNumeric()
    .withMessage('El monto debe ser un número válido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La descripción debe tener entre 5 y 500 caracteres'),
  
  body('metodo_pago')
    .trim()
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'])
    .withMessage('Método de pago inválido'),
  
  body('referencia')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La referencia no puede exceder 100 caracteres'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA EGRESOS
 */

export const validateRegistrarEgreso = [
  body('id_concepto_egreso')
    .isUUID()
    .withMessage('ID de concepto de egreso inválido'),
  
  body('monto')
    .isNumeric()
    .withMessage('El monto debe ser un número válido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La descripción debe tener entre 5 y 500 caracteres'),
  
  body('metodo_pago')
    .trim()
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'])
    .withMessage('Método de pago inválido'),
  
  body('referencia')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La referencia no puede exceder 100 caracteres'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA CONSULTAS
 */

export const validateGetTransacciones = [
  query('id_caja')
    .optional()
    .isUUID()
    .withMessage('ID de caja inválido'),
  
  query('id_categoria')
    .optional()
    .isUUID()
    .withMessage('ID de categoría inválido'),
  
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

export const validateGetReporte = [
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
  
  query('caja_id')
    .optional()
    .isUUID()
    .withMessage('ID de caja inválido'),
  
  query('grupo_por')
    .optional()
    .isIn(['dia', 'semana', 'mes'])
    .withMessage('El grupo debe ser: dia, semana o mes'),
  
  handleValidationErrors
];

export const validateQueryCajas = [
  query('activa')
    .optional()
    .isBoolean()
    .withMessage('El parámetro activa debe ser true o false'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA TRANSFERENCIAS
 */

export const validateTransferencia = [
  body('id_caja_origen')
    .isUUID()
    .withMessage('ID de caja origen inválido'),
  
  body('id_caja_destino')
    .isUUID()
    .withMessage('ID de caja destino inválido')
    .custom((value, { req }) => {
      if (value === req.body.id_caja_origen) {
        throw new Error('La caja origen y destino deben ser diferentes');
      }
      return true;
    }),
  
  body('monto')
    .isNumeric()
    .withMessage('El monto debe ser un número válido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 5, max: 200 })
    .withMessage('La descripción debe tener entre 5 y 200 caracteres'),
  
  body('metodo_pago')
    .optional()
    .isIn(['Efectivo', 'Transferencia'])
    .withMessage('El método de pago debe ser Efectivo o Transferencia'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
  
  handleValidationErrors
];

export const validateGetTransferencias = [
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe estar en formato ISO8601'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe estar en formato ISO8601'),
  
  query('id_caja_origen')
    .optional()
    .isUUID()
    .withMessage('ID de caja origen inválido'),
  
  query('id_caja_destino')
    .optional()
    .isUUID()
    .withMessage('ID de caja destino inválido'),
  
  query('estado')
    .optional()
    .isIn(['Completada', 'Cancelada'])
    .withMessage('El estado debe ser Completada o Cancelada'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA ACTUALIZAR CAJA
 */

export const validateUpdateCaja = [
  param('caja_id')
    .isUUID()
    .withMessage('ID de caja inválido'),
  
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  
  body('tipo')
    .optional()
    .isIn(['Caja Menor', 'Cuenta Bancaria', 'Caja Fuerte', 'Personalizada'])
    .withMessage('Tipo de caja inválido'),
  
  body('saldo_inicial')
    .optional()
    .isNumeric()
    .withMessage('El saldo inicial debe ser un número válido')
    .isFloat({ min: 0 })
    .withMessage('El saldo inicial debe ser mayor o igual a 0'),
  
  handleValidationErrors
];

/**
 * VALIDADORES PARA ELIMINAR CAJA
 */

export const validateDeleteCaja = [
  param('caja_id')
    .isUUID()
    .withMessage('ID de caja inválido'),
  
  handleValidationErrors
];
