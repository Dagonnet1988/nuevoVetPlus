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
                    configuracion_general = $15,
                    configuracion_numeracion = $16,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $17
                WHERE activa = true
                RETURNING id_config
            `, [
                nombre_empresa, nit, direccion, telefono, email, sitio_web, eslogan,
                ciudad, departamento, codigo_postal, website, regimen_tributario,
                representante_legal, cedula_representante, configGeneral, configNumeracion,
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
