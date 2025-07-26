import express from 'express';
import financialConfigController from '../controllers/financialConfigController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateCategoriaIngreso,
  validateCreateCategoriaEgreso,
  validateCreateConcepto,
  validateGetConceptos,
  validateToggleCategoria,
  validateListQuery
} from '../validators/financialConfigValidators.js';

const router = express.Router();

/**
 * RUTAS DE CONFIGURACIÓN FINANCIERA
 * Solo accesibles para administradores
 */

// ================================
// CATEGORÍAS DE INGRESOS
// ================================

/**
 * @route   GET /api/financial/config/categories/ingresos
 * @desc    Obtener todas las categorías de ingresos
 * @access  Private (Admin)
 */
router.get('/categories/ingresos', 
  authenticateToken, 
  authorize(['admin']), 
  validateListQuery,
  financialConfigController.getCategoriesIngresos
);

/**
 * @route   POST /api/financial/config/categories/ingresos
 * @desc    Crear nueva categoría de ingresos
 * @access  Private (Admin)
 */
router.post('/categories/ingresos', 
  authenticateToken, 
  authorize(['admin']), 
  validateCreateCategoriaIngreso,
  financialConfigController.createCategoriaIngreso
);

/**
 * @route   PUT /api/financial/config/categories/ingresos/:categoryId/toggle
 * @desc    Activar/desactivar categoría de ingresos
 * @access  Private (Admin)
 */
router.put('/categories/ingresos/:categoryId/toggle', 
  authenticateToken, 
  authorize(['admin']), 
  validateToggleCategoria,
  financialConfigController.toggleCategoria
);

// ================================
// CATEGORÍAS DE EGRESOS
// ================================

/**
 * @route   GET /api/financial/config/categories/egresos
 * @desc    Obtener todas las categorías de egresos
 * @access  Private (Admin)
 */
router.get('/categories/egresos', 
  authenticateToken, 
  authorize(['admin']), 
  validateListQuery,
  financialConfigController.getCategoriesEgresos
);

/**
 * @route   POST /api/financial/config/categories/egresos
 * @desc    Crear nueva categoría de egresos
 * @access  Private (Admin)
 */
router.post('/categories/egresos', 
  authenticateToken, 
  authorize(['admin']), 
  validateCreateCategoriaEgreso,
  financialConfigController.createCategoriaEgreso
);

/**
 * @route   PUT /api/financial/config/categories/egresos/:categoryId/toggle
 * @desc    Activar/desactivar categoría de egresos
 * @access  Private (Admin)
 */
router.put('/categories/egresos/:categoryId/toggle', 
  authenticateToken, 
  authorize(['admin']), 
  validateToggleCategoria,
  financialConfigController.toggleCategoria
);

// ================================
// CONCEPTOS DE INGRESOS
// ================================

/**
 * @route   GET /api/financial/config/categories/ingresos/:categoryId/conceptos
 * @desc    Obtener conceptos de una categoría de ingresos
 * @access  Private (Admin)
 */
router.get('/categories/ingresos/:categoryId/conceptos', 
  authenticateToken, 
  authorize(['admin']), 
  validateGetConceptos,
  financialConfigController.getConceptosIngreso
);

/**
 * @route   POST /api/financial/config/categories/ingresos/:categoryId/conceptos
 * @desc    Crear nuevo concepto en categoría de ingresos
 * @access  Private (Admin)
 */
router.post('/categories/ingresos/:categoryId/conceptos', 
  authenticateToken, 
  authorize(['admin']), 
  validateCreateConcepto,
  financialConfigController.createConceptoIngreso
);

// ================================
// TEMPLATES Y UTILIDADES
// ================================

/**
 * @route   GET /api/financial/config/templates
 * @desc    Obtener templates predeterminados de categorías
 * @access  Private (Admin)
 */
router.get('/templates', 
  authenticateToken, 
  authorize(['admin']), 
  financialConfigController.getTemplatesCategories
);

export default router;
