-- ==========================================
-- MIGRACIÓN: ESTANDARIZACIÓN ZONA HORARIA COLOMBIA
-- ==========================================

-- Cambiar el tipo de datos para que almacene fechas en zona horaria de Colombia
-- En lugar de UTC, usaremos TIMESTAMP WITHOUT TIME ZONE y asumiremos que todo es Colombia

-- 1. Agregar nueva columna temporal
ALTER TABLE clinical.calendario_citas 
ADD COLUMN fecha_inicio_colombia TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN fecha_fin_colombia TIMESTAMP WITHOUT TIME ZONE;

-- 2. Convertir datos existentes de UTC a Colombia (UTC-5)
UPDATE clinical.calendario_citas 
SET 
    fecha_inicio_colombia = fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    fecha_fin_colombia = fecha_fin AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';

-- 3. Eliminar columnas antiguas
ALTER TABLE clinical.calendario_citas 
DROP COLUMN fecha_inicio,
DROP COLUMN fecha_fin;

-- 4. Renombrar columnas nuevas
ALTER TABLE clinical.calendario_citas 
RENAME COLUMN fecha_inicio_colombia TO fecha_inicio;
ALTER TABLE clinical.calendario_citas 
RENAME COLUMN fecha_fin_colombia TO fecha_fin;

-- 5. Agregar restricciones
ALTER TABLE clinical.calendario_citas 
ALTER COLUMN fecha_inicio SET NOT NULL,
ALTER COLUMN fecha_fin SET NOT NULL;

-- 6. Recrear constraint de fechas válidas
ALTER TABLE clinical.calendario_citas 
DROP CONSTRAINT IF EXISTS check_fechas_validas;

ALTER TABLE clinical.calendario_citas 
ADD CONSTRAINT check_fechas_validas CHECK (fecha_fin > fecha_inicio);

-- Log de la migración
INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'clinical.calendario_citas',
    'UPDATE',
    'Migración de zona horaria: Convertidas fechas de UTC a Colombia (TIMESTAMP WITHOUT TIME ZONE)'
);