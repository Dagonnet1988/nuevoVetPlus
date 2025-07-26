/**
 * @fileoverview Rutas para gestión de WhatsApp
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
    getWhatsAppStatus,
    getWhatsAppQR,
    restartWhatsApp,
    logoutWhatsApp,
    sendTestMessage,
    sendFacturaPorWhatsApp,
    sendFormulaPorWhatsApp,
    getWhatsAppStats,
    getWhatsAppMessages,
    retryWhatsAppMessage
} from '../controllers/whatsappController.js';

const router = express.Router();

// Validaciones
const validateTestMessage = [
    body('numero_telefono')
        .notEmpty()
        .withMessage('El número de teléfono es requerido')
        .matches(/^[+]?[0-9\s\-\(\)]{10,15}$/)
        .withMessage('Formato de número de teléfono inválido'),
    
    body('mensaje')
        .notEmpty()
        .withMessage('El mensaje es requerido')
        .isLength({ min: 1, max: 1000 })
        .withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
];

const validateSendFactura = [
    body('factura_id')
        .notEmpty()
        .withMessage('El ID de la factura es requerido')
        .isUUID()
        .withMessage('ID de factura inválido'),
    
    body('numero_telefono')
        .optional()
        .matches(/^[+]?[0-9\s\-\(\)]{10,15}$/)
        .withMessage('Formato de número de teléfono inválido'),
    
    body('cliente_nombre')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('El nombre del cliente debe tener entre 2 y 200 caracteres')
];

const validateSendFormula = [
    body('consulta_id')
        .notEmpty()
        .withMessage('El ID de la consulta es requerido')
        .isUUID()
        .withMessage('ID de consulta inválido'),
    
    body('numero_telefono')
        .optional()
        .matches(/^[+]?[0-9\s\-\(\)]{10,15}$/)
        .withMessage('Formato de número de teléfono inválido'),
    
    body('cliente_nombre')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('El nombre del cliente debe tener entre 2 y 200 caracteres')
];

const validateStatsQuery = [
    query('fecha_inicio')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido para fecha_inicio'),
    
    query('fecha_fin')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido para fecha_fin')
];

const validateMessagesQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero mayor a 0'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),
    
    query('estado')
        .optional()
        .isIn(['pending', 'sent', 'delivered', 'read', 'failed'])
        .withMessage('Estado inválido'),
    
    query('tipo_documento')
        .optional()
        .isIn(['factura', 'formula', 'resultado', 'recordatorio'])
        .withMessage('Tipo de documento inválido')
];

// Middleware para verificar permisos de administrador
const requireAdmin = authorize(['admin']);

/**
 * @swagger
 * components:
 *   schemas:
 *     WhatsAppStatus:
 *       type: object
 *       properties:
 *         isConnected:
 *           type: boolean
 *         isConnecting:
 *           type: boolean
 *         hasQR:
 *           type: boolean
 *         isConfigured:
 *           type: boolean
 */

/**
 * @swagger
 * /api/admin/whatsapp/status:
 *   get:
 *     summary: Obtener estado de conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WhatsAppStatus'
 *       403:
 *         description: Acceso denegado
 */
router.get('/admin/status', authenticateToken, requireAdmin, getWhatsAppStatus);

/**
 * @swagger
 * /api/admin/whatsapp/qr:
 *   get:
 *     summary: Obtener código QR para conectar WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Código QR obtenido exitosamente
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
 *                     qr_code:
 *                       type: string
 *                       description: Código QR en formato Data URL
 *                     message:
 *                       type: string
 *       404:
 *         description: No hay código QR disponible
 *       403:
 *         description: Acceso denegado
 */
router.get('/admin/qr', authenticateToken, requireAdmin, getWhatsAppQR);

/**
 * @swagger
 * /api/admin/whatsapp/restart:
 *   post:
 *     summary: Reiniciar conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp reiniciado exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.post('/admin/restart', authenticateToken, requireAdmin, restartWhatsApp);

/**
 * @swagger
 * /api/admin/whatsapp/logout:
 *   post:
 *     summary: Desconectar y limpiar sesión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión eliminada exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.post('/admin/logout', authenticateToken, requireAdmin, logoutWhatsApp);

/**
 * @swagger
 * /api/admin/whatsapp/test-message:
 *   post:
 *     summary: Enviar mensaje de prueba
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero_telefono
 *               - mensaje
 *             properties:
 *               numero_telefono:
 *                 type: string
 *                 example: "+573001234567"
 *               mensaje:
 *                 type: string
 *                 example: "Mensaje de prueba desde VetPlus"
 *     responses:
 *       200:
 *         description: Mensaje enviado exitosamente
 *       400:
 *         description: Datos inválidos o WhatsApp no conectado
 *       403:
 *         description: Acceso denegado
 */
router.post('/admin/test-message', authenticateToken, requireAdmin, validateTestMessage, sendTestMessage);

/**
 * @swagger
 * /api/whatsapp/send-factura:
 *   post:
 *     summary: Enviar factura por WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - factura_id
 *             properties:
 *               factura_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               numero_telefono:
 *                 type: string
 *                 example: "+573001234567"
 *                 description: Opcional, se usa el del cliente si no se especifica
 *               cliente_nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *                 description: Opcional, se usa el del cliente si no se especifica
 *     responses:
 *       200:
 *         description: Factura enviada exitosamente
 *       400:
 *         description: Datos inválidos o WhatsApp no conectado
 *       404:
 *         description: Factura no encontrada
 */
router.post('/send-factura', authenticateToken, validateSendFactura, sendFacturaPorWhatsApp);

/**
 * @swagger
 * /api/whatsapp/send-formula:
 *   post:
 *     summary: Enviar fórmula médica por WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consulta_id
 *             properties:
 *               consulta_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               numero_telefono:
 *                 type: string
 *                 example: "+573001234567"
 *                 description: Opcional, se usa el del cliente si no se especifica
 *               cliente_nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *                 description: Opcional, se usa el del cliente si no se especifica
 *     responses:
 *       200:
 *         description: Fórmula enviada exitosamente
 *       400:
 *         description: Datos inválidos o WhatsApp no conectado
 *       404:
 *         description: Consulta no encontrada
 */
router.post('/send-formula', authenticateToken, validateSendFormula, sendFormulaPorWhatsApp);

/**
 * @swagger
 * /api/admin/whatsapp/stats:
 *   get:
 *     summary: Obtener estadísticas de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.get('/admin/stats', authenticateToken, requireAdmin, validateStatsQuery, getWhatsAppStats);

/**
 * @swagger
 * /api/admin/whatsapp/messages:
 *   get:
 *     summary: Obtener historial de mensajes enviados
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, read, failed]
 *         description: Filtrar por estado
 *       - in: query
 *         name: tipo_documento
 *         schema:
 *           type: string
 *           enum: [factura, formula, resultado, recordatorio]
 *         description: Filtrar por tipo de documento
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.get('/admin/messages', authenticateToken, requireAdmin, validateMessagesQuery, getWhatsAppMessages);

/**
 * @swagger
 * /api/admin/whatsapp/retry/{logId}:
 *   post:
 *     summary: Reenviar mensaje fallido
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del log del mensaje fallido
 *     responses:
 *       200:
 *         description: Mensaje reenviado exitosamente
 *       400:
 *         description: WhatsApp no conectado
 *       404:
 *         description: Mensaje no encontrado o no se puede reintentar
 *       403:
 *         description: Acceso denegado
 */
router.post('/admin/retry/:logId', 
    authenticateToken, 
    requireAdmin, 
    param('logId').isUUID().withMessage('ID de log inválido'), 
    retryWhatsAppMessage
);

export default router;