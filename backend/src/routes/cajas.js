import express from 'express';
import cajasController from '../controllers/cajasController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/financial/cajas
 * @desc    Obtener todas las cajas
 * @access  Private (admin, vet, aux_admin)
 */
router.get('/', authorize(['admin', 'vet', 'aux_admin']), cajasController.getCajas);

/**
 * @route   POST /api/financial/cajas
 * @desc    Crear nueva caja
 * @access  Private (admin)
 */
router.post('/', authorize(['admin']), cajasController.createCaja);

/**
 * @route   GET /api/financial/cajas/resumen/activa
 * @desc    Obtener resumen de caja activa
 * @access  Private (admin, vet, aux_admin)
 */
router.get('/resumen/activa', authorize(['admin', 'vet', 'aux_admin']), cajasController.getResumenCajaActiva);

/**
 * @route   PUT /api/financial/cajas/:caja_id
 * @desc    Actualizar caja
 * @access  Private (admin)
 */
router.put('/:caja_id', authorize(['admin']), cajasController.updateCaja);

/**
 * @route   DELETE /api/financial/cajas/:caja_id
 * @desc    Eliminar/desactivar caja
 * @access  Private (admin)
 */
router.delete('/:caja_id', authorize(['admin']), cajasController.deleteCaja);

/**
 * @route   PATCH /api/financial/cajas/:id/cerrar
 * @desc    Cerrar caja activa
 * @access  Private (admin)
 */
router.patch('/:id/cerrar', authorize(['admin']), cajasController.cerrarCaja);

/**
 * @route   GET /api/financial/cajas/:caja_id/movimientos
 * @desc    Obtener movimientos de una caja específica
 * @access  Private (admin)
 */
router.get('/:caja_id/movimientos', authorize(['admin']), cajasController.getMovimientosCaja);

/**
 * INGRESOS
 */

/**
 * @route   POST /api/financial/ingresos
 * @desc    Registrar nuevo ingreso
 * @access  Private (admin)
 */
router.post('/ingresos', authorize(['admin']), cajasController.registrarIngreso);

/**
 * @route   GET /api/financial/ingresos
 * @desc    Obtener ingresos con filtros
 * @access  Private (admin)
 */
router.get('/ingresos', authorize(['admin']), cajasController.getIngresos);

/**
 * EGRESOS
 */

/**
 * @route   POST /api/financial/egresos
 * @desc    Registrar nuevo egreso
 * @access  Private (admin)
 */
router.post('/egresos', authorize(['admin']), cajasController.registrarEgreso);

/**
 * @route   GET /api/financial/egresos
 * @desc    Obtener egresos con filtros
 * @access  Private (admin)
 */
router.get('/egresos', authorize(['admin']), cajasController.getEgresos);

/**
 * TRANSFERENCIAS
 */

/**
 * @route   POST /api/financial/transferencias
 * @desc    Realizar transferencia entre cajas
 * @access  Private (admin)
 */
router.post('/transferencias', authorize(['admin']), cajasController.transferirEntreCajas);

/**
 * @route   GET /api/financial/transferencias
 * @desc    Obtener transferencias con filtros
 * @access  Private (admin)
 */
router.get('/transferencias', authorize(['admin']), cajasController.getTransferencias);

/**
 * REPORTES
 */

/**
 * @route   GET /api/financial/reportes/financiero
 * @desc    Obtener reporte financiero
 * @access  Private (admin)
 */
router.get('/reportes/financiero', authorize(['admin']), cajasController.getReporteFinanciero);

export default router;
