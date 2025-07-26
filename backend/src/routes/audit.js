import express from 'express';
import AuditController from '../controllers/auditController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { body, query, validationResult } from 'express-validator';

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Validadores
const validateAuditQuery = [
  query('tabla')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre de tabla debe tener entre 1 y 100 caracteres'),
  
  query('usuario_id')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido'),
  
  query('tipo_accion')
    .optional()
    .isIn(['INSERT', 'UPDATE', 'DELETE'])
    .withMessage('Tipo de acción inválido'),
  
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida (formato: YYYY-MM-DD)'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida (formato: YYYY-MM-DD)'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('El límite debe ser un número entre 1 y 500'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser un número mayor o igual a 0'),
  
  handleValidationErrors
];

const validateActivityQuery = [
  query('usuario_id')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido'),
  
  query('tipo_actividad')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tipo de actividad inválido'),
  
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('El límite debe ser un número entre 1 y 500'),
  
  handleValidationErrors
];

const validateStatsQuery = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  
  query('usuario_id')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido'),
  
  handleValidationErrors
];

const validateCleanup = [
  body('retention_days')
    .optional()
    .isInt({ min: 30, max: 3650 })
    .withMessage('Los días de retención deben estar entre 30 y 3650'),
  
  handleValidationErrors
];

/**
 * RUTAS DE AUDITORÍA - SOLO ADMINISTRADORES
 * Todas las rutas requieren autenticación y rol de administrador
 */

/**
 * @route   GET /api/audit/logs
 * @desc    Obtener logs de auditoría con filtros
 * @access  Private (Admin only)
 */
router.get('/logs',
  authenticateToken,
  authorize(['admin']),
  validateAuditQuery,
  AuditController.getAuditLogs
);

/**
 * @route   GET /api/audit/activities
 * @desc    Obtener actividades de usuarios
 * @access  Private (Admin only)
 */
router.get('/activities',
  authenticateToken,
  authorize(['admin']),
  validateActivityQuery,
  AuditController.getUserActivities
);

/**
 * @route   GET /api/audit/suspicious
 * @desc    Obtener actividades sospechosas
 * @access  Private (Admin only)
 */
router.get('/suspicious',
  authenticateToken,
  authorize(['admin']),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  handleValidationErrors,
  AuditController.getSuspiciousActivities
);

/**
 * @route   GET /api/audit/sessions
 * @desc    Obtener sesiones de usuarios
 * @access  Private (Admin only)
 */
router.get('/sessions',
  authenticateToken,
  authorize(['admin']),
  validateActivityQuery,
  AuditController.getUserSessions
);

/**
 * @route   GET /api/audit/stats
 * @desc    Obtener estadísticas de auditoría
 * @access  Private (Admin only)
 */
router.get('/stats',
  authenticateToken,
  authorize(['admin']),
  validateStatsQuery,
  AuditController.getAuditStats
);

/**
 * @route   GET /api/audit/medical-access
 * @desc    Obtener accesos a datos médicos
 * @access  Private (Admin only)
 */
router.get('/medical-access',
  authenticateToken,
  authorize(['admin']),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  AuditController.getMedicalDataAccess
);

/**
 * @route   POST /api/audit/cleanup
 * @desc    Limpiar logs antiguos
 * @access  Private (Admin only)
 */
router.post('/cleanup',
  authenticateToken,
  authorize(['admin']),
  validateCleanup,
  AuditController.cleanupOldLogs
);

/**
 * @route   GET /api/audit/export
 * @desc    Exportar reporte de auditoría
 * @access  Private (Admin only)
 */
router.get('/export',
  authenticateToken,
  authorize(['admin']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('formato').optional().isIn(['json']),
  handleValidationErrors,
  AuditController.exportAuditReport
);

export default router;