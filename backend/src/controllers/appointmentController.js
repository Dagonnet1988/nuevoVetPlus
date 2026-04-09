import { query, getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from '../services/googleCalendar.js';
import appointmentConflictService from '../services/appointmentConflictService.js';

/**
 * Convertir fecha a formato Colombia (sin zona horaria)
 * Entrada: "2025-08-19T08:00:00-05:00" o "2025-08-19T13:00:00Z" 
 * Salida: "2025-08-19 08:00:00" (hora local Colombia)
 */
const convertirFechaAColombia = (fechaStr) => {
    // Si viene con zona horaria (-05:00 o Z), convertir a hora Colombia
    if (fechaStr.includes('Z') || fechaStr.includes('+') || fechaStr.includes('-05:00')) {
        const fecha = new Date(fechaStr);
        // Convertir a zona horaria de Colombia
        const fechaColombia = new Date(fecha.getTime() - (5 * 60 * 60 * 1000)); // UTC-5
        return fechaColombia.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // Si ya viene en formato local, solo cambiar T por espacio
    if (fechaStr.includes('T')) {
        return fechaStr.slice(0, 19).replace('T', ' ');
    }
    
    // Si solo viene fecha, agregar hora
    if (fechaStr.length === 10) {
        return fechaStr + ' 00:00:00';
    }
    
    return fechaStr;
};

/**
 * Mapeo de estados entre frontend y base de datos
 * NOTA: Después de la migración, tanto frontend como BD usan los mismos valores
 */
const ESTADO_MAPPING = {
    // Frontend -> Base de datos
    'pendiente': 'pendiente',
    'confirmada': 'confirmada', 
    'en_curso': 'en_curso',
    'completada': 'completada',
    'cancelada': 'cancelada',
    'no_asistio': 'no_asistio'
};

const ESTADO_REVERSE_MAPPING = {
    // Base de datos -> Frontend
    'pendiente': 'pendiente',
    'confirmada': 'confirmada',
    'en_curso': 'en_curso', 
    'completada': 'completada',
    'cancelada': 'cancelada',
    'no_asistio': 'no_asistio'
};

/**
 * Convertir estado del frontend al formato de la base de datos
 */
const mapFrontendToDb = (frontendEstado) => {
    return ESTADO_MAPPING[frontendEstado] || frontendEstado;
};

/**
 * Convertir estado de la base de datos al formato del frontend
 */
const mapDbToFrontend = (dbEstado) => {
    return ESTADO_REVERSE_MAPPING[dbEstado] || dbEstado;
};

/**
 * Transformar datos de cita para el frontend
 */
const transformAppointmentForFrontend = (appointment) => {
    if (!appointment) {
        console.log('⚠️ transformAppointmentForFrontend: appointment es null/undefined');
        return null;
    }
    
    // console.log(`🔄 Transformando appointment: estado "${appointment.estado}" -> "${mapDbToFrontend(appointment.estado)}"`);
    
    return {
        ...appointment,
        estado: mapDbToFrontend(appointment.estado)
    };
};

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

        console.log('🕐 Diagnóstico de zona horaria:', {
            fecha_inicio_original: fecha_inicio,
            fecha_fin_original: fecha_fin,
            fecha_inicio_parsed: new Date(fecha_inicio).toISOString(),
            fecha_fin_parsed: new Date(fecha_fin).toISOString(),
            server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            server_offset: new Date().getTimezoneOffset(),
            env_tz: process.env.TZ
        });

        // Función helper para formatear fechas correctamente para Google Calendar
        const formatDateForGoogle = (dateString) => {
            // Si la fecha viene sin zona horaria (ej: "2025-09-13T14:00:00")
            // la interpretamos como hora local de Colombia y agregamos la zona horaria explícitamente
            if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
                // Agregar zona horaria de Colombia (-05:00) explícitamente
                return dateString + '-05:00';
            }
            return dateString;
        };

        const formattedStartDateTime = formatDateForGoogle(fecha_inicio);
        const formattedEndDateTime = formatDateForGoogle(fecha_fin);

        console.log('📅 Fechas formateadas para Google:', {
            original_start: fecha_inicio,
            formatted_start: formattedStartDateTime,
            original_end: fecha_fin,
            formatted_end: formattedEndDateTime,
            timezone_will_be_set_to: 'America/Bogota'
        });

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
            startDateTime: formattedStartDateTime,
            endDateTime: formattedEndDateTime,
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
        console.log('📝 Datos recibidos para crear cita:', JSON.stringify(req.body, null, 2));
        
        const {
            id_mascota,
            id_veterinario,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            notas,
            observaciones,
            precio
        } = req.body;

        // El frontend puede enviar "observaciones" en lugar de "notas" — normalizar
        const notasFinales = notas || observaciones;
        
        console.log('📝 Campos extraídos:', {
            id_mascota,
            id_veterinario,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            notas,
            observaciones,
            precio
        });
        
        // Validar campos requeridos
        if (!id_mascota) {
            console.log('❌ Error: id_mascota faltante');
            return res.status(400).json({
                success: false,
                message: 'El ID de la mascota es obligatorio'
            });
        }
        
        if (!id_veterinario) {
            console.log('❌ Error: id_veterinario faltante');
            return res.status(400).json({
                success: false,
                message: 'El ID del veterinario es obligatorio'
            });
        }
        
        if (!fecha_inicio) {
            console.log('❌ Error: fecha_inicio faltante');
            return res.status(400).json({
                success: false,
                message: 'La fecha de inicio es obligatoria'
            });
        }
        
        if (!fecha_fin) {
            console.log('❌ Error: fecha_fin faltante');
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin es obligatoria'
            });
        }
        
        if (!tipo) {
            console.log('❌ Error: tipo faltante');
            return res.status(400).json({
                success: false,
                message: 'El tipo de cita es obligatorio'
            });
        }
        
        // Convertir fechas a formato Colombia (sin conversión UTC)
        // Asumimos que todas las fechas vienen en formato de Colombia
        let fechaInicioFormato, fechaFinFormato;
        
        try {
            // Convertir a formato YYYY-MM-DD HH:MM:SS para PostgreSQL
            fechaInicioFormato = convertirFechaAColombia(fecha_inicio);
            fechaFinFormato = convertirFechaAColombia(fecha_fin);
        } catch (error) {
            console.log('❌ Error al procesar fechas:', error.message);
            return res.status(400).json({
                success: false,
                message: 'Formato de fechas inválido. Use formato: YYYY-MM-DDTHH:MM:SS'
            });
        }
        
        // Validar fechas (comparar como strings es suficiente para el formato YYYY-MM-DD HH:MM:SS)
        if (fechaInicioFormato >= fechaFinFormato) {
            console.log('❌ Error: fecha_fin debe ser posterior a fecha_inicio');
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }
        
        console.log('✅ Validaciones básicas pasadas');
        
        const id_cita = uuidv4();
        const codigo_cita = generateAppointmentCode();
        const created_by = req.user.id;
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        // Verificar que la mascota existe
        const mascotaResult = await query(
            'SELECT id_mascota, nombre FROM clinical.mascotas WHERE id_mascota = $1 AND id_tenant = $2 AND activo = true',
            [id_mascota, tenantId]
        );
        
        if (mascotaResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La mascota especificada no existe'
            });
        }
        
        // Verificar que el veterinario existe y tiene el rol adecuado
        const veterinarioResult = await query(
            'SELECT id_usuario, nombre, rol FROM vetplus_auth.usuarios WHERE id_usuario = $1 AND rol IN ($2, $3) AND activo = true',
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
                fecha_inicio, fecha_fin, tipo, motivo, notas, created_by, id_tenant
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const result = await query(insertQuery, [
            id_cita, codigo_cita, id_mascota, id_veterinario,
            fechaInicioFormato, fechaFinFormato, tipo, motivo, notasFinales, created_by, tenantId
        ]);
        
        // Obtener información completa de la cita creada
        const citaCompleta = await getAppointmentWithDetails(id_cita);
        
        // Sincronizar con Google Calendar (de forma asíncrona)
        const syncResult = await syncAppointmentWithGoogle(citaCompleta, 'create');
        
        // Transformar para el frontend
        const citaTransformada = transformAppointmentForFrontend(citaCompleta);
        
        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            data: citaTransformada,
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
        
        // 🔍 DEBUG: Log de parámetros recibidos
        console.log('🔍 [FILTROS] Parámetros recibidos:', {
            limit, offset, fecha_inicio, fecha_fin, estado, tipo, id_veterinario, id_mascota
        });
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        let whereConditions = [`c.id_tenant = $1`]; // Filtrar por tenant
        let queryParams = [tenantId];
        let paramCount = 1;
        
        // Construir filtros dinámicos
        if (fecha_inicio) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio >= $${paramCount}`);
            queryParams.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio <= $${paramCount}`);
            queryParams.push(fecha_fin);
        }
        
        if (estado) {
            paramCount++;
            // Mapear estado del frontend al de la BD
            const estadoDb = mapFrontendToDb(estado);
            whereConditions.push(`c.estado = $${paramCount}`);
            queryParams.push(estadoDb);
        }
        
        if (tipo) {
            paramCount++;
            whereConditions.push(`c.tipo = $${paramCount}`);
            queryParams.push(tipo);
        }
        
        if (id_veterinario) {
            paramCount++;
            console.log(`🔍 [FILTRO VETERINARIO] Aplicando filtro: id_veterinario = "${id_veterinario}" (tipo: ${typeof id_veterinario})`);
            whereConditions.push(`c.id_veterinario = $${paramCount}`);
            queryParams.push(id_veterinario);
        }
        
        if (id_mascota) {
            paramCount++;
            whereConditions.push(`c.id_mascota = $${paramCount}`);
            queryParams.push(id_mascota);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // 🔍 DEBUG: Log de query final
        console.log('🔍 [QUERY] WHERE clause:', whereClause);
        console.log('🔍 [QUERY] Parámetros:', queryParams);
        console.log('🔍 [QUERY] Ejecutando query...');
        
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
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
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
        
        console.log(`🔍 [RESULTADO] Se encontraron ${result.rows.length} citas`);
        if (id_veterinario) {
            console.log(`🔍 [FILTRO VET] Citas para veterinario ${id_veterinario}:`, result.rows.map(r => ({
                id: r.id_cita,
                vet: r.veterinario_nombre, 
                fecha: r.fecha_inicio
            })));
        }
        
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
        const cita = await getAppointmentWithDetails(id, req.tenantId ?? req.user?.tenant_id);
        
        if (!cita) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }
        
        // Transformar estado para el frontend
        const citaTransformada = transformAppointmentForFrontend(cita);
        
        res.json({
            success: true,
            data: citaTransformada
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
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        // Verificar que la cita existe
        const citaExistente = await query(
            'SELECT * FROM clinical.calendario_citas WHERE id_cita = $1 AND id_tenant = $2',
            [id, tenantId]
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
        
        // Mapear estado del frontend a la base de datos si está presente
        if (updateData.estado) {
            updateData.estado = mapFrontendToDb(updateData.estado);
            console.log(`🔄 Mapeando estado en updateAppointment: ${updateData.estado}`);
        }
        
        // Construir query de actualización dinámico
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;
        
        const allowedFields = [
            'id_mascota', 'id_veterinario', 'fecha_inicio', 'fecha_fin',
            'tipo', 'estado', 'motivo', 'notas', 'id_consulta', 'recordatorio_enviado'
        ];

        // El frontend envía "observaciones" pero la columna en DB se llama "notas"
        if (updateData.observaciones !== undefined && updateData.notas === undefined) {
            updateData.notas = updateData.observaciones;
        }
        delete updateData.observaciones;
        
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
        updateValues.push(tenantId);
        
        const updateQuery = `
            UPDATE clinical.calendario_citas 
            SET ${updateFields.join(', ')}
            WHERE id_cita = $${paramCount + 1} AND id_tenant = $${paramCount + 2}
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
        
        // Transformar para el frontend
        const citaTransformada = transformAppointmentForFrontend(citaActualizada);
        
        res.json({
            success: true,
            message: 'Cita actualizada exitosamente',
            data: citaTransformada,
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
    let txClient = null;
    try {
        const { id } = req.params;
        const { estado, notas } = req.body;

        console.log(`📝 [INICIO] Actualizando estado de cita ${id}`);
        console.log(`📝 Datos recibidos: estado=${estado}, notas=${notas}`);

        // Mapear estado del frontend al formato de la base de datos
        const estadoDb = mapFrontendToDb(estado);
        console.log(`🔄 Mapeando estado: ${estado} -> ${estadoDb}`);
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        // Verificar que la cita existe antes de iniciar la transacción
        const citaExistente = await query(
            'SELECT id_cita, estado FROM clinical.calendario_citas WHERE id_cita = $1 AND id_tenant = $2',
            [id, tenantId]
        );

        if (citaExistente.rows.length === 0) {
            console.log('❌ Cita no encontrada:', id);
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        console.log('✅ Cita encontrada:', {
            id_cita: citaExistente.rows[0].id_cita,
            estado_actual: citaExistente.rows[0].estado
        });

        // Validación especial: No permitir completar cita sin historia clínica completada
        if (estadoDb === 'completada') {
            console.log('🔍 Validando historia clínica antes de completar cita...');

            // Verificar si existe consulta clínica para esta cita
            const consultaResult = await query(
                'SELECT id_consulta, estado FROM clinical.consultas_clinicas WHERE id_cita = $1 AND id_tenant = $2',
                [id, tenantId]
            );

            if (consultaResult.rows.length === 0) {
                console.log('❌ No se encontró consulta clínica para esta cita');
                return res.status(400).json({
                    success: false,
                    message: 'No se puede completar la cita sin historia clínica. Primero debe crear y completar la historia clínica.',
                    code: 'CONSULTATION_REQUIRED'
                });
            }

            const consulta = consultaResult.rows[0];
            if (consulta.estado !== 'Completada') {
                console.log('❌ Consulta clínica no está completada:', consulta.estado);
                return res.status(400).json({
                    success: false,
                    message: 'La historia clínica debe estar completada antes de marcar la cita como completada.',
                    code: 'CONSULTATION_NOT_COMPLETED'
                });
            }

            console.log('✅ Validación de historia clínica pasada');
        }

        // Iniciar transacción para operaciones múltiples
        txClient = await getClient();
        await txClient.query('BEGIN');
        console.log('🔄 Transacción iniciada');

        try {
            const result = await txClient.query(`
                UPDATE clinical.calendario_citas
                SET estado = $1, notas = COALESCE($2, notas), updated_at = CURRENT_TIMESTAMP
                WHERE id_cita = $3 AND id_tenant = $4
                RETURNING *
            `, [estadoDb, notas, id, tenantId]);

            if (result.rows.length === 0) {
                console.log('❌ Error: UPDATE no afectó ninguna fila');
                await txClient.query('ROLLBACK');
                txClient.release();
                txClient = null;
                return res.status(404).json({
                    success: false,
                    message: 'Cita no encontrada'
                });
            }

            console.log('✅ Estado de cita actualizado:', {
                id_cita: result.rows[0].id_cita,
                estado_anterior: citaExistente.rows[0].estado,
                estado_nuevo: result.rows[0].estado
            });
            
            // 🔥 AUTO-CREAR HISTORIA CLÍNICA AL INICIAR CITA (EN CURSO)
            if (estadoDb === 'en_curso') {
                const citaData = result.rows[0];
                console.log('🏥 Verificando creación de historia clínica para cita en curso...');

                try {
                    // Verificar si ya existe una consulta clínica para esta cita
                    const existingConsulta = await txClient.query(`
                        SELECT id_consulta FROM clinical.consultas_clinicas
                        WHERE id_cita = $1 AND id_tenant = $2
                    `, [id, tenantId]);

                    if (existingConsulta.rows.length === 0) {
                        console.log('🏥 Auto-creando historia clínica para cita en curso...');

                        // Generar código único para la consulta
                        const codigoConsulta = `CON-${Date.now().toString().slice(-8)}`;

                        // Crear registro de consulta clínica
                        const consultaResult = await txClient.query(`
                            INSERT INTO clinical.consultas_clinicas (
                                id_consulta,
                                codigo_consulta,
                                id_mascota,
                                id_veterinario,
                                motivo,
                                estado,
                                id_tenant
                            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
                            RETURNING id_consulta
                        `, [
                            codigoConsulta,
                            citaData.id_mascota,
                            citaData.id_veterinario,
                            citaData.motivo || 'Consulta programada',
                            'En Curso',
                            tenantId
                        ]);

                        if (consultaResult.rows.length === 0) {
                            throw new Error('No se pudo crear la consulta clínica');
                        }

                        // Vincular la consulta con la cita
                        const updateResult = await txClient.query(`
                            UPDATE clinical.calendario_citas
                            SET id_consulta = $1
                            WHERE id_cita = $2
                        `, [consultaResult.rows[0].id_consulta, id]);

                        console.log('✅ Historia clínica creada automáticamente:', {
                            id_consulta: consultaResult.rows[0].id_consulta,
                            codigo_consulta: codigoConsulta,
                            id_cita: id,
                            filas_actualizadas: updateResult.rowCount
                        });
                    } else {
                        console.log('ℹ️ Ya existe una consulta clínica para esta cita:', existingConsulta.rows[0].id_consulta);
                    }
                } catch (consultaError) {
                    console.error('❌ Error creando consulta clínica:', consultaError);
                    // No lanzamos el error para no detener el proceso de cambio de estado
                }
            }
            
            // 🔥 AUTO-CREAR HISTORIA CLÍNICA AL COMPLETAR CITA (por compatibilidad)
            if (estadoDb === 'completada') {
                const citaData = result.rows[0];
                console.log('🏥 Verificando creación de historia clínica para cita completada...');

                try {
                    // Verificar si ya existe una consulta clínica para esta cita
                    const existingConsulta = await txClient.query(`
                        SELECT id_consulta FROM clinical.consultas_clinicas
                        WHERE id_cita = $1 AND id_tenant = $2
                    `, [id, tenantId]);

                    if (existingConsulta.rows.length === 0) {
                        console.log('🏥 Auto-creando historia clínica para cita completada...');

                        // Generar código único para la consulta
                        const codigoConsulta = `CON-${Date.now().toString().slice(-8)}`;

                        // Crear registro de consulta clínica
                        const consultaResult = await txClient.query(`
                            INSERT INTO clinical.consultas_clinicas (
                                id_consulta,
                                codigo_consulta,
                                id_mascota,
                                id_veterinario,
                                motivo,
                                estado,
                                id_tenant
                            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
                            RETURNING id_consulta
                        `, [
                            codigoConsulta,
                            citaData.id_mascota,
                            citaData.id_veterinario,
                            citaData.motivo || 'Consulta programada',
                            'Completada',
                            tenantId
                        ]);

                        if (consultaResult.rows.length === 0) {
                            throw new Error('No se pudo crear la consulta clínica');
                        }

                        // Vincular la consulta con la cita
                        const updateResult = await txClient.query(`
                            UPDATE clinical.calendario_citas
                            SET id_consulta = $1
                            WHERE id_cita = $2
                        `, [consultaResult.rows[0].id_consulta, id]);

                        console.log('✅ Historia clínica creada automáticamente:', {
                            id_consulta: consultaResult.rows[0].id_consulta,
                            codigo_consulta: codigoConsulta,
                            id_cita: id,
                            filas_actualizadas: updateResult.rowCount
                        });
                    } else {
                        console.log('ℹ️ Ya existe una consulta clínica para esta cita:', existingConsulta.rows[0].id_consulta);
                    }
                } catch (consultaError) {
                    console.error('❌ Error creando consulta clínica:', consultaError);
                    // No lanzamos el error para no detener el proceso de cambio de estado
                }
            }
            
            await txClient.query('COMMIT');
            txClient.release();
            txClient = null;
            console.log('✅ Transacción completada exitosamente');

            // Obtener información completa de la cita actualizada
            const citaActualizada = await getAppointmentWithDetails(id);
            console.log('📋 Cita actualizada obtenida:', {
                id_cita: citaActualizada?.id_cita,
                estado: citaActualizada?.estado,
                google_event_id: citaActualizada?.google_event_id
            });

            // 🔥 SINCRONIZAR CON GOOGLE CALENDAR SI HAY CAMBIO DE ESTADO
            let syncResult = { success: true, message: 'No requiere sincronización' };

            if (citaActualizada && citaActualizada.google_event_id) {
                try {
                    // Obtener estado anterior de la cita antes de la actualización
                    const estadoAnterior = result.rows[0].estado; // Estado antes del cambio
                    console.log(`🔄 Sincronizando cambio de estado con Google Calendar: ${estadoAnterior} → ${estadoDb}`);

                    // Actualizar el evento en Google Calendar con el nuevo estado
                    const eventUpdateData = {
                        summary: citaActualizada.tipo ? `${citaActualizada.tipo} - ${citaActualizada.mascota_nombre} (${citaActualizada.cliente_nombre})` : `Cita - ${citaActualizada.mascota_nombre}`,
                        description: `
📅 Cita Veterinaria - VetPlus

🐕 Mascota: ${citaActualizada.mascota_nombre}
👤 Cliente: ${citaActualizada.cliente_nombre}
👨‍⚕️ Veterinario: ${citaActualizada.veterinario_nombre}
📋 Tipo: ${citaActualizada.tipo}
📝 Motivo: ${citaActualizada.motivo || 'No especificado'}
🔄 Estado: ${estadoDb.toUpperCase()}

Código de cita: ${citaActualizada.codigo_cita}
                        `.trim(),
                        startDateTime: citaActualizada.fecha_inicio,
                        endDateTime: citaActualizada.fecha_fin,
                        attendeeEmail: citaActualizada.cliente_email,
                        location: process.env.CLINIC_ADDRESS || 'VetPlus Clínica'
                    };

                    // Pasar el estado actual para configurar recordatorios correctamente
                    const googleEventData = {
                        summary: citaActualizada.tipo ? `${citaActualizada.tipo} - ${citaActualizada.mascota_nombre} (${citaActualizada.cliente_nombre})` : `Cita - ${citaActualizada.mascota_nombre}`,
                        description: `
📅 Cita Veterinaria - VetPlus

🐕 Mascota: ${citaActualizada.mascota_nombre}
👤 Cliente: ${citaActualizada.cliente_nombre}
👨‍⚕️ Veterinario: ${citaActualizada.veterinario_nombre}
📋 Tipo: ${citaActualizada.tipo}
📝 Motivo: ${citaActualizada.motivo || 'No especificado'}
🔄 Estado: ${estadoDb.toUpperCase()}

Código de cita: ${citaActualizada.codigo_cita}
                        `.trim(),
                        startDateTime: citaActualizada.fecha_inicio,
                        endDateTime: citaActualizada.fecha_fin,
                        attendeeEmail: citaActualizada.cliente_email,
                        location: process.env.CLINIC_ADDRESS || 'VetPlus Clínica',
                        status: estadoDb // Agregar estado para controlar recordatorios
                    };

                    syncResult = await googleCalendarService.updateEvent(citaActualizada.google_event_id, googleEventData);

                    if (syncResult.success) {
                        console.log('✅ Estado sincronizado exitosamente con Google Calendar');
                    } else {
                        console.log('⚠️ Error sincronizando con Google Calendar:', syncResult.error);
                    }
                } catch (syncError) {
                    console.error('❌ Error en sincronización con Google Calendar:', syncError);
                    syncResult = {
                        success: false,
                        message: 'Error en sincronización',
                        error: syncError.message
                    };
                    // No lanzamos el error para no detener el proceso principal
                }
            } else {
                console.log('ℹ️ Cita no sincronizada con Google Calendar o cita no encontrada');
            }

            // Transformar para el frontend
            const citaTransformada = transformAppointmentForFrontend(citaActualizada);

            res.json({
                success: true,
                message: estadoDb === 'completada' ?
                    'Cita completada y historia clínica iniciada automáticamente' :
                    'Estado de cita actualizado exitosamente',
                data: citaTransformada,
                google_sync: syncResult.success ? 'synced' : 'failed',
                google_sync_message: syncResult.success ? 'Sincronizado con Google Calendar' : syncResult.error
            });
            
        } catch (error) {
            console.error('❌ Error durante la transacción:', error);
            console.error('❌ Detalles del error:', {
                message: error.message,
                stack: error.stack,
                code: error.code
            });
            if (txClient) {
                try { await txClient.query('ROLLBACK'); } catch {}
                txClient.release();
                txClient = null;
            }
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error actualizando estado de cita:', error);
        console.error('❌ Detalles del error principal:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            id_cita: id,
            estado_solicitado: estado
        });

        // Intentar hacer rollback si hay una transacción pendiente
        if (txClient) {
            try { await txClient.query('ROLLBACK'); txClient.release(); txClient = null; } catch {}
        }

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
            SET estado = 'cancelada', 
                notas = CASE 
                    WHEN notas IS NULL THEN $2
                    ELSE notas || ' | CANCELACIÓN: ' || $2
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $1 AND estado != 'cancelada'
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
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
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
        const { fecha_inicio, fecha_fin, id_veterinario, vista, fecha, estado, tipo } = req.query;
        
        let startDate, endDate;
        
        // Si se proporciona vista y fecha, calcular el rango
        if (vista && fecha) {
            const baseDate = new Date(fecha);
            
            switch (vista) {
                case 'mes':
                    startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).toISOString().split('T')[0];
                    endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).toISOString().split('T')[0];
                    break;
                case 'semana':
                    const startOfWeek = new Date(baseDate);
                    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    startDate = startOfWeek.toISOString().split('T')[0];
                    endDate = endOfWeek.toISOString().split('T')[0];
                    break;
                case 'dia':
                    startDate = baseDate.toISOString().split('T')[0];
                    endDate = startDate;
                    break;
                default:
                    startDate = fecha_inicio;
                    endDate = fecha_fin;
            }
        } else {
            startDate = fecha_inicio;
            endDate = fecha_fin;
        }
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere especificar fechas (fecha_inicio/fecha_fin o vista/fecha)'
            });
        }
        
        let whereConditions = [
            'DATE(c.fecha_inicio) >= $1',
            'DATE(c.fecha_inicio) <= $2'
        ];
        let queryParams = [startDate, endDate];
        let paramIndex = 3;
        
        // 🔍 DEBUG: Log de parámetros para calendar view
        console.log('🔍 [CALENDAR] Parámetros recibidos:', {
            fecha_inicio, fecha_fin, id_veterinario, vista, fecha, estado, tipo
        });
        
        // Filtro por veterinario
        if (id_veterinario) {
            console.log(`🔍 [CALENDAR VETERINARIO] Aplicando filtro: id_veterinario = "${id_veterinario}"`);
            whereConditions.push(`c.id_veterinario = $${paramIndex}`);
            queryParams.push(id_veterinario);
            paramIndex++;
        }
        
        // Filtro por estado
        if (estado) {
            const estadoDb = mapFrontendToDb(estado);
            console.log(`🔍 [CALENDAR ESTADO] Aplicando filtro: estado = "${estado}" -> "${estadoDb}"`);
            whereConditions.push(`c.estado = $${paramIndex}`);
            queryParams.push(estadoDb);
            paramIndex++;
        }
        
        // Filtro por tipo
        if (tipo) {
            whereConditions.push(`c.tipo = $${paramIndex}`);
            queryParams.push(tipo);
            paramIndex++;
        }
        
        const calendarQuery = `
            SELECT 
                c.id_cita,
                c.codigo_cita,
                TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_inicio,
                TO_CHAR(c.fecha_fin, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_fin,
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
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY c.fecha_inicio ASC
        `;
        
        console.log('🔍 [CALENDAR QUERY] WHERE:', whereConditions.join(' AND '));
        console.log('🔍 [CALENDAR QUERY] Parámetros:', queryParams);
        
        const result = await query(calendarQuery, queryParams);
        
        console.log(`🔍 [CALENDAR RESULTADO] Se encontraron ${result.rows.length} citas`);
        if (id_veterinario) {
            console.log(`🔍 [CALENDAR FILTRO VET] Citas para veterinario ${id_veterinario}:`, result.rows.map(r => ({
                id: r.id_cita,
                vet: r.veterinario_nombre, 
                estado: r.estado,
                fecha: r.fecha_inicio
            })));
        }
        
        // Transformar estados para el frontend
        const citasTransformadas = result.rows.map(cita => transformAppointmentForFrontend(cita));
        
        res.json({
            success: true,
            data: citasTransformadas
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
        if (cita.google_event_id && cita.estado !== 'cancelada') {
            action = 'update';
        } else if (cita.estado === 'cancelada') {
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
            AND c.estado NOT IN ('cancelada')
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
 * Obtener estadísticas de citas
 */
export const getAppointmentStats = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        
        // Si no se proporcionan fechas, usar el mes actual
        const startDate = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endDate = fecha_fin || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        
        const statsQueries = [
            // Total de citas
            `SELECT COUNT(*) as total_citas 
             FROM clinical.calendario_citas 
             WHERE id_tenant = $3 AND fecha_inicio >= $1 AND fecha_inicio <= $2`,
            
            // Citas de hoy
            `SELECT COUNT(*) as citas_hoy 
             FROM clinical.calendario_citas 
             WHERE id_tenant = $1 AND DATE(fecha_inicio) = CURRENT_DATE`,
             
            // Citas pendientes
            `SELECT COUNT(*) as citas_pendientes 
             FROM clinical.calendario_citas 
             WHERE id_tenant = $1 AND estado = 'pendiente' AND fecha_inicio >= CURRENT_DATE`,
             
            // Citas completadas en el período
            `SELECT COUNT(*) as citas_completadas 
             FROM clinical.calendario_citas 
             WHERE id_tenant = $3 AND estado = 'completada' AND fecha_inicio >= $1 AND fecha_inicio <= $2`
        ];
        
        const results = await Promise.all([
            query(statsQueries[0], [startDate, endDate, tenantId]),
            query(statsQueries[1], [tenantId]),
            query(statsQueries[2], [tenantId]),
            query(statsQueries[3], [startDate, endDate, tenantId])
        ]);
        
        const totalCitas = parseInt(results[0].rows[0].total_citas);
        const citasCompletadas = parseInt(results[3].rows[0].citas_completadas);
        const tasaOcupacion = totalCitas > 0 ? Math.round((citasCompletadas / totalCitas) * 100) : 0;
        
        // Obtener estadísticas por estado
        const estadosQuery = `
            SELECT estado, COUNT(*) as cantidad 
            FROM clinical.calendario_citas 
            WHERE id_tenant = $1
            GROUP BY estado 
            ORDER BY cantidad DESC
        `;
        const estadosResult = await query(estadosQuery, [tenantId]);
        
        const stats = {
            total_citas: totalCitas,
            citas_hoy: parseInt(results[1].rows[0].citas_hoy),
            citas_pendientes: parseInt(results[2].rows[0].citas_pendientes),
            citas_completadas: citasCompletadas,
            tasa_ocupacion: tasaOcupacion,
            estados: estadosResult.rows.map(row => ({
                estado: row.estado,
                cantidad: parseInt(row.cantidad)
            }))
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas de citas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Sincronizar manualmente el estado de una cita con Google Calendar
 */
export const syncAppointmentWithCalendar = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID sea un UUID válido
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de cita inválido'
            });
        }

        // Obtener información de la cita
        const citaResult = await query(`
            SELECT 
                c.*,
                m.nombre as mascota_nombre,
                cl.nombre as cliente_nombre,
                cl.email as cliente_email,
                v.nombre as veterinario_nombre
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            WHERE c.id_cita = $1
        `, [id]);

        if (citaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        const cita = citaResult.rows[0];

        // Verificar que la cita tenga un google_event_id
        if (!cita.google_event_id) {
            return res.status(400).json({
                success: false,
                message: 'La cita no está sincronizada con Google Calendar',
                data: {
                    id_cita: id,
                    estado_actual: cita.estado,
                    google_sync_status: cita.google_sync_status
                }
            });
        }

        console.log(`🔄 Sincronizando cita ${id} con Google Calendar...`);

        // Verificar respuestas de asistentes en Google Calendar
        const attendeeCheck = await googleCalendarService.checkEventAttendeeResponses(cita.google_event_id);

        if (!attendeeCheck.success) {
            return res.status(500).json({
                success: false,
                message: 'Error verificando Google Calendar',
                error: attendeeCheck.error
            });
        }

        console.log('📊 Resultado de verificación:', attendeeCheck);

        const estadoAnterior = cita.estado;
        let nuevoEstado = estadoAnterior;
        let cambioRealizado = false;

        // Determinar si necesitamos cambiar el estado
        if (attendeeCheck.suggestedStatus !== estadoAnterior) {
            nuevoEstado = attendeeCheck.suggestedStatus;
            cambioRealizado = true;

            // Actualizar el estado en la base de datos
            await query(`
                UPDATE clinical.calendario_citas 
                SET 
                    estado = $1,
                    updated_at = NOW(),
                    google_sync_status = 'synced',
                    last_google_sync = NOW()
                WHERE id_cita = $2
            `, [nuevoEstado, id]);

            console.log(`✅ Estado actualizado: ${estadoAnterior} → ${nuevoEstado}`);
        } else {
            console.log(`ℹ️ Estado ya sincronizado: ${estadoAnterior}`);
        }

        // Obtener la cita actualizada
        const citaActualizada = await getAppointmentWithDetails(id);

        res.json({
            success: true,
            message: cambioRealizado ? 
                `Estado sincronizado: ${estadoAnterior} → ${nuevoEstado}` : 
                'La cita ya está sincronizada con Google Calendar',
            data: {
                appointment: transformAppointmentForFrontend(citaActualizada),
                sync_details: {
                    estado_anterior: estadoAnterior,
                    estado_actual: nuevoEstado,
                    cambio_realizado: cambioRealizado,
                    google_event_id: cita.google_event_id,
                    attendee_responses: attendeeCheck.attendeeResponses,
                    summary: attendeeCheck.summary,
                    status_reason: attendeeCheck.statusReason,
                    last_checked: attendeeCheck.lastChecked
                }
            }
        });

    } catch (error) {
        console.error('Error sincronizando cita con Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener la historia clínica vinculada a una cita
 */
export const getAppointmentConsultation = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID sea un UUID válido
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de cita inválido'
            });
        }

        // Obtener cita con su consulta vinculada
        const citaResult = await query(`
            SELECT 
                c.id_cita,
                c.codigo_cita,
                c.estado,
                c.id_consulta,
                con.id_consulta as consultation_id,
                con.codigo_consulta,
                con.fecha,
                con.motivo,
                con.anamnesis,
                con.examen_fisico,
                con.temperatura,
                con.peso,
                con.diagnostico,
                con.tratamiento,
                con.medicamentos,
                con.recomendaciones,
                con.proxima_cita,
                con.estado as consultation_estado,
                con.costo,
                con.created_at as consultation_created_at,
                con.updated_at as consultation_updated_at,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                m.edad,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.email as cliente_email,
                v.nombre as veterinario_nombre,
                v.email as veterinario_email
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            WHERE c.id_cita = $1
        `, [id]);

        if (citaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        const cita = citaResult.rows[0];

        // Si no tiene consulta vinculada
        if (!cita.id_consulta) {
            return res.status(404).json({
                success: false,
                message: 'Esta cita no tiene una historia clínica creada',
                data: {
                    appointment: {
                        id_cita: cita.id_cita,
                        codigo_cita: cita.codigo_cita,
                        estado: cita.estado,
                        has_consultation: false
                    }
                }
            });
        }

        // Estructurar la respuesta con la información de la consulta
        const consultationData = {
            id_consulta: cita.consultation_id,
            codigo_consulta: cita.codigo_consulta,
            fecha: cita.fecha,
            fecha_consulta: cita.fecha, // Agregar alias para compatibilidad con frontend
            motivo: cita.motivo,
            anamnesis: cita.anamnesis,
            examen_fisico: cita.examen_fisico,
            temperatura: cita.temperatura,
            peso: cita.peso,
            diagnostico: cita.diagnostico,
            tratamiento: cita.tratamiento,
            medicamentos: cita.medicamentos,
            recomendaciones: cita.recomendaciones,
            proxima_cita: cita.proxima_cita,
            estado: cita.consultation_estado,
            costo: cita.costo,
            created_at: cita.consultation_created_at,
            updated_at: cita.consultation_updated_at,
            // Información del paciente y veterinario
            mascota: {
                nombre: cita.mascota_nombre,
                especie: cita.especie,
                raza: cita.raza,
                edad: cita.edad
            },
            cliente: {
                nombre: cita.cliente_nombre,
                telefono: cita.cliente_telefono,
                email: cita.cliente_email
            },
            veterinario: {
                nombre: cita.veterinario_nombre,
                email: cita.veterinario_email
            },
            appointment: {
                id_cita: cita.id_cita,
                codigo_cita: cita.codigo_cita,
                estado: cita.estado,
                has_consultation: true
            }
        };

        res.json({
            success: true,
            message: 'Historia clínica obtenida exitosamente',
            data: consultationData
        });

    } catch (error) {
        console.error('Error obteniendo historia clínica de la cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Convertir timestamp local a string Colombia
 */
const formatearFechaColombia = (timestamp) => {
    if (!timestamp) return null;
    // Convertir TIMESTAMP WITHOUT TIME ZONE a string formato Colombia
    const fecha = new Date(timestamp + 'Z'); // Forzar como UTC para evitar conversión automática
    fecha.setHours(fecha.getHours() - 5); // Restar 5 horas para obtener Colombia
    return fecha.toISOString();
};

/**
 * Función auxiliar para obtener cita con detalles completos
 */
const getAppointmentWithDetails = async (id_cita, tenantId = null) => {
    const tenantFilter = tenantId ? ' AND c.id_tenant = $2' : '';
    const detailQuery = `
        SELECT 
            c.*,
            TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_inicio_colombia,
            TO_CHAR(c.fecha_fin, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_fin_colombia,
            TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_creacion,
            TO_CHAR(c.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_actualizacion,
            m.nombre as mascota_nombre,
            m.especie,
            m.raza,
            m.fecha_nacimiento,
            cl.nombre as cliente_nombre,
            cl.cedula as cliente_documento,
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
        LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
        LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta
        WHERE c.id_cita = $1${tenantFilter}
    `;
    
    const result = await query(detailQuery, tenantId ? [id_cita, tenantId] : [id_cita]);
    const cita = result.rows[0];
    
    if (cita) {
        // Reemplazar fechas automáticas con fechas formateadas como Colombia
        cita.fecha_inicio = cita.fecha_inicio_colombia;
        cita.fecha_fin = cita.fecha_fin_colombia;
        delete cita.fecha_inicio_colombia;
        delete cita.fecha_fin_colombia;
    }
    
    return cita || null;
};
