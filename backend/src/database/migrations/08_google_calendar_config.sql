-- =====================================================
-- 08 GOOGLE CALENDAR CONFIGURATION
-- Tabla para manejar configuraciones de Google Calendar
-- desde el panel de administrador
-- =====================================================

-- Crear tabla de configuraciones de Google Calendar
CREATE TABLE IF NOT EXISTS auth.google_calendar_config (
    id_config UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    redirect_uri VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    token_expiry TIMESTAMPTZ,
    calendar_id VARCHAR(255) DEFAULT 'primary',
    timezone VARCHAR(50) DEFAULT 'America/Bogota',
    notification_email BOOLEAN DEFAULT true,
    notification_popup BOOLEAN DEFAULT true,
    default_reminder_minutes INTEGER DEFAULT 30,
    email_reminder_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT false,
    configured_by UUID REFERENCES auth.usuarios(id_usuario),
    -- Campos para webhook
    webhook_channel_id VARCHAR(100),
    webhook_url TEXT,
    webhook_expiration TIMESTAMPTZ,
    webhook_resource_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_google_calendar_config_active ON auth.google_calendar_config(is_active);
CREATE INDEX IF NOT EXISTS idx_google_calendar_config_configured_by ON auth.google_calendar_config(configured_by);
CREATE INDEX IF NOT EXISTS idx_google_calendar_webhook_channel ON auth.google_calendar_config(webhook_channel_id) WHERE webhook_channel_id IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_google_calendar_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_google_calendar_config_updated_at
    BEFORE UPDATE ON auth.google_calendar_config
    FOR EACH ROW
    EXECUTE FUNCTION update_google_calendar_config_updated_at();

-- Agregar campo google_event_id a la tabla de citas para sincronización
ALTER TABLE clinical.calendario_citas 
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (google_sync_status IN ('pending', 'synced', 'failed', 'disabled')),
ADD COLUMN IF NOT EXISTS google_sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_google_sync TIMESTAMPTZ;

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_citas_google_event_id ON clinical.calendario_citas(google_event_id);
CREATE INDEX IF NOT EXISTS idx_citas_google_sync_status ON clinical.calendario_citas(google_sync_status);

-- Comentarios para documentación
COMMENT ON TABLE auth.google_calendar_config IS 'Configuraciones de Google Calendar gestionadas desde el panel de administrador';
COMMENT ON COLUMN auth.google_calendar_config.client_id IS 'Client ID de la aplicación Google Calendar';
COMMENT ON COLUMN auth.google_calendar_config.client_secret IS 'Client Secret de la aplicación Google Calendar';
COMMENT ON COLUMN auth.google_calendar_config.refresh_token IS 'Token de actualización para renovar el acceso';
COMMENT ON COLUMN auth.google_calendar_config.is_active IS 'Indica si la integración está activa';
COMMENT ON COLUMN auth.google_calendar_config.webhook_channel_id IS 'ID del canal de webhook de Google Calendar';
COMMENT ON COLUMN auth.google_calendar_config.webhook_url IS 'URL del webhook configurado';
COMMENT ON COLUMN auth.google_calendar_config.webhook_expiration IS 'Fecha de expiración del webhook';
COMMENT ON COLUMN auth.google_calendar_config.webhook_resource_id IS 'Resource ID del webhook de Google Calendar';
COMMENT ON COLUMN clinical.calendario_citas.google_event_id IS 'ID del evento en Google Calendar';
COMMENT ON COLUMN clinical.calendario_citas.google_sync_status IS 'Estado de sincronización con Google Calendar';

-- Solo debe haber una configuración activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_config_single_active 
ON auth.google_calendar_config(is_active) 
WHERE is_active = true;

-- =====================================================
-- PERMISOS Y AUDITORÍA
-- =====================================================

-- Auditoría para configuraciones de Google Calendar
CREATE OR REPLACE FUNCTION audit_google_calendar_config()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.activity_log (
            tabla_afectada, 
            id_registro, 
            accion, 
            datos_nuevos, 
            id_usuario,
            ip_address
        ) VALUES (
            'google_calendar_config',
            NEW.id_config::text,
            'CREATE_GOOGLE_CONFIG',
            row_to_json(NEW),
            NEW.configured_by,
            inet_client_addr()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.activity_log (
            tabla_afectada, 
            id_registro, 
            accion, 
            datos_anteriores,
            datos_nuevos,
            id_usuario
        ) VALUES (
            'google_calendar_config',
            NEW.id_config::text,
            'UPDATE_GOOGLE_CONFIG',
            row_to_json(OLD),
            row_to_json(NEW),
            NEW.configured_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.activity_log (
            tabla_afectada, 
            id_registro, 
            accion, 
            datos_anteriores
        ) VALUES (
            'google_calendar_config',
            OLD.id_config::text,
            'DELETE_GOOGLE_CONFIG',
            row_to_json(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_audit_google_calendar_config
    AFTER INSERT OR UPDATE OR DELETE ON auth.google_calendar_config
    FOR EACH ROW
    EXECUTE FUNCTION audit_google_calendar_config();