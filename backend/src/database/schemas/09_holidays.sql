-- ===========================================
-- VETPLUS - DIAS ESPECIALES (GLOBAL + TENANT)
-- ===========================================

CREATE TABLE IF NOT EXISTS system.dias_especiales (
    id_dia_especial UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_tenant UUID NULL,
    fecha DATE NOT NULL,
    descripcion VARCHAR(180) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('festivo', 'no_laborable', 'horario_especial', 'cumpleanos', 'ausencia')),
    hora_inicio TIME NULL,
    hora_fin TIME NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    CONSTRAINT dias_especiales_horario_chk CHECK (
        (tipo <> 'horario_especial') OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dias_especiales_scope_fecha_tipo_desc
    ON system.dias_especiales (
      COALESCE(id_tenant, '00000000-0000-0000-0000-000000000000'::uuid),
      fecha,
      tipo,
      descripcion
    );

CREATE INDEX IF NOT EXISTS idx_dias_especiales_fecha
    ON system.dias_especiales(fecha);

CREATE INDEX IF NOT EXISTS idx_dias_especiales_tenant
    ON system.dias_especiales(id_tenant);

CREATE INDEX IF NOT EXISTS idx_dias_especiales_tipo
    ON system.dias_especiales(tipo);

CREATE INDEX IF NOT EXISTS idx_dias_especiales_activo
    ON system.dias_especiales(activo);

DROP TRIGGER IF EXISTS update_dias_especiales_updated_at ON system.dias_especiales;
CREATE TRIGGER update_dias_especiales_updated_at
    BEFORE UPDATE ON system.dias_especiales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system.dias_especiales IS 'Catalogo unificado de dias especiales globales (id_tenant NULL) y personalizados por tenant.';
