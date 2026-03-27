import express from 'express';
import { query } from '../config/database.js';
import { 
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    getAppointmentsByVet,
    getAppointmentsByPet,
    getCalendarView,
    forceSyncWithGoogle,
    syncAllPendingAppointments,
    getVeterinarianAvailability,
    suggestAvailableSlots,
    getAppointmentStats,
    syncAppointmentWithCalendar,
    getAppointmentConsultation
} from '../controllers/appointmentController.js';

import {
    validateCreateAppointment,
    validateUpdateAppointment,
    validateUpdateAppointmentStatus,
    validateGetAppointments,
    validateUUIDParam
} from '../validators/appointmentValidators.js';

import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @route   POST /api/clinical/appointments
 * @desc    Crear nueva cita
 * @access  Veterinario, Admin
 */
router.post(
    '/',
    authorize(['admin', 'vet', 'aux']),
    validateCreateAppointment,
    validateRequest,
    createAppointment
);

/**
 * @route   GET /api/clinical/appointments
 * @desc    Obtener lista de citas con filtros
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/',
    authorize(['admin', 'vet', 'aux']),
    validateGetAppointments,
    validateRequest,
    getAppointments
);

/**
 * @route   GET /api/clinical/appointments/calendar
 * @desc    Obtener vista de calendario
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/calendar',
    authorize(['admin', 'vet', 'aux']),
    getCalendarView
);

/**
 * @route   GET /api/clinical/appointments/stats
 * @desc    Obtener estadísticas de citas
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/stats',
    authorize(['admin', 'vet', 'aux']),
    getAppointmentStats
);

/**
 * @route   GET /api/clinical/appointments/vet/:id
 * @desc    Obtener citas por veterinario
 * @access  Veterinario (solo sus citas), Admin
 */
router.get(
    '/vet/:id',
    authorize(['admin', 'vet']),
    validateUUIDParam,
    validateRequest,
    (req, res, next) => {
        // Los veterinarios solo pueden ver sus propias citas
        if (req.user.rol === 'vet' && req.user.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para ver las citas de otro veterinario'
            });
        }
        next();
    },
    getAppointmentsByVet
);

/**
 * @route   GET /api/clinical/appointments/pet/:id
 * @desc    Obtener citas por mascota
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/pet/:id',
    authorize(['admin', 'vet', 'aux']),
    validateUUIDParam,
    validateRequest,
    getAppointmentsByPet
);

/**
 * @route   GET /api/clinical/appointments/:id
 * @desc    Obtener cita específica por ID
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/:id',
    authorize(['admin', 'vet', 'aux']),
    validateUUIDParam,
    validateRequest,
    getAppointmentById
);

/**
 * @route   PUT /api/clinical/appointments/:id
 * @desc    Actualizar cita completa
 * @access  Veterinario, Admin
 */
router.put(
    '/:id',
    authorize(['admin', 'vet']),
    validateUpdateAppointment,
    validateRequest,
    updateAppointment
);

/**
 * @route   PATCH /api/clinical/appointments/:id/status
 * @desc    Actualizar solo el estado de la cita
 * @access  Veterinario, Admin, Auxiliar
 */
router.patch(
    '/:id/status',
    authorize(['admin', 'vet', 'aux']),
    validateUpdateAppointmentStatus,
    validateRequest,
    updateAppointmentStatus
);

/**
 * @route   DELETE /api/clinical/appointments/:id
 * @desc    Cancelar cita
 * @access  Veterinario, Admin
 */
router.delete(
    '/:id',
    authorize(['admin', 'vet']),
    validateUUIDParam,
    validateRequest,
    cancelAppointment
);

/**
 * @route   POST /api/clinical/appointments/:id/sync-google
 * @desc    Forzar sincronización con Google Calendar
 * @access  Veterinario, Admin
 */
router.post(
    '/:id/sync-google',
    authorize(['admin', 'vet']),
    validateUUIDParam,
    validateRequest,
    forceSyncWithGoogle
);

/**
 * @route   POST /api/clinical/appointments/force-sync-google
 * @desc    Forzar sincronización con Google Calendar (todas las citas pendientes)
 * @access  Admin
 */
router.post(
    '/force-sync-google',
    authorize(['admin', 'aux']),
    syncAllPendingAppointments
);

/**
 * @route   POST /api/clinical/appointments/sync-all-pending
 * @desc    Sincronizar todas las citas pendientes con Google Calendar
 * @access  Admin
 */
router.post(
    '/sync-all-pending',
    authorize(['admin', 'aux']),
    syncAllPendingAppointments
);

/**
 * @route   GET /api/clinical/appointments/vet/:id/availability
 * @desc    Obtener disponibilidad del veterinario
 * @access  Veterinario (propia), Admin
 */
router.get(
    '/vet/:id/availability',
    authorize(['admin', 'vet']),
    validateUUIDParam,
    validateRequest,
    getVeterinarianAvailability
);

/**
 * @route   GET /api/clinical/appointments/vet/:id/suggest-slots
 * @desc    Sugerir horarios alternativos disponibles
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/vet/:id/suggest-slots',
    authorize(['admin', 'vet', 'aux']),
    validateUUIDParam,
    validateRequest,
    suggestAvailableSlots
);

/**
 * @route   GET /api/clinical/veterinarians
 * @desc    Obtener lista de veterinarios activos
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/veterinarians',
    authorize(['admin', 'vet', 'aux']),
    async (req, res) => {
        try {
            const result = await query(`
                SELECT 
                    id_usuario,
                    CONCAT(nombre, ' ', apellido) as nombre,
                    email,
                    especialidad,
                    numero_licencia
                FROM vetplus_auth.usuarios 
                WHERE rol IN ('vet', 'admin') 
                AND activo = true
                ORDER BY nombre ASC
            `);
            
            console.log(`📋 Veterinarios encontrados: ${result.rows.length}`);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error obteniendo veterinarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
);

/**
 * @route   POST /api/clinical/appointments/:id/sync-calendar
 * @desc    Sincronizar manualmente el estado de una cita con Google Calendar
 * @access  Veterinario, Admin, Auxiliar
 */
router.post(
    '/:id/sync-calendar',
    authorize(['admin', 'vet', 'aux']),
    validateUUIDParam,
    validateRequest,
    syncAppointmentWithCalendar
);

/**
 * @route   GET /api/clinical/appointments/:id/consultation
 * @desc    Obtener la historia clínica vinculada a una cita
 * @access  Veterinario, Admin, Auxiliar
 */
router.get(
    '/:id/consultation',
    authorize(['admin', 'vet', 'aux']),
    validateUUIDParam,
    validateRequest,
    getAppointmentConsultation
);

export default router;
