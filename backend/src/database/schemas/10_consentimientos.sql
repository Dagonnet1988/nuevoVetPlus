-- ===========================================
-- VETPLUS - MÓDULO DE CONSENTIMIENTO DE DATOS
-- Migración idempotente (segura para sistema
-- nuevo Y para sistema existente ya inicializado)
-- ===========================================

-- -----------------------------------------------
-- 1. VERSIONES DEL TEXTO LEGAL
-- Guarda el texto exacto de cada versión firmada
-- para auditoría (el propietario firmó ESTE texto)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.versiones_consentimiento (
    id_version          INTEGER PRIMARY KEY,
    titulo              VARCHAR(200) NOT NULL,
    texto_legal         TEXT NOT NULL,
    activa              BOOLEAN DEFAULT false,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Solo puede haber una versión activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_version_consentimiento_activa
    ON clinical.versiones_consentimiento(activa)
    WHERE activa = true;

COMMENT ON TABLE clinical.versiones_consentimiento IS
    'Versiones históricas del texto legal de consentimiento. Permite auditar qué texto exacto firmó cada propietario.';

-- Insertar versión 1 solo si no existe
INSERT INTO clinical.versiones_consentimiento (id_version, titulo, texto_legal, activa)
VALUES (
    1,
    'Autorización de Tratamiento de Datos Personales',
    E'AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES\n\n'
    'En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás '
    'normas concordantes sobre protección de datos personales, yo, en calidad '
    'de propietario/a de la mascota registrada, autorizo expresamente a '
    '[NOMBRE_CLINICA], NIT [NIT], con domicilio en [DIRECCION], para que '
    'realice el tratamiento de mis datos personales (nombre, documento de '
    'identificación, teléfono, correo electrónico y dirección) con las '
    'siguientes finalidades:\n\n'
    '1. Gestión del historial clínico y atención veterinaria de mi mascota.\n'
    '2. Envío de recordatorios de citas, vacunas y tratamientos.\n'
    '3. Comunicaciones relacionadas con el estado de salud de mi mascota.\n'
    '4. Facturación y gestión administrativa.\n\n'
    'Declaro que:\n'
    '- He sido informado/a sobre la Política de Tratamiento de Datos de la clínica.\n'
    '- Puedo revocar esta autorización en cualquier momento comunicándome '
    'directamente con la clínica.\n'
    '- Mis datos no serán compartidos con terceros sin mi consentimiento '
    'expreso, salvo obligación legal.\n\n'
    'Al firmar este documento, declaro que he leído, entiendo y acepto '
    'los términos descritos anteriormente.',
    true
)
ON CONFLICT (id_version) DO NOTHING;


-- -----------------------------------------------
-- 2. TABLA DE CONSENTIMIENTOS
-- Un registro por cada solicitud de firma enviada
-- al propietario
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.consentimientos (
    id_consentimiento       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Propietario que debe firmar
    id_cliente              UUID NOT NULL
                            REFERENCES clinical.clientes(id_cliente) ON DELETE CASCADE,

    -- Versión del texto legal que se está firmando
    id_version              INTEGER NOT NULL DEFAULT 1
                            REFERENCES clinical.versiones_consentimiento(id_version),

    -- Estado del flujo
    estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'firmado', 'expirado', 'revocado')),

    -- Token único para el enlace público (expira en 48h por defecto)
    token                   VARCHAR(100) UNIQUE NOT NULL,
    token_expires_at        TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Datos capturados en el momento de la firma
    firmado_en              TIMESTAMP WITH TIME ZONE,
    ip_firmante             INET,
    device_info             TEXT,           -- user-agent del navegador/celular
    firma_imagen            TEXT,           -- PNG de la firma en base64

    -- Documento PDF generado tras la firma
    pdf_path                TEXT,           -- ruta relativa en el servidor
    pdf_numero              VARCHAR(30) UNIQUE, -- ej: CONS-2026-00001

    -- Registro de envíos
    whatsapp_enviado        BOOLEAN DEFAULT false,
    email_enviado           BOOLEAN DEFAULT false,
    recordatorio_enviado    BOOLEAN DEFAULT false,
    recordatorio_enviado_en TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    created_by              UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente
    ON clinical.consentimientos(id_cliente);

CREATE INDEX IF NOT EXISTS idx_consentimientos_token
    ON clinical.consentimientos(token);

CREATE INDEX IF NOT EXISTS idx_consentimientos_estado
    ON clinical.consentimientos(estado);

CREATE INDEX IF NOT EXISTS idx_consentimientos_expires
    ON clinical.consentimientos(token_expires_at)
    WHERE estado = 'pendiente';

COMMENT ON TABLE clinical.consentimientos IS
    'Solicitudes de firma de consentimiento enviadas a propietarios. '
    'Contiene el token del enlace, estado, firma manuscrita y ruta del PDF generado.';

COMMENT ON COLUMN clinical.consentimientos.firma_imagen IS
    'Imagen PNG de la firma manuscrita del propietario, codificada en base64.';

COMMENT ON COLUMN clinical.consentimientos.pdf_path IS
    'Ruta relativa al PDF generado con firma embebida. '
    'Ejemplo: uploads/consentimientos/CONS-2026-00001.pdf';


-- -----------------------------------------------
-- 3. TRIGGER updated_at EN CONSENTIMIENTOS
-- Reutiliza la función que ya existe en el sistema
-- -----------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_consentimientos_updated_at'
          AND tgrelid = 'clinical.consentimientos'::regclass
    ) THEN
        CREATE TRIGGER update_consentimientos_updated_at
            BEFORE UPDATE ON clinical.consentimientos
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;


-- -----------------------------------------------
-- 4. COLUMNAS NUEVAS EN clinical.clientes
-- ADD COLUMN IF NOT EXISTS → seguro para sistema
-- existente (no falla si ya existen las columnas)
-- -----------------------------------------------
ALTER TABLE clinical.clientes
    ADD COLUMN IF NOT EXISTS consentimiento_firmado BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS id_consentimiento_vigente UUID
        REFERENCES clinical.consentimientos(id_consentimiento) ON DELETE SET NULL;

COMMENT ON COLUMN clinical.clientes.consentimiento_firmado IS
    'true cuando el propietario ha firmado al menos una versión válida del consentimiento.';

COMMENT ON COLUMN clinical.clientes.id_consentimiento_vigente IS
    'FK al consentimiento actualmente vigente (el más reciente firmado).';


-- -----------------------------------------------
-- 5. DIRECTORIO DE PDFs (comentario informativo)
-- El servidor crea este directorio en el arranque.
-- Ruta: backend/uploads/consentimientos/
-- -----------------------------------------------
