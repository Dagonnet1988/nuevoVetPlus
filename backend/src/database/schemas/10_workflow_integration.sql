-- ===========================================
-- VETPLUS - INTEGRACIONES DE WORKFLOW
-- Archivo: 10_workflow_integration.sql
-- ===========================================

-- Agregar campos de integración entre citas, consultas y facturas
ALTER TABLE clinical.calendario_citas 
ADD COLUMN IF NOT EXISTS id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta);

ALTER TABLE clinical.consultas_clinicas 
ADD COLUMN IF NOT EXISTS id_cita UUID REFERENCES clinical.calendario_citas(id_cita);

ALTER TABLE financial.facturas_venta 
ADD COLUMN IF NOT EXISTS id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_citas_consulta ON clinical.calendario_citas(id_consulta);
CREATE INDEX IF NOT EXISTS idx_consultas_cita ON clinical.consultas_clinicas(id_cita);
CREATE INDEX IF NOT EXISTS idx_facturas_consulta ON financial.facturas_venta(id_consulta);

-- ===========================================
-- CONFIGURACIONES DE NOTIFICACIONES AUTOMÁTICAS
-- ===========================================

-- Agregar configuraciones de notificaciones a la tabla de empresa
ALTER TABLE system.configuracion_empresa
ADD COLUMN IF NOT EXISTS notificaciones_activas BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_cita_confirmada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notif_cita_recordatorio_24h BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notif_cita_recordatorio_2h BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notif_cita_completada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notif_factura_automatica BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notif_seguimiento_medicamentos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS limite_diario_mensajes INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS intervalo_minimo_minutos INTEGER DEFAULT 5;

-- Mensajes personalizables para notificaciones
ALTER TABLE system.configuracion_empresa
ADD COLUMN IF NOT EXISTS mensaje_cita_confirmada TEXT DEFAULT 'Hola {cliente_nombre}, tu cita para {mascota_nombre} ha sido confirmada para el {fecha} a las {hora}. ¡Te esperamos! - {empresa}',
ADD COLUMN IF NOT EXISTS mensaje_recordatorio_24h TEXT DEFAULT 'Hola {cliente_nombre}, recordatorio: tienes una cita mañana para {mascota_nombre} a las {hora}. - {empresa}',
ADD COLUMN IF NOT EXISTS mensaje_recordatorio_2h TEXT DEFAULT 'Hola {cliente_nombre}, tu cita para {mascota_nombre} es en 2 horas. Te esperamos puntual. - {empresa}',
ADD COLUMN IF NOT EXISTS mensaje_cita_completada TEXT DEFAULT 'Hola {cliente_nombre}, gracias por visitarnos. Aquí tienes el resumen de la consulta de {mascota_nombre}. - {empresa}',
ADD COLUMN IF NOT EXISTS mensaje_seguimiento TEXT DEFAULT 'Hola {cliente_nombre}, ¿cómo sigue {mascota_nombre} después del tratamiento? No olvides los medicamentos. - {empresa}';

-- Tabla para controlar límites de envío diario
CREATE TABLE IF NOT EXISTS system.whatsapp_limits (
    fecha DATE PRIMARY KEY,
    mensajes_enviados INTEGER DEFAULT 0,
    limite_diario INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para programar notificaciones automáticas
CREATE TABLE IF NOT EXISTS system.notificaciones_programadas (
    id_notificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_notificacion VARCHAR(50) NOT NULL, -- 'recordatorio_24h', 'recordatorio_2h', 'seguimiento'
    id_cita UUID REFERENCES clinical.calendario_citas(id_cita),
    id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta),
    numero_telefono VARCHAR(20) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_programada TIMESTAMP NOT NULL,
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP,
    error_envio TEXT,
    intentos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para notificaciones programadas
CREATE INDEX IF NOT EXISTS idx_notif_programadas_fecha ON system.notificaciones_programadas(fecha_programada) WHERE enviado = false;
CREATE INDEX IF NOT EXISTS idx_notif_programadas_tipo ON system.notificaciones_programadas(tipo_notificacion);

-- Función para verificar límite diario de mensajes
CREATE OR REPLACE FUNCTION check_daily_message_limit()
RETURNS BOOLEAN AS $$
DECLARE
    today_count INTEGER;
    daily_limit INTEGER;
BEGIN
    -- Obtener límite configurado
    SELECT limite_diario_mensajes INTO daily_limit
    FROM system.configuracion_empresa 
    WHERE activa = true;
    
    IF daily_limit IS NULL THEN
        daily_limit := 50; -- Valor por defecto
    END IF;
    
    -- Obtener mensajes enviados hoy
    SELECT COALESCE(mensajes_enviados, 0) INTO today_count
    FROM system.whatsapp_limits 
    WHERE fecha = CURRENT_DATE;
    
    RETURN today_count < daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar contador de mensajes
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS VOID AS $$
BEGIN
    INSERT INTO system.whatsapp_limits (fecha, mensajes_enviados)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (fecha)
    DO UPDATE SET 
        mensajes_enviados = system.whatsapp_limits.mensajes_enviados + 1,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-incrementar contador al enviar mensajes
CREATE OR REPLACE FUNCTION auto_increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'sent' AND OLD.estado != 'sent' THEN
        PERFORM increment_message_count();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_increment_message_count') THEN
        CREATE TRIGGER trigger_auto_increment_message_count
        AFTER UPDATE ON system.whatsapp_log
        FOR EACH ROW
        EXECUTE FUNCTION auto_increment_message_count();
    END IF;
END;
$$;

-- ===========================================
-- NOTIFICACIONES AUTOMÁTICAS
-- ===========================================

-- Agregar configuración de notificaciones automáticas a whatsapp_config
DO $$
BEGIN
    -- Verificar si la tabla whatsapp_config existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'system' 
        AND table_name = 'whatsapp_config'
    ) THEN
        -- Agregar campos de notificaciones automáticas si no existen
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'system' 
            AND table_name = 'whatsapp_config' 
            AND column_name = 'notificaciones_automaticas'
        ) THEN
            ALTER TABLE system.whatsapp_config 
            ADD COLUMN notificaciones_automaticas JSONB DEFAULT '{"activo": false, "auto_cita_confirmada": false, "auto_cita_recordatorio": true, "auto_consulta_completada": false, "auto_factura_generada": false, "limite_diario": 50, "intervalo_minimo_minutos": 5}'::jsonb;
            
            COMMENT ON COLUMN system.whatsapp_config.notificaciones_automaticas IS 'Configuración de notificaciones automáticas de WhatsApp';
        END IF;
        
        -- Agregar índice para búsquedas por estado activo de notificaciones
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'system' 
            AND tablename = 'whatsapp_config' 
            AND indexname = 'idx_whatsapp_notif_activo'
        ) THEN
            CREATE INDEX idx_whatsapp_notif_activo ON system.whatsapp_config 
            USING GIN ((notificaciones_automaticas->'activo'));
        END IF;
    END IF;
END $$;

-- Crear tabla para log específico de notificaciones automáticas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'system' 
        AND table_name = 'notificaciones_automaticas_log'
    ) THEN
        CREATE TABLE system.notificaciones_automaticas_log (
            id_notificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tipo_evento VARCHAR(50) NOT NULL, -- 'cita_confirmada', 'cita_recordatorio', 'consulta_completada', 'factura_generada'
            id_referencia UUID NOT NULL, -- ID de la cita, consulta o factura
            numero_destino VARCHAR(20) NOT NULL,
            mensaje TEXT NOT NULL,
            estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'enviado', 'fallido', 'cancelado'
            intentos INTEGER DEFAULT 0,
            max_intentos INTEGER DEFAULT 3,
            fecha_programada TIMESTAMP NOT NULL, -- Cuándo debe enviarse
            fecha_envio TIMESTAMP, -- Cuándo se envió realmente
            error_mensaje TEXT,
            metadata JSONB, -- Información adicional (nombre cliente, mascota, etc.)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Índices para optimizar consultas
        CREATE INDEX idx_notif_auto_tipo ON system.notificaciones_automaticas_log(tipo_evento);
        CREATE INDEX idx_notif_auto_estado ON system.notificaciones_automaticas_log(estado);
        CREATE INDEX idx_notif_auto_programada ON system.notificaciones_automaticas_log(fecha_programada);
        CREATE INDEX idx_notif_auto_referencia ON system.notificaciones_automaticas_log(id_referencia);
        CREATE INDEX idx_notif_auto_pendientes ON system.notificaciones_automaticas_log(estado, fecha_programada) 
            WHERE estado IN ('pendiente', 'fallido');
        
        -- Comentarios
        COMMENT ON TABLE system.notificaciones_automaticas_log IS 'Log específico para notificaciones automáticas de WhatsApp';
        COMMENT ON COLUMN system.notificaciones_automaticas_log.fecha_programada IS 'Timestamp programado para el envío de la notificación';
        COMMENT ON COLUMN system.notificaciones_automaticas_log.metadata IS 'Datos del cliente, mascota y evento en formato JSON';
    END IF;
END $$;

-- Crear tabla para control de límites diarios de notificaciones automáticas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'system' 
        AND table_name = 'notificaciones_automaticas_limites'
    ) THEN
        CREATE TABLE system.notificaciones_automaticas_limites (
            fecha DATE PRIMARY KEY DEFAULT CURRENT_DATE,
            mensajes_enviados INTEGER DEFAULT 0,
            limite_configurado INTEGER DEFAULT 50,
            ultimo_mensaje TIMESTAMP,
            eventos_por_tipo JSONB DEFAULT '{"cita_confirmada": 0, "cita_recordatorio": 0, "consulta_completada": 0, "factura_generada": 0}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        COMMENT ON TABLE system.notificaciones_automaticas_limites IS 'Control de límites diarios específico para notificaciones automáticas';
        COMMENT ON COLUMN system.notificaciones_automaticas_limites.eventos_por_tipo IS 'Contador de eventos por tipo en formato JSON';
    END IF;
END $$;

-- Trigger para actualizar updated_at en notificaciones_automaticas_log
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_schema = 'system' 
        AND trigger_name = 'trigger_update_notif_auto_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION system.update_notif_auto_timestamp()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
        
        CREATE TRIGGER trigger_update_notif_auto_timestamp
            BEFORE UPDATE ON system.notificaciones_automaticas_log
            FOR EACH ROW
            EXECUTE FUNCTION system.update_notif_auto_timestamp();
    END IF;
END $$;

-- Función para incrementar contador de notificaciones automáticas
CREATE OR REPLACE FUNCTION system.increment_auto_notification_count(evento_tipo VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    INSERT INTO system.notificaciones_automaticas_limites (fecha, mensajes_enviados, eventos_por_tipo)
    VALUES (
        CURRENT_DATE, 
        1,
        jsonb_build_object(evento_tipo, 1)
    )
    ON CONFLICT (fecha)
    DO UPDATE SET 
        mensajes_enviados = system.notificaciones_automaticas_limites.mensajes_enviados + 1,
        eventos_por_tipo = system.notificaciones_automaticas_limites.eventos_por_tipo || 
            jsonb_build_object(evento_tipo, 
                COALESCE((system.notificaciones_automaticas_limites.eventos_por_tipo->>evento_tipo)::integer, 0) + 1
            ),
        ultimo_mensaje = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Log final de inicialización
INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'system.notificaciones_automaticas',
    'CREATE',
    'Configuración completa de notificaciones automáticas de WhatsApp integradas al workflow'
) ON CONFLICT DO NOTHING;
