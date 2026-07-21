/**
 * @fileoverview Controlador para gestión de configuración de empresa
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query, getClient } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DIAS_ESPECIALES_TIPOS = new Set(['festivo', 'no_laborable', 'horario_especial', 'cumpleanos', 'ausencia']);

const isValidDateYMD = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTimeHM = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
const toHHmm = (value) => String(value || '').slice(0, 5);

const normalizeDiaEspecial = (input = {}, currentId = null) => {
    const fecha = String(input.fecha || '').trim();
    const descripcion = String(input.descripcion || '').trim();
    const tipo = String(input.tipo || '').trim();
    const activo = typeof input.activo === 'boolean' ? input.activo : true;
    const origen = String(input.origen || '').trim();

    if (!isValidDateYMD(fecha)) {
        throw new Error('La fecha debe tener formato YYYY-MM-DD');
    }

    if (!descripcion) {
        throw new Error('La descripción es obligatoria');
    }

    if (!DIAS_ESPECIALES_TIPOS.has(tipo)) {
        throw new Error('Tipo de día especial inválido');
    }

    const normalized = {
        id: currentId || randomUUID(),
        fecha,
        descripcion,
        tipo,
        activo,
        origen: origen === 'global' ? 'global' : 'tenant'
    };

    if (tipo === 'horario_especial') {
        const inicio = String(input?.horario_especial?.hora_inicio || '').trim();
        const fin = String(input?.horario_especial?.hora_fin || '').trim();

        if (!isValidTimeHM(inicio) || !isValidTimeHM(fin)) {
            throw new Error('El horario especial debe incluir hora_inicio y hora_fin en formato HH:mm');
        }

        normalized.horario_especial = {
            hora_inicio: inicio,
            hora_fin: fin
        };
    }

    return normalized;
};

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

        const empresaConfig = configResult.rows[0] || null;

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
            logo_url,
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
                    logo_url = COALESCE($9, logo_url),
                    configuracion_general = $10,
                    configuracion_numeracion = $11,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $12
                WHERE activa = true AND id_tenant = $13
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
                logo_url || null,
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
                        logo_url,
                        logo_filename,
                        configuracion_general,
                        configuracion_numeracion,
                        activa,
                        id_tenant,
                        created_by,
                        updated_by
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14,$15
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
                    logo_url || null,
                    logo_url ? path.basename(String(logo_url)) : null,
                    configGeneral,
                    configNumeracion,
                    tenantId,
                    req.user.id_usuario,
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

        // Si ya existe configuración activa, persistimos de inmediato.
        // Si no existe, devolvemos logo_url para aplicarlo al guardar el formulario.
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const result = await query(`
            UPDATE system.configuracion_empresa
            SET
                logo_url = $1,
                logo_filename = $2,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $3
            WHERE activa = true AND id_tenant = $4
            RETURNING logo_url, logo_filename
        `, [logoUrl, file.originalname, req.user.id_usuario, tenantId]);

        const persisted = result.rows.length > 0;

        res.json({
            success: true,
            message: persisted
              ? 'Logo subido y aplicado exitosamente'
              : 'Logo subido. Guarda la configuración de empresa para aplicarlo',
            data: {
                logo_url: persisted ? result.rows[0].logo_url : logoUrl,
                logo_filename: persisted ? result.rows[0].logo_filename : file.originalname,
                pending_save: !persisted,
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
 * Obtener días especiales (festivos/no laborables/horarios especiales)
 * @route GET /api/admin/empresa/dias-especiales
 */
export const getDiasEspeciales = async (req, res) => {
    try {
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const result = await query(`
            SELECT
                id_dia_especial,
                id_tenant,
                fecha,
                descripcion,
                tipo,
                hora_inicio,
                hora_fin,
                activo,
                metadata
            FROM system.dias_especiales
            WHERE activo = true
              AND (id_tenant IS NULL OR id_tenant = $1)
            ORDER BY fecha ASC, id_tenant NULLS FIRST, tipo ASC, descripcion ASC
        `, [tenantId]);

        const diasEspeciales = result.rows.map((row) => ({
            id: row.id_dia_especial,
            id_tenant: row.id_tenant,
            fecha: row.fecha,
            descripcion: row.descripcion,
            tipo: row.tipo,
            activo: row.activo,
            horario_especial: row.hora_inicio && row.hora_fin
                ? { hora_inicio: toHHmm(row.hora_inicio), hora_fin: toHHmm(row.hora_fin) }
                : undefined,
            metadata: row.metadata || {},
            origen: row.id_tenant ? 'tenant' : 'global',
            editable: true
        }));

        return res.json({
            success: true,
            data: diasEspeciales
        });

    } catch (error) {
        console.error('Error al obtener días especiales:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Crear día especial
 * @route POST /api/admin/empresa/dias-especiales
 */
export const addDiaEspecial = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden modificar días especiales'
            });
        }

        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const nuevoDia = normalizeDiaEspecial(req.body);
        const targetTenantId = nuevoDia.origen === 'global' ? null : tenantId;

        const existing = await query(
            `SELECT 1
             FROM system.dias_especiales
             WHERE COALESCE(id_tenant, '00000000-0000-0000-0000-000000000000'::uuid)
                   = COALESCE($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
               AND fecha = $2::date
               AND tipo = $3
               AND descripcion = $4
             LIMIT 1`,
            [targetTenantId, nuevoDia.fecha, nuevoDia.tipo, nuevoDia.descripcion]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un día especial igual para ese ámbito y fecha'
            });
        }

        const insert = await query(
            `INSERT INTO system.dias_especiales (
                id_dia_especial,
                id_tenant,
                fecha,
                descripcion,
                tipo,
                hora_inicio,
                hora_fin,
                activo,
                metadata,
                created_by,
                updated_by
            ) VALUES (
                $1::uuid,
                $2::uuid,
                $3::date,
                $4,
                $5,
                $6::time,
                $7::time,
                $8,
                '{}'::jsonb,
                $9,
                $9
            ) RETURNING *`,
            [
                nuevoDia.id,
                targetTenantId,
                nuevoDia.fecha,
                nuevoDia.descripcion,
                nuevoDia.tipo,
                nuevoDia.horario_especial?.hora_inicio || null,
                nuevoDia.horario_especial?.hora_fin || null,
                nuevoDia.activo,
                req.user.id_usuario
            ]
        );

        const row = insert.rows[0];
        const responseItem = {
            id: row.id_dia_especial,
            id_tenant: row.id_tenant,
            fecha: row.fecha,
            descripcion: row.descripcion,
            tipo: row.tipo,
            activo: row.activo,
            horario_especial: row.hora_inicio && row.hora_fin ? { hora_inicio: toHHmm(row.hora_inicio), hora_fin: toHHmm(row.hora_fin) } : undefined,
            origen: row.id_tenant ? 'tenant' : 'global',
            editable: true
        };

        return res.status(201).json({
            success: true,
            message: 'Día especial agregado exitosamente',
            data: responseItem
        });

    } catch (error) {
        console.error('Error al agregar día especial:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error interno del servidor'
        });
    }
};

/**
 * Actualizar día especial
 * @route PUT /api/admin/empresa/dias-especiales/:id
 */
export const updateDiaEspecial = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden modificar días especiales'
            });
        }

        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const diaId = String(req.params.id || '').trim();

        const existing = await query(
            `SELECT *
             FROM system.dias_especiales
             WHERE id_dia_especial = $1::uuid
               AND (id_tenant IS NULL OR id_tenant = $2)
             LIMIT 1`,
            [diaId, tenantId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el día especial solicitado'
            });
        }

        const actualizado = normalizeDiaEspecial(req.body, diaId);
        const current = existing.rows[0];
        const scopeRequest = String(req.body?.origen || '').trim();
        const targetTenantId = scopeRequest === 'global'
            ? null
            : scopeRequest === 'tenant'
                ? tenantId
                : current.id_tenant;

        const duplicatedByDate = await query(
            `SELECT 1
             FROM system.dias_especiales
             WHERE id_dia_especial <> $1::uuid
               AND COALESCE(id_tenant, '00000000-0000-0000-0000-000000000000'::uuid)
                   = COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
               AND fecha = $3::date
               AND tipo = $4
               AND descripcion = $5
             LIMIT 1`,
            [diaId, targetTenantId, actualizado.fecha, actualizado.tipo, actualizado.descripcion]
        );

        if (duplicatedByDate.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un día especial igual para ese ámbito y fecha'
            });
        }

        const updateResult = await query(
            `UPDATE system.dias_especiales
             SET
                id_tenant = $2::uuid,
                fecha = $3::date,
                descripcion = $4,
                tipo = $5,
                hora_inicio = $6::time,
                hora_fin = $7::time,
                activo = $8,
                updated_by = $9,
                updated_at = CURRENT_TIMESTAMP
             WHERE id_dia_especial = $1::uuid
             RETURNING *`,
            [
                diaId,
                targetTenantId,
                actualizado.fecha,
                actualizado.descripcion,
                actualizado.tipo,
                actualizado.horario_especial?.hora_inicio || null,
                actualizado.horario_especial?.hora_fin || null,
                actualizado.activo,
                req.user.id_usuario
            ]
        );

        const row = updateResult.rows[0];
        const responseItem = {
            id: row.id_dia_especial,
            id_tenant: row.id_tenant,
            fecha: row.fecha,
            descripcion: row.descripcion,
            tipo: row.tipo,
            activo: row.activo,
            horario_especial: row.hora_inicio && row.hora_fin ? { hora_inicio: toHHmm(row.hora_inicio), hora_fin: toHHmm(row.hora_fin) } : undefined,
            origen: row.id_tenant ? 'tenant' : 'global',
            editable: true
        };

        return res.json({
            success: true,
            message: 'Día especial actualizado exitosamente',
            data: responseItem
        });

    } catch (error) {
        console.error('Error al actualizar día especial:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error interno del servidor'
        });
    }
};

/**
 * Eliminar día especial
 * @route DELETE /api/admin/empresa/dias-especiales/:id
 */
export const deleteDiaEspecial = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden modificar días especiales'
            });
        }

        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const diaId = String(req.params.id || '').trim();

        const remove = await query(
            `UPDATE system.dias_especiales
             SET
                activo = false,
                updated_by = $3,
                updated_at = CURRENT_TIMESTAMP
             WHERE id_dia_especial = $1::uuid
               AND activo = true
               AND (id_tenant IS NULL OR id_tenant = $2)
             RETURNING id_dia_especial`,
            [diaId, tenantId, req.user.id_usuario]
        );

        if (remove.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el día especial solicitado'
            });
        }

        return res.json({
            success: true,
            message: 'Día especial eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar día especial:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

