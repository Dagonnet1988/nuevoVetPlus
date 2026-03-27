import { query } from '../config/database.js';

/**
 * Middleware MT2 — Contexto de tenant
 *
 * Extrae tenant_id de req.user (puesto por authenticateToken) y lo expone
 * como req.tenantId para que los controllers puedan filtrar por clínica.
 *
 * Debe montarse DESPUÉS de authenticateToken en todas las rutas clínicas.
 * Las rutas públicas (consentimiento por token) no usan este middleware;
 * en ellas el tenant se resuelve desde el propio consentimiento en la BD.
 */
export async function tenantContext(req, res, next) {
  const tenantId = req.user?.tenant_id;

  if (!tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Contexto de clínica no resuelto. El usuario no tiene tenant asignado.',
      error: 'MISSING_TENANT_CONTEXT'
    });
  }

  // Validación opcional de coherencia con X-Tenant-Slug enviado por frontend
  const tenantSlug = req.headers['x-tenant-slug'];
  if (tenantSlug && typeof tenantSlug === 'string') {
    try {
      const tenantResult = await query(
        'SELECT id_tenant FROM system.tenants WHERE slug = $1 AND estado = $2 LIMIT 1',
        [tenantSlug, 'active']
      );

      if (tenantResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Tenant inválido o inactivo para este entorno.',
          error: 'INVALID_TENANT_SLUG'
        });
      }

      if (tenantResult.rows[0].id_tenant !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'El tenant del usuario no coincide con el tenant solicitado.',
          error: 'TENANT_MISMATCH'
        });
      }
    } catch (error) {
      console.error('Error validando X-Tenant-Slug:', error.message);
      return res.status(500).json({
        success: false,
        message: 'No fue posible validar el contexto de tenant.',
        error: 'TENANT_VALIDATION_ERROR'
      });
    }
  }

  req.tenantId = tenantId;
  next();
}
