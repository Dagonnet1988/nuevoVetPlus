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
