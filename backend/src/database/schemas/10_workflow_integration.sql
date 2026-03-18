-- ===========================================
-- VETPLUS - INTEGRACIONES DE WORKFLOW
-- Archivo: 10_workflow_integration.sql
-- ===========================================

-- Agregar campos de integración entre citas y consultas
ALTER TABLE clinical.calendario_citas 
ADD COLUMN IF NOT EXISTS id_consulta UUID REFERENCES clinical.consultas_clinicas(id_consulta);

ALTER TABLE clinical.consultas_clinicas 
ADD COLUMN IF NOT EXISTS id_cita UUID REFERENCES clinical.calendario_citas(id_cita);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_citas_consulta ON clinical.calendario_citas(id_consulta);
CREATE INDEX IF NOT EXISTS idx_consultas_cita ON clinical.consultas_clinicas(id_cita);
