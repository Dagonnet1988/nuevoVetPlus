import cron from 'node-cron';
import bidirectionalSyncService from './bidirectionalSyncService.js';
import googleCalendarService from './googleCalendar.js';
import { query } from '../config/database.js';

class SyncScheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    /**
     * Inicializar el scheduler de sincronización
     */
    async initialize() {
        try {
            console.log('🔄 Inicializando scheduler de sincronización Google Calendar...');
            
            // Verificar si Google Calendar está configurado
            if (!await googleCalendarService.hasValidTokens()) {
                console.log('⏸️  Google Calendar no configurado - scheduler en espera');
                return;
            }

            // Programar sincronización automática cada 15 minutos
            this.scheduleSync();
            
            // Programar limpieza de logs cada día a las 2 AM
            this.scheduleLogCleanup();
            
            this.isRunning = true;
            console.log('✅ Scheduler de sincronización iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando scheduler de sincronización:', error);
        }
    }

    /**
     * Programar sincronización automática
     */
    scheduleSync() {
        // Cada 15 minutos sincronizar cambios desde Google Calendar
        const syncJob = cron.schedule('*/15 * * * *', async () => {
            try {
                console.log('🔄 Ejecutando sincronización automática desde Google Calendar...');
                
                const result = await bidirectionalSyncService.syncChangesFromGoogle();
                
                if (result.success) {
                    console.log(`✅ Sincronización completada: ${result.results.total_changes} cambios procesados`);
                    
                    // Registrar estadísticas si hay cambios
                    if (result.results.total_changes > 0) {
                        await this.logSyncActivity('auto_sync', result.results);
                    }
                } else {
                    console.error('❌ Error en sincronización automática:', result.error);
                    await this.logSyncActivity('auto_sync_error', { error: result.error });
                }
                
            } catch (error) {
                console.error('❌ Error en tarea de sincronización automática:', error);
                await this.logSyncActivity('auto_sync_error', { error: error.message });
            }
        }, {
            scheduled: false // No iniciar automáticamente
        });

        this.jobs.set('sync', syncJob);
        syncJob.start();
        
        console.log('📅 Sincronización automática programada cada 15 minutos');
    }

    /**
     * Programar limpieza de logs
     */
    scheduleLogCleanup() {
        // Cada día a las 2 AM limpiar logs antiguos
        const cleanupJob = cron.schedule('0 2 * * *', async () => {
            try {
                console.log('🧹 Ejecutando limpieza de logs de sincronización...');
                
                // Eliminar logs de más de 30 días
                const cleanupResult = await query(`
                    DELETE FROM audit.activity_log 
                    WHERE accion LIKE '%sync%' 
                    AND timestamp < CURRENT_DATE - INTERVAL '30 days'
                `);

                console.log(`✅ Limpieza completada: ${cleanupResult.rowCount} logs eliminados`);
                
            } catch (error) {
                console.error('❌ Error en limpieza de logs:', error);
            }
        }, {
            scheduled: false
        });

        this.jobs.set('cleanup', cleanupJob);
        cleanupJob.start();
        
        console.log('🧹 Limpieza de logs programada diariamente a las 2 AM');
    }

    /**
     * Programar sincronización masiva semanal
     */
    scheduleWeeklyFullSync() {
        // Cada domingo a las 3 AM hacer sincronización completa
        const weeklyJob = cron.schedule('0 3 * * 0', async () => {
            try {
                console.log('🔄 Ejecutando sincronización masiva semanal...');
                
                // Sincronizar los próximos 30 días
                const startDate = new Date().toISOString();
                const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                
                const result = await bidirectionalSyncService.importFromGoogle(
                    startDate,
                    endDate,
                    {
                        autoMatch: true,
                        createMissingData: false,
                        dryRun: false
                    }
                );

                if (result.success) {
                    console.log(`✅ Sincronización masiva completada: ${result.results.created} citas creadas, ${result.results.updated} actualizadas`);
                    await this.logSyncActivity('weekly_full_sync', result.results);
                } else {
                    console.error('❌ Error en sincronización masiva:', result.error);
                    await this.logSyncActivity('weekly_sync_error', { error: result.error });
                }
                
            } catch (error) {
                console.error('❌ Error en sincronización masiva semanal:', error);
                await this.logSyncActivity('weekly_sync_error', { error: error.message });
            }
        }, {
            scheduled: false
        });

        this.jobs.set('weekly', weeklyJob);
        weeklyJob.start();
        
        console.log('📅 Sincronización masiva semanal programada los domingos a las 3 AM');
    }

    /**
     * Registrar actividad de sincronización
     */
    async logSyncActivity(action, data) {
        try {
            await query(`
                INSERT INTO audit.activity_log (
                    tabla_afectada,
                    accion,
                    datos_nuevos,
                    timestamp
                ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, ['google_calendar_sync', action, JSON.stringify(data)]);
            
        } catch (error) {
            console.error('Error registrando actividad de sync:', error);
        }
    }

    /**
     * Obtener estadísticas de sincronización
     */
    async getSyncStats() {
        try {
            const statsResult = await query(`
                SELECT 
                    accion,
                    COUNT(*) as total,
                    MAX(timestamp) as ultima_ejecucion
                FROM audit.activity_log 
                WHERE tabla_afectada = 'google_calendar_sync'
                AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY accion
                ORDER BY ultima_ejecucion DESC
            `);

            const recentErrorsResult = await query(`
                SELECT 
                    accion,
                    datos_nuevos,
                    timestamp
                FROM audit.activity_log 
                WHERE tabla_afectada = 'google_calendar_sync'
                AND accion LIKE '%error%'
                AND timestamp >= CURRENT_DATE - INTERVAL '3 days'
                ORDER BY timestamp DESC
                LIMIT 10
            `);

            return {
                success: true,
                stats: statsResult.rows,
                recent_errors: recentErrorsResult.rows,
                scheduler_status: {
                    is_running: this.isRunning,
                    jobs_count: this.jobs.size,
                    active_jobs: Array.from(this.jobs.keys())
                }
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas de sync:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Ejecutar sincronización manual
     */
    async runManualSync() {
        try {
            console.log('🔄 Ejecutando sincronización manual...');
            
            const result = await bidirectionalSyncService.syncChangesFromGoogle();
            
            if (result.success) {
                await this.logSyncActivity('manual_sync', result.results);
                console.log('✅ Sincronización manual completada');
            } else {
                await this.logSyncActivity('manual_sync_error', { error: result.error });
                console.error('❌ Error en sincronización manual:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Error ejecutando sincronización manual:', error);
            await this.logSyncActivity('manual_sync_error', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detener el scheduler
     */
    stop() {
        try {
            this.jobs.forEach((job, name) => {
                job.stop();
                console.log(`⏹️  Job '${name}' detenido`);
            });
            
            this.isRunning = false;
            console.log('⏹️  Scheduler de sincronización detenido');
            
        } catch (error) {
            console.error('❌ Error deteniendo scheduler:', error);
        }
    }

    /**
     * Reinicializar el scheduler (útil cuando se reconfigura Google Calendar)
     */
    async restart() {
        console.log('🔄 Reiniciando scheduler de sincronización...');
        this.stop();
        await this.initialize();
    }

    /**
     * Verificar estado del scheduler
     */
    getStatus() {
        return {
            is_running: this.isRunning,
            jobs_count: this.jobs.size,
            jobs: Array.from(this.jobs.keys()).map(name => ({
                name,
                running: this.jobs.get(name).running
            }))
        };
    }
}

export default new SyncScheduler();