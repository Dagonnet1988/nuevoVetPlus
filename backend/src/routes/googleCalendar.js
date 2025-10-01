import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getGoogleCalendarConfig,
    configureGoogleCalendar,
    completeGoogleAuth,
    testGoogleCalendarConnection,
    disableGoogleCalendar,
    getSyncStatus,
    diagnoseGoogleCalendarSync,
    importFromGoogleCalendar,
    syncChangesFromGoogle,
    getPendingMatches,
    resolveManualMatch,
    getSchedulerStats,
    runManualSync,
    getSchedulerStatus,
    getGoogleCalendarAuthUrl,
    importGoogleEventsToVetPlus,
    setupWebhook,
    stopWebhook,
    getWebhookStatus,
    renewWebhook,
    serveCallbackScript,
    googleCalendarSimpleController
} from '../controllers/googleCalendarController.js';

const router = express.Router();

// Callback de Google Calendar (no requiere autenticación)
router.get('/callback', googleCalendarSimpleController.handleCallback);

// Servir script JavaScript para callback (compatible con CSP)
router.get('/static/callback-script.js', serveCallbackScript);

// Aplicar autenticación a todas las demás rutas
router.use(authenticateToken);

/**
 * @route GET /api/google-calendar/config
 * @desc Obtener configuración actual de Google Calendar (solo admins)
 * @access Admin
 */
router.get('/config', getGoogleCalendarConfig);

/**
 * @route GET /api/google-calendar/auth-url
 * @desc Obtener URL de autorización de Google Calendar (solo admins)
 * @access Admin
 */
router.get('/auth-url', getGoogleCalendarAuthUrl);

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
 * @route GET /api/google-calendar/diagnose
 * @desc Diagnóstico completo de sincronización con Google Calendar
 * @access Admin
 */
router.get('/diagnose', diagnoseGoogleCalendarSync);

/**
 * @route POST /api/google-calendar/import
 * @desc Importar eventos desde Google Calendar
 * @access Admin
 * @body { fecha_inicio, fecha_fin, auto_match?, create_missing_data?, dry_run? }
 */
router.post('/import', importFromGoogleCalendar);

/**
 * @route POST /api/google-calendar/import-to-vetplus
 * @desc Importar eventos de Google Calendar como citas en VetPlus
 * @access Admin
 * @body { fecha_inicio, fecha_fin, create_missing_data?, dry_run? }
 */
router.post('/import-to-vetplus', importGoogleEventsToVetPlus);

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

/**
 * @route GET /api/google-calendar/simple/config
 * @desc Obtener configuración simplificada
 * @access Admin
 */
router.get('/simple/config', googleCalendarSimpleController.getConfig);

/**
 * @route POST /api/google-calendar/simple/configure
 * @desc Configurar Google Calendar de forma simplificada
 * @access Admin
 * @body { activo, cliente_id, cliente_secret, calendar_id, sync_automatico, prefijo_eventos }
 */
router.post('/simple/configure', googleCalendarSimpleController.saveConfig);

/**
 * @route GET /api/google-calendar/simple/auth-url
 * @desc Obtener URL de autorización simplificada
 * @access Admin
 */
router.get('/simple/auth-url', googleCalendarSimpleController.getAuthUrl);

/**
 * @route GET /api/google-calendar/simple/status
 * @desc Obtener estado de conexión simplificado
 * @access Admin
 */
router.get('/simple/status', googleCalendarSimpleController.getStatus);

/**
 * @route POST /api/google-calendar/simple/test-connection
 * @desc Probar conexión simplificada
 * @access Admin
 */
router.post('/simple/test-connection', googleCalendarSimpleController.testConnection);

/**
 * @route POST /api/google-calendar/simple/disable
 * @desc Desconectar Google Calendar simplificado
 * @access Admin
 */
router.post('/simple/disable', googleCalendarSimpleController.disconnect);

/**
 * @route POST /api/google-calendar/webhook/setup
 * @desc Configurar webhook de Google Calendar
 * @access Admin
 */
router.post('/webhook/setup', setupWebhook);

/**
 * @route POST /api/google-calendar/webhook/stop
 * @desc Detener webhook de Google Calendar
 * @access Admin
 */
router.post('/webhook/stop', stopWebhook);

/**
 * @route GET /api/google-calendar/webhook/status
 * @desc Obtener estado del webhook
 * @access Admin, Vet
 */
router.get('/webhook/status', getWebhookStatus);

/**
 * @route POST /api/google-calendar/webhook/renew
 * @desc Renovar webhook de Google Calendar
 * @access Admin
 */
router.post('/webhook/renew', renewWebhook);

export default router;