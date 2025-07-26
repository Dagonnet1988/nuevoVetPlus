-- ===========================================
-- VETPLUS - CONFIGURACIÓN DE EMPRESA
-- ===========================================

-- Tabla para configuración general de la empresa
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
    website VARCHAR(200),
    
    -- Información legal
    regimen_tributario VARCHAR(50) DEFAULT 'Régimen Simplificado',
    representante_legal VARCHAR(200),
    cedula_representante VARCHAR(20),
    
    -- Configuración de documentos
    logo_url VARCHAR(500), -- URL del logo subido
    logo_filename VARCHAR(200), -- Nombre del archivo original
    pie_factura TEXT, -- Texto adicional para el pie de factura
    mensaje_whatsapp_factura TEXT DEFAULT 'Estimado cliente, adjuntamos su factura de servicios veterinarios. ¡Gracias por confiar en nosotros!',
    mensaje_whatsapp_formula TEXT DEFAULT 'Estimado cliente, adjuntamos la fórmula médica para su mascota. Siga las indicaciones del veterinario.',
    
    -- Configuración WhatsApp Business
    whatsapp_business_number VARCHAR(20),
    whatsapp_api_token TEXT,
    whatsapp_webhook_verify_token VARCHAR(100),
    whatsapp_activo BOOLEAN DEFAULT false,
    
    -- Configuración de numeración
    prefijo_factura VARCHAR(10) DEFAULT 'FV',
    siguiente_numero_factura INTEGER DEFAULT 1,
    prefijo_orden_compra VARCHAR(10) DEFAULT 'OC',
    siguiente_numero_orden INTEGER DEFAULT 1,
    
    -- Metadatos
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario),
    updated_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Solo puede haber una configuración activa
CREATE UNIQUE INDEX idx_config_empresa_activa ON system.configuracion_empresa(activa) WHERE activa = true;

-- Tabla para horarios de atención
CREATE TABLE IF NOT EXISTS system.horarios_atencion (
    id_horario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_config UUID NOT NULL REFERENCES system.configuracion_empresa(id_config) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
    hora_apertura TIME,
    hora_cierre TIME,
    cerrado BOOLEAN DEFAULT false,
    notas VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para días festivos y cierres especiales
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

-- Insertar configuración inicial básica
INSERT INTO system.configuracion_empresa (
    nombre_empresa, 
    nit, 
    direccion, 
    telefono, 
    email,
    ciudad,
    departamento
) VALUES (
    'VetPlus - Clínica Veterinaria',
    '900123456-1',
    'Calle 123 #45-67',
    '+57 1 234 5678',
    'info@vetplus.com',
    'Bogotá',
    'Cundinamarca'
) ON CONFLICT DO NOTHING;

-- Insertar horarios de atención por defecto
WITH config AS (
    SELECT id_config FROM system.configuracion_empresa WHERE activa = true LIMIT 1
)
INSERT INTO system.horarios_atencion (id_config, dia_semana, hora_apertura, hora_cierre)
SELECT 
    c.id_config,
    dias.dia,
    CASE 
        WHEN dias.dia = 0 THEN '09:00'::TIME -- Domingo
        WHEN dias.dia = 6 THEN '08:00'::TIME -- Sábado  
        ELSE '07:00'::TIME -- Lunes a Viernes
    END,
    CASE 
        WHEN dias.dia = 0 THEN '15:00'::TIME -- Domingo
        WHEN dias.dia = 6 THEN '17:00'::TIME -- Sábado
        ELSE '18:00'::TIME -- Lunes a Viernes
    END
FROM config c
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(0)) AS dias(dia)
ON CONFLICT DO NOTHING;

-- Función para obtener configuración activa
CREATE OR REPLACE FUNCTION get_empresa_config()
RETURNS TABLE(
    id_config UUID,
    nombre_empresa VARCHAR(200),
    nit VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    logo_url VARCHAR(500),
    pie_factura TEXT,
    whatsapp_activo BOOLEAN,
    siguiente_factura VARCHAR(20),
    siguiente_orden VARCHAR(20)
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
        ce.pie_factura,
        ce.whatsapp_activo,
        (ce.prefijo_factura || '-' || LPAD(ce.siguiente_numero_factura::TEXT, 6, '0'))::VARCHAR(20) as siguiente_factura,
        (ce.prefijo_orden_compra || '-' || LPAD(ce.siguiente_numero_orden::TEXT, 6, '0'))::VARCHAR(20) as siguiente_orden
    FROM system.configuracion_empresa ce
    WHERE ce.activa = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar número de factura
CREATE OR REPLACE FUNCTION increment_factura_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    config_record RECORD;
    nuevo_numero VARCHAR(20);
BEGIN
    SELECT * INTO config_record 
    FROM system.configuracion_empresa 
    WHERE activa = true 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay configuración de empresa activa';
    END IF;
    
    nuevo_numero := config_record.prefijo_factura || '-' || LPAD(config_record.siguiente_numero_factura::TEXT, 6, '0');
    
    UPDATE system.configuracion_empresa 
    SET siguiente_numero_factura = siguiente_numero_factura + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_config = config_record.id_config;
    
    RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar número de orden
CREATE OR REPLACE FUNCTION increment_orden_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    config_record RECORD;
    nuevo_numero VARCHAR(20);
BEGIN
    SELECT * INTO config_record 
    FROM system.configuracion_empresa 
    WHERE activa = true 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay configuración de empresa activa';
    END IF;
    
    nuevo_numero := config_record.prefijo_orden_compra || '-' || LPAD(config_record.siguiente_numero_orden::TEXT, 6, '0');
    
    UPDATE system.configuracion_empresa 
    SET siguiente_numero_orden = siguiente_numero_orden + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_config = config_record.id_config;
    
    RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Vista para horarios de atención
CREATE OR REPLACE VIEW system.v_horarios_atencion AS
SELECT 
    ha.id_horario,
    ha.dia_semana,
    CASE ha.dia_semana
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
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

-- Índices
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
COMMENT ON TABLE system.configuracion_empresa IS 'Configuración general de la empresa veterinaria';
COMMENT ON TABLE system.horarios_atencion IS 'Horarios de atención por día de la semana';
COMMENT ON TABLE system.dias_especiales IS 'Días festivos y cierres especiales';
COMMENT ON FUNCTION get_empresa_config() IS 'Obtiene la configuración activa de la empresa';
COMMENT ON FUNCTION increment_factura_number() IS 'Incrementa y retorna el siguiente número de factura';
COMMENT ON FUNCTION increment_orden_number() IS 'Incrementa y retorna el siguiente número de orden';