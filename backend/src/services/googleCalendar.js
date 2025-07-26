import { google } from 'googleapis';
import { query } from '../config/database.js';

class GoogleCalendarService {
    constructor() {
        this.calendar = null;
        this.auth = null;
        this.config = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Obtener configuración activa de la base de datos
            await this.loadConfig();
            
            if (this.config) {
                this.auth = new google.auth.OAuth2(
                    this.config.client_id,
                    this.config.client_secret,
                    this.config.redirect_uri
                );

                if (this.config.refresh_token) {
                    this.auth.setCredentials({
                        refresh_token: this.config.refresh_token,
                        access_token: this.config.access_token
                    });
                }

                this.calendar = google.calendar({ version: 'v3', auth: this.auth });
            }
        } catch (error) {
            console.error('Error inicializando Google Calendar Auth:', error);
        }
    }

    async loadConfig() {
        try {
            const result = await query(`
                SELECT * FROM auth.google_calendar_config 
                WHERE is_active = true 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            this.config = result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error cargando configuración de Google Calendar:', error);
            this.config = null;
        }
    }

    /**
     * Reinicializar servicio con nueva configuración
     */
    async reinitializeWithConfig(newConfig) {
        this.config = newConfig;
        
        this.auth = new google.auth.OAuth2(
            newConfig.client_id,
            newConfig.client_secret,
            newConfig.redirect_uri
        );

        if (newConfig.refresh_token) {
            this.auth.setCredentials({
                refresh_token: newConfig.refresh_token,
                access_token: newConfig.access_token
            });
        }

        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    }

    /**
     * Verificar si las credenciales están configuradas
     */
    async isConfigured() {
        if (!this.config) {
            await this.loadConfig();
        }
        
        return !!(
            this.config &&
            this.config.client_id &&
            this.config.client_secret &&
            this.config.redirect_uri &&
            this.config.is_active
        );
    }

    /**
     * Verificar si tiene tokens válidos
     */
    async hasValidTokens() {
        return await this.isConfigured() && this.config.refresh_token;
    }

    /**
     * Probar conexión con Google Calendar
     */
    async testConnection() {
        try {
            if (!await this.hasValidTokens()) {
                return {
                    success: false,
                    message: 'Google Calendar no está configurado o no tiene tokens válidos'
                };
            }

            // Intentar listar calendarios para probar la conexión
            const response = await this.calendar.calendarList.list({
                maxResults: 1
            });

            return {
                success: true,
                message: 'Conexión exitosa con Google Calendar',
                calendar_count: response.data.items?.length || 0
            };

        } catch (error) {
            console.error('Error probando conexión con Google Calendar:', error);
            return {
                success: false,
                message: 'Error de conexión: ' + error.message
            };
        }
    }

    /**
     * Crear evento en Google Calendar
     */
    async createEvent(eventData) {
        try {
            if (!await this.hasValidTokens()) {
                throw new Error('Google Calendar no está configurado');
            }

            const {
                summary,
                description,
                startDateTime,
                endDateTime,
                attendeeEmail,
                location
            } = eventData;

            const event = {
                summary,
                description,
                location: location || process.env.CLINIC_ADDRESS || 'VetPlus Clínica',
                start: {
                    dateTime: startDateTime,
                    timeZone: this.config.timezone
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: this.config.timezone
                },
                attendees: [],
                reminders: {
                    useDefault: false,
                    overrides: []
                }
            };

            // Configurar recordatorios basados en la configuración
            if (this.config.notification_email) {
                event.reminders.overrides.push({ 
                    method: 'email', 
                    minutes: this.config.email_reminder_hours * 60 
                });
            }
            
            if (this.config.notification_popup) {
                event.reminders.overrides.push({ 
                    method: 'popup', 
                    minutes: this.config.default_reminder_minutes 
                });
            }

            // Agregar asistente si se proporciona email
            if (attendeeEmail) {
                event.attendees.push({ email: attendeeEmail });
            }

            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                sendUpdates: 'all' // Enviar notificaciones a asistentes
            });

            return {
                success: true,
                eventId: response.data.id,
                eventLink: response.data.htmlLink,
                data: response.data
            };

        } catch (error) {
            console.error('Error creando evento en Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualizar evento en Google Calendar
     */
    async updateEvent(eventId, eventData) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            const {
                summary,
                description,
                startDateTime,
                endDateTime,
                attendeeEmail,
                location
            } = eventData;

            const event = {
                summary,
                description,
                location: location || process.env.CLINIC_ADDRESS || 'VetPlus Clínica',
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/Bogota'
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/Bogota'
                },
                attendees: [],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 30 }
                    ]
                }
            };

            if (attendeeEmail) {
                event.attendees.push({ email: attendeeEmail });
            }

            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: event,
                sendUpdates: 'all'
            });

            return {
                success: true,
                eventId: response.data.id,
                eventLink: response.data.htmlLink,
                data: response.data
            };

        } catch (error) {
            console.error('Error actualizando evento en Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Eliminar evento de Google Calendar
     */
    async deleteEvent(eventId) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all'
            });

            return {
                success: true,
                message: 'Evento eliminado exitosamente'
            };

        } catch (error) {
            console.error('Error eliminando evento en Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener evento de Google Calendar
     */
    async getEvent(eventId) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            const response = await this.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Error obteniendo evento de Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Listar eventos en un rango de fechas
     */
    async listEvents(startDateTime, endDateTime) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: startDateTime,
                timeMax: endDateTime,
                singleEvents: true,
                orderBy: 'startTime'
            });

            return {
                success: true,
                events: response.data.items || []
            };

        } catch (error) {
            console.error('Error listando eventos de Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar disponibilidad en Google Calendar
     */
    async checkAvailability(startDateTime, endDateTime) {
        try {
            if (!this.isConfigured()) {
                return { success: true, available: true }; // Si no está configurado, asumimos disponible
            }

            const response = await this.calendar.freebusy.query({
                resource: {
                    timeMin: startDateTime,
                    timeMax: endDateTime,
                    items: [{ id: 'primary' }]
                }
            });

            const busy = response.data.calendars.primary.busy || [];
            const available = busy.length === 0;

            return {
                success: true,
                available,
                conflicts: busy
            };

        } catch (error) {
            console.error('Error verificando disponibilidad en Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Importar eventos desde Google Calendar
     */
    async importEventsFromGoogle(startDate, endDate) {
        try {
            if (!await this.hasValidTokens()) {
                return {
                    success: false,
                    error: 'Google Calendar no está configurado'
                };
            }

            const eventsResult = await this.listEvents(startDate, endDate);
            
            if (!eventsResult.success) {
                return eventsResult;
            }

            // Filtrar solo eventos que parecen ser citas veterinarias
            const vetEvents = eventsResult.events.filter(event => {
                const summary = event.summary || '';
                // Buscar patrones que indican que es una cita veterinaria
                return summary.includes('VetPlus') || 
                       summary.includes('Cita') || 
                       summary.includes('Consulta') ||
                       (event.description && event.description.includes('VetPlus'));
            });

            const importedEvents = [];
            const errors = [];

            // Procesar cada evento
            for (const event of vetEvents) {
                try {
                    const eventData = this.parseGoogleEventToVetPlus(event);
                    if (eventData) {
                        importedEvents.push(eventData);
                    }
                } catch (error) {
                    errors.push({
                        event_id: event.id,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                total_events: eventsResult.events.length,
                vet_events_found: vetEvents.length,
                imported_events: importedEvents,
                errors: errors
            };

        } catch (error) {
            console.error('Error importando eventos desde Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parsear evento de Google a formato VetPlus
     */
    parseGoogleEventToVetPlus(googleEvent) {
        try {
            const {
                id,
                summary,
                description,
                start,
                end,
                status,
                updated
            } = googleEvent;

            // Extraer información del título y descripción
            let mascotaNombre = null;
            let clienteNombre = null;
            let tipo = 'Consulta';
            let motivo = 'Importado desde Google Calendar';

            // Intentar extraer información del título (formato: "Tipo - Mascota (Cliente)")
            const titleMatch = summary?.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);
            if (titleMatch) {
                tipo = titleMatch[1].trim();
                mascotaNombre = titleMatch[2].trim();
                clienteNombre = titleMatch[3].trim();
            }

            // Intentar extraer información adicional de la descripción
            if (description) {
                const mascotaMatch = description.match(/🐕\s*Mascota:\s*(.+?)(?:\n|$)/);
                const clienteMatch = description.match(/👤\s*Cliente:\s*(.+?)(?:\n|$)/);
                const tipoMatch = description.match(/📋\s*Tipo:\s*(.+?)(?:\n|$)/);
                const motivoMatch = description.match(/📝\s*Motivo:\s*(.+?)(?:\n|$)/);

                if (mascotaMatch) mascotaNombre = mascotaMatch[1].trim();
                if (clienteMatch) clienteNombre = clienteMatch[1].trim();
                if (tipoMatch) tipo = tipoMatch[1].trim();
                if (motivoMatch) motivo = motivoMatch[1].trim();
            }

            return {
                google_event_id: id,
                titulo: summary || 'Evento importado',
                descripcion: description || 'Evento importado desde Google Calendar',
                fecha_inicio: start.dateTime || start.date,
                fecha_fin: end.dateTime || end.date,
                tipo: tipo,
                motivo: motivo,
                estado_google: status || 'confirmed',
                ultima_modificacion: updated,
                mascota_nombre: mascotaNombre,
                cliente_nombre: clienteNombre,
                requiere_matching: !mascotaNombre || !clienteNombre // Indica si necesita matching manual
            };

        } catch (error) {
            console.error('Error parseando evento de Google:', error);
            return null;
        }
    }

    /**
     * Detectar cambios en Google Calendar desde la última sincronización
     */
    async detectChangesFromGoogle(lastSyncTime) {
        try {
            if (!await this.hasValidTokens()) {
                return {
                    success: false,
                    error: 'Google Calendar no está configurado'
                };
            }

            // Obtener eventos modificados desde la última sincronización
            const response = await this.calendar.events.list({
                calendarId: this.config.calendar_id || 'primary',
                updatedMin: lastSyncTime,
                singleEvents: true,
                orderBy: 'updated',
                maxResults: 100
            });

            if (!response.data.items) {
                return {
                    success: true,
                    changes: [],
                    total_changes: 0
                };
            }

            const changes = [];
            
            for (const event of response.data.items) {
                // Solo procesar eventos que parecen ser de VetPlus
                if (this.isVetPlusEvent(event)) {
                    const changeType = this.determineChangeType(event);
                    const parsedEvent = this.parseGoogleEventToVetPlus(event);
                    
                    if (parsedEvent) {
                        changes.push({
                            change_type: changeType,
                            google_event: event,
                            parsed_data: parsedEvent
                        });
                    }
                }
            }

            return {
                success: true,
                changes: changes,
                total_changes: changes.length,
                last_check: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error detectando cambios en Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar si un evento es de VetPlus
     */
    isVetPlusEvent(event) {
        const summary = event.summary || '';
        const description = event.description || '';
        
        return summary.includes('VetPlus') || 
               summary.includes('Cita') || 
               summary.includes('Consulta') ||
               description.includes('VetPlus') ||
               description.includes('Código de cita:');
    }

    /**
     * Determinar el tipo de cambio (created, updated, deleted)
     */
    determineChangeType(event) {
        if (event.status === 'cancelled') {
            return 'deleted';
        } else if (event.created === event.updated) {
            return 'created';
        } else {
            return 'updated';
        }
    }

    /**
     * Obtener URL de autorización (para configuración inicial)
     */
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        return this.auth.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    /**
     * Obtener tokens a partir del código de autorización
     */
    async getTokens(code) {
        try {
            const { tokens } = await this.auth.getToken(code);
            return {
                success: true,
                tokens
            };
        } catch (error) {
            console.error('Error obteniendo tokens:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new GoogleCalendarService();