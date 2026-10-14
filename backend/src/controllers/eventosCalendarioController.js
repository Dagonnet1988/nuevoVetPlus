import { query } from '../config/database.js';
import googleCalendarService from '../services/googleCalendar.js';
import { logSyncEvents, describeGoogleError } from '../utils/syncAuditLog.js';

/**
 * Eventos propios del calendario (recordatorios del usuario, no son citas).
 * - Visibles solo para quien los crea y para los perfiles con los que los comparte.
 * - Solo el creador puede editarlos o eliminarlos.
 * - Se publican en Google Calendar (Ramelo -> Google); nunca se importan de vuelta.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isOutboundGoogleSyncEnabled = () =>
    String(process.env.GOOGLE_SYNC_OUTBOUND_ENABLED ?? 'false').toLowerCase() === 'true';

// Fechas como texto local (sin zona) para evitar desfases al viajar por JSON.
const SELECT_EVENTO = `
    SELECT
        e.id_evento,
        e.titulo,
        e.descripcion,
        TO_CHAR(e.fecha_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_inicio,
        TO_CHAR(e.fecha_fin, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_fin,
        e.id_creador,
        e.compartido_con,
        e.google_event_id,
        e.google_sync_status,
        e.google_sync_error,
        e.id_tenant,
        TRIM(CONCAT(u.nombre, ' ', u.apellido)) AS creador_nombre
    FROM clinical.calendario_eventos e
    JOIN vetplus_auth.usuarios u ON u.id_usuario = e.id_creador
`;

const getCtx = (req) => ({
    tenantId: req.tenantId ?? req.user?.tenant_id,
    userId: req.user?.id ?? req.user?.id_usuario
});

const withFlags = (row, userId) => ({ ...row, es_propio: row.id_creador === userId });

const normalizarFecha = (value) => {
    const text = String(value || '').trim();
    if (!DATETIME_RE.test(text)) return null;
    return text.length === 16 ? `${text}:00` : text;
};

/** Valida y normaliza el cuerpo. Devuelve { error } o { data }. */
const parseBody = async (body, tenantId, creatorId) => {
    const titulo = String(body?.titulo || '').trim();
    if (!titulo) return { error: 'El título es obligatorio' };
    if (titulo.length > 200) return { error: 'El título no puede superar 200 caracteres' };

    const fechaInicio = normalizarFecha(body?.fecha_inicio);
    const fechaFin = normalizarFecha(body?.fecha_fin);
    if (!fechaInicio || !fechaFin) return { error: 'Fecha y hora de inicio y fin son obligatorias' };
    if (fechaFin <= fechaInicio) return { error: 'La hora de fin debe ser posterior a la de inicio' };

    const descripcion = String(body?.descripcion || '').trim().slice(0, 2000) || null;

    let compartidoCon = [];
    if (Array.isArray(body?.compartido_con) && body.compartido_con.length > 0) {
        const ids = [...new Set(body.compartido_con.map(String))].filter(id => id !== creatorId);
        if (ids.some(id => !UUID_RE.test(id))) return { error: 'Lista de perfiles inválida' };
        if (ids.length > 0) {
            const valid = await query(
                `SELECT id_usuario FROM vetplus_auth.usuarios
                 WHERE id_tenant = $1 AND activo = true AND id_usuario = ANY($2::uuid[])`,
                [tenantId, ids]
            );
            compartidoCon = valid.rows.map(r => r.id_usuario);
        }
    }

    return { data: { titulo, descripcion, fechaInicio, fechaFin, compartidoCon } };
};

/** Publica (create/update/delete) el evento en Google y guarda el resultado. Nunca lanza. */
const syncEventoConGoogle = async (evento, action, userId) => {
    const registrar = (result) => logSyncEvents([{
        tenantId: evento.id_tenant,
        direccion: 'RAMELO_A_GOOGLE',
        origen: 'usuario',
        accion: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
        exito: Boolean(result?.success) && !result?.skipped,
        codigoCita: 'EVENTO',
        googleEventId: result?.eventId || evento.google_event_id,
        titulo: evento.titulo,
        motivo: result?.skipped ? 'saliente_deshabilitada' : 'evento_propio',
        error: result?.success ? null : result?.error,
        idUsuario: userId
    }]);

    const guardar = async (status, error, googleEventId) => {
        if (action === 'delete') return;
        await query(
            `UPDATE clinical.calendario_eventos
             SET google_sync_status = $1, google_sync_error = $2,
                 google_event_id = COALESCE($3, google_event_id), last_google_sync = CURRENT_TIMESTAMP
             WHERE id_evento = $4`,
            [status, error, googleEventId || null, evento.id_evento]
        );
    };

    try {
        if (!isOutboundGoogleSyncEnabled()) {
            const skipped = { success: true, skipped: true };
            await guardar('disabled', 'Sincronizacion saliente deshabilitada', null);
            await registrar(skipped);
            return { status: 'disabled' };
        }

        const payload = {
            summary: evento.titulo,
            description: evento.descripcion,
            // Las fechas se guardan como hora local de Colombia (igual que las citas).
            startDateTime: `${evento.fecha_inicio}-05:00`,
            endDateTime: `${evento.fecha_fin}-05:00`,
            idEvento: evento.id_evento
        };

        let result;
        if (action === 'delete') {
            if (!evento.google_event_id) return { status: 'synced' };
            result = await googleCalendarService.deleteEvent(evento.google_event_id);
        } else if (!evento.google_event_id) {
            result = await googleCalendarService.createPersonalEvent(payload);
        } else {
            result = await googleCalendarService.updatePersonalEvent(evento.google_event_id, payload);
            if (result.not_found) {
                result = await googleCalendarService.createPersonalEvent(payload);
            }
        }

        await guardar(result.success ? 'synced' : 'failed', result.success ? null : result.error, result.eventId);
        await registrar(result);
        return { status: result.success ? 'synced' : 'failed', error: result.error };
    } catch (error) {
        const detail = describeGoogleError(error);
        try { await guardar('failed', detail, null); } catch (_) { /* no romper el flujo */ }
        await registrar({ success: false, error: detail });
        return { status: 'failed', error: detail };
    }
};

export const listEventos = async (req, res) => {
    try {
        const { tenantId, userId } = getCtx(req);
        const { fecha_inicio, fecha_fin } = req.query;
        if (!DATE_RE.test(String(fecha_inicio || '')) || !DATE_RE.test(String(fecha_fin || ''))) {
            return res.status(400).json({ success: false, message: 'fecha_inicio y fecha_fin (YYYY-MM-DD) son obligatorias' });
        }

        const result = await query(
            `${SELECT_EVENTO}
             WHERE e.id_tenant = $1
               AND (e.id_creador = $2 OR $2 = ANY(e.compartido_con))
               AND e.fecha_inicio < ($4::date + 1)
               AND e.fecha_fin >= $3::date
             ORDER BY e.fecha_inicio ASC
             LIMIT 1000`,
            [tenantId, userId, fecha_inicio, fecha_fin]
        );

        res.json({ success: true, data: result.rows.map(r => withFlags(r, userId)) });
    } catch (error) {
        console.error('Error listando eventos del calendario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const listUsuariosParaCompartir = async (req, res) => {
    try {
        const { tenantId, userId } = getCtx(req);
        const result = await query(
            `SELECT id_usuario, TRIM(CONCAT(nombre, ' ', apellido)) AS nombre, rol
             FROM vetplus_auth.usuarios
             WHERE id_tenant = $1 AND activo = true AND id_usuario <> $2
             ORDER BY nombre ASC`,
            [tenantId, userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error listando usuarios para compartir:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const fetchEventoVisible = async (id, tenantId, userId) => {
    const result = await query(
        `${SELECT_EVENTO}
         WHERE e.id_evento = $1 AND e.id_tenant = $2
           AND (e.id_creador = $3 OR $3 = ANY(e.compartido_con))`,
        [id, tenantId, userId]
    );
    return result.rows[0] || null;
};

export const createEvento = async (req, res) => {
    try {
        const { tenantId, userId } = getCtx(req);
        const parsed = await parseBody(req.body, tenantId, userId);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const d = parsed.data;

        const inserted = await query(
            `INSERT INTO clinical.calendario_eventos
                (id_tenant, titulo, descripcion, fecha_inicio, fecha_fin, id_creador, compartido_con)
             VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6, $7::uuid[])
             RETURNING id_evento`,
            [tenantId, d.titulo, d.descripcion, d.fechaInicio, d.fechaFin, userId, d.compartidoCon]
        );

        let evento = await fetchEventoVisible(inserted.rows[0].id_evento, tenantId, userId);
        const sync = await syncEventoConGoogle(evento, 'create', userId);
        evento = await fetchEventoVisible(evento.id_evento, tenantId, userId);

        res.status(201).json({ success: true, data: withFlags(evento, userId), google_sync: sync });
    } catch (error) {
        console.error('Error creando evento del calendario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const updateEvento = async (req, res) => {
    try {
        const { tenantId, userId } = getCtx(req);
        const { id } = req.params;
        if (!UUID_RE.test(id)) return res.status(400).json({ success: false, message: 'ID inválido' });

        const actual = await fetchEventoVisible(id, tenantId, userId);
        if (!actual) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
        if (actual.id_creador !== userId) {
            return res.status(403).json({ success: false, message: 'Solo quien creó el evento puede modificarlo' });
        }

        const parsed = await parseBody(req.body, tenantId, userId);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const d = parsed.data;

        await query(
            `UPDATE clinical.calendario_eventos
             SET titulo = $1, descripcion = $2, fecha_inicio = $3::timestamp, fecha_fin = $4::timestamp,
                 compartido_con = $5::uuid[], updated_at = CURRENT_TIMESTAMP
             WHERE id_evento = $6 AND id_tenant = $7`,
            [d.titulo, d.descripcion, d.fechaInicio, d.fechaFin, d.compartidoCon, id, tenantId]
        );

        let evento = await fetchEventoVisible(id, tenantId, userId);
        const sync = await syncEventoConGoogle(evento, 'update', userId);
        evento = await fetchEventoVisible(id, tenantId, userId);

        res.json({ success: true, data: withFlags(evento, userId), google_sync: sync });
    } catch (error) {
        console.error('Error actualizando evento del calendario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const deleteEvento = async (req, res) => {
    try {
        const { tenantId, userId } = getCtx(req);
        const { id } = req.params;
        if (!UUID_RE.test(id)) return res.status(400).json({ success: false, message: 'ID inválido' });

        const actual = await fetchEventoVisible(id, tenantId, userId);
        if (!actual) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
        if (actual.id_creador !== userId) {
            return res.status(403).json({ success: false, message: 'Solo quien creó el evento puede eliminarlo' });
        }

        const sync = await syncEventoConGoogle(actual, 'delete', userId);
        await query('DELETE FROM clinical.calendario_eventos WHERE id_evento = $1 AND id_tenant = $2', [id, tenantId]);

        res.json({ success: true, message: 'Evento eliminado', google_sync: sync });
    } catch (error) {
        console.error('Error eliminando evento del calendario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
