import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  getTextoConsentimiento,
  updateTextoConsentimiento
} from '../controllers/consentimientoController.js';

const router = express.Router();

/**
 * @route   GET /api/config/consentimiento/texto
 * @desc    Obtener versión activa del texto legal de consentimiento
 * @access  Private (admin, vet)
 */
router.get('/texto',
  authenticateToken,
  authorize(['admin', 'vet']),
  getTextoConsentimiento
);

/**
 * @route   PUT /api/config/consentimiento/texto
 * @desc    Crear nueva versión activa del texto legal (solo admin)
 * @access  Private (admin)
 */
router.put('/texto',
  authenticateToken,
  authorize(['admin']),
  updateTextoConsentimiento
);

export default router;
