import express from 'express';
import { body } from 'express-validator/lib/index.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  getEmailConfig,
  upsertEmailConfig,
  testEmailConfig,
  getEmailModuleStatus,
  getEmailDeliveries,
  getEmailDeliveryDetail,
  retryEmailDelivery,
  getGoogleEmailAuthUrl,
  handleGoogleEmailCallback,
  serveGoogleEmailCallbackScript,
  disconnectGoogleEmail
} from '../controllers/emailConfigController.js';
import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  resetEmailTemplate
} from '../controllers/emailTemplateController.js';

const router = express.Router();

const validateConfig = [
  body('proveedor').optional().isIn(['smtp']),
  body('auth_mode').optional().isIn(['smtp', 'gmail_oauth']),
  body('nombre_remitente').optional({ nullable: true }).isLength({ max: 150 }),
  body('correo_remitente').isEmail(),
  body('correo_respuesta').optional({ nullable: true }).isEmail(),
  body('smtp_host').optional({ nullable: true }).isLength({ max: 255 }),
  body('smtp_port').optional({ nullable: true }).isInt({ min: 1, max: 65535 }),
  body('smtp_secure').optional().isBoolean(),
  body('smtp_usuario').optional({ nullable: true }).isLength({ max: 255 }),
  body('smtp_password').optional({ nullable: true }).isLength({ max: 4000 })
  ,body('oauth_client_id').optional({ nullable: true }).isLength({ max: 4000 })
  ,body('oauth_client_secret').optional({ nullable: true }).isLength({ max: 4000 })
  ,body('oauth_email').optional({ nullable: true }).isEmail()
];

router.get('/config', authenticateToken, authorize(['admin']), getEmailConfig);
router.put('/config', authenticateToken, authorize(['admin']), validateConfig, upsertEmailConfig);
router.post('/test', authenticateToken, authorize(['admin']), testEmailConfig);
router.get('/status', authenticateToken, authorize(['admin']), getEmailModuleStatus);
router.get('/deliveries', authenticateToken, authorize(['admin']), getEmailDeliveries);
router.get('/deliveries/:source/:id', authenticateToken, authorize(['admin']), getEmailDeliveryDetail);
router.post('/deliveries/:source/:id/retry', authenticateToken, authorize(['admin']), retryEmailDelivery);
router.get('/templates', authenticateToken, authorize(['admin']), getEmailTemplates);
router.get('/templates/:key', authenticateToken, authorize(['admin']), getEmailTemplate);
router.put('/templates/:key', authenticateToken, authorize(['admin']), updateEmailTemplate);
router.post('/templates/:key/reset', authenticateToken, authorize(['admin']), resetEmailTemplate);
router.get('/google/auth-url', authenticateToken, authorize(['admin']), getGoogleEmailAuthUrl);
router.get('/google/callback-script.js', serveGoogleEmailCallbackScript);
router.get('/google/callback', handleGoogleEmailCallback);
router.post('/google/disconnect', authenticateToken, authorize(['admin']), disconnectGoogleEmail);

export default router;
