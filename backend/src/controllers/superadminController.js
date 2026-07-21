import bcrypt from 'bcryptjs';
import { pool, query } from '../config/database.js';
import { generateSuperadminToken } from '../middleware/superadminAuth.js';

function splitNombre(nombreCompleto = '') {
  const parts = String(nombreCompleto).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { nombre: 'Super', apellido: 'Admin' };
  }
  if (parts.length === 1) {
    return { nombre: parts[0], apellido: 'Admin' };
  }
  return {
    nombre: parts[0],
    apellido: parts.slice(1).join(' ')
  };
}

function resolveSuperadminDocumento(superadmin) {
  return String(superadmin?.documento || process.env.SUPERADMIN_DOCUMENTO || process.env.SUPERADMIN_DOC || '').trim();
}

async function getCurrentSuperadminById(conn, idSuperadmin) {
  const result = await conn.query(
    `SELECT id_superadmin, nombre, email, documento, password_hash, activo
     FROM system.superadmins
     WHERE id_superadmin = $1`,
    [idSuperadmin]
  );
  return result.rows[0] || null;
}

async function insertTenantAdmin(conn, tenantId, payload) {
  const adminResult = await conn.query(
    `INSERT INTO vetplus_auth.usuarios
       (nombre, apellido, email, documento, tipo_documento, password_hash, rol, activo, id_tenant)
     VALUES ($1, $2, $3, $4, 'CC', $5, 'admin', true, $6)
     RETURNING id_usuario, email, nombre, apellido, documento, rol`,
    [
      payload.nombre.trim(),
      payload.apellido.trim(),
      payload.email.toLowerCase().trim(),
      payload.documento.trim(),
      payload.passwordHash,
      tenantId
    ]
  );
  return adminResult.rows[0];
}

function mapTenantUserUniqueError(error, fallbackEmail, fallbackDocumento) {
  const byEmail = ['idx_usuarios_tenant_email_unique', 'usuarios_email_key'];
  const byDocumento = ['idx_usuarios_tenant_documento_unique', 'usuarios_documento_key'];

  if (error?.code === '23505' && byEmail.includes(error.constraint)) {
    return `El email "${fallbackEmail}" ya existe en esta clínica.`;
  }
  if (error?.code === '23505' && byDocumento.includes(error.constraint)) {
    return `El documento "${fallbackDocumento}" ya existe en esta clínica.`;
  }
  return null;
}

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
      'SELECT id_superadmin, email, documento, nombre, password_hash, activo FROM system.superadmins WHERE email = $1',
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
      superadmin: { id: sa.id_superadmin, email: sa.email, documento: sa.documento, nombre: sa.nombre }
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
        t.periodicidad_pago,
        t.fecha_inicio_suscripcion,
        t.fecha_proximo_pago,
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
  const {
    slug,
    nombre,
    plan = 'standard',
    max_usuarios = 10,
    admin,
    replicar_superadmin_como_admin = true
  } = req.body;

  const shouldReplicate = replicar_superadmin_como_admin !== false;
  const hasManualAdmin = Boolean(
    admin?.email && admin?.password && admin?.nombre && admin?.apellido && admin?.documento
  );

  if (!slug || !nombre) {
    return res.status(400).json({
      message: 'Campos requeridos: slug y nombre.'
    });
  }

  if (!hasManualAdmin && !shouldReplicate) {
    return res.status(400).json({
      message: 'Debes enviar un admin manual o activar replicar_superadmin_como_admin.'
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
    let createdAdmin;
    let adminSource = 'manual';

    if (hasManualAdmin) {
      const passwordHash = await bcrypt.hash(admin.password, 12);
      createdAdmin = await insertTenantAdmin(conn, tenant.id_tenant, {
        nombre: admin.nombre,
        apellido: admin.apellido,
        email: admin.email,
        documento: admin.documento,
        passwordHash
      });
      adminSource = 'manual';
    } else {
      const superadmin = await getCurrentSuperadminById(conn, req.superadmin.id_superadmin);
      if (!superadmin || !superadmin.activo) {
        throw new Error('SUPERADMIN_NOT_AVAILABLE');
      }

      const superadminDocumento = resolveSuperadminDocumento(superadmin);
      if (!superadminDocumento) {
        throw new Error('SUPERADMIN_DOCUMENT_REQUIRED');
      }

      const split = splitNombre(superadmin.nombre);
      createdAdmin = await insertTenantAdmin(conn, tenant.id_tenant, {
        nombre: split.nombre,
        apellido: split.apellido,
        email: superadmin.email,
        documento: superadminDocumento,
        passwordHash: superadmin.password_hash
      });
      adminSource = 'replicated_from_superadmin';
    }

    await conn.query('COMMIT');

    return res.status(201).json({
      message: `Clínica "${nombre}" creada exitosamente.`,
      tenant,
      admin: createdAdmin,
      admin_source: adminSource
    });
  } catch (error) {
    await conn.query('ROLLBACK');
    console.error('Error en createTenant:', error);

    if (error.message === 'SUPERADMIN_NOT_AVAILABLE') {
      return res.status(400).json({ message: 'No se pudo replicar el superadmin activo.' });
    }

    if (error.message === 'SUPERADMIN_DOCUMENT_REQUIRED') {
      return res.status(400).json({ message: 'El superadmin no tiene documento configurado.' });
    }

    if (error.constraint === 'tenants_slug_key') {
      return res.status(409).json({ message: `El slug "${slug}" ya está en uso.` });
    }

    const candidateEmail = hasManualAdmin ? admin.email : req.superadmin.email;
    const candidateDocumento = hasManualAdmin
      ? admin.documento
      : resolveSuperadminDocumento(req.superadmin);
    const uniqueMessage = mapTenantUserUniqueError(error, candidateEmail, candidateDocumento);
    if (uniqueMessage) {
      return res.status(409).json({ message: uniqueMessage });
    }

    return res.status(500).json({ message: 'Error al crear la clínica.' });
  } finally {
    conn.release();
  }
}

/**
 * POST /api/superadmin/tenants/:id/provision-superadmin-admin
 * Crea en el tenant indicado un usuario admin con email/password del superadmin.
 */
export async function provisionSuperadminAsTenantAdmin(req, res) {
  const { id } = req.params;
  const conn = await pool.connect();

  try {
    await conn.query('BEGIN');

    const tenantResult = await conn.query(
      `SELECT id_tenant, nombre, estado
       FROM system.tenants
       WHERE id_tenant = $1`,
      [id]
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) {
      await conn.query('ROLLBACK');
      return res.status(404).json({ message: 'Clínica no encontrada.' });
    }

    const superadmin = await getCurrentSuperadminById(conn, req.superadmin.id_superadmin);
    if (!superadmin || !superadmin.activo) {
      await conn.query('ROLLBACK');
      return res.status(400).json({ message: 'No se pudo obtener el superadmin activo.' });
    }

    const superadminDocumento = resolveSuperadminDocumento(superadmin);
    if (!superadminDocumento) {
      await conn.query('ROLLBACK');
      return res.status(400).json({ message: 'El superadmin no tiene documento configurado.' });
    }

    const existingResult = await conn.query(
      `SELECT id_usuario, email, nombre, apellido, rol
       FROM vetplus_auth.usuarios
       WHERE id_tenant = $1 AND LOWER(email) = LOWER($2)
       LIMIT 1`,
      [tenant.id_tenant, superadmin.email]
    );
    if (existingResult.rows.length) {
      await conn.query('ROLLBACK');
      return res.status(409).json({
        message: 'Ya existe un usuario con el email del superadmin en esta clínica.',
        admin: existingResult.rows[0]
      });
    }

    const split = splitNombre(superadmin.nombre);
    const createdAdmin = await insertTenantAdmin(conn, tenant.id_tenant, {
      nombre: split.nombre,
      apellido: split.apellido,
      email: superadmin.email,
      documento: superadminDocumento,
      passwordHash: superadmin.password_hash
    });

    await conn.query('COMMIT');

    return res.status(201).json({
      message: `Superadmin provisionado como admin en "${tenant.nombre}".`,
      tenant,
      admin: createdAdmin,
      admin_source: 'replicated_from_superadmin'
    });
  } catch (error) {
    await conn.query('ROLLBACK');
    console.error('Error en provisionSuperadminAsTenantAdmin:', error);

    const uniqueMessage = mapTenantUserUniqueError(
      error,
      req.superadmin.email,
      resolveSuperadminDocumento(req.superadmin)
    );
    if (uniqueMessage) {
      return res.status(409).json({ message: uniqueMessage });
    }

    return res.status(500).json({ message: 'Error al provisionar admin de clínica.' });
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
        (SELECT COUNT(*) FROM vetplus_auth.usuarios u WHERE u.id_tenant = t.id_tenant)       AS total_usuarios,
        (SELECT COUNT(*) FROM clinical.clientes c WHERE c.id_tenant = t.id_tenant)            AS total_clientes,
        (SELECT COUNT(*) FROM clinical.mascotas m JOIN clinical.clientes cc ON cc.id_cliente = m.id_cliente WHERE cc.id_tenant = t.id_tenant) AS total_mascotas,
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
  const { nombre, plan, estado, max_usuarios, periodicidad_pago, fecha_inicio_suscripcion, fecha_proximo_pago } = req.body;

  const updates = [];
  const values = [];
  let idx = 1;

  if (nombre)                { updates.push(`nombre = $${idx++}`);                    values.push(nombre.trim()); }
  if (plan)                  { updates.push(`plan = $${idx++}`);                       values.push(plan); }
  if (estado)                { updates.push(`estado = $${idx++}`);                     values.push(estado); }
  if (max_usuarios)          { updates.push(`max_usuarios = $${idx++}`);               values.push(max_usuarios); }
  if (periodicidad_pago)     { updates.push(`periodicidad_pago = $${idx++}`);          values.push(periodicidad_pago); }
  // Permitir null explícito para limpiar fechas
  if (fecha_inicio_suscripcion !== undefined) { updates.push(`fecha_inicio_suscripcion = $${idx++}`); values.push(fecha_inicio_suscripcion || null); }
  if (fecha_proximo_pago      !== undefined) { updates.push(`fecha_proximo_pago = $${idx++}`);       values.push(fecha_proximo_pago || null); }

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
    documento: req.superadmin.documento,
    nombre: req.superadmin.nombre
  });
}

// ─── CAMBIAR CONTRASEÑA ────────────────────────────────────────────────────────
/**
 * PUT /api/superadmin/me/password
 * Body: { password_actual, password_nuevo }
 */
export async function changePassword(req, res) {
  const { password_actual, password_nuevo } = req.body;

  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ message: 'Se requiere la contraseña actual y la nueva.' });
  }

  if (password_nuevo.length < 8) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }

  if (password_actual === password_nuevo) {
    return res.status(400).json({ message: 'La nueva contraseña debe ser diferente a la actual.' });
  }

  try {
    const { query } = await import('../config/database.js');
    const result = await query(
      'SELECT password_hash FROM system.superadmins WHERE id_superadmin = $1',
      [req.superadmin.id_superadmin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Superadmin no encontrado.' });
    }

    const valid = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    const newHash = await bcrypt.hash(password_nuevo, 12);
    await query(
      'UPDATE system.superadmins SET password_hash = $1, updated_at = now() WHERE id_superadmin = $2',
      [newHash, req.superadmin.id_superadmin]
    );

    return res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error en changePassword superadmin:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
