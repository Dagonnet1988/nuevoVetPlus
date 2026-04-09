/**
 * Script para crear el primer superadmin de la plataforma VetPlus.
 *
 * Uso:
 *   node src/database/seeds/create-superadmin.js
 *
 * Variables de entorno necesarias (o en .env):
 *   SUPERADMIN_EMAIL    — email del superadmin
 *   SUPERADMIN_PASSWORD — contraseña (mínimo 8 caracteres)
 *   SUPERADMIN_NOMBRE   — nombre (default: "Super Admin")
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';

const email    = process.env.SUPERADMIN_EMAIL    || 'admin@vetplus.com';
const password = process.env.SUPERADMIN_PASSWORD || null;
const nombre   = process.env.SUPERADMIN_NOMBRE   || 'Super Admin';

if (!password) {
  console.error('❌  Define SUPERADMIN_PASSWORD en el entorno o en .env');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌  La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

try {
  const existing = await query(
    'SELECT id_superadmin FROM system.superadmins WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    console.warn(`⚠️  Ya existe un superadmin con el email "${email}". No se creó ningún registro.`);
    process.exit(0);
  }

  const result = await query(
    `INSERT INTO system.superadmins (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id_superadmin, nombre, email, created_at`,
    [nombre, email, passwordHash]
  );

  const sa = result.rows[0];
  console.log(`✅  Superadmin creado:
  id:    ${sa.id_superadmin}
  email: ${sa.email}
  nombre: ${sa.nombre}
  creado: ${sa.created_at}`);
} catch (err) {
  console.error('❌  Error al crear superadmin:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
