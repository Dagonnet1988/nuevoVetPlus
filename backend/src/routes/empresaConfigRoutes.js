/**
 * @fileoverview Rutas para gestión de configuración de empresa
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import express from 'express';
import { body, param, query } from 'express-validator/lib/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
    getEmpresaConfig,
    updateEmpresaConfig,
    uploadLogo
} from '../controllers/empresaConfigController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/logos');
        
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `logo-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        // Solo PNG y JPEG — son los únicos formatos que PDFKit soporta para incrustar en el PDF
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato no permitido. El logo debe ser PNG o JPG/JPEG.'));
        }
    }
});

// Validaciones
const validateEmpresaConfig = [
    body('nombre_empresa')
        .notEmpty()
        .withMessage('El nombre de la empresa es requerido')
        .isLength({ min: 2, max: 200 })
        .withMessage('El nombre debe tener entre 2 y 200 caracteres'),
    
    body('nit')
        .notEmpty()
        .withMessage('El NIT es requerido')
        .isLength({ min: 3, max: 30 })
        .withMessage('El NIT no puede exceder 30 caracteres'),
    
    body('direccion')
        .notEmpty()
        .withMessage('La dirección es requerida')
        .isLength({ max: 500 })
        .withMessage('La dirección no puede exceder 500 caracteres'),
    
    body('telefono')
        .optional()
        .matches(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
        .withMessage('Formato de teléfono inválido'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido'),
    
    body('eslogan')
        .optional({ nullable: true })
        .isLength({ max: 200 })
        .withMessage('El eslogan no puede exceder 200 caracteres'),

    body('sitio_web')
        .optional({ nullable: true })
        .isLength({ max: 200 })
        .withMessage('El sitio web no puede exceder 200 caracteres')
];

// Middleware para verificar permisos de administrador
const requireAdmin = authorize(['admin']);
const requireAuthenticatedTenantUser = authorize(['admin', 'vet', 'aux']);

/**
 * @swagger
 * /api/admin/empresa/config:
 *   get:
 *     summary: Obtener configuración de empresa
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Configuración no encontrada
 */
router.get('/config', authenticateToken, requireAuthenticatedTenantUser, getEmpresaConfig);

/**
 * @swagger
 * /api/admin/empresa/config:
 *   put:
 *     summary: Actualizar configuración de empresa
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_empresa
 *               - nit  
 *               - direccion
 *             properties:
 *               nombre_empresa:
 *                 type: string
 *                 example: "VetPlus - Clínica Veterinaria"
 *               nit:
 *                 type: string
 *                 example: "900123456-1"
 *               direccion:
 *                 type: string
 *                 example: "Calle 123 #45-67"
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Acceso denegado
 */
router.put('/config', authenticateToken, requireAdmin, validateEmpresaConfig, updateEmpresaConfig);

/**
 * @swagger
 * /api/admin/empresa/logo:
 *   post:
 *     summary: Subir logo de la empresa
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen (JPG, PNG, SVG)
 *     responses:
 *       200:
 *         description: Logo subido exitosamente
 *       400:
 *         description: Archivo inválido
 *       403:
 *         description: Acceso denegado
 */
router.post('/logo', authenticateToken, requireAdmin, upload.single('logo'), uploadLogo);

// Middleware de manejo de errores para multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
            });
        }
    }
    
    if (error.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
});

export default router;