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
export function tenantContext(req, res, next) {
  const tenantId = req.user?.tenant_id;

  if (!tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Contexto de clínica no resuelto. El usuario no tiene tenant asignado.',
      error: 'MISSING_TENANT_CONTEXT'
    });
  }

  req.tenantId = tenantId;
  next();
}
