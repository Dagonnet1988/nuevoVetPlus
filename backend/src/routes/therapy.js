import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import * as therapyController from '../controllers/therapyController.js';
import * as therapyValidators from '../validators/therapyValidators.js';

const router = express.Router();

/**
 * @route   POST /api/financial/therapy/session
 * @desc    Registrar una nueva sesión de terapia
 * @access  Private (admin, vet, assistant)
 */
router.post('/session',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  therapyValidators.validateRecordSession,
  therapyController.recordTherapySession
);

/**
 * @route   GET /api/financial/therapy/control/pet/:petId
 * @desc    Obtener control de terapias de una mascota
 * @access  Private (admin, vet, assistant)
 */
router.get('/control/pet/:petId',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  therapyValidators.validatePetId,
  therapyController.getTherapyControlByPet
);

/**
 * @route   PUT /api/financial/therapy/control/:controlId
 * @desc    Actualizar estado de control de terapia
 * @access  Private (admin, vet)
 */
router.put('/control/:controlId',
  authenticateToken,
  authorize(['admin', 'vet']),
  therapyValidators.validateUpdateTherapyControl,
  therapyController.updateTherapyControl
);

/**
 * @route   GET /api/financial/therapy/packages
 * @desc    Obtener lista de paquetes de terapia disponibles
 * @access  Private (admin, vet, assistant)
 */
router.get('/packages',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  therapyController.getTherapyPackages
);

/**
 * @route   GET /api/financial/therapy/stats
 * @desc    Obtener estadísticas de sesiones de terapia
 * @access  Private (admin, vet)
 */
router.get('/stats',
  authenticateToken,
  authorize(['admin', 'vet']),
  therapyValidators.validateTherapyStatsQuery,
  therapyController.getTherapyStats
);

/**
 * @route   GET /api/financial/therapy/sessions
 * @desc    Obtener historial de sesiones de terapia con filtros
 * @access  Private (admin, vet, assistant)
 */
router.get('/sessions',
  authenticateToken,
  authorize(['admin', 'vet', 'assistant']),
  therapyController.getTherapySessions
);

export default router;
