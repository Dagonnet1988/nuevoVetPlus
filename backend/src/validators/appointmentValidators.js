import { body, param, query } from 'express-validator/lib/index.js';

const TIPOS_CITA_VALIDOS = [
    // Nuevos tipos de negocio
    'valoracion', 'hidroterapia', 'terapia', 'domicilio', 'sin_clasificar', 'control',
    // Compatibilidad con datos legados
    'consulta_general', 'vacunacion', 'cirugia', 'emergencia', 'revision', 'desparasitacion', 'estetica', 'otro',
    'Consulta', 'Terapia', 'Cirugía', 'Control', 'Vacunación', 'Emergencia'
];

const ESTADOS_CITA_VALIDOS = ['confirmada', 'en_curso', 'completada', 'no_asistio'];

/**
 * Validaciones para la creación de citas
 */
export const validateCreateAppointment = [
    body('id_mascota')
        .notEmpty()
        .withMessage('El ID de la mascota es obligatorio')
        .isUUID()
        .withMessage('El ID de la mascota debe ser un UUID válido'),
    
    body('id_veterinario')
        .notEmpty()
        .withMessage('El ID del veterinario es obligatorio')
        .isUUID()
        .withMessage('El ID del veterinario debe ser un UUID válido'),
    
    body('fecha_inicio')
        .notEmpty()
        .withMessage('La fecha de inicio es obligatoria')
        .isISO8601()
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)'),
    
    body('fecha_fin')
        .notEmpty()
        .withMessage('La fecha de fin es obligatoria')
        .isISO8601()
        .withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)')
        .custom((value, { req }) => {
            const fechaInicio = new Date(req.body.fecha_inicio);
            const fechaFin = new Date(value);
            
            if (fechaFin <= fechaInicio) {
                throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
            }
            
            // Validar que no sea más de 8 horas
            const duracion = (fechaFin - fechaInicio) / (1000 * 60 * 60); // horas
            if (duracion > 8) {
                throw new Error('La duración de la cita no puede exceder 8 horas');
            }
            
            return true;
        }),
    
    body('tipo')
        .notEmpty()
        .withMessage('El tipo de cita es obligatorio')
        .isIn(TIPOS_CITA_VALIDOS)
        .withMessage('El tipo de cita no es válido'),
    
    body('motivo')
        .optional()
        .isLength({ max: 500 })
        .withMessage('El motivo no puede exceder 500 caracteres'),
    
    body('notas')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres')
];

const recurringBaseValidators = [
    body('id_mascota')
        .notEmpty()
        .withMessage('El ID de la mascota es obligatorio')
        .isUUID()
        .withMessage('El ID de la mascota debe ser un UUID válido'),

    body('id_veterinario')
        .notEmpty()
        .withMessage('El ID del veterinario es obligatorio')
        .isUUID()
        .withMessage('El ID del veterinario debe ser un UUID válido'),

    body('fecha_inicio')
        .notEmpty()
        .withMessage('La fecha de inicio es obligatoria')
        .isISO8601()
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)'),

    body('fecha_fin')
        .notEmpty()
        .withMessage('La fecha de fin es obligatoria')
        .isISO8601()
        .withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)')
        .custom((value, { req }) => {
            const fechaInicio = new Date(req.body.fecha_inicio);
            const fechaFin = new Date(value);
            if (fechaFin <= fechaInicio) {
                throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
            }
            return true;
        }),

    body('recurrencia.frecuencia')
        .optional()
        .isIn(['daily', 'weekly'])
        .withMessage('La frecuencia debe ser daily o weekly'),

    body('recurrencia.intervalo')
        .optional()
        .isInt({ min: 1, max: 12 })
        .withMessage('El intervalo debe ser un número entre 1 y 12'),

    body('recurrencia.total_ocurrencias')
        .optional()
        .isInt({ min: 1, max: 200 })
        .withMessage('El total de ocurrencias debe estar entre 1 y 200'),

    body('recurrencia.fecha_hasta')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('La fecha_hasta debe ser una fecha válida'),

    body('recurrencia.dias_semana')
        .optional()
        .isArray({ min: 1 })
        .withMessage('dias_semana debe ser un arreglo no vacío')
];

export const validatePreviewRecurringAppointments = [
    ...recurringBaseValidators
];

export const validateCreateRecurringAppointments = [
    ...recurringBaseValidators,
    body('tipo')
        .notEmpty()
        .withMessage('El tipo de cita es obligatorio')
        .isIn(TIPOS_CITA_VALIDOS)
        .withMessage('El tipo de cita no es válido'),

    body('motivo')
        .optional({ nullable: true })
        .isLength({ max: 500 })
        .withMessage('El motivo no puede exceder 500 caracteres'),

    body('notas')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres'),

    body('observaciones')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

    body('ocurrencias_editadas')
        .optional()
        .isArray({ min: 1, max: 200 })
        .withMessage('ocurrencias_editadas debe ser un arreglo entre 1 y 200 elementos'),

    body('ocurrencias_editadas.*.indice')
        .optional()
        .isInt({ min: 1, max: 999 })
        .withMessage('El indice de ocurrencia debe ser un número válido'),

    body('ocurrencias_editadas.*.fecha_inicio')
        .optional()
        .isISO8601()
        .withMessage('La fecha_inicio de la ocurrencia debe ser válida'),

    body('ocurrencias_editadas.*.fecha_fin')
        .optional()
        .isISO8601()
        .withMessage('La fecha_fin de la ocurrencia debe ser válida'),

    body('ocurrencias_editadas.*.tipo')
        .optional()
        .isIn(TIPOS_CITA_VALIDOS)
        .withMessage('El tipo de cita en ocurrencias_editadas no es válido')
];

/**
 * Validaciones para la actualización de citas
 */
export const validateUpdateAppointment = [
    param('id')
        .notEmpty()
        .withMessage('El ID de la cita es obligatorio')
        .isUUID()
        .withMessage('El ID de la cita debe ser un UUID válido'),
    
    body('id_mascota')
        .optional()
        .isUUID()
        .withMessage('El ID de la mascota debe ser un UUID válido'),
    
    body('id_veterinario')
        .optional()
        .isUUID()
        .withMessage('El ID del veterinario debe ser un UUID válido'),
    
    body('fecha_inicio')
        .optional()
        .isISO8601()
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)'),
    
    body('fecha_fin')
        .optional()
        .isISO8601()
        .withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)')
        .custom((value, { req }) => {
            if (value && req.body.fecha_inicio) {
                const fechaInicio = new Date(req.body.fecha_inicio);
                const fechaFin = new Date(value);
                
                if (fechaFin <= fechaInicio) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
                
                const duracion = (fechaFin - fechaInicio) / (1000 * 60 * 60);
                if (duracion > 8) {
                    throw new Error('La duración de la cita no puede exceder 8 horas');
                }
            }
            return true;
        }),
    
    body('tipo')
        .optional()
        .isIn(TIPOS_CITA_VALIDOS)
        .withMessage('El tipo de cita no es válido'),
    
    body('estado')
        .optional()
        .isIn(ESTADOS_CITA_VALIDOS)
        .withMessage('El estado de la cita no es válido'),
    
    body('motivo')
        .optional()
        .isLength({ max: 500 })
        .withMessage('El motivo no puede exceder 500 caracteres'),
    
    body('notas')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres'),
    
    body('id_consulta')
        .optional()
        .isUUID()
        .withMessage('El ID de la consulta debe ser un UUID válido')
];

/**
 * Validaciones para cambio de estado
 */
export const validateUpdateAppointmentStatus = [
    param('id')
        .notEmpty()
        .withMessage('El ID de la cita es obligatorio')
        .isUUID()
        .withMessage('El ID de la cita debe ser un UUID válido'),
    
    body('estado')
        .notEmpty()
        .withMessage('El estado es obligatorio')
        .isIn(ESTADOS_CITA_VALIDOS)
        .withMessage('El estado de la cita no es válido'),
    
    body('notas')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres')
];

/**
 * Validaciones para consultas con parámetros
 */
export const validateGetAppointments = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('El límite debe ser un número entre 1 y 1000'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El offset debe ser un número mayor o igual a 0'),
    
    query('fecha_inicio')
        .optional()
        .custom((value) => {
            // Aceptar tanto YYYY-MM-DD como YYYY-MM-DDTHH:MM:SS
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            if (!dateRegex.test(value)) {
                throw new Error('La fecha de inicio debe estar en formato YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS');
            }
            // Verificar que la fecha sea válida
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('La fecha de inicio no es válida');
            }
            return true;
        }),
    
    query('fecha_fin')
        .optional()
        .custom((value) => {
            // Aceptar tanto YYYY-MM-DD como YYYY-MM-DDTHH:MM:SS
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            if (!dateRegex.test(value)) {
                throw new Error('La fecha de fin debe estar en formato YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS');
            }
            // Verificar que la fecha sea válida
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('La fecha de fin no es válida');
            }
            return true;
        }),
    
    query('estado')
        .optional()
        .isIn(ESTADOS_CITA_VALIDOS)
        .withMessage('El estado de la cita no es válido'),
    
    query('tipo')
        .optional()
        .isIn(TIPOS_CITA_VALIDOS)
        .withMessage('El tipo de cita no es válido'),
    
    query('id_veterinario')
        .optional()
        .isUUID()
        .withMessage('El ID del veterinario debe ser un UUID válido'),
    
    query('id_mascota')
        .optional()
        .isUUID()
        .withMessage('El ID de la mascota debe ser un UUID válido')
];

/**
 * Validación para parámetros UUID
 */
export const validateUUIDParam = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isUUID()
        .withMessage('El ID debe ser un UUID válido')
];
