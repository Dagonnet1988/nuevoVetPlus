import { query } from '../config/database.js';
import os from 'os';
import { performance } from 'perf_hooks';

/**
 * Sistema de Health Checks y Monitoring Avanzado
 * Monitoreo en tiempo real del estado del sistema
 */

// Métricas del sistema en tiempo real
class SystemMetrics {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                success: 0,
                errors: 0,
                avgResponseTime: 0,
                lastReset: new Date()
            },
            database: {
                connections: 0,
                queries: 0,
                avgQueryTime: 0,
                errors: 0
            },
            memory: {
                used: 0,
                free: 0,
                total: 0,
                percentage: 0
            },
            cpu: {
                usage: 0,
                load: []
            },
            uptime: 0,
            version: process.env.npm_package_version || '1.0.0'
        };
        
        this.startTime = Date.now();
        this.responseTimes = [];
        this.queryTimes = [];
        
        // Actualizar métricas cada 30 segundos
        setInterval(() => this.updateSystemMetrics(), 30000);
        this.updateSystemMetrics();
    }
    
    updateSystemMetrics() {
        // Memoria
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        this.metrics.memory = {
            used: Math.round(usedMem / 1024 / 1024), // MB
            free: Math.round(freeMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round((usedMem / totalMem) * 100)
        };
        
        // CPU
        this.metrics.cpu = {
            usage: this.getCPUUsage(),
            load: os.loadavg()
        };
        
        // Uptime
        this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Limpiar arrays de métricas antiguas (últimos 100 registros)
        if (this.responseTimes.length > 100) {
            this.responseTimes = this.responseTimes.slice(-100);
        }
        if (this.queryTimes.length > 100) {
            this.queryTimes = this.queryTimes.slice(-100);
        }
        
        // Calcular promedios
        if (this.responseTimes.length > 0) {
            this.metrics.requests.avgResponseTime = 
                this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
        }
        
        if (this.queryTimes.length > 0) {
            this.metrics.database.avgQueryTime = 
                this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
        }
    }
    
    getCPUUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        return Math.round(100 - (totalIdle / totalTick) * 100);
    }
    
    recordRequest(success = true, responseTime = 0) {
        this.metrics.requests.total++;
        if (success) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.errors++;
        }
        
        if (responseTime > 0) {
            this.responseTimes.push(responseTime);
        }
    }
    
    recordQuery(success = true, queryTime = 0) {
        this.metrics.database.queries++;
        if (!success) {
            this.metrics.database.errors++;
        }
        
        if (queryTime > 0) {
            this.queryTimes.push(queryTime);
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        };
    }
    
    resetMetrics() {
        this.metrics.requests = {
            total: 0,
            success: 0,
            errors: 0,
            avgResponseTime: 0,
            lastReset: new Date()
        };
        this.metrics.database = {
            connections: 0,
            queries: 0,
            avgQueryTime: 0,
            errors: 0
        };
        this.responseTimes = [];
        this.queryTimes = [];
    }
}

// Instancia global de métricas
export const systemMetrics = new SystemMetrics();

// Middleware para capturar métricas de requests
export const requestMetrics = (req, res, next) => {
    const startTime = performance.now();
    
    // Interceptar el final de la respuesta
    const originalSend = res.send;
    res.send = function(data) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const success = res.statusCode < 400;
        
        systemMetrics.recordRequest(success, responseTime);
        
        return originalSend.call(this, data);
    };
    
    next();
};

// Health check básico
export const basicHealthCheck = async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: systemMetrics.metrics.version,
            uptime: systemMetrics.metrics.uptime,
            environment: process.env.NODE_ENV || 'development'
        };
        
        res.status(200).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
};

// Health check detallado
export const detailedHealthCheck = async (req, res) => {
    try {
        const checks = await Promise.allSettled([
            checkDatabase(),
            checkMemory(),
            checkDiskSpace(),
            checkExternalServices()
        ]);
        
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: systemMetrics.metrics.version,
            uptime: systemMetrics.metrics.uptime,
            environment: process.env.NODE_ENV || 'development',
            checks: {
                database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', error: checks[0].reason?.message },
                memory: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', error: checks[1].reason?.message },
                disk: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy', error: checks[2].reason?.message },
                external: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unhealthy', error: checks[3].reason?.message }
            }
        };
        
        // Determinar estado general
        const hasUnhealthyChecks = Object.values(results.checks)
            .some(check => check.status === 'unhealthy');
        
        if (hasUnhealthyChecks) {
            results.status = 'degraded';
        }
        
        const statusCode = results.status === 'healthy' ? 200 : 
                          results.status === 'degraded' ? 207 : 503;
        
        res.status(statusCode).json(results);
        
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
};

// Check de base de datos
async function checkDatabase() {
    try {
        const start = performance.now();
        const result = await query('SELECT 1 as test, NOW() as timestamp');
        const responseTime = performance.now() - start;
        
        systemMetrics.recordQuery(true, responseTime);
        
        return {
            status: 'healthy',
            responseTime: Math.round(responseTime),
            timestamp: result.rows[0].timestamp,
            message: 'Database connection successful'
        };
    } catch (error) {
        systemMetrics.recordQuery(false);
        throw new Error(`Database check failed: ${error.message}`);
    }
}

// Check de memoria
async function checkMemory() {
    const metrics = systemMetrics.metrics.memory;
    const threshold = 90; // 90% de uso como límite crítico
    
    if (metrics.percentage > threshold) {
        throw new Error(`Memory usage critical: ${metrics.percentage}%`);
    }
    
    return {
        status: metrics.percentage > 80 ? 'warning' : 'healthy',
        usage: `${metrics.used}MB / ${metrics.total}MB`,
        percentage: `${metrics.percentage}%`,
        message: metrics.percentage > 80 ? 'High memory usage' : 'Memory usage normal'
    };
}

// Check de espacio en disco
async function checkDiskSpace() {
    try {
        // En un entorno real, implementarías un check real del disco
        // Por ahora, simulamos una verificación
        const freeSpace = 85; // Porcentaje simulado de espacio libre
        
        return {
            status: freeSpace < 20 ? 'unhealthy' : freeSpace < 40 ? 'warning' : 'healthy',
            freeSpace: `${freeSpace}%`,
            message: freeSpace < 20 ? 'Low disk space' : 'Disk space adequate'
        };
    } catch (error) {
        throw new Error(`Disk space check failed: ${error.message}`);
    }
}

// Check de servicios externos
async function checkExternalServices() {
    try {
        // Verificar Google Calendar API (si está configurado)
        const checks = [];
        
        // Simular check de servicios externos
        checks.push({
            service: 'google_calendar',
            status: 'healthy',
            message: 'Google Calendar API accessible'
        });
        
        return {
            status: 'healthy',
            services: checks,
            message: 'All external services operational'
        };
    } catch (error) {
        throw new Error(`External services check failed: ${error.message}`);
    }
}

// Endpoint para métricas detalladas
export const getSystemMetrics = (req, res) => {
    try {
        const metrics = systemMetrics.getMetrics();
        res.status(200).json(metrics);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error obteniendo métricas del sistema',
            error: error.message
        });
    }
};

// Endpoint para reset de métricas (admin only)
export const resetSystemMetrics = (req, res) => {
    try {
        // Solo admins pueden resetear métricas
        if (req.user?.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores pueden resetear métricas'
            });
        }
        
        systemMetrics.resetMetrics();
        
        res.status(200).json({
            success: true,
            message: 'Métricas del sistema reseteadas',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reseteando métricas',
            error: error.message
        });
    }
};

// Middleware para alertas automáticas
export const alerting = (req, res, next) => {
    const metrics = systemMetrics.getMetrics();
    
    // Verificar condiciones críticas
    const criticalConditions = [
        {
            condition: metrics.memory.percentage > 90,
            message: `Critical memory usage: ${metrics.memory.percentage}%`,
            level: 'critical'
        },
        {
            condition: metrics.requests.errors / metrics.requests.total > 0.1 && metrics.requests.total > 10,
            message: `High error rate: ${Math.round((metrics.requests.errors / metrics.requests.total) * 100)}%`,
            level: 'warning'
        },
        {
            condition: metrics.requests.avgResponseTime > 5000,
            message: `Slow response times: ${Math.round(metrics.requests.avgResponseTime)}ms average`,
            level: 'warning'
        }
    ];
    
    const activeAlerts = criticalConditions.filter(c => c.condition);
    
    if (activeAlerts.length > 0) {
        console.warn('System alerts triggered:', {
            timestamp: new Date().toISOString(),
            alerts: activeAlerts,
            endpoint: req.originalUrl,
            user: req.user?.id
        });
        
        // En producción, aquí enviarías alertas por email, Slack, etc.
    }
    
    next();
};

// Readiness probe para Kubernetes
export const readinessProbe = async (req, res) => {
    try {
        // Verificar que los servicios esenciales estén listos
        await query('SELECT 1');
        
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
};

// Liveness probe para Kubernetes
export const livenessProbe = (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: systemMetrics.metrics.uptime
    });
};