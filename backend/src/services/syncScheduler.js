import cron from 'node-cron';
import bidirectionalSyncService from './bidirectionalSyncService.js';
import googleCalendarService from './googleCalendar.js';
import { query } from '../config/database.js';
import { sendEmail } from './emailService.js';
import { renderEmailTemplate } from './emailTemplateService.js';
import { syncPendingOutboundAppointments } from '../controllers/appointmentController.js';

class SyncScheduler {
    constructor() {
        this.jobs = new Map();
        this.lastOutboundSyncAt = null;
        this.isRunning = false;
        this.lastAutoSyncAt = null;
        this.lastReconcileAt = null;
        this.consecutiveSyncFailures = 0;
        this.lastSyncAlertAt = null;
    }

    /**
     * Alerta por correo cuando la sincronización con Google falla. Destinatario en
     * SYNC_ALERT_EMAIL (sin esa variable no se envía nada). Si Google pide reconectar
     * se avisa de inmediato; si no, tras 3 fallos seguidos. Máximo una alerta cada 6 h.
     */
    async registerSyncFailure(errorText, { requiresReauth = false } = {}) {
        this.consecutiveSyncFailures++;
        const threshold = requiresReauth ? 1 : 3;
        if (this.consecutiveSyncFailures < threshold) return;

        const to = String(process.env.SYNC_ALERT_EMAIL || '').trim();
        if (!to) return;

        const cooldownMs = 6 * 60 * 60 * 1000;
        if (this.lastSyncAlertAt && Date.now() - this.lastSyncAlertAt.getTime() < cooldownMs) return;

        try {
            const tenantId = await bidirectionalSyncService.resolveActiveTenantId();
            const safeError = String(errorText || 'sin detalle')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 500);
            const hora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
            const accion = requiresReauth
                ? 'Google pidió volver a autorizar la conexión: reconectar en Configuración → Google Calendar.'
                : 'Revisar la pestaña Sincronización de Auditoría y los logs del servidor.';

            await sendEmail({
                tenantId,
                to,
                subject: '[Ramelo] Falla en la sincronización con Google Calendar',
                html: `<p>La sincronización automática con Google Calendar falló (${this.consecutiveSyncFailures} intento(s) seguidos).</p>
<p><strong>Detalle:</strong> ${safeError}</p>
<p><strong>Qué hacer:</strong> ${accion}</p>
<p>Hora (Bogotá): ${hora}</p>`,
                text: `La sincronización con Google Calendar falló (${this.consecutiveSyncFailures} intentos seguidos). Detalle: ${safeError}. ${accion} Hora (Bogotá): ${hora}`,
                logContext: { tipo_envio: 'alerta_sincronizacion' }
            });
            this.lastSyncAlertAt = new Date();
            console.warn(`📧 Alerta de falla de sincronización enviada a ${to}`);
        } catch (alertError) {
            console.warn('⚠️ No se pudo enviar la alerta de sincronización:', alertError.message);
        }
    }

    /** Verificación de existencia de eventos, como máximo una vez por hora. */
    async maybeReconcileEvents() {
        const oneHourMs = 60 * 60 * 1000;
        if (this.lastReconcileAt && Date.now() - this.lastReconcileAt.getTime() < oneHourMs) return;
        this.lastReconcileAt = new Date();
        try {
            const summary = await bidirectionalSyncService.reconcileExistingEvents({ origen: 'automatica' });
            if (summary.cancelled > 0 || summary.errors > 0) {
                console.log(`🔎 Verificación de eventos: ${summary.checked} revisados, ${summary.cancelled} cancelados, ${summary.errors} con error`);
            }
        } catch (error) {
            console.warn('⚠️ Error en verificación de eventos:', error.message);
        }
    }

    getBogotaDateString(date = new Date()) {
        return new Date(date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    }

    addDays(baseDate, days) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + days);
        return date;
    }

    getSyncWindow() {
        const lookbackDaysRaw = Number(process.env.GOOGLE_SYNC_LOOKBACK_DAYS ?? 7);
        const lookaheadDaysRaw = Number(process.env.GOOGLE_SYNC_LOOKAHEAD_DAYS ?? 30);

        const lookbackDays = Number.isFinite(lookbackDaysRaw) ? Math.max(0, lookbackDaysRaw) : 7;
        const lookaheadDays = Number.isFinite(lookaheadDaysRaw) ? Math.max(0, lookaheadDaysRaw) : 30;

        const now = new Date();
        const startDate = this.getBogotaDateString(this.addDays(now, -lookbackDays));
        const endDate = this.getBogotaDateString(this.addDays(now, lookaheadDays));

        return {
            lookbackDays,
            lookaheadDays,
            startDate,
            endDate
        };
    }

    async getClinicName(tenantId) {
        try {
            const result = await query(
                `SELECT nombre_empresa
                 FROM system.configuracion_empresa
                 WHERE activa = true
                   AND id_tenant = $1
                 ORDER BY updated_at DESC NULLS LAST, created_at DESC
                 LIMIT 1`,
                [tenantId]
            );
            return result.rows[0]?.nombre_empresa || 'Ramelo Clínica';
        } catch {
            return 'Ramelo Clínica';
        }
    }

    formatDateTimeForEmail(value) {
        if (!value) return '';
        const raw = String(value).trim();
        const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

        if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
            const year = Number(localMatch[1]);
            const monthIndex = Number(localMatch[2]) - 1;
            const day = Number(localMatch[3]);
            const hour24 = Number(localMatch[4]);
            const minute = Number(localMatch[5]);

            const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
            const displayHour = hour24 % 12 || 12;
            const ampm = hour24 < 12 ? 'a. m.' : 'p. m.';

            return `${weekdayNames[weekdayIndex].charAt(0).toUpperCase() + weekdayNames[weekdayIndex].slice(1)} ${String(day).padStart(2, '0')} de ${monthNames[monthIndex]} de ${year} a las ${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
        }

        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return raw;

        return d.toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    async getRuntimeSyncConfig() {
        try {
            const result = await query(`
                SELECT
                    sync_automatico,
                    sync_interval_minutes AS intervalo_sync
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

    async handleGoogleReauthRequired(source = 'unknown') {
        try {
            const disconnectResult = await query(`
                UPDATE vetplus_auth.google_calendar_config
                SET
                    access_token = NULL,
                    refresh_token = NULL,
                    token_expiry = NULL,
                    notification_email = false,
                    webhook_channel_id = NULL,
                    webhook_url = NULL,
                    webhook_expiration = NULL,
                    webhook_resource_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_active = true
            `);

            if (disconnectResult.rowCount > 0) {
                // Limpiar estado en memoria para evitar nuevos intentos con tokens obsoletos.
                googleCalendarService.config = null;
                googleCalendarService.auth = null;
                googleCalendarService.calendar = null;

                await this.logSyncActivity('google_auto_disconnected', {
                    source,
                    reason: 'requires_reauth'
                });

                console.warn(`⚠️ Google Calendar desconectado automáticamente por requires_reauth (source=${source})`);
            }
        } catch (disconnectError) {
            console.error('❌ Error desconectando Google Calendar tras requires_reauth:', disconnectError);
        }
    }

    /**
     * Inicializar el scheduler de sincronización
     */
    async initialize() {
        try {
            console.log('🔄 Inicializando scheduler de sincronización Google Calendar...');

            // Recordatorios por correo independientes de Google Calendar.
            this.scheduleAppointmentReminders();
            
            // Verificar si Google Calendar está configurado
            if (!await googleCalendarService.hasValidTokens()) {
                console.log('⏸️  Google Calendar no configurado - scheduler en espera');
                this.scheduleLogCleanup();
                this.isRunning = true;
                return;
            }

            // Programar sincronización automática con intervalo dinámico (runtime)
            this.scheduleSync();

            // Programar sincronización saliente automática (VetPlus -> Google),
            // para que el reintento de pending/failed/disabled no dependa de
            // que alguien note el problema y apriete el botón manual.
            this.scheduleOutboundSync();

            // Programar limpieza de logs cada día a las 2 AM
            this.scheduleLogCleanup();
            
            this.isRunning = true;
            console.log('✅ Scheduler de sincronización iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando scheduler de sincronización:', error);
        }
    }

    scheduleAppointmentReminders() {
        const reminderJob = cron.schedule('*/5 * * * *', async () => {
            try {
                const reminders = await query(
                    `SELECT c.id_cita,
                            c.id_tenant,
                            c.codigo_cita,
                            TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_inicio,
                            c.id_mascota,
                            cl.nombre AS cliente_nombre,
                            cl.email AS cliente_email,
                            m.nombre AS mascota_nombre
                     FROM clinical.calendario_citas c
                     JOIN clinical.mascotas m ON m.id_mascota = c.id_mascota
                     JOIN clinical.clientes cl ON cl.id_cliente = m.id_cliente
                     WHERE c.estado = 'confirmada'
                       AND COALESCE(c.recordatorio_enviado, false) = false
                       AND cl.email IS NOT NULL
                       AND btrim(cl.email) <> ''
                       AND c.fecha_inicio >= (NOW() + INTERVAL '55 minutes')
                       AND c.fecha_inicio <= (NOW() + INTERVAL '65 minutes')
                     ORDER BY c.fecha_inicio ASC`
                );

                for (const row of reminders.rows) {
                    try {
                        const clinicaNombre = await this.getClinicName(row.id_tenant);
                        const rendered = await renderEmailTemplate({
                            tenantId: row.id_tenant,
                            key: 'recordatorio_cita_1h',
                            variables: {
                                cliente_nombre: row.cliente_nombre || 'cliente',
                                mascota_nombre: row.mascota_nombre || 'mascota',
                                fecha_hora: this.formatDateTimeForEmail(row.fecha_inicio),
                                clinica_nombre: clinicaNombre
                            }
                        });

                        if (!rendered) {
                            continue;
                        }

                        await sendEmail({
                            tenantId: row.id_tenant,
                            to: row.cliente_email,
                            subject: rendered.asunto_render,
                            html: rendered.cuerpo_html_render,
                            text: rendered.cuerpo_text_render || undefined,
                            logContext: {
                                tipo_envio: 'recordatorio_cita_1h',
                                metadata: {
                                    id_cita: row.id_cita,
                                    codigo_cita: row.codigo_cita
                                }
                            }
                        });

                        // Sin tocar updated_at: marcar el recordatorio no es una edición de la cita.
                        // Antes lo actualizaba, y eso hacía ver la cita como "editada en Ramelo sin
                        // sincronizar" y marcaba conflicto cuando Google informaba un cambio.
                        await query(
                            `UPDATE clinical.calendario_citas
                             SET recordatorio_enviado = true,
                                 fecha_recordatorio = NOW()
                             WHERE id_cita = $1`,
                            [row.id_cita]
                        );
                    } catch (rowError) {
                        console.error(`❌ Error enviando recordatorio de cita ${row.id_cita}:`, rowError.message);
                    }
                }
            } catch (error) {
                console.error('❌ Error en tarea de recordatorios por correo:', error);
            }
        }, {
            scheduled: false
        });

        this.jobs.set('email_reminders', reminderJob);
        reminderJob.start();

        console.log('📬 Recordatorios por correo programados cada 5 minutos');
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

                const syncWindow = this.getSyncWindow();
                const result = await bidirectionalSyncService.syncChangesFromGoogle({
                    onlyToday: false,
                    startDate: syncWindow.startDate,
                    endDate: syncWindow.endDate
                });

                this.lastAutoSyncAt = new Date();
                
                if (result.success) {
                    this.consecutiveSyncFailures = 0;
                    await this.maybeReconcileEvents();
                    // Registrar estadísticas y log solo cuando hubo cambios
                    if (result.results.total_changes > 0) {
                        console.log(
                            `✅ Sincronización automática: ${result.results.total_changes} cambios procesados ` +
                            `(rango ${syncWindow.startDate} -> ${syncWindow.endDate})`
                        );
                        await this.logSyncActivity('auto_sync', result.results);
                    }
                } else {
                    console.error('❌ Error en sincronización automática:', result.error);
                    await this.registerSyncFailure(result.error, { requiresReauth: result.requires_reauth === true });
                    if (result.requires_reauth === true) {
                        await this.handleGoogleReauthRequired('auto_sync');
                    }
                    await this.logSyncActivity('auto_sync_error', {
                        error: result.error,
                        code: result.code || null,
                        requires_reauth: result.requires_reauth === true
                    });
                }
                
            } catch (error) {
                console.error('❌ Error en tarea de sincronización automática:', error);
                await this.registerSyncFailure(error.message);
                await this.logSyncActivity('auto_sync_error', { error: error.message });
            }
        }, {
            scheduled: false // No iniciar automáticamente
        });

        this.jobs.set('sync', syncJob);
        syncJob.start();

        const syncWindow = this.getSyncWindow();
        console.log(
            `📅 Sincronización automática programada con intervalo dinámico ` +
            `(ventana ${syncWindow.lookbackDays}d atrás / ${syncWindow.lookaheadDays}d adelante)`
        );
    }

    /**
     * Programar sincronización saliente automática (VetPlus -> Google).
     * Reutiliza el mismo toggle/intervalo que la entrante (sync_automatico /
     * sync_interval_minutes) para que "sincronización automática" signifique
     * ambos sentidos, no solo el de lectura. Si GOOGLE_SYNC_OUTBOUND_ENABLED
     * está en false, syncPendingOutboundAppointments() no hace nada (skipped).
     */
    scheduleOutboundSync() {
        const outboundJob = cron.schedule('* * * * *', async () => {
            try {
                const { syncAutomatico, intervalMinutes } = await this.getRuntimeSyncConfig();

                if (!syncAutomatico) {
                    return;
                }

                if (this.lastOutboundSyncAt) {
                    const elapsedMs = Date.now() - this.lastOutboundSyncAt.getTime();
                    if (elapsedMs < intervalMinutes * 60 * 1000) {
                        return;
                    }
                }

                const result = await syncPendingOutboundAppointments();
                this.lastOutboundSyncAt = new Date();

                if (result.skipped) {
                    return;
                }

                if (result.total > 0) {
                    console.log(
                        `✅ Sincronización saliente automática: ${result.synced}/${result.total} ` +
                        `citas enviadas a Google (${result.failed} fallidas)`
                    );
                    await this.logSyncActivity('auto_sync_outbound', result);
                }

            } catch (error) {
                console.error('❌ Error en sincronización saliente automática:', error);
                await this.logSyncActivity('auto_sync_outbound_error', { error: error.message });
            }
        }, {
            scheduled: false
        });

        this.jobs.set('syncOutbound', outboundJob);
        outboundJob.start();

        console.log('📤 Sincronización saliente automática programada con el mismo intervalo dinámico');
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

                // Historial de sincronización Ramelo <-> Google: se conserva 90 días.
                try {
                    const syncCleanup = await query(`
                        DELETE FROM system.sync_audit_log
                        WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
                    `);
                    console.log(`🧹 sync_audit_log: ${syncCleanup.rowCount} registros eliminados`);
                } catch (syncCleanupError) {
                    console.warn('⚠️ No se pudo limpiar sync_audit_log:', syncCleanupError.message);
                }

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
                        dryRun: false,
                        origen: 'automatica'
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
    async getSyncStats(tenantId) {
        try {
            const res = await query(`
                SELECT accion, exito, COUNT(*)::int AS total, MAX(created_at) AS ultima
                FROM system.sync_audit_log
                WHERE id_tenant = $1
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY accion, exito
            `, [tenantId]);

            const sum = (fn) => res.rows.filter(fn).reduce((acc, r) => acc + r.total, 0);
            const ultima = res.rows.reduce((max, r) => (!max || r.ultima > max ? r.ultima : max), null);

            return {
                total_eventos: sum(r => r.exito && ['created', 'updated', 'deleted'].includes(r.accion)),
                eventos_creados: sum(r => r.exito && r.accion === 'created'),
                eventos_actualizados: sum(r => r.exito && r.accion === 'updated'),
                eventos_eliminados: sum(r => r.exito && r.accion === 'deleted'),
                conflictos_resueltos: sum(r => r.accion === 'conflict'),
                errores: sum(r => !r.exito || r.accion === 'error'),
                ultima_ejecucion: ultima,
                proxima_ejecucion: null,
                scheduler_status: {
                    is_running: this.isRunning,
                    jobs_count: this.jobs.size
                }
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas de sync:', error);
            throw error;
        }
    }

    /**
     * Ejecutar sincronización manual
     */
    async runManualSync() {
        try {
            console.log('🔄 Ejecutando sincronización manual...');
            const syncWindow = this.getSyncWindow();

            const result = await bidirectionalSyncService.syncChangesFromGoogle({
                onlyToday: false,
                startDate: syncWindow.startDate,
                endDate: syncWindow.endDate
            });
            
            if (result.success) {
                await this.logSyncActivity('manual_sync', result.results);
                console.log(
                    `✅ Sincronización manual completada (rango ${syncWindow.startDate} -> ${syncWindow.endDate})`
                );
            } else {
                if (result.requires_reauth === true) {
                    await this.handleGoogleReauthRequired('manual_sync');
                }
                await this.logSyncActivity('manual_sync_error', {
                    error: result.error,
                    code: result.code || null,
                    requires_reauth: result.requires_reauth === true
                });
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