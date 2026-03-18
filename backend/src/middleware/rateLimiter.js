import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate Limiting Avanzado por Endpoint y Rol
 * Sistema production-ready con límites diferenciados
 */

// Rate limiting deshabilitado para desarrollo
export const generalRateLimit = (req, res, next) => {
    // Pasar sin rate limiting en desarrollo
    next();
};

// Rate limiting deshabilitado para desarrollo
export const authRateLimit = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const adminRateLimit = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const reportsRateLimit = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const publicRateLimit = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const writeSlowDown = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const roleBasedRateLimit = (limits = {}) => {
    return (req, res, next) => {
        next();
    };
};

// Rate limiting deshabilitado para desarrollo
// Rate limiting deshabilitado para desarrollo
export const searchRateLimit = (req, res, next) => {
    next();
};

// Rate limiting deshabilitado para desarrollo
export const endpointRateLimit = (endpoint) => {
    return (req, res, next) => {
        next();
    };
};

// Rate limiting deshabilitado para desarrollo
export const rateLimitStats = (req, res, next) => {
    // Headers informativos (sin rate limiting real)
    res.set({
        'X-RateLimit-Info': 'VetPlus API Rate Limiting DISABLED for Development',
        'X-RateLimit-Policy': 'Development mode - no limits',
        'X-RateLimit-Contact': 'admin@vetplus.com'
    });
    
    next();
};