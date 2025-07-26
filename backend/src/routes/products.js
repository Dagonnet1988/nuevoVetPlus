import express from 'express';
import productController from '../controllers/productController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateProductFilters,
  validateBarcodeSearch
} from '../validators/productValidators.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/financial/products
 * @desc    Listar productos con filtros y paginación
 * @access  Private (todos los roles)
 */
router.get('/', validateProductFilters, productController.list);

/**
 * @route   GET /api/financial/products/categories
 * @desc    Obtener categorías de productos
 * @access  Private (todos los roles)
 */
router.get('/categories', productController.getCategories);

/**
 * @route   GET /api/financial/products/barcode/:barcode
 * @desc    Buscar producto por código de barras (para facturación)
 * @access  Private (todos los roles)
 */
router.get('/barcode/:barcode', validateBarcodeSearch, productController.getByBarcode);

/**
 * @route   GET /api/financial/products/:id
 * @desc    Obtener producto por ID
 * @access  Private (todos los roles)
 */
router.get('/:id', validateProductId, productController.getById);

/**
 * @route   POST /api/financial/products
 * @desc    Crear nuevo producto
 * @access  Private (admin, vet)
 */
router.post('/', authorize(['admin', 'vet']), validateCreateProduct, productController.create);

/**
 * @route   PUT /api/financial/products/:id
 * @desc    Actualizar producto
 * @access  Private (admin, vet)
 */
router.put('/:id', authorize(['admin', 'vet']), validateUpdateProduct, productController.update);

/**
 * @route   DELETE /api/financial/products/:id
 * @desc    Desactivar producto (soft delete)
 * @access  Private (admin)
 */
router.delete('/:id', authorize(['admin']), validateProductId, productController.delete);

export default router;
