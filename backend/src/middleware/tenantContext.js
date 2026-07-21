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
      message: 'Contexto de clínica no resuelto. El usuario no tiene una clínica asignada.',
      error: 'MISSING_TENANT_CONTEXT'
    });
  }

  try {
    const activeTenantResult = await query(
      'SELECT id_tenant FROM system.tenants WHERE id_tenant = $1 AND estado = $2 LIMIT 1',
      [tenantId, 'active']
    );

    if (activeTenantResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'La clínica está suspendida o inactiva.',
        error: 'TENANT_INACTIVE'
      });
    }

    // Validación opcional de coherencia con X-Tenant-Slug enviado por frontend
    const tenantSlug = req.headers['x-tenant-slug'];
    if (tenantSlug && typeof tenantSlug === 'string') {
      const tenantResult = await query(
        'SELECT id_tenant FROM system.tenants WHERE slug = $1 AND estado = $2 LIMIT 1',
        [tenantSlug, 'active']
      );

      if (tenantResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Clínica inválida o inactiva para este entorno.',
          error: 'INVALID_TENANT_SLUG'
        });
      }

      if (tenantResult.rows[0].id_tenant !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'La clínica del usuario no coincide con la clínica solicitada.',
          error: 'TENANT_MISMATCH'
        });
      }
    }
  } catch (error) {
    console.error('Error validando contexto de tenant:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No fue posible validar el contexto de clínica.',
      error: 'TENANT_VALIDATION_ERROR'
    });
  }

  req.tenantId = tenantId;
  next();
}
