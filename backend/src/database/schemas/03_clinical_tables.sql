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
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
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
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
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
    id_veterinario UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario),
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
    recordatorio_medicamentos_enviado BOOLEAN DEFAULT false,
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
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
    id_veterinario UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- Consulta, Terapia, Cirugía, Control, etc.
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio')),
    motivo TEXT,
    notas TEXT,
    recordatorio_enviado BOOLEAN DEFAULT false,
    id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta),
    google_event_id VARCHAR(255),
    google_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (google_sync_status IN ('pending', 'synced', 'failed', 'disabled')),
    google_sync_error TEXT,
    last_google_sync TIMESTAMPTZ,
    fecha_recordatorio TIMESTAMP WITH TIME ZONE,
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_calendario_updated_at 
    BEFORE UPDATE ON clinical.calendario_citas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de archivos adjuntos de consultas clínicas
CREATE TABLE clinical.archivos_consulta (
    id_archivo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_consulta UUID NOT NULL REFERENCES clinical.consultas_clinicas(id_consulta) ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    tipo_archivo VARCHAR(100),
    tamano_bytes INTEGER,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_archivos_consulta_updated_at
    BEFORE UPDATE ON clinical.archivos_consulta
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de auditoría para Google Calendar
CREATE TABLE clinical.google_calendar_audit_log (
    id SERIAL PRIMARY KEY,
    appointment_id UUID REFERENCES clinical.calendario_citas(id_cita),
    action_type VARCHAR(50) NOT NULL, -- attendee_response, event_updated, event_created, event_deleted
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios en las tablas
COMMENT ON TABLE clinical.clientes IS 'Propietarios de las mascotas';
COMMENT ON TABLE clinical.mascotas IS 'Mascotas registradas en la clínica';
COMMENT ON TABLE clinical.consultas_clinicas IS 'Registro de consultas veterinarias';
COMMENT ON TABLE clinical.calendario_citas IS 'Agenda de citas y terapias';
COMMENT ON TABLE clinical.archivos_consulta IS 'Archivos adjuntos vinculados a las consultas clínicas';
COMMENT ON TABLE clinical.google_calendar_audit_log IS 'Auditoría de eventos y respuestas de Google Calendar';

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

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
CREATE INDEX idx_clientes_tenant        ON clinical.clientes(id_tenant);
CREATE INDEX idx_mascotas_tenant        ON clinical.mascotas(id_tenant);
CREATE INDEX idx_consultas_tenant       ON clinical.consultas_clinicas(id_tenant);
CREATE INDEX idx_citas_tenant           ON clinical.calendario_citas(id_tenant);
CREATE INDEX idx_archivos_consulta_id_consulta ON clinical.archivos_consulta(id_consulta);
CREATE INDEX idx_archivos_consulta_activo ON clinical.archivos_consulta(activo);
CREATE INDEX idx_archivos_consulta_tipo ON clinical.archivos_consulta(tipo_archivo);
CREATE INDEX idx_google_audit_appointment ON clinical.google_calendar_audit_log(appointment_id);
CREATE INDEX idx_google_audit_action ON clinical.google_calendar_audit_log(action_type);
CREATE INDEX idx_google_audit_date ON clinical.google_calendar_audit_log(created_at);
