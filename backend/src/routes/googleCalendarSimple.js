import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import googleCalendarSimpleController from '../controllers/googleCalendarSimpleController.js';
import { setupWebhook, stopWebhook, getWebhookStatus, renewWebhook } from '../controllers/googleCalendarController.js';

const router = express.Router();

// Callback de Google Calendar (sin autenticación)
router.get('/callback', googleCalendarSimpleController.handleCallback);

// Aplicar autenticación a las demás rutas
router.use(authenticateToken);

// Rutas simplificadas
router.get('/config', googleCalendarSimpleController.getConfig);
router.post('/configure', googleCalendarSimpleController.saveConfig);
router.get('/auth-url', googleCalendarSimpleController.getAuthUrl);
router.get('/sync-status', googleCalendarSimpleController.getStatus);
router.post('/test-connection', googleCalendarSimpleController.testConnection);
router.post('/disable', googleCalendarSimpleController.disconnect);

// Rutas de webhook
router.post('/webhook/setup', setupWebhook);
router.post('/webhook/stop', stopWebhook);
router.get('/webhook/status', getWebhookStatus);
router.post('/webhook/renew', renewWebhook);

export default router;
