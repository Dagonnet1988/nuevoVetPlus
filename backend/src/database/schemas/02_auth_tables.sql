-- ===========================================
-- VETPLUS - TABLAS DE AUTENTICACIÓN Y AUDITORÍA
-- ===========================================

-- Tabla de usuarios del sistema
CREATE TABLE auth.usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vet', 'aux')),
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    intentos_login INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    -- Campos para reset de contraseñas
    password_temporal BOOLEAN DEFAULT false,
    debe_cambiar_password BOOLEAN DEFAULT false,
    password_reset_date TIMESTAMP,
    password_reset_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON auth.usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agregar foreign key para password_reset_by
ALTER TABLE auth.usuarios 
ADD CONSTRAINT fk_password_reset_by 
FOREIGN KEY (password_reset_by) REFERENCES auth.usuarios(id_usuario);

-- Tabla de sesiones JWT (opcional para revocación)
CREATE TABLE auth.sesiones (
    id_sesion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES auth.usuarios(id_usuario) ON DELETE CASCADE,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expira_en TIMESTAMP NOT NULL,
    revocado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tokens blacklisteados
CREATE TABLE auth.blacklisted_tokens (
    id_token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    id_usuario UUID REFERENCES auth.usuarios(id_usuario),
    razon VARCHAR(50) DEFAULT 'logout',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historial de resets de contraseña
CREATE TABLE auth.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES auth.usuarios(id_usuario),
    tipo_reset VARCHAR(50) NOT NULL DEFAULT 'temp_password' 
      CHECK (tipo_reset IN ('temp_password', 'admin_reset', 'force_change', 'user_change')),
    realizado_por UUID REFERENCES auth.usuarios(id_usuario),
    motivo VARCHAR(255),
    completado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Tabla de auditoría del sistema

-- Índice para búsqueda rápida de tokens
CREATE INDEX idx_blacklisted_tokens_token ON auth.blacklisted_tokens(token);
CREATE INDEX idx_blacklisted_tokens_created ON auth.blacklisted_tokens(created_at);

-- Tabla de auditoría para tracking de cambios
CREATE TABLE system.log_auditoria (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES auth.usuarios(id_usuario),
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

-- Comentarios en las tablas
COMMENT ON TABLE auth.usuarios IS 'Usuarios del sistema con roles admin, vet, aux';
COMMENT ON TABLE auth.sesiones IS 'Control de sesiones JWT activas';
COMMENT ON TABLE auth.password_resets IS 'Historial de resets de contraseña por administradores';
COMMENT ON COLUMN auth.usuarios.password_temporal IS 'Indica si la contraseña es temporal y debe cambiarse';
COMMENT ON COLUMN auth.usuarios.password_reset_date IS 'Fecha del último reset de contraseña';
COMMENT ON COLUMN auth.usuarios.password_reset_by IS 'Admin que realizó el último reset';
COMMENT ON TABLE system.log_auditoria IS 'Log de auditoría de todas las acciones del sistema';
COMMENT ON TABLE system.migrations IS 'Control de migraciones de base de datos ejecutadas';

-- Índices para optimización
CREATE INDEX idx_usuarios_email ON auth.usuarios(email);
CREATE INDEX idx_usuarios_rol ON auth.usuarios(rol);
CREATE INDEX idx_usuarios_activo ON auth.usuarios(activo);
CREATE INDEX idx_usuarios_password_temporal ON auth.usuarios(password_temporal);
CREATE INDEX idx_sesiones_usuario ON auth.sesiones(id_usuario);
CREATE INDEX idx_sesiones_token ON auth.sesiones(token_jti);
CREATE INDEX idx_password_resets_admin ON auth.password_resets(realizado_por);
CREATE INDEX idx_password_resets_usuario ON auth.password_resets(id_usuario);
CREATE INDEX idx_password_resets_target ON auth.password_resets(target_user_id);
CREATE INDEX idx_password_resets_date ON auth.password_resets(created_at);
CREATE INDEX idx_auditoria_usuario ON system.log_auditoria(id_usuario);
CREATE INDEX idx_auditoria_tabla ON system.log_auditoria(tabla_afectada);
CREATE INDEX idx_auditoria_fecha ON system.log_auditoria(fecha);
