-- ===========================================
-- VETPLUS MT3 - ROW LEVEL SECURITY (RLS)
-- ===========================================
-- Idempotente: DROP POLICY IF EXISTS antes de CREATE POLICY
-- Depende de: 12_tenant_columns.sql (id_tenant debe existir en todas las tablas)
--
-- IMPORTANTE: current_setting('app.tenant_id', true) devuelve NULL si la variable
-- no está seteada (el segundo argumento `true` = missing_ok).
-- Cuando es NULL, la policy falla silenciosamente y la fila NO es visible.
-- Esto es el comportamiento correcto: sin contexto de tenant → sin datos visibles.
--
-- Para activar el contexto en cada request autenticada el backend ejecuta:
--   SET LOCAL app.tenant_id = '<uuid>';    (dentro de una transacción)
-- Esto lo hace la función queryWithTenant() en database.js.
-- ===========================================

-- -------------------------------------------------------
-- clinical.clientes
-- -------------------------------------------------------
ALTER TABLE clinical.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.clientes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_clientes ON clinical.clientes;
CREATE POLICY tenant_isolation_clientes ON clinical.clientes
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);

-- -------------------------------------------------------
-- clinical.mascotas
-- -------------------------------------------------------
ALTER TABLE clinical.mascotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.mascotas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_mascotas ON clinical.mascotas;
CREATE POLICY tenant_isolation_mascotas ON clinical.mascotas
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);

-- -------------------------------------------------------
-- clinical.consultas_clinicas
-- -------------------------------------------------------
ALTER TABLE clinical.consultas_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.consultas_clinicas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_consultas ON clinical.consultas_clinicas;
CREATE POLICY tenant_isolation_consultas ON clinical.consultas_clinicas
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);

-- -------------------------------------------------------
-- clinical.calendario_citas
-- -------------------------------------------------------
ALTER TABLE clinical.calendario_citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.calendario_citas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_citas ON clinical.calendario_citas;
CREATE POLICY tenant_isolation_citas ON clinical.calendario_citas
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);

-- -------------------------------------------------------
-- clinical.consentimientos
-- -------------------------------------------------------
ALTER TABLE clinical.consentimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.consentimientos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_consentimientos ON clinical.consentimientos;
CREATE POLICY tenant_isolation_consentimientos ON clinical.consentimientos
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);

-- -------------------------------------------------------
-- Nota sobre rutas PÚBLICAS (firma de consentimiento):
-- Las rutas /api/public/consentimiento/:token consultan por token único,
-- no por id_tenant. Esas queries deben usar getClient() directamente
-- (sin SET LOCAL app.tenant_id) porque la conexión pública no tiene JWT.
-- La tabla consentimientos tiene RLS, pero la búsqueda por token es
-- segura porque el token es un UUID único no adivinable.
-- Si se quiere usar queryWithTenant en rutas públicas, resolver el
-- tenant_id desde la fila de consentimientos antes de las demás queries.
-- -------------------------------------------------------
