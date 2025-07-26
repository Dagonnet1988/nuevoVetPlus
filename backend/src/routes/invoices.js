import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  validateCreateInvoice,
  validateInvoiceId,
  validateUpdateInvoiceStatus,
  validateListInvoices
} from '../validators/invoiceValidators.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   POST /api/financial/invoices
 * @desc    Crear nueva factura con soporte de códigos de barras
 * @access  Private (admin, vet, assistant)
 */
router.post('/', authorize(['admin', 'vet', 'assistant']), validateCreateInvoice, invoiceController.createInvoice);

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
 * @route   PATCH /api/financial/invoices/:id/status
 * @desc    Actualizar estado de factura
 * @access  Private (admin, vet)
 */
router.patch('/:id/status', authorize(['admin', 'vet']), validateUpdateInvoiceStatus, invoiceController.updateInvoiceStatus);

export default router;
