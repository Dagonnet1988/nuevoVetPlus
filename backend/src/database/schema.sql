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
-- MÓDULO FINANCIERO
-- =====================================================

-- Tabla de Cajas
CREATE TABLE caja (
    id_caja SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL DEFAULT 'personalizada' CHECK (tipo IN ('caja_menor', 'cuenta_bancaria', 'caja_fuerte', 'personalizada')),
    descripcion TEXT,
    saldo_inicial DECIMAL(12,2) DEFAULT 0,
    saldo_actual DECIMAL(12,2) DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Proveedores
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nit VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    contacto_principal VARCHAR(100),
    terminos_pago VARCHAR(50) DEFAULT 'contado',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('inventariable', 'servicio', 'terapia_individual', 'terapia_paquete')),
    categoria VARCHAR(50),
    marca VARCHAR(50),
    descripcion TEXT,
    precio_compra DECIMAL(10,2),
    precio_venta DECIMAL(10,2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    unidad_medida VARCHAR(20) DEFAULT 'unidad',
    inventariable BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Órdenes de Compra
CREATE TABLE orden_compra (
    id_orden SERIAL PRIMARY KEY,
    numero_orden VARCHAR(20) UNIQUE NOT NULL,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id_proveedor),
    fecha DATE NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    tipo_pago VARCHAR(20) NOT NULL DEFAULT 'contado' CHECK (tipo_pago IN ('contado', 'credito')),
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'recibida', 'cancelada')),
    observaciones TEXT,
    created_by INTEGER NOT NULL REFERENCES usuario(id_usuario),
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Líneas de Orden de Compra
CREATE TABLE linea_orden_compra (
    id_linea SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES orden_compra(id_orden) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    cantidad_recibida INTEGER DEFAULT 0 CHECK (cantidad_recibida >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Ingresos
CREATE TABLE ingreso (
    id_ingreso SERIAL PRIMARY KEY,
    id_caja INTEGER NOT NULL REFERENCES caja(id_caja),
    descripcion VARCHAR(200) NOT NULL,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(50) DEFAULT 'venta',
    fecha DATE NOT NULL,
    referencia VARCHAR(100),
    id_factura INTEGER, -- se relacionará con factura_venta
    observaciones TEXT,
    created_by INTEGER NOT NULL REFERENCES usuario(id_usuario),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Egresos
CREATE TABLE egreso (
    id_egreso SERIAL PRIMARY KEY,
    id_caja INTEGER NOT NULL REFERENCES caja(id_caja),
    descripcion VARCHAR(200) NOT NULL,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    referencia VARCHAR(100),
    id_orden_compra INTEGER REFERENCES orden_compra(id_orden),
    observaciones TEXT,
    created_by INTEGER NOT NULL REFERENCES usuario(id_usuario),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Facturas de Venta
CREATE TABLE factura_venta (
    id_factura SERIAL PRIMARY KEY,
    numero_factura VARCHAR(20) UNIQUE NOT NULL,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente),
    id_caja INTEGER NOT NULL REFERENCES caja(id_caja),
    fecha DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) DEFAULT 0,
    impuestos DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    metodo_pago VARCHAR(30) DEFAULT 'efectivo',
    estado VARCHAR(20) DEFAULT 'pagada' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
    observaciones TEXT,
    created_by INTEGER NOT NULL REFERENCES usuario(id_usuario),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Líneas de Factura
CREATE TABLE linea_factura (
    id_linea SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL REFERENCES factura_venta(id_factura) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario - descuento) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Control de Terapias
CREATE TABLE control_terapia (
    id_control SERIAL PRIMARY KEY,
    id_mascota INTEGER NOT NULL REFERENCES mascota(id_mascota),
    id_factura INTEGER REFERENCES factura_venta(id_factura),
    id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('individual', 'paquete')),
    sesiones_total INTEGER NOT NULL CHECK (sesiones_total > 0),
    sesiones_usadas INTEGER DEFAULT 0 CHECK (sesiones_usadas >= 0),
    sesiones_restantes INTEGER GENERATED ALWAYS AS (sesiones_total - sesiones_usadas) STORED,
    fecha_inicio DATE NOT NULL,
    fecha_ultima DATE,
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'vencida', 'cancelada')),
    observaciones TEXT,
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
CREATE INDEX idx_producto_codigo ON producto(codigo);
CREATE INDEX idx_producto_tipo ON producto(tipo);
CREATE INDEX idx_factura_fecha ON factura_venta(fecha);
CREATE INDEX idx_factura_cliente ON factura_venta(id_cliente);
CREATE INDEX idx_orden_fecha ON orden_compra(fecha);
CREATE INDEX idx_orden_proveedor ON orden_compra(id_proveedor);
CREATE INDEX idx_terapia_mascota ON control_terapia(id_mascota);
CREATE INDEX idx_ingreso_fecha ON ingreso(fecha);
CREATE INDEX idx_egreso_fecha ON egreso(fecha);
CREATE INDEX idx_auditoria_fecha ON log_auditoria(fecha);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario administrador por defecto
INSERT INTO usuario (nombre, rol, email, password_hash) VALUES 
('Administrador', 'admin', 'admin@vetplus.com', '$2b$10$rXKqPxl5GLJrxj7XJFvXQOw5J1C1KJWxLZxRqF5PHx.zHjGQQj7XG');
-- Contraseña: admin123

-- Cajas por defecto
INSERT INTO caja (nombre, tipo, descripcion, saldo_inicial, saldo_actual) VALUES 
('Caja Menor', 'caja_menor', 'Caja para gastos menores diarios', 0, 0),
('Cuenta Bancaria', 'cuenta_bancaria', 'Cuenta bancaria principal', 0, 0),
('Caja Fuerte', 'caja_fuerte', 'Caja fuerte para efectivo', 0, 0);

-- Categorías de productos/servicios básicos
INSERT INTO producto (codigo, nombre, tipo, categoria, precio_venta, inventariable) VALUES 
('CONS001', 'Consulta General', 'servicio', 'Consultas', 50000, FALSE),
('TERA001', 'Terapia Individual', 'terapia_individual', 'Terapias', 30000, FALSE),
('TERAP10', 'Paquete 10 Terapias', 'terapia_paquete', 'Terapias', 250000, FALSE);

-- Commit de la transacción
COMMIT;

-- Mensaje de confirmación
SELECT 'Base de datos VetPlus creada exitosamente' AS mensaje;
