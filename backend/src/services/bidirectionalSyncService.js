import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from './googleCalendar.js';

class BidirectionalSyncService {
    
    /**
     * Importar eventos desde Google Calendar y crear citas en VetPlus
     */
    async importFromGoogle(startDate, endDate, options = {}) {
        try {
            const {
                autoMatch = true,      // Intentar matching automático de clientes/mascotas
                createMissingData = false, // Crear clientes/mascotas si no existen
                dryRun = false        // Solo simular, no crear realmente
            } = options;

            // Obtener eventos desde Google Calendar
            const importResult = await googleCalendarService.importEventsFromGoogle(startDate, endDate);
            
            if (!importResult.success) {
                return importResult;
            }

            const results = {
                total_google_events: importResult.total_events,
                vet_events_found: importResult.vet_events_found,
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: [],
                created_appointments: [],
                matched_data: []
            };

            // Procesar cada evento importado
            for (const eventData of importResult.imported_events) {
                try {
                    results.processed++;
                    
                    // Verificar si ya existe una cita con este google_event_id
                    const existingResult = await query(`
                        SELECT id_cita, codigo_cita, google_sync_status 
                        FROM clinical.calendario_citas 
                        WHERE google_event_id = $1
                    `, [eventData.google_event_id]);

                    if (existingResult.rows.length > 0) {
                        // Ya existe, verificar si necesita actualización
                        const existing = existingResult.rows[0];
                        const needsUpdate = await this.needsUpdate(existing.id_cita, eventData);
                        
                        if (needsUpdate && !dryRun) {
                            await this.updateAppointmentFromGoogle(existing.id_cita, eventData);
                            results.updated++;
                        } else {
                            results.skipped++;
                        }
                        continue;
                    }

                    // Intentar matching de cliente y mascota
                    let matchedData = null;
                    if (autoMatch) {
                        matchedData = await this.matchClientAndPet(eventData);
                        results.matched_data.push(matchedData);
                    }

                    // Si no se pudo hacer matching y no se permite crear datos faltantes, saltar
                    if (!matchedData?.cliente_id && !createMissingData) {
                        results.skipped++;
                        results.errors.push({
                            google_event_id: eventData.google_event_id,
                            error: 'No se pudo hacer matching de cliente/mascota'
                        });
                        continue;
                    }

                    // Crear la cita si no es dry run
                    if (!dryRun) {
                        const newAppointment = await this.createAppointmentFromGoogle(eventData, matchedData);
                        if (newAppointment.success) {
                            results.created++;
                            results.created_appointments.push(newAppointment.data);
                        } else {
                            results.errors.push({
                                google_event_id: eventData.google_event_id,
                                error: newAppointment.error
                            });
                        }
                    } else {
                        results.created++;
                    }

                } catch (error) {
                    results.errors.push({
                        google_event_id: eventData.google_event_id,
                        error: error.message
                    });
                }
            }

            // Actualizar última sincronización
            if (!dryRun) {
                await this.updateLastSyncTime('import_from_google');
            }

            return {
                success: true,
                results,
                dry_run: dryRun
            };

        } catch (error) {
            console.error('Error importando desde Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detectar y procesar cambios desde Google Calendar
     */
    async syncChangesFromGoogle() {
        try {
            // Obtener última sincronización
            const lastSyncResult = await query(`
                SELECT 
                    COALESCE(MAX(last_google_sync), CURRENT_TIMESTAMP - INTERVAL '1 day') as last_sync
                FROM clinical.calendario_citas
                WHERE google_event_id IS NOT NULL
            `);

            const lastSyncTime = lastSyncResult.rows[0]?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Detectar cambios en Google Calendar
            const changesResult = await googleCalendarService.detectChangesFromGoogle(lastSyncTime.toISOString());
            
            if (!changesResult.success) {
                return changesResult;
            }

            const results = {
                last_sync_time: lastSyncTime,
                total_changes: changesResult.total_changes,
                processed: 0,
                updated: 0,
                deleted: 0,
                created: 0,
                errors: []
            };

            // Procesar cada cambio
            for (const change of changesResult.changes) {
                try {
                    results.processed++;
                    
                    switch (change.change_type) {
                        case 'created':
                            const createResult = await this.handleGoogleEventCreated(change);
                            if (createResult.success) results.created++;
                            else results.errors.push(createResult.error);
                            break;

                        case 'updated':
                            const updateResult = await this.handleGoogleEventUpdated(change);
                            if (updateResult.success) results.updated++;
                            else results.errors.push(updateResult.error);
                            break;

                        case 'attendee_response':
                            const attendeeResult = await this.handleAttendeeResponse(change);
                            if (attendeeResult.success) results.updated++;
                            else results.errors.push(attendeeResult.error);
                            break;

                        case 'deleted':
                            const deleteResult = await this.handleGoogleEventDeleted(change);
                            if (deleteResult.success) results.deleted++;
                            else results.errors.push(deleteResult.error);
                            break;
                    }

                } catch (error) {
                    results.errors.push({
                        google_event_id: change.parsed_data?.google_event_id,
                        error: error.message
                    });
                }
            }

            // Actualizar marca de tiempo de sincronización
            await this.updateLastSyncTime('sync_changes_from_google');

            return {
                success: true,
                results
            };

        } catch (error) {
            console.error('Error sincronizando cambios desde Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Intentar hacer matching de cliente y mascota basado en los nombres
     */
    async matchClientAndPet(eventData) {
        try {
            const { cliente_nombre, mascota_nombre } = eventData;
            
            let cliente_id = null;
            let mascota_id = null;
            let veterinario_id = null;

            // Buscar cliente por nombre (coincidencia parcial)
            if (cliente_nombre) {
                const clienteResult = await query(`
                    SELECT id_cliente, nombre, telefono 
                    FROM clinical.clientes 
                    WHERE LOWER(nombre) LIKE LOWER($1) 
                    AND activo = true
                    ORDER BY 
                        CASE WHEN LOWER(nombre) = LOWER($2) THEN 1 ELSE 2 END,
                        nombre
                    LIMIT 1
                `, [`%${cliente_nombre}%`, cliente_nombre]);

                if (clienteResult.rows.length > 0) {
                    cliente_id = clienteResult.rows[0].id_cliente;
                }
            }

            // Buscar mascota por nombre y cliente
            if (mascota_nombre && cliente_id) {
                const mascotaResult = await query(`
                    SELECT id_mascota, nombre, especie 
                    FROM clinical.mascotas 
                    WHERE id_cliente = $1 
                    AND LOWER(nombre) LIKE LOWER($2)
                    AND activo = true
                    ORDER BY 
                        CASE WHEN LOWER(nombre) = LOWER($3) THEN 1 ELSE 2 END,
                        nombre
                    LIMIT 1
                `, [cliente_id, `%${mascota_nombre}%`, mascota_nombre]);

                if (mascotaResult.rows.length > 0) {
                    mascota_id = mascotaResult.rows[0].id_mascota;
                }
            }

            // Asignar veterinario por defecto (el primero disponible)
            const veterinarioResult = await query(`
                SELECT id_usuario 
                FROM vetplus_auth.usuarios 
                WHERE rol IN ('vet', 'admin') 
                AND activo = true 
                ORDER BY rol DESC, nombre
                LIMIT 1
            `);

            if (veterinarioResult.rows.length > 0) {
                veterinario_id = veterinarioResult.rows[0].id_usuario;
            }

            return {
                cliente_id,
                mascota_id,
                veterinario_id,
                cliente_nombre,
                mascota_nombre,
                match_score: this.calculateMatchScore(cliente_id, mascota_id, veterinario_id),
                needs_manual_review: !cliente_id || !mascota_id || !veterinario_id
            };

        } catch (error) {
            console.error('Error haciendo matching:', error);
            return {
                cliente_id: null,
                mascota_id: null,
                veterinario_id: null,
                error: error.message,
                needs_manual_review: true
            };
        }
    }

    /**
     * Calcular puntuación de matching
     */
    calculateMatchScore(cliente_id, mascota_id, veterinario_id) {
        let score = 0;
        if (cliente_id) score += 40;
        if (mascota_id) score += 40;
        if (veterinario_id) score += 20;
        return score;
    }

    /**
     * Crear cita desde evento de Google
     */
    async createAppointmentFromGoogle(eventData, matchedData) {
        try {
            if (!matchedData?.veterinario_id) {
                return {
                    success: false,
                    error: 'No se pudo asignar veterinario'
                };
            }

            const id_cita = uuidv4();
            const codigo_cita = `GCL-${Date.now().toString().slice(-8)}`;

            const insertQuery = `
                INSERT INTO clinical.calendario_citas (
                    id_cita, codigo_cita, id_mascota, id_veterinario,
                    fecha_inicio, fecha_fin, tipo, estado, motivo, notas,
                    google_event_id, google_sync_status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'synced', $12)
                RETURNING *
            `;

            const result = await query(insertQuery, [
                id_cita,
                codigo_cita,
                matchedData.mascota_id,
                matchedData.veterinario_id,
                eventData.fecha_inicio,
                eventData.fecha_fin,
                eventData.tipo,
                eventData.estado_vetplus || 'pendiente', // Usar el estado mapeado o pendiente por defecto
                eventData.motivo,
                `Importado desde Google Calendar. ${eventData.descripcion || ''}`,
                eventData.google_event_id,
                matchedData.veterinario_id // created_by
            ]);

            return {
                success: true,
                data: result.rows[0]
            };

        } catch (error) {
            console.error('Error creando cita desde Google:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar evento creado en Google
     */
    async handleGoogleEventCreated(change) {
        try {
            const matchedData = await this.matchClientAndPet(change.parsed_data);
            
            if (!matchedData.veterinario_id) {
                return {
                    success: false,
                    error: 'No se pudo asignar veterinario para evento creado'
                };
            }

            const result = await this.createAppointmentFromGoogle(change.parsed_data, matchedData);
            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar evento actualizado en Google
     */
    async handleGoogleEventUpdated(change) {
        try {
            // Buscar la cita existente
            const existingResult = await query(`
                SELECT 
                    cc.id_cita, 
                    cc.estado, 
                    cl.email as cliente_email 
                FROM clinical.calendario_citas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                WHERE cc.google_event_id = $1
            `, [change.parsed_data.google_event_id]);

            if (existingResult.rows.length === 0) {
                // No existe, crear nueva
                return await this.handleGoogleEventCreated(change);
            }

            const appointment = existingResult.rows[0];
            
            // Si hay cambios en asistentes, procesarlos primero
            if (change.attendee_changes && change.attendee_changes.length > 0) {
                await this.processAttendeeResponses(appointment.id_cita, change.attendee_changes, appointment.cliente_email);
            }

            // Actualizar cita existente con datos del evento
            const result = await this.updateAppointmentFromGoogle(
                appointment.id_cita, 
                change.parsed_data
            );

            return { 
                success: true, 
                data: result,
                change_type: change.change_type,
                attendee_changes_processed: change.attendee_changes?.length || 0
            };

        } catch (error) {
            console.error('Error manejando evento actualizado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar respuesta de asistente en Google
     */
    async handleAttendeeResponse(change) {
        try {
            console.log(`👥 Manejando respuesta de asistente para evento: ${change.parsed_data.google_event_id}`);
            
            // Buscar la cita existente
            const existingResult = await query(`
                SELECT 
                    cc.id_cita, 
                    cc.estado, 
                    cl.email as cliente_email 
                FROM clinical.calendario_citas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                WHERE cc.google_event_id = $1
            `, [change.parsed_data.google_event_id]);

            if (existingResult.rows.length === 0) {
                console.log(`⚠️ No se encontró cita con google_event_id: ${change.parsed_data.google_event_id}`);
                return { success: false, error: 'Cita no encontrada' };
            }

            const appointment = existingResult.rows[0];
            console.log(`📋 Cita encontrada: ${appointment.id_cita}, cliente: ${appointment.cliente_email}`);
            
            // Procesar las respuestas de asistentes
            if (change.attendee_changes && change.attendee_changes.length > 0) {
                await this.processAttendeeResponses(appointment.id_cita, change.attendee_changes, appointment.cliente_email);
            }

            return { 
                success: true, 
                data: appointment,
                change_type: change.change_type,
                attendee_changes_processed: change.attendee_changes?.length || 0
            };

        } catch (error) {
            console.error('Error manejando respuesta de asistente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Procesar respuestas de asistentes para actualizar estado de cita
     */
    async processAttendeeResponses(id_cita, attendeeChanges, clienteEmail) {
        try {
            console.log(`👥 Procesando respuestas de asistentes para cita ${id_cita}`);
            console.log(`📧 Email del cliente: ${clienteEmail}`);
            console.log(`👥 Cambios de asistentes recibidos:`, JSON.stringify(attendeeChanges, null, 2));
            
            // Obtener datos actuales de la cita
            const appointmentResult = await query(`
                SELECT estado FROM clinical.calendario_citas WHERE id_cita = $1
            `, [id_cita]);

            if (appointmentResult.rows.length === 0) {
                console.log(`❌ No se encontró la cita ${id_cita}`);
                return;
            }

            const appointment = appointmentResult.rows[0];
            console.log(`📋 Estado actual de la cita: ${appointment.estado}`);
            
            // Buscar respuesta del cliente (si corresponde)
            const clienteResponse = attendeeChanges.find(attendee => 
                attendee.email === clienteEmail && !attendee.is_organizer
            );

            if (clienteResponse) {
                console.log(`📧 Respuesta del cliente ${clienteEmail}: ${clienteResponse.response_status}`);
                
                // Mapear respuesta a estado de VetPlus
                let nuevoEstado = null;
                let notas = '';
                
                switch (clienteResponse.response_status) {
                    case 'accepted':
                        // Lógica simplificada: Una vez cancelada, debe contactar para reactivar
                        if (appointment.estado === 'cancelada') {
                            console.log(`🚫 Cita ${id_cita} cancelada - cliente debe contactar para reactivar`);
                            notas = 'Cliente intentó reactivar cita cancelada desde Google Calendar. Debe contactar directamente para reagendar.';
                            
                            // 🎯 NOTIFICAR AL CLIENTE - Forzar declined + agregar comentario
                            await this.notifyClientAboutReactivationDenied(
                                change.parsed_data.google_event_id, 
                                clienteEmail
                            );
                            
                            // No cambiamos el estado - sigue cancelada
                        } else {
                            nuevoEstado = 'confirmada';
                            notas = 'Cliente confirmó asistencia desde Google Calendar';
                        }
                        break;
                    case 'declined':
                        nuevoEstado = 'cancelada';
                        notas = 'Cliente canceló desde Google Calendar';
                        break;
                    case 'tentative':
                        // Cliente marcó como tentativo - siempre pendiente
                        nuevoEstado = 'pendiente';
                        notas = 'Cliente marcó como tentativo desde Google Calendar';
                        break;
                }

                if (nuevoEstado) {
                    console.log(`🔄 Actualizando estado de cita ${id_cita} a: ${nuevoEstado}`);
                    
                    // Verificar si la nota ya existe para evitar duplicados
                    const currentNotesResult = await query(`
                        SELECT notas FROM clinical.calendario_citas WHERE id_cita = $1
                    `, [id_cita]);
                    
                    const currentNotes = currentNotesResult.rows[0]?.notas || '';
                    const shouldAddNote = !currentNotes.includes(notas);
                    
                    let updateQuery;
                    let updateParams;
                    
                    if (shouldAddNote && currentNotes.trim()) {
                        // Agregar nota solo si no existe y hay notas previas
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                notas = $2 || ' | ' || $3,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $4
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, currentNotes, notas, id_cita];
                    } else if (shouldAddNote) {
                        // Primera nota o reemplazar nota vacía
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                notas = $2,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $3
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, notas, id_cita];
                    } else {
                        // Solo actualizar estado sin cambiar notas
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $2
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, id_cita];
                    }
                    
                    const updateResult = await query(updateQuery, updateParams);
                    console.log(`✅ Estado actualizado exitosamente:`, updateResult.rows[0]);
                } else {
                    console.log(`⚠️ Estado no reconocido: ${clienteResponse.response_status}`);
                }
            } else {
                console.log(`⚠️ No se encontró respuesta del cliente ${clienteEmail} en los cambios de asistentes`);
                console.log(`👥 Asistentes disponibles:`, attendeeChanges.map(a => `${a.email} (organizer: ${a.is_organizer})`));
            }

            // Log de todas las respuestas para auditoría
            for (const attendee of attendeeChanges) {
                await query(`
                    INSERT INTO clinical.google_calendar_audit_log 
                    (appointment_id, action_type, details, created_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                `, [
                    id_cita,
                    'attendee_response',
                    JSON.stringify({
                        email: attendee.email,
                        response: attendee.response_status,
                        display_name: attendee.display_name,
                        is_organizer: attendee.is_organizer
                    })
                ]);
            }

        } catch (error) {
            console.error('Error procesando respuestas de asistentes:', error);
            throw error;
        }
    }

    /**
     * Manejar evento eliminado en Google
     */
    async handleGoogleEventDeleted(change) {
        try {
            const result = await query(`
                UPDATE clinical.calendario_citas 
                SET 
                    estado = 'cancelada',
                    google_sync_status = 'synced',
                    notas = COALESCE(notas, '') || ' | Cancelada desde Google Calendar',
                    updated_at = CURRENT_TIMESTAMP
                WHERE google_event_id = $1
                RETURNING id_cita, codigo_cita
            `, [change.parsed_data.google_event_id]);

            return {
                success: true,
                data: result.rows[0] || null
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualizar cita desde Google
     */
    async updateAppointmentFromGoogle(id_cita, eventData) {
        const updateQuery = `
            UPDATE clinical.calendario_citas 
            SET 
                fecha_inicio = $1,
                fecha_fin = $2,
                tipo = $3,
                motivo = $4,
                google_sync_status = 'synced',
                last_google_sync = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $5
            RETURNING *
        `;

        const result = await query(updateQuery, [
            eventData.fecha_inicio,
            eventData.fecha_fin,
            eventData.tipo,
            eventData.motivo,
            id_cita
        ]);

        return result.rows[0];
    }

    /**
     * Verificar si una cita necesita actualización
     */
    async needsUpdate(id_cita, eventData) {
        const currentResult = await query(`
            SELECT fecha_inicio, fecha_fin, tipo, motivo 
            FROM clinical.calendario_citas 
            WHERE id_cita = $1
        `, [id_cita]);

        if (currentResult.rows.length === 0) return false;

        const current = currentResult.rows[0];
        
        return (
            new Date(current.fecha_inicio).getTime() !== new Date(eventData.fecha_inicio).getTime() ||
            new Date(current.fecha_fin).getTime() !== new Date(eventData.fecha_fin).getTime() ||
            current.tipo !== eventData.tipo ||
            current.motivo !== eventData.motivo
        );
    }

    /**
     * Actualizar marca de tiempo de última sincronización
     */
    async updateLastSyncTime(syncType) {
        await query(`
            UPDATE vetplus_auth.google_calendar_config 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE is_active = true
        `);
    }

    /**
     * Notificar al cliente que no puede reactivar una cita cancelada
     */
    async notifyClientAboutReactivationDenied(googleEventId, clienteEmail) {
        try {
            console.log(`📞 Notificando al cliente ${clienteEmail} que no puede reactivar la cita`);
            
            // Obtener información de contacto de la clínica
            const clinicInfo = await query(`
                SELECT telefono, direccion, nombre_empresa 
                FROM system.configuracion_empresa 
                WHERE activa = true 
                LIMIT 1
            `);
            
            const telefono = clinicInfo.rows[0]?.telefono || 'contacte la clínica';
            const nombreClinica = clinicInfo.rows[0]?.nombre_empresa || 'VetPlus';
            
            // Mensaje para agregar al evento
            const mensaje = `CITA CANCELADA PREVIAMENTE\n\n` +
                          `Esta cita fue cancelada y no puede reactivarse automáticamente.\n\n` +
                          `Para reagendar, contacte directamente:\n` +
                          `📞 ${telefono}\n` +
                          `🏥 ${nombreClinica}\n\n` +
                          `Gracias por su comprensión.`;

            // 1. Forzar estado "declined" para el cliente
            const statusResult = await googleCalendarService.updateAttendeeStatus(
                googleEventId, 
                clienteEmail, 
                'declined'
            );

            if (statusResult.success) {
                console.log(`✅ Estado de asistente forzado a 'declined' para ${clienteEmail}`);
            } else {
                console.log(`⚠️ No se pudo actualizar estado de asistente: ${statusResult.error}`);
            }

            // 2. Agregar comentario explicativo al evento
            const commentResult = await googleCalendarService.addCommentToEvent(
                googleEventId,
                mensaje
            );

            if (commentResult.success) {
                console.log(`✅ Comentario explicativo agregado al evento ${googleEventId}`);
            } else {
                console.log(`⚠️ No se pudo agregar comentario: ${commentResult.error}`);
            }

            return {
                success: true,
                message: 'Cliente notificado sobre restricción de reactivación'
            };

        } catch (error) {
            console.error('Error notificando al cliente sobre reactivación denegada:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new BidirectionalSyncService();