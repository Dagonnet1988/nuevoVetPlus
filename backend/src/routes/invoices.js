import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateInvoice,
  validateInvoiceId,
  validateListInvoices,
  updateInvoiceValidation
} from '../validators/invoiceValidators.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   POST /api/financial/invoices
 * @desc    Crear nueva factura con soporte de códigos de barras
 * @access  Private (admin, vet, assistant)
 */
router.post('/', authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), validateCreateInvoice, invoiceController.createInvoice);

/**
 * @route   POST /api/financial/invoices/debug
 * @desc    Endpoint de debug para verificar datos de facturas
 * @access  Private (admin, vet, assistant)
 */
router.post('/debug', authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), validateCreateInvoice, invoiceController.debugInvoices);

/**
 * @route   GET /api/financial/invoices
 * @desc    Listar facturas con filtros y paginación
 * @access  Private (todos los roles)
 */
router.get('/', validateListInvoices, invoiceController.listInvoices);

/**
 * @route   GET /api/financial/invoices/:id
 * @desc    Obtener factura por ID
 * @access  Private (todos los roles)
 */
router.get('/:id', validateInvoiceId, invoiceController.getInvoice);

/**
 * @route   GET /api/financial/invoices/:id/status
 * @desc    Obtener estado detallado de factura
 * @access  Private (todos los roles)
 */
router.get('/:id/status', validateInvoiceId, invoiceController.getInvoiceStatus);

/**
 * @route   PUT /api/financial/invoices/:id
 * @desc    Actualizar factura completa
 * @access  Private (admin, vet, aux_admin)
 */
router.put('/:id', 
  authorize(['admin', 'vet', 'aux_admin']), 
  validateInvoiceId, 
  updateInvoiceValidation,
  invoiceController.updateInvoice
);

/**
 * @route   PATCH /api/financial/invoices/:id/status
 * @desc    Actualizar estado de factura
 * @access  Private (admin, vet, aux_admin)
 */
router.patch('/:id/status', 
  authorize(['admin', 'vet', 'aux_admin']), 
  validateInvoiceId, 
  invoiceController.updateInvoiceStatus
);

/**
 * @route   GET /api/financial/invoices/:id/export
 * @desc    Exportar factura en PDF
 * @access  Private (todos los roles)
 */
router.get('/:id/export', validateInvoiceId, invoiceController.exportInvoice);

/**
 * @route   GET /api/financial/invoices/debug/status
 * @desc    Endpoint de debug para verificar estado de facturas y movimientos
 * @access  Private (admin, vet, assistant)
 */
router.get('/debug/status', authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), invoiceController.debugInvoices);

/**
 * @route   GET /api/financial/invoices/diagnose
 * @desc    Diagnóstico de restricciones de tabla
 * @access  Private (admin)
 */
router.get('/diagnose', authorize(['admin']), invoiceController.diagnoseTableConstraints);

export default router;
