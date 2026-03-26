-- ===========================================
-- VETPLUS MT1 - COLUMNA id_tenant EN TABLAS CORE
-- ===========================================
-- Idempotente: ADD COLUMN IF NOT EXISTS + UPDATE ... WHERE IS NULL
-- Depende de: 11_tenants.sql (system.tenants debe existir con tenant 'default')

-- UUID del tenant por defecto (insertado en 11_tenants.sql)
-- Se obtiene dinámicamente para evitar hardcodear el UUID.
DO $$
DECLARE
  v_default_tenant UUID;
BEGIN
  SELECT id_tenant INTO v_default_tenant
  FROM system.tenants WHERE slug = 'default';

  IF v_default_tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant por defecto no encontrado. Ejecutar 11_tenants.sql primero.';
  END IF;

  -- -------------------------------------------------------
  -- vetplus_auth.usuarios
  -- -------------------------------------------------------
  ALTER TABLE vetplus_auth.usuarios
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE vetplus_auth.usuarios
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE vetplus_auth.usuarios
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- clinical.clientes
  -- -------------------------------------------------------
  ALTER TABLE clinical.clientes
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE clinical.clientes
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE clinical.clientes
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- clinical.mascotas
  -- -------------------------------------------------------
  ALTER TABLE clinical.mascotas
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE clinical.mascotas
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE clinical.mascotas
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- clinical.consultas_clinicas
  -- -------------------------------------------------------
  ALTER TABLE clinical.consultas_clinicas
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE clinical.consultas_clinicas
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE clinical.consultas_clinicas
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- clinical.calendario_citas
  -- -------------------------------------------------------
  ALTER TABLE clinical.calendario_citas
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE clinical.calendario_citas
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE clinical.calendario_citas
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- clinical.consentimientos
  -- -------------------------------------------------------
  ALTER TABLE clinical.consentimientos
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE clinical.consentimientos
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE clinical.consentimientos
    ALTER COLUMN id_tenant SET NOT NULL;

  -- -------------------------------------------------------
  -- system.configuracion_empresa
  -- -------------------------------------------------------
  ALTER TABLE system.configuracion_empresa
    ADD COLUMN IF NOT EXISTS id_tenant UUID
    REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT;

  UPDATE system.configuracion_empresa
  SET id_tenant = v_default_tenant
  WHERE id_tenant IS NULL;

  ALTER TABLE system.configuracion_empresa
    ALTER COLUMN id_tenant SET NOT NULL;

END $$;

-- -------------------------------------------------------
-- Índices compuestos por tenant_id (rendimiento multi-tenant)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant        ON vetplus_auth.usuarios(id_tenant);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant        ON clinical.clientes(id_tenant);
CREATE INDEX IF NOT EXISTS idx_mascotas_tenant        ON clinical.mascotas(id_tenant);
CREATE INDEX IF NOT EXISTS idx_consultas_tenant       ON clinical.consultas_clinicas(id_tenant);
CREATE INDEX IF NOT EXISTS idx_citas_tenant           ON clinical.calendario_citas(id_tenant);
CREATE INDEX IF NOT EXISTS idx_consentimientos_tenant ON clinical.consentimientos(id_tenant);
CREATE INDEX IF NOT EXISTS idx_empresa_tenant         ON system.configuracion_empresa(id_tenant);
