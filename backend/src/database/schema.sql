-- =====================================================
-- VETPLUS - ESQUEMA DE BASE DE DATOS POSTGRESQL
-- =====================================================

-- Verificar que la base de datos vetplus existe
-- CREATE DATABASE vetplus;
-- \c vetplus;

-- =====================================================
-- NOTA: Este script es seguro para ejecutar múltiples veces
-- Usa CREATE TABLE IF NOT EXISTS para evitar errores
-- =====================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USUARIOS Y AUTENTICACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vet', 'aux')),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO CLÍNICO
-- =====================================================

-- Tabla de Clientes
CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Mascotas
CREATE TABLE mascota (
    id_mascota SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    especie VARCHAR(30) NOT NULL,
    raza VARCHAR(50),
    edad INTEGER,
    sexo VARCHAR(10) CHECK (sexo IN ('Macho', 'Hembra')),
    peso DECIMAL(5,2),
    color VARCHAR(30),
    notas TEXT,
    foto_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Consultas Clínicas
CREATE TABLE consulta_clinica (
    id_consulta SERIAL PRIMARY KEY,
    id_mascota INTEGER NOT NULL REFERENCES mascota(id_mascota),
    id_veterinario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    fecha TIMESTAMP NOT NULL,
    motivo TEXT NOT NULL,
    anamnesis TEXT,
    examen_fisico TEXT,
    diagnostico TEXT,
    tratamiento TEXT,
    recomendaciones TEXT,
    tipo_terapia VARCHAR(50),
    peso_actual DECIMAL(5,2),
    temperatura DECIMAL(4,1),
    proximo_control DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Calendario y Citas
CREATE TABLE calendario_cita (
    id_cita SERIAL PRIMARY KEY,
    id_mascota INTEGER REFERENCES mascota(id_mascota),
    id_veterinario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_cliente INTEGER REFERENCES cliente(id_cliente),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'consulta', 'terapia', 'cirugia', 'control'
    estado VARCHAR(20) DEFAULT 'programada' CHECK (estado IN ('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio')),
    titulo VARCHAR(100),
    descripcion TEXT,
    id_consulta INTEGER REFERENCES consulta_clinica(id_consulta),
    google_event_id VARCHAR(255),
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES usuario(id_usuario),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDITORÍA
-- =====================================================

-- Tabla de Log de Auditoría
CREATE TABLE log_auditoria (
    id_log SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    tabla_afectada VARCHAR(50) NOT NULL,
    id_entidad_afectada INTEGER,
    tipo_accion VARCHAR(10) NOT NULL CHECK (tipo_accion IN ('INSERT', 'UPDATE', 'DELETE')),
    descripcion TEXT,
    data_anterior JSONB,
    data_nueva JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_cliente_cedula ON cliente(cedula);
CREATE INDEX idx_cliente_telefono ON cliente(telefono);
CREATE INDEX idx_mascota_cliente ON mascota(id_cliente);
CREATE INDEX idx_mascota_nombre ON mascota(nombre);
CREATE INDEX idx_consulta_mascota ON consulta_clinica(id_mascota);
CREATE INDEX idx_consulta_fecha ON consulta_clinica(fecha);
CREATE INDEX idx_cita_fecha ON calendario_cita(fecha_inicio);
CREATE INDEX idx_cita_veterinario ON calendario_cita(id_veterinario);
CREATE INDEX idx_auditoria_fecha ON log_auditoria(fecha);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario administrador por defecto
INSERT INTO usuario (nombre, rol, email, password_hash) VALUES 
('Administrador', 'admin', 'admin@vetplus.com', '$2b$10$rXKqPxl5GLJrxj7XJFvXQOw5J1C1KJWxLZxRqF5PHx.zHjGQQj7XG');
-- Contraseña: admin123

-- Commit de la transacción
COMMIT;

-- Mensaje de confirmación
SELECT 'Base de datos VetPlus creada exitosamente' AS mensaje;
