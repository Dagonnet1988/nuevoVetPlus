/**
 * @fileoverview Controlador para configuración de notificaciones automáticas
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { validationResult } from 'express-validator/lib/index.js';
import { query } from '../config/database.js';
import autoNotificationService from '../services/autoNotificationService.js';

/**
 * Obtener configuración actual de notificaciones
 * @route GET /api/admin/notifications/config
 */
export const getNotificationConfig = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a la configuración de notificaciones'
            });
        }

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
                mensaje_seguimiento
            FROM system.configuracion_empresa 
            WHERE activa = true
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración de empresa'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo configuración de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar configuración de notificaciones
 * @route PUT /api/admin/notifications/config
 */
export const updateNotificationConfig = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden modificar la configuración de notificaciones'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const {
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
            mensaje_seguimiento
        } = req.body;

        const result = await query(`
            UPDATE system.configuracion_empresa 
            SET 
                notificaciones_activas = $1,
                notif_cita_confirmada = $2,
                notif_cita_recordatorio_24h = $3,
                notif_cita_recordatorio_2h = $4,
                notif_cita_completada = $5,
                notif_factura_automatica = $6,
                notif_seguimiento_medicamentos = $7,
                limite_diario_mensajes = $8,
                intervalo_minimo_minutos = $9,
                mensaje_cita_confirmada = $10,
                mensaje_recordatorio_24h = $11,
                mensaje_recordatorio_2h = $12,
                mensaje_cita_completada = $13,
                mensaje_seguimiento = $14,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $15
            WHERE activa = true
            RETURNING notificaciones_activas, limite_diario_mensajes
        `, [
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
            req.user.id_usuario
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración activa'
            });
        }

        // Actualizar configuración del servicio de notificaciones
        await autoNotificationService.updateConfiguration();

        res.json({
            success: true,
            message: 'Configuración de notificaciones actualizada exitosamente',
            data: {
                notificaciones_activas: result.rows[0].notificaciones_activas,
                limite_diario_mensajes: result.rows[0].limite_diario_mensajes
            }
        });

    } catch (error) {
        console.error('Error actualizando configuración de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estadísticas de notificaciones
 * @route GET /api/admin/notifications/stats
 */
export const getNotificationStats = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver estadísticas de notificaciones'
            });
        }

        const { desde, hasta } = req.query;
        const fechaInicio = desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fechaFin = hasta || new Date().toISOString().split('T')[0];

        // Estadísticas de mensajes enviados por tipo
        const statsQuery = await query(`
            SELECT 
                COUNT(*) as total_mensajes,
                COUNT(*) FILTER (WHERE estado = 'sent') as enviados_exitosos,
                COUNT(*) FILTER (WHERE estado = 'failed') as fallidos,
                COUNT(*) FILTER (WHERE tipo_documento = 'confirmacion_cita') as confirmaciones,
                COUNT(*) FILTER (WHERE tipo_documento = 'recordatorio_24h') as recordatorios_24h,
                COUNT(*) FILTER (WHERE tipo_documento = 'recordatorio_2h') as recordatorios_2h,
                COUNT(*) FILTER (WHERE tipo_documento = 'cita_completada') as notif_completadas,
                COUNT(*) FILTER (WHERE tipo_documento = 'seguimiento') as seguimientos
            FROM system.whatsapp_log
            WHERE DATE(fecha) BETWEEN $1 AND $2
        `, [fechaInicio, fechaFin]);

        // Mensajes programados pendientes
        const pendingQuery = await query(`
            SELECT 
                COUNT(*) as total_programadas,
                COUNT(*) FILTER (WHERE tipo_notificacion = 'recordatorio_24h') as recordatorios_24h_pendientes,
                COUNT(*) FILTER (WHERE tipo_notificacion = 'recordatorio_2h') as recordatorios_2h_pendientes,
                COUNT(*) FILTER (WHERE tipo_notificacion = 'cita_completada') as completadas_pendientes
            FROM system.notificaciones_programadas
            WHERE enviado = false
        `);

        // Límite diario actual
        const dailyLimitQuery = await query(`
            SELECT 
                l.mensajes_enviados,
                ce.limite_diario_mensajes,
                (ce.limite_diario_mensajes - COALESCE(l.mensajes_enviados, 0)) as mensajes_restantes
            FROM system.configuracion_empresa ce
            LEFT JOIN system.whatsapp_limits l ON l.fecha = CURRENT_DATE
            WHERE ce.activa = true
        `);

        const stats = statsQuery.rows[0];
        const pending = pendingQuery.rows[0];
        const dailyLimit = dailyLimitQuery.rows[0];

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio,
                    hasta: fechaFin
                },
                mensajes: {
                    total: parseInt(stats.total_mensajes),
                    enviados_exitosos: parseInt(stats.enviados_exitosos),
                    fallidos: parseInt(stats.fallidos),
                    tasa_exito: stats.total_mensajes > 0 ? 
                        ((stats.enviados_exitosos / stats.total_mensajes) * 100).toFixed(1) : 0
                },
                por_tipo: {
                    confirmaciones: parseInt(stats.confirmaciones),
                    recordatorios_24h: parseInt(stats.recordatorios_24h),
                    recordatorios_2h: parseInt(stats.recordatorios_2h),
                    notificaciones_completadas: parseInt(stats.notif_completadas),
                    seguimientos: parseInt(stats.seguimientos)
                },
                programadas_pendientes: {
                    total: parseInt(pending.total_programadas),
                    recordatorios_24h: parseInt(pending.recordatorios_24h_pendientes),
                    recordatorios_2h: parseInt(pending.recordatorios_2h_pendientes),
                    completadas: parseInt(pending.completadas_pendientes)
                },
                limite_diario: {
                    mensajes_enviados_hoy: parseInt(dailyLimit?.mensajes_enviados) || 0,
                    limite_configurado: parseInt(dailyLimit?.limite_diario_mensajes) || 50,
                    mensajes_restantes: parseInt(dailyLimit?.mensajes_restantes) || 50
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Probar envío de notificación
 * @route POST /api/admin/notifications/test
 */
export const testNotification = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden probar notificaciones'
            });
        }

        const { numero_telefono, tipo_mensaje = 'test' } = req.body;

        if (!numero_telefono) {
            return res.status(400).json({
                success: false,
                message: 'Número de teléfono es requerido'
            });
        }

        // Verificar límite diario
        if (!await autoNotificationService.canSendMessage()) {
            return res.status(429).json({
                success: false,
                message: 'Límite diario de mensajes alcanzado'
            });
        }

        const mensajePrueba = `🧪 Mensaje de prueba de VetPlus\n\nEste es un mensaje de prueba del sistema de notificaciones automáticas.\n\nFecha: ${new Date().toLocaleString('es-ES')}\n\n¡El sistema funciona correctamente!`;

        // Simular datos para el log
        await autoNotificationService.logNotification(
            'test',
            null,
            numero_telefono,
            mensajePrueba,
            true
        );

        res.json({
            success: true,
            message: 'Mensaje de prueba programado exitosamente',
            data: {
                numero_destino: numero_telefono,
                tipo: tipo_mensaje,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error enviando notificación de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reiniciar servicio de notificaciones
 * @route POST /api/admin/notifications/restart
 */
export const restartNotificationService = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden reiniciar el servicio'
            });
        }

        // Detener y reiniciar el servicio
        autoNotificationService.stopAllJobs();
        await autoNotificationService.initialize();

        res.json({
            success: true,
            message: 'Servicio de notificaciones reiniciado exitosamente'
        });

    } catch (error) {
        console.error('Error reiniciando servicio de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
