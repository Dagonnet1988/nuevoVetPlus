-- =====================================================
-- MIGRACIÓN DE DATOS: auth -> vetplus_auth
-- =====================================================
-- Fecha: 2025-08-21
-- Propósito: Migrar todos los datos del esquema auth al esquema vetplus_auth
-- =====================================================

BEGIN;

-- Deshabilitar triggers temporalmente para evitar conflictos
ALTER TABLE vetplus_auth.usuarios DISABLE TRIGGER audit_usuarios;
ALTER TABLE vetplus_auth.password_resets DISABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.sesiones DISABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.blacklisted_tokens DISABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.google_calendar_config DISABLE TRIGGER ALL;

-- =====================================================
-- 1. MIGRAR USUARIOS
-- =====================================================
DO $$
BEGIN
    -- Eliminar el usuario admin temporal que creamos
    DELETE FROM vetplus_auth.usuarios WHERE email = 'admin@vetplus.com' AND documento = '12345678';
    
    -- Migrar usuarios desde auth.usuarios
    INSERT INTO vetplus_auth.usuarios (
        id_usuario,
        nombre,
        apellido,
        email,
        documento,
        tipo_documento,
        telefono,
        direccion,
        password_hash,
        rol,
        especialidad,
        numero_licencia,
        activo,
        ultimo_login,
        intentos_login,
        bloqueado_hasta,
        password_temporal,
        debe_cambiar_password,
        password_reset_date,
        password_reset_by,
        created_at,
        updated_at
    )
    SELECT 
        id_usuario,
        nombre,
        COALESCE(apellido, 'Sin Apellido') as apellido, -- Manejar NULLs para apellido
        email,
        COALESCE(documento, 'SIN_DOC_' || id_usuario::text) as documento, -- Manejar NULLs para documento
        tipo_documento,
        telefono,
        direccion,
        password_hash,
        rol,
        especialidad,
        numero_licencia,
        activo,
        ultimo_login,
        intentos_login,
        bloqueado_hasta,
        password_temporal,
        debe_cambiar_password,
        password_reset_date,
        password_reset_by,
        created_at,
        updated_at
    FROM auth.usuarios
    ON CONFLICT (email) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        documento = EXCLUDED.documento,
        updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Migración de usuarios completada';
END $$;

-- =====================================================
-- 2. MIGRAR PASSWORD_RESETS
-- =====================================================
INSERT INTO vetplus_auth.password_resets (
    id,
    id_usuario,
    tipo_reset,
    realizado_por,
    motivo,
    completado,
    created_at,
    completed_at
)
SELECT 
    id,
    id_usuario,
    tipo_reset,
    realizado_por,
    motivo,
    completado,
    created_at,
    completed_at
FROM auth.password_resets
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. MIGRAR SESIONES
-- =====================================================
INSERT INTO vetplus_auth.sesiones (
    id_sesion,
    id_usuario,
    token_jti,
    ip_address,
    user_agent,
    expira_en,
    revocado,
    created_at
)
SELECT 
    id_sesion,
    id_usuario,
    token_jti,
    ip_address,
    user_agent,
    expira_en,
    revocado,
    created_at
FROM auth.sesiones
ON CONFLICT (id_sesion) DO NOTHING;

-- =====================================================
-- 4. MIGRAR BLACKLISTED_TOKENS
-- =====================================================
INSERT INTO vetplus_auth.blacklisted_tokens (
    id_token,
    token,
    id_usuario,
    razon,
    created_at
)
SELECT 
    id,
    token,
    id_usuario,
    razon,
    created_at
FROM auth.blacklisted_tokens
ON CONFLICT (id_token) DO NOTHING;

-- =====================================================
-- 5. MIGRAR GOOGLE_CALENDAR_CONFIG
-- =====================================================
INSERT INTO vetplus_auth.google_calendar_config (
    id_config,
    client_id,
    client_secret,
    redirect_uri,
    refresh_token,
    access_token,
    token_expiry,
    calendar_id,
    timezone,
    notification_email,
    notification_popup,
    default_reminder_minutes,
    email_reminder_hours,
    is_active,
    configured_by,
    webhook_channel_id,
    webhook_url,
    webhook_expiration,
    webhook_resource_id,
    created_at,
    updated_at
)
SELECT 
    id_config,
    client_id,
    client_secret,
    redirect_uri,
    refresh_token,
    access_token,
    token_expiry,
    calendar_id,
    timezone,
    notification_email,
    notification_popup,
    default_reminder_minutes,
    email_reminder_hours,
    is_active,
    configured_by,
    webhook_channel_id,
    webhook_url,
    webhook_expiration,
    webhook_resource_id,
    created_at,
    updated_at
FROM auth.google_calendar_config
ON CONFLICT (id_config) DO NOTHING;

-- =====================================================
-- 6. REACTIVAR TRIGGERS
-- =====================================================
ALTER TABLE vetplus_auth.usuarios ENABLE TRIGGER audit_usuarios;
ALTER TABLE vetplus_auth.password_resets ENABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.sesiones ENABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.blacklisted_tokens ENABLE TRIGGER ALL;
ALTER TABLE vetplus_auth.google_calendar_config ENABLE TRIGGER ALL;

-- =====================================================
-- 7. VERIFICACIÓN DE MIGRACIÓN
-- =====================================================
DO $$
DECLARE
    auth_count INTEGER;
    vetplus_auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.usuarios;
    SELECT COUNT(*) INTO vetplus_auth_count FROM vetplus_auth.usuarios;
    
    RAISE NOTICE 'Usuarios en auth: %, Usuarios en vetplus_auth: %', auth_count, vetplus_auth_count;
    
    IF auth_count = vetplus_auth_count THEN
        RAISE NOTICE '✅ Migración exitosa: Mismo número de usuarios en ambos esquemas';
    ELSE
        RAISE WARNING '⚠️  Diferencia en número de usuarios. Revisar migración.';
    END IF;
END $$;

-- =====================================================
-- 8. RESUMEN FINAL
-- =====================================================
SELECT 
    'RESUMEN DE MIGRACIÓN' as tipo,
    (SELECT COUNT(*) FROM vetplus_auth.usuarios) as usuarios_migrados,
    (SELECT COUNT(*) FROM vetplus_auth.password_resets) as password_resets_migrados,
    (SELECT COUNT(*) FROM vetplus_auth.sesiones) as sesiones_migradas,
    (SELECT COUNT(*) FROM vetplus_auth.blacklisted_tokens) as tokens_migrados,
    (SELECT COUNT(*) FROM vetplus_auth.google_calendar_config) as configs_migradas;

COMMIT;

-- =====================================================
-- NOTAS POST-MIGRACIÓN:
-- =====================================================
-- 1. Verificar que todas las aplicaciones apunten al esquema vetplus_auth
-- 2. Una vez confirmado el funcionamiento, considerar eliminar el esquema auth
-- 3. Actualizar todas las referencias en el código y triggers
-- =====================================================