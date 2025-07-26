import express from 'express';
import productRoutes from './products.js';
import invoiceRoutes from './invoices.js';
import therapyRoutes from './therapy.js';
import cajasRoutes from './cajas.js';
import proveedoresRoutes from './proveedores.js';

const router = express.Router();

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas financieras funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Montar las rutas de productos, facturas, terapias, cajas y proveedores
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/therapy', therapyRoutes);
router.use('/', cajasRoutes); // Rutas de cajas se montan directamente
router.use('/', proveedoresRoutes); // Rutas de proveedores y órdenes de compra

// Rutas POS (Punto de Venta) para búsqueda rápida
import { authenticateToken, authorize } from '../middleware/auth.js';
import * as invoiceController from '../controllers/invoiceController.js';
import { validateBarcodeSearch as validateInvoiceBarcodeSearch } from '../validators/invoiceValidators.js';

/**
 * @route   GET /api/financial/pos/barcode/:barcode
 * @desc    Búsqueda rápida de productos por código de barras para POS
 * @access  Private (admin, vet, assistant)
 */
router.get('/pos/barcode/:barcode', 
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']), 
  validateInvoiceBarcodeSearch, 
  invoiceController.searchProductForInvoice
);

export default router;
