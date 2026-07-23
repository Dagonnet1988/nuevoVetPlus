import { query } from '../config/database.js';

function toAbsoluteAssetUrl(req, assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const clean = String(assetPath).startsWith('/') ? assetPath : `/${assetPath}`;
  return `${base}${clean}`;
}

export async function listPublicTenants(req, res) {
  try {
    const result = await query(
      `SELECT
         t.slug,
         COALESCE(ce.nombre_empresa, t.nombre) AS nombre_publico,
         ce.logo_url
       FROM system.tenants t
       LEFT JOIN LATERAL (
         SELECT nombre_empresa, logo_url
         FROM system.configuracion_empresa ce
         WHERE ce.id_tenant = t.id_tenant
           AND ce.activa = true
         ORDER BY ce.updated_at DESC NULLS LAST, ce.created_at DESC
         LIMIT 1
       ) ce ON true
       WHERE t.estado = 'active'
       ORDER BY COALESCE(ce.nombre_empresa, t.nombre) ASC`
    );

    const tenants = result.rows.map((row) => ({
      slug: row.slug,
      nombre: row.nombre_publico,
      logo_url: toAbsoluteAssetUrl(req, row.logo_url),
      has_logo: Boolean(row.logo_url)
    }));

    return res.json({
      success: true,
      data: {
        total: tenants.length,
        tenants
      }
    });
  } catch (error) {
    console.error('Error listando tenants públicos:', error);
    return res.status(500).json({
      success: false,
      message: 'No fue posible cargar el directorio de clínicas'
    });
  }
}
