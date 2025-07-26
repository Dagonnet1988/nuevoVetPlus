import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getGoogleCalendarConfig,
    configureGoogleCalendar,
    completeGoogleAuth,
    testGoogleCalendarConnection,
    disableGoogleCalendar,
    getSyncStatus,
    importFromGoogleCalendar,
    syncChangesFromGoogle,
    getPendingMatches,
    resolveManualMatch,
    getSchedulerStats,
    runManualSync,
    getSchedulerStatus
} from '../controllers/googleCalendarController.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/google-calendar/config
 * @desc Obtener configuración actual de Google Calendar (solo admins)
 * @access Admin
 */
router.get('/config', getGoogleCalendarConfig);

/**
 * @route POST /api/google-calendar/configure
 * @desc Configurar credenciales de Google Calendar (solo admins)
 * @access Admin
 * @body { client_id, client_secret, redirect_uri, calendar_id?, timezone?, notification_email?, notification_popup?, default_reminder_minutes?, email_reminder_hours? }
 */
router.post('/configure', configureGoogleCalendar);

/**
 * @route POST /api/google-calendar/complete-auth
 * @desc Completar autorización con código de Google (solo admins)
 * @access Admin
 * @body { code }
 */
router.post('/complete-auth', completeGoogleAuth);

/**
 * @route POST /api/google-calendar/test-connection
 * @desc Probar conexión con Google Calendar (solo admins)
 * @access Admin
 */
router.post('/test-connection', testGoogleCalendarConnection);

/**
 * @route POST /api/google-calendar/disable
 * @desc Desactivar integración con Google Calendar (solo admins)
 * @access Admin
 */
router.post('/disable', disableGoogleCalendar);

/**
 * @route GET /api/google-calendar/sync-status
 * @desc Obtener estado de sincronización de citas
 * @access Admin, Vet
 */
router.get('/sync-status', getSyncStatus);

/**
 * @route GET /api/google-calendar/auth/callback
 * @desc Callback de autorización de Google (para desarrollo)
 * @access Public (temporal)
 */
router.get('/auth/callback', async (req, res) => {
    try {
        const { code, error } = req.query;
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Error en la autorización: ' + error
            });
        }
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Código de autorización no recibido'
            });
        }
        
        // Este endpoint es solo para mostrar el código
        // El admin debe copiarlo y usarlo en el endpoint /complete-auth
        res.json({
            success: true,
            message: 'Código de autorización recibido. Copia este código y úsalo en el endpoint /complete-auth',
            authorization_code: code,
            instructions: {
                next_step: 'Usar POST /api/google-calendar/complete-auth',
                body: { code: code }
            }
        });
        
    } catch (error) {
        console.error('Error en callback de Google:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * @route POST /api/google-calendar/import
 * @desc Importar eventos desde Google Calendar
 * @access Admin
 * @body { fecha_inicio, fecha_fin, auto_match?, create_missing_data?, dry_run? }
 */
router.post('/import', importFromGoogleCalendar);

/**
 * @route POST /api/google-calendar/sync-changes
 * @desc Sincronizar cambios desde Google Calendar
 * @access Admin
 */
router.post('/sync-changes', syncChangesFromGoogle);

/**
 * @route GET /api/google-calendar/pending-matches
 * @desc Obtener eventos pendientes de matching manual
 * @access Admin, Vet
 */
router.get('/pending-matches', getPendingMatches);

/**
 * @route POST /api/google-calendar/resolve-match/:id_cita
 * @desc Resolver matching manual para una cita
 * @access Admin
 * @body { id_cliente, id_mascota, id_veterinario }
 */
router.post('/resolve-match/:id_cita', resolveManualMatch);

/**
 * @route GET /api/google-calendar/scheduler/stats
 * @desc Obtener estadísticas del scheduler de sincronización
 * @access Admin
 */
router.get('/scheduler/stats', getSchedulerStats);

/**
 * @route POST /api/google-calendar/scheduler/run-sync
 * @desc Ejecutar sincronización manual del scheduler
 * @access Admin
 */
router.post('/scheduler/run-sync', runManualSync);

/**
 * @route GET /api/google-calendar/scheduler/status
 * @desc Obtener estado del scheduler
 * @access Admin
 */
router.get('/scheduler/status', getSchedulerStatus);

export default router;