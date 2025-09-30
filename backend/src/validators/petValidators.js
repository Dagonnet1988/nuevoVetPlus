import { body, param, query } from 'express-validator/lib/index.js';

// ✅ VALIDACIONES PARA CREAR MASCOTA
export const validateCreatePet = [
    body('id_cliente')
        .isUUID(4)
        .withMessage('El ID del cliente debe ser un UUID válido'),
    
    body('nombre')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre debe tener entre 1 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('especie')
        .isIn(['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Pez', 'Otro'])
        .withMessage('La especie debe ser: Perro, Gato, Ave, Reptil, Roedor, Pez u Otro'),
    
    body('raza')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('La raza no puede exceder 100 caracteres'),
    
    body('sexo')
        .isIn(['Macho', 'Hembra'])
        .withMessage('El sexo debe ser Macho o Hembra'),
    
    body('peso')
        .optional()
        .isFloat({ min: 0.1, max: 200 })
        .withMessage('El peso debe estar entre 0.1 y 200 kg'),
    
    body('color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('El color no puede exceder 50 caracteres'),
    
    body('fecha_nacimiento')
        .optional()
        .isISO8601()
        .toDate()
        .custom((fecha) => {
            const hoy = new Date();
            const hace50Anos = new Date();
            hace50Anos.setFullYear(hoy.getFullYear() - 50);
            
            if (fecha > hoy) {
                throw new Error('La fecha de nacimiento no puede ser futura');
            }
            if (fecha < hace50Anos) {
                throw new Error('La fecha de nacimiento no puede ser anterior a 50 años');
            }
            return true;
        }),
    
    body('esterilizado')
        .optional()
        .isBoolean()
        .withMessage('Esterilizado debe ser true o false'),
    
    body('microchip')
        .optional()
        .trim()
        .isLength({ max: 15 })
        .withMessage('El número de microchip no puede exceder 15 caracteres')
        .matches(/^[0-9A-Z]*$/)
        .withMessage('El microchip solo puede contener números y letras mayúsculas')
];

// ✅ VALIDACIONES PARA ACTUALIZAR MASCOTA
export const validateUpdatePet = [
    param('id')
        .isUUID(4)
        .withMessage('El ID de la mascota debe ser un UUID válido'),
    
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre debe tener entre 1 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('especie')
        .optional()
        .isIn(['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Pez', 'Otro'])
        .withMessage('La especie debe ser: Perro, Gato, Ave, Reptil, Roedor, Pez u Otro'),
    
    body('raza')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('La raza no puede exceder 100 caracteres'),
    
    body('sexo')
        .optional()
        .isIn(['Macho', 'Hembra'])
        .withMessage('El sexo debe ser Macho o Hembra'),
    
    body('peso')
        .optional()
        .isFloat({ min: 0.1, max: 200 })
        .withMessage('El peso debe estar entre 0.1 y 200 kg'),
    
    body('color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('El color no puede exceder 50 caracteres'),
    
    body('fecha_nacimiento')
        .optional()
        .isISO8601()
        .toDate()
        .custom((fecha) => {
            const hoy = new Date();
            const hace50Anos = new Date();
            hace50Anos.setFullYear(hoy.getFullYear() - 50);
            
            if (fecha > hoy) {
                throw new Error('La fecha de nacimiento no puede ser futura');
            }
            if (fecha < hace50Anos) {
                throw new Error('La fecha de nacimiento no puede ser anterior a 50 años');
            }
            return true;
        }),
    
    body('esterilizado')
        .optional()
        .isBoolean()
        .withMessage('Esterilizado debe ser true o false'),
    
    body('microchip')
        .optional()
        .trim()
        .isLength({ max: 15 })
        .withMessage('El número de microchip no puede exceder 15 caracteres')
        .matches(/^[0-9A-Z]*$/)
        .withMessage('El microchip solo puede contener números y letras mayúsculas'),
    
    body('activo')
        .optional()
        .isBoolean()
        .withMessage('El campo activo debe ser true o false')
];

// ✅ VALIDADOR PARA ID DE MASCOTA
export const validatePetId = [
    param('id')
        .isUUID()
        .withMessage('El ID de la mascota debe ser un UUID válido')
];

// ✅ VALIDADOR PARA ID DE CLIENTE (para obtener mascotas por cliente)
export const validateClientId = [
    param('id')
        .isUUID()
        .withMessage('El ID del cliente debe ser un UUID válido')
];

// ✅ VALIDADOR PARA BÚSQUEDA Y FILTROS
export const validatePetSearch = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),

    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El offset debe ser un número mayor o igual a 0'),

    query('especie')
        .optional()
        .isIn(['Perro', 'Gato', 'Ave', 'Roedor', 'Reptil', 'Pez', 'Otro'])
        .withMessage('La especie debe ser: Perro, Gato, Ave, Roedor, Reptil, Pez u Otro'),

    query('cliente')
        .optional()
        .isUUID()
        .withMessage('El ID del cliente debe ser un UUID válido')
];

// ✅ VALIDADOR PARA BÚSQUEDA POR MICROCHIP
export const validateMicrochipSearch = [
    param('microchip')
        .notEmpty()
        .withMessage('El número de microchip es obligatorio')
        .isLength({ min: 3, max: 50 })
        .withMessage('El microchip debe tener entre 3 y 50 caracteres')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('El microchip solo puede contener letras y números')
];

// ✅ VALIDADOR PARA BÚSQUEDA POR NOMBRE
export const validateNameSearch = [
    query('nombre')
        .notEmpty()
        .withMessage('El nombre de búsqueda es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('El límite debe ser un número entre 1 y 20')
];
