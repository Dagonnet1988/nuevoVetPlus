import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import * as clientController from '../controllers/clientController.js';
import * as clientValidators from '../validators/clientValidators.js';

const router = express.Router();

/**
 * @route   POST /api/clinical/clients
 * @desc    Crear nuevo cliente
 * @access  Private (admin, vet, assistant)
 */
router.post('/',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  clientValidators.validateCreateClient,
  clientController.createClient
);

/**
 * @route   GET /api/clinical/clients
 * @desc    Obtener lista de clientes con filtros y paginación
 * @access  Private (admin, vet, assistant)
 */
router.get('/',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  clientValidators.validateClientSearch,
  clientController.getClients
);

/**
 * @route   GET /api/clinical/clients/:id
 * @desc    Obtener cliente por ID con sus mascotas
 * @access  Private (admin, vet, assistant)
 */
router.get('/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  clientValidators.validateClientId,
  clientController.getClientById
);

/**
 * @route   PUT /api/clinical/clients/:id
 * @desc    Actualizar datos de cliente
 * @access  Private (admin, vet)
 */
router.put('/:id',
  authenticateToken,
  authorize(['admin', 'vet']),
  clientValidators.validateUpdateClient,
  clientController.updateClient
);

/**
 * @route   DELETE /api/clinical/clients/:id
 * @desc    Eliminar (desactivar) cliente
 * @access  Private (admin)
 */
router.delete('/:id',
  authenticateToken,
  authorize(['admin']),
  clientValidators.validateClientId,
  clientController.deleteClient
);

export default router;
