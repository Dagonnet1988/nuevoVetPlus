import { body, param, query, validationResult } from 'express-validator/lib/index.js';

/**
 * Validaciones Exhaustivas para Production
 * Sistema avanzado de sanitización y validación
 */

// Sanitización avanzada de strings
export const sanitizeString = (value) => {
    if (typeof value !== 'string') return value;
    
    return value
        .trim()
        .replace(/[<>\"'&]/g, '') // Remover caracteres peligrosos
        .replace(/\s+/g, ' ') // Normalizar espacios
        .slice(0, 500); // Limitar longitud
};

// Validación de UUIDs estricta
export const validateUUID = (fieldName) => [
    param(fieldName)
        .isUUID(4)
        .withMessage(`${fieldName} debe ser un UUID válido v4`)
        .customSanitizer(value => value.toLowerCase())
];

// Validación de emails con dominios permitidos
export const validateEmailAdvanced = (fieldName, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
        validator.notEmpty().withMessage(`${fieldName} es obligatorio`);
    }
    
    return validator
        .isEmail()
        .withMessage(`${fieldName} debe ser un email válido`)
        .isLength({ max: 254 })
        .withMessage(`${fieldName} no puede exceder 254 caracteres`)
        .normalizeEmail()
        .custom(value => {
            // Lista de dominios bloqueados (ejemplo)
            const blockedDomains = ['tempmail.com', '10minutemail.com'];
            const domain = value.split('@')[1];
            if (blockedDomains.includes(domain)) {
                throw new Error('Dominio de email no permitido');
            }
            return true;
        });
};

// Validación de contraseñas con criterios de seguridad
export const validatePasswordAdvanced = (fieldName) => [
    body(fieldName)
        .isLength({ min: 8, max: 128 })
        .withMessage(`${fieldName} debe tener entre 8 y 128 caracteres`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage(`${fieldName} debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial`)
        .custom(value => {
            // Passwords comunes bloqueadas
            const commonPasswords = ['password123', 'admin123', 'qwerty123'];
            if (commonPasswords.includes(value.toLowerCase())) {
                throw new Error('Contraseña demasiado común, elige una más segura');
            }
            return true;
        })
];

// Validación de fechas con rangos lógicos
export const validateDateRange = (startField, endField) => [
    body(startField)
        .isISO8601()
        .withMessage(`${startField} debe ser una fecha válida (ISO 8601)`)
        .custom(value => {
            const date = new Date(value);
            const now = new Date();
            const maxPast = new Date(now.getFullYear() - 50, 0, 1); // 50 años atrás
            const maxFuture = new Date(now.getFullYear() + 10, 11, 31); // 10 años adelante
            
            if (date < maxPast || date > maxFuture) {
                throw new Error(`${startField} debe estar entre ${maxPast.getFullYear()} y ${maxFuture.getFullYear()}`);
            }
            return true;
        }),
    
    body(endField)
        .isISO8601()
        .withMessage(`${endField} debe ser una fecha válida (ISO 8601)`)
        .custom((value, { req }) => {
            const endDate = new Date(value);
            const startDate = new Date(req.body[startField]);
            
            if (endDate <= startDate) {
                throw new Error(`${endField} debe ser posterior a ${startField}`);
            }
            
            // Validar que el rango no sea excesivo (ej: máximo 2 años)
            const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 años en ms
            if (endDate - startDate > maxRange) {
                throw new Error('El rango de fechas no puede exceder 2 años');
            }
            
            return true;
        })
];

// Validación de números monetarios
export const validateMonetary = (fieldName, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
        validator.notEmpty().withMessage(`${fieldName} es obligatorio`);
    }
    
    return validator
        .isFloat({ min: 0, max: 999999999.99 })
        .withMessage(`${fieldName} debe ser un valor monetario válido (0 - 999,999,999.99)`)
        .custom(value => {
            // Validar que no tenga más de 2 decimales
            const decimalPlaces = (value.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error(`${fieldName} no puede tener más de 2 decimales`);
            }
            return true;
        })
        .customSanitizer(value => Math.round(value * 100) / 100); // Redondear a 2 decimales
};

// Validación de teléfonos colombianos
export const validatePhoneColombian = (fieldName, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
        validator.notEmpty().withMessage(`${fieldName} es obligatorio`);
    }
    
    return validator
        .matches(/^(\+57|57)?[0-9]{10}$/)
        .withMessage(`${fieldName} debe ser un número telefónico colombiano válido`)
        .customSanitizer(value => {
            // Normalizar formato
            return value.replace(/^\+?57/, '57');
        });
};

// Validación de texto con límites y caracteres permitidos
export const validateTextAdvanced = (fieldName, options = {}) => {
    const {
        required = true,
        minLength = 1,
        maxLength = 255,
        allowNumbers = true,
        allowSpecialChars = false
    } = options;
    
    const validator = body(fieldName);
    
    if (required) {
        validator.notEmpty().withMessage(`${fieldName} es obligatorio`);
    }
    
    validator
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`${fieldName} debe tener entre ${minLength} y ${maxLength} caracteres`)
        .customSanitizer(sanitizeString);
    
    if (!allowNumbers && !allowSpecialChars) {
        validator.matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)
            .withMessage(`${fieldName} solo puede contener letras y espacios`);
    } else if (!allowSpecialChars) {
        validator.matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]+$/)
            .withMessage(`${fieldName} solo puede contener letras, números y espacios`);
    }
    
    return validator;
};

// Validación de códigos de barras
export const validateBarcode = (fieldName) => [
    body(fieldName)
        .matches(/^[0-9]{8,14}$/)
        .withMessage(`${fieldName} debe ser un código de barras válido (8-14 dígitos)`)
        .custom(async (value) => {
            // Validar algoritmo de verificación (ejemplo para EAN-13)
            if (value.length === 13) {
                const digits = value.split('').map(Number);
                const checksum = digits.pop();
                const sum = digits.reduce((acc, digit, index) => {
                    return acc + digit * (index % 2 === 0 ? 1 : 3);
                }, 0);
                const calculatedChecksum = (10 - (sum % 10)) % 10;
                
                if (checksum !== calculatedChecksum) {
                    throw new Error('Código de barras inválido (checksum)');
                }
            }
            return true;
        })
];

// Validación de pagination
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Page debe ser un número entero entre 1 y 10000')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit debe ser un número entero entre 1 y 100')
        .toInt(),
    
    query('sortBy')
        .optional()
        .isLength({ max: 50 })
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
        .withMessage('SortBy debe ser un campo válido'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('SortOrder debe ser "asc" o "desc"')
];

// Middleware para procesar errores de validación
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // Log de errores de validación para monitoreo
        console.warn('Validation errors:', {
            ip: req.ip,
            user: req.user?.id,
            endpoint: req.originalUrl,
            errors: errors.array()
        });
        
        return res.status(400).json({
            success: false,
            message: 'Errores de validación en los datos enviados',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            })),
            code: 'VALIDATION_ERROR'
        });
    }
    
    next();
};

// Validación SQL injection prevention
export const preventSQLInjection = (req, res, next) => {
    const suspiciousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /(--|\/\*|\*\/|;)/,
        /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
    ];
    
    const checkValue = (value) => {
        if (typeof value === 'string') {
            return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        return false;
    };
    
    const checkObject = (obj) => {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                continue;
            }

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (checkObject(obj[key])) return true;
            } else if (checkValue(obj[key]) || checkValue(key)) {
                return true;
            }
        }
        return false;
    };
    
    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
        console.warn('Potential SQL injection attempt:', {
            ip: req.ip,
            user: req.user?.id,
            endpoint: req.originalUrl,
            body: req.body,
            query: req.query
        });
        
        return res.status(400).json({
            success: false,
            message: 'Contenido de solicitud sospechoso detectado',
            code: 'SUSPICIOUS_CONTENT'
        });
    }
    
    next();
};

// Validación de archivos
export const validateFileUpload = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB por defecto
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
        required = false
    } = options;
    
    return (req, res, next) => {
        if (!req.file && required) {
            return res.status(400).json({
                success: false,
                message: 'Archivo es obligatorio',
                code: 'FILE_REQUIRED'
            });
        }
        
        if (req.file) {
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: `Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`,
                    code: 'FILE_TOO_LARGE'
                });
            }
            
            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`,
                    code: 'FILE_TYPE_NOT_ALLOWED'
                });
            }
        }
        
        next();
    };
};