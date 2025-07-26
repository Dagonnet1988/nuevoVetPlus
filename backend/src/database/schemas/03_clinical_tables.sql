-- ===========================================
-- VETPLUS - TABLAS DEL MÓDULO CLÍNICO
-- ===========================================

-- Tabla de clientes (propietarios de mascotas)
CREATE TABLE clinical.clientes (
    id_cliente UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(150),
    fecha_nacimiento DATE,
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clinical.clientes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de mascotas
CREATE TABLE clinical.mascotas (
    id_mascota UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_cliente UUID NOT NULL REFERENCES clinical.clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    especie VARCHAR(30) NOT NULL, -- Perro, Gato, Ave, etc.
    raza VARCHAR(50),
    edad INTEGER, -- en meses
    sexo VARCHAR(10) CHECK (sexo IN ('Macho', 'Hembra')),
    peso DECIMAL(5,2), -- en kg
    color VARCHAR(50),
    fecha_nacimiento DATE,
    esterilizado BOOLEAN DEFAULT false,
    microchip VARCHAR(50),
    notas TEXT,
    foto_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_mascotas_updated_at 
    BEFORE UPDATE ON clinical.mascotas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de consultas clínicas
CREATE TABLE clinical.consultas_clinicas (
    id_consulta UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_consulta VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('CON-'),
    id_mascota UUID NOT NULL REFERENCES clinical.mascotas(id_mascota),
    id_veterinario UUID NOT NULL REFERENCES auth.usuarios(id_usuario),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT NOT NULL,
    anamnesis TEXT, -- Historia clínica
    examen_fisico TEXT,
    temperatura DECIMAL(4,2),
    peso DECIMAL(5,2),
    diagnostico TEXT,
    tratamiento TEXT,
    medicamentos JSONB, -- [{nombre, dosis, frecuencia, duracion}]
    recomendaciones TEXT,
    proxima_cita DATE,
    estado VARCHAR(20) DEFAULT 'Completada' CHECK (estado IN ('Programada', 'En Curso', 'Completada', 'Cancelada')),
    costo DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_consultas_updated_at 
    BEFORE UPDATE ON clinical.consultas_clinicas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de calendario de citas
CREATE TABLE clinical.calendario_citas (
    id_cita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_cita VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('CIT-'),
    id_mascota UUID NOT NULL REFERENCES clinical.mascotas(id_mascota),
    id_veterinario UUID NOT NULL REFERENCES auth.usuarios(id_usuario),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- Consulta, Terapia, Cirugía, Control, etc.
    estado VARCHAR(20) DEFAULT 'Programada' CHECK (estado IN ('Programada', 'Confirmada', 'En Curso', 'Completada', 'Cancelada', 'No Asistió')),
    motivo TEXT,
    notas TEXT,
    recordatorio_enviado BOOLEAN DEFAULT false,
    id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta),
    google_event_id VARCHAR(100), -- ID del evento en Google Calendar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_calendario_updated_at 
    BEFORE UPDATE ON clinical.calendario_citas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de vacunas y tratamientos preventivos
CREATE TABLE clinical.vacunas_tratamientos (
    id_vacuna UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_mascota UUID NOT NULL REFERENCES clinical.mascotas(id_mascota),
    tipo VARCHAR(50) NOT NULL, -- Vacuna, Desparasitación, etc.
    nombre VARCHAR(100) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    proxima_dosis DATE,
    lote VARCHAR(50),
    veterinario VARCHAR(100),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Comentarios en las tablas
COMMENT ON TABLE clinical.clientes IS 'Propietarios de las mascotas';
COMMENT ON TABLE clinical.mascotas IS 'Mascotas registradas en la clínica';
COMMENT ON TABLE clinical.consultas_clinicas IS 'Registro de consultas veterinarias';
COMMENT ON TABLE clinical.calendario_citas IS 'Agenda de citas y terapias';
COMMENT ON TABLE clinical.vacunas_tratamientos IS 'Historial de vacunas y tratamientos preventivos';

-- Índices para optimización
CREATE INDEX idx_clientes_cedula ON clinical.clientes(cedula);
CREATE INDEX idx_clientes_nombre ON clinical.clientes(nombre);
CREATE INDEX idx_mascotas_cliente ON clinical.mascotas(id_cliente);
CREATE INDEX idx_mascotas_nombre ON clinical.mascotas(nombre);
CREATE INDEX idx_mascotas_especie ON clinical.mascotas(especie);
CREATE INDEX idx_consultas_mascota ON clinical.consultas_clinicas(id_mascota);
CREATE INDEX idx_consultas_veterinario ON clinical.consultas_clinicas(id_veterinario);
CREATE INDEX idx_consultas_fecha ON clinical.consultas_clinicas(fecha);
CREATE INDEX idx_citas_mascota ON clinical.calendario_citas(id_mascota);
CREATE INDEX idx_citas_veterinario ON clinical.calendario_citas(id_veterinario);
CREATE INDEX idx_citas_fecha ON clinical.calendario_citas(fecha_inicio);
CREATE INDEX idx_citas_estado ON clinical.calendario_citas(estado);
CREATE INDEX idx_vacunas_mascota ON clinical.vacunas_tratamientos(id_mascota);
