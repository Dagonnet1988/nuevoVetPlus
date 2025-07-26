import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { 
    validateCreateUser,
    validateUpdateUser
} from '../validators/authValidators.js';
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deactivateUser,
    changeUserRole,
    reactivateUser,
    getUserStats
} from '../controllers/userController.js';

const router = express.Router();

// Rate limiting para operaciones de usuario (más restrictivo)
const userManagementRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 operaciones por 15 minutos
    message: {
        success: false,
        message: 'Demasiadas operaciones de gestión de usuarios. Intenta de nuevo más tarde.',
        error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Aplicar rate limiting
router.use(userManagementRateLimit);

/**
 * @route   POST /api/auth/users
 * @desc    Crear nuevo usuario
 * @access  Private (solo admin)
 */
router.post('/',
    authorize(['admin']),
    validateCreateUser,
    validateRequest,
    createUser
);

/**
 * @route   GET /api/auth/users
 * @desc    Listar usuarios con filtros y paginación
 * @access  Private (admin, vet puede ver usuarios básicos)
 */
router.get('/',
    authorize(['admin', 'vet']),
    getUsers
);

/**
 * @route   GET /api/auth/users/stats
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (solo admin)
 */
router.get('/stats',
    authorize(['admin']),
    getUserStats
);

/**
 * @route   GET /api/auth/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private (admin, vet puede ver usuarios básicos)
 */
router.get('/:id',
    authorize(['admin', 'vet']),
    getUserById
);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Actualizar usuario
 * @access  Private (solo admin)
 */
router.put('/:id',
    authorize(['admin']),
    validateUpdateUser,
    validateRequest,
    updateUser
);

/**
 * @route   PUT /api/auth/users/:id/role
 * @desc    Cambiar rol de usuario
 * @access  Private (solo admin)
 */
router.put('/:id/role',
    authorize(['admin']),
    (req, res, next) => {
        // Validación específica para cambio de rol
        const { rol } = req.body;
        const validRoles = ['admin', 'vet', 'aux'];
        
        if (!rol || !validRoles.includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser admin, vet o aux'
            });
        }
        
        next();
    },
    changeUserRole
);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Desactivar usuario (soft delete)
 * @access  Private (solo admin)
 */
router.delete('/:id',
    authorize(['admin']),
    deactivateUser
);

/**
 * @route   PUT /api/auth/users/:id/reactivate
 * @desc    Reactivar usuario
 * @access  Private (solo admin)
 */
router.put('/:id/reactivate',
    authorize(['admin']),
    reactivateUser
);

export default router;
