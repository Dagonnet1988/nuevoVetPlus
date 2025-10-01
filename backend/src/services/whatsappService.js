/**
 * @fileoverview Servicio para integración con WhatsApp Business API
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import axios from 'axios';
import { query } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Configuración base de WhatsApp Business API
 */
class WhatsAppService {
    constructor() {
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.config = null;
        this.initConfig();
    }

    /**
     * Inicializar configuración desde base de datos
     */
    async initConfig() {
        try {
            const result = await query(`
                SELECT 
                    whatsapp_business_number,
                    whatsapp_api_token,
                    whatsapp_activo,
                    mensaje_whatsapp_factura,
                    mensaje_whatsapp_formula,
                    nombre_empresa
                FROM system.configuracion_empresa 
                WHERE activa = true
            `);

            if (result.rows.length > 0) {
                this.config = result.rows[0];
            }
        } catch (error) {
            console.error('Error al cargar configuración de WhatsApp:', error);
        }
    }

    /**
     * Verificar si WhatsApp está configurado y activo
     */
    async isConfigured() {
        if (!this.config) {
            await this.initConfig();
        }
        
        return this.config && 
               this.config.whatsapp_activo && 
               this.config.whatsapp_business_number && 
               this.config.whatsapp_api_token;
    }

    /**
     * Enviar mensaje de texto simple
     */
    async sendTextMessage(to, message, tipoDocumento = 'manual') {
        try {
            if (!await this.isConfigured()) {
                throw new Error('WhatsApp no está configurado o no está activo');
            }

            const url = `${this.baseURL}/${this.config.whatsapp_business_number}/messages`;
            
            const payload = {
                messaging_product: 'whatsapp',
                to: to.replace(/[^0-9]/g, ''), // Limpiar número
                type: 'text',
                text: {
                    body: message
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.config.whatsapp_api_token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Log del envío
            await this.logWhatsAppMessage(to, 'text', message, 'sent', response.data, tipoDocumento);

            return {
                success: true,
                message_id: response.data.messages[0].id,
                status: 'sent'
            };

        } catch (error) {
            console.error('Error al enviar mensaje de WhatsApp:', error);
            
            // Log del error
            await this.logWhatsAppMessage(to, 'text', message, 'failed', error.message, tipoDocumento);
            
            throw error;
        }
    }

    /**
     * Enviar documento por WhatsApp
     */
    async sendDocument(to, documentPath, caption, filename, tipoDocumento = 'documento') {
        try {
            if (!await this.isConfigured()) {
                throw new Error('WhatsApp no está configurado o no está activo');
            }

            // Verificar que el archivo existe
            await fs.access(documentPath);

            const url = `${this.baseURL}/${this.config.whatsapp_business_number}/messages`;
            
            // Primero subir el archivo a Facebook
            const mediaId = await this.uploadMedia(documentPath, 'document');

            const payload = {
                messaging_product: 'whatsapp',
                to: to.replace(/[^0-9]/g, ''),
                type: 'document',
                document: {
                    id: mediaId,
                    caption: caption,
                    filename: filename
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.config.whatsapp_api_token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Log del envío
            await this.logWhatsAppMessage(to, 'document', caption, 'sent', response.data, tipoDocumento);

            return {
                success: true,
                message_id: response.data.messages[0].id,
                status: 'sent'
            };

        } catch (error) {
            console.error('Error al enviar documento por WhatsApp:', error);
            
            // Log del error
            await this.logWhatsAppMessage(to, 'document', caption, 'failed', error.message, tipoDocumento);
            
            throw error;
        }
    }

    /**
     * Subir media a Facebook para usar en WhatsApp
     */
    async uploadMedia(filePath, type = 'document') {
        try {
            const url = `${this.baseURL}/${this.config.whatsapp_business_number}/media`;
            
            // Leer archivo
            const fileData = await fs.readFile(filePath);
            const filename = path.basename(filePath);
            
            // Determinar mime type
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png'
            };
            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            const formData = new FormData();
            formData.append('file', new Blob([fileData], { type: mimeType }), filename);
            formData.append('type', type);
            formData.append('messaging_product', 'whatsapp');

            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Bearer ${this.config.whatsapp_api_token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            return response.data.id;

        } catch (error) {
            console.error('Error al subir media:', error);
            throw error;
        }
    }

    /**
     * Enviar factura por WhatsApp
     */
    async sendFactura(facturaId, numeroTelefono, clienteNombre) {
        try {
            // Obtener datos de la factura
            const facturaResult = await query(`
                SELECT 
                    fv.codigo_factura,
                    fv.fecha,
                    fv.total,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono
                FROM financial.facturas_venta fv
                JOIN clinical.clientes c ON fv.id_cliente = c.id_cliente
                WHERE fv.id_factura = $1
            `, [facturaId]);

            if (facturaResult.rows.length === 0) {
                throw new Error('Factura no encontrada');
            }

            const factura = facturaResult.rows[0];
            
            // Generar mensaje personalizado
            const mensaje = this.config.mensaje_whatsapp_factura
                .replace('{cliente_nombre}', clienteNombre || factura.cliente_nombre)
                .replace('{numero_factura}', factura.codigo_factura)
                .replace('{fecha}', factura.fecha)
                .replace('{total}', factura.total)
                .replace('{empresa}', this.config.nombre_empresa);

            // TODO: Generar PDF de la factura
            // Por ahora, enviar solo mensaje de texto
            const resultado = await this.sendTextMessage(
                numeroTelefono || factura.cliente_telefono,
                mensaje,
                'factura'
            );

            // Registrar envío en la base de datos
            await query(`
                UPDATE financial.facturas_venta 
                SET 
                    whatsapp_enviado = true,
                    fecha_envio_whatsapp = CURRENT_TIMESTAMP,
                    telefono_envio = $2
                WHERE id_factura = $1
            `, [facturaId, numeroTelefono || factura.cliente_telefono]);

            return resultado;

        } catch (error) {
            console.error('Error al enviar factura por WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Enviar fórmula médica por WhatsApp
     */
    async sendFormula(consultaId, numeroTelefono, clienteNombre) {
        try {
            // Obtener datos de la consulta y fórmula
            const consultaResult = await query(`
                SELECT 
                    cc.id_consulta,
                    cc.fecha,
                    cc.diagnostico,
                    cc.tratamiento,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    m.nombre as mascota_nombre,
                    u.nombre as veterinario_nombre
                FROM clinical.consultas_clinicas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
                JOIN vetplus_auth.usuarios u ON cc.id_veterinario = u.id_usuario
                WHERE cc.id_consulta = $1
            `, [consultaId]);

            if (consultaResult.rows.length === 0) {
                throw new Error('Consulta no encontrada');
            }

            const consulta = consultaResult.rows[0];
            
            // Generar mensaje personalizado
            let mensaje = this.config.mensaje_whatsapp_formula
                .replace('{cliente_nombre}', clienteNombre || consulta.cliente_nombre)
                .replace('{mascota_nombre}', consulta.mascota_nombre)
                .replace('{veterinario}', consulta.veterinario_nombre)
                .replace('{empresa}', this.config.nombre_empresa);

            // Agregar información de tratamiento si existe
            if (consulta.tratamiento) {
                mensaje += `\n\n*Tratamiento prescrito:*\n${consulta.tratamiento}`;
            }

            // TODO: Generar PDF de la fórmula médica
            // Por ahora, enviar solo mensaje de texto
            const resultado = await this.sendTextMessage(
                numeroTelefono || consulta.cliente_telefono,
                mensaje,
                'formula'
            );

            // Registrar envío en la base de datos
            await query(`
                UPDATE clinical.consultas_clinicas 
                SET 
                    formula_enviada_whatsapp = true,
                    fecha_envio_formula = CURRENT_TIMESTAMP
                WHERE id_consulta = $1
            `, [consultaId]);

            return resultado;

        } catch (error) {
            console.error('Error al enviar fórmula por WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Registrar mensaje de WhatsApp en log
     */
    async logWhatsAppMessage(to, type, content, status, response, tipoDocumento = null) {
        try {
            await query(`
                INSERT INTO system.whatsapp_log 
                (numero_destino, tipo_mensaje, contenido, estado, respuesta_api, fecha, tipo_documento)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
            `, [
                to,
                type,
                content,
                status,
                typeof response === 'object' ? JSON.stringify(response) : response,
                tipoDocumento
            ]);
        } catch (error) {
            console.error('Error al registrar log de WhatsApp:', error);
        }
    }

    /**
     * Webhook de WhatsApp para recibir estados de mensajes
     */
    async processWebhook(webhookData) {
        try {
            // Procesar actualizaciones de estado de mensajes
            if (webhookData.entry) {
                for (const entry of webhookData.entry) {
                    if (entry.changes) {
                        for (const change of entry.changes) {
                            if (change.field === 'messages') {
                                await this.processMessageStatus(change.value);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error al procesar webhook de WhatsApp:', error);
        }
    }

    /**
     * Procesar actualizaciones de estado de mensajes
     */
    async processMessageStatus(value) {
        try {
            if (value.statuses) {
                for (const status of value.statuses) {
                    await query(`
                        UPDATE system.whatsapp_log 
                        SET 
                            estado = $1,
                            fecha_actualizacion = CURRENT_TIMESTAMP,
                            detalles_estado = $2
                        WHERE message_id = $3
                    `, [
                        status.status,
                        JSON.stringify(status),
                        status.id
                    ]);
                }
            }
        } catch (error) {
            console.error('Error al procesar estado de mensaje:', error);
        }
    }

    /**
     * Obtener estadísticas de mensajes enviados
     */
    async getStats(fechaInicio, fechaFin) {
        try {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_mensajes,
                    COUNT(*) FILTER (WHERE estado = 'sent') as mensajes_enviados,
                    COUNT(*) FILTER (WHERE estado = 'delivered') as mensajes_entregados,
                    COUNT(*) FILTER (WHERE estado = 'read') as mensajes_leidos,
                    COUNT(*) FILTER (WHERE estado = 'failed') as mensajes_fallidos,
                    COUNT(*) FILTER (WHERE tipo_mensaje = 'text') as mensajes_texto,
                    COUNT(*) FILTER (WHERE tipo_mensaje = 'document') as documentos_enviados
                FROM system.whatsapp_log
                WHERE fecha BETWEEN $1 AND $2
            `, [fechaInicio, fechaFin]);

            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de WhatsApp:', error);
            throw error;
        }
    }
}

// Crear instancia singleton
const whatsappService = new WhatsAppService();

export default whatsappService;