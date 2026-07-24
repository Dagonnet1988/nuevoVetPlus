import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../services/emailService.js';
import { renderEmailTemplate } from '../services/emailTemplateService.js';

/**
 * Controlador para gestión de usuarios
 */

/**
 * Crear nuevo usuario
 */
export const createUser = async (req, res) => {
    try {
        // Las validaciones ya fueron procesadas por validateRequest middleware
        // No necesitamos validar aquí nuevamente

        const { 
            nombre, 
            apellido,
            email, 
            documento,
            tipo_documento = 'CC',
            telefono,
            direccion,
            password_temporal, 
            rol,
            especialidad,
            numero_licencia,
            activo = true,
            enviar_credenciales = true,
            forzar_cambio_password = true
        } = req.body;

        const tenantId = req.tenantId ?? req.user?.tenant_id;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                message: 'No se pudo resolver la clínica del usuario autenticado'
            });
        }

        console.log('📝 Creando usuario con datos:', {
            nombre,
            apellido,
            email,
            documento,
            tipo_documento,
            rol,
            activo
        });

        // Verificar si el email ya existe en el tenant actual
        const existingEmail = await query(
            'SELECT id_usuario FROM vetplus_auth.usuarios WHERE LOWER(email) = LOWER($1) AND id_tenant = $2',
            [email.toLowerCase(), tenantId]
        );

        if (existingEmail.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con ese email'
            });
        }

        // Verificar si el documento ya existe en el tenant actual
        const existingDocument = await query(
            'SELECT id_usuario FROM vetplus_auth.usuarios WHERE documento = $1 AND id_tenant = $2',
            [documento, tenantId]
        );

        if (existingDocument.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con ese documento'
            });
        }

        // Generar UUID y password si no se proporcionó
        const id_usuario = uuidv4();
        const finalPassword = password_temporal || `VetPlus${Math.random().toString(36).slice(-8)}`;
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

        // Crear usuario
        const result = await query(`
            INSERT INTO vetplus_auth.usuarios (
                id_usuario, nombre, apellido, email, documento, tipo_documento,
                telefono, direccion, password_hash, rol, especialidad, numero_licencia,
                activo, password_temporal, debe_cambiar_password, id_tenant, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id_usuario, nombre, apellido, email, documento, rol, activo, avatar_url, id_tenant, created_at
        `, [
            id_usuario, 
            nombre, 
            apellido,
            email.toLowerCase(), 
            documento,
            tipo_documento,
            telefono || null,
            direccion || null,
            passwordHash, 
            rol,
            especialidad || null,
            numero_licencia || null,
            activo,
            true, // password_temporal es booleano
            forzar_cambio_password,
            tenantId
        ]);

        const newUser = result.rows[0];

        let warningMessage = null;

        if (enviar_credenciales && newUser.email) {
            try {
                const rendered = await renderEmailTemplate({
                    tenantId,
                    key: 'usuario_credenciales',
                    variables: {
                        usuario_nombre: `${newUser.nombre} ${newUser.apellido || ''}`.trim(),
                        usuario_documento: newUser.documento,
                        usuario_correo: newUser.documento,
                        usuario_email: newUser.documento,
                        password_temporal: finalPassword
                    },
                    userId: req.user?.id_usuario || req.user?.id || null
                });

                if (rendered) {
                    await sendEmail({
                        tenantId,
                        to: newUser.email,
                        subject: rendered.asunto_render,
                        html: rendered.cuerpo_html_render,
                        text: rendered.cuerpo_text_render || undefined,
                        logContext: {
                            tipo_envio: 'usuario_credenciales',
                            userId: req.user?.id_usuario || req.user?.id || null,
                            metadata: {
                                id_usuario: newUser.id_usuario,
                                rol: newUser.rol
                            }
                        }
                    });
                }
            } catch (emailError) {
                console.error('No se pudo enviar correo de credenciales al usuario nuevo:', emailError.message);
                warningMessage = 'Usuario creado, pero no se pudieron enviar credenciales por correo. Configura Correo en Configuracion.';
            }
        }

        console.log(`✅ Usuario creado: ${newUser.email} (${newUser.documento}) con rol ${newUser.rol} por ${req.user.email || req.user.documento}`);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                ...newUser,
                password_temporal: enviar_credenciales ? finalPassword : undefined
            },
            warning: warningMessage
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Listar usuarios con filtros y paginación
 */
export const getUsers = async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            rol,
            activo,
            search
        } = req.query;

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        // Validar límites de paginación
        const maxLimit = 100;
        const validLimit = Math.min(parseInt(limit), maxLimit);
        const validOffset = Math.max(parseInt(offset), 0);

        let selectSQL = `
            SELECT 
                id_usuario,
                nombre,
                apellido,
                email,
                documento,
                tipo_documento,
                telefono,
                rol,
                especialidad,
                numero_licencia,
                activo,
                ultimo_login,
                intentos_login,
                bloqueado_hasta,
                avatar_url,
                firma_url,
                created_at,
                updated_at
            FROM vetplus_auth.usuarios
            WHERE 1=1
        `;

        const values = [tenantId];
        let paramCount = 1;
        selectSQL += ` AND id_tenant = $1`;

        // Filtros opcionales
        if (rol) {
            paramCount++;
            selectSQL += ` AND rol = $${paramCount}`;
            values.push(rol);
        }

        if (activo !== undefined) {
            paramCount++;
            selectSQL += ` AND activo = $${paramCount}`;
            values.push(activo === 'true');
        }

        if (search) {
            paramCount++;
            selectSQL += ` AND (nombre ILIKE $${paramCount} OR apellido ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            values.push(`%${search}%`);
        }

        selectSQL += ` ORDER BY created_at DESC`;

        // Paginación
        paramCount++;
        selectSQL += ` LIMIT $${paramCount}`;
        values.push(validLimit);

        paramCount++;
        selectSQL += ` OFFSET $${paramCount}`;
        values.push(validOffset);

        const result = await query(selectSQL, values);

        // Contar total de registros
        let countSQL = 'SELECT COUNT(*) FROM vetplus_auth.usuarios WHERE id_tenant = $1';
        const countValues = [tenantId];
        let countParamCount = 1;

        if (rol) {
            countParamCount++;
            countSQL += ` AND rol = $${countParamCount}`;
            countValues.push(rol);
        }

        if (activo !== undefined) {
            countParamCount++;
            countSQL += ` AND activo = $${countParamCount}`;
            countValues.push(activo === 'true');
        }

        if (search) {
            countParamCount++;
            countSQL += ` AND (nombre ILIKE $${countParamCount} OR apellido ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
            countValues.push(`%${search}%`);
        }

        const countResult = await query(countSQL, countValues);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: validLimit,
                offset: validOffset,
                pages: Math.ceil(total / validLimit)
            }
        });

    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener usuario por ID
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                id_usuario,
                nombre,
                apellido,
                email,
                telefono,
                direccion,
                documento,
                tipo_documento,
                rol,
                especialidad,
                numero_licencia,
                activo,
                ultimo_login,
                created_at,
                updated_at,
                password_temporal,
                debe_cambiar_password,
                avatar_url,
                firma_url
            FROM vetplus_auth.usuarios 
            WHERE id_usuario = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar usuario
 */
export const updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de usuario inválidos',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { nombre, apellido, email, rol, especialidad, numero_licencia, activo, telefono, direccion, tipo_documento } = req.body;

        // Verificar que el usuario existe
        const existingUser = await query(
            'SELECT id_usuario, email, rol FROM vetplus_auth.usuarios WHERE id_usuario = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar permisos de actualización
        const isAdmin = req.user.rol === 'admin';
        const isSelfUpdate = req.user.id_usuario === id;

        // Solo admin puede actualizar otros usuarios
        if (!isAdmin && !isSelfUpdate) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar este usuario'
            });
        }

        // Solo admin puede cambiar roles y estado activo
        if (!isAdmin && (rol !== undefined || activo !== undefined)) {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden cambiar roles o estado de usuarios'
            });
        }

        // Verificar si el email ya existe en otro usuario
        if (email && email.toLowerCase() !== existingUser.rows[0].email) {
            const emailExists = await query(
                'SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = $1 AND id_usuario != $2',
                [email.toLowerCase(), id]
            );

            if (emailExists.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otro usuario con ese email'
                });
            }
        }

        // Construir query de actualización dinámico
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (nombre) {
            paramCount++;
            updateFields.push(`nombre = $${paramCount}`);
            updateValues.push(nombre);
        }

        if (apellido) {
            paramCount++;
            updateFields.push(`apellido = $${paramCount}`);
            updateValues.push(apellido);
        }

        if (email) {
            paramCount++;
            updateFields.push(`email = $${paramCount}`);
            updateValues.push(email.toLowerCase());
        }

        if (rol) {
            paramCount++;
            updateFields.push(`rol = $${paramCount}`);
            updateValues.push(rol);
        }

        if (especialidad !== undefined) {
            paramCount++;
            updateFields.push(`especialidad = $${paramCount}`);
            updateValues.push(especialidad);
        }

        if (numero_licencia !== undefined) {
            paramCount++;
            updateFields.push(`numero_licencia = $${paramCount}`);
            updateValues.push(numero_licencia);
        }

        if (activo !== undefined) {
            paramCount++;
            updateFields.push(`activo = $${paramCount}`);
            updateValues.push(activo);
        }

        // Campos adicionales que solo admin puede actualizar
        if (isAdmin) {
            if (telefono !== undefined) {
                paramCount++;
                updateFields.push(`telefono = $${paramCount}`);
                updateValues.push(telefono);
            }

            if (direccion !== undefined) {
                paramCount++;
                updateFields.push(`direccion = $${paramCount}`);
                updateValues.push(direccion);
            }

            if (tipo_documento !== undefined) {
                paramCount++;
                updateFields.push(`tipo_documento = $${paramCount}`);
                updateValues.push(tipo_documento);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        const updateQuery = `
            UPDATE vetplus_auth.usuarios 
            SET ${updateFields.join(', ')}
            WHERE id_usuario = $${paramCount + 1}
            RETURNING id_usuario, nombre, apellido, email, rol, especialidad, numero_licencia, activo, telefono, direccion, tipo_documento, avatar_url, updated_at
        `;

        const result = await query(updateQuery, updateValues);
        const updatedUser = result.rows[0];

        console.log(`✅ Usuario actualizado: ${updatedUser.email} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: updatedUser
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Desactivar usuario (soft delete)
 */
export const deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const existingUser = await query(
            'SELECT id_usuario, email, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = existingUser.rows[0];

        // Prevenir auto-desactivación
        if (user.id_usuario === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propia cuenta'
            });
        }

        if (!user.activo) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya está desactivado'
            });
        }

        // Desactivar usuario
        await query(
            'UPDATE vetplus_auth.usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $1',
            [id]
        );

        console.log(`⚠️ Usuario desactivado: ${user.email} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Cambiar rol de usuario
 */
export const changeUserRole = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { rol } = req.body;

        // Verificar que el usuario existe
        const existingUser = await query(
            'SELECT id_usuario, email, rol as rol_actual FROM vetplus_auth.usuarios WHERE id_usuario = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = existingUser.rows[0];

        // Prevenir cambio de rol propio
        if (user.id_usuario === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol'
            });
        }

        // Actualizar rol
        const result = await query(`
            UPDATE vetplus_auth.usuarios 
            SET rol = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id_usuario = $2
            RETURNING id_usuario, email, rol
        `, [rol, id]);

        const updatedUser = result.rows[0];

        console.log(`🔄 Rol cambiado: ${updatedUser.email} de ${user.rol_actual} a ${rol} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Rol de usuario actualizado exitosamente',
            data: updatedUser
        });

    } catch (error) {
        console.error('Error cambiando rol de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reactivar usuario
 */
export const reactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const existingUser = await query(
            'SELECT id_usuario, email, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = existingUser.rows[0];

        if (user.activo) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya está activo'
            });
        }

        // Reactivar usuario y limpiar bloqueos
        await query(`
            UPDATE vetplus_auth.usuarios 
            SET activo = true, 
                intentos_login = 0, 
                bloqueado_hasta = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_usuario = $1
        `, [id]);

        console.log(`✅ Usuario reactivado: ${user.email} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Usuario reactivado exitosamente'
        });

    } catch (error) {
        console.error('Error reactivando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estadísticas de usuarios
 */
export const getUserStats = async (req, res) => {
    try {
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const result = await query(`
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN activo = true THEN 1 END) as usuarios_activos,
                COUNT(CASE WHEN activo = false THEN 1 END) as usuarios_inactivos,
                COUNT(CASE WHEN rol = 'admin' THEN 1 END) as administradores,
                COUNT(CASE WHEN rol = 'vet' THEN 1 END) as veterinarios,
                COUNT(CASE WHEN rol = 'aux' THEN 1 END) as auxiliares,
                COUNT(CASE WHEN ultimo_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as usuarios_activos_semana,
                COUNT(CASE WHEN bloqueado_hasta > CURRENT_TIMESTAMP THEN 1 END) as usuarios_bloqueados
            FROM vetplus_auth.usuarios
            WHERE id_tenant = $1
        `, [tenantId]);

        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                ...stats,
                total_usuarios: parseInt(stats.total_usuarios),
                usuarios_activos: parseInt(stats.usuarios_activos),
                usuarios_inactivos: parseInt(stats.usuarios_inactivos),
                administradores: parseInt(stats.administradores),
                veterinarios: parseInt(stats.veterinarios),
                auxiliares: parseInt(stats.auxiliares),
                usuarios_activos_semana: parseInt(stats.usuarios_activos_semana),
                usuarios_bloqueados: parseInt(stats.usuarios_bloqueados)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Subir firma del veterinario
 * @route POST /api/auth/users/:id/firma
 */
export const uploadFirma = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const isSelf = req.user.id_usuario === id;
        const isAdmin = req.user.rol === 'admin';
        if (!isSelf && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar esta firma' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
        }

        const firmaUrl = `/uploads/firmas/${req.file.filename}`;

        const result = await query(
            `UPDATE vetplus_auth.usuarios
             SET firma_url = $1, updated_at = NOW()
             WHERE id_usuario = $2 AND id_tenant = $3
             RETURNING id_usuario, firma_url`,
            [firmaUrl, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            message: 'Firma subida exitosamente',
            data: { firma_url: result.rows[0].firma_url }
        });
    } catch (error) {
        console.error('Error subiendo firma:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Subir avatar de usuario
 * @route POST /api/auth/users/:id/avatar
 */
export const uploadAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const isSelf = req.user.id_usuario === id;
        const isAdmin = req.user.rol === 'admin';
        if (!isSelf && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar este avatar' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const result = await query(
            `UPDATE vetplus_auth.usuarios
             SET avatar_url = $1, updated_at = NOW()
             WHERE id_usuario = $2 AND id_tenant = $3
             RETURNING id_usuario, avatar_url`,
            [avatarUrl, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            message: 'Avatar actualizado exitosamente',
            data: { avatar_url: result.rows[0].avatar_url }
        });
    } catch (error) {
        console.error('Error subiendo avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
