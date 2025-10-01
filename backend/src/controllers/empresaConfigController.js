/**
 * @fileoverview Controlador para gestión de configuración de empresa
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * @swagger
 * tags:
 *   name: Configuración Empresa
 *   description: Gestión de configuración de la empresa veterinaria
 */

/**
 * Obtener configuración actual de la empresa
 * @route GET /api/admin/empresa/config
 */
export const getEmpresaConfig = async (req, res) => {
    try {
        // Solo administradores pueden acceder
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta configuración'
            });
        }

        // Obtener configuración de empresa
        const configResult = await query(`
            SELECT * FROM system.configuracion_empresa
            WHERE activa = true
            LIMIT 1
        `);

        if (configResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay configuración de empresa definida'
            });
        }

        const empresaConfig = configResult.rows[0];

        // Obtener horarios de atención de manera controlada
        const horariosResult = await query(`
            SELECT DISTINCT ON (dia_semana)
                dia_semana,
                CASE dia_semana
                    WHEN 0 THEN 'Domingo'
                    WHEN 1 THEN 'Lunes'
                    WHEN 2 THEN 'Martes'
                    WHEN 3 THEN 'Miércoles'
                    WHEN 4 THEN 'Jueves'
                    WHEN 5 THEN 'Viernes'
                    WHEN 6 THEN 'Sábado'
                END as nombre_dia,
                hora_apertura,
                hora_cierre,
                cerrado,
                notas
            FROM system.horarios_atencion
            WHERE id_config = $1
            ORDER BY dia_semana, id_horario DESC
        `, [empresaConfig.id_config]);

        // Asignar horarios a la configuración
        empresaConfig.horarios = horariosResult.rows;

        // No enviar datos sensibles como tokens en GET requests normales
        delete empresaConfig.whatsapp_api_token;
        delete empresaConfig.whatsapp_webhook_verify_token;

        res.json({
            success: true,
            data: empresaConfig
        });

    } catch (error) {
        console.error('Error al obtener configuración de empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar configuración de empresa
 * @route PUT /api/admin/empresa/config
 */
export const updateEmpresaConfig = async (req, res) => {
    try {
        // Solo administradores pueden actualizar
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden modificar la configuración'
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
            nombre_empresa,
            nit,
            direccion,
            telefono,
            email,
            sitio_web,
            eslogan,
            ciudad,
            departamento,
            codigo_postal,
            website,
            regimen_tributario,
            representante_legal,
            cedula_representante,
            pie_factura,
            mensaje_whatsapp_factura,
            mensaje_whatsapp_formula,
            whatsapp_business_number,
            prefijo_factura,
            prefijo_orden_compra,
            configuracion_numeracion,
            configuracion_general,
            horarios
        } = req.body;

        // Iniciar transacción
        await query('BEGIN');

        try {
            // Preparar datos JSON para configuración
            const configGeneral = configuracion_general ? JSON.stringify(configuracion_general) : null;
            const configNumeracion = configuracion_numeracion ? JSON.stringify(configuracion_numeracion) : null;

            // Actualizar configuración principal
            const updateResult = await query(`
                UPDATE system.configuracion_empresa
                SET
                    nombre_empresa = $1,
                    nit = $2,
                    direccion = $3,
                    telefono = $4,
                    email = $5,
                    sitio_web = $6,
                    eslogan = $7,
                    ciudad = $8,
                    departamento = $9,
                    codigo_postal = $10,
                    website = $11,
                    regimen_tributario = $12,
                    representante_legal = $13,
                    cedula_representante = $14,
                    pie_factura = $15,
                    mensaje_whatsapp_factura = $16,
                    mensaje_whatsapp_formula = $17,
                    whatsapp_business_number = $18,
                    prefijo_factura = $19,
                    prefijo_orden_compra = $20,
                    configuracion_general = $21,
                    configuracion_numeracion = $22,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $23
                WHERE activa = true
                RETURNING id_config
            `, [
                nombre_empresa, nit, direccion, telefono, email, sitio_web, eslogan,
                ciudad, departamento, codigo_postal, website, regimen_tributario,
                representante_legal, cedula_representante, pie_factura,
                mensaje_whatsapp_factura, mensaje_whatsapp_formula, whatsapp_business_number,
                prefijo_factura, prefijo_orden_compra, configGeneral, configNumeracion,
                req.user.id_usuario
            ]);

            if (updateResult.rows.length === 0) {
                throw new Error('No se encontró configuración activa para actualizar');
            }

            const configId = updateResult.rows[0].id_config;

            // Actualizar horarios si se proporcionan
            if (horarios && Array.isArray(horarios)) {
                // Eliminar horarios existentes
                await query('DELETE FROM system.horarios_atencion WHERE id_config = $1', [configId]);

                // Insertar nuevos horarios
                for (const horario of horarios) {
                    await query(`
                        INSERT INTO system.horarios_atencion 
                        (id_config, dia_semana, hora_apertura, hora_cierre, cerrado, notas)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        configId,
                        horario.dia_semana,
                        horario.cerrado ? null : horario.hora_apertura,
                        horario.cerrado ? null : horario.hora_cierre,
                        horario.cerrado || false,
                        horario.notas || null
                    ]);
                }
            }

            await query('COMMIT');

            // Obtener configuración actualizada
            const updatedConfig = await query(`
                SELECT * FROM system.configuracion_empresa 
                WHERE id_config = $1
            `, [configId]);

            res.json({
                success: true,
                message: 'Configuración de empresa actualizada exitosamente',
                data: updatedConfig.rows[0]
            });

        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error al actualizar configuración de empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Subir logo de la empresa
 * @route POST /api/admin/empresa/logo
 */
export const uploadLogo = async (req, res) => {
    try {
        // Solo administradores pueden subir logo
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden subir el logo'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó ningún archivo'
            });
        }

        const file = req.file;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
        
        if (!allowedTypes.includes(file.mimetype)) {
            // Eliminar archivo subido si no es válido
            await fs.unlink(file.path);
            return res.status(400).json({
                success: false,
                message: 'Tipo de archivo no permitido. Use JPG, PNG o SVG'
            });
        }

        // Generar URL del logo
        const logoUrl = `/uploads/logos/${file.filename}`;

        // Actualizar configuración con la nueva URL del logo
        const result = await query(`
            UPDATE system.configuracion_empresa 
            SET 
                logo_url = $1,
                logo_filename = $2,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $3
            WHERE activa = true
            RETURNING logo_url, logo_filename
        `, [logoUrl, file.originalname, req.user.id_usuario]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración activa'
            });
        }

        res.json({
            success: true,
            message: 'Logo subido exitosamente',
            data: {
                logo_url: result.rows[0].logo_url,
                logo_filename: result.rows[0].logo_filename,
                file_size: file.size,
                mime_type: file.mimetype
            }
        });

    } catch (error) {
        console.error('Error al subir logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Configurar WhatsApp Business API
 * @route PUT /api/admin/empresa/whatsapp
 */
/**
 * Obtener configuración de WhatsApp
 * @route GET /api/admin/empresa/whatsapp
 */
export const getWhatsAppConfig = async (req, res) => {
    try {
        // Solo administradores pueden acceder
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta configuración'
            });
        }

        const result = await query(`
            SELECT 
                whatsapp_activo as activo,
                whatsapp_numero_telefono as numero_telefono,
                nombre_empresa,
                whatsapp_templates as templates,
                whatsapp_configuracion_envios as configuracion_envios,
                whatsapp_horarios_envio as horarios_envio,
                whatsapp_notificaciones_automaticas as notificaciones_automaticas
            FROM system.configuracion_empresa 
            WHERE activa = true
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            // Devolver configuración por defecto
            const defaultConfig = {
                activo: false,
                numero_telefono: '',
                nombre_empresa: '',
                templates: {
                    confirmacion_cita: 'Hola {cliente_nombre}, su cita para {mascota_nombre} ha sido confirmada para el {fecha} a las {hora}. Gracias por confiar en {empresa}.',
                    recordatorio_cita: 'Recordatorio: Tiene una cita programada para {mascota_nombre} mañana {fecha} a las {hora}. {empresa}',
                    cancelacion_cita: 'Su cita para {mascota_nombre} del {fecha} a las {hora} ha sido cancelada. Para reprogramar, contáctenos. {empresa}',
                    factura_enviada: 'Hola {cliente_nombre}, adjuntamos la factura de la atención de {mascota_nombre}. Total: ${total}. {empresa}',
                    formula_enviada: 'Hola {cliente_nombre}, adjuntamos la fórmula médica de {mascota_nombre} prescrita por {veterinario}. {empresa}',
                    recordatorio_pago: 'Recordatorio de pago pendiente. Factura #{numero_factura} por ${total}. {empresa}'
                },
                configuracion_envios: {
                    enviar_confirmaciones: true,
                    enviar_recordatorios: true,
                    tiempo_recordatorio: 24,
                    enviar_facturas: true,
                    enviar_formulas: true,
                    reintentos_max: 3,
                    tiempo_entre_reintentos: 5
                },
                horarios_envio: {
                    hora_inicio: '08:00',
                    hora_fin: '18:00',
                    dias_activos: [1, 2, 3, 4, 5, 6]
                },
                notificaciones_automaticas: {
                    activo: false,
                    auto_cita_confirmada: false,
                    auto_cita_recordatorio: false,
                    auto_consulta_completada: false,
                    auto_factura_generada: false,
                    limite_diario: 50,
                    intervalo_minimo_minutos: 5
                }
            };

            return res.json({
                success: true,
                data: defaultConfig
            });
        }

        const config = result.rows[0];
        
        // Parsear campos JSON si existen
        const responseConfig = {
            activo: config.activo || false,
            numero_telefono: config.numero_telefono || '',
            nombre_empresa: config.nombre_empresa || '',
            templates: config.templates ? (typeof config.templates === 'string' ? JSON.parse(config.templates) : config.templates) : {
                confirmacion_cita: 'Hola {cliente_nombre}, su cita para {mascota_nombre} ha sido confirmada para el {fecha} a las {hora}. Gracias por confiar en {empresa}.',
                recordatorio_cita: 'Recordatorio: Tiene una cita programada para {mascota_nombre} mañana {fecha} a las {hora}. {empresa}',
                cancelacion_cita: 'Su cita para {mascota_nombre} del {fecha} a las {hora} ha sido cancelada. Para reprogramar, contáctenos. {empresa}',
                factura_enviada: 'Hola {cliente_nombre}, adjuntamos la factura de la atención de {mascota_nombre}. Total: ${total}. {empresa}',
                formula_enviada: 'Hola {cliente_nombre}, adjuntamos la fórmula médica de {mascota_nombre} prescrita por {veterinario}. {empresa}',
                recordatorio_pago: 'Recordatorio de pago pendiente. Factura #{numero_factura} por ${total}. {empresa}'
            },
            configuracion_envios: config.configuracion_envios ? (typeof config.configuracion_envios === 'string' ? JSON.parse(config.configuracion_envios) : config.configuracion_envios) : {
                enviar_confirmaciones: true,
                enviar_recordatorios: true,
                tiempo_recordatorio: 24,
                enviar_facturas: true,
                enviar_formulas: true,
                reintentos_max: 3,
                tiempo_entre_reintentos: 5
            },
            horarios_envio: config.horarios_envio ? (typeof config.horarios_envio === 'string' ? JSON.parse(config.horarios_envio) : config.horarios_envio) : {
                hora_inicio: '08:00',
                hora_fin: '18:00',
                dias_activos: [1, 2, 3, 4, 5, 6]
            },
            notificaciones_automaticas: config.notificaciones_automaticas ? (typeof config.notificaciones_automaticas === 'string' ? JSON.parse(config.notificaciones_automaticas) : config.notificaciones_automaticas) : {
                activo: false,
                auto_cita_confirmada: false,
                auto_cita_recordatorio: false,
                auto_consulta_completada: false,
                auto_factura_generada: false,
                limite_diario: 50,
                intervalo_minimo_minutos: 5
            }
        };

        res.json({
            success: true,
            data: responseConfig
        });

    } catch (error) {
        console.error('Error obteniendo configuración de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar configuración de WhatsApp
 * @route PUT /api/admin/empresa/whatsapp
 */
export const updateWhatsAppConfig = async (req, res) => {
    try {
        // Solo administradores pueden configurar WhatsApp
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden configurar WhatsApp'
            });
        }

        const {
            activo,
            numero_telefono,
            nombre_empresa,
            templates,
            configuracion_envios,
            horarios_envio,
            notificaciones_automaticas
        } = req.body;

        // Validaciones básicas
        if (activo && !numero_telefono) {
            return res.status(400).json({
                success: false,
                message: 'El número de teléfono es requerido cuando WhatsApp está activo'
            });
        }

        if (activo && !nombre_empresa) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la empresa es requerido cuando WhatsApp está activo'
            });
        }

        // Verificar si existe configuración
        const existingConfig = await query(`
            SELECT id_configuracion 
            FROM system.configuracion_empresa 
            WHERE activa = true
        `);

        if (existingConfig.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración de empresa. Configure primero la empresa.'
            });
        }

        // Actualizar configuración
        const result = await query(`
            UPDATE system.configuracion_empresa 
            SET 
                whatsapp_activo = $1,
                whatsapp_numero_telefono = $2,
                nombre_empresa = COALESCE($3, nombre_empresa),
                whatsapp_templates = $4,
                whatsapp_configuracion_envios = $5,
                whatsapp_horarios_envio = $6,
                whatsapp_notificaciones_automaticas = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE activa = true
            RETURNING 
                whatsapp_activo as activo,
                whatsapp_numero_telefono as numero_telefono,
                nombre_empresa,
                whatsapp_templates as templates,
                whatsapp_configuracion_envios as configuracion_envios,
                whatsapp_horarios_envio as horarios_envio,
                whatsapp_notificaciones_automaticas as notificaciones_automaticas
        `, [
            activo,
            numero_telefono,
            nombre_empresa,
            JSON.stringify(templates),
            JSON.stringify(configuracion_envios),
            JSON.stringify(horarios_envio),
            JSON.stringify(notificaciones_automaticas)
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se pudo actualizar la configuración'
            });
        }

        const empresaConfig = result.rows[0];
        
        // Parsear campos JSON en la respuesta
        const responseConfig = {
            activo: config.activo,
            numero_telefono: config.numero_telefono,
            nombre_empresa: config.nombre_empresa,
            templates: typeof config.templates === 'string' ? JSON.parse(config.templates) : config.templates,
            configuracion_envios: typeof config.configuracion_envios === 'string' ? JSON.parse(config.configuracion_envios) : config.configuracion_envios,
            horarios_envio: typeof config.horarios_envio === 'string' ? JSON.parse(config.horarios_envio) : config.horarios_envio,
            notificaciones_automaticas: typeof config.notificaciones_automaticas === 'string' ? JSON.parse(config.notificaciones_automaticas) : config.notificaciones_automaticas
        };

        res.json({
            success: true,
            message: 'Configuración de WhatsApp actualizada exitosamente',
            data: responseConfig
        });

    } catch (error) {
        console.error('Error actualizando configuración de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const configureWhatsApp = async (req, res) => {
    try {
        // Solo administradores pueden configurar WhatsApp
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden configurar WhatsApp'
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
            whatsapp_business_number,
            whatsapp_api_token,
            whatsapp_webhook_verify_token,
            whatsapp_activo
        } = req.body;

        const result = await query(`
            UPDATE system.configuracion_empresa 
            SET 
                whatsapp_business_number = $1,
                whatsapp_api_token = $2,
                whatsapp_webhook_verify_token = $3,
                whatsapp_activo = $4,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $5
            WHERE activa = true
            RETURNING whatsapp_business_number, whatsapp_activo
        `, [
            whatsapp_business_number,
            whatsapp_api_token,
            whatsapp_webhook_verify_token,
            whatsapp_activo,
            req.user.id_usuario
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración activa'
            });
        }

        res.json({
            success: true,
            message: 'Configuración de WhatsApp actualizada exitosamente',
            data: {
                whatsapp_business_number: result.rows[0].whatsapp_business_number,
                whatsapp_activo: result.rows[0].whatsapp_activo
            }
        });

    } catch (error) {
        console.error('Error al configurar WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener días especiales y festivos
 * @route GET /api/admin/empresa/dias-especiales
 */
export const getDiasEspeciales = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const result = await query(`
            SELECT 
                de.id_dia,
                de.fecha,
                de.motivo,
                de.cerrado,
                de.hora_apertura,
                de.hora_cierre
            FROM system.dias_especiales de
            JOIN system.configuracion_empresa ce ON de.id_config = ce.id_config
            WHERE ce.activa = true 
            AND EXTRACT(YEAR FROM de.fecha) = $1
            ORDER BY de.fecha
        `, [year]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener días especiales:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Agregar día especial
 * @route POST /api/admin/empresa/dias-especiales
 */
export const addDiaEspecial = async (req, res) => {
    try {
        // Solo administradores pueden agregar días especiales
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden gestionar días especiales'
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

        const { fecha, motivo, cerrado, hora_apertura, hora_cierre } = req.body;

        // Obtener ID de configuración activa
        const configResult = await query(`
            SELECT id_config FROM system.configuracion_empresa WHERE activa = true LIMIT 1
        `);

        if (configResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay configuración de empresa activa'
            });
        }

        const result = await query(`
            INSERT INTO system.dias_especiales 
            (id_config, fecha, motivo, cerrado, hora_apertura, hora_cierre)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            configResult.rows[0].id_config,
            fecha,
            motivo,
            cerrado,
            cerrado ? null : hora_apertura,
            cerrado ? null : hora_cierre
        ]);

        res.status(201).json({
            success: true,
            message: 'Día especial agregado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al agregar día especial:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener siguiente número de factura disponible
 * @route GET /api/admin/empresa/siguiente-numero/factura
 */
export const getSiguienteNumeroFactura = async (req, res) => {
    try {
        const result = await query('SELECT increment_factura_number() as numero_factura');
        
        res.json({
            success: true,
            data: {
                numero_factura: result.rows[0].numero_factura
            }
        });

    } catch (error) {
        console.error('Error al obtener siguiente número de factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Test de configuración de WhatsApp
 * @route POST /api/admin/empresa/whatsapp/test
 */
export const testWhatsAppConfig = async (req, res) => {
    try {
        // Solo administradores pueden hacer tests
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden realizar tests'
            });
        }

        const { numero_prueba } = req.body;

        if (!numero_prueba) {
            return res.status(400).json({
                success: false,
                message: 'Número de prueba requerido'
            });
        }

        // Obtener configuración de WhatsApp
        const configResult = await query(`
            SELECT whatsapp_business_number, whatsapp_api_token, whatsapp_activo 
            FROM system.configuracion_empresa 
            WHERE activa = true
        `);

        if (configResult.rows.length === 0 || !configResult.rows[0].whatsapp_activo) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está configurado o no está activo'
            });
        }

        // TODO: Implementar envío real de mensaje de prueba
        // Por ahora simular respuesta exitosa
        res.json({
            success: true,
            message: 'Mensaje de prueba enviado exitosamente',
            data: {
                numero_destino: numero_prueba,
                estado: 'enviado',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al probar WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener límites de WhatsApp
 * @route GET /api/admin/empresa/whatsapp/limites
 */
export const getWhatsAppLimites = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta configuración'
            });
        }

        const result = await query(`
            SELECT whatsapp_limites_config
            FROM system.configuracion_empresa 
            WHERE activa = true
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración de empresa'
            });
        }

        const config = result.rows[0];
        
        // Valores por defecto si no existe configuración
        const limitesDefault = {
            limite_diario: 50,
            limite_por_hora: 15,
            intervalo_minimo: 20,
            max_reintentos: 3,
            limitar_confirmaciones: false,
            limite_confirmaciones_dia: 20,
            limitar_recordatorios: false,
            limite_recordatorios_dia: 15,
            limitar_facturas: false,
            limite_facturas_dia: 10,
            limitar_manuales: false,
            limite_manuales_dia: 5,
            pausas_automaticas: true,
            pausa_limite_hora: 30,
            pausa_limite_dia: 8
        };

        const limites = config.whatsapp_limites_config 
            ? (typeof config.whatsapp_limites_config === 'string' 
                ? JSON.parse(config.whatsapp_limites_config) 
                : config.whatsapp_limites_config)
            : limitesDefault;

        res.json({
            success: true,
            data: limites
        });

    } catch (error) {
        console.error('Error obteniendo límites de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar límites de WhatsApp
 * @route PUT /api/admin/empresa/whatsapp/limites
 */
export const updateWhatsAppLimites = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden configurar límites'
            });
        }

        const {
            limite_diario,
            limite_por_hora,
            intervalo_minimo,
            max_reintentos,
            limitar_confirmaciones,
            limite_confirmaciones_dia,
            limitar_recordatorios,
            limite_recordatorios_dia,
            limitar_facturas,
            limite_facturas_dia,
            limitar_manuales,
            limite_manuales_dia,
            pausas_automaticas,
            pausa_limite_hora,
            pausa_limite_dia
        } = req.body;

        // Validaciones básicas
        if (limite_diario < 1 || limite_diario > 200) {
            return res.status(400).json({
                success: false,
                message: 'El límite diario debe estar entre 1 y 200 mensajes'
            });
        }

        if (limite_por_hora < 1 || limite_por_hora > 50) {
            return res.status(400).json({
                success: false,
                message: 'El límite por hora debe estar entre 1 y 50 mensajes'
            });
        }

        const limitesConfig = {
            limite_diario,
            limite_por_hora,
            intervalo_minimo,
            max_reintentos,
            limitar_confirmaciones,
            limite_confirmaciones_dia,
            limitar_recordatorios,
            limite_recordatorios_dia,
            limitar_facturas,
            limite_facturas_dia,
            limitar_manuales,
            limite_manuales_dia,
            pausas_automaticas,
            pausa_limite_hora,
            pausa_limite_dia
        };

        const result = await query(`
            UPDATE system.configuracion_empresa 
            SET 
                whatsapp_limites_config = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE activa = true
            RETURNING whatsapp_limites_config
        `, [JSON.stringify(limitesConfig)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se pudo actualizar la configuración'
            });
        }

        res.json({
            success: true,
            message: 'Límites de WhatsApp actualizados exitosamente',
            data: limitesConfig
        });

    } catch (error) {
        console.error('Error actualizando límites de WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estado actual de límites de WhatsApp
 * @route GET /api/admin/empresa/whatsapp/estado-limites
 */
export const getWhatsAppEstadoLimites = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta información'
            });
        }

        // Obtener contadores de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const horaActual = new Date();
        const horaInicio = new Date(horaActual);
        horaInicio.setMinutes(0, 0, 0);

        const result = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE DATE(fecha) = $1) as mensajes_hoy,
                COUNT(*) FILTER (WHERE fecha >= $2) as mensajes_hora,
                COUNT(*) FILTER (WHERE DATE(fecha) = $1 AND tipo_documento = 'confirmacion') as confirmaciones_hoy,
                COUNT(*) FILTER (WHERE DATE(fecha) = $1 AND tipo_documento = 'recordatorio') as recordatorios_hoy,
                COUNT(*) FILTER (WHERE DATE(fecha) = $1 AND tipo_documento = 'factura') as facturas_hoy,
                COUNT(*) FILTER (WHERE DATE(fecha) = $1 AND tipo_documento = 'manual') as manuales_hoy
            FROM system.whatsapp_log 
            WHERE estado IN ('enviado', 'entregado', 'leido')
        `, [hoy, horaInicio]);

        const contadores = result.rows[0];

        // TODO: Implementar lógica real de pausas basada en límites
        const estadoLimites = {
            mensajes_hoy: parseInt(contadores.mensajes_hoy) || 0,
            mensajes_hora: parseInt(contadores.mensajes_hora) || 0,
            pausado: false,
            pausa_hasta: null,
            limites_por_tipo: {
                confirmaciones: parseInt(contadores.confirmaciones_hoy) || 0,
                recordatorios: parseInt(contadores.recordatorios_hoy) || 0,
                facturas: parseInt(contadores.facturas_hoy) || 0,
                manuales: parseInt(contadores.manuales_hoy) || 0
            }
        };

        res.json({
            success: true,
            data: estadoLimites
        });

    } catch (error) {
        console.error('Error obteniendo estado de límites:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Resetear contadores de límites
 * @route POST /api/admin/empresa/whatsapp/reset-contadores
 */
export const resetWhatsAppContadores = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden resetear contadores'
            });
        }

        // TODO: Implementar reseteo real de contadores
        // Por ahora solo retornamos éxito
        
        res.json({
            success: true,
            message: 'Contadores reseteados exitosamente'
        });

    } catch (error) {
        console.error('Error reseteando contadores:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reanudar envíos de WhatsApp
 * @route POST /api/admin/empresa/whatsapp/reanudar
 */
export const reanudarWhatsAppEnvios = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden reanudar envíos'
            });
        }

        // TODO: Implementar reanudación real de envíos
        // Por ahora solo retornamos éxito
        
        res.json({
            success: true,
            message: 'Envíos reanudados exitosamente'
        });

    } catch (error) {
        console.error('Error reanudando envíos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};