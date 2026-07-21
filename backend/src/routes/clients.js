import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import * as clientController from '../controllers/clientController.js';
import * as clientValidators from '../validators/clientValidators.js';
import { cacheInvalidation, intelligentCaching } from '../middleware/performance.js';

const router = express.Router();

router.use(cacheInvalidation(['.*clients.*', '.*clientes.*', '.*pacientes.*']));

const clientsReadCache = intelligentCaching({ ttl: 60 });

/**
 * @route   POST /api/clinical/clients
 * @desc    Crear nuevo cliente
 * @access  Private (admin, vet, aux)
 */
router.post('/',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  clientValidators.validateCreateClient,
  clientController.createClient
);

/**
 * @route   GET /api/clinical/clients
 * @desc    Obtener lista de clientes con filtros y paginación
 * @access  Private (admin, vet, aux)
 */
router.get('/',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  clientValidators.validateClientSearch,
  clientsReadCache,
  clientController.getClients
);

/**
 * @route   GET /api/clinical/clients/:id
 * @desc    Obtener cliente por ID con sus mascotas
 * @access  Private (admin, vet, aux)
 */
router.get('/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  clientValidators.validateClientId,
  clientsReadCache,
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
 * @desc    Eliminar condicional: desactiva si tiene mascotas, elimina físico si no tiene
 * @access  Private (admin, vet)
 */
router.delete('/:id',
  authenticateToken,
  authorize(['admin', 'vet']),
  clientValidators.validateClientId,
  clientController.deleteClient
);

/**
 * @route   PATCH /api/clinical/clients/:id/restore
 * @desc    Reactivar cliente deshabilitado
 * @access  Private (admin, vet)
 */
router.patch('/:id/restore',
  authenticateToken,
  authorize(['admin', 'vet']),
  clientValidators.validateClientId,
  clientController.restoreClient
);

export default router;
