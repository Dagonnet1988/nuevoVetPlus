import express from 'express';
import productRoutes from './products.js';
import invoiceRoutes from './invoices.js';
import therapyRoutes from './therapy.js';
import cajasRoutes from './cajas.js';
import proveedoresRoutes from './proveedores.js';
import { query } from '../config/database.js';

const router = express.Router();

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas financieras funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta temporal para listar facturas sin middleware problemático
router.get('/invoices-temp', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        f.*,
        c.nombre as cliente_nombre,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        u.nombre as creado_por
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      LEFT JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
      ORDER BY f.fecha DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: 1,
        limit: 20,
        total: result.rows.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error en invoices-temp:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Montar las rutas de productos, facturas, terapias, cajas y proveedores
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/therapies', therapyRoutes);
router.use('/', cajasRoutes); // Rutas de cajas se montan directamente
router.use('/', proveedoresRoutes); // Rutas de proveedores y órdenes de compra

// Rutas POS (Punto de Venta) para búsqueda rápida
import { authenticateToken, authorize } from '../middleware/auth.js';
import * as invoiceController from '../controllers/invoiceController.js';
import { validateBarcodeSearch as validateInvoiceBarcodeSearch } from '../validators/invoiceValidators.js';

/**
 * @route   GET /api/financial/pos/barcode/:barcode
 * @desc    Búsqueda rápida de productos por código de barras para POS
 * @access  Private (admin, vet, aux_admin)
 */
router.get('/pos/barcode/:barcode', 
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']), 
  validateInvoiceBarcodeSearch, 
  invoiceController.searchProductForInvoice
);

/**
 * @route   GET /api/financial/facturas
 * @desc    Alias para listar facturas (compatibilidad frontend)
 * @access  Private (admin, vet, aux_admin)
 */
router.get('/facturas', 
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']),
  invoiceController.listInvoices
);

/**
 * @route   POST /api/financial/facturas
 * @desc    Alias para crear factura (compatibilidad frontend)
 * @access  Private (admin, vet, aux)
 */
router.post('/facturas', 
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']),
  invoiceController.createInvoice
);

/**
 * @route   GET /api/financial/facturas/:id
 * @desc    Alias para obtener factura por ID (compatibilidad frontend)
 * @access  Private (todos los roles)
 */
router.get('/facturas/:id', 
  authenticateToken,
  invoiceController.getInvoice
);

/**
 * @route   PATCH /api/financial/facturas/:id/status
 * @desc    Alias para actualizar estado de factura (compatibilidad frontend)
 * @access  Private (admin, vet, aux_admin)
 */
router.patch('/facturas/:id/status', 
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']),
  invoiceController.updateInvoiceStatus
);

/**
 * @route   GET /api/financial/facturas/:id/export
 * @desc    Alias para exportar factura (compatibilidad frontend)
 * @access  Private (todos los roles)
 */
router.get('/facturas/:id/export', 
  authenticateToken,
  invoiceController.exportInvoice
);

/**
 * @route   GET /api/financial/reports/facturacion
 * @desc    Obtener resumen de facturación
 * @access  Private (admin, vet, aux)
 */
router.get('/reports/facturacion', 
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']),
  invoiceController.getInvoiceSummary
);

export default router;
