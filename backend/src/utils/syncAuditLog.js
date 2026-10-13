import { query } from '../config/database.js';

/**
 * Historial persistente de sincronización Ramelo <-> Google Calendar.
 * Nunca debe romper la sincronización: si falla el registro, solo se advierte.
 */
let warnedMissingTable = false;

export const logSyncEvents = async (entries = []) => {
  const valid = entries.filter(Boolean);
  if (valid.length === 0) return;

  try {
    for (const e of valid) {
      await query(
        `INSERT INTO system.sync_audit_log (
           id_tenant, direccion, origen, accion, exito, id_cita, codigo_cita,
           google_event_id, titulo, motivo, error_mensaje, detalle, id_usuario
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
        [
          e.tenantId || null,
          e.direccion,
          e.origen || 'automatica',
          e.accion,
          e.exito !== false,
          e.idCita || null,
          e.codigoCita || null,
          e.googleEventId ? String(e.googleEventId).slice(0, 255) : null,
          e.titulo ? String(e.titulo).slice(0, 300) : null,
          e.motivo ? String(e.motivo).slice(0, 100) : null,
          e.error ? String(e.error).slice(0, 2000) : null,
          e.detalle ? JSON.stringify(e.detalle) : null,
          e.idUsuario || null
        ]
      );
    }
  } catch (error) {
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.warn('⚠️ No se pudo registrar sync_audit_log (¿falta crear la tabla?):', error.message);
    }
  }
};

/**
 * Convierte el error de googleapis (GaxiosError) en un mensaje útil en español.
 * "Bad Request" solo no dice nada: se incluye código HTTP, motivo y texto de Google.
 */
export const describeGoogleError = (error) => {
  if (!error) return 'Error desconocido';
  const status = error.status || error.code || error.response?.status;
  const data = error.response?.data;
  const apiError = data?.error;
  const reason = apiError?.errors?.[0]?.reason || (typeof apiError === 'string' ? apiError : null);
  const apiMessage = apiError?.message || data?.error_description || null;
  const base = error.message || 'Error de Google';

  let hint = '';
  if (reason === 'invalid_grant' || /invalid_grant/i.test(base)) {
    hint = ' — La conexión con Google venció o fue revocada: reconectar en Configuración.';
  } else if (status === 404 || status === 410) {
    hint = ' — El evento ya no existe en Google Calendar.';
  } else if (status === 403) {
    hint = ' — Sin permisos o límite de Google alcanzado.';
  } else if (status === 401) {
    hint = ' — Autenticación con Google inválida.';
  } else if (status === 400) {
    hint = ' — Google rechazó los datos enviados (revisar fechas, ID del evento o campos).';
  }

  const parts = [`Google${status ? ` ${status}` : ''}`];
  if (reason) parts.push(`(${reason})`);
  const detail = apiMessage && apiMessage !== base ? `${base}: ${apiMessage}` : base;
  return `${parts.join(' ')}: ${detail}${hint}`;
};
