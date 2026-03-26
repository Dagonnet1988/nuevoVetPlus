-- ===========================================
-- VETPLUS - CONSTRAINTS ADICIONALES Y TRIGGERS
-- ===========================================

-- Función para auditoría automática
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    user_id UUID;
BEGIN
    -- Intentar obtener el user_id del contexto actual
    user_id := current_setting('app.current_user_id', true)::UUID;
    
    INSERT INTO system.log_auditoria (
        id_usuario,
        tabla_afectada,
        id_entidad_afectada,
        tipo_accion,
        descripcion,
        data_anterior,
        data_nueva
    ) VALUES (
        user_id,
        table_name,
        'auto-generated', -- Simplificamos para evitar errores de campos
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE TG_OP
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE TG_OP
        END || ' en ' || table_name,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas principales (ejemplo para algunas tablas críticas)
CREATE TRIGGER audit_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON vetplus_auth.usuarios
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ===========================================
-- TRIGGERS ESPECÍFICOS PARA GOOGLE CALENDAR
-- ===========================================

-- Trigger para updated_at en Google Calendar config
CREATE OR REPLACE FUNCTION update_google_calendar_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_google_calendar_config_updated_at
    BEFORE UPDATE ON vetplus_auth.google_calendar_config
    FOR EACH ROW
    EXECUTE FUNCTION update_google_calendar_config_updated_at();

-- Función específica para auditoría de Google Calendar config
CREATE OR REPLACE FUNCTION audit_google_calendar_config()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO system.log_auditoria (
            tabla_afectada, 
            id_entidad_afectada, 
            tipo_accion, 
            data_nueva, 
            id_usuario
        ) VALUES (
            'google_calendar_config',
            NEW.id_config::text,
            'CREATE',
            row_to_json(NEW)::jsonb,
            NEW.configured_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO system.log_auditoria (
            tabla_afectada, 
            id_entidad_afectada, 
            tipo_accion, 
            data_anterior,
            data_nueva,
            id_usuario
        ) VALUES (
            'google_calendar_config',
            NEW.id_config::text,
            'UPDATE',
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            NEW.configured_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO system.log_auditoria (
            tabla_afectada, 
            id_entidad_afectada, 
            tipo_accion, 
            data_anterior
        ) VALUES (
            'google_calendar_config',
            OLD.id_config::text,
            'DELETE',
            row_to_json(OLD)::jsonb
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoría de Google Calendar config
CREATE OR REPLACE TRIGGER tr_audit_google_calendar_config
    AFTER INSERT OR UPDATE OR DELETE ON vetplus_auth.google_calendar_config
    FOR EACH ROW
    EXECUTE FUNCTION audit_google_calendar_config();

-- Función específica para auditoría de sincronización de Google Calendar en citas
CREATE OR REPLACE FUNCTION audit_google_calendar_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo auditar cuando cambien campos relacionados con Google Calendar
    IF TG_OP = 'UPDATE' AND (
        NEW.google_event_id IS DISTINCT FROM OLD.google_event_id OR
        NEW.google_sync_status IS DISTINCT FROM OLD.google_sync_status OR
        NEW.google_sync_error IS DISTINCT FROM OLD.google_sync_error OR
        NEW.last_google_sync IS DISTINCT FROM OLD.last_google_sync
    ) THEN
        INSERT INTO system.log_auditoria (
            tabla_afectada, 
            id_entidad_afectada, 
            tipo_accion, 
            data_anterior,
            data_nueva,
            descripcion,
            id_usuario
        ) VALUES (
            'calendario_citas_google_sync',
            NEW.id_cita::text,
            'UPDATE',
            jsonb_build_object(
                'google_event_id', OLD.google_event_id,
                'google_sync_status', OLD.google_sync_status,
                'google_sync_error', OLD.google_sync_error,
                'last_google_sync', OLD.last_google_sync
            ),
            jsonb_build_object(
                'google_event_id', NEW.google_event_id,
                'google_sync_status', NEW.google_sync_status,
                'google_sync_error', NEW.google_sync_error,
                'last_google_sync', NEW.last_google_sync
            ),
            'Sincronización Google Calendar actualizada',
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoría de sincronización de Google Calendar en citas
CREATE OR REPLACE TRIGGER tr_audit_google_calendar_sync
    AFTER UPDATE ON clinical.calendario_citas
    FOR EACH ROW
    EXECUTE FUNCTION audit_google_calendar_sync();


-- Validaciones adicionales con CHECK constraints
ALTER TABLE clinical.calendario_citas 
ADD CONSTRAINT check_fechas_validas 
CHECK (fecha_fin > fecha_inicio);