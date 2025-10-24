import { body, param, query } from 'express-validator/lib/index.js';

export const validateCreateInvoice = [
  // Validación condicional: debe tener id_cliente O cliente_nuevo
  body().custom((body) => {
    const hasIdCliente = body.id_cliente && body.id_cliente.trim() !== '';
    const hasClienteNuevo = body.cliente_nuevo && typeof body.cliente_nuevo === 'object';

    if (!hasIdCliente && !hasClienteNuevo) {
      throw new Error('Debe proporcionar id_cliente existente o datos de cliente_nuevo');
    }

    if (hasIdCliente && hasClienteNuevo) {
      throw new Error('No puede proporcionar tanto id_cliente como cliente_nuevo. Use uno u otro');
    }

    return true;
  }),

  body('id_cliente')
    .optional()
    .isUUID()
    .withMessage('ID de cliente debe ser un UUID válido'),

  // Validaciones para cliente_nuevo
  body('cliente_nuevo.nombre')
    .if(body('cliente_nuevo').exists())
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del cliente debe tener entre 2 y 100 caracteres'),

  body('cliente_nuevo.cedula')
    .if(body('cliente_nuevo').exists())
    .isLength({ min: 5, max: 20 })
    .withMessage('Cédula del cliente debe tener entre 5 y 20 caracteres'),

  body('cliente_nuevo.telefono')
    .if(body('cliente_nuevo').exists())
    .isLength({ min: 7, max: 20 })
    .withMessage('Teléfono del cliente debe tener entre 7 y 20 caracteres'),

  body('cliente_nuevo.email')
    .if(body('cliente_nuevo').exists())
    .isEmail()
    .withMessage('Email del cliente debe ser válido'),

  body('cliente_nuevo.direccion')
    .if(body('cliente_nuevo').exists())
    .optional()
    .isLength({ max: 500 })
    .withMessage('Dirección del cliente no puede exceder 500 caracteres'),

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

// Validación para actualizar factura
export const updateInvoiceValidation = [
  body('cliente_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de cliente debe ser un número entero positivo'),

  body('fecha_emision')
    .optional()
    .isISO8601()
    .withMessage('Fecha de emisión debe estar en formato ISO 8601'),

  body('fecha_vencimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento debe estar en formato ISO 8601'),

  body('subtotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal debe ser un número positivo'),

  body('impuestos')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Impuestos deben ser un número positivo'),

  body('descuento')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Descuento debe ser un número positivo'),

  body('total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total debe ser un número positivo'),

  body('estado')
    .optional()
    .isIn(['pendiente', 'pagada', 'cancelada', 'vencida'])
    .withMessage('Estado debe ser uno de: pendiente, pagada, cancelada, vencida'),

  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),

  body('lineas_factura')
    .optional()
    .isArray()
    .withMessage('Líneas de factura deben ser un arreglo'),

  body('lineas_factura.*.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de línea de factura debe ser un número entero positivo'),

  body('lineas_factura.*.producto_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de producto debe ser un número entero positivo'),

  body('lineas_factura.*.descripcion')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Descripción de línea debe tener entre 1 y 200 caracteres'),

  body('lineas_factura.*.cantidad')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Cantidad debe ser mayor a 0'),

  body('lineas_factura.*.precio_unitario')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio unitario debe ser un número positivo'),

  body('lineas_factura.*.subtotal_linea')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Subtotal de línea debe ser un número positivo')
];
