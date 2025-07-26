import { body, param, query } from 'express-validator';

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
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)')
        .custom((value) => {
            const fechaInicio = new Date(value);
            const ahora = new Date();
            if (fechaInicio <= ahora) {
                throw new Error('La fecha de inicio debe ser posterior a la fecha actual');
            }
            return true;
        }),
    
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
        .isIn(['Consulta', 'Terapia', 'Cirugía', 'Control', 'Vacunación', 'Emergencia'])
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
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)')
        .custom((value, { req }) => {
            if (value) {
                const fechaInicio = new Date(value);
                const ahora = new Date();
                
                // Solo validar fecha futura si el estado no es completada o cancelada
                if (req.body.estado && ['Completada', 'Cancelada'].includes(req.body.estado)) {
                    return true;
                }
                
                if (fechaInicio <= ahora) {
                    throw new Error('La fecha de inicio debe ser posterior a la fecha actual para citas activas');
                }
            }
            return true;
        }),
    
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
        .isIn(['Consulta', 'Terapia', 'Cirugía', 'Control', 'Vacunación', 'Emergencia'])
        .withMessage('El tipo de cita no es válido'),
    
    body('estado')
        .optional()
        .isIn(['Programada', 'Confirmada', 'En Curso', 'Completada', 'Cancelada', 'No Asistió'])
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
        .isIn(['Programada', 'Confirmada', 'En Curso', 'Completada', 'Cancelada', 'No Asistió'])
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
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El offset debe ser un número mayor o igual a 0'),
    
    query('fecha_inicio')
        .optional()
        .isISO8601()
        .withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)'),
    
    query('fecha_fin')
        .optional()
        .isISO8601()
        .withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)'),
    
    query('estado')
        .optional()
        .isIn(['Programada', 'Confirmada', 'En Curso', 'Completada', 'Cancelada', 'No Asistió'])
        .withMessage('El estado de la cita no es válido'),
    
    query('tipo')
        .optional()
        .isIn(['Consulta', 'Terapia', 'Cirugía', 'Control', 'Vacunación', 'Emergencia'])
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
