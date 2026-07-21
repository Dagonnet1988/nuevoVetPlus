/**
 * Migración: cambia la PK de versiones_consentimiento de (id_version) a (id_version, id_tenant)
 * Esto permite que cada clínica tenga su propia numeración independiente.
 * Uso: node src/database/migrations/fix-versiones-consentimiento-pk.js
 */
import 'dotenv/config';
import { query, pool } from '../../config/database.js';

try {
  // 1. Eliminar FK en consentimientos que depende de la PK actual
  await query(`
    ALTER TABLE clinical.consentimientos DROP CONSTRAINT IF EXISTS consentimientos_id_version_fkey
  `);

  // 2. Eliminar la clave primaria actual
  await query(`
    ALTER TABLE clinical.versiones_consentimiento DROP CONSTRAINT versiones_consentimiento_pkey
  `);

  // 3. Crear nueva PK compuesta (id_version, id_tenant)
  await query(`
    ALTER TABLE clinical.versiones_consentimiento
      ADD CONSTRAINT versiones_consentimiento_pkey PRIMARY KEY (id_version, id_tenant)
  `);

  // 4. Volver a crear la FK en consentimientos apuntando a la nueva PK compuesta
  //    (necesita que consentimientos.id_tenant exista, que ya existe)
  await query(`
    ALTER TABLE clinical.consentimientos
      ADD CONSTRAINT consentimientos_id_version_fkey
      FOREIGN KEY (id_version, id_tenant)
      REFERENCES clinical.versiones_consentimiento(id_version, id_tenant)
      ON DELETE RESTRICT
  `);

  console.log('✅  PK actualizada a (id_version, id_tenant).');
} catch (err) {
  console.error('❌  Error en la migración:', err.message);
  process.exit(1);
} finally {
  await pool.end();
  process.exit(0);
}
