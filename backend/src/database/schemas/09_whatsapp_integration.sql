-- ===========================================
-- VETPLUS - INTEGRACIÓN WHATSAPP BUSINESS
-- ===========================================

-- Tabla para log de mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS system.whatsapp_log (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(100), -- ID del mensaje de WhatsApp
    numero_destino VARCHAR(20) NOT NULL,
    tipo_mensaje VARCHAR(20) NOT NULL, -- text, document, image, etc.
    contenido TEXT,
    estado VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    respuesta_api JSONB, -- Respuesta completa de la API
    detalles_estado JSONB, -- Detalles adicionales del estado
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE,
    
    -- Metadatos adicionales
    id_factura UUID REFERENCES financial.facturas_venta(id_factura),
    id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta),
    tipo_documento VARCHAR(20), -- 'factura', 'formula', 'resultado', etc.
    intentos INTEGER DEFAULT 1,
    error_message TEXT
);

-- Agregar campos de WhatsApp a tabla de facturas
ALTER TABLE financial.facturas_venta 
ADD COLUMN IF NOT EXISTS whatsapp_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_envio_whatsapp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS telefono_envio VARCHAR(20);

-- Agregar campos de WhatsApp a consultas clínicas
ALTER TABLE clinical.consultas_clinicas 
ADD COLUMN IF NOT EXISTS formula_enviada_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_envio_formula TIMESTAMP WITH TIME ZONE;

-- Tabla para templates de mensajes personalizables
CREATE TABLE IF NOT EXISTS system.whatsapp_templates (
    id_template UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- factura, formula, cita, recordatorio, etc.
    plantilla TEXT NOT NULL, -- Template con placeholders {variable}
    variables JSONB, -- Array de variables disponibles
    activo BOOLEAN DEFAULT true,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Insertar templates por defecto
INSERT INTO system.whatsapp_templates (nombre, tipo, plantilla, variables, descripcion) VALUES
(
    'factura_default',
    'factura',
    'Hola {cliente_nombre}! 👋\n\nTe enviamos tu factura #{numero_factura} de {empresa} por un valor de ${total}.\n\nFecha: {fecha}\n\n¡Gracias por confiar en nosotros para el cuidado de tu mascota! 🐾',
    '["cliente_nombre", "numero_factura", "empresa", "total", "fecha"]',
    'Template por defecto para envío de facturas'
),
(
    'formula_default', 
    'formula',
    'Hola {cliente_nombre}! 👋\n\nTe enviamos la fórmula médica para {mascota_nombre} después de la consulta con el Dr. {veterinario}.\n\n⚠️ *IMPORTANTE:* Sigue estrictamente las indicaciones del veterinario.\n\nCualquier duda, no dudes en contactarnos.\n\n🏥 {empresa}',
    '["cliente_nombre", "mascota_nombre", "veterinario", "empresa"]',
    'Template por defecto para envío de fórmulas médicas'
),
(
    'cita_recordatorio',
    'recordatorio', 
    'Hola {cliente_nombre}! 👋\n\nTe recordamos que {mascota_nombre} tiene cita programada para mañana {fecha} a las {hora}.\n\n📍 {empresa}\n📞 {telefono_empresa}\n\n¡Te esperamos! 🐾',
    '["cliente_nombre", "mascota_nombre", "fecha", "hora", "empresa", "telefono_empresa"]',
    'Template para recordatorios de citas'
),
(
    'resultado_examen',
    'resultado',
    'Hola {cliente_nombre}! 👋\n\nYa están listos los resultados de los exámenes de {mascota_nombre}.\n\nPuedes pasar a recogerlos en horario de atención o podemos enviártelos por este medio.\n\n🏥 {empresa}\n📞 {telefono_empresa}',
    '["cliente_nombre", "mascota_nombre", "empresa", "telefono_empresa"]', 
    'Template para notificar resultados de exámenes'
);

-- Función para obtener template personalizado
CREATE OR REPLACE FUNCTION get_whatsapp_template(template_name VARCHAR(100))
RETURNS TABLE(
    plantilla TEXT,
    variables JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT wt.plantilla, wt.variables
    FROM system.whatsapp_templates wt
    WHERE wt.nombre = template_name AND wt.activo = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para procesar template con variables
CREATE OR REPLACE FUNCTION process_whatsapp_template(
    template_name VARCHAR(100),
    variables_data JSONB
)
RETURNS TEXT AS $$
DECLARE
    template_text TEXT;
    key TEXT;
    value TEXT;
BEGIN
    -- Obtener template
    SELECT plantilla INTO template_text
    FROM system.whatsapp_templates
    WHERE nombre = template_name AND activo = true
    LIMIT 1;
    
    IF template_text IS NULL THEN
        RAISE EXCEPTION 'Template % no encontrado', template_name;
    END IF;
    
    -- Reemplazar variables
    FOR key, value IN SELECT * FROM jsonb_each_text(variables_data)
    LOOP
        template_text := REPLACE(template_text, '{' || key || '}', COALESCE(value, ''));
    END LOOP;
    
    RETURN template_text;
END;
$$ LANGUAGE plpgsql;

-- Vista para estadísticas de WhatsApp
CREATE OR REPLACE VIEW system.v_whatsapp_stats AS
SELECT 
    DATE_TRUNC('day', fecha) as fecha_dia,
    COUNT(*) as total_mensajes,
    COUNT(*) FILTER (WHERE estado = 'sent') as mensajes_enviados,
    COUNT(*) FILTER (WHERE estado = 'delivered') as mensajes_entregados, 
    COUNT(*) FILTER (WHERE estado = 'read') as mensajes_leidos,
    COUNT(*) FILTER (WHERE estado = 'failed') as mensajes_fallidos,
    COUNT(*) FILTER (WHERE tipo_mensaje = 'text') as mensajes_texto,
    COUNT(*) FILTER (WHERE tipo_mensaje = 'document') as documentos_enviados,
    COUNT(*) FILTER (WHERE tipo_documento = 'factura') as facturas_enviadas,
    COUNT(*) FILTER (WHERE tipo_documento = 'formula') as formulas_enviadas
FROM system.whatsapp_log
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', fecha)
ORDER BY fecha_dia DESC;

-- Función para obtener estadísticas de WhatsApp por período
CREATE OR REPLACE FUNCTION get_whatsapp_stats_period(
    fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_mensajes BIGINT,
    mensajes_enviados BIGINT,
    mensajes_entregados BIGINT,
    mensajes_leidos BIGINT,
    mensajes_fallidos BIGINT,
    tasa_entrega DECIMAL(5,2),
    tasa_lectura DECIMAL(5,2),
    facturas_enviadas BIGINT,
    formulas_enviadas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_mensajes,
        COUNT(*) FILTER (WHERE wl.estado = 'sent')::BIGINT as mensajes_enviados,
        COUNT(*) FILTER (WHERE wl.estado = 'delivered')::BIGINT as mensajes_entregados,
        COUNT(*) FILTER (WHERE wl.estado = 'read')::BIGINT as mensajes_leidos,
        COUNT(*) FILTER (WHERE wl.estado = 'failed')::BIGINT as mensajes_fallidos,
        CASE 
            WHEN COUNT(*) FILTER (WHERE wl.estado = 'sent') > 0 THEN
                (COUNT(*) FILTER (WHERE wl.estado = 'delivered')::DECIMAL / COUNT(*) FILTER (WHERE wl.estado = 'sent') * 100)
            ELSE 0 
        END as tasa_entrega,
        CASE 
            WHEN COUNT(*) FILTER (WHERE wl.estado = 'delivered') > 0 THEN
                (COUNT(*) FILTER (WHERE wl.estado = 'read')::DECIMAL / COUNT(*) FILTER (WHERE wl.estado = 'delivered') * 100)
            ELSE 0 
        END as tasa_lectura,
        COUNT(*) FILTER (WHERE wl.tipo_documento = 'factura')::BIGINT as facturas_enviadas,
        COUNT(*) FILTER (WHERE wl.tipo_documento = 'formula')::BIGINT as formulas_enviadas
    FROM system.whatsapp_log wl
    WHERE wl.fecha::DATE BETWEEN fecha_inicio AND fecha_fin;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar logs antiguos de WhatsApp
CREATE OR REPLACE FUNCTION cleanup_whatsapp_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    DELETE FROM system.whatsapp_log 
    WHERE fecha < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Vista para mensajes fallidos que requieren reenvío
CREATE OR REPLACE VIEW system.v_whatsapp_failed_messages AS
SELECT 
    wl.id_log,
    wl.numero_destino,
    wl.tipo_documento,
    wl.contenido,
    wl.fecha,
    wl.intentos,
    wl.error_message,
    CASE 
        WHEN wl.id_factura IS NOT NULL THEN 
            (SELECT fv.numero_factura FROM financial.facturas_venta fv WHERE fv.id_factura = wl.id_factura)
        WHEN wl.id_consulta IS NOT NULL THEN
            (SELECT 'Consulta: ' || cc.fecha FROM clinical.consultas_clinicas cc WHERE cc.id_consulta = wl.id_consulta)
        ELSE 'N/A'
    END as documento_referencia
FROM system.whatsapp_log wl
WHERE wl.estado = 'failed' 
AND wl.intentos < 3 -- Solo mostrar los que pueden reintentarse
ORDER BY wl.fecha DESC;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_fecha ON system.whatsapp_log(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_estado ON system.whatsapp_log(estado);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_numero ON system.whatsapp_log(numero_destino);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_message_id ON system.whatsapp_log(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_tipo_documento ON system.whatsapp_log(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_nombre ON system.whatsapp_templates(nombre);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tipo ON system.whatsapp_templates(tipo);

-- Triggers para updated_at en templates
CREATE TRIGGER trigger_whatsapp_templates_updated_at
    BEFORE UPDATE ON system.whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Comentarios
COMMENT ON TABLE system.whatsapp_log IS 'Log de mensajes enviados por WhatsApp Business API';
COMMENT ON TABLE system.whatsapp_templates IS 'Templates personalizables para mensajes de WhatsApp';
COMMENT ON FUNCTION get_whatsapp_template IS 'Obtiene un template de WhatsApp por nombre';
COMMENT ON FUNCTION process_whatsapp_template IS 'Procesa un template reemplazando variables con valores';
COMMENT ON FUNCTION get_whatsapp_stats_period IS 'Obtiene estadísticas de WhatsApp para un período específico';
COMMENT ON VIEW system.v_whatsapp_stats IS 'Estadísticas diarias de mensajes de WhatsApp últimos 30 días';
COMMENT ON VIEW system.v_whatsapp_failed_messages IS 'Mensajes fallidos que pueden reintentarse';