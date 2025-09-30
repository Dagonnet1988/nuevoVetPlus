import { body, param, query } from 'express-validator/lib/index.js';

// ✅ VALIDACIONES PARA CREAR CONSULTA CLÍNICA
export const validateCreateConsultation = [
    body('id_mascota')
        .isUUID(4)
        .withMessage('El ID de la mascota debe ser un UUID válido'),
    
    body('id_veterinario')
        .isUUID(4)
        .withMessage('El ID del veterinario debe ser un UUID válido'),
    
    body('motivo')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
    
    body('anamnesis')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('La anamnesis no puede exceder 2000 caracteres'),
    
    body('examen_fisico')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('El examen físico no puede exceder 2000 caracteres'),
    
    body('temperatura')
        .optional()
        .isFloat({ min: 30.0, max: 45.0 })
        .withMessage('La temperatura debe estar entre 30.0 y 45.0 grados Celsius'),
    
    body('peso')
        .optional()
        .isFloat({ min: 0.1, max: 200.0 })
        .withMessage('El peso debe estar entre 0.1 y 200.0 kg'),
    
    body('diagnostico')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('El diagnóstico no puede exceder 1000 caracteres'),
    
    body('tratamiento')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('El tratamiento no puede exceder 1000 caracteres'),
    
    body('medicamentos')
        .optional()
        .isArray()
        .withMessage('Los medicamentos deben ser un array'),
    
    body('medicamentos.*.nombre')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre del medicamento es requerido y no puede exceder 100 caracteres'),
    
    body('medicamentos.*.dosis')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('La dosis del medicamento es requerida y no puede exceder 100 caracteres'),
    
    body('medicamentos.*.frecuencia')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('La frecuencia del medicamento es requerida y no puede exceder 50 caracteres'),
    
    body('medicamentos.*.duracion')
        .if(body('medicamentos').exists())
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('La duración del medicamento no puede exceder 50 caracteres'),
    
    body('recomendaciones')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las recomendaciones no pueden exceder 1000 caracteres'),
    
    body('proxima_cita')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            // Si el valor es null, undefined, o vacío, permitirlo
            if (value === null || value === undefined || value === '') {
                return true;
            }
            // Si hay un valor, validar que sea una fecha ISO8601 válida y no en el pasado
            const fecha = new Date(value);
            if (isNaN(fecha.getTime())) {
                throw new Error('La próxima cita debe ser una fecha válida');
            }
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fecha < hoy) {
                throw new Error('La próxima cita no puede ser en el pasado');
            }
            return true;
        }),
    
    body('estado')
        .optional()
        .isIn(['Programada', 'En Curso', 'Completada', 'Cancelada'])
        .withMessage('El estado debe ser: Programada, En Curso, Completada o Cancelada'),
    
    body('costo')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El costo debe ser un número positivo')
];

// ✅ VALIDACIONES PARA ACTUALIZAR CONSULTA CLÍNICA
export const validateUpdateConsultation = [
    param('id')
        .isUUID(4)
        .withMessage('El ID de la consulta debe ser un UUID válido'),
    
    body('motivo')
        .optional()
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
    
    body('anamnesis')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('La anamnesis no puede exceder 2000 caracteres'),
    
    body('examen_fisico')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('El examen físico no puede exceder 2000 caracteres'),
    
    body('temperatura')
        .optional()
        .isFloat({ min: 30.0, max: 45.0 })
        .withMessage('La temperatura debe estar entre 30.0 y 45.0 grados Celsius'),
    
    body('peso')
        .optional()
        .isFloat({ min: 0.1, max: 200.0 })
        .withMessage('El peso debe estar entre 0.1 y 200.0 kg'),
    
    body('diagnostico')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('El diagnóstico no puede exceder 1000 caracteres'),
    
    body('tratamiento')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('El tratamiento no puede exceder 1000 caracteres'),
    
    body('medicamentos')
        .optional()
        .isArray()
        .withMessage('Los medicamentos deben ser un array'),
    
    body('medicamentos.*.nombre')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre del medicamento es requerido y no puede exceder 100 caracteres'),
    
    body('medicamentos.*.dosis')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('La dosis del medicamento es requerida y no puede exceder 100 caracteres'),
    
    body('medicamentos.*.frecuencia')
        .if(body('medicamentos').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('La frecuencia del medicamento es requerida y no puede exceder 50 caracteres'),
    
    body('medicamentos.*.duracion')
        .if(body('medicamentos').exists())
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('La duración del medicamento no puede exceder 50 caracteres'),
    
    body('recomendaciones')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las recomendaciones no pueden exceder 1000 caracteres'),
    
    body('proxima_cita')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            // Si el valor es null, undefined, o vacío, permitirlo
            if (value === null || value === undefined || value === '') {
                return true;
            }
            // Si hay un valor, validar que sea una fecha ISO8601 válida y no en el pasado
            const fecha = new Date(value);
            if (isNaN(fecha.getTime())) {
                throw new Error('La próxima cita debe ser una fecha válida');
            }
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fecha < hoy) {
                throw new Error('La próxima cita no puede ser en el pasado');
            }
            return true;
        }),
    
    body('estado')
        .optional()
        .isIn(['Programada', 'En Curso', 'Completada', 'Cancelada'])
        .withMessage('El estado debe ser: Programada, En Curso, Completada o Cancelada'),
    
    body('costo')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El costo debe ser un número positivo')
];

// ✅ VALIDACIONES PARA CONSULTAR POR ID
export const validateConsultationId = [
    param('id')
        .isUUID(4)
        .withMessage('El ID de la consulta debe ser un UUID válido')
];

// ✅ VALIDACIONES PARA CONSULTAS POR MASCOTA
export const validatePetId = [
    param('id')
        .isUUID(4)
        .withMessage('El ID de la mascota debe ser un UUID válido')
];

// ✅ VALIDACIONES PARA FILTROS DE CONSULTA
export const validateConsultationFilters = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El offset debe ser un número mayor o igual a 0'),
    
    query('estado')
        .optional()
        .isIn(['Programada', 'En Curso', 'Completada', 'Cancelada'])
        .withMessage('El estado debe ser: Programada, En Curso, Completada o Cancelada'),
    
    query('veterinario')
        .optional()
        .isUUID(4)
        .withMessage('El ID del veterinario debe ser un UUID válido'),
    
    query('mascota')
        .optional()
        .isUUID(4)
        .withMessage('El ID de la mascota debe ser un UUID válido'),
    
    query('fecha_desde')
        .optional()
        .isISO8601()
        .withMessage('La fecha desde debe estar en formato ISO8601'),
    
    query('fecha_hasta')
        .optional()
        .isISO8601()
        .withMessage('La fecha hasta debe estar en formato ISO8601')
];
