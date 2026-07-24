import { validationResult } from 'express-validator/lib/index.js';

/**
 * Middleware para validar la entrada de las requests
 * Utiliza express-validator para verificar errores de validación
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!errors.isEmpty()) {
        // Evitar ruido y exposición de PII en producción.
        if (!isProduction) {
            console.warn('Errores de validación detectados:', {
                endpoint: req.originalUrl,
                method: req.method,
                errors: errors.array()
            });
        }
        
        return res.status(400).json({
            success: false,
            message: 'Errores de validación en los datos enviados',
            errors: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value,
                location: error.location
            }))
        });
    }
    
    next();
};
