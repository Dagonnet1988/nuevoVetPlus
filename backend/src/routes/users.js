import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
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
    getUserStats,
    uploadFirma,
    uploadAvatar
} from '../controllers/userController.js';
import passwordResetController from '../controllers/passwordResetController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Multer para firmas
const firmaStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dest = path.join(__dirname, '../../uploads/firmas');
        await fs.mkdir(dest, { recursive: true }).catch(() => {});
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `firma-${req.params.id}-${Date.now()}${ext}`);
    }
});
const uploadFirmaMiddleware = multer({
    storage: firmaStorage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/png', 'image/jpeg'].includes(file.mimetype)) cb(null, true);
        else cb(new Error('Solo se permiten PNG o JPG'));
    }
});

// Multer para avatar
const avatarStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dest = path.join(__dirname, '../../uploads/avatars');
        await fs.mkdir(dest, { recursive: true }).catch(() => {});
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
    }
});
const uploadAvatarMiddleware = multer({
    storage: avatarStorage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(new Error('Solo se permiten PNG, JPG o WEBP'));
    }
});

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @route   POST /api/auth/users
 * @desc    Crear nuevo usuario
 * @access  Private (solo admin)
 */
router.post('/',
    (req, res, next) => {
        console.log('🔍 POST /api/auth/users - Iniciando creación de usuario');
        console.log('📝 Datos recibidos:', JSON.stringify(req.body, null, 2));
        next();
    },
    authorize(['admin']),
    (req, res, next) => {
        console.log('✅ Autorización pasada');
        next();
    },
    validateCreateUser,
    (req, res, next) => {
        console.log('✅ Validaciones de esquema pasadas');
        next();
    },
    validateRequest,
    (req, res, next) => {
        console.log('✅ ValidateRequest middleware pasado');
        next();
    },
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
                'SELECT id_usuario, email, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
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
                'UPDATE vetplus_auth.usuarios SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
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

/**
 * @route   POST /api/auth/users/:id/reset-password
 * @desc    Generar contraseña temporal para un usuario
 * @access  Private (solo admin)
 */
router.post('/:id/reset-password',
    authorize(['admin']),
    (req, res) => {
        req.body.userId = req.params.id;
        passwordResetController.generateTempPassword(req, res);
    }
);

/**
 * @route   POST /api/auth/users/:id/set-password
 * @desc    Establecer nueva contraseña para un usuario
 * @access  Private (solo admin)
 */
router.post('/:id/set-password',
    authorize(['admin']),
    (req, res) => {
        req.body.userId = req.params.id;
        passwordResetController.adminResetPassword(req, res);
    }
);

/**
 * @route   POST /api/auth/users/:id/force-password-change
 * @desc    Forzar cambio de contraseña en próximo login
 * @access  Private (solo admin)
 */
router.post('/:id/force-password-change',
    authorize(['admin']),
    passwordResetController.forcePasswordChange
);

/**
 * @route   POST /api/auth/users/:id/firma
 * @desc    Subir imagen de firma del veterinario
 * @access  Private (propio vet o admin)
 */
router.post('/:id/firma',
    uploadFirmaMiddleware.single('firma'),
    uploadFirma
);

/**
 * @route   POST /api/auth/users/:id/avatar
 * @desc    Subir avatar de usuario
 * @access  Private (propio usuario o admin)
 */
router.post('/:id/avatar',
    uploadAvatarMiddleware.single('avatar'),
    uploadAvatar
);

export default router;
