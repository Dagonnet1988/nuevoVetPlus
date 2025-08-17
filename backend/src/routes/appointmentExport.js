import express from 'express';
import appointmentExportController from '../controllers/appointmentExportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/appointments/export/pdf:
 *   get:
 *     summary: Exportar agenda en formato PDF
 *     tags: [Appointments Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: veterinario_id
 *         schema:
 *           type: string
 *         description: ID del veterinario (requerido para agenda individual)
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período
 *       - in: query
 *         name: formato
 *         schema:
 *           type: string
 *           enum: [individual, consolidada]
 *           default: individual
 *         description: Tipo de exportación
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
// TEMPORAL: Sin auth para testing
router.get('/pdf', appointmentExportController.exportAgendaPDF.bind(appointmentExportController));

/**
 * @swagger
 * /api/appointments/export/xlsx:
 *   get:
 *     summary: Exportar agenda en formato XLSX (Excel)
 *     tags: [Appointments Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: veterinario_id
 *         schema:
 *           type: string
 *         description: ID del veterinario (requerido para agenda individual)
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período
 *       - in: query
 *         name: formato
 *         schema:
 *           type: string
 *           enum: [individual, consolidada]
 *           default: individual
 *         description: Tipo de exportación
 *     responses:
 *       200:
 *         description: XLSX generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/xlsx', authenticateToken, appointmentExportController.exportAgendaXLSX.bind(appointmentExportController));

export default router;