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
  validateQueryCajas
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
  authorize(['admin', 'veterinario']), 
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
 * @route   PUT /api/financial/cajas/:caja_id/cerrar
 * @desc    Cerrar caja activa
 * @access  Private (Admin)
 */
router.put('/cajas/:caja_id/cerrar', 
  authenticateToken, 
  authorize(['admin']), 
  validateCerrarCaja,
  CajasController.cerrarCaja
);

/**
 * @route   GET /api/financial/cajas/activa/resumen
 * @desc    Obtener resumen de caja activa
 * @access  Private (Admin, Veterinario)
 */
router.get('/cajas/activa/resumen', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  CajasController.getResumenCajaActiva
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
  authorize(['admin', 'veterinario']), 
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
  authorize(['admin', 'veterinario']), 
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
  authorize(['admin', 'veterinario']), 
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
  authorize(['admin', 'veterinario']), 
  validateGetReporte,
  CajasController.getReporteFinanciero
);

export default router;
