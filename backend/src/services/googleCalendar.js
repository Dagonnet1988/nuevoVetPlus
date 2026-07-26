import { google } from 'googleapis';
import { query } from '../config/database.js';

class GoogleCalendarService {
    constructor() {
        this.calendar = null;
        this.auth = null;
        this.config = null;
        // Delay initialization until database is ready
        // this.initializeAuth();
    }

    getConfiguredCalendarId() {
        const raw = String(this.config?.calendar_id || 'primary').trim();
        return raw || 'primary';
    }

    getErrorStatusCode(error) {
        return error?.status || error?.code || error?.response?.status || error?.cause?.code || null;
    }

    isGoogleReauthRequiredError(error) {
        const oauthError = String(error?.response?.data?.error || '').toLowerCase();
        const composedMessage = [
            error?.message,
            error?.cause?.message,
            error?.response?.data?.error_description
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return oauthError === 'invalid_grant' || composedMessage.includes('invalid_grant');
    }

    buildGoogleErrorPayload(error, fallbackMessage = 'Error de Google Calendar') {
        if (this.isGoogleReauthRequiredError(error)) {
            return {
                error: 'La autorización de Google Calendar expiró o fue revocada. Reconecta la cuenta de Google.',
                code: 'GOOGLE_REAUTH_REQUIRED',
                status: 400,
                requires_reauth: true
            };
        }

        const status = this.getErrorStatusCode(error);
        const normalizedStatus = Number.isFinite(Number(status)) ? Number(status) : 500;

        return {
            error: error?.message || fallbackMessage,
            code: 'GOOGLE_API_ERROR',
            status: normalizedStatus,
            requires_reauth: false
        };
    }

    async ensureCalendarClient() {
        if (!this.config) {
            await this.loadConfig();
        }

        if ((!this.calendar || !this.auth) && this.config?.client_id && this.config?.client_secret && this.config?.redirect_uri) {
            await this.initializeAuth();
        }

        return Boolean(this.calendar && this.auth && this.config);
    }

    async getActiveCalendarId() {
        const configuredCalendarId = this.getConfiguredCalendarId();

        if (configuredCalendarId.toLowerCase() === 'primary') {
            return 'primary';
        }

        if (!await this.ensureCalendarClient()) {
            const notReadyError = new Error('Google Calendar no está inicializado');
            notReadyError.code = 'GOOGLE_CALENDAR_NOT_READY';
            notReadyError.status = 503;
            throw notReadyError;
        }

        try {
            await this.calendar.calendars.get({ calendarId: configuredCalendarId });
            return configuredCalendarId;
        } catch (error) {
            const status = this.getErrorStatusCode(error);
            if (status !== 404) {
                throw error;
            }
        }

        const listResponse = await this.calendar.calendarList.list({ maxResults: 250 });
        const calendars = listResponse?.data?.items || [];
        const search = configuredCalendarId.toLowerCase();

        const matched = calendars.find((cal) => {
            const id = String(cal?.id || '').toLowerCase();
            const summary = String(cal?.summary || '').toLowerCase();
            return id === search || summary === search;
        });

        if (matched?.id) {
            const resolvedId = String(matched.id).trim();

            if (resolvedId && this.config?.calendar_id !== resolvedId) {
                try {
                    if (this.config?.id_config) {
                        await query(
                            `UPDATE vetplus_auth.google_calendar_config
                             SET calendar_id = $1, updated_at = CURRENT_TIMESTAMP
                             WHERE id_config = $2`,
                            [resolvedId, this.config.id_config]
                        );
                    }
                    this.config.calendar_id = resolvedId;
                    console.log(`ℹ️ Calendar ID ajustado automáticamente: '${configuredCalendarId}' -> '${resolvedId}'`);
                } catch (persistError) {
                    console.warn('⚠️ No se pudo persistir el calendar_id resuelto automáticamente:', persistError?.message || persistError);
                }
            }

            return resolvedId;
        }

        const known = calendars
            .slice(0, 12)
            .map((cal) => cal?.summary || cal?.id)
            .filter(Boolean)
            .join(', ');

        const notFoundError = new Error(
            `El calendario configurado '${configuredCalendarId}' no existe o no está accesible en esta cuenta de Google. ` +
            `Usa el ID exacto (no solo el nombre visible). Ejemplos disponibles: ${known || 'primary'}`
        );
        notFoundError.code = 'CALENDAR_NOT_FOUND';
        notFoundError.status = 404;
        throw notFoundError;
    }

    async initialize() {
        await this.initializeAuth();
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
                SELECT gc.*, u.id_tenant as config_tenant_id
                FROM vetplus_auth.google_calendar_config gc
                LEFT JOIN vetplus_auth.usuarios u ON u.id_usuario = gc.configured_by
                WHERE gc.is_active = true 
                ORDER BY gc.created_at DESC 
                LIMIT 1
            `);
            
            this.config = result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            // Si la tabla no existe aún (primera inicialización), ignorar el error
            if (error.code === '42P01') {
                console.log('⚠️ Tabla google_calendar_config no existe aún, se creará en la inicialización');
                this.config = null;
            } else {
                console.error('Error cargando configuración de Google Calendar:', error);
                this.config = null;
            }
        }
    }

    normalizeEventText(value) {
        return String(value || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&#160;/gi, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    normalizeHexColor(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return null;
        const withHash = raw.startsWith('#') ? raw : `#${raw}`;
        return /^#[0-9a-f]{6}$/.test(withHash) ? withHash : null;
    }

    getGoogleEventColorHex(colorId) {
        const palette = {
            '1': '#a4bdfc',
            '2': '#7ae7bf',
            '3': '#dbadff',
            '4': '#ff887c',
            '5': '#fbd75b',
            '6': '#ffb878',
            '7': '#46d6db',
            '8': '#e1e1e1',
            '9': '#5484ed',
            '10': '#51b749',
            '11': '#dc2127'
        };
        return palette[String(colorId || '').trim()] || null;
    }

    getGoogleColorIdByHex(hexColor) {
        const normalizedHex = this.normalizeHexColor(hexColor);
        if (!normalizedHex) return null;

        const reversePalette = {
            '#a4bdfc': '1',
            '#7ae7bf': '2',
            '#dbadff': '3',
            '#ff887c': '4',
            '#fbd75b': '5',
            '#ffb878': '6',
            '#46d6db': '7',
            '#e1e1e1': '8',
            '#5484ed': '9',
            '#51b749': '10',
            '#dc2127': '11'
        };

        return reversePalette[normalizedHex] || null;
    }

    buildColorTypeMapFromPreferences(syncPreferences = {}) {
        const colors = syncPreferences?.mapeo_colores || {};
        const mapping = {
            domicilio: this.normalizeHexColor(colors.domicilio || colors.vacunacion),
            valoracion: this.normalizeHexColor(colors.valoracion || colors.control),
            control: this.normalizeHexColor(colors.control),
            terapia: this.normalizeHexColor(colors.terapia || colors.consulta),
            hidroterapia: this.normalizeHexColor(colors.hidroterapia || colors.cirugia)
        };

        const colorTypeMap = {};
        const domicilioColorId = this.getGoogleColorIdByHex(mapping.domicilio);
        const valoracionColorId = this.getGoogleColorIdByHex(mapping.valoracion);
        const controlColorId = this.getGoogleColorIdByHex(mapping.control);
        const terapiaColorId = this.getGoogleColorIdByHex(mapping.terapia);
        const hidroterapiaColorId = this.getGoogleColorIdByHex(mapping.hidroterapia);

        if (domicilioColorId) colorTypeMap[domicilioColorId] = { tipo: 'domicilio' };
        if (valoracionColorId) colorTypeMap[valoracionColorId] = { tipo: 'valoracion' };
        // Evitar que configuraciones legadas crucen tipos cuando control y valoracion
        // comparten el mismo color (ej. banana #fbd75b => colorId 5).
        if (controlColorId && controlColorId !== valoracionColorId) {
            colorTypeMap[controlColorId] = { tipo: 'control' };
        }
        if (terapiaColorId) colorTypeMap[terapiaColorId] = { tipo: 'terapia' };
        if (hidroterapiaColorId) colorTypeMap[hidroterapiaColorId] = { tipo: 'hidroterapia' };

        // Completar mapa con defaults de Google cuando la configuración del tenant
        // no define algún color. Esto evita dejar citas válidas sin tipo por color faltante.
        const defaultColorTypeMap = {
            '2': { tipo: 'domicilio' },
            '5': { tipo: 'valoracion' },
            '6': { tipo: 'control' },
            '7': { tipo: 'terapia' },
            '9': { tipo: 'hidroterapia' },
            '10': { tipo: 'domicilio' }
        };

        for (const [colorId, mappingValue] of Object.entries(defaultColorTypeMap)) {
            if (!colorTypeMap[colorId]) {
                colorTypeMap[colorId] = mappingValue;
            }
        }

        // Google usa dos verdes comunes (2 y 10). Ambos pueden representar domicilio
        // según configuración visual del calendario en diferentes cuentas/temas.
        if (colorTypeMap['10']?.tipo === 'domicilio' && !colorTypeMap['2']) {
            colorTypeMap['2'] = { tipo: 'domicilio' };
        }
        if (colorTypeMap['2']?.tipo === 'domicilio' && !colorTypeMap['10']) {
            colorTypeMap['10'] = { tipo: 'domicilio' };
        }

        return colorTypeMap;
    }

    getTenantImportRules() {
        const tenantId = String(this.config?.config_tenant_id || '').toLowerCase();
        const syncPreferences = this.config?.sync_preferences || {};

        const configuredColorMap = this.buildColorTypeMapFromPreferences(syncPreferences);
        if (Object.keys(configuredColorMap).length > 0) {
            return {
                excludeKeywords: ['pilates', 'zumba', 'gimnasio', 'gym', 'personal', 'vacaciones', 'cumpleanos', 'cumpleaños'],
                includeKeywords: ['cita', 'consulta', 'control', 'valoracion', 'terapia', 'hidroterapia', 'fisio', 'fisioterapia', 'domicilio', 'mascota', 'veterinaria'],
                colorTypeMap: configuredColorMap
            };
        }

        // Reglas personalizadas para este tenant (colores => tipo de cita).
        if (tenantId !== '490957aa-d5f6-4441-be85-1aa5b2f92614') {
            return null;
        }

        return {
            excludeKeywords: ['pilates', 'zumba', 'gimnasio', 'gym', 'personal', 'vacaciones', 'cumpleanos', 'cumpleaños'],
            includeKeywords: ['cita', 'consulta', 'control', 'valoracion', 'terapia', 'hidroterapia', 'fisio', 'fisioterapia', 'domicilio', 'mascota', 'veterinaria'],
            colorTypeMap: {
                // Fallback por colorId nativo de Google Calendar.
                // 2: Sage (verde salvia) -> domicilio
                // 5: Banana -> valoracion
                // 6: Tangerine -> control
                // 7: Turquoise/Peacock -> terapia
                // 9: Indigo/Blueberry -> hidroterapia
                '2': { tipo: 'domicilio' },
                '5': { tipo: 'valoracion' },
                '6': { tipo: 'control' },
                '7': { tipo: 'terapia' },
                '9': { tipo: 'hidroterapia' }
            }
        };
    }

    inferTipoFromText(summary, description) {
        const text = this.normalizeEventText(`${summary || ''} ${description || ''}`);
        if (text.includes('hidroterapia')) return 'hidroterapia';
        if (text.includes('fisioterapia') || text.includes('fisio')) return 'terapia';
        if (text.includes('terapia')) return 'terapia';
        if (text.includes('valoracion') || text.includes('valoracion inicial') || text.includes('valorac')) return 'valoracion';
        if (text.includes('domicilio') || text.includes('domi')) return 'domicilio';
        if (text.includes('control') || text.includes('consulta') || text.includes('cita')) return 'control';
        return null;
    }

    isLikelyPersonalEvent(normalizedSummary, normalizedDescription, normalizedAll) {
        const summary = String(normalizedSummary || '');
        const all = String(normalizedAll || '');

        // Evitar clasificar actividades personales como citas clínicas.
        // No excluir automáticamente "mía/mío" porque puede ser nombre de mascota.
        const explicitPersonal = ['evento personal', 'uso personal', 'personal', 'vacaciones', 'cumpleanos', 'cumpleaños']
            .some(token => all.includes(token));
        const strongFirstPerson = /\b(mi cita|mi sesion|mi sesión|mi entrenamiento|mi clase)\b/.test(summary);

        return explicitPersonal || strongFirstPerson;
    }

    classifyEventForImport(event) {
        const summary = event?.summary || '';
        const description = event?.description || '';

        const normalizedSummary = this.normalizeEventText(summary);
        const normalizedDescription = this.normalizeEventText(description);
        const normalizedAll = `${normalizedSummary} ${normalizedDescription}`.trim();
        const rules = this.getTenantImportRules();

        if (rules) {
            const eventColorId = String(event?.colorId || '').trim();
            const colorRule = eventColorId ? rules.colorTypeMap[eventColorId] : null;

            // Para tenant con reglas de color: el tipo se valida por color, no por texto.
            if (colorRule) {
                return {
                    isAppointment: true,
                    inferredTipo: colorRule.tipo,
                    inferredModalidad: colorRule.modalidad || null,
                    reason: 'color_rule'
                };
            }

            if (rules.excludeKeywords.some(keyword => normalizedAll.includes(this.normalizeEventText(keyword)))) {
                return { isAppointment: false, reason: 'excluded_keyword' };
            }

            if (this.isLikelyPersonalEvent(normalizedSummary, normalizedDescription, normalizedAll)) {
                return { isAppointment: false, reason: 'excluded_personal_event' };
            }

            // Si el evento trae color pero no está mapeado, se importa sin clasificar.
            // El tipo debe decidirse por color, no por texto.
            if (eventColorId && !colorRule) {
                return {
                    isAppointment: true,
                    inferredTipo: 'terapia',
                    reason: 'unmapped_color_default_terapia'
                };
            }

            // Si el evento no trae color explícito, crearlo como "sin clasificar"
            // y asignarlo por defecto a terapia según regla operativa del negocio.
            if (!eventColorId) {
                return {
                    isAppointment: true,
                    inferredTipo: 'terapia',
                    reason: 'no_color_default_terapia'
                };
            }

            return { isAppointment: false, reason: 'tenant_rules_no_color_match' };
        }

        // Fallback global (comportamiento legacy)
        const isLegacyMatch =
            summary.includes('VetPlus') ||
            summary.includes('Cita') ||
            summary.includes('Consulta') ||
            description.includes('VetPlus') ||
            description.includes('Código de cita:');

        return {
            isAppointment: isLegacyMatch,
            inferredTipo: this.inferTipoFromText(summary, description),
            reason: isLegacyMatch ? 'legacy_match' : 'legacy_no_match'
        };
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
        if (!await this.ensureCalendarClient()) {
            return false;
        }

        return await this.isConfigured() && this.config.refresh_token && !!this.calendar;
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
                location: location || process.env.CLINIC_ADDRESS || 'Ramelo Clínica',
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
            // Si el evento ya está completado, no configurar recordatorios
            if (!['completada', 'cancelada', 'no_asistio'].includes(eventData.status)) {
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
            } else {
                // Para eventos completados o cancelados, deshabilitar recordatorios
                event.reminders.useDefault = false;
                event.reminders.overrides = [];
            }

            // Agregar asistente si se proporciona email
            if (attendeeEmail) {
                event.attendees.push({ email: attendeeEmail });
            }

            const calendarId = await this.getActiveCalendarId();
            const response = await this.calendar.events.insert({
                calendarId,
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
                location,
                status // Agregar parámetro de estado
            } = eventData;

            const event = {
                summary,
                description,
                location: location || process.env.CLINIC_ADDRESS || 'Ramelo Clínica',
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
                    overrides: []
                }
            };

            // Configurar recordatorios basados en el estado
            if (!['completada', 'cancelada', 'no_asistio'].includes(status)) {
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
            } else {
                // Para eventos completados o cancelados, deshabilitar recordatorios
                event.reminders.useDefault = false;
                event.reminders.overrides = [];
            }

            if (attendeeEmail) {
                event.attendees.push({ email: attendeeEmail });
            }

            const calendarId = await this.getActiveCalendarId();
            const response = await this.calendar.events.update({
                calendarId,
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
            const calendarId = await this.getActiveCalendarId();
            const getResponse = await this.calendar.events.get({
                calendarId,
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
                calendarId,
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
            const calendarId = await this.getActiveCalendarId();
            const getResponse = await this.calendar.events.get({
                calendarId,
                eventId: eventId
            });

            const event = getResponse.data;
            
            // Agregar comentario a la descripción
            const currentDescription = event.description || '';
            const newDescription = currentDescription + '\n\n⚠️ ' + comment;
            
            event.description = newDescription;

            // Actualizar el evento
            const response = await this.calendar.events.update({
                calendarId,
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

            const calendarId = await this.getActiveCalendarId();
            await this.calendar.events.delete({
                calendarId,
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

            const calendarId = await this.getActiveCalendarId();
            const response = await this.calendar.events.get({
                calendarId,
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
            if (!await this.isConfigured()) {
                throw new Error('Google Calendar no está configurado');
            }

            // Verificar y refrescar token si es necesario
            await this.ensureValidToken();

            // Validar y formatear fechas para Google Calendar API
            let formattedStartDate, formattedEndDate;
            
            try {
                // Si las fechas son solo en formato YYYY-MM-DD, agregar tiempo
                if (startDateTime && !startDateTime.includes('T')) {
                    // Usar zona horaria de Colombia para evitar corrimientos de día por UTC
                    formattedStartDate = startDateTime + 'T00:00:00-05:00';
                } else {
                    formattedStartDate = new Date(startDateTime).toISOString();
                }
                
                if (endDateTime && !endDateTime.includes('T')) {
                    // Usar zona horaria de Colombia para cubrir el día local completo
                    formattedEndDate = endDateTime + 'T23:59:59-05:00';
                } else {
                    formattedEndDate = new Date(endDateTime).toISOString();
                }
            } catch (dateError) {
                throw new Error(`Formato de fecha inválido: ${dateError.message}`);
            }

            const calendarId = await this.getActiveCalendarId();
            console.log('📅 Listando eventos de Google Calendar:', {
                originalStart: startDateTime,
                originalEnd: endDateTime,
                formattedStart: formattedStartDate,
                formattedEnd: formattedEndDate,
                calendarId
            });

            // Google Calendar limita cada página a 250 eventos (por defecto) o hasta
            // 2500 con maxResults explícito; para rangos amplios hay que seguir
            // nextPageToken o se pierden eventos en silencio.
            const events = [];
            let pageToken;
            do {
                const response = await this.calendar.events.list({
                    calendarId,
                    timeMin: formattedStartDate,
                    timeMax: formattedEndDate,
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 2500,
                    pageToken
                });

                events.push(...(response.data.items || []));
                pageToken = response.data.nextPageToken;
            } while (pageToken);

            return {
                success: true,
                events
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
                    
                    // Reintentar la operación (con paginación, igual que el intento inicial)
                    const retryEvents = [];
                    let retryPageToken;
                    do {
                        const response = await this.calendar.events.list({
                            calendarId,
                            timeMin: formattedStartDate,
                            timeMax: formattedEndDate,
                            singleEvents: true,
                            orderBy: 'startTime',
                            maxResults: 2500,
                            pageToken: retryPageToken
                        });

                        retryEvents.push(...(response.data.items || []));
                        retryPageToken = response.data.nextPageToken;
                    } while (retryPageToken);

                    return {
                        success: true,
                        events: retryEvents
                    };
                } catch (refreshError) {
                    console.error('❌ Error al refrescar token:', refreshError);
                    const refreshErrorPayload = this.buildGoogleErrorPayload(refreshError, 'No se pudo refrescar el token de Google Calendar');
                    return {
                        success: false,
                        ...refreshErrorPayload,
                        details: refreshError.cause || refreshError.response?.data
                    };
                }
            }

            const errorPayload = this.buildGoogleErrorPayload(error);
            
            return {
                success: false,
                ...errorPayload,
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

            const calendarId = await this.getActiveCalendarId();
            const response = await this.calendar.freebusy.query({
                resource: {
                    timeMin: startDateTime,
                    timeMax: endDateTime,
                    items: [{ id: calendarId }]
                }
            });

            const busy = response.data.calendars?.[calendarId]?.busy || [];
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

            // Clasificar eventos para diagnóstico de reglas
            const classifiedEvents = eventsResult.events
                .map(event => ({ event, classification: this.classifyEventForImport(event) }));

            const classificationStats = classifiedEvents.reduce((acc, item) => {
                const reason = item?.classification?.reason || 'unknown';
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
            }, {});

            const classificationAudit = classifiedEvents.map(item => {
                const event = item?.event || {};
                const classification = item?.classification || {};
                const colorId = String(event?.colorId || '').trim() || '(sin colorId)';

                return {
                    event_id: event.id,
                    titulo: event.summary || '(sin titulo)',
                    colorId,
                    colorHex: this.getGoogleEventColorHex(event?.colorId) || '(sin colorHex)',
                    is_appointment: Boolean(classification.isAppointment),
                    reason: classification.reason || 'unknown',
                    inferred_tipo: classification.inferredTipo || '(sin tipo)',
                    inferred_modalidad: classification.inferredModalidad || '(sin modalidad)'
                };
            });

            const expectedColorIds = Object.keys(this.getTenantImportRules()?.colorTypeMap || {});
            const noColorMatchDetails = classifiedEvents
                .filter(item => item?.classification?.reason === 'tenant_rules_no_color_match')
                .slice(0, 20)
                .map(item => ({
                    event_id: item.event?.id,
                    title: item.event?.summary || '(sin titulo)',
                    colorId: String(item.event?.colorId || ''),
                    colorHex: this.getGoogleEventColorHex(item.event?.colorId)
                }));

            // Filtrar solo eventos clasificados como citas
            const vetEvents = classifiedEvents.filter(item => item.classification.isAppointment);

            const importedEvents = [];
            const errors = [];

            // Procesar cada evento
            for (const item of vetEvents) {
                try {
                    const eventData = this.parseGoogleEventToVetPlus(item.event, item.classification);
                    if (eventData) {
                        importedEvents.push(eventData);
                    }
                } catch (error) {
                    errors.push({
                        event_id: item.event.id,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                total_events: eventsResult.events.length,
                vet_events_found: vetEvents.length,
                imported_events: importedEvents,
                errors: errors,
                classification_stats: classificationStats,
                expected_color_ids: expectedColorIds,
                no_color_match_sample: noColorMatchDetails
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
        // Mapeo de estados
        switch (googleStatus) {
            case 'confirmed':
                // Regla operativa: "en_curso" y "completada" se gestionan solo manualmente en VetPlus.
                return 'confirmada';
                
            case 'tentative':
                return 'confirmada';
                
            case 'cancelled':
                return 'no_asistio';
                
            default:
                return 'confirmada';
        }
    }

    /**
     * Parsear evento de Google a formato VetPlus
     */
    parseGoogleEventToVetPlus(googleEvent, eventClassification = null) {
        try {
            const {
                id,
                summary,
                description,
                start,
                end,
                status,
                updated,
                attendees
            } = googleEvent;

            // Extraer información del título y descripción
            let mascotaNombre = null;
            let clienteNombre = null;
            let veterinarioNombre = null;
            let tipo = 'Consulta';
            let motivo = 'Importado desde Google Calendar';

            const classification = eventClassification || this.classifyEventForImport(googleEvent);
            if (classification?.inferredTipo) {
                tipo = classification.inferredTipo;
            }

            const cleanField = (value, maxLength = 120) => {
                if (!value) return null;
                const cleaned = String(value)
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<\/p>/gi, ' ')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;|&#160;/gi, ' ')
                    .replace(/[\r\n]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleaned) return null;

                // Evitar usar capturas contaminadas con otras etiquetas del evento
                const forbiddenFragments = ['cliente:', 'mascota:', 'veterinario:', 'tipo:', 'motivo:', 'codigo de cita'];
                const lowered = cleaned.toLowerCase();
                if (forbiddenFragments.some(fragment => lowered.includes(fragment))) {
                    return null;
                }

                return cleaned.slice(0, maxLength);
            };

            const normalizedDescription = String(description || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;|&#160;/gi, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');

            const extractField = (regex) => {
                const match = normalizedDescription.match(regex);
                return match?.[1] ? cleanField(match[1]) : null;
            };

            // Intentar extraer información del título (formato: "Tipo - Mascota (Cliente)")
            const titleMatch = summary?.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);
            if (titleMatch) {
                if (!classification?.inferredTipo) {
                    tipo = cleanField(titleMatch[1], 30) || tipo;
                }
                mascotaNombre = cleanField(titleMatch[2], 50) || mascotaNombre;
                clienteNombre = cleanField(titleMatch[3], 100) || clienteNombre;
            } else {
                // Fallback común: "Fisio Mía", "Hidroterapia Luna", "Valoración Rocky".
                const compactTitleMatch = String(summary || '').match(
                    /^\s*(fisio(?:terapia)?|terapia|hidroterapia|valoracion|valoración|control|consulta|cita|domicilio)\s*[-:]?\s+(.+?)\s*$/i
                );

                if (compactTitleMatch) {
                    if (!classification?.inferredTipo) {
                        tipo = cleanField(compactTitleMatch[1], 30) || tipo;
                    }
                    mascotaNombre = cleanField(compactTitleMatch[2], 50) || mascotaNombre;
                }

                // Eventos antiguos: si el título es solo el nombre de la mascota, úsalo como fallback.
                const maybePetName = cleanField(summary, 50);
                const hasTypeSeparator = String(summary || '').includes(' - ') || String(summary || '').includes(': ');
                if (maybePetName && !hasTypeSeparator && !maybePetName.includes('(') && !maybePetName.includes(')')) {
                    mascotaNombre = mascotaNombre || maybePetName;
                }
            }

            // Intentar extraer información adicional de la descripción
            if (description) {
                const extractedMascota = extractField(/(?:🐕\s*)?Mascota:\s*([\s\S]+?)(?=\s*(?:👤\s*Cliente:|👨‍⚕️\s*Veterinario:|📋\s*Tipo:|📝\s*Motivo:|Código de cita:|$))/i);
                const extractedCliente = extractField(/(?:👤\s*)?Cliente:\s*([\s\S]+?)(?=\s*(?:👨‍⚕️\s*Veterinario:|📋\s*Tipo:|📝\s*Motivo:|Código de cita:|$))/i);
                const extractedVeterinario = extractField(/(?:👨‍⚕️\s*)?Veterinario:\s*([\s\S]+?)(?=\s*(?:📋\s*Tipo:|📝\s*Motivo:|Código de cita:|$))/i);
                const extractedTipo = extractField(/(?:📋\s*)?Tipo:\s*([\s\S]+?)(?=\s*(?:📝\s*Motivo:|Código de cita:|$))/i);
                const extractedMotivo = extractField(/(?:📝\s*)?Motivo:\s*([\s\S]+?)(?=\s*(?:Código de cita:|$))/i);

                // Solo sobrescribir si lo extraído es válido
                if (extractedMascota) mascotaNombre = extractedMascota;
                if (extractedCliente) clienteNombre = extractedCliente;
                if (extractedVeterinario) veterinarioNombre = extractedVeterinario;
                if (extractedTipo && !classification?.inferredTipo) tipo = extractedTipo;
                if (extractedMotivo) motivo = extractedMotivo;
            }

            let clienteEmail = null;
            if (Array.isArray(attendees) && attendees.length > 0) {
                const preferredAttendee = attendees.find(att => att?.email && !att?.organizer) || attendees.find(att => att?.email);
                clienteEmail = preferredAttendee?.email || null;
            }

            return {
                google_event_id: id,
                titulo: summary || 'Evento importado',
                descripcion: description || 'Evento importado desde Google Calendar',
                fecha_inicio: start?.dateTime || start?.date || null,
                fecha_fin: end?.dateTime || end?.date || null,
                tipo: tipo,
                motivo: motivo,
                estado_google: status || 'confirmed',
                estado_vetplus: this.mapGoogleStatusToVetPlus(status, start?.dateTime || start?.date),
                ultima_modificacion: updated,
                mascota_nombre: mascotaNombre,
                cliente_nombre: clienteNombre,
                veterinario_nombre: veterinarioNombre,
                cliente_email: clienteEmail,
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
            const calendarId = await this.getActiveCalendarId();

            // Obtener eventos modificados desde la última sincronización.
            // Si Google rechaza updatedMin por antigüedad (410), se reintenta con ventanas cada vez más recientes.
            let response;
            let effectiveUpdatedMin = lastSyncTime;

            const attemptWindows = [
                lastSyncTime,
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            ];

            let lastTooOldError = null;

            for (const candidateUpdatedMin of attemptWindows) {
                try {
                    effectiveUpdatedMin = candidateUpdatedMin;
                    response = await this.calendar.events.list({
                        calendarId,
                        updatedMin: effectiveUpdatedMin,
                        singleEvents: true,
                        orderBy: 'updated',
                        maxResults: 100
                    });
                    lastTooOldError = null;
                    break;
                } catch (error) {
                    const status = error?.status || error?.code || error?.response?.status;
                    const causeMessage = String(error?.cause?.message || error?.message || '').toLowerCase();
                    const isTooOldUpdatedMin = status === 410 && causeMessage.includes('minimum modification time lies too far in the past');

                    if (status === 404) {
                        return {
                            success: true,
                            changes: [],
                            total_changes: 0,
                            effective_updated_min: null,
                            warning: `No se encontró el calendario '${calendarId}'. Verifica el ID exacto en Configuración > Calendar.`
                        };
                    }

                    if (!isTooOldUpdatedMin) {
                        throw error;
                    }

                    lastTooOldError = error;
                    console.warn(`⚠️ updatedMin demasiado antiguo (${candidateUpdatedMin}). Reintentando con una ventana más reciente...`);
                }
            }

            // Si Google sigue rechazando todas las ventanas, no romper la operación: devolver sin cambios y advertencia.
            if (!response && lastTooOldError) {
                console.warn('⚠️ Google rechazó todas las ventanas de updatedMin. Se omiten cambios en esta ejecución para evitar error 500.');
                return {
                    success: true,
                    changes: [],
                    total_changes: 0,
                    effective_updated_min: null,
                    warning: 'Google rechazó updatedMin por antigüedad en todas las ventanas intentadas (410).'
                };
            }

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
            let loggedChanges = 0;
            const maxDetailedLogs = 20;
            
            for (const event of response.data.items) {
                const changeType = this.determineChangeType(event);
                const classification = this.classifyEventForImport(event);

                // Los eventos eliminados deben procesarse siempre aunque Google devuelva payload parcial.
                const shouldProcess = changeType === 'deleted' ? Boolean(event?.id) : classification.isAppointment;
                if (!shouldProcess) {
                    continue;
                }

                const parsedEvent = this.parseGoogleEventToVetPlus(event, classification) || {
                    google_event_id: event?.id || null,
                    titulo: event?.summary || 'Evento eliminado',
                    descripcion: event?.description || '',
                    fecha_inicio: event?.start?.dateTime || event?.start?.date || null,
                    fecha_fin: event?.end?.dateTime || event?.end?.date || null,
                    tipo: 'control',
                    motivo: 'Sincronizado desde Google Calendar',
                    estado_google: event?.status || 'cancelled',
                    estado_vetplus: this.mapGoogleStatusToVetPlus(event?.status || 'cancelled', event?.start?.dateTime || event?.start?.date),
                    ultima_modificacion: event?.updated || new Date().toISOString(),
                    mascota_nombre: null,
                    cliente_nombre: null,
                    veterinario_nombre: null,
                    cliente_email: null,
                    requiere_matching: false
                };

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

                if (loggedChanges < maxDetailedLogs) {
                    console.log(`📝 Cambio detectado: ${changeType} - ${event.summary}`);
                    if (attendeeChanges.length > 0) {
                        console.log(`👥 Respuestas de asistentes:`, attendeeChanges);
                    }
                    loggedChanges++;
                } else if (loggedChanges === maxDetailedLogs) {
                    console.log(`ℹ️ Se omiten logs detallados de cambios adicionales para evitar ruido (total eventos: ${response.data.items.length}).`);
                    loggedChanges++;
                }
            }

            console.log(`✅ Total de cambios detectados: ${changes.length}`);
            
            return {
                success: true,
                changes: changes,
                total_changes: changes.length,
                effective_updated_min: effectiveUpdatedMin,
                last_check: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error detectando cambios en Google Calendar:', error);

            if (error?.code === 'CALENDAR_NOT_FOUND' || this.getErrorStatusCode(error) === 404) {
                return {
                    success: true,
                    changes: [],
                    total_changes: 0,
                    effective_updated_min: null,
                    warning: error.message
                };
            }

            const errorPayload = this.buildGoogleErrorPayload(error);

            return {
                success: false,
                ...errorPayload
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
        return this.classifyEventForImport(event).isAppointment;
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
            const calendarId = await this.getActiveCalendarId();

            const response = await this.calendar.events.watch({
                calendarId,
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

            let suggestedStatus = 'confirmada';
            let statusReason = '';

            if (acceptedCount > 0 && declinedCount === 0) {
                suggestedStatus = 'confirmada';
                statusReason = `${acceptedCount} asistente(s) aceptaron`;
            } else if (declinedCount > 0) {
                suggestedStatus = 'no_asistio';
                statusReason = `${declinedCount} asistente(s) rechazaron`;
            } else if (tentativeCount > 0 && acceptedCount === 0) {
                suggestedStatus = 'confirmada';
                statusReason = `${tentativeCount} asistente(s) están indecisos`;
            } else {
                suggestedStatus = 'confirmada';
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