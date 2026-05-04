import express from 'express';
import { body } from 'express-validator/lib/index.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { sendConsentEmail, sendHistoriaEmail } from '../controllers/documentEmailController.js';

const router = express.Router();

const validateOptionalDestination = [
  body('email_destino').optional({ nullable: true }).isEmail().withMessage('email_destino debe ser un correo válido')
];

router.post(
  '/consentimiento/:idCliente/email',
  authenticateToken,
  tenantContext,
  authorize(['admin', 'vet']),
  validateOptionalDestination,
  sendConsentEmail
);

router.post(
  '/historia/:idHistoria/email',
  authenticateToken,
  tenantContext,
  authorize(['admin', 'vet']),
  validateOptionalDestination,
  sendHistoriaEmail
);

export default router;
