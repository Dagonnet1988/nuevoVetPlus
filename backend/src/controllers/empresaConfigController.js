/**
 * @fileoverview Controlador para gestión de configuración de empresa
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query, getClient } from '../config/database.js';
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
        // Obtener configuración de empresa
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const configResult = await query(`
            SELECT * FROM system.configuracion_empresa
            WHERE activa = true AND id_tenant = $1
            LIMIT 1
        `, [tenantId]);

        let empresaConfig = configResult.rows[0];
        if (!empresaConfig) {
            const defaultConfig = await query(`
                INSERT INTO system.configuracion_empresa (
                    nombre_empresa, nit, direccion, telefono, email, ciudad, sitio_web, eslogan,
                    id_tenant, created_by, updated_by, activa
                ) VALUES (
                    'Mi Clínica Veterinaria',
                    'POR-DEFINIR',
                    'Por definir',
                    null,
                    null,
                    null,
                    null,
                    null,
                    $1,
                    $2,
                    $2,
                    true
                )
                RETURNING *
            `, [tenantId, req.user?.id_usuario || null]);
            empresaConfig = defaultConfig.rows[0];
        }

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
            configuracion_numeracion,
            configuracion_general
        } = req.body;

        // Iniciar transacción con cliente dedicado del pool
        const txClient = await getClient();

        try {
            await txClient.query('BEGIN');
            // Preparar datos JSON para configuración
            const configGeneral = JSON.stringify(
                configuracion_general || {
                    moneda: 'COP',
                    zona_horaria: 'America/Bogota',
                    idioma: 'es',
                    formato_fecha: 'DD/MM/YYYY',
                    formato_hora: 'HH:mm'
                }
            );
            const configNumeracion = JSON.stringify(
                configuracion_numeracion || {
                    cita_prefijo: 'CIT',
                    cita_siguiente: 1,
                    cita_digitos: 6
                }
            );
            const tenantId = req.tenantId ?? req.user?.tenant_id;
            const updateResult = await txClient.query(`
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
                    configuracion_general = $9,
                    configuracion_numeracion = $10,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $11
                WHERE activa = true AND id_tenant = $12
                RETURNING id_config
            `, [
                nombre_empresa,
                nit,
                direccion,
                telefono,
                email,
                sitio_web || null,
                eslogan || null,
                ciudad || null,
                configGeneral,
                configNumeracion,
                req.user.id_usuario,
                tenantId
            ]);

            let configId = updateResult.rows[0]?.id_config;
            if (!configId) {
                const insertResult = await txClient.query(`
                    INSERT INTO system.configuracion_empresa (
                        nombre_empresa,
                        nit,
                        direccion,
                        telefono,
                        email,
                        sitio_web,
                        eslogan,
                        ciudad,
                        configuracion_general,
                        configuracion_numeracion,
                        activa,
                        id_tenant,
                        created_by,
                        updated_by
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$12
                    )
                    RETURNING id_config
                `, [
                    nombre_empresa,
                    nit,
                    direccion,
                    telefono,
                    email,
                    sitio_web || null,
                    eslogan || null,
                    ciudad || null,
                    configGeneral,
                    configNumeracion,
                    tenantId,
                    req.user.id_usuario
                ]);
                configId = insertResult.rows[0].id_config;
            }

            await txClient.query('COMMIT');

            // Obtener configuración actualizada (fuera de la transacción — usa el pool general)
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
            try { await txClient.query('ROLLBACK'); } catch {}
            throw error;
        } finally {
            txClient.release();
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
            WHERE activa = true AND id_tenant = $4
            RETURNING logo_url, logo_filename
        `, [logoUrl, file.originalname, req.user.id_usuario, req.tenantId ?? req.user?.tenant_id]);

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

