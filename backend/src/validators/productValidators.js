import { body, param, query } from 'express-validator';

/**
 * Validaciones para productos
 */

// Validación para crear producto
export const validateCreateProduct = [
  body('codigo')
    .isLength({ min: 3, max: 20 })
    .withMessage('Código debe tener entre 3 y 20 caracteres')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Código solo debe contener letras mayúsculas, números y guiones'),
    
  body('codigo_barras')
    .optional()
    .isLength({ min: 8, max: 50 })
    .withMessage('Código de barras debe tener entre 8 y 50 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('Código de barras solo debe contener números'),
    
  body('nombre')
    .isLength({ min: 2, max: 200 })
    .withMessage('Nombre debe tener entre 2 y 200 caracteres')
    .trim(),
    
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
    .trim(),
    
  body('tipo')
    .isIn(['Producto', 'Servicio', 'Terapia Individual', 'Terapia Paquete'])
    .withMessage('Tipo debe ser Producto, Servicio, Terapia Individual o Terapia Paquete'),
    
  body('categoria')
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoría debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio de compra debe ser un número positivo'),
    
  body('precio_venta')
    .isFloat({ min: 0 })
    .withMessage('Precio de venta debe ser un número positivo'),
    
  body('stock_minimo')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock mínimo debe ser un número entero positivo'),
    
  body('stock_actual')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock actual debe ser un número entero positivo'),
    
  body('inventariable')
    .optional()
    .isBoolean()
    .withMessage('Inventariable debe ser true o false'),
    
  body('sesiones_incluidas')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sesiones incluidas debe ser un número entero positivo'),
    
  body('duracion_sesion')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Duración de sesión debe ser al menos 5 minutos')
];

// Validación para actualizar producto
export const validateUpdateProduct = [
  param('id')
    .isUUID()
    .withMessage('ID debe ser un UUID válido'),
    
  body('codigo')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Código debe tener entre 3 y 20 caracteres')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Código solo debe contener letras mayúsculas, números y guiones'),
    
  body('codigo_barras')
    .optional()
    .isLength({ min: 8, max: 50 })
    .withMessage('Código de barras debe tener entre 8 y 50 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('Código de barras solo debe contener números'),
    
  body('nombre')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nombre debe tener entre 2 y 200 caracteres')
    .trim(),
    
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
    .trim(),
    
  body('tipo')
    .optional()
    .isIn(['Producto', 'Servicio', 'Terapia Individual', 'Terapia Paquete'])
    .withMessage('Tipo debe ser Producto, Servicio, Terapia Individual o Terapia Paquete'),
    
  body('categoria')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoría debe tener entre 2 y 50 caracteres')
    .trim(),
    
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio de compra debe ser un número positivo'),
    
  body('precio_venta')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio de venta debe ser un número positivo'),
    
  body('stock_minimo')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock mínimo debe ser un número entero positivo'),
    
  body('stock_actual')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock actual debe ser un número entero positivo'),
    
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false'),
    
  body('inventariable')
    .optional()
    .isBoolean()
    .withMessage('Inventariable debe ser true o false'),
    
  body('sesiones_incluidas')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sesiones incluidas debe ser un número entero positivo'),
    
  body('duracion_sesion')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Duración de sesión debe ser al menos 5 minutos')
];

// Validación para obtener producto por ID
export const validateProductId = [
  param('id')
    .isUUID()
    .withMessage('ID debe ser un UUID válido')
];

// Validación para filtros de búsqueda
export const validateProductFilters = [
  query('tipo')
    .optional()
    .isIn(['Producto', 'Servicio', 'Terapia Individual', 'Terapia Paquete'])
    .withMessage('Tipo debe ser Producto, Servicio, Terapia Individual o Terapia Paquete'),
    
  query('categoria')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoría debe tener entre 1 y 50 caracteres'),
    
  query('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false'),
    
  query('inventariable')
    .optional()
    .isBoolean()
    .withMessage('Inventariable debe ser true o false'),
    
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Búsqueda debe tener entre 1 y 100 caracteres'),
    
  query('codigo_barras')
    .optional()
    .isLength({ min: 8, max: 50 })
    .withMessage('Código de barras debe tener entre 8 y 50 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('Código de barras solo debe contener números'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entero entre 1 y 100')
];

// Validación para búsqueda por código de barras
export const validateBarcodeSearch = [
  param('barcode')
    .isLength({ min: 8, max: 50 })
    .withMessage('Código de barras debe tener entre 8 y 50 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('Código de barras solo debe contener números')
];
