import bcrypt from 'bcryptjs';
import { pool, query } from '../config/database.js';
import { generateSuperadminToken } from '../middleware/superadminAuth.js';

// ─── LOGIN ────────────────────────────────────────────────────────────────────

/**
 * POST /api/superadmin/auth/login
 * Body: { email, password }
 */
export async function superadminLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
  }

  try {
    const result = await query(
      'SELECT id_superadmin, email, nombre, password_hash, activo FROM system.superadmins WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const sa = result.rows[0];
    if (!sa || !sa.activo) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const valid = await bcrypt.compare(password, sa.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    await query(
      'UPDATE system.superadmins SET ultimo_login = now() WHERE id_superadmin = $1',
      [sa.id_superadmin]
    );

    const token = generateSuperadminToken(sa);

    return res.json({
      token,
      superadmin: { id: sa.id_superadmin, email: sa.email, nombre: sa.nombre }
    });
  } catch (error) {
    console.error('Error en superadminLogin:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// ─── TENANTS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/superadmin/tenants
 * Lista todas las clínicas con estadísticas básicas.
 */
export async function listTenants(req, res) {
  try {
    const result = await query(`
      SELECT
        t.id_tenant,
        t.slug,
        t.nombre,
        t.plan,
        t.estado,
        t.max_usuarios,
        t.created_at,
        (SELECT COUNT(*) FROM vetplus_auth.usuarios u WHERE u.id_tenant = t.id_tenant AND u.activo = true)  AS total_usuarios,
        (SELECT COUNT(*) FROM clinical.clientes   c WHERE c.id_tenant = t.id_tenant AND c.activo = true)    AS total_clientes,
        (SELECT COUNT(*) FROM clinical.mascotas   m
           JOIN clinical.clientes cc ON cc.id_cliente = m.id_cliente
           WHERE cc.id_tenant = t.id_tenant AND m.activo = true)                                             AS total_mascotas,
        (SELECT COUNT(*) FROM clinical.calendario_citas ci WHERE ci.id_tenant = t.id_tenant)               AS total_citas,
        (SELECT MAX(u.ultimo_login) FROM vetplus_auth.usuarios u WHERE u.id_tenant = t.id_tenant)            AS ultimo_acceso
      FROM system.tenants t
      ORDER BY t.created_at ASC
    `);

    return res.json({ data: result.rows });
  } catch (error) {
    console.error('Error en listTenants:', error);
    return res.status(500).json({ message: 'Error al listar clínicas.' });
  }
}

/**
 * POST /api/superadmin/tenants
 * Crea una nueva clínica + su usuario admin inicial en una transacción.
 * Body: { slug, nombre, plan, max_usuarios, admin: { nombre, apellido, email, password, documento } }
 */
export async function createTenant(req, res) {
  const { slug, nombre, plan = 'standard', max_usuarios = 10, admin } = req.body;

  if (!slug || !nombre || !admin?.email || !admin?.password || !admin?.nombre || !admin?.apellido || !admin?.documento) {
    return res.status(400).json({
      message: 'Campos requeridos: slug, nombre, plan, admin.nombre, admin.apellido, admin.email, admin.password, admin.documento'
    });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ message: 'El slug solo puede contener letras minúsculas, números y guiones.' });
  }

  if (!['standard', 'pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ message: 'Plan inválido. Opciones: standard, pro, enterprise.' });
  }

  const conn = await pool.connect();

  try {
    await conn.query('BEGIN');

    // 1. Crear tenant
    const tenantResult = await conn.query(
      `INSERT INTO system.tenants (slug, nombre, plan, estado, max_usuarios)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id_tenant, slug, nombre, plan, estado, created_at`,
      [slug.trim(), nombre.trim(), plan, max_usuarios]
    );
    const tenant = tenantResult.rows[0];

    // 2. Crear usuario admin de la clínica
    const passwordHash = await bcrypt.hash(admin.password, 12);
    const adminResult = await conn.query(
      `INSERT INTO vetplus_auth.usuarios
         (nombre, apellido, email, documento, tipo_documento, password_hash, rol, activo, id_tenant)
       VALUES ($1, $2, $3, $4, 'CC', $5, 'admin', true, $6)
       RETURNING id_usuario, email, nombre, rol`,
      [
        admin.nombre.trim(),
        admin.apellido.trim(),
        admin.email.toLowerCase().trim(),
        admin.documento.trim(),
        passwordHash,
        tenant.id_tenant
      ]
    );

    await conn.query('COMMIT');

    return res.status(201).json({
      message: `Clínica "${nombre}" creada exitosamente.`,
      tenant,
      admin: adminResult.rows[0]
    });
  } catch (error) {
    await conn.query('ROLLBACK');
    console.error('Error en createTenant:', error);
    if (error.constraint === 'tenants_slug_key') {
      return res.status(409).json({ message: `El slug "${slug}" ya está en uso.` });
    }
    if (error.constraint === 'usuarios_email_key') {
      return res.status(409).json({ message: `El email "${admin.email}" ya está registrado.` });
    }
    if (error.constraint === 'usuarios_documento_key') {
      return res.status(409).json({ message: `El documento "${admin.documento}" ya está registrado.` });
    }
    return res.status(500).json({ message: 'Error al crear la clínica.' });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/superadmin/tenants/:id
 * Detalle de una clínica.
 */
export async function getTenant(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM vetplus_auth.usuarios u WHERE u.id_tenant = t.id_tenant) AS total_usuarios,
        (SELECT COUNT(*) FROM clinical.clientes c WHERE c.id_tenant = t.id_tenant)     AS total_clientes,
        (SELECT COUNT(*) FROM clinical.calendario_citas ci WHERE ci.id_tenant = t.id_tenant) AS total_citas
       FROM system.tenants t
       WHERE t.id_tenant = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Clínica no encontrada.' });
    }

    // Usuarios de la clínica
    const usuariosResult = await query(
      `SELECT id_usuario, nombre, apellido, email, rol, activo, ultimo_login, created_at
       FROM vetplus_auth.usuarios
       WHERE id_tenant = $1
       ORDER BY rol, nombre`,
      [id]
    );

    return res.json({
      tenant: result.rows[0],
      usuarios: usuariosResult.rows
    });
  } catch (error) {
    console.error('Error en getTenant:', error);
    return res.status(500).json({ message: 'Error al obtener la clínica.' });
  }
}

/**
 * PATCH /api/superadmin/tenants/:id
 * Actualiza datos o estado de una clínica.
 * Body: { nombre?, plan?, estado?, max_usuarios? }
 */
export async function updateTenant(req, res) {
  const { id } = req.params;
  const { nombre, plan, estado, max_usuarios } = req.body;

  const updates = [];
  const values = [];
  let idx = 1;

  if (nombre)       { updates.push(`nombre = $${idx++}`);       values.push(nombre.trim()); }
  if (plan)         { updates.push(`plan = $${idx++}`);          values.push(plan); }
  if (estado)       { updates.push(`estado = $${idx++}`);        values.push(estado); }
  if (max_usuarios) { updates.push(`max_usuarios = $${idx++}`);  values.push(max_usuarios); }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No hay campos para actualizar.' });
  }

  values.push(id);

  try {
    const result = await query(
      `UPDATE system.tenants SET ${updates.join(', ')} WHERE id_tenant = $${idx} RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Clínica no encontrada.' });
    }

    return res.json({ message: 'Clínica actualizada.', tenant: result.rows[0] });
  } catch (error) {
    console.error('Error en updateTenant:', error);
    return res.status(500).json({ message: 'Error al actualizar la clínica.' });
  }
}

// ─── SUPERADMIN PROFILE ───────────────────────────────────────────────────────

/**
 * GET /api/superadmin/me
 */
export async function getSuperadminProfile(req, res) {
  return res.json({
    id: req.superadmin.id_superadmin,
    email: req.superadmin.email,
    nombre: req.superadmin.nombre
  });
}
