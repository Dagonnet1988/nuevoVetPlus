/**
 * @fileoverview Rutas para el estado del sistema
 * @version 1.0.0
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
    getSystemStatus, 
    getConfigSummary 
} from '../controllers/systemStatusController.js';

const router = Router();

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: Obtener estado general del sistema
 *     tags: [Estado del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del sistema obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     empresa:
 *                       type: object
 *                     google_calendar:
 *                       type: object
 *                     whatsapp:
 *                       type: object
 *                     sistema:
 *                       type: object
 */
router.get('/status', authenticateToken, getSystemStatus);

/**
 * @swagger
 * /api/system/config-summary:
 *   get:
 *     summary: Obtener resumen de configuraciones
 *     tags: [Estado del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de configuraciones obtenido exitosamente
 */
router.get('/config-summary', authenticateToken, getConfigSummary);

export default router;