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
    uploadLogo,
    configureWhatsApp,
    getDiasEspeciales,
    addDiaEspecial,
    getSiguienteNumeroFactura,
    testWhatsAppConfig
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
        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y SVG.'));
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
        .matches(/^[0-9]{9,12}-[0-9]{1}$/)
        .withMessage('Formato de NIT inválido (ej: 900123456-1)'),
    
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
    
    body('prefijo_factura')
        .optional()
        .isLength({ min: 1, max: 10 })
        .withMessage('El prefijo de factura debe tener entre 1 y 10 caracteres'),
    
    body('horarios')
        .optional()
        .isArray()
        .withMessage('Los horarios deben ser un array'),
    
    body('horarios.*.dia_semana')
        .if(body('horarios').exists())
        .isInt({ min: 0, max: 6 })
        .withMessage('Día de semana inválido (0-6)'),
    
    body('horarios.*.hora_apertura')
        .if(body('horarios').exists())
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)'),
    
    body('horarios.*.hora_cierre')
        .if(body('horarios').exists())
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)')
];

const validateWhatsAppConfig = [
    body('whatsapp_business_number')
        .optional()
        .matches(/^[0-9]{10,15}$/)
        .withMessage('Número de WhatsApp Business inválido'),
    
    body('whatsapp_api_token')
        .optional()
        .isLength({ min: 10 })
        .withMessage('Token de API inválido'),
    
    body('whatsapp_webhook_verify_token')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Token de verificación debe tener al menos 8 caracteres'),
    
    body('whatsapp_activo')
        .optional()
        .isBoolean()
        .withMessage('Estado de WhatsApp debe ser booleano')
];

const validateDiaEspecial = [
    body('fecha')
        .notEmpty()
        .withMessage('La fecha es requerida')
        .isISO8601()
        .withMessage('Formato de fecha inválido'),
    
    body('motivo')
        .notEmpty()
        .withMessage('El motivo es requerido')
        .isLength({ min: 3, max: 200 })
        .withMessage('El motivo debe tener entre 3 y 200 caracteres'),
    
    body('cerrado')
        .optional()
        .isBoolean()
        .withMessage('El campo cerrado debe ser booleano'),
    
    body('hora_apertura')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)'),
    
    body('hora_cierre')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)')
];

// Middleware para verificar permisos de administrador
const requireAdmin = authorize(['admin']);

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
router.get('/config', authenticateToken, requireAdmin, getEmpresaConfig);

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

/**
 * @swagger
 * /api/admin/empresa/whatsapp:
 *   put:
 *     summary: Configurar WhatsApp Business
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whatsapp_business_number:
 *                 type: string
 *                 example: "573001234567"
 *               whatsapp_api_token:
 *                 type: string
 *                 example: "EAAYourTokenHere"
 *               whatsapp_webhook_verify_token:
 *                 type: string
 *                 example: "your_verify_token"
 *               whatsapp_activo:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: WhatsApp configurado exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Acceso denegado
 */
router.put('/whatsapp', authenticateToken, requireAdmin, validateWhatsAppConfig, configureWhatsApp);

/**
 * @swagger
 * /api/admin/empresa/whatsapp/test:
 *   post:
 *     summary: Probar configuración de WhatsApp
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
 *               - numero_prueba
 *             properties:
 *               numero_prueba:
 *                 type: string
 *                 example: "573001234567"
 *     responses:
 *       200:
 *         description: Mensaje de prueba enviado
 *       400:
 *         description: Configuración inválida
 *       403:
 *         description: Acceso denegado
 */
router.post('/whatsapp/test', authenticateToken, requireAdmin, testWhatsAppConfig);

/**
 * @swagger
 * /api/admin/empresa/dias-especiales:
 *   get:
 *     summary: Obtener días especiales y festivos
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Año a consultar
 *     responses:
 *       200:
 *         description: Lista de días especiales
 */
router.get('/dias-especiales', authenticateToken, getDiasEspeciales);

/**
 * @swagger
 * /api/admin/empresa/dias-especiales:
 *   post:
 *     summary: Agregar día especial
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
 *               - fecha
 *               - motivo
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-25"
 *               motivo:
 *                 type: string
 *                 example: "Navidad"
 *               cerrado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Día especial agregado
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Acceso denegado
 */
router.post('/dias-especiales', authenticateToken, requireAdmin, validateDiaEspecial, addDiaEspecial);

/**
 * @swagger
 * /api/admin/empresa/siguiente-numero/factura:
 *   get:
 *     summary: Obtener siguiente número de factura
 *     tags: [Configuración Empresa]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Siguiente número obtenido
 */
router.get('/siguiente-numero/factura', authenticateToken, requireAdmin, getSiguienteNumeroFactura);

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