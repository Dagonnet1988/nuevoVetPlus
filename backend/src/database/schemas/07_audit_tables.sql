-- ===========================================
-- VETPLUS - TABLAS ADICIONALES DE AUDITORÍA
-- ===========================================

-- Tabla para log de actividades de usuarios (más granular que log_auditoria)
CREATE TABLE IF NOT EXISTS system.activity_log (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES auth.usuarios(id_usuario) ON DELETE SET NULL,
    tipo_actividad VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, READ, etc.
    descripcion TEXT NOT NULL,
    url VARCHAR(500) NOT NULL,
    metodo_http VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    duracion_ms INTEGER, -- Duración de la request en milisegundos
    ip_address INET,
    user_agent TEXT,
    request_data JSONB, -- Datos del request (sanitizados)
    response_data JSONB, -- Datos de respuesta (solo para requests críticas)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla específica para auditoría de sesiones
CREATE TABLE IF NOT EXISTS system.session_audit (
    id_session UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES auth.usuarios(id_usuario) ON DELETE SET NULL,
    tipo_evento VARCHAR(20) NOT NULL, -- LOGIN, LOGOUT, SESSION_EXPIRED, FORCE_LOGOUT
    exito BOOLEAN NOT NULL DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    detalles JSONB, -- Información adicional del evento
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para rastrear accesos a datos sensibles
CREATE TABLE IF NOT EXISTS system.sensitive_access_log (
    id_access UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES auth.usuarios(id_usuario) ON DELETE SET NULL,
    tipo_datos VARCHAR(50) NOT NULL, -- MEDICAL_RECORD, FINANCIAL_REPORT, CLIENT_DATA, etc.
    tabla_accedida VARCHAR(100),
    id_entidad_accedida VARCHAR(100),
    accion VARCHAR(20) NOT NULL, -- VIEW, EXPORT, PRINT, DOWNLOAD
    motivo TEXT, -- Motivo del acceso (opcional)
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para configuration changes (cambios de configuración)
CREATE TABLE IF NOT EXISTS system.config_changes_log (
    id_change UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID REFERENCES auth.usuarios(id_usuario) ON DELETE SET NULL,
    tipo_configuracion VARCHAR(100) NOT NULL, -- USER_ROLE, SYSTEM_SETTING, PERMISSIONS, etc.
    configuracion_anterior JSONB,
    configuracion_nueva JSONB,
    descripcion TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_activity_log_usuario_timestamp ON system.activity_log(id_usuario, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_tipo_timestamp ON system.activity_log(tipo_actividad, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_url ON system.activity_log(url);
CREATE INDEX IF NOT EXISTS idx_activity_log_status ON system.activity_log(status_code, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_session_audit_usuario ON system.session_audit(id_usuario, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_audit_tipo ON system.session_audit(tipo_evento, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_audit_ip ON system.session_audit(ip_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_usuario ON system.sensitive_access_log(id_usuario, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_tipo ON system.sensitive_access_log(tipo_datos, timestamp DESC);

-- Vistas útiles para consultas de auditoría

-- Vista consolidada de actividades con información de usuario
CREATE OR REPLACE VIEW system.v_user_activities AS
SELECT 
    al.id_log,
    al.tipo_actividad,
    al.descripcion,
    al.url,
    al.metodo_http,
    al.status_code,
    al.duracion_ms,
    al.ip_address,
    al.timestamp,
    u.email as usuario_email,
    u.rol as usuario_rol,
    u.nombre as usuario_nombre,
    CASE 
        WHEN al.status_code >= 400 THEN 'ERROR'
        WHEN al.status_code >= 300 THEN 'REDIRECT'
        WHEN al.status_code >= 200 THEN 'SUCCESS'
        ELSE 'UNKNOWN'
    END as resultado
FROM system.activity_log al
LEFT JOIN auth.usuarios u ON al.id_usuario = u.id_usuario
ORDER BY al.timestamp DESC;

-- Vista de actividades sospechosas
CREATE OR REPLACE VIEW system.v_suspicious_activities AS
SELECT 
    al.*,
    u.email as usuario_email,
    u.rol as usuario_rol
FROM system.activity_log al
LEFT JOIN auth.usuarios u ON al.id_usuario = u.id_usuario
WHERE 
    al.status_code >= 400 -- Requests fallidas
    OR al.tipo_actividad IN ('PASSWORD_RESET', 'FORCE_LOGOUT')
    OR (al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour' 
        AND al.ip_address IN (
            SELECT ip_address 
            FROM system.activity_log 
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
            GROUP BY ip_address 
            HAVING COUNT(*) > 100 -- Más de 100 requests por hora
        ))
ORDER BY al.timestamp DESC;

-- Vista de sesiones de usuarios
CREATE OR REPLACE VIEW system.v_user_sessions AS
SELECT 
    sa.id_session,
    sa.tipo_evento,
    sa.exito,
    sa.ip_address,
    sa.timestamp,
    u.email as usuario_email,
    u.rol as usuario_rol,
    u.activo as usuario_activo
FROM system.session_audit sa
LEFT JOIN auth.usuarios u ON sa.id_usuario = u.id_usuario
ORDER BY sa.timestamp DESC;

-- Vista de accesos a datos médicos
CREATE OR REPLACE VIEW system.v_medical_data_access AS
SELECT 
    sal.id_access,
    sal.tipo_datos,
    sal.tabla_accedida,
    sal.id_entidad_accedida,
    sal.accion,
    sal.motivo,
    sal.ip_address,
    sal.timestamp,
    u.email as usuario_email,
    u.rol as usuario_rol
FROM system.sensitive_access_log sal
LEFT JOIN auth.usuarios u ON sal.id_usuario = u.id_usuario
WHERE sal.tipo_datos IN ('MEDICAL_RECORD', 'CLINICAL_CONSULTATION', 'PET_HISTORY')
ORDER BY sal.timestamp DESC;

-- Función para limpiar logs antiguos (retención de datos)
CREATE OR REPLACE FUNCTION system.cleanup_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    -- Eliminar activity logs antiguos (excepto logs críticos)
    DELETE FROM system.activity_log 
    WHERE timestamp < cutoff_date 
    AND tipo_actividad NOT IN ('LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'MEDICAL_ACCESS');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Eliminar session audit logs antiguos
    DELETE FROM system.session_audit 
    WHERE timestamp < cutoff_date;
    
    -- Mantener logs de acceso a datos sensibles por más tiempo
    DELETE FROM system.sensitive_access_log 
    WHERE timestamp < (cutoff_date - INTERVAL '730 days'); -- 2 años para datos médicos
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para generar reporte de auditoría
CREATE OR REPLACE FUNCTION system.generate_audit_report(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_activities BIGINT,
    successful_activities BIGINT,
    failed_activities BIGINT,
    login_attempts BIGINT,
    successful_logins BIGINT,
    medical_accesses BIGINT,
    top_user_email TEXT,
    top_user_activities BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM system.activity_log al 
         WHERE al.timestamp BETWEEN start_date AND end_date 
         AND (user_id IS NULL OR al.id_usuario = user_id))::BIGINT,
        
        (SELECT COUNT(*) FROM system.activity_log al 
         WHERE al.timestamp BETWEEN start_date AND end_date 
         AND al.status_code < 400
         AND (user_id IS NULL OR al.id_usuario = user_id))::BIGINT,
        
        (SELECT COUNT(*) FROM system.activity_log al 
         WHERE al.timestamp BETWEEN start_date AND end_date 
         AND al.status_code >= 400
         AND (user_id IS NULL OR al.id_usuario = user_id))::BIGINT,
        
        (SELECT COUNT(*) FROM system.session_audit sa 
         WHERE sa.timestamp BETWEEN start_date AND end_date 
         AND sa.tipo_evento = 'LOGIN'
         AND (user_id IS NULL OR sa.id_usuario = user_id))::BIGINT,
        
        (SELECT COUNT(*) FROM system.session_audit sa 
         WHERE sa.timestamp BETWEEN start_date AND end_date 
         AND sa.tipo_evento = 'LOGIN' AND sa.exito = true
         AND (user_id IS NULL OR sa.id_usuario = user_id))::BIGINT,
        
        (SELECT COUNT(*) FROM system.activity_log al 
         WHERE al.timestamp BETWEEN start_date AND end_date 
         AND al.tipo_actividad = 'MEDICAL_ACCESS'
         AND (user_id IS NULL OR al.id_usuario = user_id))::BIGINT,
        
        (SELECT u.email FROM system.activity_log al 
         JOIN auth.usuarios u ON al.id_usuario = u.id_usuario
         WHERE al.timestamp BETWEEN start_date AND end_date
         AND (user_id IS NULL OR al.id_usuario = user_id)
         GROUP BY u.email 
         ORDER BY COUNT(*) DESC 
         LIMIT 1)::TEXT,
        
        (SELECT COUNT(*) FROM system.activity_log al 
         JOIN auth.usuarios u ON al.id_usuario = u.id_usuario
         WHERE al.timestamp BETWEEN start_date AND end_date
         AND (user_id IS NULL OR al.id_usuario = user_id)
         GROUP BY u.email 
         ORDER BY COUNT(*) DESC 
         LIMIT 1)::BIGINT;
END;
$$ LANGUAGE plpgsql;