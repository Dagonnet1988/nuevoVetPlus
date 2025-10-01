/**
 * @fileoverview Servicio para notificaciones automáticas de WhatsApp
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query } from '../config/database.js';
import whatsappService from './whatsappBaileysService.js';
import cron from 'node-cron';

/**
 * Servicio de notificaciones automáticas
 */
class AutoNotificationService {
    constructor() {
        this.isInitialized = false;
        this.scheduledJobs = new Map();
    }

    /**
     * Inicializar el servicio y tareas programadas
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Verificar si las notificaciones están habilitadas
            const config = await this.getNotificationConfig();
            if (!config.notificaciones_activas) {
                console.log('📵 Notificaciones automáticas deshabilitadas');
                return;
            }

            // Programar tareas cron
            await this.setupCronJobs();
            
            console.log('🔔 Servicio de notificaciones automáticas inicializado');
            this.isInitialized = true;
        } catch (error) {
            console.error('Error inicializando servicio de notificaciones:', error);
        }
    }

    /**
     * Obtener configuración de notificaciones desde la base de datos
     */
    async getNotificationConfig() {
        try {
            const result = await query(`
                SELECT 
                    notificaciones_activas,
                    notif_cita_confirmada,
                    notif_cita_recordatorio_24h,
                    notif_cita_recordatorio_2h,
                    notif_cita_completada,
                    notif_factura_automatica,
                    notif_seguimiento_medicamentos,
                    limite_diario_mensajes,
                    intervalo_minimo_minutos,
                    mensaje_cita_confirmada,
                    mensaje_recordatorio_24h,
                    mensaje_recordatorio_2h,
                    mensaje_cita_completada,
                    mensaje_seguimiento,
                    nombre_empresa
                FROM system.configuracion_empresa 
                WHERE activa = true
            `);

            return result.rows.length > 0 ? result.rows[0] : {
                notificaciones_activas: false,
                limite_diario_mensajes: 50,
                intervalo_minimo_minutos: 5
            };
        } catch (error) {
            console.error('Error obteniendo configuración de notificaciones:', error);
            return { notificaciones_activas: false };
        }
    }

    /**
     * Verificar si se puede enviar mensaje (límites diarios)
     */
    async canSendMessage() {
        try {
            const result = await query('SELECT check_daily_message_limit() as can_send');
            return result.rows[0]?.can_send === true;
        } catch (error) {
            console.error('Error verificando límite de mensajes:', error);
            return false;
        }
    }

    /**
     * Configurar tareas programadas (cron jobs)
     */
    async setupCronJobs() {
        // Recordatorios de 24 horas - ejecutar cada hora
        const job24h = cron.schedule('0 * * * *', async () => {
            await this.processScheduledNotifications('recordatorio_24h');
        }, { scheduled: false });

        // Recordatorios de 2 horas - ejecutar cada 30 minutos
        const job2h = cron.schedule('*/30 * * * *', async () => {
            await this.processScheduledNotifications('recordatorio_2h');
        }, { scheduled: false });

        // Procesador general de notificaciones programadas - cada 15 minutos
        const jobGeneral = cron.schedule('*/15 * * * *', async () => {
            await this.processScheduledNotifications();
        }, { scheduled: false });

        // Cleanup de notificaciones antiguas - diario a las 2 AM
        const jobCleanup = cron.schedule('0 2 * * *', async () => {
            await this.cleanupOldNotifications();
        }, { scheduled: false });

        // Iniciar trabajos
        job24h.start();
        job2h.start();
        jobGeneral.start();
        jobCleanup.start();

        this.scheduledJobs.set('24h', job24h);
        this.scheduledJobs.set('2h', job2h);
        this.scheduledJobs.set('general', jobGeneral);
        this.scheduledJobs.set('cleanup', jobCleanup);

        console.log('📅 Tareas programadas de notificaciones configuradas');
    }

    /**
     * Programar notificación de confirmación de cita
     */
    async scheduleAppointmentConfirmation(appointmentData) {
        try {
            const config = await this.getNotificationConfig();
            if (!config.notificaciones_activas || !config.notif_cita_confirmada) {
                return { success: false, reason: 'Notificación de confirmación deshabilitada' };
            }

            const mensaje = this.formatMessage(config.mensaje_cita_confirmada, {
                cliente_nombre: appointmentData.cliente_nombre,
                mascota_nombre: appointmentData.mascota_nombre,
                fecha: new Date(appointmentData.fecha_inicio).toLocaleDateString('es-ES'),
                hora: new Date(appointmentData.fecha_inicio).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', minute: '2-digit' 
                }),
                empresa: config.nombre_empresa
            });

            // Enviar inmediatamente
            if (await this.canSendMessage() && whatsappService.isReady()) {
                const result = await whatsappService.sendTextMessage(
                    appointmentData.cliente_telefono,
                    mensaje,
                    'confirmacion'
                );
                
                await this.logNotification('confirmacion_cita', appointmentData.id_cita, 
                    appointmentData.cliente_telefono, mensaje, true);
                
                return { success: true, sent_immediately: true };
            }

            return { success: false, reason: 'WhatsApp no disponible o límite alcanzado' };
        } catch (error) {
            console.error('Error programando confirmación de cita:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Programar recordatorios de cita
     */
    async scheduleAppointmentReminders(appointmentData) {
        try {
            const config = await this.getNotificationConfig();
            if (!config.notificaciones_activas) return;

            const appointmentDate = new Date(appointmentData.fecha_inicio);
            
            // Recordatorio 24 horas antes
            if (config.notif_cita_recordatorio_24h) {
                const reminder24h = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));
                if (reminder24h > new Date()) {
                    await this.insertScheduledNotification(
                        'recordatorio_24h',
                        appointmentData.id_cita,
                        null,
                        appointmentData.cliente_telefono,
                        config.mensaje_recordatorio_24h,
                        reminder24h,
                        appointmentData
                    );
                }
            }

            // Recordatorio 2 horas antes
            if (config.notif_cita_recordatorio_2h) {
                const reminder2h = new Date(appointmentDate.getTime() - (2 * 60 * 60 * 1000));
                if (reminder2h > new Date()) {
                    await this.insertScheduledNotification(
                        'recordatorio_2h',
                        appointmentData.id_cita,
                        null,
                        appointmentData.cliente_telefono,
                        config.mensaje_recordatorio_2h,
                        reminder2h,
                        appointmentData
                    );
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error programando recordatorios:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Programar notificación de cita completada con factura
     */
    async scheduleCompletedAppointmentNotification(appointmentData, consultationData, invoiceData) {
        try {
            const config = await this.getNotificationConfig();
            if (!config.notificaciones_activas || !config.notif_cita_completada) return;

            const mensaje = this.formatMessage(config.mensaje_cita_completada, {
                cliente_nombre: appointmentData.cliente_nombre,
                mascota_nombre: appointmentData.mascota_nombre,
                empresa: config.nombre_empresa,
                diagnostico: consultationData?.diagnostico || 'Consulta general',
                total_factura: invoiceData?.total || '0'
            });

            // Programar para envío en los próximos 5 minutos
            const sendTime = new Date(Date.now() + (5 * 60 * 1000));

            await this.insertScheduledNotification(
                'cita_completada',
                appointmentData.id_cita,
                consultationData?.id_consulta,
                appointmentData.cliente_telefono,
                mensaje,
                sendTime,
                { ...appointmentData, consultation: consultationData, invoice: invoiceData }
            );

            return { success: true };
        } catch (error) {
            console.error('Error programando notificación de cita completada:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Insertar notificación programada en la base de datos
     */
    async insertScheduledNotification(tipo, idCita, idConsulta, telefono, mensajeTemplate, fechaProgramada, data) {
        try {
            const mensaje = this.formatMessage(mensajeTemplate, data);
            
            await query(`
                INSERT INTO system.notificaciones_programadas 
                (tipo_notificacion, id_cita, id_consulta, numero_telefono, mensaje, fecha_programada)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [tipo, idCita, idConsulta, telefono, mensaje, fechaProgramada]);
            
            console.log(`📬 Notificación ${tipo} programada para ${fechaProgramada.toLocaleString('es-ES')}`);
        } catch (error) {
            console.error('Error insertando notificación programada:', error);
        }
    }

    /**
     * Procesar notificaciones programadas pendientes
     */
    async processScheduledNotifications(tipoFiltro = null) {
        try {
            const config = await this.getNotificationConfig();
            if (!config.notificaciones_activas) return;

            let whereClause = 'WHERE enviado = false AND fecha_programada <= CURRENT_TIMESTAMP';
            const params = [];

            if (tipoFiltro) {
                whereClause += ' AND tipo_notificacion = $1';
                params.push(tipoFiltro);
            }

            const result = await query(`
                SELECT * FROM system.notificaciones_programadas
                ${whereClause}
                ORDER BY fecha_programada ASC
                LIMIT 10
            `, params);

            for (const notification of result.rows) {
                await this.sendScheduledNotification(notification);
                
                // Esperar intervalo mínimo entre mensajes
                await this.sleep(config.intervalo_minimo_minutos * 60 * 1000);
            }
        } catch (error) {
            console.error('Error procesando notificaciones programadas:', error);
        }
    }

    /**
     * Enviar notificación programada individual
     */
    async sendScheduledNotification(notification) {
        try {
            if (!await this.canSendMessage() || !whatsappService.isReady()) {
                console.log(`⏸️  Aplazando notificación ${notification.id_notificacion} - límite alcanzado o WhatsApp no disponible`);
                return;
            }

            const result = await whatsappService.sendTextMessage(
                notification.numero_telefono,
                notification.mensaje,
                notification.tipo_notificacion || 'manual'
            );

            // Marcar como enviada
            await query(`
                UPDATE system.notificaciones_programadas 
                SET enviado = true, fecha_envio = CURRENT_TIMESTAMP, intentos = intentos + 1
                WHERE id_notificacion = $1
            `, [notification.id_notificacion]);

            console.log(`✅ Notificación ${notification.tipo_notificacion} enviada a ${notification.numero_telefono}`);

        } catch (error) {
            // Registrar error e incrementar intentos
            await query(`
                UPDATE system.notificaciones_programadas 
                SET error_envio = $1, intentos = intentos + 1
                WHERE id_notificacion = $2
            `, [error.message, notification.id_notificacion]);

            console.error(`❌ Error enviando notificación ${notification.id_notificacion}:`, error);
        }
    }

    /**
     * Formatear mensaje con variables
     */
    formatMessage(template, variables) {
        let message = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            message = message.replace(regex, variables[key] || '');
        });
        return message;
    }

    /**
     * Registrar notificación enviada
     */
    async logNotification(tipo, idCita, telefono, mensaje, exitoso) {
        try {
            await query(`
                INSERT INTO system.whatsapp_log 
                (numero_destino, tipo_mensaje, contenido, estado, tipo_documento, documento_id)
                VALUES ($1, 'text', $2, $3, $4, $5)
            `, [
                telefono, 
                mensaje, 
                exitoso ? 'sent' : 'failed',
                tipo,
                idCita
            ]);
        } catch (error) {
            console.error('Error registrando notificación:', error);
        }
    }

    /**
     * Limpiar notificaciones antiguas
     */
    async cleanupOldNotifications() {
        try {
            const result = await query(`
                DELETE FROM system.notificaciones_programadas 
                WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
                AND (enviado = true OR intentos >= 3)
            `);

            console.log(`🧹 Limpieza: ${result.rowCount} notificaciones antiguas eliminadas`);
        } catch (error) {
            console.error('Error en limpieza de notificaciones:', error);
        }
    }

    /**
     * Detener todas las tareas programadas
     */
    stopAllJobs() {
        this.scheduledJobs.forEach((job, name) => {
            job.stop();
            console.log(`⏹️  Tarea ${name} detenida`);
        });
        this.scheduledJobs.clear();
        this.isInitialized = false;
    }

    /**
     * Actualizar configuración y reiniciar si es necesario
     */
    async updateConfiguration() {
        const config = await this.getNotificationConfig();
        
        if (!config.notificaciones_activas && this.isInitialized) {
            console.log('📵 Deshabilitando notificaciones automáticas');
            this.stopAllJobs();
        } else if (config.notificaciones_activas && !this.isInitialized) {
            console.log('🔔 Habilitando notificaciones automáticas');
            await this.initialize();
        }
    }

    /**
     * Función auxiliar para esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar instancia singleton
const autoNotificationService = new AutoNotificationService();
export default autoNotificationService;
