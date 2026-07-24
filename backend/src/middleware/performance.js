import compression from 'compression';
import NodeCache from 'node-cache';
import { query } from '../config/database.js';

/**
 * Optimizaciones de Performance para Production
 * Sistema avanzado de cache, compresión y optimizaciones
 */

// Cache en memoria con TTL personalizado
class AdvancedCache {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.shouldLogCacheStats = process.env.LOG_CACHE_STATS === 'true';

        // Cache principal con TTL de 5 minutos
        this.mainCache = new NodeCache({ 
            stdTTL: 300, // 5 minutos
            checkperiod: 60, // verificar cada minuto
            useClones: false // mejor performance
        });
        
        // Cache de sesiones con TTL de 30 minutos
        this.sessionCache = new NodeCache({ 
            stdTTL: 1800, // 30 minutos
            checkperiod: 120 // verificar cada 2 minutos
        });
        
        // Cache de analitica con TTL de 1 hora
        this.reportsCache = new NodeCache({ 
            stdTTL: 3600, // 1 hora
            checkperiod: 300 // verificar cada 5 minutos
        });
        
        // Cache de configuración con TTL de 24 horas
        this.configCache = new NodeCache({ 
            stdTTL: 86400, // 24 horas
            checkperiod: 3600 // verificar cada hora
        });
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        
        // Log de estadísticas cada 10 minutos (opt-in en producción)
        setInterval(() => this.logStats(), 600000);
    }
    
    // Obtener del cache principal
    get(key) {
        const value = this.mainCache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            return value;
        }
        this.stats.misses++;
        return null;
    }
    
    // Guardar en cache principal
    set(key, value, ttl = 300) {
        this.stats.sets++;
        return this.mainCache.set(key, value, ttl);
    }
    
    // Obtener del cache de analitica
    getReport(key) {
        const value = this.reportsCache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            return value;
        }
        this.stats.misses++;
        return null;
    }
    
    // Guardar en cache de analitica
    setReport(key, value, ttl = 3600) {
        this.stats.sets++;
        return this.reportsCache.set(key, value, ttl);
    }
    
    // Obtener configuración
    getConfig(key) {
        const value = this.configCache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            return value;
        }
        this.stats.misses++;
        return null;
    }
    
    // Guardar configuración
    setConfig(key, value, ttl = 86400) {
        this.stats.sets++;
        return this.configCache.set(key, value, ttl);
    }
    
    // Eliminar entrada específica
    delete(key) {
        this.stats.deletes++;
        this.mainCache.del(key);
        this.reportsCache.del(key);
        this.sessionCache.del(key);
        this.configCache.del(key);
    }
    
    // Limpiar cache por patrón
    deletePattern(pattern) {
        const regex = new RegExp(pattern);
        const caches = [this.mainCache, this.reportsCache, this.sessionCache, this.configCache];
        
        caches.forEach(cache => {
            const keys = cache.keys();
            keys.forEach(key => {
                if (regex.test(key)) {
                    cache.del(key);
                    this.stats.deletes++;
                }
            });
        });
    }
    
    // Limpiar todo el cache
    flush() {
        this.mainCache.flushAll();
        this.reportsCache.flushAll();
        this.sessionCache.flushAll();
        this.configCache.flushAll();
        this.stats.deletes += 1;
    }
    
    // Obtener estadísticas
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            totalRequests,
            mainCacheKeys: this.mainCache.keys().length,
            reportsCacheKeys: this.reportsCache.keys().length,
            sessionCacheKeys: this.sessionCache.keys().length,
            configCacheKeys: this.configCache.keys().length
        };
    }
    
    // Log de estadísticas
    logStats() {
        if (this.isProduction && !this.shouldLogCacheStats) {
            return;
        }

        const stats = this.getStats();
        console.log('Cache Statistics:', {
            timestamp: new Date().toISOString(),
            ...stats
        });
    }
}

// Instancia global del cache
export const cache = new AdvancedCache();

// Middleware de compresión inteligente
export const intelligentCompression = compression({
    // Compresión solo para responses > 1KB
    threshold: 1024,
    
    // Nivel de compresión balanceado (6 = buena compresión sin mucho CPU)
    level: 6,
    
    // No comprimir ya comprimido
    filter: (req, res) => {
        // No comprimir si el cliente no lo soporta
        if (req.headers['x-no-compression']) {
            return false;
        }
        
        // No comprimir imágenes, videos, o archivos ya comprimidos
        const contentType = res.getHeader('content-type');
        if (contentType) {
            const skipTypes = [
                'image/', 'video/', 'audio/',
                'application/zip', 'application/gzip',
                'application/pdf'
            ];
            
            if (skipTypes.some(type => contentType.includes(type))) {
                return false;
            }
        }
        
        return compression.filter(req, res);
    }
});

// Middleware de cache inteligente
export const intelligentCaching = (options = {}) => {
    const {
        ttl = 300, // 5 minutos por defecto
        keyGenerator = null,
        cacheType = 'main', // main, reports, config
        skipCache = null
    } = options;
    
    return async (req, res, next) => {
        const tenantKey = req.tenantId || req.user?.tenant_id || 'no-tenant';

        // Generar clave de cache
        const cacheKey = keyGenerator ? 
            keyGenerator(req) : 
            `${tenantKey}:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`;
        
        // Verificar si debe saltar el cache
        if (skipCache && skipCache(req)) {
            return next();
        }
        
        // Solo cachear GET requests
        if (req.method !== 'GET') {
            return next();
        }
        
        // Buscar en cache
        let cachedResponse;
        switch (cacheType) {
            case 'reports':
                cachedResponse = cache.getReport(cacheKey);
                break;
            case 'config':
                cachedResponse = cache.getConfig(cacheKey);
                break;
            default:
                cachedResponse = cache.get(cacheKey);
        }
        
        if (cachedResponse) {
            res.set('X-Cache', 'HIT');
            res.set('X-Cache-Key', cacheKey);
            return res.json(cachedResponse);
        }
        
        // Interceptar respuesta para guardar en cache
        const originalSend = res.send;
        res.send = function(data) {
            // Solo cachear respuestas exitosas
            if (res.statusCode === 200 && data) {
                try {
                    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                    
                    // Guardar en cache según el tipo
                    switch (cacheType) {
                        case 'reports':
                            cache.setReport(cacheKey, jsonData, ttl);
                            break;
                        case 'config':
                            cache.setConfig(cacheKey, jsonData, ttl);
                            break;
                        default:
                            cache.set(cacheKey, jsonData, ttl);
                    }
                    
                    res.set('X-Cache', 'MISS');
                    res.set('X-Cache-Key', cacheKey);
                } catch (error) {
                    console.warn('Error caching response:', error.message);
                }
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

// Cache especifico para analitica
export const reportsCache = intelligentCaching({
    ttl: 3600, // 1 hora
    cacheType: 'reports',
    keyGenerator: (req) => {
        const params = {
            ...req.query,
            tenant: req.tenantId || req.user?.tenant_id || 'no-tenant',
            endpoint: req.route?.path || req.originalUrl,
            user: req.user?.id
        };
        return `report:${JSON.stringify(params)}`;
    }
});

// Cache específico para configuración
export const configCache = intelligentCaching({
    ttl: 86400, // 24 horas
    cacheType: 'config',
    keyGenerator: (req) => `config:${req.tenantId || req.user?.tenant_id || 'no-tenant'}:${req.originalUrl}:${req.user?.rol}`
});

// Cache específico para listas paginadas
export const paginatedCache = intelligentCaching({
    ttl: 600, // 10 minutos
    keyGenerator: (req) => {
        const { page = 1, limit = 10, sortBy, sortOrder, ...filters } = req.query;
        return `paginated:${req.tenantId || req.user?.tenant_id || 'no-tenant'}:${req.originalUrl}:${page}:${limit}:${sortBy}:${sortOrder}:${JSON.stringify(filters)}`;
    }
});

// Optimización de queries con cache
export const cachedQuery = async (sql, params = [], cacheKey = null, ttl = 300) => {
    if (!cacheKey) {
        // Generar clave basada en la query
        cacheKey = `query:${Buffer.from(sql + JSON.stringify(params)).toString('base64').slice(0, 50)}`;
    }
    
    // Buscar en cache
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    // Ejecutar query
    const result = await query(sql, params);
    
    // Guardar en cache solo si es una consulta SELECT
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
        cache.set(cacheKey, result, ttl);
    }
    
    return result;
};

// Middleware para invalidar cache automáticamente
export const cacheInvalidation = (patterns = []) => {
    return (req, res, next) => {
        // Solo invalidar en operaciones de escritura
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            // Interceptar respuesta exitosa
            const originalSend = res.send;
            res.send = function(data) {
                if (res.statusCode < 400) {
                    // Invalidar patrones específicos
                    patterns.forEach(pattern => {
                        cache.deletePattern(pattern);
                    });
                    
                    // Invalidar cache general relacionado con la ruta
                    const baseRoute = req.originalUrl.split('/')[2]; // /api/[module]/...
                    if (baseRoute) {
                        cache.deletePattern(`.*${baseRoute}.*`);
                    }
                }
                
                return originalSend.call(this, data);
            };
        }
        
        next();
    };
};

// Middleware para headers de performance
export const performanceHeaders = (req, res, next) => {
    const startTime = Date.now();
    const isProduction = process.env.NODE_ENV === 'production';
    const logAllRequests = process.env.LOG_ALL_REQUEST_PERF === 'true';
    const slowRequestMs = Number(process.env.SLOW_REQUEST_MS || 2000);
    
    // Headers de seguridad y performance
    res.set({
        'X-Response-Time-Start': startTime,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    // Al finalizar la respuesta
    res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // En producción evitar ruido: loguear solo errores/requests lentas salvo opt-in.
        if (!logAllRequests) {
            const shouldLog = !isProduction || res.statusCode >= 500 || responseTime >= slowRequestMs;
            if (!shouldLog) {
                return;
            }
        }

        console.log('Request Performance:', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: res.get('content-length') || 0,
            userAgent: req.get('user-agent'),
            ip: req.ip,
            user: req.user?.id
        });
    });
    
    next();
};

// Endpoint para estadísticas de cache
export const getCacheStats = (req, res) => {
    try {
        const stats = cache.getStats();
        
        res.json({
            success: true,
            data: {
                cache: stats,
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                uptime: Math.floor(process.uptime())
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas de cache',
            error: error.message
        });
    }
};

// Endpoint para limpiar cache (admin only)
export const clearCache = (req, res) => {
    try {
        if (req.user?.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores pueden limpiar el cache'
            });
        }
        
        const { pattern } = req.body;
        
        if (pattern) {
            cache.deletePattern(pattern);
        } else {
            cache.flush();
        }
        
        res.json({
            success: true,
            message: pattern ? 
                `Cache limpiado para patrón: ${pattern}` : 
                'Todo el cache ha sido limpiado',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error limpiando cache',
            error: error.message
        });
    }
};

// Optimización de conexiones de base de datos
export const optimizeDbConnections = () => {
    // Pool de conexiones optimizado
    const poolConfig = {
        max: 20, // máximo 20 conexiones
        min: 2,  // mínimo 2 conexiones
        acquire: 30000, // tiempo máximo para obtener conexión
        idle: 10000,    // tiempo máximo inactivo antes de cerrar
        evict: 1000,    // verificar cada segundo
        handleDisconnects: true
    };
    
    return poolConfig;
};