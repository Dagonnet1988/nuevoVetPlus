import express from 'express';
import { verifyWebhook, processWebhook } from '../controllers/googleCalendarWebhookController.js';

const router = express.Router();

/**
 * Ruta para verificación de webhook de Google Calendar
 * GET /api/google-calendar-webhook - Verificar webhook durante configuración
 */
router.get('/', verifyWebhook);

/**
 * Ruta para recibir notificaciones de webhook de Google Calendar
 * POST /api/google-calendar-webhook - Procesar notificaciones de cambios
 */
router.post('/', processWebhook);

export default router;