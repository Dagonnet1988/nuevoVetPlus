import express from 'express';
import CajasController from '../controllers/cajasController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateCaja,
  validateCerrarCaja,
  validateRegistrarIngreso,
  validateRegistrarEgreso,
  validateGetTransacciones,
  validateGetReporte,
  validateQueryCajas,
  validateTransferencia,
  validateGetTransferencias,
  validateUpdateCaja,
  validateDeleteCaja
} from '../validators/cajasValidators.js';

const router = express.Router();

/**
 * RUTAS DEL SISTEMA DE CAJAS
 * Gestión completa de cajas, ingresos y egresos
 */

// ================================
// GESTIÓN DE CAJAS
// ================================

/**
 * @route   GET /api/financial/cajas
 * @desc    Obtener todas las cajas
 * @access  Private (Admin, Veterinario)
 */
router.get('/cajas', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  validateQueryCajas,
  CajasController.getCajas
);

/**
 * @route   POST /api/financial/cajas
 * @desc    Crear nueva caja
 * @access  Private (Admin)
 */
router.post('/cajas', 
  authenticateToken, 
  authorize(['admin']), 
  validateCreateCaja,
  CajasController.createCaja
);

/**
 * @route   PUT /api/financial/cajas/:caja_id
 * @desc    Actualizar caja existente
 * @access  Private (Admin)
 */
router.put('/cajas/:caja_id', 
  authenticateToken, 
  authorize(['admin']), 
  validateUpdateCaja,
  CajasController.updateCaja
);

/**
 * @route   DELETE /api/financial/cajas/:caja_id
 * @desc    Desactivar caja (no se elimina físicamente)
 * @access  Private (Admin)
 */
router.delete('/cajas/:caja_id', 
  authenticateToken, 
  authorize(['admin']), 
  validateDeleteCaja,
  CajasController.deleteCaja
);

/**
 * @route   GET /api/financial/cajas/:caja_id/movimientos
 * @desc    Obtener movimientos de una caja específica
 * @access  Private (Admin, Veterinario)
 */
router.get('/cajas/:caja_id/movimientos', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  CajasController.getMovimientosCaja
);

// ================================
// GESTIÓN DE INGRESOS
// ================================

/**
 * @route   POST /api/financial/ingresos
 * @desc    Registrar nuevo ingreso
 * @access  Private (Admin, Veterinario)
 */
router.post('/ingresos', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin']), 
  validateRegistrarIngreso,
  CajasController.registrarIngreso
);

/**
 * @route   GET /api/financial/ingresos
 * @desc    Obtener ingresos con filtros
 * @access  Private (Admin, Veterinario)
 */
router.get('/ingresos', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  validateGetTransacciones,
  CajasController.getIngresos
);

// ================================
// GESTIÓN DE EGRESOS
// ================================

/**
 * @route   POST /api/financial/egresos
 * @desc    Registrar nuevo egreso
 * @access  Private (Admin)
 */
router.post('/egresos', 
  authenticateToken, 
  authorize(['admin']), 
  validateRegistrarEgreso,
  CajasController.registrarEgreso
);

/**
 * @route   GET /api/financial/egresos
 * @desc    Obtener egresos con filtros
 * @access  Private (Admin, Veterinario)
 */
router.get('/egresos', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  validateGetTransacciones,
  CajasController.getEgresos
);

// ================================
// REPORTES FINANCIEROS
// ================================

/**
 * @route   GET /api/financial/reportes/financiero
 * @desc    Generar reporte financiero con agrupaciones
 * @access  Private (Admin, Veterinario)
 */
router.get('/reportes/financiero', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  validateGetReporte,
  CajasController.getReporteFinanciero
);

// ================================
// TRANSFERENCIAS ENTRE CAJAS
// ================================

/**
 * @route   POST /api/financial/transferencias
 * @desc    Realizar transferencia entre cajas
 * @access  Private (Admin)
 */
router.post('/transferencias', 
  authenticateToken, 
  authorize(['admin']), 
  validateTransferencia,
  CajasController.transferirEntreCajas
);

/**
 * @route   GET /api/financial/transferencias
 * @desc    Obtener historial de transferencias
 * @access  Private (Admin, Veterinario)
 */
router.get('/transferencias', 
  authenticateToken, 
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), 
  validateGetTransferencias,
  CajasController.getTransferencias
);

export default router;
