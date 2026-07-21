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
    id_version          INTEGER,
    titulo              VARCHAR(200) NOT NULL,
    texto_legal         TEXT NOT NULL,
    activa              BOOLEAN DEFAULT false,
    -- 'menor': corrección de redacción, no invalida firmas anteriores
    -- 'mayor': nueva finalidad o dato nuevo, requiere nueva firma
    tipo_cambio         VARCHAR(10) NOT NULL DEFAULT 'menor'
                        CHECK (tipo_cambio IN ('menor', 'mayor')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    -- Multi-tenancy: cada clínica tiene su propio texto de consentimiento
    id_tenant           UUID NOT NULL DEFAULT system.get_default_tenant()
                        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    PRIMARY KEY (id_version, id_tenant)
);

-- Una sola versión activa por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_version_consentimiento_activa_tenant
    ON clinical.versiones_consentimiento(id_tenant)
    WHERE activa = true;

CREATE INDEX IF NOT EXISTS idx_versiones_consentimiento_tenant
    ON clinical.versiones_consentimiento(id_tenant);

COMMENT ON TABLE clinical.versiones_consentimiento IS
    'Versiones históricas del texto legal de consentimiento. Permite auditar qué texto exacto firmó cada propietario.';

-- Insertar versión 1 solo si existe un tenant "default".
INSERT INTO clinical.versiones_consentimiento (id_version, titulo, texto_legal, activa, id_tenant)
SELECT
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
    true,
    t.id_tenant
FROM system.tenants t
WHERE t.slug = 'default'
ON CONFLICT DO NOTHING;


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

    -- Versión del texto legal que se está firmando (FK compuesta con id_tenant)
    id_version              INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (id_version, id_tenant) REFERENCES clinical.versiones_consentimiento(id_version, id_tenant),

    -- Estado del flujo
    estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'firmado', 'expirado', 'revocado', 'desactualizado')),

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
    -- Multi-tenancy
    id_tenant               UUID NOT NULL DEFAULT system.get_default_tenant()
                            REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_consentimientos_tenant
    ON clinical.consentimientos(id_tenant);

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

-- -----------------------------------------------
-- 6. MIGRACIONES IDEMPOTENTES PARA BD EXISTENTE
-- Agregan columna/estado nuevos sin romper datos
-- -----------------------------------------------

-- 6a. Columna tipo_cambio en versiones_consentimiento
ALTER TABLE clinical.versiones_consentimiento
    ADD COLUMN IF NOT EXISTS tipo_cambio VARCHAR(10) NOT NULL DEFAULT 'menor';

-- Agregar CHECK solo si no existe ya
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'versiones_consentimiento_tipo_cambio_check'
          AND constraint_schema = 'clinical'
    ) THEN
        ALTER TABLE clinical.versiones_consentimiento
            ADD CONSTRAINT versiones_consentimiento_tipo_cambio_check
            CHECK (tipo_cambio IN ('menor', 'mayor'));
    END IF;
END $$;

-- -----------------------------------------------
-- 7. TRAZABILIDAD DE ENVIOS DE DOCUMENTOS
-- Se crea aquí porque depende de clinical.consentimientos
-- -----------------------------------------------

CREATE TABLE IF NOT EXISTS clinical.envios_documentos (
    id_envio UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(40) NOT NULL
        CHECK (tipo_documento IN ('consentimiento_link', 'consentimiento_pdf', 'historia_pdf')),
    canal VARCHAR(20) NOT NULL DEFAULT 'email'
        CHECK (canal IN ('email')),
    id_cliente UUID REFERENCES clinical.clientes(id_cliente) ON DELETE SET NULL,
    id_historia UUID REFERENCES clinical.historias_clinicas(id_historia) ON DELETE SET NULL,
    id_consentimiento UUID REFERENCES clinical.consentimientos(id_consentimiento) ON DELETE SET NULL,
    destinatario_email VARCHAR(150) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL
        CHECK (estado IN ('enviado', 'fallido')),
    provider_message_id VARCHAR(255),
    detalle_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    id_tenant UUID NOT NULL DEFAULT system.get_default_tenant()
        REFERENCES system.tenants(id_tenant) ON DELETE RESTRICT,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_envios_documentos_tenant ON clinical.envios_documentos(id_tenant);
CREATE INDEX IF NOT EXISTS idx_envios_documentos_tipo ON clinical.envios_documentos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_envios_documentos_fecha ON clinical.envios_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_envios_documentos_cliente ON clinical.envios_documentos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_envios_documentos_historia ON clinical.envios_documentos(id_historia);

COMMENT ON TABLE clinical.envios_documentos IS
    'Trazabilidad de envios de consentimiento e historias por correo';

-- 6b. Ampliar CHECK de estado en consentimientos para incluir 'desactualizado'
-- Primero eliminar el constraint antiguo y recrearlo (DROP IF EXISTS + ADD)
DO $$ BEGIN
    -- Eliminar constraint anterior si existe con el nombre antiguo
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'clinical'
          AND constraint_name = 'consentimientos_estado_check'
    ) THEN
        ALTER TABLE clinical.consentimientos
            DROP CONSTRAINT consentimientos_estado_check;
    END IF;

    -- Recrear con los 5 estados (idempotente gracias al IF EXISTS anterior)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'clinical'
          AND constraint_name = 'consentimientos_estado_check_v2'
    ) THEN
        ALTER TABLE clinical.consentimientos
            ADD CONSTRAINT consentimientos_estado_check_v2
            CHECK (estado IN ('pendiente', 'firmado', 'expirado', 'revocado', 'desactualizado'));
    END IF;
END $$;
