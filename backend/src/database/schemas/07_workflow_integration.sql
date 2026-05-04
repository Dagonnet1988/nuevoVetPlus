-- ===========================================
-- VETPLUS - INTEGRACIONES DE WORKFLOW
-- Archivo: 10_workflow_integration.sql
-- ===========================================

-- Vinculación historia clínica ↔ cita (bidireccional)
-- id_historia ya está en calendario_citas desde 03_clinical_tables.sql
-- id_cita ya está en historias_clinicas desde 03_clinical_tables.sql
-- Aquí sólo agregamos la FK diferida (evita problema de orden de creación)
ALTER TABLE clinical.historias_clinicas
    ADD CONSTRAINT fk_historia_cita
    FOREIGN KEY (id_cita) REFERENCES clinical.calendario_citas(id_cita) ON DELETE SET NULL
    NOT VALID;

ALTER TABLE clinical.historias_clinicas VALIDATE CONSTRAINT fk_historia_cita;

CREATE INDEX IF NOT EXISTS idx_historias_cita_wf ON clinical.historias_clinicas(id_cita);
