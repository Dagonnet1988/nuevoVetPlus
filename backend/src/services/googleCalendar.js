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
            console.log('🔧 Inicializando autenticación de Google Calendar...');
            // Obtener configuración activa de la base de datos
            await this.loadConfig();
            
            if (this.config) {
                console.log('📋 Configuración encontrada:', {
                    client_id: this.config.client_id ? `${this.config.client_id.substring(0, 10)}...` : 'NO',
                    redirect_uri: this.config.redirect_uri,
                    has_refresh_token: !!this.config.refresh_token
                });
                
                this.auth = new google.auth.OAuth2(
                    this.config.client_id,
                    this.config.client_secret,
                    this.config.redirect_uri
                );

                if (this.config.refresh_token) {
                    console.log('🔑 Configurando tokens existentes...');
                    this.auth.setCredentials({
                        refresh_token: this.config.refresh_token,
                        access_token: this.config.access_token
                    });
                }

                this.calendar = google.calendar({ version: 'v3', auth: this.auth });
                console.log('✅ Google Calendar Auth inicializado exitosamente');
            } else {
                console.log('⚠️ No se encontró configuración de Google Calendar');
            }
        } catch (error) {
            console.error('❌ Error inicializando Google Calendar Auth:', error);
        }
    }

    async loadConfig() {
        try {
            const result = await query(`
                SELECT * FROM vetplus_auth.google_calendar_config 
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

            // Determinar zona horaria (usar siempre Colombia como predeterminado)
            const timeZone = this.config?.timezone || 'America/Bogota';

            console.log('📅 Creando evento en Google Calendar:', {
                summary,
                startDateTime,
                endDateTime,
                timeZone,
                config_timezone: this.config?.timezone,
                env_timezone: process.env.TZ
            });

            const event = {
                summary,
                description,
                location: location || process.env.CLINIC_ADDRESS || 'VetPlus Clínica',
                start: {
                    dateTime: startDateTime,
                    timeZone: timeZone
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: timeZone
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
     * Actualizar estado de asistente específico en evento
     */
    async updateAttendeeStatus(eventId, attendeeEmail, responseStatus) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            // Primero obtener el evento actual
            const getResponse = await this.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            const event = getResponse.data;
            
            // Actualizar el estado del asistente específico
            if (event.attendees) {
                const attendeeIndex = event.attendees.findIndex(att => att.email === attendeeEmail);
                if (attendeeIndex !== -1) {
                    event.attendees[attendeeIndex].responseStatus = responseStatus;
                }
            }

            // Actualizar el evento
            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: event,
                sendUpdates: 'all'
            });

            return {
                success: true,
                message: `Estado de asistente actualizado a ${responseStatus}`,
                data: response.data
            };

        } catch (error) {
            console.error('Error actualizando estado de asistente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Agregar comentario explicativo al evento
     */
    async addCommentToEvent(eventId, comment) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            // Obtener el evento actual
            const getResponse = await this.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            const event = getResponse.data;
            
            // Agregar comentario a la descripción
            const currentDescription = event.description || '';
            const newDescription = currentDescription + '\n\n⚠️ ' + comment;
            
            event.description = newDescription;

            // Actualizar el evento
            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: event,
                sendUpdates: 'all'
            });

            return {
                success: true,
                message: 'Comentario agregado exitosamente',
                data: response.data
            };

        } catch (error) {
            console.error('Error agregando comentario al evento:', error);
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
     * Verificar y refrescar token si es necesario antes de operaciones
     */
    async ensureValidToken() {
        try {
            if (!this.auth || !this.config) {
                throw new Error('No hay configuración de autenticación');
            }

            // Verificar si tenemos tokens
            const credentials = await this.auth.getAccessToken();
            if (!credentials || !credentials.token) {
                throw new Error('No hay token de acceso válido');
            }

            console.log('🔑 Verificando validez del token...');
            
            // Probar el token haciendo una llamada simple
            try {
                await this.calendar.calendarList.list({ maxResults: 1 });
                console.log('✅ Token válido');
                return true;
            } catch (error) {
                if (error.status === 401) {
                    console.log('🔄 Token expirado, refrescando...');
                    await this.refreshAccessToken();
                    return true;
                }
                throw error;
            }
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            throw error;
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

            // Verificar y refrescar token si es necesario
            await this.ensureValidToken();

            // Validar y formatear fechas para Google Calendar API
            let formattedStartDate, formattedEndDate;
            
            try {
                // Si las fechas son solo en formato YYYY-MM-DD, agregar tiempo
                if (startDateTime && !startDateTime.includes('T')) {
                    formattedStartDate = startDateTime + 'T00:00:00Z';
                } else {
                    formattedStartDate = new Date(startDateTime).toISOString();
                }
                
                if (endDateTime && !endDateTime.includes('T')) {
                    formattedEndDate = endDateTime + 'T23:59:59Z';
                } else {
                    formattedEndDate = new Date(endDateTime).toISOString();
                }
            } catch (dateError) {
                throw new Error(`Formato de fecha inválido: ${dateError.message}`);
            }

            console.log('📅 Listando eventos de Google Calendar:', {
                originalStart: startDateTime,
                originalEnd: endDateTime,
                formattedStart: formattedStartDate,
                formattedEnd: formattedEndDate,
                calendarId: 'primary'
            });

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: formattedStartDate,
                timeMax: formattedEndDate,
                singleEvents: true,
                orderBy: 'startTime'
            });

            console.log('✅ Eventos obtenidos:', response.data.items?.length || 0);

            return {
                success: true,
                events: response.data.items || []
            };

        } catch (error) {
            console.error('Error listando eventos de Google Calendar:', error);
            console.error('Error details:', {
                status: error.status,
                code: error.code,
                message: error.message,
                cause: error.cause,
                responseData: error.response?.data,
                errors: error.cause?.errors,
                config: error.config ? {
                    url: error.config.url,
                    method: error.config.method,
                    params: error.config.params
                } : null
            });
            
            // Log completo del error de Google API
            if (error.cause?.errors) {
                console.error('🔍 Errores específicos de Google API:');
                error.cause.errors.forEach((err, index) => {
                    console.error(`Error ${index + 1}:`, JSON.stringify(err, null, 2));
                });
            }
            
            // Si es error de autenticación, intentar refrescar token
            if (error.status === 401 || error.code === 401) {
                console.log('🔄 Token expirado, intentando refrescar...');
                try {
                    await this.refreshAccessToken();
                    console.log('✅ Token refrescado, reintentando...');
                    
                    // Reintentar la operación
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
                } catch (refreshError) {
                    console.error('❌ Error al refrescar token:', refreshError);
                    return {
                        success: false,
                        error: 'Token expirado y no se pudo refrescar: ' + refreshError.message
                    };
                }
            }
            
            return {
                success: false,
                error: error.message,
                details: error.cause || error.response?.data
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
     * Mapear estado de Google Calendar a estado de VetPlus
     */
    mapGoogleStatusToVetPlus(googleStatus, fechaInicio) {
        const ahora = new Date();
        const fechaCita = new Date(fechaInicio);
        
        // Mapeo de estados
        switch (googleStatus) {
            case 'confirmed':
                // Si la fecha ya pasó, considerarla completada
                if (fechaCita < ahora) {
                    return 'completada';
                }
                // Si es muy próxima (menos de 1 hora), está en curso
                const diferencia = fechaCita.getTime() - ahora.getTime();
                if (diferencia <= 60 * 60 * 1000 && diferencia > -30 * 60 * 1000) { // 1 hora antes a 30 min después
                    return 'en_curso';
                }
                return 'confirmada';
                
            case 'tentative':
                return 'pendiente';
                
            case 'cancelled':
                return 'cancelada';
                
            default:
                return 'pendiente';
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
                estado_vetplus: this.mapGoogleStatusToVetPlus(status, start.dateTime || start.date),
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

            console.log('🔍 Detectando cambios desde:', lastSyncTime);

            // Obtener eventos modificados desde la última sincronización
            const response = await this.calendar.events.list({
                calendarId: this.config.calendar_id || 'primary',
                updatedMin: lastSyncTime,
                singleEvents: true,
                orderBy: 'updated',
                maxResults: 100
            });

            if (!response.data.items) {
                console.log('📅 No hay eventos para procesar');
                return {
                    success: true,
                    changes: [],
                    total_changes: 0
                };
            }

            console.log(`📅 Procesando ${response.data.items.length} eventos actualizados`);
            const changes = [];
            
            for (const event of response.data.items) {
                // Solo procesar eventos que parecen ser de VetPlus
                if (this.isVetPlusEvent(event)) {
                    const changeType = this.determineChangeType(event);
                    const parsedEvent = this.parseGoogleEventToVetPlus(event);
                    
                    if (parsedEvent) {
                        // Detectar cambios específicos en respuestas de asistentes
                        const attendeeChanges = this.detectAttendeeChanges(event);
                        
                        changes.push({
                            change_type: changeType,
                            google_event: event,
                            parsed_data: parsedEvent,
                            attendee_changes: attendeeChanges,
                            event_status: event.status,
                            updated_at: event.updated
                        });

                        console.log(`📝 Cambio detectado: ${changeType} - ${event.summary}`);
                        if (attendeeChanges.length > 0) {
                            console.log(`👥 Respuestas de asistentes:`, attendeeChanges);
                        }
                    }
                }
            }

            console.log(`✅ Total de cambios detectados: ${changes.length}`);
            
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
     * Detectar cambios específicos en respuestas de asistentes
     */
    detectAttendeeChanges(event) {
        const attendeeChanges = [];
        
        if (event.attendees && Array.isArray(event.attendees)) {
            for (const attendee of event.attendees) {
                if (attendee.responseStatus) {
                    attendeeChanges.push({
                        email: attendee.email,
                        response_status: attendee.responseStatus,
                        display_name: attendee.displayName || attendee.email,
                        is_organizer: attendee.organizer || false,
                        is_resource: attendee.resource || false
                    });
                }
            }
        }
        
        return attendeeChanges;
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
     * Determinar el tipo de cambio (created, updated, deleted, attendee_response)
     */
    determineChangeType(event) {
        if (event.status === 'cancelled') {
            return 'deleted';
        } else if (event.created === event.updated) {
            return 'created';
        } else {
            // Verificar si hay cambios en asistentes
            const hasAttendeeChanges = event.attendees && event.attendees.some(attendee => 
                attendee.responseStatus && attendee.responseStatus !== 'needsAction'
            );
            
            if (hasAttendeeChanges) {
                return 'attendee_response';
            }
            
            return 'updated';
        }
    }

    /**
     * Obtener URL de autorización (para configuración inicial)
     */
    getAuthUrl() {
        try {
            console.log('🔗 Generando URL de autorización...');
            
            if (!this.auth) {
                console.log('❌ Auth no inicializado');
                return null;
            }
            
            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ];

            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent'
            });
            
            console.log('✅ URL de autorización generada exitosamente');
            return authUrl;
        } catch (error) {
            console.error('❌ Error generando URL de autorización:', error);
            return null;
        }
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

    /**
     * Configurar webhook para recibir notificaciones de cambios
     */
    async setupWebhook() {
        try {
            if (!await this.hasValidTokens()) {
                return {
                    success: false,
                    error: 'Google Calendar no está configurado'
                };
            }

            // URL del webhook (debe ser HTTPS en producción)
            const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || 
                              `${process.env.BASE_URL || 'http://localhost:3000'}/api/google-calendar-webhook`;
            
            // Token de verificación
            const verifyToken = process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN || 'vetplus-webhook-token';

            console.log('🔔 Configurando webhook de Google Calendar:', webhookUrl);

            // Configurar el canal de notificaciones
            const channelId = `vetplus-${Date.now()}`;
            const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 días

            const response = await this.calendar.events.watch({
                calendarId: this.config.calendar_id || 'primary',
                resource: {
                    id: channelId,
                    type: 'web_hook',
                    address: webhookUrl,
                    token: verifyToken,
                    expiration: expiration.toString()
                }
            });

            // Guardar información del webhook en la configuración
            await query(`
                UPDATE vetplus_auth.google_calendar_config 
                SET 
                    webhook_channel_id = $1,
                    webhook_url = $2,
                    webhook_expiration = $3,
                    webhook_resource_id = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_active = true
            `, [channelId, webhookUrl, new Date(expiration), response.data.resourceId]);

            console.log('✅ Webhook configurado exitosamente:', {
                channelId: response.data.id,
                resourceId: response.data.resourceId,
                expiration: new Date(expiration)
            });

            return {
                success: true,
                channelId: response.data.id,
                resourceId: response.data.resourceId,
                expiration: new Date(expiration),
                webhookUrl: webhookUrl
            };

        } catch (error) {
            console.error('❌ Error configurando webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detener webhook existente
     */
    async stopWebhook() {
        try {
            // Obtener información del webhook actual
            const configResult = await query(`
                SELECT webhook_channel_id, webhook_resource_id 
                FROM vetplus_auth.google_calendar_config 
                WHERE is_active = true 
                AND webhook_channel_id IS NOT NULL
            `);

            if (configResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'No hay webhook activo configurado'
                };
            }

            const { webhook_channel_id, webhook_resource_id } = configResult.rows[0];

            // Detener el canal de notificaciones
            await this.calendar.channels.stop({
                resource: {
                    id: webhook_channel_id,
                    resourceId: webhook_resource_id
                }
            });

            // Limpiar información del webhook en la configuración
            await query(`
                UPDATE vetplus_auth.google_calendar_config 
                SET 
                    webhook_channel_id = NULL,
                    webhook_url = NULL,
                    webhook_expiration = NULL,
                    webhook_resource_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_active = true
            `);

            console.log('✅ Webhook detenido exitosamente');

            return {
                success: true,
                message: 'Webhook detenido exitosamente'
            };

        } catch (error) {
            console.error('❌ Error deteniendo webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar estado del webhook
     */
    async getWebhookStatus() {
        try {
            const configResult = await query(`
                SELECT 
                    webhook_channel_id,
                    webhook_url,
                    webhook_expiration,
                    webhook_resource_id
                FROM vetplus_auth.google_calendar_config 
                WHERE is_active = true
            `);

            if (configResult.rows.length === 0) {
                return {
                    success: true,
                    status: 'not_configured',
                    message: 'Google Calendar no está configurado'
                };
            }

            const config = configResult.rows[0];

            if (!config.webhook_channel_id) {
                return {
                    success: true,
                    status: 'not_active',
                    message: 'Webhook no está configurado'
                };
            }

            const expiration = new Date(config.webhook_expiration);
            const now = new Date();

            if (expiration <= now) {
                return {
                    success: true,
                    status: 'expired',
                    message: 'Webhook ha expirado',
                    expiredAt: expiration
                };
            }

            return {
                success: true,
                status: 'active',
                channelId: config.webhook_channel_id,
                webhookUrl: config.webhook_url,
                expiration: expiration,
                timeUntilExpiration: expiration - now
            };

        } catch (error) {
            console.error('Error verificando estado del webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Renovar webhook antes de que expire
     */
    async renewWebhook() {
        try {
            console.log('🔄 Renovando webhook de Google Calendar...');

            // Detener webhook actual si existe
            const stopResult = await this.stopWebhook();
            if (stopResult.success) {
                console.log('✅ Webhook anterior detenido');
            }

            // Configurar nuevo webhook
            const setupResult = await this.setupWebhook();
            
            if (setupResult.success) {
                console.log('✅ Webhook renovado exitosamente');
                return setupResult;
            } else {
                console.error('❌ Error renovando webhook:', setupResult.error);
                return setupResult;
            }

        } catch (error) {
            console.error('❌ Error renovando webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar manualmente las respuestas de asistentes en un evento específico
     */
    async checkEventAttendeeResponses(eventId) {
        try {
            if (!this.calendar) {
                await this.initializeAuth();
            }

            if (!this.calendar) {
                throw new Error('Google Calendar no está configurado');
            }

            console.log(`🔍 Verificando respuestas de asistentes para evento: ${eventId}`);

            // Obtener el evento de Google Calendar
            const response = await this.calendar.events.get({
                calendarId: this.config.calendar_id,
                eventId: eventId
            });

            const event = response.data;
            console.log('📅 Evento obtenido:', {
                id: event.id,
                summary: event.summary,
                status: event.status,
                attendees: event.attendees?.length || 0
            });

            if (!event.attendees || event.attendees.length === 0) {
                return {
                    success: true,
                    status: 'no_attendees',
                    message: 'El evento no tiene asistentes'
                };
            }

            // Analizar respuestas de asistentes
            const attendeeResponses = event.attendees.map(attendee => ({
                email: attendee.email,
                responseStatus: attendee.responseStatus, // needsAction, accepted, declined, tentative
                optional: attendee.optional || false
            }));

            console.log('👥 Respuestas de asistentes:', attendeeResponses);

            // Determinar el estado general basado en las respuestas
            const requiredAttendees = attendeeResponses.filter(a => !a.optional);
            const acceptedCount = requiredAttendees.filter(a => a.responseStatus === 'accepted').length;
            const declinedCount = requiredAttendees.filter(a => a.responseStatus === 'declined').length;
            const tentativeCount = requiredAttendees.filter(a => a.responseStatus === 'tentative').length;
            const noResponseCount = requiredAttendees.filter(a => a.responseStatus === 'needsAction').length;

            let suggestedStatus = 'pendiente';
            let statusReason = '';

            if (acceptedCount > 0 && declinedCount === 0) {
                suggestedStatus = 'confirmada';
                statusReason = `${acceptedCount} asistente(s) aceptaron`;
            } else if (declinedCount > 0) {
                suggestedStatus = 'cancelada';
                statusReason = `${declinedCount} asistente(s) rechazaron`;
            } else if (tentativeCount > 0 && acceptedCount === 0) {
                suggestedStatus = 'pendiente';
                statusReason = `${tentativeCount} asistente(s) están indecisos`;
            } else {
                suggestedStatus = 'pendiente';
                statusReason = `${noResponseCount} asistente(s) no han respondido`;
            }

            return {
                success: true,
                eventId: eventId,
                attendeeResponses: attendeeResponses,
                summary: {
                    total: requiredAttendees.length,
                    accepted: acceptedCount,
                    declined: declinedCount,
                    tentative: tentativeCount,
                    noResponse: noResponseCount
                },
                suggestedStatus: suggestedStatus,
                statusReason: statusReason,
                lastChecked: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error verificando respuestas de asistentes:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new GoogleCalendarService();