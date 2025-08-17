import { query } from '../config/database.js';
import { WhatsAppBaileysService } from './whatsappBaileysService.js';
import { WhatsAppService } from './whatsappService.js';
import cron from 'node-cron';

/**
 * Servicio de Notificaciones Automáticas
 */
class NotificationService {
    constructor() {
        this.whatsappService = new WhatsAppBaileysService();
        this.whatsappBusinessService = new WhatsAppService();
        this.isInitialized = false;
    }

    /**
     * Inicializar servicios de notificación
     */
    async initialize() {
        try {
            // Configurar trabajos programados (cron jobs)
            this.setupCronJobs();
            this.isInitialized = true;
            console.log('✅ Servicio de notificaciones inicializado');
        } catch (error) {
            console.error('❌ Error inicializando servicio de notificaciones:', error);
        }
    }

    /**
     * Configurar trabajos programados
     */
    setupCronJobs() {
        // 🔔 RECORDATORIOS DE CITAS (cada hora en horario laboral)
        cron.schedule('0 8-18 * * *', async () => {
            await this.sendAppointmentReminders();
        });

        // 📧 ENVÍO DE FACTURAS PENDIENTES (cada 2 horas)
        cron.schedule('0 */2 * * *', async () => {
            await this.sendPendingInvoices();
        });

        // 💊 RECORDATORIOS DE MEDICAMENTOS (todos los días a las 9 AM)
        cron.schedule('0 9 * * *', async () => {
            await this.sendMedicationReminders();
        });

        console.log('📅 Trabajos programados configurados correctamente');
    }

    /**
     * Enviar recordatorios de citas (24h antes)
     */
    async sendAppointmentReminders() {
        try {
            console.log('🔔 Ejecutando recordatorios de citas...');

            // Obtener citas para mañana
            const citasManana = await query(`
                SELECT 
                    c.id_cita,
                    c.codigo_cita,
                    c.fecha_inicio,
                    c.tipo,
                    c.motivo,
                    m.nombre as mascota_nombre,
                    m.especie,
                    cl.nombre as cliente_nombre,
                    cl.telefono as cliente_telefono,
                    cl.email as cliente_email,
                    v.nombre as veterinario_nombre
                FROM clinical.calendario_citas c
                JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
                JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                JOIN auth.usuarios v ON c.id_veterinario = v.id_usuario
                WHERE 
                    DATE(c.fecha_inicio) = CURRENT_DATE + INTERVAL '1 day'
                    AND c.estado IN ('pendiente', 'confirmada')
                    AND cl.telefono IS NOT NULL
                    AND c.recordatorio_enviado = false
            `);

            console.log(`📋 Encontradas ${citasManana.rows.length} citas para recordar`);

            for (const cita of citasManana.rows) {
                try {
                    const fechaCita = new Date(cita.fecha_inicio).toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const mensaje = `
🏥 *VetPlus - Recordatorio de Cita*

Hola ${cita.cliente_nombre}, te recordamos que tienes una cita programada para:

🐕 *Mascota:* ${cita.mascota_nombre}
📅 *Fecha:* ${fechaCita}
👨‍⚕️ *Veterinario:* ${cita.veterinario_nombre}
📋 *Tipo:* ${cita.tipo}
📝 *Motivo:* ${cita.motivo || 'Consulta general'}

📍 *Código de cita:* ${cita.codigo_cita}

Por favor confirma tu asistencia respondiendo a este mensaje.

¡Te esperamos! 🐾
                    `.trim();

                    // Intentar enviar por WhatsApp
                    let sent = false;
                    try {
                        await this.whatsappService.sendTextMessage(cita.cliente_telefono, mensaje);
                        sent = true;
                        console.log(`✅ Recordatorio enviado a ${cita.cliente_nombre} - ${cita.cliente_telefono}`);
                    } catch (error) {
                        console.log(`⚠️ Error con WhatsApp Baileys, intentando con Business API...`);
                        try {
                            await this.whatsappBusinessService.sendTextMessage(cita.cliente_telefono, mensaje);
                            sent = true;
                            console.log(`✅ Recordatorio enviado via Business API a ${cita.cliente_nombre}`);
                        } catch (businessError) {
                            console.error(`❌ Error enviando recordatorio a ${cita.cliente_nombre}:`, businessError);
                        }
                    }

                    if (sent) {
                        // Marcar como enviado
                        await query(`
                            UPDATE clinical.calendario_citas 
                            SET recordatorio_enviado = true, fecha_recordatorio = CURRENT_TIMESTAMP
                            WHERE id_cita = $1
                        `, [cita.id_cita]);
                    }

                } catch (error) {
                    console.error(`❌ Error procesando recordatorio para cita ${cita.codigo_cita}:`, error);
                }

                // Pequeña pausa entre envíos para evitar spam
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log(`✅ Proceso de recordatorios completado`);

        } catch (error) {
            console.error('❌ Error enviando recordatorios de citas:', error);
        }
    }

    /**
     * Enviar facturas pendientes por WhatsApp
     */
    async sendPendingInvoices() {
        try {
            console.log('💰 Enviando facturas pendientes...');

            // Obtener facturas completadas sin enviar
            const facturasPendientes = await query(`
                SELECT 
                    f.id_factura,
                    f.codigo_factura,
                    f.total,
                    f.fecha,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    c.email as cliente_email
                FROM financial.facturas_venta f
                JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
                WHERE 
                    f.estado = 'Pagada'
                    AND f.whatsapp_enviado = false
                    AND c.telefono IS NOT NULL
                    AND f.created_at >= CURRENT_TIMESTAMP - INTERVAL '2 hours'
                LIMIT 10
            `);

            console.log(`📋 Encontradas ${facturasPendientes.rows.length} facturas para enviar`);

            for (const factura of facturasPendientes.rows) {
                try {
                    // Usar el servicio existente de WhatsApp para facturas
                    await this.whatsappBusinessService.sendFactura(
                        factura.id_factura,
                        factura.cliente_telefono,
                        factura.cliente_nombre
                    );

                    console.log(`✅ Factura ${factura.codigo_factura} enviada a ${factura.cliente_nombre}`);

                    // Pequeña pausa entre envíos
                    await new Promise(resolve => setTimeout(resolve, 3000));

                } catch (error) {
                    console.error(`❌ Error enviando factura ${factura.codigo_factura}:`, error);
                }
            }

        } catch (error) {
            console.error('❌ Error enviando facturas pendientes:', error);
        }
    }

    /**
     * Enviar recordatorios de medicamentos
     */
    async sendMedicationReminders() {
        try {
            console.log('💊 Enviando recordatorios de medicamentos...');

            // Obtener consultas recientes con medicamentos
            const consultasConMedicamentos = await query(`
                SELECT 
                    cc.id_consulta,
                    cc.medicamentos,
                    cc.fecha,
                    m.nombre as mascota_nombre,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    v.nombre as veterinario_nombre
                FROM clinical.consultas_clinicas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
                JOIN auth.usuarios v ON cc.id_veterinario = v.id_usuario
                WHERE 
                    cc.estado = 'completada'
                    AND cc.medicamentos IS NOT NULL
                    AND cc.medicamentos != 'null'
                    AND cc.medicamentos != '[]'
                    AND cc.fecha >= CURRENT_DATE - INTERVAL '7 days'
                    AND c.telefono IS NOT NULL
                    AND (cc.recordatorio_medicamentos_enviado IS NULL 
                         OR cc.recordatorio_medicamentos_enviado = false)
            `);

            console.log(`📋 Encontradas ${consultasConMedicamentos.rows.length} consultas con medicamentos`);

            for (const consulta of consultasConMedicamentos.rows) {
                try {
                    let medicamentos = [];
                    try {
                        medicamentos = JSON.parse(consulta.medicamentos);
                    } catch (e) {
                        console.log('⚠️ Error parseando medicamentos, saltando consulta');
                        continue;
                    }

                    if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
                        continue;
                    }

                    const listaMedicamentos = medicamentos.map(med => 
                        `• *${med.nombre}*: ${med.dosis} - ${med.frecuencia}`
                    ).join('\n');

                    const mensaje = `
💊 *VetPlus - Recordatorio de Medicamentos*

Hola ${consulta.cliente_nombre}, recordatorio sobre los medicamentos para ${consulta.mascota_nombre}:

${listaMedicamentos}

📝 *Recomendaciones importantes:*
- Administrar según las indicaciones del veterinario
- Completar todo el tratamiento aunque la mascota se sienta mejor
- En caso de dudas, consultar con el Dr. ${consulta.veterinario_nombre}

📞 Para consultas: contacta con nuestra clínica

¡Cuida bien a tu mascota! 🐾
                    `.trim();

                    // Enviar recordatorio
                    let sent = false;
                    try {
                        await this.whatsappService.sendTextMessage(consulta.cliente_telefono, mensaje);
                        sent = true;
                    } catch (error) {
                        try {
                            await this.whatsappBusinessService.sendTextMessage(consulta.cliente_telefono, mensaje);
                            sent = true;
                        } catch (businessError) {
                            console.error(`❌ Error enviando recordatorio de medicamentos:`, businessError);
                        }
                    }

                    if (sent) {
                        // Marcar como enviado
                        await query(`
                            UPDATE clinical.consultas_clinicas 
                            SET recordatorio_medicamentos_enviado = true
                            WHERE id_consulta = $1
                        `, [consulta.id_consulta]);

                        console.log(`✅ Recordatorio de medicamentos enviado a ${consulta.cliente_nombre}`);
                    }

                    // Pausa entre envíos
                    await new Promise(resolve => setTimeout(resolve, 3000));

                } catch (error) {
                    console.error(`❌ Error procesando recordatorio de medicamentos:`, error);
                }
            }

        } catch (error) {
            console.error('❌ Error enviando recordatorios de medicamentos:', error);
        }
    }

    /**
     * Enviar notificación manual
     */
    async sendManualNotification(telefono, mensaje, tipo = 'manual') {
        try {
            // Intentar con ambos servicios
            try {
                await this.whatsappService.sendTextMessage(telefono, mensaje);
                return { success: true, service: 'baileys' };
            } catch (error) {
                await this.whatsappBusinessService.sendTextMessage(telefono, mensaje);
                return { success: true, service: 'business' };
            }
        } catch (error) {
            console.error('❌ Error enviando notificación manual:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas de notificaciones
     */
    async getNotificationStats() {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(CASE WHEN recordatorio_enviado = true THEN 1 END) as recordatorios_citas,
                    COUNT(CASE WHEN whatsapp_enviado = true THEN 1 END) as facturas_enviadas,
                    COUNT(CASE WHEN recordatorio_medicamentos_enviado = true THEN 1 END) as recordatorios_medicamentos
                FROM clinical.calendario_citas c
                FULL OUTER JOIN financial.facturas_venta f ON c.id_consulta = f.id_consulta
                FULL OUTER JOIN clinical.consultas_clinicas cc ON c.id_consulta = cc.id_consulta
                WHERE 
                    c.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
                    OR f.fecha >= CURRENT_DATE - INTERVAL '30 days'
                    OR cc.fecha >= CURRENT_DATE - INTERVAL '30 days'
            `);

            return stats.rows[0];
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de notificaciones:', error);
            return null;
        }
    }
}

// Instancia singleton
const notificationService = new NotificationService();

export { notificationService, NotificationService };
