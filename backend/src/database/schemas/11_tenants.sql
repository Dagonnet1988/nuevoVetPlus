-- ===========================================
-- VETPLUS MT1 - TABLA system.tenants
-- ===========================================
-- Idempotente: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING
-- Debe ejecutarse ANTES de 12_tenant_columns.sql

-- Tabla principal de tenants (clínicas)
CREATE TABLE IF NOT EXISTS system.tenants (
    id_tenant   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT        UNIQUE NOT NULL,
    nombre      TEXT        NOT NULL,
    plan        VARCHAR(50) NOT NULL DEFAULT 'standard'
                            CHECK (plan IN ('standard', 'pro', 'enterprise')),
    estado      VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (estado IN ('active', 'suspended', 'cancelled')),
    max_usuarios INTEGER     DEFAULT 10,
    configuracion JSONB      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at (DROP + CREATE para idempotencia)
DROP TRIGGER IF EXISTS update_tenants_updated_at ON system.tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON system.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índice explícito en estado para filtros de tenants activos
CREATE INDEX IF NOT EXISTS idx_tenants_estado ON system.tenants(estado);

-- Tenant por defecto: destino del backfill de todos los datos existentes.
-- ON CONFLICT DO NOTHING garantiza idempotencia en re-ejecuciones.
INSERT INTO system.tenants (slug, nombre, plan, estado)
VALUES ('default', 'VetPlus - Clínica Principal', 'standard', 'active')
ON CONFLICT (slug) DO NOTHING;
