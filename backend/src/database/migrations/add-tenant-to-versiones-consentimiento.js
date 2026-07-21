/**
 * Migración: agrega id_tenant a clinical.versiones_consentimiento
 * para que cada clínica pueda tener su propio texto de consentimiento.
 * Uso: node src/database/migrations/add-tenant-to-versiones-consentimiento.js
 */
import 'dotenv/config';
import { query, pool } from '../../config/database.js';

try {
  // 1. Obtener el tenant por defecto para asignarlo a las versiones existentes
  const tenantResult = await query(
    `SELECT id_tenant FROM system.tenants ORDER BY created_at LIMIT 1`
  );
  const defaultTenant = tenantResult.rows[0]?.id_tenant ?? null;

  // 2. Agregar columna id_tenant si no existe
  await query(`
    ALTER TABLE clinical.versiones_consentimiento
      ADD COLUMN IF NOT EXISTS id_tenant UUID
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT
  `);

  // 3. Asignar tenant por defecto a las filas existentes
  if (defaultTenant) {
    await query(
      `UPDATE clinical.versiones_consentimiento SET id_tenant = $1 WHERE id_tenant IS NULL`,
      [defaultTenant]
    );
  }

  // 4. Una vez relleno, marcar como NOT NULL
  await query(`
    ALTER TABLE clinical.versiones_consentimiento
      ALTER COLUMN id_tenant SET NOT NULL
  `);

  // 5. Índice para búsquedas por tenant
  await query(`
    CREATE INDEX IF NOT EXISTS idx_versiones_consentimiento_tenant
      ON clinical.versiones_consentimiento(id_tenant)
  `);

  // 6. Eliminar unique index global (solo 1 activa total) y reemplazar por uno por tenant
  await query(`DROP INDEX IF EXISTS clinical.idx_version_consentimiento_activa`);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_version_consentimiento_activa_tenant
      ON clinical.versiones_consentimiento(id_tenant)
      WHERE activa = true
  `);

  console.log('✅  Migración completada: id_tenant agregado a versiones_consentimiento.');
  console.log(`    Filas existentes asignadas al tenant: ${defaultTenant ?? '(ninguno disponible)'}`);
} catch (err) {
  console.error('❌  Error en la migración:', err.message);
  process.exit(1);
} finally {
  await pool.end();
  process.exit(0);
}
