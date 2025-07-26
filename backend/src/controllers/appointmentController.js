import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from '../services/googleCalendar.js';
import appointmentConflictService from '../services/appointmentConflictService.js';

/**
 * Generar código único para cita
 */
const generateAppointmentCode = () => {
    const timestamp = Date.now().toString().slice(-8);
    return `CIT-${timestamp}`;
};

/**
 * Sincronizar cita con Google Calendar
 */
const syncAppointmentWithGoogle = async (appointmentData, action = 'create') => {
    try {
        // Verificar si Google Calendar está configurado
        if (!await googleCalendarService.hasValidTokens()) {
            return {
                success: false,
                error: 'Google Calendar no está configurado'
            };
        }

        const {
            id_cita,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            mascota_nombre,
            cliente_nombre,
            cliente_email,
            veterinario_nombre,
            google_event_id
        } = appointmentData;

        // Crear descripción detallada para el evento
        const description = `
📅 Cita Veterinaria - VetPlus

🐕 Mascota: ${mascota_nombre}
👤 Cliente: ${cliente_nombre}
👨‍⚕️ Veterinario: ${veterinario_nombre}
📋 Tipo: ${tipo}
📝 Motivo: ${motivo || 'No especificado'}

Código de cita: ${appointmentData.codigo_cita}
        `.trim();

        const eventData = {
            summary: `${tipo} - ${mascota_nombre} (${cliente_nombre})`,
            description,
            startDateTime: fecha_inicio,
            endDateTime: fecha_fin,
            attendeeEmail: cliente_email,
            location: process.env.CLINIC_ADDRESS || 'VetPlus Clínica'
        };

        let result;
        
        switch (action) {
            case 'create':
                result = await googleCalendarService.createEvent(eventData);
                break;
            case 'update':
                if (!google_event_id) {
                    return { success: false, error: 'No se encontró el ID del evento de Google' };
                }
                result = await googleCalendarService.updateEvent(google_event_id, eventData);
                break;
            case 'delete':
                if (!google_event_id) {
                    return { success: false, error: 'No se encontró el ID del evento de Google' };
                }
                result = await googleCalendarService.deleteEvent(google_event_id);
                break;
            default:
                return { success: false, error: 'Acción no válida' };
        }

        if (result.success) {
            // Actualizar el estado de sincronización en la base de datos
            const syncStatus = 'synced';
            const updateQuery = `
                UPDATE clinical.calendario_citas 
                SET 
                    google_event_id = $1,
                    google_sync_status = $2,
                    google_sync_error = NULL,
                    last_google_sync = CURRENT_TIMESTAMP
                WHERE id_cita = $3
            `;
            
            await query(updateQuery, [
                action === 'delete' ? null : result.eventId,
                syncStatus,
                id_cita
            ]);
        } else {
            // Marcar como fallido
            await query(`
                UPDATE clinical.calendario_citas 
                SET 
                    google_sync_status = 'failed',
                    google_sync_error = $1,
                    last_google_sync = CURRENT_TIMESTAMP
                WHERE id_cita = $2
            `, [result.error, id_cita]);
        }

        return result;

    } catch (error) {
        console.error('Error sincronizando con Google Calendar:', error);
        
        // Marcar como fallido en la base de datos
        await query(`
            UPDATE clinical.calendario_citas 
            SET 
                google_sync_status = 'failed',
                google_sync_error = $1,
                last_google_sync = CURRENT_TIMESTAMP
            WHERE id_cita = $2
        `, [error.message, appointmentData.id_cita]);

        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Crear una nueva cita
 */
export const createAppointment = async (req, res) => {
    try {
        const {
            id_mascota,
            id_veterinario,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            notas
        } = req.body;
        
        const id_cita = uuidv4();
        const codigo_cita = generateAppointmentCode();
        const created_by = req.user.id;
        
        // Verificar que la mascota existe
        const mascotaResult = await query(
            'SELECT id_mascota, nombre FROM clinical.mascotas WHERE id_mascota = $1 AND activo = true',
            [id_mascota]
        );
        
        if (mascotaResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La mascota especificada no existe'
            });
        }
        
        // Verificar que el veterinario existe y tiene el rol adecuado
        const veterinarioResult = await query(
            'SELECT id_usuario, nombre, rol FROM auth.usuarios WHERE id_usuario = $1 AND rol IN ($2, $3) AND activo = true',
            [id_veterinario, 'vet', 'admin']
        );
        
        if (veterinarioResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El veterinario especificado no existe o no tiene permisos'
            });
        }
        
        // Verificar conflictos de horario (BD + Google Calendar)
        const conflictCheck = await appointmentConflictService.checkAllConflicts(
            id_veterinario, 
            fecha_inicio, 
            fecha_fin
        );
        
        if (conflictCheck.hasConflicts) {
            // Sugerir horarios alternativos
            const suggestions = await appointmentConflictService.suggestAlternativeSlots(
                id_veterinario,
                fecha_inicio,
                Math.ceil((new Date(fecha_fin) - new Date(fecha_inicio)) / (1000 * 60)), // duración en minutos
                3
            );
            
            return res.status(409).json({
                success: false,
                message: 'El veterinario ya tiene compromisos programados en ese horario',
                conflict_details: conflictCheck,
                suggested_alternatives: suggestions.suggestions || []
            });
        }
        
        // Crear la cita
        const insertQuery = `
            INSERT INTO clinical.calendario_citas (
                id_cita, codigo_cita, id_mascota, id_veterinario,
                fecha_inicio, fecha_fin, tipo, motivo, notas, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const result = await query(insertQuery, [
            id_cita, codigo_cita, id_mascota, id_veterinario,
            fecha_inicio, fecha_fin, tipo, motivo, notas, created_by
        ]);
        
        // Obtener información completa de la cita creada
        const citaCompleta = await getAppointmentWithDetails(id_cita);
        
        // Sincronizar con Google Calendar (de forma asíncrona)
        const syncResult = await syncAppointmentWithGoogle(citaCompleta, 'create');
        
        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            data: citaCompleta,
            google_sync: syncResult.success ? 'synced' : 'failed',
            google_sync_message: syncResult.success ? 'Sincronizada con Google Calendar' : syncResult.error
        });
        
    } catch (error) {
        console.error('Error creando cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener lista de citas con filtros
 */
export const getAppointments = async (req, res) => {
    try {
        const {
            limit = 10,
            offset = 0,
            fecha_inicio,
            fecha_fin,
            estado,
            tipo,
            id_veterinario,
            id_mascota
        } = req.query;
        
        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramCount = 0;
        
        // Construir filtros dinámicos
        if (fecha_inicio) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio >= $${paramCount}`);
            queryParams.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            paramCount++;
            whereConditions.push(`c.fecha_fin <= $${paramCount}`);
            queryParams.push(fecha_fin);
        }
        
        if (estado) {
            paramCount++;
            whereConditions.push(`c.estado = $${paramCount}`);
            queryParams.push(estado);
        }
        
        if (tipo) {
            paramCount++;
            whereConditions.push(`c.tipo = $${paramCount}`);
            queryParams.push(tipo);
        }
        
        if (id_veterinario) {
            paramCount++;
            whereConditions.push(`c.id_veterinario = $${paramCount}`);
            queryParams.push(id_veterinario);
        }
        
        if (id_mascota) {
            paramCount++;
            whereConditions.push(`c.id_mascota = $${paramCount}`);
            queryParams.push(id_mascota);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Query principal
        const mainQuery = `
            SELECT 
                c.*,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.email as cliente_email,
                v.nombre as veterinario_nombre,
                v.email as veterinario_email,
                con.codigo_consulta,
                con.diagnostico
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios v ON c.id_veterinario = v.id_usuario
            LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta
            WHERE ${whereClause}
            ORDER BY c.fecha_inicio ASC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        queryParams.push(limit, offset);
        
        // Query para contar total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            WHERE ${whereClause}
        `;
        
        const countParams = queryParams.slice(0, -2); // Remover limit y offset
        
        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);
        
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: totalPages,
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo citas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener cita por ID
 */
export const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const cita = await getAppointmentWithDetails(id);
        
        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: cita
        });
        
    } catch (error) {
        console.error('Error obteniendo cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar cita
 */
export const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Verificar que la cita existe
        const citaExistente = await query(
            'SELECT * FROM clinical.calendario_citas WHERE id_cita = $1',
            [id]
        );
        
        if (citaExistente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }
        
        const cita = citaExistente.rows[0];
        
        // Si se está actualizando fecha/hora, verificar conflictos
        if (updateData.fecha_inicio || updateData.fecha_fin) {
            const nuevaFechaInicio = updateData.fecha_inicio || cita.fecha_inicio;
            const nuevaFechaFin = updateData.fecha_fin || cita.fecha_fin;
            const veterinarioId = updateData.id_veterinario || cita.id_veterinario;
            
            const conflictCheck = await appointmentConflictService.checkAllConflicts(
                veterinarioId,
                nuevaFechaInicio,
                nuevaFechaFin,
                id // Excluir la cita actual
            );
            
            if (conflictCheck.hasConflicts) {
                // Sugerir horarios alternativos
                const suggestions = await appointmentConflictService.suggestAlternativeSlots(
                    veterinarioId,
                    nuevaFechaInicio,
                    Math.ceil((new Date(nuevaFechaFin) - new Date(nuevaFechaInicio)) / (1000 * 60)),
                    3
                );
                
                return res.status(409).json({
                    success: false,
                    message: 'El veterinario ya tiene compromisos programados en ese horario',
                    conflict_details: conflictCheck,
                    suggested_alternatives: suggestions.suggestions || []
                });
            }
        }
        
        // Construir query de actualización dinámico
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;
        
        const allowedFields = [
            'id_mascota', 'id_veterinario', 'fecha_inicio', 'fecha_fin',
            'tipo', 'estado', 'motivo', 'notas', 'id_consulta', 'recordatorio_enviado'
        ];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                paramCount++;
                updateFields.push(`${field} = $${paramCount}`);
                updateValues.push(updateData[field]);
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE clinical.calendario_citas 
            SET ${updateFields.join(', ')}
            WHERE id_cita = $${paramCount + 1}
            RETURNING *
        `;
        
        await query(updateQuery, updateValues);
        
        // Obtener información completa de la cita actualizada
        const citaActualizada = await getAppointmentWithDetails(id);
        
        // Sincronizar con Google Calendar si hay cambios significativos
        let syncResult = { success: true, message: 'No requiere sincronización' };
        
        const significantFields = ['fecha_inicio', 'fecha_fin', 'tipo', 'motivo', 'id_veterinario', 'id_mascota'];
        const hasSignificantChanges = significantFields.some(field => updateData[field] !== undefined);
        
        if (hasSignificantChanges && citaActualizada.google_event_id) {
            syncResult = await syncAppointmentWithGoogle(citaActualizada, 'update');
        }
        
        res.json({
            success: true,
            message: 'Cita actualizada exitosamente',
            data: citaActualizada,
            google_sync: syncResult.success ? 'synced' : 'failed',
            google_sync_message: syncResult.message || syncResult.error
        });
        
    } catch (error) {
        console.error('Error actualizando cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Actualizar estado de cita
 */
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, notas } = req.body;
        
        const result = await query(`
            UPDATE clinical.calendario_citas 
            SET estado = $1, notas = COALESCE($2, notas), updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $3
            RETURNING *
        `, [estado, notas, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }
        
        // Obtener información completa de la cita actualizada
        const citaActualizada = await getAppointmentWithDetails(id);
        
        res.json({
            success: true,
            message: 'Estado de cita actualizado exitosamente',
            data: citaActualizada
        });
        
    } catch (error) {
        console.error('Error actualizando estado de cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Cancelar cita (soft delete)
 */
export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo_cancelacion } = req.body;
        
        const result = await query(`
            UPDATE clinical.calendario_citas 
            SET estado = 'Cancelada', 
                notas = CASE 
                    WHEN notas IS NULL THEN $2
                    ELSE notas || ' | CANCELACIÓN: ' || $2
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $1 AND estado != 'Cancelada'
            RETURNING *
        `, [id, motivo_cancelacion || 'Sin motivo especificado']);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada o ya cancelada'
            });
        }
        
        // Obtener información completa para sincronización
        const citaCancelada = await getAppointmentWithDetails(id);
        
        // Eliminar de Google Calendar si existe
        let syncResult = { success: true, message: 'Sin evento en Google Calendar' };
        if (citaCancelada && citaCancelada.google_event_id) {
            syncResult = await syncAppointmentWithGoogle(citaCancelada, 'delete');
        }
        
        res.json({
            success: true,
            message: 'Cita cancelada exitosamente',
            data: result.rows[0],
            google_sync: syncResult.success ? 'deleted' : 'failed',
            google_sync_message: syncResult.success ? 'Eliminada de Google Calendar' : syncResult.error
        });
        
    } catch (error) {
        console.error('Error cancelando cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener citas por veterinario
 */
export const getAppointmentsByVet = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_inicio, fecha_fin, estado } = req.query;
        
        let whereConditions = ['c.id_veterinario = $1'];
        let queryParams = [id];
        let paramCount = 1;
        
        if (fecha_inicio) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio >= $${paramCount}`);
            queryParams.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            paramCount++;
            whereConditions.push(`c.fecha_fin <= $${paramCount}`);
            queryParams.push(fecha_fin);
        }
        
        if (estado) {
            paramCount++;
            whereConditions.push(`c.estado = $${paramCount}`);
            queryParams.push(estado);
        }
        
        const appointmentQuery = `
            SELECT 
                c.*,
                m.nombre as mascota_nombre,
                m.especie,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY c.fecha_inicio ASC
        `;
        
        const result = await query(appointmentQuery, queryParams);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error obteniendo citas por veterinario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener citas por mascota
 */
export const getAppointmentsByPet = async (req, res) => {
    try {
        const { id } = req.params;
        
        const petQuery = `
            SELECT 
                c.*,
                v.nombre as veterinario_nombre,
                con.codigo_consulta,
                con.diagnostico
            FROM clinical.calendario_citas c
            LEFT JOIN auth.usuarios v ON c.id_veterinario = v.id_usuario
            LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta
            WHERE c.id_mascota = $1
            ORDER BY c.fecha_inicio DESC
        `;
        
        const result = await query(petQuery, [id]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error obteniendo citas por mascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener vista de calendario
 */
export const getCalendarView = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, id_veterinario } = req.query;
        
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son obligatorias para la vista de calendario'
            });
        }
        
        let whereConditions = [
            'c.fecha_inicio >= $1',
            'c.fecha_fin <= $2',
            "c.estado NOT IN ('Cancelada')"
        ];
        let queryParams = [fecha_inicio, fecha_fin];
        
        if (id_veterinario) {
            whereConditions.push('c.id_veterinario = $3');
            queryParams.push(id_veterinario);
        }
        
        const calendarQuery = `
            SELECT 
                c.id_cita,
                c.codigo_cita,
                c.fecha_inicio,
                c.fecha_fin,
                c.tipo,
                c.estado,
                c.motivo,
                m.nombre as mascota_nombre,
                cl.nombre as cliente_nombre,
                v.nombre as veterinario_nombre,
                v.id_usuario as id_veterinario
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios v ON c.id_veterinario = v.id_usuario
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY c.fecha_inicio ASC
        `;
        
        const result = await query(calendarQuery, queryParams);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error obteniendo vista de calendario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Forzar sincronización con Google Calendar
 */
export const forceSyncWithGoogle = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Solo admins y veterinarios pueden forzar sincronización
        if (!['admin', 'vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para sincronizar citas'
            });
        }

        // Obtener información completa de la cita
        const cita = await getAppointmentWithDetails(id);
        
        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        // Determinar la acción basada en el estado de la cita
        let action = 'create';
        if (cita.google_event_id && cita.estado !== 'Cancelada') {
            action = 'update';
        } else if (cita.estado === 'Cancelada') {
            action = 'delete';
        }

        // Forzar sincronización
        const syncResult = await syncAppointmentWithGoogle(cita, action);
        
        res.json({
            success: true,
            message: 'Sincronización forzada completada',
            data: {
                appointment_id: id,
                sync_status: syncResult.success ? 'synced' : 'failed',
                action: action,
                google_event_id: syncResult.eventId || cita.google_event_id,
                sync_message: syncResult.success ? 'Sincronización exitosa' : syncResult.error
            }
        });

    } catch (error) {
        console.error('Error forzando sincronización:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Sincronizar todas las citas pendientes con Google Calendar
 */
export const syncAllPendingAppointments = async (req, res) => {
    try {
        // Solo administradores pueden sincronizar todo
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden sincronizar todas las citas'
            });
        }

        // Obtener citas con sincronización pendiente o fallida
        const pendingResult = await query(`
            SELECT c.id_cita
            FROM clinical.calendario_citas c
            WHERE c.google_sync_status IN ('pending', 'failed')
            AND c.estado NOT IN ('Cancelada')
            AND c.fecha_inicio >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY c.fecha_inicio ASC
            LIMIT 50
        `);

        const results = {
            total: pendingResult.rows.length,
            synced: 0,
            failed: 0,
            errors: []
        };

        // Sincronizar cada cita
        for (const row of pendingResult.rows) {
            try {
                const cita = await getAppointmentWithDetails(row.id_cita);
                if (cita) {
                    const syncResult = await syncAppointmentWithGoogle(cita, 'create');
                    if (syncResult.success) {
                        results.synced++;
                    } else {
                        results.failed++;
                        results.errors.push({
                            id_cita: row.id_cita,
                            error: syncResult.error
                        });
                    }
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    id_cita: row.id_cita,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Sincronización masiva completada',
            data: results
        });

    } catch (error) {
        console.error('Error sincronizando citas pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener disponibilidad del veterinario
 */
export const getVeterinarianAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_inicio, fecha_fin } = req.query;
        
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son obligatorias'
            });
        }
        
        // Solo admins, veterinarios pueden ver disponibilidad
        if (!['admin', 'vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver la disponibilidad'
            });
        }
        
        // Los veterinarios solo pueden ver su propia disponibilidad
        if (req.user.rol === 'vet' && req.user.id !== id) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes ver tu propia disponibilidad'
            });
        }
        
        const availability = await appointmentConflictService.getVeterinarianAvailability(
            id,
            fecha_inicio,
            fecha_fin
        );
        
        if (!availability.success) {
            return res.status(500).json({
                success: false,
                message: 'Error obteniendo disponibilidad',
                error: availability.error
            });
        }
        
        res.json({
            success: true,
            data: availability
        });
        
    } catch (error) {
        console.error('Error obteniendo disponibilidad del veterinario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Sugerir horarios alternativos
 */
export const suggestAvailableSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_base, duracion = 60, cantidad = 5 } = req.query;
        
        if (!fecha_base) {
            return res.status(400).json({
                success: false,
                message: 'La fecha base es obligatoria'
            });
        }
        
        const suggestions = await appointmentConflictService.suggestAlternativeSlots(
            id,
            fecha_base,
            parseInt(duracion),
            parseInt(cantidad)
        );
        
        if (!suggestions.success) {
            return res.status(500).json({
                success: false,
                message: 'Error generando sugerencias',
                error: suggestions.error
            });
        }
        
        res.json({
            success: true,
            data: suggestions
        });
        
    } catch (error) {
        console.error('Error sugiriendo horarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Función auxiliar para obtener cita con detalles completos
 */
const getAppointmentWithDetails = async (id_cita) => {
    const detailQuery = `
        SELECT 
            c.*,
            m.nombre as mascota_nombre,
            m.especie,
            m.raza,
            m.fecha_nacimiento,
            cl.nombre as cliente_nombre,
            cl.telefono as cliente_telefono,
            cl.email as cliente_email,
            cl.direccion as cliente_direccion,
            v.nombre as veterinario_nombre,
            v.email as veterinario_email,
            con.codigo_consulta,
            con.diagnostico,
            con.tratamiento
        FROM clinical.calendario_citas c
        LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
        LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
        LEFT JOIN auth.usuarios v ON c.id_veterinario = v.id_usuario
        LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta
        WHERE c.id_cita = $1
    `;
    
    const result = await query(detailQuery, [id_cita]);
    return result.rows[0] || null;
};
