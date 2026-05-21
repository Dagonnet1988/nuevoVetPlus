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
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    updated_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
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

-- ── HISTORIAS CLÍNICAS ─────────────────────────────────────────────────────
-- Tabla madre: envelope común a los 4 tipos de documento clínico
CREATE TABLE clinical.historias_clinicas (
    id_historia     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_historia VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('HC-'),
    tipo_documento  VARCHAR(30) NOT NULL
                      CHECK (tipo_documento IN ('valoracion_inicial','seguimiento','formula','remision')),
    id_mascota      UUID NOT NULL REFERENCES clinical.mascotas(id_mascota) ON DELETE RESTRICT,
    id_veterinario  UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario) ON DELETE RESTRICT,
    id_cita         UUID, -- FK a calendario_citas se agrega después (orden de creación)
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    estado          VARCHAR(20) NOT NULL DEFAULT 'Completado'
                      CHECK (estado IN ('Borrador','Completado','Cancelado')),
    motivo_modificacion TEXT,
    motivo_anulacion TEXT,
    id_tenant       UUID NOT NULL DEFAULT system.get_default_tenant()
                      REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_historias_updated_at
    BEFORE UPDATE ON clinical.historias_clinicas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Valoración inicial (Captura 1)
CREATE TABLE clinical.historia_valoracion_inicial (
    id_historia                UUID PRIMARY KEY
                                 REFERENCES clinical.historias_clinicas(id_historia) ON DELETE CASCADE,
    remitido_por               TEXT,
    anamnesis                  TEXT,
    antiguedad_signos          TEXT,
    medicacion_previa          TEXT,
    enfermedades_anteriores    TEXT,
    actividad_fisica           TEXT,
    valoracion_estatica        TEXT,
    valoracion_dinamica        TEXT,
    hallazgos_musculares       TEXT,
    perimetria_mtd_1           NUMERIC(5,1),
    perimetria_mtd_2           NUMERIC(5,1),
    perimetria_mti_1           NUMERIC(5,1),
    perimetria_mti_2           NUMERIC(5,1),
    perimetria_mpd_1           NUMERIC(5,1),
    perimetria_mpd_2           NUMERIC(5,1),
    perimetria_mpi_1           NUMERIC(5,1),
    perimetria_mpi_2           NUMERIC(5,1),
    hallazgos_osteoarticulares TEXT,
    goniometria                JSONB NOT NULL DEFAULT '{}',
    prueba_cajon               TEXT,
    prueba_compresion_tibial   TEXT,
    prueba_ortolani            TEXT,
    luxacion_patelar           TEXT,
    sensibilidad               TEXT,
    propiocepcion              TEXT,
    equilibrio                 TEXT,
    paniculo                   TEXT,
    reflejos                   JSONB NOT NULL DEFAULT '{}',
    imagenes_diagnosticas      TEXT,
    diagnostico                TEXT,
    tratamiento                TEXT,
    recomendaciones            TEXT,
    proxima_cita               DATE
);

-- Seguimiento de terapias (Captura 2)
CREATE TABLE clinical.historia_seguimiento (
    id_historia            UUID PRIMARY KEY
                             REFERENCES clinical.historias_clinicas(id_historia) ON DELETE CASCADE,
    numero_sesion          INTEGER,
    observaciones_en_casa  TEXT,
    ejercicios_realizados  TEXT,
    recomendaciones_casa   TEXT,
    notas_clinicas         TEXT
);

-- Fórmula / Receta (Captura 3)
CREATE TABLE clinical.historia_formula (
    id_historia      UUID PRIMARY KEY
                       REFERENCES clinical.historias_clinicas(id_historia) ON DELETE CASCADE,
    medicamentos     JSONB NOT NULL DEFAULT '[]', -- [{medicamento, instrucciones, cantidad}]
    plan_terapeutico TEXT,
    notas            TEXT
);

-- Remisión (Captura 4)
CREATE TABLE clinical.historia_remision (
    id_historia          UUID PRIMARY KEY
                           REFERENCES clinical.historias_clinicas(id_historia) ON DELETE CASCADE,
    motivo               TEXT,
    texto_remision       TEXT,
    especialidad_destino TEXT,
    profesional_destino  TEXT,
    institucion_destino  TEXT
);

-- Archivos adjuntos de historias clínicas
CREATE TABLE clinical.archivos_historia (
    id_archivo      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_historia     UUID NOT NULL REFERENCES clinical.historias_clinicas(id_historia) ON DELETE CASCADE,
    nombre_original VARCHAR(500) NOT NULL,
    nombre_archivo  VARCHAR(500) NOT NULL,
    ruta_archivo    TEXT NOT NULL,
    tipo_mime       VARCHAR(100),
    tamano_bytes    INTEGER,
    descripcion     TEXT,
    activo          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES vetplus_auth.usuarios(id_usuario) ON DELETE SET NULL,
    id_tenant       UUID NOT NULL DEFAULT system.get_default_tenant()
                      REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT
);

-- Tabla de calendario de citas
CREATE TABLE clinical.calendario_citas (
    id_cita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_cita VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('CIT-'),
    id_mascota UUID NOT NULL REFERENCES clinical.mascotas(id_mascota),
    id_veterinario UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- Consulta, Terapia, Cirugía, Control, etc.
    estado VARCHAR(20) DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'en_curso', 'completada', 'no_asistio')),
    motivo TEXT,
    notas TEXT,
    recordatorio_enviado BOOLEAN DEFAULT false,
    id_historia UUID REFERENCES clinical.historias_clinicas(id_historia) ON DELETE SET NULL,
    fue_reagendada BOOLEAN NOT NULL DEFAULT false,
    cantidad_reagendamientos INTEGER NOT NULL DEFAULT 0,
    ultima_reagendacion_at TIMESTAMPTZ,
    ultima_reagendacion_por UUID REFERENCES vetplus_auth.usuarios(id_usuario) ON DELETE SET NULL,
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
COMMENT ON TABLE clinical.historias_clinicas IS 'Tabla madre del módulo historias clínicas (valoración inicial, seguimiento, fórmula, remisión)';
COMMENT ON TABLE clinical.historia_valoracion_inicial IS 'Valoración inicial fisioterapéutica completa';
COMMENT ON TABLE clinical.historia_seguimiento IS 'Seguimiento de sesiones de terapia';
COMMENT ON TABLE clinical.historia_formula IS 'Fórmulas y recetas médicas';
COMMENT ON TABLE clinical.historia_remision IS 'Remisiones a otros especialistas';
COMMENT ON TABLE clinical.archivos_historia IS 'Archivos adjuntos de historias clínicas';
COMMENT ON TABLE clinical.calendario_citas IS 'Agenda de citas y terapias';
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
-- Historias clínicas
CREATE INDEX idx_historias_mascota  ON clinical.historias_clinicas(id_mascota);
CREATE INDEX idx_historias_tenant   ON clinical.historias_clinicas(id_tenant);
CREATE INDEX idx_historias_tipo     ON clinical.historias_clinicas(tipo_documento);
CREATE INDEX idx_historias_fecha    ON clinical.historias_clinicas(fecha DESC);
CREATE INDEX idx_historias_cita     ON clinical.historias_clinicas(id_cita);
CREATE INDEX idx_archivos_historia  ON clinical.archivos_historia(id_historia);
-- Citas
CREATE INDEX idx_citas_mascota      ON clinical.calendario_citas(id_mascota);
CREATE INDEX idx_citas_veterinario  ON clinical.calendario_citas(id_veterinario);
CREATE INDEX idx_citas_fecha        ON clinical.calendario_citas(fecha_inicio);
CREATE INDEX idx_citas_estado       ON clinical.calendario_citas(estado);
CREATE INDEX idx_citas_historia     ON clinical.calendario_citas(id_historia);
-- Tenants
CREATE INDEX idx_clientes_tenant    ON clinical.clientes(id_tenant);
CREATE INDEX idx_mascotas_tenant    ON clinical.mascotas(id_tenant);
CREATE INDEX idx_citas_tenant       ON clinical.calendario_citas(id_tenant);
-- Google Calendar
CREATE INDEX idx_google_audit_appointment ON clinical.google_calendar_audit_log(appointment_id);
CREATE INDEX idx_google_audit_action      ON clinical.google_calendar_audit_log(action_type);
CREATE INDEX idx_google_audit_date        ON clinical.google_calendar_audit_log(created_at);

