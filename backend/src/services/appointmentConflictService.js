import { query } from '../config/database.js';
import googleCalendarService from './googleCalendar.js';

class AppointmentConflictService {
    
    /**
     * Verificar conflictos en base de datos local
     */
    async checkDatabaseConflicts(veterinarioId, fechaInicio, fechaFin, excludeAppointmentId = null) {
        try {
            let conflictQuery = `
                SELECT id_cita, codigo_cita, fecha_inicio, fecha_fin, tipo, motivo
                FROM clinical.calendario_citas 
                WHERE id_veterinario = $1 
                AND LOWER(estado) NOT IN ('cancelada', 'no asistió', 'completada', 'no_asistio')
                AND (
                    (fecha_inicio <= $2 AND fecha_fin > $2) OR
                    (fecha_inicio < $3 AND fecha_fin >= $3) OR
                    (fecha_inicio >= $2 AND fecha_fin <= $3)
                )
            `;
            
            const queryParams = [veterinarioId, fechaInicio, fechaFin];
            
            // Excluir cita específica si se está actualizando
            if (excludeAppointmentId) {
                conflictQuery += ' AND id_cita::text != $4::text';
                queryParams.push(excludeAppointmentId.toString());
            }
            
            // Debug logs - Ver todas las citas del veterinario primero
            const allAppointmentsQuery = `
                SELECT id_cita, codigo_cita, fecha_inicio, fecha_fin, tipo, estado
                FROM clinical.calendario_citas 
                WHERE id_veterinario = $1 
                ORDER BY fecha_inicio
            `;
            const allAppointments = await query(allAppointmentsQuery, [veterinarioId]);
            
            console.log('📅 Todas las citas del veterinario:', {
                veterinarioId,
                total_citas: allAppointments.rows.length,
                citas: allAppointments.rows.map(row => ({
                    id_cita: row.id_cita,
                    codigo_cita: row.codigo_cita,
                    fecha_inicio: row.fecha_inicio,
                    fecha_fin: row.fecha_fin,
                    tipo: row.tipo,
                    estado: row.estado,
                    es_cita_a_editar: row.id_cita === excludeAppointmentId
                }))
            });
            
            console.log('🔍 Verificando conflictos:', {
                veterinarioId,
                fechaInicio,
                fechaFin,
                excludeAppointmentId,
                query: conflictQuery,
                params: queryParams
            });
            
            const result = await query(conflictQuery, queryParams);
            
            console.log('📋 Conflictos encontrados:', {
                count: result.rows.length,
                conflicts: result.rows.map(row => ({
                    id_cita: row.id_cita,
                    fecha_inicio: row.fecha_inicio,
                    fecha_fin: row.fecha_fin,
                    tipo: row.tipo,
                    es_cita_actual: row.id_cita === excludeAppointmentId
                }))
            });
            
            return {
                hasConflicts: result.rows.length > 0,
                conflicts: result.rows,
                source: 'database'
            };
            
        } catch (error) {
            console.error('Error verificando conflictos en base de datos:', error);
            return {
                hasConflicts: false,
                conflicts: [],
                error: error.message
            };
        }
    }
    
    /**
     * Verificar conflictos en Google Calendar
     */
    async checkGoogleCalendarConflicts(fechaInicio, fechaFin, excludeAppointmentId = null) {
        try {
            console.log('🔍 Google Calendar check iniciado:', {
                fechaInicio,
                fechaFin,
                excludeAppointmentId
            });
            
            // SOLUCIÓN TEMPORAL: Deshabilitar verificación de Google Calendar 
            // para permitir citas simultáneas de diferentes veterinarios
            console.log('⚠️ TEMPORAL: Verificación de Google Calendar deshabilitada para permitir múltiples veterinarios');
            return {
                hasConflicts: false,
                conflicts: [],
                available: true,
                message: 'Verificación de Google Calendar temporalmente deshabilitada para permitir múltiples veterinarios'
            };
            
            if (!await googleCalendarService.hasValidTokens()) {
                console.log('📝 Google Calendar no configurado - omitiendo verificación');
                return {
                    hasConflicts: false,
                    conflicts: [],
                    available: true,
                    message: 'Google Calendar no configurado - verificación omitida'
                };
            }
            
            const availabilityResult = await googleCalendarService.checkAvailability(fechaInicio, fechaFin);
            console.log('📊 Google Calendar availability result:', availabilityResult);
            
            if (!availabilityResult.success) {
                console.log('❌ Google Calendar check falló, continuando sin verificación');
                return {
                    hasConflicts: false,
                    conflicts: [],
                    available: true,
                    error: availabilityResult.error,
                    message: 'Error verificando Google Calendar - continuando sin verificación'
                };
            }
            
            // Aquí está el problema potencial: Google Calendar puede estar detectando la misma cita como conflicto
            const result = {
                hasConflicts: !availabilityResult.available,
                conflicts: availabilityResult.conflicts || [],
                available: availabilityResult.available,
                source: 'google_calendar'
            };
            
            console.log('📋 Google Calendar result final:', {
                hasConflicts: result.hasConflicts,
                available: result.available,
                conflicts_count: result.conflicts.length,
                conflicts: result.conflicts,
                excludeAppointmentId
            });
            
            // SOLUCIÓN TEMPORAL: Si estamos editando una cita existente, omitir verificación de Google Calendar
            // para evitar falsos conflictos hasta que se implemente el filtrado correcto
            if (excludeAppointmentId && result.hasConflicts) {
                console.log('🔄 SOLUCIÓN TEMPORAL: Omitiendo verificación de Google Calendar durante edición');
                console.log('🔍 Conflictos detectados en Google Calendar:', result.conflicts);
                console.warn('⚠️ POSIBLE CAUSA DEL 409: Google Calendar detecta la cita actual como conflicto durante edición');
                
                // Devolver disponible para ediciones hasta que se implemente el filtrado correcto
                return {
                    hasConflicts: false,
                    conflicts: [],
                    available: true,
                    source: 'google_calendar',
                    message: 'Verificación de Google Calendar omitida durante edición para evitar falsos conflictos'
                };
            }
            
            return result;
            
        } catch (error) {
            console.error('Error verificando conflictos en Google Calendar:', error);
            return {
                hasConflicts: false,
                conflicts: [],
                available: true,
                error: error.message,
                message: 'Error verificando Google Calendar - continuando sin verificación'
            };
        }
    }
    
    /**
     * Verificar conflictos completos (BD + Google Calendar)
     */
    async checkAllConflicts(veterinarioId, fechaInicio, fechaFin, excludeAppointmentId = null) {
        try {
            // Ejecutar ambas verificaciones en paralelo
            const [dbResult, googleResult] = await Promise.all([
                this.checkDatabaseConflicts(veterinarioId, fechaInicio, fechaFin, excludeAppointmentId),
                this.checkGoogleCalendarConflicts(fechaInicio, fechaFin, excludeAppointmentId)
            ]);
            
            const hasAnyConflicts = dbResult.hasConflicts || googleResult.hasConflicts;
            
            console.log('🔄 Resumen verificación completa:', {
                dbResult_hasConflicts: dbResult.hasConflicts,
                googleResult_hasConflicts: googleResult.hasConflicts,
                hasAnyConflicts: hasAnyConflicts,
                excludeAppointmentId
            });
            
            const conflictDetails = {
                hasConflicts: hasAnyConflicts,
                database: {
                    hasConflicts: dbResult.hasConflicts,
                    conflicts: dbResult.conflicts || [],
                    error: dbResult.error
                },
                google_calendar: {
                    hasConflicts: googleResult.hasConflicts,
                    conflicts: googleResult.conflicts || [],
                    available: googleResult.available,
                    error: googleResult.error,
                    message: googleResult.message
                },
                summary: {
                    total_conflicts: (dbResult.conflicts?.length || 0) + (googleResult.conflicts?.length || 0),
                    conflict_sources: []
                }
            };
            
            if (dbResult.hasConflicts) {
                conflictDetails.summary.conflict_sources.push('database');
            }
            if (googleResult.hasConflicts) {
                conflictDetails.summary.conflict_sources.push('google_calendar');
            }
            
            return conflictDetails;
            
        } catch (error) {
            console.error('Error verificando conflictos completos:', error);
            return {
                hasConflicts: false,
                database: { hasConflicts: false, conflicts: [] },
                google_calendar: { hasConflicts: false, conflicts: [], available: true },
                summary: { total_conflicts: 0, conflict_sources: [] },
                error: error.message
            };
        }
    }
    
    /**
     * Obtener disponibilidad del veterinario para un rango de fechas
     */
    async getVeterinarianAvailability(veterinarioId, fechaInicio, fechaFin) {
        try {
            // Obtener todas las citas programadas del veterinario
            const appointmentsQuery = `
                SELECT 
                    id_cita,
                    codigo_cita,
                    fecha_inicio,
                    fecha_fin,
                    tipo,
                    estado,
                    google_sync_status
                FROM clinical.calendario_citas 
                WHERE id_veterinario = $1 
                AND fecha_inicio >= $2 
                AND fecha_fin <= $3
                AND LOWER(estado) NOT IN ('cancelada', 'no asistió', 'no_asistio')
                ORDER BY fecha_inicio ASC
            `;
            
            const appointments = await query(appointmentsQuery, [veterinarioId, fechaInicio, fechaFin]);
            
            // Verificar disponibilidad en Google Calendar también
            const googleAvailability = await this.checkGoogleCalendarConflicts(fechaInicio, fechaFin);
            
            return {
                success: true,
                period: {
                    start: fechaInicio,
                    end: fechaFin,
                    veterinarian_id: veterinarioId
                },
                appointments: appointments.rows,
                google_calendar: {
                    configured: await googleCalendarService.hasValidTokens(),
                    available: googleAvailability.available,
                    conflicts: googleAvailability.conflicts || []
                },
                availability_summary: {
                    total_appointments: appointments.rows.length,
                    has_google_conflicts: googleAvailability.hasConflicts,
                    is_fully_available: appointments.rows.length === 0 && googleAvailability.available
                }
            };
            
        } catch (error) {
            console.error('Error obteniendo disponibilidad del veterinario:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Sugerir horarios alternativos sin conflictos
     */
    async suggestAlternativeSlots(veterinarioId, fechaBase, duracionMinutos = 60, sugerencias = 5) {
        try {
            const suggestions = [];
            const duration = duracionMinutos * 60 * 1000; // Convertir a millisegundos
            const baseDate = new Date(fechaBase);
            
            // Horarios de trabajo típicos: 8:00 AM a 6:00 PM
            const workStartHour = 8;
            const workEndHour = 18;
            
            // Buscar slots disponibles en los próximos 7 días
            for (let dayOffset = 0; dayOffset < 7 && suggestions.length < sugerencias; dayOffset++) {
                const currentDate = new Date(baseDate);
                currentDate.setDate(baseDate.getDate() + dayOffset);
                
                // Saltar fines de semana (opcional)
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;
                
                // Probar slots cada 30 minutos
                for (let hour = workStartHour; hour < workEndHour && suggestions.length < sugerencias; hour++) {
                    for (let minutes = 0; minutes < 60; minutes += 30) {
                        if (suggestions.length >= sugerencias) break;
                        
                        const slotStart = new Date(currentDate);
                        slotStart.setHours(hour, minutes, 0, 0);
                        
                        const slotEnd = new Date(slotStart.getTime() + duration);
                        
                        // Verificar conflictos para este slot
                        const conflicts = await this.checkAllConflicts(
                            veterinarioId,
                            slotStart.toISOString(),
                            slotEnd.toISOString()
                        );
                        
                        if (!conflicts.hasConflicts) {
                            suggestions.push({
                                start: slotStart.toISOString(),
                                end: slotEnd.toISOString(),
                                date: slotStart.toDateString(),
                                time: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                                duration_minutes: duracionMinutos
                            });
                        }
                    }
                }
            }
            
            return {
                success: true,
                suggestions,
                total_found: suggestions.length,
                search_parameters: {
                    veterinarian_id: veterinarioId,
                    base_date: fechaBase,
                    duration_minutes: duracionMinutos,
                    max_suggestions: sugerencias
                }
            };
            
        } catch (error) {
            console.error('Error sugiriendo horarios alternativos:', error);
            return {
                success: false,
                error: error.message,
                suggestions: []
            };
        }
    }
}

export default new AppointmentConflictService();