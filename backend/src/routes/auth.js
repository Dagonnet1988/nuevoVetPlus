import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateLogin, 
  validateChangePassword
} from '../validators/authValidators.js';
import userRoutes from './users.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Private
 */
router.post('/change-password', authenticateToken, validateChangePassword, authController.changePassword);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario actual
 * @access  Private
 */
router.get('/me', authenticateToken, authController.me);

/**
 * @route   GET /api/auth/check-email
 * @desc    Verificar disponibilidad de email
 * @access  Public
 */
router.get('/check-email', async (req, res) => {
  try {
    const { email, exclude_id } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM auth.usuarios WHERE email = $1';
    let queryParams = [email];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const emailExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !emailExists
    });
  } catch (error) {
    console.error('Error validando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/auth/check-documento
 * @desc    Verificar disponibilidad de documento
 * @access  Public
 */
router.get('/check-documento', async (req, res) => {
  try {
    const { documento, exclude_id } = req.query;
    
    if (!documento) {
      return res.status(400).json({
        success: false,
        message: 'Documento es requerido'
      });
    }

    const { query } = await import('../config/database.js');
    
    let queryText = 'SELECT COUNT(*) as count FROM auth.usuarios WHERE documento = $1';
    let queryParams = [documento];
    
    if (exclude_id) {
      queryText += ' AND id_usuario != $2';
      queryParams.push(exclude_id);
    }
    
    const result = await query(queryText, queryParams);
    const documentoExists = parseInt(result.rows[0].count) > 0;
    
    res.json({
      success: true,
      disponible: !documentoExists
    });
  } catch (error) {
    console.error('Error validando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Usar rutas de usuarios como sub-rutas
router.use('/users', userRoutes);

export default router;
