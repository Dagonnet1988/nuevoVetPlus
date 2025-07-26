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
                FROM auth.usuarios 
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
                    fecha_inicio, fecha_fin, tipo, motivo, notas,
                    google_event_id, google_sync_status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'synced', $11)
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
                SELECT id_cita FROM clinical.calendario_citas 
                WHERE google_event_id = $1
            `, [change.parsed_data.google_event_id]);

            if (existingResult.rows.length === 0) {
                // No existe, crear nueva
                return await this.handleGoogleEventCreated(change);
            }

            // Actualizar cita existente
            const result = await this.updateAppointmentFromGoogle(
                existingResult.rows[0].id_cita, 
                change.parsed_data
            );

            return { success: true, data: result };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
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
                    estado = 'Cancelada',
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
            UPDATE auth.google_calendar_config 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE is_active = true
        `);
    }
}

export default new BidirectionalSyncService();