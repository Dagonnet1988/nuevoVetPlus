// ✅ MANEJADOR DE ERRORES POSTGRESQL
export const handleDatabaseError = (error, operation = 'operación') => {
    console.error(`Error en ${operation}:`, error);

    // Errores específicos de PostgreSQL
    if (error.code) {
        switch (error.code) {
            case '23505': // unique_violation
                const uniqueField = extractFieldFromError(error.detail);
                return {
                    status: 409,
                    message: `Ya existe un registro con ese ${uniqueField}`,
                    code: 'DUPLICATE_ENTRY'
                };
            
            case '23503': // foreign_key_violation
                return {
                    status: 400,
                    message: 'Referencia inválida. Verifique que los datos relacionados existan',
                    code: 'FOREIGN_KEY_VIOLATION'
                };
            
            case '23502': // not_null_violation
                const field = error.column;
                return {
                    status: 400,
                    message: `El campo ${field} es obligatorio`,
                    code: 'REQUIRED_FIELD'
                };
            
            case '22001': // string_data_right_truncation
                return {
                    status: 400,
                    message: 'Uno de los campos excede la longitud permitida',
                    code: 'DATA_TOO_LONG'
                };
            
            case '22P02': // invalid_text_representation
                return {
                    status: 400,
                    message: 'Formato de datos inválido',
                    code: 'INVALID_FORMAT'
                };
            
            case '08003': // connection_does_not_exist
            case '08006': // connection_failure
                return {
                    status: 503,
                    message: 'Error de conexión con la base de datos',
                    code: 'DATABASE_CONNECTION_ERROR'
                };
            
            case '42P01': // undefined_table
                return {
                    status: 500,
                    message: 'Error de configuración de base de datos',
                    code: 'TABLE_NOT_FOUND'
                };
            
            default:
                return {
                    status: 500,
                    message: 'Error interno del servidor',
                    code: 'INTERNAL_SERVER_ERROR'
                };
        }
    }

    // Error genérico
    return {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
    };
};

// Extraer campo del mensaje de error de PostgreSQL
const extractFieldFromError = (detail) => {
    if (!detail) return 'campo';
    
    // Buscar patrones comunes en mensajes de error
    const patterns = [
        /Key \(([^)]+)\)=/,
        /column "([^"]+)"/,
        /constraint "([^"]+)"/
    ];
    
    for (const pattern of patterns) {
        const match = detail.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return 'campo';
};

// ✅ MIDDLEWARE PARA MANEJO DE ERRORES EXPRESS
export const errorMiddleware = (error, req, res, next) => {
    const errorInfo = handleDatabaseError(error, req.route?.path || 'API');
    
    res.status(errorInfo.status).json({
        success: false,
        message: errorInfo.message,
        code: errorInfo.code,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack,
            details: error.message 
        })
    });
};
