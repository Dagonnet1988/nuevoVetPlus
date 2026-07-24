import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import DBInit from './src/database/DBInit.js';

// Importar configuración de producción
import { productionConfig, validateConfig, getConfigByEnvironment } from './src/config/production.js';

// Importar rutas
import authRoutes from './src/routes/auth.js';
import clinicalRoutes from './src/routes/clinical.js';
import auditRoutes from './src/routes/audit.js';
import superadminRoutes from './src/routes/superadmin.js';
import publicRoutes from './src/routes/public.js';
import googleCalendarRoutes from './src/routes/googleCalendar.js';
import empresaConfigRoutes from './src/routes/empresaConfigRoutes.js';
import appointmentExportRoutes from './src/routes/appointmentExport.js';
import configConsentimientoRoutes from './src/routes/configConsentimientoRoutes.js';
import googleCalendarWebhookRoutes from './src/routes/googleCalendarWebhook.js';
import systemStatusRoutes from './src/routes/systemStatus.js';
import emailConfigRoutes from './src/routes/emailConfigRoutes.js';
import documentEmailRoutes from './src/routes/documentEmailRoutes.js';

// Importar middleware de auditoría
import { setAuditContext, auditActivity, auditAuthActivity } from './src/middleware/auditMiddleware.js';

// Importar scheduler de sincronización
import syncScheduler from './src/services/syncScheduler.js';

// Importar middleware de producción
import {
    generalRateLimit,
    authRateLimit,
    adminRateLimit,
    rateLimitStats
} from './src/middleware/rateLimiter.js';

import {
    preventSQLInjection,
    handleValidationErrors
} from './src/middleware/advancedValidation.js';

import {
    basicHealthCheck,
    detailedHealthCheck,
    getSystemMetrics,
    resetSystemMetrics,
    requestMetrics,
    readinessProbe,
    livenessProbe,
    alerting
} from './src/middleware/healthMonitoring.js';

import {
    intelligentCompression,
    intelligentCaching,
    configCache,
    performanceHeaders,
    getCacheStats,
    clearCache
} from './src/middleware/performance.js';

// Importar documentación Swagger
import { specs, swaggerUi, swaggerUiOptions } from './src/config/swagger.js';

/**
 * VetPlus Backend - Servidor Production Ready
 * Sistema optimizado con todas las mejoras de producción
 */

const app = express();

// Validar configuración antes de iniciar
try {
    validateConfig();
} catch (error) {
    console.error('❌ Error en configuración:', error.message);
    process.exit(1);
}

const config = getConfigByEnvironment();
const PORT = config.app.port;

console.log('🚀 INICIALIZANDO VETPLUS BACKEND PRODUCTION READY');
console.log('═'.repeat(60));
console.log(`📦 Versión: ${config.app.version}`);
console.log(`🌍 Ambiente: ${config.app.env}`);
console.log(`⚙️  Puerto: ${PORT}`);
console.log(`🕒 Timezone: ${config.app.timezone}`);
console.log('═'.repeat(60));

// Configurar trust proxy para obtener IP real
app.set('trust proxy', 1);

// Request ID para trazabilidad mínima en logs y respuestas
app.use((req, res, next) => {
    const headerRequestId = req.headers['x-request-id'];
    req.id = typeof headerRequestId === 'string' && headerRequestId.trim()
        ? headerRequestId.trim()
        : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// ============ MIDDLEWARE DE SEGURIDAD AVANZADA ============

// Helmet con configuración personalizada
app.use(helmet(config.security.helmet));

const corsOriginRules = (config.security.corsOrigins || [])
    .map((origin) => origin.trim())
    .filter(Boolean);

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const compiledCorsRules = corsOriginRules.map((rule) => {
    if (rule === '*') {
        return /^.*$/i;
    }
    const regexPattern = `^${escapeRegex(rule).replace(/\\\*/g, '[^.\\/:]+')}$`;
    return new RegExp(regexPattern, 'i');
});

function isOriginAllowed(origin) {
    if (!origin) return true;
    if (compiledCorsRules.length === 0) return false;
    return compiledCorsRules.some((rule) => rule.test(origin));
}

// CORS optimizado (soporta patrones wildcard como https://*.vetplus.com)
app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Slug', 'X-Request-Id'],
    exposedHeaders: ['X-Total-Count', 'X-Cache', 'X-RateLimit-Remaining', 'X-Request-Id']
}));

// Rate limiting global
app.use(rateLimitStats);
app.use(generalRateLimit);

// ============ MIDDLEWARE DE PERFORMANCE ============

// Compresión inteligente
app.use(intelligentCompression);

// Headers de performance
app.use(performanceHeaders);

// Métricas de requests
app.use(requestMetrics);

// Sistema de alertas
app.use(alerting);

// ============ MIDDLEWARE DE VALIDACIÓN ============

// Prevención SQL injection
app.use(preventSQLInjection);

// Logging avanzado
if (config.logging.requests) {
    morgan.token('reqId', (req) => req.id || 'unknown');
    const isProduction = config.app.env === 'production';
    const logAllRequests = process.env.LOG_ALL_REQUESTS === 'true';
    const noisyPaths = ['/health', '/metrics', '/favicon.ico', '/robots.txt', '/sitemap.xml'];

    app.use(morgan(isProduction ? 'combined' : 'dev', {
        skip: (req, res) => {
            if (noisyPaths.some((path) => req.originalUrl.startsWith(path))) {
                return true;
            }

            // En producción, por defecto registrar solo errores HTTP.
            if (isProduction && !logAllRequests) {
                return res.statusCode < 400;
            }

            return false;
        }
    }));
}

// Parsing JSON con límites
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Verificar el tamaño del payload
        if (buf.length > 10 * 1024 * 1024) { // 10MB
            throw new Error('Payload demasiado grande');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (logos, firmas, consentimientos) para tenants.
app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else if (!origin) {
        // Permitir acceso directo (navegador/monitoring sin header Origin).
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
}, express.static('uploads'));

app.use('/generated-docs', express.static('generated-docs'));

// ============ MIDDLEWARE DE AUDITORÍA ============
app.use(setAuditContext);
app.use(auditActivity);

// ============ DOCUMENTACIÓN API ============
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// ============ HEALTH CHECKS Y MONITORING ============
app.get('/health', basicHealthCheck);
app.get('/health/detailed', detailedHealthCheck);
app.get('/health/ready', readinessProbe);
app.get('/health/live', livenessProbe);
app.get('/metrics', getSystemMetrics);

// Endpoints de administración de sistema (admin only)
app.get('/admin/cache/stats', getCacheStats);
app.post('/admin/cache/clear', clearCache);
app.post('/admin/metrics/reset', resetSystemMetrics);

// ============ RUTAS PRINCIPALES ============

// Ruta raíz con información del sistema
app.get('/', intelligentCaching({ ttl: 3600 }), (req, res) => {
    res.json({
        success: true,
        data: {
            message: 'VetPlus API - Sistema de Gestión Veterinaria Production Ready',
            version: config.app.version,
            environment: config.app.env,
            features: Object.keys(config.features).filter(key => config.features[key]),
            modules: [
                'authentication',
                'clinical_management', 
                'google_calendar',
                'audit_system'
            ],
            endpoints: {
                documentation: '/api/docs',
                health_check: '/health',
                metrics: '/metrics'
            },
            status: 'operational',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        }
    });
});

// Rutas con rate limiting específico
// Importante: authRoutes ya aplica authRateLimit en endpoints sensibles
// (login/refresh/forgot/reset). No aplicar aquí a todo /api/auth para
// evitar bloquear rutas internas como /api/auth/users con 429.
app.use('/api/auth', 
    auditAuthActivity, 
    authRoutes
);

// Login de superadmin protegido con rate limit estricto.
app.use('/api/superadmin/auth', authRateLimit);

app.use('/api/superadmin',
    auditAuthActivity,
    superadminRoutes
);

app.use('/api/public', publicRoutes);

app.use('/api/clinical', 
    clinicalRoutes
);

app.use('/api/audit', 
    adminRateLimit,
    auditRoutes
);

app.use('/api/google-calendar', 
    adminRateLimit,
    googleCalendarRoutes
);

app.use('/api/admin/empresa',
    adminRateLimit,
    empresaConfigRoutes
);

app.use('/api/appointments/export',
    adminRateLimit,
    appointmentExportRoutes
);

app.use('/api/config/consentimiento',
    adminRateLimit,
    configConsentimientoRoutes
);

app.use('/api/google-calendar-webhook',
    googleCalendarWebhookRoutes
);

app.use('/api/system',
    adminRateLimit,
    systemStatusRoutes
);

app.use('/api/admin/email',
    adminRateLimit,
    emailConfigRoutes
);

app.use('/api/clinical/notificaciones',
    documentEmailRoutes
);

// ============ MIDDLEWARE DE MANEJO DE ERRORES ============

// Manejo de errores de validación
app.use(handleValidationErrors);

// Manejo global de errores
app.use((err, req, res, next) => {
    // Log del error para monitoreo
    console.error('Error capturado:', {
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: config.app.env === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.id,
        headers: req.headers
    });

    // Determinar tipo de error
    let statusCode = 500;
    let message = 'Error interno del servidor';
    let code = 'INTERNAL_ERROR';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Error de validación';
        code = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'No autorizado';
        code = 'UNAUTHORIZED';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Acceso denegado';
        code = 'FORBIDDEN';
    } else if (err.message.includes('not found')) {
        statusCode = 404;
        message = 'Recurso no encontrado';
        code = 'NOT_FOUND';
    }

    res.status(statusCode).json({
        success: false,
        message,
        code,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown',
        ...(config.app.env === 'development' && { 
            error: err.message,
            stack: err.stack 
        })
    });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        code: 'ENDPOINT_NOT_FOUND',
        endpoint: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            '/api/docs',
            '/health',
            '/api/auth',
            '/api/clinical',
            '/api/google-calendar',
            '/api/audit'
        ],
        timestamp: new Date().toISOString()
    });
});

// ============ INICIALIZACIÓN DEL SISTEMA ============

async function initializeDatabase() {
    try {
        console.log('🔧 INICIALIZANDO BASE DE DATOS...');
        console.log('═'.repeat(40));
        
        const dbInit = new DBInit();
        const success = await dbInit.initialize();
        
        if (!success) {
            throw new Error('DBInit.initialize() retornó false');
        }
        
        console.log('✅ Base de datos inicializada correctamente');
        console.log('═'.repeat(40));
        
        // Inicializar scheduler de sincronización si está habilitado
        if (config.features.googleCalendar) {
            await syncScheduler.initialize();
            console.log('📅 Google Calendar scheduler inicializado');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar base de datos:', error.message);
        throw error;
    }
}

async function startServer() {
    try {
        // 1. Inicializar base de datos
        const dbReady = await initializeDatabase();
        
        if (!dbReady) {
            console.error('❌ No se pudo inicializar la base de datos. Cerrando servidor.');
            process.exit(1);
        }

        // 2. Configurar SSL si está habilitado
        let server;
        if (config.ssl.enabled) {
            const https = await import('https');
            const fs = await import('fs');
            
            const sslOptions = {
                cert: fs.readFileSync(config.ssl.cert),
                key: fs.readFileSync(config.ssl.key),
                ...(config.ssl.ca && { ca: fs.readFileSync(config.ssl.ca) })
            };
            
            server = https.createServer(sslOptions, app);
            console.log('🔒 HTTPS habilitado');
        } else {
            server = app;
        }

        // 3. Iniciar servidor
        server.listen(PORT, () => {
            console.log('🎉 VETPLUS BACKEND INICIADO EXITOSAMENTE');
            console.log('═'.repeat(60));
            console.log(`🚀 Servidor: ${config.ssl.enabled ? 'https' : 'http'}://localhost:${PORT}`);
            console.log(`📚 Documentación: http://localhost:${PORT}/api/docs`);
            console.log(`💊 Health Check: http://localhost:${PORT}/health`);
            console.log(`📊 Métricas: http://localhost:${PORT}/metrics`);
            console.log('═'.repeat(60));
            console.log('🏥 Módulos Activos:');
            console.log('   ✅ Autenticación y Usuarios');
            console.log('   ✅ Gestión Clínica Completa');
            console.log('   ✅ Google Calendar Integration');
            console.log('   ✅ Sistema de Auditoría');
            console.log('═'.repeat(60));
            console.log('🛡️  Seguridad Production Ready:');
            console.log('   ✅ Rate Limiting Avanzado');
            console.log('   ✅ Validaciones Exhaustivas');
            console.log('   ✅ SQL Injection Prevention');
            console.log('   ✅ Helmet Security Headers');
            console.log('═'.repeat(60));
            console.log('⚡ Performance Optimizado:');
            console.log('   ✅ Compresión Inteligente');
            console.log('   ✅ Cache Multinivel');
            console.log('   ✅ Request Metrics');
            console.log('   ✅ Health Monitoring');
            console.log('═'.repeat(60));
            console.log('🎯 BACKEND AL 100% - PRODUCTION READY! 🎯');
            console.log('═'.repeat(60));
        });

        // Manejar shutdown graceful
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('❌ Error fatal al iniciar servidor:', error);
        process.exit(1);
    }
}

// Shutdown graceful
function gracefulShutdown(signal) {
    console.log(`\n🛑 Recibida señal ${signal}. Iniciando shutdown graceful...`);
    
    // Dar tiempo para completar requests en curso
    setTimeout(() => {
        console.log('✅ Servidor cerrado exitosamente');
        process.exit(0);
    }, 5000);
}

// Iniciar la aplicación
startServer();

export default app;