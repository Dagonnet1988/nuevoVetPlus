/**
 * @fileoverview Controlador para gestión de configuración de empresa
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query } from '../config/database.js';
import { validationResult } from 'express-validator';
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

        const result = await query(`
            SELECT 
                ce.*,
                array_agg(
                    json_build_object(
                        'dia_semana', ha.dia_semana,
                        'nombre_dia', CASE ha.dia_semana
                            WHEN 0 THEN 'Domingo'
                            WHEN 1 THEN 'Lunes'
                            WHEN 2 THEN 'Martes'
                            WHEN 3 THEN 'Miércoles'
                            WHEN 4 THEN 'Jueves'
                            WHEN 5 THEN 'Viernes'
                            WHEN 6 THEN 'Sábado'
                        END,
                        'hora_apertura', ha.hora_apertura,
                        'hora_cierre', ha.hora_cierre,
                        'cerrado', ha.cerrado,
                        'notas', ha.notas
                    ) ORDER BY ha.dia_semana
                ) FILTER (WHERE ha.id_horario IS NOT NULL) as horarios
            FROM system.configuracion_empresa ce
            LEFT JOIN system.horarios_atencion ha ON ce.id_config = ha.id_config
            WHERE ce.activa = true
            GROUP BY ce.id_config
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay configuración de empresa definida'
            });
        }

        const config = result.rows[0];
        
        // No enviar datos sensibles como tokens en GET requests normales
        delete config.whatsapp_api_token;
        delete config.whatsapp_webhook_verify_token;

        res.json({
            success: true,
            data: config
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
            horarios
        } = req.body;

        // Iniciar transacción
        await query('BEGIN');

        try {
            // Actualizar configuración principal
            const updateResult = await query(`
                UPDATE system.configuracion_empresa 
                SET 
                    nombre_empresa = $1,
                    nit = $2,
                    direccion = $3,
                    telefono = $4,
                    email = $5,
                    ciudad = $6,
                    departamento = $7,
                    codigo_postal = $8,
                    website = $9,
                    regimen_tributario = $10,
                    representante_legal = $11,
                    cedula_representante = $12,
                    pie_factura = $13,
                    mensaje_whatsapp_factura = $14,
                    mensaje_whatsapp_formula = $15,
                    whatsapp_business_number = $16,
                    prefijo_factura = $17,
                    prefijo_orden_compra = $18,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $19
                WHERE activa = true
                RETURNING id_config
            `, [
                nombre_empresa, nit, direccion, telefono, email, ciudad, departamento,
                codigo_postal, website, regimen_tributario, representante_legal, 
                cedula_representante, pie_factura, mensaje_whatsapp_factura, 
                mensaje_whatsapp_formula, whatsapp_business_number, prefijo_factura,
                prefijo_orden_compra, req.user.id_usuario
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