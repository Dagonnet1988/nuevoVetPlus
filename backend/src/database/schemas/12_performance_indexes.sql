-- ===========================================
-- VETPLUS - ÍNDICES DE PERFORMANCE
-- ===========================================

-- Calendario: consultas por tenant/rango de fecha y filtros frecuentes.
CREATE INDEX IF NOT EXISTS idx_citas_tenant_fecha
ON clinical.calendario_citas (id_tenant, fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_citas_tenant_vet_fecha
ON clinical.calendario_citas (id_tenant, id_veterinario, fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_citas_tenant_mascota_fecha
ON clinical.calendario_citas (id_tenant, id_mascota, fecha_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_citas_tenant_estado_fecha
ON clinical.calendario_citas (id_tenant, estado, fecha_inicio);

-- Clientes/mascotas: listados paginados y joins por propietario.
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_activo_nombre
ON clinical.clientes (id_tenant, activo, nombre);

CREATE INDEX IF NOT EXISTS idx_mascotas_tenant_cliente_activo
ON clinical.mascotas (id_tenant, id_cliente, activo);

CREATE INDEX IF NOT EXISTS idx_mascotas_tenant_activo_nombre
ON clinical.mascotas (id_tenant, activo, nombre);

-- Historias clínicas: historial por mascota y tenant.
CREATE INDEX IF NOT EXISTS idx_historias_tenant_mascota_fecha
ON clinical.historias_clinicas (id_tenant, id_mascota, fecha DESC);
