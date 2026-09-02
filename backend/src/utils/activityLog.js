import { query } from '../config/database.js';

/**
 * IDs de usuario que no se registran en activity_log/session_audit — cuentas
 * de desarrollo/pruebas internas, para no ensuciar la auditoría real con
 * actividad que no es de la clínica. Configurable sin tocar código:
 *   AUDIT_EXCLUDED_USER_IDS=uuid1,uuid2
 */
const EXCLUDED_USER_IDS = new Set(
  String(process.env.AUDIT_EXCLUDED_USER_IDS || '')
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)
);

export const isAuditExcluded = (userId) => {
  if (!userId) return false;
  return EXCLUDED_USER_IDS.has(String(userId).toLowerCase());
};

/**
 * Registro de auditoría genérico para acciones que cambian datos clínicos
 * (pacientes, propietarios, citas). Nunca debe romper la operación principal:
 * si falla el log, solo se advierte por consola.
 *
 * @param {object} params
 * @param {import('express').Request} params.req
 * @param {string} params.type - tipo_actividad (ej. 'PATIENT_MANAGEMENT', 'APPOINTMENT_MANAGEMENT')
 * @param {string} params.description - descripción legible de qué pasó
 * @param {string} [params.entityId] - id de la entidad afectada (mascota, cita, etc.)
 * @param {object} [params.payload] - detalle estructurado (antes/después, acción, etc.)
 */
export const logActivity = async ({ req, type, description, entityId, payload }) => {
  const userId = req.user?.id_usuario || req.user?.id || null;
  if (isAuditExcluded(userId)) return;

  try {
    await query(
      `INSERT INTO system.activity_log (
         id_log,
         id_usuario,
         tipo_actividad,
         descripcion,
         url,
         metodo_http,
         status_code,
         duracion_ms,
         ip_address,
         user_agent,
         request_data,
         response_data,
         id_tenant,
         id_entidad_afectada
       ) VALUES (
         uuid_generate_v4(),
         $1, $2, $3, $4, $5, 200, 0, $6, $7, $8, $9, $10, $11
       )`,
      [
        userId,
        type,
        description,
        req.originalUrl || req.url || null,
        req.method || 'SYSTEM',
        req.ip || null,
        req.get?.('user-agent') || null,
        JSON.stringify(payload || {}),
        null,
        req.tenantId ?? req.user?.tenant_id ?? null,
        entityId || null
      ]
    );
  } catch (error) {
    console.warn(`⚠️ No se pudo registrar activity_log (${type}):`, error.message);
  }
};
