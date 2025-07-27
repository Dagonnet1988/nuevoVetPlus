import { body, query, param } from 'express-validator';

/**
 * Validador para crear paciente completo (cliente + mascota)
 */
export const validateCreatePacienteCompleto = [
  // Validaciones del cliente
  body('nombre_cliente')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres'),
  
  body('cedula')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('La cédula no puede tener más de 20 caracteres'),
  
  body('telefono')
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('El teléfono debe tener entre 7 y 20 caracteres'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe ser un email válido'),
  
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede tener más de 500 caracteres'),

  // Validaciones de la mascota
  body('nombre_mascota')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El nombre de la mascota debe tener entre 1 y 50 caracteres'),
  
  body('especie')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('La especie debe tener entre 2 y 30 caracteres'),
  
  body('raza')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('La raza no puede tener más de 50 caracteres'),
  
  body('sexo')
    .isIn(['M', 'H', 'Macho', 'Hembra'])
    .withMessage('El sexo debe ser M (Macho) o H (Hembra)'),
  
  body('fecha_nacimiento')
    .optional()
    .isISO8601()
    .withMessage('La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)'),
  
  body('peso')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('El peso debe ser un número positivo menor a 1000 kg'),
  
  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El color no puede tener más de 50 caracteres'),
  
  body('microchip')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El microchip no puede tener más de 50 caracteres'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden tener más de 1000 caracteres')
];

/**
 * Validador para búsqueda de pacientes
 */
export const validatePacienteSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 1 y 100 caracteres'),
  
  query('especie')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('La especie debe tener entre 2 y 30 caracteres'),
  
  query('activo')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser true o false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entero entre 1 y 100'),
  
  query('sortBy')
    .optional()
    .isIn(['nombre', 'especie', 'created_at', 'cliente_nombre'])
    .withMessage('El campo de ordenamiento no es válido'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('El orden debe ser ASC o DESC')
];

/**
 * Validador para parámetro de especie
 */
export const validateEspecieParam = [
  param('especie')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('La especie debe tener entre 2 y 30 caracteres')
];