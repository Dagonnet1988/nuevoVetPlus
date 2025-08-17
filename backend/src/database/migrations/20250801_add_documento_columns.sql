-- ===========================================
-- MIGRACIÓN: AGREGAR COLUMNAS DE DOCUMENTO Y DATOS PERSONALES
-- Fecha: 2025-08-01
-- ===========================================

-- Agregar columnas faltantes a la tabla auth.usuarios
ALTER TABLE auth.usuarios 
ADD COLUMN IF NOT EXISTS apellido VARCHAR(100),
ADD COLUMN IF NOT EXISTS documento VARCHAR(20),
ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) CHECK (tipo_documento IN ('CC', 'CE', 'Pasaporte')),
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS especialidad VARCHAR(100),
ADD COLUMN IF NOT EXISTS numero_licencia VARCHAR(50);

-- Actualizar constraint de rol para incluir nuevos roles
ALTER TABLE auth.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE auth.usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'vet', 'aux', 'veterinario', 'auxiliar'));

-- Agregar constraint único para documento (después de poblar datos)
-- ALTER TABLE auth.usuarios ADD CONSTRAINT usuarios_documento_unique UNIQUE (documento);

-- Actualizar el usuario admin existente con valores por defecto
UPDATE auth.usuarios 
SET 
    apellido = 'Administrador',
    documento = '12345678',
    tipo_documento = 'CC'
WHERE email = 'admin@vetplus.com' AND apellido IS NULL;

-- Después de verificar que todos los usuarios tienen documento, agregar constraint
-- ALTER TABLE auth.usuarios ALTER COLUMN documento SET NOT NULL;
-- ALTER TABLE auth.usuarios ALTER COLUMN tipo_documento SET NOT NULL;
-- ALTER TABLE auth.usuarios ADD CONSTRAINT usuarios_documento_unique UNIQUE (documento);
