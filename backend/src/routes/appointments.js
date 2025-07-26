import express from 'express';
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
    suggestAvailableSlots
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
    authorize(['veterinario', 'admin']),
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
    authorize(['veterinario', 'admin', 'auxiliar']),
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
    authorize(['veterinario', 'admin', 'auxiliar']),
    getCalendarView
);

/**
 * @route   GET /api/clinical/appointments/vet/:id
 * @desc    Obtener citas por veterinario
 * @access  Veterinario (solo sus citas), Admin
 */
router.get(
    '/vet/:id',
    authorize(['veterinario', 'admin']),
    validateUUIDParam,
    validateRequest,
    (req, res, next) => {
        // Los veterinarios solo pueden ver sus propias citas
        if (req.user.role === 'veterinario' && req.user.id !== req.params.id) {
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
    authorize(['veterinario', 'admin', 'auxiliar']),
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
    authorize(['veterinario', 'admin', 'auxiliar']),
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
    authorize(['veterinario', 'admin']),
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
    authorize(['veterinario', 'admin', 'auxiliar']),
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
    authorize(['veterinario', 'admin']),
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
    authorize(['vet', 'admin']),
    validateUUIDParam,
    validateRequest,
    forceSyncWithGoogle
);

/**
 * @route   POST /api/clinical/appointments/sync-all-pending
 * @desc    Sincronizar todas las citas pendientes con Google Calendar
 * @access  Admin
 */
router.post(
    '/sync-all-pending',
    authorize(['admin']),
    syncAllPendingAppointments
);

/**
 * @route   GET /api/clinical/appointments/vet/:id/availability
 * @desc    Obtener disponibilidad del veterinario
 * @access  Veterinario (propia), Admin
 */
router.get(
    '/vet/:id/availability',
    authorize(['vet', 'admin']),
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
    authorize(['vet', 'admin', 'auxiliar']),
    validateUUIDParam,
    validateRequest,
    suggestAvailableSlots
);

export default router;
