import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController.js';
import passwordResetController from '../controllers/passwordResetController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { 
  validateLogin, 
  validateChangePassword,
  validateCreateUser,
  validateUpdateUser 
} from '../validators/authValidators.js';
import {
  validateGenerateTempPassword,
  validateAdminResetPassword,
  validatePasswordResetHistory,
  validateForcePasswordChange
} from '../validators/passwordResetValidators.js';
import userRoutes from './users.js';

const router = express.Router();

// Rate limiting para login (5 intentos por 15 minutos)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general para autenticación (20 requests por 15 minutos)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Aplicar rate limiting a todas las rutas de auth
router.use(authRateLimit);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', loginRateLimit, validateLogin, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario actual
 * @access  Private
 */
router.get('/me', authenticateToken, authController.me);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Private
 */
router.put('/change-password', authenticateToken, validateChangePassword, authController.changePassword);

/**
 * Password Reset Routes (Admin Only)
 */

/**
 * @route   POST /api/auth/admin/generate-temp-password
 * @desc    Generar contraseña temporal para un usuario (solo admin)
 * @access  Private (Admin)
 */
router.post('/admin/generate-temp-password', 
  authenticateToken, 
  authorize(['admin']), 
  validateGenerateTempPassword, 
  passwordResetController.generateTempPassword
);

/**
 * @route   POST /api/auth/admin/reset-password
 * @desc    Resetear contraseña directamente (solo admin)
 * @access  Private (Admin)
 */
router.post('/admin/reset-password', 
  authenticateToken, 
  authorize(['admin']), 
  validateAdminResetPassword, 
  passwordResetController.adminResetPassword
);

/**
 * @route   GET /api/auth/admin/password-reset-history
 * @route   GET /api/auth/admin/password-reset-history/:userId
 * @desc    Obtener historial de resets de contraseña (solo admin)
 * @access  Private (Admin)
 */
router.get('/admin/password-reset-history', 
  authenticateToken, 
  authorize(['admin']), 
  validatePasswordResetHistory, 
  passwordResetController.getPasswordResetHistory
);

router.get('/admin/password-reset-history/:userId', 
  authenticateToken, 
  authorize(['admin']), 
  validatePasswordResetHistory, 
  passwordResetController.getPasswordResetHistory
);

/**
 * @route   PUT /api/auth/admin/force-password-change/:userId
 * @desc    Forzar cambio de contraseña en el próximo login (solo admin)
 * @access  Private (Admin)
 */
router.put('/admin/force-password-change/:userId', 
  authenticateToken, 
  authorize(['admin']), 
  validateForcePasswordChange, 
  passwordResetController.forcePasswordChange
);

/**
 * Rutas de gestión de usuarios
 */
router.use('/users', userRoutes);

export default router;
