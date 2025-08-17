-- =====================================================
-- MIGRACIÓN PARA NOTIFICACIONES AUTOMÁTICAS
-- Agregar campos necesarios para el sistema de recordatorios
-- =====================================================

-- Agregar campos de recordatorios a citas
ALTER TABLE clinical.calendario_citas 
ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_recordatorio TIMESTAMP WITH TIME ZONE;

-- Agregar campo de recordatorio de medicamentos a consultas clínicas
ALTER TABLE clinical.consultas_clinicas 
ADD COLUMN IF NOT EXISTS recordatorio_medicamentos_enviado BOOLEAN DEFAULT false;

-- Crear índices para optimizar las consultas de recordatorios
CREATE INDEX IF NOT EXISTS idx_citas_recordatorio_pendiente 
    ON clinical.calendario_citas(fecha_inicio) 
    WHERE recordatorio_enviado = false;

CREATE INDEX IF NOT EXISTS idx_consultas_medicamentos_pendientes 
    ON clinical.consultas_clinicas(fecha) 
    WHERE recordatorio_medicamentos_enviado = false;

-- Comentarios para documentación
COMMENT ON COLUMN clinical.calendario_citas.recordatorio_enviado IS 'Indica si ya se envió recordatorio de la cita por WhatsApp';
COMMENT ON COLUMN clinical.calendario_citas.fecha_recordatorio IS 'Fecha y hora en que se envió el recordatorio';
COMMENT ON COLUMN clinical.consultas_clinicas.recordatorio_medicamentos_enviado IS 'Indica si ya se envió recordatorio de medicamentos';

-- Función para resetear recordatorios (útil para testing)
CREATE OR REPLACE FUNCTION reset_recordatorios_citas(fecha_desde DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
BEGIN
    UPDATE clinical.calendario_citas 
    SET recordatorio_enviado = false, fecha_recordatorio = NULL
    WHERE DATE(fecha_inicio) >= fecha_desde;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Vista para monitorear recordatorios
CREATE OR REPLACE VIEW system.v_recordatorios_stats AS
SELECT 
    'citas' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE recordatorio_enviado = true) as enviados,
    COUNT(*) FILTER (WHERE recordatorio_enviado = false AND DATE(fecha_inicio) = CURRENT_DATE + INTERVAL '1 day') as pendientes_manana
FROM clinical.calendario_citas 
WHERE DATE(fecha_inicio) >= CURRENT_DATE
UNION ALL
SELECT 
    'medicamentos' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE recordatorio_medicamentos_enviado = true) as enviados,
    COUNT(*) FILTER (WHERE recordatorio_medicamentos_enviado = false) as pendientes_manana
FROM clinical.consultas_clinicas 
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' 
    AND medicamentos IS NOT NULL 
    AND medicamentos != 'null' 
    AND medicamentos != '[]';

-- Comentarios
COMMENT ON FUNCTION reset_recordatorios_citas IS 'Resetea estado de recordatorios para testing';
COMMENT ON VIEW system.v_recordatorios_stats IS 'Estadísticas de recordatorios enviados y pendientes';
