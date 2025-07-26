import { validationResult } from 'express-validator';

/**
 * Middleware para validar la entrada de las requests
 * Utiliza express-validator para verificar errores de validación
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
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
