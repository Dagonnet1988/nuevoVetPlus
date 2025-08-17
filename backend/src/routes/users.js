import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { query } from '../config/database.js';
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

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

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
 * @route   PATCH /api/auth/users/:id/estado
 * @desc    Cambiar estado del usuario (activar/desactivar)
 * @access  Private (solo admin)
 */
router.patch('/:id/estado',
    authorize(['admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { activo } = req.body;

            if (typeof activo !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'El campo activo debe ser un valor booleano'
                });
            }

            // Verificar que el usuario existe
            const existingUser = await query(
                'SELECT id_usuario, email, activo FROM auth.usuarios WHERE id_usuario = $1',
                [id]
            );

            if (existingUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const user = existingUser.rows[0];

            // Prevenir auto-desactivación
            if (user.id_usuario === req.user.id && !activo) {
                return res.status(400).json({
                    success: false,
                    message: 'No puedes desactivar tu propia cuenta'
                });
            }

            // Actualizar estado
            await query(
                'UPDATE auth.usuarios SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
                [activo, id]
            );

            const action = activo ? 'activado' : 'desactivado';
            console.log(`⚠️ Usuario ${action}: ${user.email} por ${req.user.email || req.user.documento}`);

            res.json({
                success: true,
                message: `Usuario ${action} exitosamente`
            });

        } catch (error) {
            console.error('Error cambiando estado de usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
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
