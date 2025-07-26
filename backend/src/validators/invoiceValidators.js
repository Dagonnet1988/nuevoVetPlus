import { body, param, query } from 'express-validator';

export const validateCreateInvoice = [
  body('id_cliente')
    .optional()
    .isUUID()
    .withMessage('ID de cliente debe ser un UUID válido'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un item en la factura'),

  body('items.*.codigo_barras')
    .optional()
    .matches(/^\d{8,50}$/)
    .withMessage('Código de barras debe contener entre 8 y 50 dígitos'),

  body('items.*.codigo')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Código de producto debe tener entre 1 y 50 caracteres'),

  body('items.*.cantidad')
    .isFloat({ min: 0.01 })
    .withMessage('Cantidad debe ser mayor a 0'),

  body('items.*.precio_unitario')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio unitario debe ser mayor o igual a 0'),

  body('items.*.descripcion')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Descripción debe tener entre 1 y 200 caracteres'),

  body('descuento')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Descuento debe ser mayor o igual a 0'),

  body('tipo_pago')
    .optional()
    .isIn(['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'])
    .withMessage('Tipo de pago inválido'),

  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),

  // Validación personalizada: cada item debe tener código_barras O código O descripción
  body('items.*').custom((item) => {
    if (!item.codigo_barras && !item.codigo && !item.descripcion) {
      throw new Error('Cada item debe tener código de barras, código de producto o descripción');
    }
    return true;
  })
];

export const validateBarcodeSearch = [
  param('barcode')
    .matches(/^\d{8,50}$/)
    .withMessage('Código de barras debe contener entre 8 y 50 dígitos')
];

export const validateInvoiceId = [
  param('id')
    .isUUID()
    .withMessage('ID de factura debe ser un UUID válido')
];

export const validateUpdateInvoiceStatus = [
  param('id')
    .isUUID()
    .withMessage('ID de factura debe ser un UUID válido'),

  body('estado')
    .isIn(['Pendiente', 'Pagada', 'Cancelada'])
    .withMessage('Estado debe ser: Pendiente, Pagada o Cancelada')
];

export const validateListInvoices = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100'),

  query('estado')
    .optional()
    .isIn(['Pendiente', 'Pagada', 'Cancelada'])
    .withMessage('Estado debe ser: Pendiente, Pagada o Cancelada'),

  query('desde')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde debe estar en formato ISO 8601'),

  query('hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta debe estar en formato ISO 8601'),

  query('cliente')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Filtro de cliente debe tener entre 2 y 100 caracteres')
];
