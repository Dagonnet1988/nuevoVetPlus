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
    sitio_web VARCHAR(200),
    eslogan VARCHAR(200),

    -- Configuracion de documentos
    logo_url VARCHAR(500),
    logo_filename VARCHAR(200),

    -- Configuracion general
    configuracion_general JSONB NOT NULL DEFAULT '{"moneda":"COP","zona_horaria":"America/Bogota","idioma":"es","formato_fecha":"DD/MM/YYYY","formato_hora":"HH:mm"}'::jsonb,
    configuracion_numeracion JSONB NOT NULL DEFAULT '{"cita_prefijo":"CIT","cita_siguiente":1,"cita_digitos":6}'::jsonb,

    -- Metadatos
    activa BOOLEAN DEFAULT true,
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    updated_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Solo puede haber una configuracion activa por tenant
CREATE UNIQUE INDEX idx_config_empresa_activa_tenant
    ON system.configuracion_empresa(id_tenant)
    WHERE activa = true;

-- Funcion para obtener configuracion activa
CREATE OR REPLACE FUNCTION get_empresa_config()
RETURNS TABLE(
    id_config UUID,
    nombre_empresa VARCHAR(200),
    nit VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    sitio_web VARCHAR(200),
    eslogan VARCHAR(200),
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
        ce.sitio_web,
        ce.eslogan,
        ce.logo_url,
        ce.configuracion_general,
        ce.configuracion_numeracion
    FROM system.configuracion_empresa ce
    WHERE ce.activa = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

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
COMMENT ON FUNCTION get_empresa_config() IS 'Obtiene la configuracion activa de la empresa';

-- ===========================================
-- VETPLUS - CONFIGURACION DE CORREO
-- ===========================================

-- Configuracion de correo por tenant (independiente de Google Calendar)
CREATE TABLE IF NOT EXISTS system.configuracion_correo (
    id_config_correo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proveedor VARCHAR(30) NOT NULL DEFAULT 'smtp'
        CHECK (proveedor IN ('smtp')),
    auth_mode VARCHAR(20) NOT NULL DEFAULT 'smtp'
        CHECK (auth_mode IN ('smtp', 'gmail_oauth')),
    nombre_remitente VARCHAR(150),
    correo_remitente VARCHAR(150) NOT NULL,
    correo_respuesta VARCHAR(150),
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT false,
    smtp_usuario VARCHAR(255),
    smtp_password TEXT,
    oauth_client_id TEXT,
    oauth_client_secret TEXT,
    oauth_refresh_token TEXT,
    oauth_access_token TEXT,
    oauth_token_expiry TIMESTAMPTZ,
    oauth_email VARCHAR(150),
    oauth_redirect_uri TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    updated_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_config_correo_activa_tenant
    ON system.configuracion_correo(id_tenant)
    WHERE activa = true;

CREATE INDEX IF NOT EXISTS idx_config_correo_tenant
    ON system.configuracion_correo(id_tenant);

DROP TRIGGER IF EXISTS update_configuracion_correo_updated_at ON system.configuracion_correo;
CREATE TRIGGER update_configuracion_correo_updated_at
    BEFORE UPDATE ON system.configuracion_correo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system.configuracion_correo IS 'Configuracion de proveedor SMTP por tenant (independiente de Google Calendar)';

-- Plantillas de correo editables por tenant
CREATE TABLE IF NOT EXISTS system.email_templates (
    id_template UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave_template VARCHAR(100) NOT NULL,
    nombre_template VARCHAR(150) NOT NULL,
    descripcion TEXT,
    asunto TEXT NOT NULL,
    cuerpo_html TEXT NOT NULL,
    cuerpo_text TEXT,
    variables_permitidas JSONB NOT NULL DEFAULT '[]'::jsonb,
    activa BOOLEAN NOT NULL DEFAULT true,
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    updated_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    UNIQUE (id_tenant, clave_template)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant
    ON system.email_templates(id_tenant);

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON system.email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON system.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system.email_templates IS 'Plantillas de correo configurables por tenant para notificaciones operativas';

CREATE TABLE IF NOT EXISTS system.email_delivery_log (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_envio VARCHAR(60) NOT NULL,
    destinatario_email VARCHAR(200) NOT NULL,
    asunto TEXT,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('enviado', 'fallido')),
    provider_message_id TEXT,
    detalle_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_tenant
    ON system.email_delivery_log(id_tenant);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_tipo
    ON system.email_delivery_log(tipo_envio);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_fecha
    ON system.email_delivery_log(created_at DESC);

COMMENT ON TABLE system.email_delivery_log IS 'Bitácora general de envíos de correo operativos (usuarios, citas, recordatorios, etc.)';
