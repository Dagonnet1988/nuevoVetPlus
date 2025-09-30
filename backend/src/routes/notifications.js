/**
 * @fileoverview Rutas para configuración de notificaciones automáticas
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import express from 'express';
import { body } from 'express-validator/lib/index.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
    getNotificationConfig,
    updateNotificationConfig,
    getNotificationStats,
    testNotification,
    restartNotificationService
} from '../controllers/notificationController.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestión de notificaciones automáticas
 */

/**
 * @route   GET /api/admin/notifications/config
 * @desc    Obtener configuración actual de notificaciones
 * @access  Admin
 */
router.get(
    '/config',
    authorize(['admin']),
    getNotificationConfig
);

/**
 * @route   PUT /api/admin/notifications/config
 * @desc    Actualizar configuración de notificaciones
 * @access  Admin
 */
router.put(
    '/config',
    authorize(['admin']),
    [
        body('notificaciones_activas').isBoolean().withMessage('Estado de notificaciones debe ser booleano'),
        body('limite_diario_mensajes').isInt({ min: 1, max: 500 }).withMessage('Límite diario debe estar entre 1 y 500'),
        body('intervalo_minimo_minutos').isInt({ min: 1, max: 60 }).withMessage('Intervalo mínimo debe estar entre 1 y 60 minutos'),
        body('mensaje_cita_confirmada').optional().isLength({ min: 10, max: 500 }).withMessage('Mensaje de confirmación debe tener entre 10 y 500 caracteres'),
        body('mensaje_recordatorio_24h').optional().isLength({ min: 10, max: 500 }).withMessage('Mensaje de recordatorio 24h debe tener entre 10 y 500 caracteres'),
        body('mensaje_recordatorio_2h').optional().isLength({ min: 10, max: 500 }).withMessage('Mensaje de recordatorio 2h debe tener entre 10 y 500 caracteres')
    ],
    updateNotificationConfig
);

/**
 * @route   GET /api/admin/notifications/stats
 * @desc    Obtener estadísticas de notificaciones
 * @access  Admin
 */
router.get(
    '/stats',
    authorize(['admin']),
    getNotificationStats
);

/**
 * @route   POST /api/admin/notifications/test
 * @desc    Enviar notificación de prueba
 * @access  Admin
 */
router.post(
    '/test',
    authorize(['admin']),
    [
        body('numero_telefono').isMobilePhone('es-CO').withMessage('Número de teléfono inválido'),
        body('tipo_mensaje').optional().isIn(['test', 'confirmacion', 'recordatorio']).withMessage('Tipo de mensaje inválido')
    ],
    testNotification
);

/**
 * @route   POST /api/admin/notifications/restart
 * @desc    Reiniciar servicio de notificaciones
 * @access  Admin
 */
router.post(
    '/restart',
    authorize(['admin']),
    restartNotificationService
);

export default router;
