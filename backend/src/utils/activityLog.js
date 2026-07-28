import { query } from '../config/database.js';

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
        req.user?.id_usuario || req.user?.id || null,
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
