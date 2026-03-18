-- ===========================================
-- VETPLUS - CONFIGURACION DE EMPRESA
-- ===========================================

-- Tabla para configuracion general de la empresa
CREATE TABLE IF NOT EXISTS system.configuracion_empresa (
    id_config UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa VARCHAR(200) NOT NULL,
    nit VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    codigo_postal VARCHAR(10),
    sitio_web VARCHAR(200),
    website VARCHAR(200),
    eslogan VARCHAR(200),

    -- Informacion legal
    regimen_tributario VARCHAR(50) DEFAULT 'Regimen Simplificado',
    representante_legal VARCHAR(200),
    cedula_representante VARCHAR(20),

    -- Configuracion de documentos
    logo_url VARCHAR(500),
    logo_filename VARCHAR(200),

    -- Configuracion general
    configuracion_general JSONB,
    configuracion_numeracion JSONB,

    -- Metadatos
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    updated_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Solo puede haber una configuracion activa
CREATE UNIQUE INDEX idx_config_empresa_activa ON system.configuracion_empresa(activa) WHERE activa = true;

-- Tabla para horarios de atencion
CREATE TABLE IF NOT EXISTS system.horarios_atencion (
    id_horario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_config UUID NOT NULL REFERENCES system.configuracion_empresa(id_config) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL,
    hora_apertura TIME,
    hora_cierre TIME,
    cerrado BOOLEAN DEFAULT false,
    notas VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para dias festivos y cierres especiales
CREATE TABLE IF NOT EXISTS system.dias_especiales (
    id_dia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_config UUID NOT NULL REFERENCES system.configuracion_empresa(id_config) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    motivo VARCHAR(200) NOT NULL,
    cerrado BOOLEAN DEFAULT true,
    hora_apertura TIME,
    hora_cierre TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuracion inicial basica
INSERT INTO system.configuracion_empresa (
    nombre_empresa,
    nit,
    direccion,
    telefono,
    email,
    ciudad,
    departamento
) VALUES (
    'VetPlus - Clinica Veterinaria',
    '900123456-1',
    'Calle 123 #45-67',
    '+57 1 234 5678',
    'info@vetplus.com',
    'Bogota',
    'Cundinamarca'
) ON CONFLICT DO NOTHING;

-- Insertar horarios de atencion por defecto
WITH config AS (
    SELECT id_config FROM system.configuracion_empresa WHERE activa = true LIMIT 1
)
INSERT INTO system.horarios_atencion (id_config, dia_semana, hora_apertura, hora_cierre)
SELECT
    c.id_config,
    dias.dia,
    CASE
        WHEN dias.dia = 0 THEN '09:00'::TIME
        WHEN dias.dia = 6 THEN '08:00'::TIME
        ELSE '07:00'::TIME
    END,
    CASE
        WHEN dias.dia = 0 THEN '15:00'::TIME
        WHEN dias.dia = 6 THEN '17:00'::TIME
        ELSE '18:00'::TIME
    END
FROM config c
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(0)) AS dias(dia)
ON CONFLICT DO NOTHING;

-- Funcion para obtener configuracion activa
CREATE OR REPLACE FUNCTION get_empresa_config()
RETURNS TABLE(
    id_config UUID,
    nombre_empresa VARCHAR(200),
    nit VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    logo_url VARCHAR(500),
    configuracion_general JSONB,
    configuracion_numeracion JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id_config,
        ce.nombre_empresa,
        ce.nit,
        ce.direccion,
        ce.telefono,
        ce.email,
        ce.logo_url,
        ce.configuracion_general,
        ce.configuracion_numeracion
    FROM system.configuracion_empresa ce
    WHERE ce.activa = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Vista para horarios de atencion
CREATE OR REPLACE VIEW system.v_horarios_atencion AS
SELECT
    ha.id_horario,
    ha.dia_semana,
    CASE ha.dia_semana
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miercoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sabado'
    END as nombre_dia,
    ha.hora_apertura,
    ha.hora_cierre,
    ha.cerrado,
    ha.notas,
    CASE
        WHEN ha.cerrado THEN 'Cerrado'
        ELSE ha.hora_apertura::TEXT || ' - ' || ha.hora_cierre::TEXT
    END as horario_texto
FROM system.horarios_atencion ha
JOIN system.configuracion_empresa ce ON ha.id_config = ce.id_config
WHERE ce.activa = true
ORDER BY ha.dia_semana;

-- Indices
CREATE INDEX IF NOT EXISTS idx_horarios_config ON system.horarios_atencion(id_config);
CREATE INDEX IF NOT EXISTS idx_dias_especiales_config ON system.dias_especiales(id_config);
CREATE INDEX IF NOT EXISTS idx_dias_especiales_fecha ON system.dias_especiales(fecha);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_empresa_config_updated_at
    BEFORE UPDATE ON system.configuracion_empresa
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Comentarios
COMMENT ON TABLE system.configuracion_empresa IS 'Configuracion general de la empresa veterinaria';
COMMENT ON TABLE system.horarios_atencion IS 'Horarios de atencion por dia de la semana';
COMMENT ON TABLE system.dias_especiales IS 'Dias festivos y cierres especiales';
COMMENT ON FUNCTION get_empresa_config() IS 'Obtiene la configuracion activa de la empresa';
