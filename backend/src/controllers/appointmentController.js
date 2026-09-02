import { query, getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from '../services/googleCalendar.js';
import appointmentConflictService from '../services/appointmentConflictService.js';
import { sendEmail } from '../services/emailService.js';
import { renderEmailTemplate } from '../services/emailTemplateService.js';

/**
 * Convertir fecha a formato Colombia (sin zona horaria)
 * Entrada: "2025-08-19T08:00:00-05:00" o "2025-08-19T13:00:00Z" 
 * Salida: "2025-08-19 08:00:00" (hora local Colombia)
 */
const convertirFechaAColombia = (fechaStr) => {
    const raw = String(fechaStr || '').trim();
    if (!raw) return raw;

    // Fecha-only: conservar día local sin forzar UTC.
    const ymdOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdOnly) {
        return `${ymdOnly[1]}-${ymdOnly[2]}-${ymdOnly[3]} 00:00:00`;
    }

    // Fecha/hora sin zona: tratarla como local Bogotá y enviarla tal cual.
    const localDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (localDateTime && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
        return `${localDateTime[1]}-${localDateTime[2]}-${localDateTime[3]} ${localDateTime[4]}:${localDateTime[5]}:${localDateTime[6] || '00'}`;
    }

    // Con zona (Z / +hh:mm / -hh:mm): convertir explícitamente a hora Bogotá.
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return raw.replace('T', ' ').slice(0, 19);
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(parsed);

    const get = (type) => parts.find((p) => p.type === type)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
};

/**
 * Mapeo de estados entre frontend y base de datos
 * NOTA: Después de la migración, tanto frontend como BD usan los mismos valores
 */
const ESTADO_MAPPING = {
    // Frontend -> Base de datos
    // Compatibilidad legada
    'pendiente': 'confirmada',
    'confirmada': 'confirmada',
    'en_curso': 'en_curso',
    'completada': 'completada',
    'cancelada': 'cancelada',
    'no_asistio': 'no_asistio'
};

const ESTADO_REVERSE_MAPPING = {
    // Base de datos -> Frontend
    // Compatibilidad legada
    'pendiente': 'confirmada',
    'confirmada': 'confirmada',
    'en_curso': 'en_curso',
    'completada': 'completada',
    'cancelada': 'cancelada',
    'no_asistio': 'no_asistio'
};

const ESTADOS_CITA_PERMITIDOS = ['confirmada', 'en_curso', 'completada', 'no_asistio'];
const DIAS_BLOQUEADOS_TIPOS = new Set(['no_laborable']);

const extractDateOnly = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
};

const getBogotaDateOnlyFromDate = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
    return value.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const getRecurringSkipReason = (value, diasEspeciales = []) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

    if (value.getDay() === 0) {
        return 'domingo';
    }

    const fechaYmd = getBogotaDateOnlyFromDate(value);
    if (!fechaYmd) return null;

    const specialDay = diasEspeciales.find((dia) => {
        const tipo = String(dia?.tipo || '').trim();
        return dia?.fecha === fechaYmd && (tipo === 'festivo' || tipo === 'no_laborable');
    });

    return specialDay?.tipo || null;
};

const getTenantDiasEspeciales = async (tenantId) => {
    const result = await query(
        `SELECT to_char(fecha, 'YYYY-MM-DD') as fecha, descripcion, tipo, hora_inicio, hora_fin
         FROM system.dias_especiales
         WHERE activo = true
           AND (id_tenant IS NULL OR id_tenant = $1)`,
        [tenantId]
    );

    return result.rows.map((row) => ({
        fecha: row.fecha,
        descripcion: row.descripcion,
        tipo: row.tipo,
        horario_especial: row.hora_inicio && row.hora_fin
            ? { hora_inicio: row.hora_inicio, hora_fin: row.hora_fin }
            : undefined,
        activo: true
    }));
};

const getBlockingDiaEspecial = (diasEspeciales, fechaYmd) => {
    if (!fechaYmd) return null;

    return diasEspeciales.find((dia) => {
        const tipo = String(dia?.tipo || '').trim();
        return dia?.fecha === fechaYmd && DIAS_BLOQUEADOS_TIPOS.has(tipo);
    }) || null;
};

const parseHourMinutesToTotal = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

const parseDateToMinutes = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
};

const getHorarioEspecialByDate = (diasEspeciales, fechaYmd) => {
    if (!fechaYmd) return null;
    return diasEspeciales.find((dia) => dia?.fecha === fechaYmd && String(dia?.tipo || '').trim() === 'horario_especial') || null;
};

const validateDateTimeAgainstSpecialDays = ({ diasEspeciales, fechaInicio, fechaFin }) => {
    const fechaYmd = extractDateOnly(fechaInicio);
    if (!fechaYmd) {
        return { blocked: false };
    }

    const diaNoLaborable = getBlockingDiaEspecial(diasEspeciales, fechaYmd);
    if (diaNoLaborable) {
        return {
            blocked: true,
            code: 'SPECIAL_DAY_BLOCKED',
            message: `No se pueden agendar citas el ${fechaYmd} (${diaNoLaborable.tipo}).`,
            data: {
                fecha: fechaYmd,
                tipo: diaNoLaborable.tipo,
                descripcion: diaNoLaborable.descripcion || null
            }
        };
    }

    const horarioEspecial = getHorarioEspecialByDate(diasEspeciales, fechaYmd);
    if (!horarioEspecial) {
        return { blocked: false };
    }

    const allowedStart = parseHourMinutesToTotal(horarioEspecial?.horario_especial?.hora_inicio);
    const allowedEnd = parseHourMinutesToTotal(horarioEspecial?.horario_especial?.hora_fin);
    const slotStart = parseDateToMinutes(fechaInicio);
    const slotEnd = parseDateToMinutes(fechaFin);

    if (
        allowedStart === null ||
        allowedEnd === null ||
        slotStart === null ||
        slotEnd === null ||
        slotStart < allowedStart ||
        slotEnd > allowedEnd
    ) {
        return {
            blocked: true,
            code: 'SPECIAL_DAY_BLOCKED',
            message: `No se pueden agendar citas fuera del horario permitido (${horarioEspecial?.horario_especial?.hora_inicio || '--:--'}-${horarioEspecial?.horario_especial?.hora_fin || '--:--'}) el ${fechaYmd}.`,
            data: {
                fecha: fechaYmd,
                tipo: 'horario_especial',
                descripcion: horarioEspecial.descripcion || null,
                horario_especial: horarioEspecial.horario_especial || null
            }
        };
    }

    return { blocked: false };
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

const MAX_RECURRING_OCCURRENCES = 200;

const toLocalDate = (value) => {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), 0);
};

const diffMinutes = (start, end) => {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

const formatLocalDateTime = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const capitalizeFirst = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return raw;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatDateTimeForEmail = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

    if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
        const year = Number(localMatch[1]);
        const monthIndex = Number(localMatch[2]) - 1;
        const day = Number(localMatch[3]);
        const hour24 = Number(localMatch[4]);
        const minute = Number(localMatch[5]);

        const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
        const displayHour = hour24 % 12 || 12;
        const ampm = hour24 < 12 ? 'a. m.' : 'p. m.';

        return `${capitalizeFirst(weekdayNames[weekdayIndex])} ${String(day).padStart(2, '0')} de ${monthNames[monthIndex]} de ${year} a las ${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
    }

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;

    const locale = 'es-CO';
    const timeZone = 'America/Bogota';

    const weekday = capitalizeFirst(new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone }).format(d));
    const day = new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone }).format(d);
    const month = capitalizeFirst(new Intl.DateTimeFormat(locale, { month: 'long', timeZone }).format(d));
    const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone }).format(d);
    const time = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone
    }).format(d);

    return `${weekday} ${day} de ${month} de ${year} a las ${time}`;
};

const sendAppointmentEmailByTemplate = async ({
    tenantId,
    userId,
    appointment,
    templateKey
}) => {
    const to = String(appointment?.cliente_email || '').trim();
    if (!to) return;

    const rendered = await renderEmailTemplate({
        tenantId,
        key: templateKey,
        userId,
        variables: {
            cliente_nombre: appointment?.cliente_nombre || 'cliente',
            mascota_nombre: appointment?.mascota_nombre || 'mascota',
            fecha_hora: formatDateTimeForEmail(appointment?.fecha_inicio),
            clinica_nombre: (await getClinicBranding(tenantId)).clinicName
        }
    });

    if (!rendered) return;

    await sendEmail({
        tenantId,
        to,
        subject: rendered.asunto_render,
        html: rendered.cuerpo_html_render,
        text: rendered.cuerpo_text_render || undefined,
        logContext: {
            tipo_envio: templateKey,
            userId,
            metadata: {
                id_cita: appointment?.id_cita,
                codigo_cita: appointment?.codigo_cita || null
            }
        }
    });
};

const buildRecurringOccurrences = ({
    fechaInicio,
    fechaFin,
    frecuencia,
    intervalo,
    diasSemana,
    totalOcurrencias,
    fechaHasta,
    diasEspeciales = []
}) => {
    const inicioBase = toLocalDate(fechaInicio);
    const finBase = toLocalDate(fechaFin);
    const durationMinutes = diffMinutes(inicioBase, finBase);

    if (durationMinutes <= 0) {
        throw new Error('La fecha_fin debe ser posterior a la fecha_inicio');
    }

    const until = fechaHasta ? new Date(`${fechaHasta}T23:59:59`) : null;
    const interval = Math.max(1, Number(intervalo || 1));
    const limit = Math.min(Number(totalOcurrencias || 0) || MAX_RECURRING_OCCURRENCES, MAX_RECURRING_OCCURRENCES);
    const occurrences = [];

    if (frecuencia === 'daily') {
        let cursor = new Date(inicioBase);
        while (occurrences.length < limit) {
            if (until && cursor > until) break;

            const skipReason = getRecurringSkipReason(cursor, diasEspeciales);
            if (!skipReason) {
                const start = new Date(cursor);
                const end = new Date(start.getTime() + durationMinutes * 60000);
                occurrences.push({ start, end });
            }

            cursor.setDate(cursor.getDate() + interval);
        }

        return occurrences;
    }

    const validDays = Array.isArray(diasSemana) && diasSemana.length > 0
        ? Array.from(new Set(diasSemana.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b)
        : [inicioBase.getDay()];

    let dayCursor = new Date(inicioBase);
    while (occurrences.length < limit) {
        if (until && dayCursor > until) break;

        const diffDays = Math.floor((new Date(dayCursor.getFullYear(), dayCursor.getMonth(), dayCursor.getDate()).getTime()
            - new Date(inicioBase.getFullYear(), inicioBase.getMonth(), inicioBase.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(diffDays / 7);

        if (weekIndex % interval === 0 && validDays.includes(dayCursor.getDay())) {
            const skipReason = getRecurringSkipReason(dayCursor, diasEspeciales);
            if (skipReason) {
                dayCursor.setDate(dayCursor.getDate() + 1);
                continue;
            }

            const start = new Date(dayCursor);
            start.setHours(inicioBase.getHours(), inicioBase.getMinutes(), inicioBase.getSeconds(), 0);
            const end = new Date(start.getTime() + durationMinutes * 60000);
            occurrences.push({ start, end });
        }

        dayCursor.setDate(dayCursor.getDate() + 1);
    }

    return occurrences;
};

const isOutboundGoogleSyncEnabled = () => {
    return String(process.env.GOOGLE_SYNC_OUTBOUND_ENABLED ?? 'false').toLowerCase() === 'true';
};

let consultasClinicasTableExistsCache = null;
let rescheduleAuditColumnsCache = null;

const getClinicBranding = async (tenantId = null) => {
    try {
        const result = await query(
            `SELECT nombre_empresa, direccion
             FROM system.configuracion_empresa
             WHERE activa = true
               AND ($1::uuid IS NULL OR id_tenant = $1)
             ORDER BY updated_at DESC NULLS LAST, created_at DESC
             LIMIT 1`,
            [tenantId || null]
        );

        const row = result.rows[0] || null;
        return {
            clinicName: row?.nombre_empresa || process.env.CLINIC_NAME || 'Ramelo Clínica',
            clinicAddress: row?.direccion || process.env.CLINIC_ADDRESS || 'Ramelo Clínica'
        };
    } catch {
        return {
            clinicName: process.env.CLINIC_NAME || 'Ramelo Clínica',
            clinicAddress: process.env.CLINIC_ADDRESS || 'Ramelo Clínica'
        };
    }
};

const shouldInviteOwnerToGoogleCalendar = async (tenantId = null) => {
    if (!tenantId) {
        return false;
    }

    try {
        const result = await query(
            `SELECT sync_preferences
             FROM vetplus_auth.google_calendar_config
             WHERE is_active = true
               AND configured_by IN (
                   SELECT id_usuario
                   FROM vetplus_auth.usuarios
                   WHERE id_tenant = $1
               )
             ORDER BY created_at DESC
             LIMIT 1`,
            [tenantId]
        );

        const prefs = result.rows[0]?.sync_preferences || {};
        const raw = prefs?.configuracion_eventos?.invitar_propietario_calendario;

        if (typeof raw === 'boolean') {
            return raw;
        }

        if (typeof raw === 'string') {
            return raw.trim().toLowerCase() === 'true';
        }

        return false;
    } catch {
        return false;
    }
};

const hasConsultasClinicasTable = async () => {
    if (consultasClinicasTableExistsCache !== null) {
        return consultasClinicasTableExistsCache;
    }

    try {
        const result = await query("SELECT to_regclass('clinical.consultas_clinicas') AS table_name");
        consultasClinicasTableExistsCache = Boolean(result.rows[0]?.table_name);
        return consultasClinicasTableExistsCache;
    } catch {
        consultasClinicasTableExistsCache = false;
        return false;
    }
};

const hasRescheduleAuditColumns = async () => {
    if (rescheduleAuditColumnsCache !== null) {
        return rescheduleAuditColumnsCache;
    }

    try {
        const result = await query(
            `SELECT COUNT(*)::int AS total
             FROM information_schema.columns
             WHERE table_schema = 'clinical'
               AND table_name = 'calendario_citas'
               AND column_name IN (
                   'fue_reagendada',
                   'cantidad_reagendamientos',
                   'ultima_reagendacion_at',
                   'ultima_reagendacion_por'
               )`
        );

        rescheduleAuditColumnsCache = Number(result.rows[0]?.total || 0) === 4;
        return rescheduleAuditColumnsCache;
    } catch {
        rescheduleAuditColumnsCache = false;
        return false;
    }
};

/**
 * Sincronizar cita con Google Calendar
 */
const syncAppointmentWithGoogle = async (appointmentData, action = 'create') => {
    try {
        if (!isOutboundGoogleSyncEnabled()) {
            if (appointmentData?.id_cita) {
                await query(`
                    UPDATE clinical.calendario_citas
                    SET
                        google_sync_status = 'disabled',
                        google_sync_error = 'Sincronizacion saliente deshabilitada (solo Google -> Ramelo)',
                        last_google_sync = CURRENT_TIMESTAMP
                    WHERE id_cita = $1
                `, [appointmentData.id_cita]);
            }

            return {
                success: true,
                skipped: true,
                message: 'Sincronizacion saliente deshabilitada (solo Google -> Ramelo)'
            };
        }

        // Verificar si Google Calendar está configurado
        if (!await googleCalendarService.hasValidTokens()) {
            return {
                success: false,
                error: 'Google Calendar no está configurado'
            };
        }

        const {
            id_cita,
            id_tenant,
            fecha_inicio,
            fecha_fin,
            tipo,
            estado,
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
        const { clinicName, clinicAddress } = await getClinicBranding(id_tenant);
        const inviteOwnerToCalendar = await shouldInviteOwnerToGoogleCalendar(id_tenant);

        console.log('📅 Fechas formateadas para Google:', {
            original_start: fecha_inicio,
            formatted_start: formattedStartDateTime,
            original_end: fecha_fin,
            formatted_end: formattedEndDateTime,
            timezone_will_be_set_to: 'America/Bogota'
        });

        // Crear descripción detallada para el evento
        const description = `
    📅 Cita Veterinaria - ${clinicName}

🐕 Mascota: ${mascota_nombre}
👤 Cliente: ${cliente_nombre}
👨‍⚕️ Veterinario: ${veterinario_nombre}
📋 Tipo: ${tipo}
📝 Motivo: ${motivo || 'No especificado'}

Código de cita: ${appointmentData.codigo_cita}
        `.trim();

        const eventData = {
            summary: `Cita Veterinaria - ${clinicName}`,
            description,
            startDateTime: formattedStartDateTime,
            endDateTime: formattedEndDateTime,
            attendeeEmail: inviteOwnerToCalendar ? cliente_email : null,
            location: clinicAddress,
            // Necesarios para que Google refleje el mismo tipo/color que usa la
            // clasificación de importación (evita que un evento sin color se
            // reclasifique como "terapia" por defecto en el próximo sync) y para
            // que no se agreguen recordatorios a citas ya completadas/canceladas.
            tipo,
            status: estado
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
            observaciones
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
            observaciones
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

        // Regla de negocio: no laborable bloquea todo el día; horario especial solo permite franja configurada.
        const diasEspeciales = await getTenantDiasEspeciales(tenantId);
        const specialValidation = validateDateTimeAgainstSpecialDays({
            diasEspeciales,
            fechaInicio: fechaInicioFormato,
            fechaFin: fechaFinFormato
        });

        if (specialValidation.blocked) {
            return res.status(409).json({
                success: false,
                message: specialValidation.message,
                code: specialValidation.code,
                data: specialValidation.data
            });
        }

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
        
        // Regla de negocio actual: se permiten citas simultáneas/solapadas por veterinario.
        
        // Crear la cita
        const insertQuery = `
            INSERT INTO clinical.calendario_citas (
                id_cita, codigo_cita, id_mascota, id_veterinario,
                fecha_inicio, fecha_fin, tipo, estado, motivo, notas, created_by, id_tenant
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const result = await query(insertQuery, [
            id_cita, codigo_cita, id_mascota, id_veterinario,
            fechaInicioFormato, fechaFinFormato, tipo, 'confirmada', motivo, notasFinales, created_by, tenantId
        ]);
        
        // Obtener información completa de la cita creada
        const citaCompleta = await getAppointmentWithDetails(id_cita);

        try {
            await sendAppointmentEmailByTemplate({
                tenantId,
                userId: req.user?.id_usuario || req.user?.id || null,
                appointment: citaCompleta,
                templateKey: 'cita_agendada'
            });
        } catch (mailError) {
            console.error('No se pudo enviar correo de cita agendada:', mailError.message);
        }
        
        // Sincronizar con Google Calendar (de forma asíncrona)
        const syncResult = await syncAppointmentWithGoogle(citaCompleta, 'create');

        // Nota: no se llama a logActivity acá — el middleware global
        // auditActivity (server.js) ya audita esta ruta con tipo CITAS;
        // llamarlo también acá duplicaba cada registro en activity_log.

        // Transformar para el frontend
        const citaTransformada = transformAppointmentForFrontend(citaCompleta);

        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            data: citaTransformada,
            google_sync: syncResult.skipped ? 'disabled' : (syncResult.success ? 'synced' : 'failed'),
            google_sync_message: syncResult.skipped
                ? syncResult.message
                : (syncResult.success ? 'Sincronizada con Google Calendar' : syncResult.error)
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
 * Previsualizar citas periódicas sin crear registros
 */
export const previewRecurringAppointments = async (req, res) => {
    try {
        const {
            fecha_inicio,
            fecha_fin,
            recurrencia
        } = req.body;

        const frecuencia = recurrencia?.frecuencia || 'weekly';
        const intervalo = Number(recurrencia?.intervalo || 1);
        const diasSemana = recurrencia?.dias_semana || [];
        const totalOcurrencias = Number(recurrencia?.total_ocurrencias || 12);
        const fechaHasta = recurrencia?.fecha_hasta || null;
        const diasEspeciales = await getTenantDiasEspeciales(req.tenantId ?? req.user?.tenant_id);

        const ocurrencias = buildRecurringOccurrences({
            fechaInicio: fecha_inicio,
            fechaFin: fecha_fin,
            frecuencia,
            intervalo,
            diasSemana,
            totalOcurrencias,
            fechaHasta,
            diasEspeciales
        });

        return res.json({
            success: true,
            data: {
                total: ocurrencias.length,
                ocurrencias: ocurrencias.map((o, index) => ({
                    indice: index + 1,
                    fecha_inicio: formatLocalDateTime(o.start),
                    fecha_fin: formatLocalDateTime(o.end)
                }))
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || 'No se pudo previsualizar la recurrencia'
        });
    }
};

/**
 * Crear serie de citas periódicas materializando ocurrencias en calendario_citas
 */
export const createRecurringAppointments = async (req, res) => {
    let txClient = null;
    try {
        const {
            id_mascota,
            id_veterinario,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            notas,
            observaciones,
            recurrencia,
            ocurrencias_editadas
        } = req.body;

        const notasFinales = notas || observaciones || null;
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        const createdBy = req.user?.id || req.user?.id_usuario || null;

        const frecuencia = recurrencia?.frecuencia || 'weekly';
        const intervalo = Number(recurrencia?.intervalo || 1);
        const diasSemana = recurrencia?.dias_semana || [];
        const totalOcurrencias = Number(recurrencia?.total_ocurrencias || 12);
        const fechaHasta = recurrencia?.fecha_hasta || null;
        const diasEspeciales = await getTenantDiasEspeciales(tenantId);

        const ocurrenciasRegla = buildRecurringOccurrences({
            fechaInicio: fecha_inicio,
            fechaFin: fecha_fin,
            frecuencia,
            intervalo,
            diasSemana,
            totalOcurrencias,
            fechaHasta,
            diasEspeciales
        });

        const ocurrencias = Array.isArray(ocurrencias_editadas) && ocurrencias_editadas.length > 0
            ? ocurrencias_editadas
                .map((item, idx) => {
                    const start = item?.fecha_inicio ? toLocalDate(item.fecha_inicio) : null;
                    const end = item?.fecha_fin ? toLocalDate(item.fecha_fin) : null;
                    if (!start || !end || end <= start) return null;
                    return {
                        start,
                        end,
                        tipo: item?.tipo || tipo,
                        indice: Number(item?.indice || idx + 1)
                    };
                })
                .filter(Boolean)
            : ocurrenciasRegla.map((o, idx) => ({ ...o, tipo, indice: idx + 1 }));

        if (!ocurrencias.length) {
            return res.status(400).json({
                success: false,
                message: 'La regla no genera ocurrencias válidas'
            });
        }

        // Regla de negocio: no laborable bloquea el día completo; horario especial bloquea fuera de franja.
        const ocurrenciasBloqueadas = [];

        for (const occ of ocurrencias) {
            const startDateTime = occ.start instanceof Date ? occ.start : occ?.fecha_inicio;
            const endDateTime = occ.end instanceof Date ? occ.end : occ?.fecha_fin;
            const validation = validateDateTimeAgainstSpecialDays({
                diasEspeciales,
                fechaInicio: startDateTime,
                fechaFin: endDateTime
            });

            if (validation.blocked) {
                ocurrenciasBloqueadas.push({
                    fecha: validation.data?.fecha || extractDateOnly(startDateTime),
                    tipo: validation.data?.tipo || null,
                    descripcion: validation.data?.descripcion || null,
                    horario_especial: validation.data?.horario_especial || null
                });
            }
        }

        if (ocurrenciasBloqueadas.length > 0) {
            const fechas = Array.from(new Set(ocurrenciasBloqueadas.map((d) => d.fecha))).slice(0, 5).join(', ');
            return res.status(409).json({
                success: false,
                message: `La serie incluye fechas no agendables (${fechas}).`,
                code: 'SPECIAL_DAY_BLOCKED',
                data: {
                    total_bloqueadas: ocurrenciasBloqueadas.length,
                    muestras: ocurrenciasBloqueadas.slice(0, 5)
                }
            });
        }

        txClient = await getClient();
        await txClient.query('BEGIN');

        const duracionMinutos = diffMinutes(toLocalDate(fecha_inicio), toLocalDate(fecha_fin));

        const serieResult = await txClient.query(
            `INSERT INTO clinical.calendario_series (
                id_mascota, id_veterinario, tipo, estado_inicial, motivo, notas,
                duracion_minutos, fecha_inicio_base, frecuencia, intervalo,
                dias_semana, total_ocurrencias, fecha_hasta, id_tenant, created_by, updated_by
            ) VALUES (
                $1,$2,$3,'confirmada',$4,$5,
                $6,$7,$8,$9,
                $10,$11,$12,$13,$14,$14
            )
            RETURNING id_serie, codigo_serie`,
            [
                id_mascota,
                id_veterinario,
                tipo,
                motivo || null,
                notasFinales,
                duracionMinutos,
                convertirFechaAColombia(fecha_inicio),
                frecuencia,
                intervalo,
                diasSemana,
                Math.min(ocurrencias.length, MAX_RECURRING_OCCURRENCES),
                fechaHasta,
                tenantId,
                createdBy
            ]
        );

        const serie = serieResult.rows[0];
        const createdIds = [];

        for (let i = 0; i < ocurrencias.length; i++) {
            const occ = ocurrencias[i];
            const id_cita = uuidv4();
            const codigo_cita = generateAppointmentCode();
            const tipoOcurrencia = occ.tipo || tipo;
            const indiceSerie = occ.indice || (i + 1);

            const insert = await txClient.query(
                `INSERT INTO clinical.calendario_citas (
                    id_cita, codigo_cita, id_mascota, id_veterinario,
                    fecha_inicio, fecha_fin, tipo, estado, motivo, notas,
                    id_tenant, created_by, id_serie, indice_serie
                ) VALUES (
                    $1,$2,$3,$4,
                    $5,$6,$7,'confirmada',$8,$9,
                    $10,$11,$12,$13
                ) RETURNING id_cita`,
                [
                    id_cita,
                    codigo_cita,
                    id_mascota,
                    id_veterinario,
                    convertirFechaAColombia(formatLocalDateTime(occ.start)),
                    convertirFechaAColombia(formatLocalDateTime(occ.end)),
                    tipoOcurrencia,
                    motivo || null,
                    notasFinales,
                    tenantId,
                    createdBy,
                    serie.id_serie,
                    indiceSerie
                ]
            );

            createdIds.push(insert.rows[0].id_cita);
        }

        await txClient.query('COMMIT');
        txClient.release();
        txClient = null;

        // Sync fuera de transacción para no bloquear creación masiva
        for (const idCita of createdIds) {
            const citaCompleta = await getAppointmentWithDetails(idCita, tenantId);
            if (citaCompleta) {
                await syncAppointmentWithGoogle(citaCompleta, 'create');
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Serie de citas creada exitosamente',
            data: {
                id_serie: serie.id_serie,
                codigo_serie: serie.codigo_serie,
                total_citas: createdIds.length,
                citas: createdIds
            }
        });
    } catch (error) {
        if (txClient) {
            try { await txClient.query('ROLLBACK'); } catch {}
            txClient.release();
        }

        console.error('Error creando citas periódicas:', error);
        return res.status(500).json({
            success: false,
            message: 'No se pudo crear la serie de citas',
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
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        let whereConditions = [`c.id_tenant = $1`]; // Filtrar por tenant
        let queryParams = [tenantId];
        let paramCount = 1;
        
        // Construir filtros dinámicos
        if (fecha_inicio) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio >= $${paramCount}::date`);
            queryParams.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            paramCount++;
            whereConditions.push(`c.fecha_inicio < ($${paramCount}::date + INTERVAL '1 day')`);
            queryParams.push(fecha_fin);
        }
        
        if (estado) {
            paramCount++;
            // Mapear estado del frontend al de la BD
            const estadoDb = mapFrontendToDb(estado);
            whereConditions.push(`c.estado = $${paramCount}`);
            queryParams.push(estadoDb);
        } else {
            // Por defecto las citas canceladas no se muestran en los listados generales.
            whereConditions.push(`c.estado != 'cancelada'`);
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
        
        const hasConsultasTable = await hasConsultasClinicasTable();

        // Query principal
        const mainQuery = `
            SELECT 
                c.*,
                to_char(c.fecha_inicio, 'YYYY-MM-DD HH24:MI:SS') as fecha_inicio,
                to_char(c.fecha_fin, 'YYYY-MM-DD HH24:MI:SS') as fecha_fin,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.email as cliente_email,
                v.nombre as veterinario_nombre,
                v.email as veterinario_email,
                ${hasConsultasTable ? 'con.codigo_consulta, con.diagnostico' : 'NULL::text as codigo_consulta, NULL::text as diagnostico'}
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            ${hasConsultasTable ? 'LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta' : ''}
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

        // Regla de negocio: no laborable bloquea día completo; horario especial bloquea fuera de franja.
        const effectiveFechaInicio = updateData.fecha_inicio !== undefined ? updateData.fecha_inicio : cita.fecha_inicio;
        const effectiveFechaFin = updateData.fecha_fin !== undefined ? updateData.fecha_fin : cita.fecha_fin;
        const diasEspeciales = await getTenantDiasEspeciales(tenantId);
        const specialValidation = validateDateTimeAgainstSpecialDays({
            diasEspeciales,
            fechaInicio: effectiveFechaInicio,
            fechaFin: effectiveFechaFin
        });

        if (specialValidation.blocked) {
            return res.status(409).json({
                success: false,
                message: specialValidation.message,
                code: specialValidation.code,
                data: specialValidation.data
            });
        }
        
        // Regla de negocio actual: se permiten citas simultáneas/solapadas por veterinario.
        
        // Mapear estado del frontend a la base de datos si está presente
        if (updateData.estado) {
            updateData.estado = mapFrontendToDb(updateData.estado);
            console.log(`🔄 Mapeando estado en updateAppointment: ${updateData.estado}`);

            if (!ESTADOS_CITA_PERMITIDOS.includes(updateData.estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado de cita no permitido. Use: confirmada, en_curso, completada o no_asistio'
                });
            }
        }

        const hasFechaInicioChange = updateData.fecha_inicio !== undefined
            && new Date(updateData.fecha_inicio).getTime() !== new Date(cita.fecha_inicio).getTime();
        const hasFechaFinChange = updateData.fecha_fin !== undefined
            && new Date(updateData.fecha_fin).getTime() !== new Date(cita.fecha_fin).getTime();
        const hasRescheduleChange = hasFechaInicioChange || hasFechaFinChange;
        const canPersistRescheduleAudit = hasRescheduleChange ? await hasRescheduleAuditColumns() : false;
        
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

        if (hasRescheduleChange && canPersistRescheduleAudit) {
            updateFields.push('fue_reagendada = true');
            updateFields.push('cantidad_reagendamientos = COALESCE(cantidad_reagendamientos, 0) + 1');
            updateFields.push('ultima_reagendacion_at = CURRENT_TIMESTAMP');

            paramCount++;
            updateFields.push(`ultima_reagendacion_por = $${paramCount}`);
            updateValues.push(req.user?.id || null);
        }
        
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

        if (hasRescheduleChange) {
            try {
                await sendAppointmentEmailByTemplate({
                    tenantId,
                    userId: req.user?.id_usuario || req.user?.id || null,
                    appointment: citaActualizada,
                    templateKey: 'cita_reagendada'
                });
            } catch (mailError) {
                console.error('No se pudo enviar correo de cita reagendada:', mailError.message);
            }
        }
        
        // Sincronizar con Google Calendar si hay cambios significativos
        let syncResult = { success: true, skipped: true, message: 'No requiere sincronización' };
        
        const significantFields = ['fecha_inicio', 'fecha_fin', 'tipo', 'motivo', 'id_veterinario', 'id_mascota'];
        const hasSignificantChanges = significantFields.some(field => updateData[field] !== undefined);
        
        if (hasSignificantChanges && citaActualizada.google_event_id) {
            syncResult = await syncAppointmentWithGoogle(citaActualizada, 'update');
        }
        
        // Auditado por el middleware global (ver nota en createAppointment).

        // Transformar para el frontend
        const citaTransformada = transformAppointmentForFrontend(citaActualizada);

        res.json({
            success: true,
            message: 'Cita actualizada exitosamente',
            data: citaTransformada,
            google_sync: syncResult.skipped ? 'disabled' : (syncResult.success ? 'synced' : 'failed'),
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

        if (!ESTADOS_CITA_PERMITIDOS.includes(estadoDb)) {
            return res.status(400).json({
                success: false,
                message: 'Estado de cita no permitido. Use: confirmada, en_curso, completada o no_asistio'
            });
        }
        
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        // Verificar que la cita existe antes de iniciar la transacción
        const citaExistente = await query(
            'SELECT id_cita, estado, fecha_inicio, fecha_fin FROM clinical.calendario_citas WHERE id_cita = $1 AND id_tenant = $2',
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
                estado_actual: citaExistente.rows[0].estado,
                fecha_inicio_actual: citaExistente.rows[0].fecha_inicio,
                fecha_fin_actual: citaExistente.rows[0].fecha_fin
        });

        const hasConsultasTable = await hasConsultasClinicasTable();

        // Validación especial: No permitir completar cita sin historia clínica completada
        if (estadoDb === 'completada') {
            console.log('🔍 Validando historia clínica antes de completar cita...');

            // Flujo principal actual: historias_clinicas
            const historiaResult = await query(
                `SELECT id_historia, estado
                 FROM clinical.historias_clinicas
                 WHERE id_cita = $1 AND id_tenant = $2
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [id, tenantId]
            );

            if (historiaResult.rows.length > 0) {
                const historia = historiaResult.rows[0];

                if (historia.estado !== 'Completado') {
                    console.log('❌ Historia clínica no está completada:', historia.estado);
                    return res.status(400).json({
                        success: false,
                        message: 'La historia clínica debe estar completada antes de marcar la cita como completada.',
                        code: 'CONSULTATION_NOT_COMPLETED'
                    });
                }

                console.log('✅ Validación de historia clínica (historias_clinicas) pasada');
            } else if (hasConsultasTable) {
                // Fallback legacy: consultas_clinicas
                const consultaResult = await query(
                    'SELECT id_consulta, estado FROM clinical.consultas_clinicas WHERE id_cita = $1 AND id_tenant = $2',
                    [id, tenantId]
                );

                if (consultaResult.rows.length === 0) {
                    console.log('❌ No se encontró historia/consulta clínica para esta cita');
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

                console.log('✅ Validación de historia clínica (consultas_clinicas legacy) pasada');
            } else {
                console.log('❌ No se encontró historia clínica para esta cita');
                return res.status(400).json({
                    success: false,
                    message: 'No se puede completar la cita sin historia clínica. Primero debe crear y completar la historia clínica.',
                    code: 'CONSULTATION_REQUIRED'
                });
            }
        }

        // Iniciar transacción para operaciones múltiples
        txClient = await getClient();
        await txClient.query('BEGIN');
        console.log('🔄 Transacción iniciada');

        try {
            const updateFields = ['estado = $1', 'notas = COALESCE($2, notas)', 'updated_at = CURRENT_TIMESTAMP'];
            const updateParams = [estadoDb, notas, id, tenantId];

            // Al iniciar consulta, fecha_inicio queda tal como se programó la cita
            // (no se reemplaza por la hora real en que se marcó "en curso").
            // Solo se fija un fin tentativo (inicio + 1h) para no bloquear toda la
            // jornada hasta que se marque como completada.
            if (estadoDb === 'en_curso' && citaExistente.rows[0].estado !== 'en_curso') {
                updateFields.push(`fecha_fin = fecha_inicio + INTERVAL '1 hour'`);
            }

            // Al completar ya NO se toca fecha_fin/fecha_inicio: quedan tal como
            // se fijaron al pasar a "en curso" (inicio real + 1h) o al crear la
            // cita (inicio + 1h por defecto) — la hora de fin es predeterminada,
            // no el momento real en que alguien apretó "Completar".

            const result = await txClient.query(`
                UPDATE clinical.calendario_citas
                SET ${updateFields.join(', ')}
                WHERE id_cita = $3 AND id_tenant = $4
                RETURNING *
            `, updateParams);

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
            if (hasConsultasTable && estadoDb === 'en_curso') {
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
            if (hasConsultasTable && estadoDb === 'completada') {
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
            let syncResult = { success: true, skipped: true, message: 'No requiere sincronización' };

            if (citaActualizada && citaActualizada.google_event_id) {
                try {
                    // Obtener estado anterior de la cita antes de la actualización
                    const estadoAnterior = result.rows[0].estado; // Estado antes del cambio
                    console.log(`🔄 Sincronizando cambio de estado/tiempos reales con Google Calendar: ${estadoAnterior} → ${estadoDb}`);
                    syncResult = await syncAppointmentWithGoogle(citaActualizada, 'update');

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

            // Auditado por el middleware global (ver nota en createAppointment).

            // Transformar para el frontend
            const citaTransformada = transformAppointmentForFrontend(citaActualizada);

            res.json({
                success: true,
                message: estadoDb === 'completada' ?
                    'Cita completada y historia clínica iniciada automáticamente' :
                    'Estado de cita actualizado exitosamente',
                data: citaTransformada,
                google_sync: syncResult.skipped ? 'disabled' : (syncResult.success ? 'synced' : 'failed'),
                google_sync_message: syncResult.skipped
                    ? syncResult.message
                    : (syncResult.success ? 'Sincronizado con Google Calendar' : syncResult.error)
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
 * Requisitos:
 *  - No se puede cancelar si la cita ya tiene algún documento clínico asociado
 *    (para no perder trazabilidad de una atención que ya se registró).
 *  - Al cancelar, la cita deja de aparecer en el calendario por defecto
 *    (ver getCalendarView/getAppointments) y se elimina de Google Calendar.
 */
export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo_cancelacion } = req.body;
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const citaExistente = await query(
            'SELECT id_cita, estado, codigo_cita FROM clinical.calendario_citas WHERE id_cita = $1 AND id_tenant = $2',
            [id, tenantId]
        );

        if (citaExistente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        if (citaExistente.rows[0].estado === 'cancelada') {
            return res.status(409).json({
                success: false,
                message: 'La cita ya está cancelada'
            });
        }

        const historiaAsociada = await query(
            'SELECT id_historia FROM clinical.historias_clinicas WHERE id_cita = $1 AND id_tenant = $2 LIMIT 1',
            [id, tenantId]
        );

        if (historiaAsociada.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'No se puede cancelar: esta cita ya tiene un documento clínico asociado.',
                code: 'HISTORIA_CLINICA_ASOCIADA'
            });
        }

        const result = await query(`
            UPDATE clinical.calendario_citas
            SET estado = 'cancelada',
                notas = CASE
                    WHEN notas IS NULL THEN $3
                    ELSE notas || ' | CANCELADA: ' || $3
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $1 AND id_tenant = $2
            RETURNING *
        `, [id, tenantId, motivo_cancelacion || 'Sin motivo especificado']);

        // Obtener información completa para sincronización
        const citaCancelada = await getAppointmentWithDetails(id);

        // Eliminar de Google Calendar si existe
        let syncResult = { success: true, skipped: true, message: 'Sin evento en Google Calendar' };
        if (citaCancelada && citaCancelada.google_event_id) {
            syncResult = await syncAppointmentWithGoogle(citaCancelada, 'delete');
        }

        // Auditado por el middleware global (ver nota en createAppointment);
        // el motivo queda igual en request_data (el body de la request se guarda ahí).

        res.json({
            success: true,
            message: 'Cita cancelada exitosamente',
            data: result.rows[0],
            google_sync: syncResult.skipped ? 'disabled' : (syncResult.success ? 'deleted' : 'failed'),
            google_sync_message: syncResult.skipped
                ? syncResult.message
                : (syncResult.success ? 'Eliminada de Google Calendar' : syncResult.error)
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
        const tenantId = req.tenantId;
        const hasConsultasTable = await hasConsultasClinicasTable();
        
        const petQuery = `
            SELECT 
                c.*,
                c.fecha_inicio as fecha_cita,
                v.nombre as veterinario_nombre,
                ${hasConsultasTable ? 'con.codigo_consulta, con.diagnostico' : 'NULL::text as codigo_consulta, NULL::text as diagnostico'}
            FROM clinical.calendario_citas c
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            ${hasConsultasTable ? 'LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta AND con.id_tenant = c.id_tenant' : ''}
            WHERE c.id_mascota = $1 AND c.id_tenant = $2
            ORDER BY c.fecha_inicio DESC
        `;
        
        const result = await query(petQuery, [id, tenantId]);
        const citas = result.rows.map(transformAppointmentForFrontend);
        
        res.json({
            success: true,
            data: citas
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
        const tenantId = req.tenantId ?? req.user?.tenant_id;
        
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
            'c.id_tenant = $1',
            'c.fecha_inicio >= $2::date',
            'c.fecha_inicio < ($3::date + INTERVAL \'1 day\')'
        ];
        let queryParams = [tenantId, startDate, endDate];
        let paramIndex = 4;
        
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
        } else {
            // Por defecto las citas canceladas no se muestran en el calendario
            // (siguen existiendo en BD, solo se ocultan de la vista general).
            whereConditions.push(`c.estado != 'cancelada'`);
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

        if (!isOutboundGoogleSyncEnabled()) {
            return res.status(200).json({
                success: true,
                message: 'Sincronizacion saliente deshabilitada (solo Google -> Ramelo)',
                data: {
                    appointment_id: id,
                    sync_status: 'disabled'
                }
            });
        }
        
        // Admin, veterinario y auxiliar pueden forzar sincronización
        if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
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
        if (cita.google_event_id && !['cancelada', 'no_asistio'].includes(cita.estado)) {
            action = 'update';
        } else if (['cancelada', 'no_asistio'].includes(cita.estado)) {
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
 * Reintentar el envío hacia Google de citas pendientes/fallidas/deshabilitadas.
 * Compartida entre el endpoint manual (syncAllPendingAppointments) y el
 * scheduler automático, para que el sentido saliente también se autocorrija
 * solo, igual que ya hace el entrante.
 */
export const syncPendingOutboundAppointments = async () => {
    if (!isOutboundGoogleSyncEnabled()) {
        return { skipped: true, total: 0, synced: 0, failed: 0, errors: [] };
    }

    // 'disabled' queda grabado en las citas creadas/editadas mientras
    // GOOGLE_SYNC_OUTBOUND_ENABLED estaba en false — una vez activado, ese
    // estado es obsoleto y debe reintentarse igual que pending/failed.
    const pendingResult = await query(`
        SELECT c.id_cita
        FROM clinical.calendario_citas c
        WHERE c.google_sync_status IN ('pending', 'failed', 'disabled')
        AND c.estado NOT IN ('cancelada', 'no_asistio')
        AND c.fecha_inicio >= CURRENT_DATE - INTERVAL '1 day'
        ORDER BY c.fecha_inicio ASC
        LIMIT 50
    `);

    const results = {
        skipped: false,
        total: pendingResult.rows.length,
        synced: 0,
        failed: 0,
        errors: []
    };

    for (const row of pendingResult.rows) {
        try {
            const cita = await getAppointmentWithDetails(row.id_cita);
            if (cita) {
                // Si ya tiene un evento vinculado en Google hay que actualizarlo,
                // no crear uno nuevo — 'create' siempre acá duplicaba el evento
                // en cada reintento de una cita que ya se había sincronizado antes.
                const action = cita.google_event_id ? 'update' : 'create';
                const syncResult = await syncAppointmentWithGoogle(cita, action);
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

    return results;
};

/**
 * Sincronizar todas las citas pendientes con Google Calendar (manual, botón "Sincronizar")
 */
export const syncAllPendingAppointments = async (req, res) => {
    try {
        // Admin, veterinario y auxiliar pueden sincronizar masivamente
        if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para sincronizar todas las citas'
            });
        }

        const results = await syncPendingOutboundAppointments();

        if (results.skipped) {
            return res.status(200).json({
                success: true,
                message: 'Sincronizacion saliente deshabilitada (solo Google -> Ramelo)',
                data: { total: 0, synced: 0, failed: 0, errors: [] }
            });
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
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const summaryResult = await query(
            `WITH bounds AS (
                SELECT
                    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date AS today,
                    date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date)::date AS week_start,
                    (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date)::date + INTERVAL '6 day')::date AS week_end
            )
            SELECT
                COUNT(*) FILTER (
                                        WHERE c.fecha_inicio >= b.week_start
                                            AND c.fecha_inicio < (b.week_end + INTERVAL '1 day')
                )::int AS total_citas,
                COUNT(*) FILTER (
                                        WHERE c.fecha_inicio >= b.today
                                            AND c.fecha_inicio < (b.today + INTERVAL '1 day')
                )::int AS citas_hoy,
                COUNT(*) FILTER (
                                        WHERE c.fecha_inicio >= b.today
                                                AND c.fecha_inicio < (b.today + INTERVAL '1 day')
                        AND c.estado = 'confirmada'
                )::int AS citas_pendientes,
                COUNT(*) FILTER (
                                        WHERE c.fecha_inicio >= b.today
                                            AND c.fecha_inicio < (b.today + INTERVAL '1 day')
                      AND c.estado = 'completada'
                )::int AS citas_completadas
                                ,COUNT(*) FILTER (
                                                                                WHERE c.fecha_inicio >= b.week_start
                                                                                        AND c.fecha_inicio < (b.week_end + INTERVAL '1 day')
                                            AND c.estado IN ('no_asistio', 'cancelada')
                                )::int AS citas_canceladas_semana
            FROM clinical.calendario_citas c
            CROSS JOIN bounds b
            WHERE c.id_tenant = $1`,
            [tenantId]
        );

        const totalCitas = parseInt(summaryResult.rows[0].total_citas || 0, 10);
        const citasHoy = parseInt(summaryResult.rows[0].citas_hoy || 0, 10);
        const citasPendientes = parseInt(summaryResult.rows[0].citas_pendientes || 0, 10);
        const citasCompletadas = parseInt(summaryResult.rows[0].citas_completadas || 0, 10);
        const citasCanceladasSemana = parseInt(summaryResult.rows[0].citas_canceladas_semana || 0, 10);
        const tasaOcupacion = totalCitas > 0 ? Math.round((citasCompletadas / totalCitas) * 100) : 0;
        
        // Obtener estadísticas por estado
        const estadosQuery = `
            WITH bounds AS (
                SELECT
                    date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date)::date AS week_start,
                    (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date)::date + INTERVAL '6 day')::date AS week_end
            )
            SELECT estado, COUNT(*) as cantidad
            FROM clinical.calendario_citas 
            CROSS JOIN bounds b
            WHERE id_tenant = $1
                            AND fecha_inicio >= b.week_start
                            AND fecha_inicio < (b.week_end + INTERVAL '1 day')
            GROUP BY estado 
            ORDER BY cantidad DESC
        `;
        const estadosResult = await query(estadosQuery, [tenantId]);
        
        const stats = {
            total_citas: totalCitas,
            citas_hoy: citasHoy,
            citas_pendientes: citasPendientes,
            citas_completadas: citasCompletadas,
            citas_canceladas_semana: citasCanceladasSemana,
            tasa_ocupacion: tasaOcupacion,
            estados: estadosResult.rows.map(row => ({
                estado: row.estado,
                cantidad: parseInt(row.cantidad)
            })),
            periodo_estados: 'semana_actual'
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
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        if (!(await hasConsultasClinicasTable())) {
            return res.status(404).json({
                success: false,
                message: 'La tabla de consultas clínicas no está disponible en este entorno'
            });
        }

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
            WHERE c.id_cita = $1 AND c.id_tenant = $2
        `, [id, tenantId]);

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
    const hasConsultasTable = await hasConsultasClinicasTable();
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
            m.foto_url as mascota_foto_url,
            m.fecha_nacimiento,
            cl.nombre as cliente_nombre,
            cl.cedula as cliente_documento,
            cl.telefono as cliente_telefono,
            cl.email as cliente_email,
            cl.direccion as cliente_direccion,
            v.nombre as veterinario_nombre,
            v.email as veterinario_email,
            v.avatar_url as veterinario_avatar_url,
            ${hasConsultasTable ? 'con.codigo_consulta, con.diagnostico, con.tratamiento' : 'NULL::text as codigo_consulta, NULL::text as diagnostico, NULL::text as tratamiento'}
        FROM clinical.calendario_citas c
        LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
        LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
        LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
        ${hasConsultasTable ? 'LEFT JOIN clinical.consultas_clinicas con ON c.id_consulta = con.id_consulta AND con.id_tenant = c.id_tenant' : ''}
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
