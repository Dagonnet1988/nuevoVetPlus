-- Actualizar el constraint de estados de cita para coincidir con el frontend
-- Los nuevos valores serán: 'pendiente', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'no_asistio'

-- PASO 1: Eliminar el constraint existente primero
ALTER TABLE clinical.calendario_citas 
DROP CONSTRAINT IF EXISTS calendario_citas_estado_check;

-- PASO 2: Actualizar los valores existentes para que coincidan con el frontend
UPDATE clinical.calendario_citas 
SET estado = CASE 
    WHEN estado = 'Programada' THEN 'pendiente'
    WHEN estado = 'Confirmada' THEN 'confirmada'
    WHEN estado = 'En Curso' THEN 'en_progreso'
    WHEN estado = 'Completada' THEN 'completada'
    WHEN estado = 'Cancelada' THEN 'cancelada'
    WHEN estado = 'No Asistió' THEN 'no_asistio'
    -- Mantener los valores que ya están en formato nuevo
    WHEN estado IN ('pendiente', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'no_asistio') THEN estado
    ELSE 'pendiente' -- valor por defecto para cualquier otro caso
END;

-- PASO 3: Crear el nuevo constraint con los valores del frontend
ALTER TABLE clinical.calendario_citas 
ADD CONSTRAINT calendario_citas_estado_check 
CHECK (estado IN ('pendiente', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'no_asistio'));

-- PASO 4: Actualizar el valor por defecto
ALTER TABLE clinical.calendario_citas 
ALTER COLUMN estado SET DEFAULT 'pendiente';

-- Comentario para documentar los cambios
COMMENT ON COLUMN clinical.calendario_citas.estado IS 'Estado de la cita: pendiente, confirmada, en_progreso, completada, cancelada, no_asistio';
