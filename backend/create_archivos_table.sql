-- Script para crear la tabla clinical.archivos_consulta faltante

-- Crear la tabla archivos_consulta
CREATE TABLE IF NOT EXISTS clinical.archivos_consulta (
  id_archivo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_consulta UUID NOT NULL REFERENCES clinical.consultas_clinicas(id_consulta) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(100),
  tamano_bytes INTEGER,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_archivos_consulta_id_consulta
ON clinical.archivos_consulta(id_consulta);

CREATE INDEX IF NOT EXISTS idx_archivos_consulta_activo
ON clinical.archivos_consulta(activo);

CREATE INDEX IF NOT EXISTS idx_archivos_consulta_tipo
ON clinical.archivos_consulta(tipo_archivo);

-- Crear función para trigger de updated_at
CREATE OR REPLACE FUNCTION update_archivos_consulta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER update_archivos_consulta_updated_at_trigger
  BEFORE UPDATE ON clinical.archivos_consulta
  FOR EACH ROW EXECUTE FUNCTION update_archivos_consulta_updated_at();

-- Verificar que la tabla se creó
SELECT 'Tabla clinical.archivos_consulta creada exitosamente' as resultado;