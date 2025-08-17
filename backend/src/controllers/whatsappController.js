/**
 * @fileoverview Controlador para gestión de WhatsApp
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { validationResult } from 'express-validator';
import whatsappService from '../services/whatsappBaileysService.js';
import { query } from '../config/database.js';

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: Gestión de WhatsApp Business
 */

/**
 * Obtener estado de conexión de WhatsApp
 * @route GET /api/admin/whatsapp/status
 */
export const getWhatsAppStatus = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder al estado de WhatsApp'
            });
        }

        const status = whatsappService.getConnectionStatus();
        
        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Error obteniendo estado de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener código QR para conectar WhatsApp
 * @route GET /api/admin/whatsapp/qr
 */
export const getWhatsAppQR = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden obtener el QR de WhatsApp'
            });
        }

        const qrDataURL = await whatsappService.getQRCode();
        
        if (!qrDataURL) {
            return res.status(404).json({
                success: false,
                message: 'No hay código QR disponible. WhatsApp podría estar ya conectado.'
            });
        }

        res.json({
            success: true,
            data: {
                qr_code: qrDataURL,
                message: 'Escanea este código QR con WhatsApp Web'
            }
        });

    } catch (error) {
        console.error('Error obteniendo QR de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reiniciar conexión de WhatsApp
 * @route POST /api/admin/whatsapp/restart
 */
export const restartWhatsApp = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden reiniciar WhatsApp'
            });
        }

        await whatsappService.restart();

        res.json({
            success: true,
            message: 'WhatsApp reiniciado. Espera unos segundos y verifica el estado.'
        });

    } catch (error) {
        console.error('Error reiniciando WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Desconectar y limpiar sesión de WhatsApp
 * @route POST /api/admin/whatsapp/logout
 */
export const logoutWhatsApp = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden desconectar WhatsApp'
            });
        }

        await whatsappService.clearSession();

        res.json({
            success: true,
            message: 'Sesión de WhatsApp eliminada. Necesitarás escanear un nuevo QR.'
        });

    } catch (error) {
        console.error('Error desconectando WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Enviar mensaje de prueba
 * @route POST /api/admin/whatsapp/test-message
 */
export const sendTestMessage = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden enviar mensajes de prueba'
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

        const { numero_telefono, mensaje } = req.body;

        if (!whatsappService.isReady()) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está conectado o no está configurado'
            });
        }

        const resultado = await whatsappService.sendTextMessage(numero_telefono, mensaje);

        res.json({
            success: true,
            message: 'Mensaje de prueba enviado exitosamente',
            data: resultado
        });

    } catch (error) {
        console.error('Error enviando mensaje de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Enviar factura por WhatsApp
 * @route POST /api/whatsapp/send-factura
 */
export const sendFacturaPorWhatsApp = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { factura_id, numero_telefono, cliente_nombre } = req.body;

        // Verificar que la factura existe y pertenece al usuario (si no es admin)
        let facturaQuery = `
            SELECT fv.*, c.nombre as cliente_nombre
            FROM financial.facturas_venta fv
            JOIN clinical.clientes c ON fv.id_cliente = c.id_cliente
            WHERE fv.id_factura = $1
        `;
        const params = [factura_id];

        // Si no es admin, verificar que la factura fue creada por el usuario
        if (req.user.rol !== 'admin') {
            facturaQuery += ' AND fv.created_by = $2';
            params.push(req.user.id_usuario);
        }

        const facturaResult = await query(facturaQuery, params);
        
        if (facturaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada o sin permisos'
            });
        }

        if (!whatsappService.isReady()) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está conectado o no está configurado'
            });
        }

        const resultado = await whatsappService.sendFactura(
            factura_id,
            numero_telefono,
            cliente_nombre
        );

        res.json({
            success: true,
            message: 'Factura enviada por WhatsApp exitosamente',
            data: resultado
        });

    } catch (error) {
        console.error('Error enviando factura por WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Enviar fórmula médica por WhatsApp
 * @route POST /api/whatsapp/send-formula
 */
export const sendFormulaPorWhatsApp = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { consulta_id, numero_telefono, cliente_nombre } = req.body;

        // Verificar que la consulta existe y el usuario tiene permisos
        let consultaQuery = `
            SELECT cc.*, c.nombre as cliente_nombre, m.nombre as mascota_nombre
            FROM clinical.consultas_clinicas cc
            JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
            JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE cc.id_consulta = $1
        `;
        const params = [consulta_id];

        // Si no es admin, verificar que la consulta fue creada por el usuario
        if (req.user.rol !== 'admin') {
            consultaQuery += ' AND cc.id_veterinario = $2';
            params.push(req.user.id_usuario);
        }

        const consultaResult = await query(consultaQuery, params);
        
        if (consultaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consulta no encontrada o sin permisos'
            });
        }

        if (!whatsappService.isReady()) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está conectado o no está configurado'
            });
        }

        const resultado = await whatsappService.sendFormula(
            consulta_id,
            numero_telefono,
            cliente_nombre
        );

        res.json({
            success: true,
            message: 'Fórmula médica enviada por WhatsApp exitosamente',
            data: resultado
        });

    } catch (error) {
        console.error('Error enviando fórmula por WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estadísticas de WhatsApp
 * @route GET /api/admin/whatsapp/stats
 */
export const getWhatsAppStats = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver estadísticas de WhatsApp'
            });
        }

        const { 
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0]
        } = req.query;

        const stats = await whatsappService.getStats(fecha_inicio, fecha_fin);
        
        // Obtener estadísticas adicionales de la base de datos
        const detailedStats = await query(`
            SELECT * FROM get_whatsapp_stats_period($1::date, $2::date)
        `, [fecha_inicio, fecha_fin]);

        res.json({
            success: true,
            data: {
                ...stats,
                ...detailedStats.rows[0],
                periodo: {
                    fecha_inicio,
                    fecha_fin
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener historial de mensajes enviados
 * @route GET /api/admin/whatsapp/messages
 */
export const getWhatsAppMessages = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver el historial de mensajes'
            });
        }

        const { 
            page = 1, 
            limit = 50,
            estado,
            tipo_documento
        } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (estado) {
            whereClause += ` AND estado = $${++paramCount}`;
            params.push(estado);
        }

        if (tipo_documento) {
            whereClause += ` AND tipo_documento = $${++paramCount}`;
            params.push(tipo_documento);
        }

        const offset = (page - 1) * limit;

        const result = await query(`
            SELECT 
                wl.*,
                CASE 
                    WHEN wl.id_factura IS NOT NULL THEN 
                        (SELECT fv.codigo_factura FROM financial.facturas_venta fv WHERE fv.id_factura = wl.id_factura)
                    WHEN wl.id_consulta IS NOT NULL THEN
                        'Consulta: ' || (SELECT cc.fecha::date FROM clinical.consultas_clinicas cc WHERE cc.id_consulta = wl.id_consulta)
                    ELSE 'N/A'
                END as documento_referencia
            FROM system.whatsapp_log wl
            ${whereClause}
            ORDER BY wl.fecha DESC
            LIMIT $${++paramCount} OFFSET $${++paramCount}
        `, [...params, limit, offset]);

        // Contar total para paginación
        const countResult = await query(`
            SELECT COUNT(*) as total
            FROM system.whatsapp_log wl
            ${whereClause}
        `, params.slice(0, -2));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo mensajes de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reenviar mensaje fallido
 * @route POST /api/admin/whatsapp/retry/:logId
 */
export const retryWhatsAppMessage = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden reenviar mensajes'
            });
        }

        const { logId } = req.params;

        // Obtener información del mensaje fallido
        const logResult = await query(`
            SELECT * FROM system.whatsapp_log 
            WHERE id_log = $1 AND estado = 'failed' AND intentos < 3
        `, [logId]);

        if (logResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mensaje no encontrado o no se puede reintentar'
            });
        }

        const log = logResult.rows[0];

        if (!whatsappService.isReady()) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está conectado'
            });
        }

        let resultado;

        // Reintentar según el tipo de documento
        if (log.tipo_documento === 'factura' && log.id_factura) {
            resultado = await whatsappService.sendFactura(log.id_factura, log.numero_destino);
        } else if (log.tipo_documento === 'formula' && log.id_consulta) {
            resultado = await whatsappService.sendFormula(log.id_consulta, log.numero_destino);
        } else {
            // Mensaje de texto simple
            resultado = await whatsappService.sendTextMessage(log.numero_destino, log.contenido);
        }

        // Actualizar el log original
        await query(`
            UPDATE system.whatsapp_log 
            SET 
                intentos = intentos + 1,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_log = $1
        `, [logId]);

        res.json({
            success: true,
            message: 'Mensaje reenviado exitosamente',
            data: resultado
        });

    } catch (error) {
        console.error('Error reenviando mensaje de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};