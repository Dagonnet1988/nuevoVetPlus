import cron from 'node-cron';
import bidirectionalSyncService from './bidirectionalSyncService.js';
import googleCalendarService from './googleCalendar.js';
import { query } from '../config/database.js';

class SyncScheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
        this.lastAutoSyncAt = null;
    }

    async getRuntimeSyncConfig() {
        try {
            const result = await query(`
                SELECT
                    notification_email AS sync_automatico,
                    default_reminder_minutes AS intervalo_sync
                FROM vetplus_auth.google_calendar_config
                WHERE is_active = true
                ORDER BY created_at DESC
                LIMIT 1
            `);

            const row = result.rows[0];
            if (!row) {
                return {
                    syncAutomatico: false,
                    intervalMinutes: 30
                };
            }

            const intervalMinutes = Number.isFinite(Number(row.intervalo_sync))
                ? Math.max(5, Number(row.intervalo_sync))
                : 30;

            return {
                syncAutomatico: row.sync_automatico === true,
                intervalMinutes
            };
        } catch (error) {
            console.error('❌ Error obteniendo configuración runtime del scheduler:', error);
            return {
                syncAutomatico: true,
                intervalMinutes: 30
            };
        }
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

            // Programar sincronización automática con intervalo dinámico (runtime)
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
        // Verificar cada minuto y ejecutar según la configuración runtime
        const syncJob = cron.schedule('* * * * *', async () => {
            try {
                const { syncAutomatico, intervalMinutes } = await this.getRuntimeSyncConfig();

                if (!syncAutomatico) {
                    return;
                }

                if (this.lastAutoSyncAt) {
                    const elapsedMs = Date.now() - this.lastAutoSyncAt.getTime();
                    if (elapsedMs < intervalMinutes * 60 * 1000) {
                        return;
                    }
                }

                const result = await bidirectionalSyncService.syncChangesFromGoogle({ onlyToday: true });

                this.lastAutoSyncAt = new Date();
                
                if (result.success) {
                    // Registrar estadísticas y log solo cuando hubo cambios
                    if (result.results.total_changes > 0) {
                        console.log(`✅ Sincronización automática: ${result.results.total_changes} cambios procesados`);
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
        
        console.log('📅 Sincronización automática programada con intervalo dinámico');
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
                    DELETE FROM system.activity_log
                    WHERE tipo_actividad = 'SYNC_CALENDAR'
                    AND created_at < CURRENT_DATE - INTERVAL '30 days'
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
                INSERT INTO system.activity_log (
                    id_log,
                    tipo_actividad,
                    descripcion,
                    url,
                    metodo_http,
                    status_code,
                    duracion_ms,
                    request_data,
                    response_data
                ) VALUES (
                    uuid_generate_v4(),
                    'SYNC_CALENDAR',
                    $1,
                    '/system/google-calendar/scheduler',
                    'SYSTEM',
                    200,
                    0,
                    $2,
                    $3
                )
            `, [
                `google_calendar_sync:${action}`,
                JSON.stringify({ action }),
                JSON.stringify(data)
            ]);
            
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
                    split_part(descripcion, ':', 2) as accion,
                    COUNT(*) as total,
                    MAX(created_at) as ultima_ejecucion
                FROM system.activity_log
                WHERE tipo_actividad = 'SYNC_CALENDAR'
                AND created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY split_part(descripcion, ':', 2)
                ORDER BY ultima_ejecucion DESC
            `);

            const recentErrorsResult = await query(`
                SELECT 
                    split_part(descripcion, ':', 2) as accion,
                    response_data as datos_nuevos,
                    created_at as timestamp
                FROM system.activity_log
                WHERE tipo_actividad = 'SYNC_CALENDAR'
                AND descripcion ILIKE '%error%'
                AND created_at >= CURRENT_DATE - INTERVAL '3 days'
                ORDER BY created_at DESC
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
            
            const result = await bidirectionalSyncService.syncChangesFromGoogle({ onlyToday: true });
            
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