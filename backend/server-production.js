import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import DBInit from './src/database/DBInit.js';

// Importar configuración de producción
import { productionConfig, validateConfig, getConfigByEnvironment } from './src/config/production.js';

// Importar rutas
import authRoutes from './src/routes/auth.js';
import clinicalRoutes from './src/routes/clinical.js';
import auditRoutes from './src/routes/audit.js';
import googleCalendarRoutes from './src/routes/googleCalendar.js';

// Importar middleware de auditoría
import { setAuditContext, auditActivity, auditAuthActivity } from './src/middleware/auditMiddleware.js';

// Importar scheduler de sincronización
import syncScheduler from './src/services/syncScheduler.js';

// Importar middleware de producción
import {
    generalRateLimit,
    authRateLimit,
    adminRateLimit,
    endpointRateLimit,
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
    paginatedCache,
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

// ============ MIDDLEWARE DE SEGURIDAD AVANZADA ============

// Helmet con configuración personalizada
app.use(helmet(config.security.helmet));

// CORS optimizado
app.use(cors({
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Cache', 'X-RateLimit-Remaining']
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
    app.use(morgan(config.app.env === 'production' ? 'combined' : 'dev'));
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
app.use('/api/auth', 
    authRateLimit, 
    auditAuthActivity, 
    authRoutes
);

app.use('/api/clinical', 
    endpointRateLimit('clinical.*'),
    paginatedCache,
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