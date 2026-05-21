/**
 * Migración temporal — crea la tabla system.superadmins si no existe.
 * Uso: node src/database/migrations/add-superadmins-table.js
 */
import 'dotenv/config';
import { query } from '../../config/database.js';

const sql = `
  CREATE TABLE IF NOT EXISTS system.superadmins (
      id_superadmin UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      nombre        VARCHAR(100) NOT NULL,
      email         VARCHAR(150) UNIQUE NOT NULL,
      documento     VARCHAR(20)  UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      activo        BOOLEAN      NOT NULL DEFAULT true,
      ultimo_login  TIMESTAMPTZ,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  ALTER TABLE system.superadmins
    ADD COLUMN IF NOT EXISTS documento VARCHAR(20);

  CREATE UNIQUE INDEX IF NOT EXISTS superadmins_documento_unique
    ON system.superadmins(documento)
    WHERE documento IS NOT NULL;

  DROP TRIGGER IF EXISTS update_superadmins_updated_at ON system.superadmins;
  CREATE TRIGGER update_superadmins_updated_at
      BEFORE UPDATE ON system.superadmins
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

try {
  await query(sql);
  console.log('✅  Tabla system.superadmins creada (o ya existía).');
} catch (err) {
  console.error('❌  Error al crear la tabla:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
