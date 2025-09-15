import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

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

        console.log('📝 Creando usuario con datos:', {
            nombre,
            apellido,
            email,
            documento,
            tipo_documento,
            rol,
            activo
        });

        // Verificar si el email ya existe
        const existingEmail = await query(
            'SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingEmail.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con ese email'
            });
        }

        // Verificar si el documento ya existe
        const existingDocument = await query(
            'SELECT id_usuario FROM vetplus_auth.usuarios WHERE documento = $1',
            [documento]
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
                activo, password_temporal, debe_cambiar_password, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id_usuario, nombre, apellido, email, documento, rol, activo, created_at
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
            forzar_cambio_password
        ]);

        const newUser = result.rows[0];

        console.log(`✅ Usuario creado: ${newUser.email} (${newUser.documento}) con rol ${newUser.rol} por ${req.user.email || req.user.documento}`);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                ...newUser,
                password_temporal: enviar_credenciales ? finalPassword : undefined
            }
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

        // Validar límites de paginación
        const maxLimit = 100;
        const validLimit = Math.min(parseInt(limit), maxLimit);
        const validOffset = Math.max(parseInt(offset), 0);

        let selectSQL = `
            SELECT 
                id_usuario,
                nombre,
                email,
                rol,
                activo,
                ultimo_login,
                intentos_login,
                bloqueado_hasta,
                created_at,
                updated_at
            FROM vetplus_auth.usuarios
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 0;

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
            selectSQL += ` AND (nombre ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
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
        let countSQL = 'SELECT COUNT(*) FROM vetplus_auth.usuarios WHERE 1=1';
        const countValues = [];
        let countParamCount = 0;

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
            countSQL += ` AND (nombre ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
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
                debe_cambiar_password
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
            RETURNING id_usuario, nombre, apellido, email, rol, especialidad, numero_licencia, activo, telefono, direccion, tipo_documento, updated_at
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
        const result = await query(`
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN activo = true THEN 1 END) as usuarios_activos,
                COUNT(CASE WHEN activo = false THEN 1 END) as usuarios_inactivos,
                COUNT(CASE WHEN rol = 'admin' THEN 1 END) as administradores,
                COUNT(CASE WHEN rol = 'vet' THEN 1 END) as veterinarios,
                COUNT(CASE WHEN rol IN ('aux_admin', 'aux_vet') THEN 1 END) as auxiliares,
                COUNT(CASE WHEN rol = 'aux_admin' THEN 1 END) as aux_admin,
                COUNT(CASE WHEN rol = 'aux_vet' THEN 1 END) as aux_vet,
                COUNT(CASE WHEN ultimo_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as usuarios_activos_semana,
                COUNT(CASE WHEN bloqueado_hasta > CURRENT_TIMESTAMP THEN 1 END) as usuarios_bloqueados
            FROM vetplus_auth.usuarios
        `);

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
                aux_admin: parseInt(stats.aux_admin || 0),
                aux_vet: parseInt(stats.aux_vet || 0),
                usuarios_activos_semana: parseInt(stats.usuarios_activos_semana),
                usuarios_bloqueados: parseInt(stats.usuarios_bloqueados)
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
