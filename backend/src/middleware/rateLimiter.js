import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate Limiting Avanzado por Endpoint y Rol
 * Sistema production-ready con límites diferenciados
 */

// Rate limiting general para todas las rutas
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // límite general alto
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar IP + user ID si está autenticado
        return req.user?.id ? `${req.ip}-${req.user.id}` : req.ip;
    }
});

// Rate limiting estricto para autenticación
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 intentos de login por IP
    message: {
        success: false,
        message: 'Demasiados intentos de autenticación. Espera 15 minutos antes de volver a intentar.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true, // no contar requests exitosos
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para operaciones críticas (admin only)
export const adminRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 100,
    message: {
        success: false,
        message: 'Límite de operaciones administrativas excedido. Espera 5 minutos.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        // Solo aplicar a usuarios admin
        return req.user?.rol !== 'admin';
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para reportes y consultas pesadas
export const reportsRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 50, // máximo 50 reportes por usuario
    message: {
        success: false,
        message: 'Límite de generación de reportes excedido. Espera 10 minutos.',
        code: 'REPORTS_RATE_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para API endpoints públicos
export const publicRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: {
        success: false,
        message: 'Límite de consultas públicas excedido. Espera 15 minutos.',
        code: 'PUBLIC_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Slow down para operaciones de escritura
export const writeSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutos
    delayAfter: 10, // permitir 10 requests rápidas
    delayMs: 500, // añadir 500ms de delay por cada request adicional
    maxDelayMs: 5000, // máximo 5 segundos de delay
    skipFailedRequests: true,
    skipSuccessfulRequests: false
});

// Rate limiting específico por rol
export const roleBasedRateLimit = (limits = {}) => {
    const defaultLimits = {
        admin: { windowMs: 15 * 60 * 1000, max: 500 },
        vet: { windowMs: 15 * 60 * 1000, max: 300 },
        auxiliar: { windowMs: 15 * 60 * 1000, max: 200 }
    };

    const finalLimits = { ...defaultLimits, ...limits };

    return (req, res, next) => {
        const userRole = req.user?.rol || 'auxiliar';
        const roleLimit = finalLimits[userRole] || finalLimits.auxiliar;

        const limiter = rateLimit({
            windowMs: roleLimit.windowMs,
            max: roleLimit.max,
            message: {
                success: false,
                message: `Límite de requests para rol ${userRole} excedido. Límite: ${roleLimit.max} por ${roleLimit.windowMs / 60000} minutos.`,
                code: 'ROLE_RATE_LIMIT_EXCEEDED',
                role: userRole,
                limit: roleLimit.max
            },
            keyGenerator: (req) => {
                return `${req.user?.id}-${userRole}`;
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        return limiter(req, res, next);
    };
};

// Rate limiting para operaciones financieras sensibles
export const financialRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 30, // máximo 30 operaciones financieras por ventana
    message: {
        success: false,
        message: 'Límite de operaciones financieras excedido por seguridad. Espera 5 minutos.',
        code: 'FINANCIAL_RATE_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para búsquedas y consultas
export const searchRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // máximo 60 búsquedas por minuto
    message: {
        success: false,
        message: 'Límite de búsquedas excedido. Espera 1 minuto.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware para aplicar rate limiting por endpoint
export const endpointRateLimit = (endpoint) => {
    const endpointLimits = {
        // Autenticación - muy restrictivo
        'auth.login': authRateLimit,
        'auth.register': authRateLimit,
        'auth.reset': authRateLimit,

        // Operaciones administrativas
        'admin.*': adminRateLimit,
        'audit.*': adminRateLimit,

        // Reportes y analytics
        'reports.*': reportsRateLimit,

        // Operaciones financieras
        'financial.facturas': financialRateLimit,
        'financial.cajas': financialRateLimit,
        'financial.productos.create': financialRateLimit,

        // Búsquedas
        'search.*': searchRateLimit,
        'clients.search': searchRateLimit,
        'pets.search': searchRateLimit,

        // Google Calendar (admin only)
        'google-calendar.*': adminRateLimit
    };

    // Buscar limite específico para el endpoint
    const specificLimit = endpointLimits[endpoint];
    if (specificLimit) {
        return specificLimit;
    }

    // Buscar por patrón wildcard
    const wildcardKey = Object.keys(endpointLimits)
        .find(key => key.includes('*') && endpoint.startsWith(key.replace('.*', '')));
    
    if (wildcardKey) {
        return endpointLimits[wildcardKey];
    }

    // Limite general si no hay específico
    return generalRateLimit;
};

// Rate limiting global con estadísticas
export const rateLimitStats = (req, res, next) => {
    // Añadir headers de información sobre rate limits
    res.set({
        'X-RateLimit-Info': 'VetPlus API Rate Limiting Active',
        'X-RateLimit-Policy': 'Role-based and endpoint-specific',
        'X-RateLimit-Contact': 'admin@vetplus.com'
    });
    
    next();
};