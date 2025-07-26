import express from 'express';
import ProveedoresController from '../controllers/proveedoresController.js';
import OrdenesCompraController from '../controllers/ordenesCompraController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateProveedor,
  validateUpdateProveedor,
  validateProveedorId,
  validateQueryProveedores,
  validateCreateOrdenCompra,
  validateOrdenCompraId,
  validateRecibirOrden,
  validatePagarOrden,
  validateQueryOrdenes,
  validateQueryVencimientos
} from '../validators/proveedoresValidators.js';

const router = express.Router();

/**
 * RUTAS DE PROVEEDORES
 * Gestión completa de proveedores
 */

// ================================
// GESTIÓN DE PROVEEDORES
// ================================

/**
 * @route   GET /api/financial/proveedores
 * @desc    Obtener todos los proveedores
 * @access  Private (Admin, Veterinario)
 */
router.get('/proveedores', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateQueryProveedores,
  ProveedoresController.getProveedores
);

/**
 * @route   GET /api/financial/proveedores/stats
 * @desc    Obtener estadísticas de proveedores
 * @access  Private (Admin, Veterinario)
 */
router.get('/proveedores/stats', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  ProveedoresController.getEstadisticasProveedores
);

/**
 * @route   GET /api/financial/proveedores/:id
 * @desc    Obtener proveedor por ID
 * @access  Private (Admin, Veterinario)
 */
router.get('/proveedores/:id', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateProveedorId,
  ProveedoresController.getProveedorById
);

/**
 * @route   POST /api/financial/proveedores
 * @desc    Crear nuevo proveedor
 * @access  Private (Admin)
 */
router.post('/proveedores', 
  authenticateToken, 
  authorize(['admin']), 
  validateCreateProveedor,
  ProveedoresController.createProveedor
);

/**
 * @route   PUT /api/financial/proveedores/:id
 * @desc    Actualizar proveedor
 * @access  Private (Admin)
 */
router.put('/proveedores/:id', 
  authenticateToken, 
  authorize(['admin']), 
  validateUpdateProveedor,
  ProveedoresController.updateProveedor
);

/**
 * @route   DELETE /api/financial/proveedores/:id
 * @desc    Desactivar proveedor
 * @access  Private (Admin)
 */
router.delete('/proveedores/:id', 
  authenticateToken, 
  authorize(['admin']), 
  validateProveedorId,
  ProveedoresController.deleteProveedor
);

// ================================
// GESTIÓN DE ÓRDENES DE COMPRA
// ================================

/**
 * @route   GET /api/financial/ordenes-compra
 * @desc    Obtener todas las órdenes de compra
 * @access  Private (Admin, Veterinario)
 */
router.get('/ordenes-compra', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateQueryOrdenes,
  OrdenesCompraController.getOrdenesCompra
);

/**
 * @route   GET /api/financial/ordenes-compra/vencimientos
 * @desc    Obtener órdenes próximas a vencer
 * @access  Private (Admin, Veterinario)
 */
router.get('/ordenes-compra/vencimientos', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateQueryVencimientos,
  OrdenesCompraController.getOrdenesVencimientos
);

/**
 * @route   GET /api/financial/ordenes-compra/:id
 * @desc    Obtener orden de compra por ID
 * @access  Private (Admin, Veterinario)
 */
router.get('/ordenes-compra/:id', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateOrdenCompraId,
  OrdenesCompraController.getOrdenCompraById
);

/**
 * @route   POST /api/financial/ordenes-compra
 * @desc    Crear nueva orden de compra
 * @access  Private (Admin, Veterinario)
 */
router.post('/ordenes-compra', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateCreateOrdenCompra,
  OrdenesCompraController.createOrdenCompra
);

/**
 * @route   PUT /api/financial/ordenes-compra/:id/recibir
 * @desc    Recibir orden de compra (actualizar stock)
 * @access  Private (Admin, Veterinario)
 */
router.put('/ordenes-compra/:id/recibir', 
  authenticateToken, 
  authorize(['admin', 'veterinario']), 
  validateRecibirOrden,
  OrdenesCompraController.recibirOrdenCompra
);

/**
 * @route   PUT /api/financial/ordenes-compra/:id/pagar
 * @desc    Marcar orden como pagada
 * @access  Private (Admin)
 */
router.put('/ordenes-compra/:id/pagar', 
  authenticateToken, 
  authorize(['admin']), 
  validatePagarOrden,
  OrdenesCompraController.pagarOrdenCompra
);

export default router;