import { body, param, query } from 'express-validator/lib/index.js';

/**
 * Validaciones para crear cliente
 */
export const validateCreateClient = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),

  body('telefono')
    .notEmpty()
    .withMessage('El teléfono es obligatorio')
    .isMobilePhone('es-CO')
    .withMessage('El formato del teléfono no es válido')
    .trim(),

  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('El formato del email no es válido')
    .normalizeEmail(),

  body('direccion')
    .optional({ nullable: true })
    .isLength({ max: 200 })
    .withMessage('La dirección no debe exceder 200 caracteres')
    .trim(),

  body('cedula')
    .optional({ nullable: true })
    .isLength({ min: 6, max: 20 })
    .withMessage('La cédula debe tener entre 6 y 20 caracteres')
    .trim(),

  body('fecha_nacimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de nacimiento debe estar en formato YYYY-MM-DD')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age > 120) {
          throw new Error('La fecha de nacimiento no puede ser anterior a 120 años');
        }
        
        if (birthDate > today) {
          throw new Error('La fecha de nacimiento no puede ser en el futuro');
        }
      }
      return true;
    }),

  body('notas')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Las notas no deben exceder 500 caracteres')
    .trim()
];

/**
 * Validaciones para actualizar cliente
 */
export const validateUpdateClient = [
  param('id')
    .isUUID()
    .withMessage('ID de cliente inválido'),

  body('nombre')
    .optional()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),

  body('telefono')
    .optional()
    .notEmpty()
    .withMessage('El teléfono no puede estar vacío')
    .isMobilePhone('es-CO')
    .withMessage('El formato del teléfono no es válido')
    .trim(),

  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('El formato del email no es válido')
    .normalizeEmail(),

  body('direccion')
    .optional({ nullable: true })
    .isLength({ max: 200 })
    .withMessage('La dirección no debe exceder 200 caracteres')
    .trim(),

  body('cedula')
    .optional({ nullable: true })
    .isLength({ min: 6, max: 20 })
    .withMessage('La cédula debe tener entre 6 y 20 caracteres')
    .trim(),

  body('fecha_nacimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de nacimiento debe estar en formato YYYY-MM-DD')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age > 120) {
          throw new Error('La fecha de nacimiento no puede ser anterior a 120 años');
        }
        
        if (birthDate > today) {
          throw new Error('La fecha de nacimiento no puede ser en el futuro');
        }
      }
      return true;
    }),

  body('notas')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Las notas no deben exceder 500 caracteres')
    .trim(),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser true o false')
];

/**
 * Validaciones para obtener cliente por ID
 */
export const validateClientId = [
  param('id')
    .isUUID()
    .withMessage('ID de cliente inválido')
];

/**
 * Validaciones para búsqueda y filtros de clientes
 */
export const validateClientSearch = [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 1 y 100 caracteres')
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entero entre 1 y 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['nombre', 'telefono', 'email', 'created_at'])
    .withMessage('El campo de ordenamiento no es válido'),

  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('El orden debe ser ASC o DESC')
];

/**
 * Validaciones para búsqueda rápida de clientes
 */
export const validateQuickClientSearch = [
  query('q')
    .notEmpty()
    .withMessage('El término de búsqueda es obligatorio')
    .isLength({ min: 2, max: 50 })
    .withMessage('El término debe tener entre 2 y 50 caracteres')
    .trim(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('El límite debe ser un número entero entre 1 y 20')
    .toInt()
];
