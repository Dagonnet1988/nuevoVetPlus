-- ===========================================
-- VETPLUS - TABLAS DE AUTENTICACIÓN Y AUDITORÍA
-- ===========================================

-- El esquema vetplus_auth ya fue creado en 01_create_database.sql

-- Tabla de usuarios del sistema
CREATE TABLE vetplus_auth.usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    documento VARCHAR(20) NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('CC', 'CE', 'Pasaporte')),
    telefono VARCHAR(20),
    direccion TEXT,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vet', 'aux')),
    especialidad VARCHAR(100),
    numero_licencia VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    intentos_login INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    -- Campos para reset de contraseñas
    password_temporal BOOLEAN DEFAULT false,
    debe_cambiar_password BOOLEAN DEFAULT false,
    password_reset_date TIMESTAMP,
    password_reset_by UUID,
    -- Multi-tenancy
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    -- Firma del veterinario (ruta al archivo PNG/JPG subido)
    firma_url TEXT,
    -- Avatar general del usuario (perfil)
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON vetplus_auth.usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agregar foreign key para password_reset_by
ALTER TABLE vetplus_auth.usuarios 
ADD CONSTRAINT fk_password_reset_by 
FOREIGN KEY (password_reset_by) REFERENCES vetplus_auth.usuarios(id_usuario);

-- Tabla de tokens blacklisteados
CREATE TABLE vetplus_auth.blacklisted_tokens (
    id_token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    id_usuario UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    razon VARCHAR(50) DEFAULT 'logout',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historial de resets de contraseña
CREATE TABLE vetplus_auth.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario),
    tipo_reset VARCHAR(50) NOT NULL DEFAULT 'temp_password' 
      CHECK (tipo_reset IN ('temp_password', 'admin_reset', 'force_change', 'user_change')),
    realizado_por UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    motivo VARCHAR(255),
    completado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Tabla de auditoría del sistema

-- Índice para búsqueda rápida de tokens
CREATE INDEX idx_blacklisted_tokens_token ON vetplus_auth.blacklisted_tokens(token);
CREATE INDEX idx_blacklisted_tokens_created ON vetplus_auth.blacklisted_tokens(created_at);

-- Tabla de auditoría para tracking de cambios
CREATE TABLE system.log_auditoria (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    tabla_afectada VARCHAR(50) NOT NULL,
    id_entidad_afectada VARCHAR(50),
    tipo_accion VARCHAR(20) NOT NULL CHECK (tipo_accion IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    descripcion TEXT,
    data_anterior JSONB,
    data_nueva JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para tracking de migraciones
CREATE TABLE system.migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Tabla de configuraciones de Google Calendar
CREATE TABLE IF NOT EXISTS vetplus_auth.google_calendar_config (
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
    sync_preferences JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT false,
    configured_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    -- Campos para webhook
    webhook_channel_id VARCHAR(100),
    webhook_url TEXT,
    webhook_expiration TIMESTAMPTZ,
    webhook_resource_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios en las tablas
COMMENT ON TABLE vetplus_auth.usuarios IS 'Usuarios del sistema con roles admin, vet, aux';
COMMENT ON TABLE vetplus_auth.password_resets IS 'Historial de resets de contraseña por administradores';
COMMENT ON COLUMN vetplus_auth.usuarios.password_temporal IS 'Indica si la contraseña es temporal y debe cambiarse';
COMMENT ON COLUMN vetplus_auth.usuarios.password_reset_date IS 'Fecha del último reset de contraseña';
COMMENT ON COLUMN vetplus_auth.usuarios.password_reset_by IS 'Admin que realizó el último reset';
COMMENT ON TABLE system.log_auditoria IS 'Log de auditoría de todas las acciones del sistema';
COMMENT ON TABLE system.migrations IS 'Control de migraciones de base de datos ejecutadas';

-- Crear índices para Google Calendar
CREATE INDEX IF NOT EXISTS idx_google_calendar_config_active ON vetplus_auth.google_calendar_config(is_active);
CREATE INDEX IF NOT EXISTS idx_google_calendar_config_configured_by ON vetplus_auth.google_calendar_config(configured_by);
CREATE INDEX IF NOT EXISTS idx_google_calendar_webhook_channel ON vetplus_auth.google_calendar_config(webhook_channel_id) WHERE webhook_channel_id IS NOT NULL;

-- Solo debe haber una configuración activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_config_single_active 
ON vetplus_auth.google_calendar_config(is_active) 
WHERE is_active = true;


-- Índices para optimización
CREATE INDEX idx_usuarios_email ON vetplus_auth.usuarios(email);
CREATE INDEX idx_usuarios_rol ON vetplus_auth.usuarios(rol);
CREATE INDEX idx_usuarios_activo ON vetplus_auth.usuarios(activo);
CREATE INDEX idx_usuarios_password_temporal ON vetplus_auth.usuarios(password_temporal);
CREATE INDEX idx_usuarios_tenant ON vetplus_auth.usuarios(id_tenant);
CREATE UNIQUE INDEX idx_usuarios_tenant_email_unique ON vetplus_auth.usuarios(id_tenant, LOWER(email));
CREATE UNIQUE INDEX idx_usuarios_tenant_documento_unique ON vetplus_auth.usuarios(id_tenant, documento);
CREATE INDEX idx_password_resets_admin ON vetplus_auth.password_resets(realizado_por);
CREATE INDEX idx_password_resets_usuario ON vetplus_auth.password_resets(id_usuario);
CREATE INDEX idx_password_resets_target ON vetplus_auth.password_resets(id_usuario);
CREATE INDEX idx_password_resets_date ON vetplus_auth.password_resets(created_at);
CREATE INDEX idx_auditoria_usuario ON system.log_auditoria(id_usuario);
CREATE INDEX idx_auditoria_tabla ON system.log_auditoria(tabla_afectada);
CREATE INDEX idx_auditoria_fecha ON system.log_auditoria(fecha);
