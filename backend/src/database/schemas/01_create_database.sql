-- ===========================================
-- VETPLUS - CREACIÓN DE BASE DE DATOS
-- ===========================================

-- Crear base de datos VetPlus (ejecutar como superuser)
-- CREATE DATABASE vetplus;
-- \c vetplus;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar timezone
SET timezone = 'America/Bogota';

-- Crear esquemas para organizar las tablas
CREATE SCHEMA IF NOT EXISTS vetplus_auth;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS system;

-- Comentarios de esquemas
COMMENT ON SCHEMA vetplus_auth IS 'Autenticación, usuarios y auditoría';
COMMENT ON SCHEMA clinical IS 'Módulo clínico: clientes, mascotas, consultas';
COMMENT ON SCHEMA system IS 'Configuración del sistema y migraciones';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para generar códigos únicos
CREATE OR REPLACE FUNCTION generate_unique_code(prefix TEXT, length INT DEFAULT 8)
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, length, '0');
END;
$$ language 'plpgsql';

-- ===========================================
-- MULTI-TENANCY: tabla de tenants
-- Debe crearse AQUÍ para que 02_auth_tables y 03_clinical_tables
-- puedan referenciarla directamente en sus CREATE TABLE.
-- ===========================================
CREATE TABLE IF NOT EXISTS system.tenants (
    id_tenant     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug          TEXT        UNIQUE NOT NULL,
    nombre        TEXT        NOT NULL,
    plan          VARCHAR(50) NOT NULL DEFAULT 'standard'
                              CHECK (plan IN ('standard', 'pro', 'enterprise')),
    estado        VARCHAR(20) NOT NULL DEFAULT 'active'
                              CHECK (estado IN ('active', 'suspended', 'cancelled')),
    max_usuarios           INTEGER     DEFAULT 10,
    periodicidad_pago      VARCHAR(20) DEFAULT 'monthly'
                                       CHECK (periodicidad_pago IN ('monthly','quarterly','semiannual','annual')),
    fecha_inicio_suscripcion DATE,
    fecha_proximo_pago       DATE,
    configuracion          JSONB       NOT NULL DEFAULT '{}',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_tenants_updated_at ON system.tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON system.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tenants_estado ON system.tenants(estado);

-- No crear tenants automáticamente en instalaciones limpias.
-- El primer tenant debe crearlo explícitamente el superadmin.

-- Función helper: devuelve el UUID del tenant por defecto.
-- Retorna NULL si no existe ningún tenant (instalación limpia).
-- Se usa como DEFAULT en todas las columnas id_tenant de las tablas core,
-- eliminando la necesidad de pasarlo explícitamente al insertar.
CREATE OR REPLACE FUNCTION system.get_default_tenant()
RETURNS UUID AS $$
    SELECT id_tenant FROM system.tenants WHERE slug = 'default' LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ===========================================
-- SUPERADMINS (operadores de plataforma)
-- NO tienen id_tenant — son inter-clínica.
-- Tabla separada de vetplus_auth.usuarios para
-- mantener aislada la capa de plataforma.
-- ===========================================
CREATE TABLE IF NOT EXISTS system.superadmins (
    id_superadmin UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    documento     VARCHAR(20)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo        BOOLEAN      NOT NULL DEFAULT true,
    ultimo_login  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_superadmins_updated_at ON system.superadmins;
CREATE TRIGGER update_superadmins_updated_at
    BEFORE UPDATE ON system.superadmins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
