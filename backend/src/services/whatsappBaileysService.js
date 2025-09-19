/**
 * @fileoverview Servicio para integración con WhatsApp usando Baileys
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { 
    makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    generateWAMessageFromContent,
    prepareWAMessageMedia
} from '@whiskeysockets/baileys';
import P from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import pdfGeneratorService from './pdfGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio de WhatsApp usando Baileys
 */
class WhatsAppBaileysService {
    constructor() {
        this.sock = null;
        this.qrString = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.authDir = path.join(__dirname, '../../whatsapp-auth');
        this.config = null;
        this.connectionCallbacks = new Set();
        
        this.initAuthDir();
        // Delay config initialization until database is ready
        // this.initConfig();
    }

    /**
     * Inicializar directorio de autenticación
     */
    async initAuthDir() {
        try {
            await fs.mkdir(this.authDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorio de autenticación:', error);
        }
    }

    /**
     * Inicializar configuración desde base de datos
     */
    async initConfig() {
        try {
            const result = await query(`
                SELECT 
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
            // Si la tabla no existe aún (primera inicialización), ignorar el error
            if (error.code === '42P01') {
                console.log('⚠️ Tabla configuracion_empresa no existe aún, se creará en la inicialización');
                this.config = null;
            } else {
                console.error('Error al cargar configuración de WhatsApp:', error);
                this.config = null;
            }
        }
    }

    /**
     * Conectar a WhatsApp
     */
    async connect() {
        if (this.isConnecting || this.isConnected) {
            return;
        }

        this.isConnecting = true;

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: P({ level: 'silent' }),
                browser: ['VetPlus', 'Desktop', '1.0.0']
            });

            // Manejar eventos de conexión
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrString = qr;
                    console.log('QR Code generado para WhatsApp');
                    
                    // Notificar a los callbacks
                    this.connectionCallbacks.forEach(callback => {
                        callback({ type: 'qr', data: qr });
                    });
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    this.isConnected = false;
                    this.qrString = null;
                    
                    console.log('Conexión de WhatsApp cerrada:', lastDisconnect?.error);
                    
                    this.connectionCallbacks.forEach(callback => {
                        callback({ type: 'disconnected', data: lastDisconnect?.error });
                    });

                    if (shouldReconnect) {
                        console.log('Reintentando conexión a WhatsApp...');
                        setTimeout(() => this.connect(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.qrString = null;
                    console.log('WhatsApp conectado exitosamente');
                    
                    this.connectionCallbacks.forEach(callback => {
                        callback({ type: 'connected', data: null });
                    });
                }

                this.isConnecting = false;
            });

            // Guardar credenciales cuando cambien
            this.sock.ev.on('creds.update', saveCreds);

            // Manejar mensajes entrantes
            this.sock.ev.on('messages.upsert', async (m) => {
                const message = m.messages[0];
                if (!message.key.fromMe && m.type === 'notify') {
                    await this.handleIncomingMessage(message);
                }
            });

        } catch (error) {
            console.error('Error conectando a WhatsApp:', error);
            this.isConnecting = false;
            this.isConnected = false;
        }
    }

    /**
     * Desconectar de WhatsApp
     */
    async disconnect() {
        if (this.sock) {
            await this.sock.logout();
            this.sock = null;
            this.isConnected = false;
            this.qrString = null;
        }
    }

    /**
     * Verificar si está conectado
     */
    isReady() {
        return this.isConnected && this.sock && this.config?.whatsapp_activo;
    }

    /**
     * Obtener código QR como string
     */
    async getQRCode() {
        if (this.qrString) {
            return await qrcode.toDataURL(this.qrString);
        }
        return null;
    }

    /**
     * Agregar callback para eventos de conexión
     */
    onConnectionUpdate(callback) {
        this.connectionCallbacks.add(callback);
        
        // Retornar función para remover el callback
        return () => {
            this.connectionCallbacks.delete(callback);
        };
    }

    /**
     * Formatear número de teléfono
     */
    formatPhoneNumber(phone) {
        // Remover caracteres no numéricos
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Si no empieza con código de país, agregar 57 (Colombia)
        if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
            cleanPhone = '57' + cleanPhone;
        }
        
        return cleanPhone + '@s.whatsapp.net';
    }

    /**
     * Enviar mensaje de texto
     */
    async sendTextMessage(to, message) {
        if (!this.isReady()) {
            throw new Error('WhatsApp no está conectado o no está configurado');
        }

        try {
            const jid = this.formatPhoneNumber(to);
            
            const messageInfo = await this.sock.sendMessage(jid, {
                text: message
            });

            // Registrar en log
            await this.logWhatsAppMessage(to, 'text', message, 'sent', messageInfo);

            return {
                success: true,
                message_id: messageInfo.key.id,
                status: 'sent'
            };

        } catch (error) {
            console.error('Error enviando mensaje de texto:', error);
            await this.logWhatsAppMessage(to, 'text', message, 'failed', error.message);
            throw error;
        }
    }

    /**
     * Enviar documento PDF
     */
    async sendDocument(to, documentPath, caption, filename) {
        if (!this.isReady()) {
            throw new Error('WhatsApp no está conectado o no está configurado');
        }

        try {
            const jid = this.formatPhoneNumber(to);
            
            // Leer el archivo
            const fileData = await fs.readFile(documentPath);
            
            const messageInfo = await this.sock.sendMessage(jid, {
                document: fileData,
                mimetype: 'application/pdf',
                fileName: filename,
                caption: caption
            });

            // Registrar en log
            await this.logWhatsAppMessage(to, 'document', caption, 'sent', messageInfo);

            return {
                success: true,
                message_id: messageInfo.key.id,
                status: 'sent'
            };

        } catch (error) {
            console.error('Error enviando documento:', error);
            await this.logWhatsAppMessage(to, 'document', caption, 'failed', error.message);
            throw error;
        }
    }

    /**
     * Enviar factura por WhatsApp
     */
    async sendFactura(facturaId, numeroTelefono, clienteNombre) {
        try {
            // Generar PDF de la factura
            const pdfPath = await pdfGeneratorService.generarFacturaPDF(facturaId);
            
            // Obtener datos de la factura para el mensaje
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
                .replace('{codigo_factura}', factura.codigo_factura)
                .replace('{fecha}', new Date(factura.fecha).toLocaleDateString('es-CO'))
                .replace('{total}', Number(factura.total).toLocaleString('es-CO'))
                .replace('{empresa}', this.config.nombre_empresa);

            // Enviar PDF con mensaje
            const filename = `Factura-${factura.codigo_factura}.pdf`;
            const resultado = await this.sendDocument(
                numeroTelefono || factura.cliente_telefono,
                pdfPath,
                mensaje,
                filename
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

            // Registrar en log de WhatsApp con referencia a factura
            await query(`
                UPDATE system.whatsapp_log 
                SET 
                    id_factura = $1,
                    tipo_documento = 'factura'
                WHERE message_id = $2
            `, [facturaId, resultado.message_id]);

            return resultado;

        } catch (error) {
            console.error('Error enviando factura por WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Enviar fórmula médica por WhatsApp
     */
    async sendFormula(consultaId, numeroTelefono, clienteNombre) {
        try {
            // Generar PDF de la fórmula
            const pdfPath = await pdfGeneratorService.generarFormulaPDF(consultaId);
            
            // Obtener datos de la consulta para el mensaje
            const consultaResult = await query(`
                SELECT 
                    cc.id_consulta,
                    cc.fecha,
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
            const mensaje = this.config.mensaje_whatsapp_formula
                .replace('{cliente_nombre}', clienteNombre || consulta.cliente_nombre)
                .replace('{mascota_nombre}', consulta.mascota_nombre)
                .replace('{veterinario}', consulta.veterinario_nombre)
                .replace('{empresa}', this.config.nombre_empresa);

            // Enviar PDF con mensaje
            const filename = `Formula-${consulta.mascota_nombre}-${new Date().toISOString().split('T')[0]}.pdf`;
            const resultado = await this.sendDocument(
                numeroTelefono || consulta.cliente_telefono,
                pdfPath,
                mensaje,
                filename
            );

            // Registrar envío en la base de datos
            await query(`
                UPDATE clinical.consultas_clinicas 
                SET 
                    formula_enviada_whatsapp = true,
                    fecha_envio_formula = CURRENT_TIMESTAMP
                WHERE id_consulta = $1
            `, [consultaId]);

            // Registrar en log de WhatsApp con referencia a consulta
            await query(`
                UPDATE system.whatsapp_log 
                SET 
                    id_consulta = $1,
                    tipo_documento = 'formula'
                WHERE message_id = $2
            `, [consultaId, resultado.message_id]);

            return resultado;

        } catch (error) {
            console.error('Error enviando fórmula por WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Manejar mensajes entrantes
     */
    async handleIncomingMessage(message) {
        try {
            const from = message.key.remoteJid;
            const messageText = message.message?.conversation || 
                              message.message?.extendedTextMessage?.text || '';
            
            console.log(`Mensaje recibido de ${from}: ${messageText}`);
            
            // Aquí puedes implementar lógica para respuestas automáticas
            // Por ejemplo, responder a comandos específicos
            
        } catch (error) {
            console.error('Error procesando mensaje entrante:', error);
        }
    }

    /**
     * Registrar mensaje en log
     */
    async logWhatsAppMessage(to, type, content, status, response) {
        try {
            await query(`
                INSERT INTO system.whatsapp_log 
                (numero_destino, tipo_mensaje, contenido, estado, respuesta_api, fecha, message_id)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
            `, [
                to,
                type,
                content,
                status,
                typeof response === 'object' ? JSON.stringify(response) : response,
                response?.key?.id || null
            ]);
        } catch (error) {
            console.error('Error registrando log de WhatsApp:', error);
        }
    }

    /**
     * Obtener estado de conexión
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            hasQR: !!this.qrString,
            isConfigured: !!this.config?.whatsapp_activo
        };
    }

    /**
     * Obtener estadísticas
     */
    async getStats(fechaInicio, fechaFin) {
        try {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_mensajes,
                    COUNT(*) FILTER (WHERE estado = 'sent') as mensajes_enviados,
                    COUNT(*) FILTER (WHERE estado = 'failed') as mensajes_fallidos,
                    COUNT(*) FILTER (WHERE tipo_mensaje = 'text') as mensajes_texto,
                    COUNT(*) FILTER (WHERE tipo_mensaje = 'document') as documentos_enviados,
                    COUNT(*) FILTER (WHERE tipo_documento = 'factura') as facturas_enviadas,
                    COUNT(*) FILTER (WHERE tipo_documento = 'formula') as formulas_enviadas
                FROM system.whatsapp_log
                WHERE fecha BETWEEN $1 AND $2
            `, [fechaInicio, fechaFin]);

            return result.rows[0];
        } catch (error) {
            console.error('Error obteniendo estadísticas de WhatsApp:', error);
            throw error;
        }
    }

    /**
     * Reiniciar conexión
     */
    async restart() {
        await this.disconnect();
        setTimeout(() => this.connect(), 2000);
    }

    /**
     * Eliminar sesión (logout completo)
     */
    async clearSession() {
        try {
            await this.disconnect();
            
            // Eliminar archivos de autenticación
            const files = await fs.readdir(this.authDir);
            for (const file of files) {
                await fs.unlink(path.join(this.authDir, file));
            }
            
            console.log('Sesión de WhatsApp eliminada');
        } catch (error) {
            console.error('Error eliminando sesión:', error);
        }
    }

    /**
     * Inicializar servicio (cargar configuración, etc.)
     */
    async initialize() {
        await this.initConfig();
    }
}

// Crear instancia singleton
const whatsappBaileysService = new WhatsAppBaileysService();

// NO auto-conectar al inicializar - solo conectar cuando se solicite el QR

export default whatsappBaileysService;