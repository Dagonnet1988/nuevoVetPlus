# Auditoría Técnica SaaS Multi-Tenant - VetPlus

Fecha inicial: 2026-03-26  
Fecha de validación de avance: 2026-03-26 (actualización)  
Repositorio: nuevoVetPlus  
Branch analizada: feature/calendario-mejoras

## Resumen Ejecutivo

Estado actual: avance importante, pero aún no lista para operar como SaaS multi-tenant en producción.

Conclusión principal actualizada:
- Se implementó base estructural multi-tenant (tenants, tenant_id, RLS) y mejoras fuertes de seguridad.
- Persisten brechas críticas de aplicación (uso consistente del contexto tenant en queries, propagación completa de tenant_id en auth y consistencia de modelo).
- Riesgo residual actual: medio-alto hasta cerrar los pendientes marcados en este documento.

## Estado de avance validado

### Resuelto
- Tabla de tenants creada y migración de columnas tenant_id en tablas core.
- Policies de RLS por tenant creadas.
- JWT fail-fast en producción (sin secreto no inicia en prod).
- `/api/test` protegido fuera de producción.
- CORS de `/uploads` restringido a orígenes permitidos.
- Corrección de referencias `auth.usuarios` a `vetplus_auth.usuarios` en puntos críticos detectados.
- Frontend ya envía `X-Tenant-Slug` en interceptor.

### Parcial
- Multi-tenancy en capa de aplicación: existe `tenantContext` y `queryWithTenant`, pero la mayoría de controladores aún usan `query()` global.
- Guards frontend: layout principal protegido, pero `change-password` sigue con guard desactivado.
- Rate limiting: implementado en middleware, pero aplicado solo en rutas públicas de consentimiento.

### Pendiente crítico
- Propagación completa de `tenant_id` en login/refresh y uso consistente en creación de entidades.
- Inclusión explícita de `id_tenant` en todos los `INSERT` de tablas con `NOT NULL`.
- Alineación final de roles entre schema y rutas (`aux_admin`/`aux_vet`/`assistant`).
- Corrección completa de inconsistencias en consentimiento (campos `id` vs `id_cliente` / `id_consentimiento`).

---

## 1) Arquitectura Actual (Backend y Frontend)

### Backend
- Monolito Node.js/Express con módulos clínicos, auth, auditoría, calendario, configuración de empresa.
- Diseño modular razonable para crecer funcionalmente.
- Problema estructural: no existe capa transversal de tenant context.

### Frontend
- Angular modular con servicios por dominio (auth, pacientes, citas, consultas, configuración).
- Interceptor JWT y guards por rol implementados.
- Problema: sin contexto de tenant en sesión/routing/requests.

### Diagnóstico
- Arquitectura apta para producto single-clinic.
- Arquitectura insuficiente para SaaS multi-clínica seguro.

---

## 2) Multi-Tenancy: Preparación, Separación de Datos y Riesgo de Fuga

### ¿Está preparada para múltiples clínicas?
Parcialmente.

### ¿Cómo se separan hoy los datos?
- Sí existen columnas `id_tenant` en tablas core (migración MT1).
- Sí existen policies RLS por tenant (MT3).
- La separación en ejecución aún es incompleta porque no todas las consultas usan contexto tenant de forma consistente.

### Riesgo de fuga entre clientes
Medio-alto (disminuyó, pero no está cerrado).

Aunque hay RLS, si el contexto tenant no se aplica correctamente por request/query, pueden aparecer fallos funcionales y ventanas de inconsistencia en acceso a datos.

### Evidencia técnica
- Tenants: backend/src/database/schemas/11_tenants.sql
- Tenant_id en core: backend/src/database/schemas/12_tenant_columns.sql
- RLS por tenant: backend/src/database/schemas/13_rls_policies.sql
- Middleware de tenant: backend/src/middleware/tenantContext.js
- Helper tenant-aware: backend/src/config/database.js
- Brecha de adopción: múltiples controladores siguen con `query()` global.

---

## 3) Modelo de Base de Datos: tenant_id por tabla vs bases separadas

## Recomendación para VetPlus
Estrategia híbrida por etapas:

1. Corto plazo (obligatorio antes de producción):
- Shared DB + tenant_id en todas las tablas de negocio.
- RLS habilitado en tablas sensibles.
- Índices compuestos por tenant_id + claves de acceso.

2. Mediano plazo:
- Mantener shared DB para clínicas estándar.
- Ofrecer DB dedicada para clínicas enterprise/reguladas.

## Comparación técnica

### Opción A: tenant_id por tabla (shared database)
Ventajas:
- Menor costo operativo inicial.
- Migraciones y despliegues más simples.
- Escalado rápido en etapa temprana.

Riesgos:
- Error humano en queries si no hay RLS.
- Mayor disciplina de ingeniería requerida.

### Opción B: base de datos separada por clínica
Ventajas:
- Aislamiento fuerte por diseño.
- Riesgo de fuga inter-tenant mucho menor.

Costos:
- Operación compleja (migraciones, backups, observabilidad, soporte).
- Mayor costo infraestructura y DevOps.

## Veredicto
- En tu estado actual conviene empezar con Shared + RLS.
- Evolucionar a híbrido cuando haya demanda de tenants premium.

---

## 4) Autenticación y Autorización (identidad de clínica por usuario)

## Estado actual
- JWT ya contempla `tenant_id` en payload.
- Middleware auth ya carga `id_tenant` y lo expone como `req.user.tenant_id`.
- Existe `tenantContext` que exige tenant en rutas clínicas.
- Pendiente: login/refresh todavía no seleccionan `id_tenant` de forma consistente en todas las consultas, por lo que la propagación de tenant no está cerrada de extremo a extremo.

## Riesgo
La autorización por pertenencia tenant mejoró, pero sigue habiendo riesgo de errores funcionales y de aislamiento si controladores usan `query()` sin contexto tenant o sin `id_tenant` explícito.

## Diseño recomendado
1. Resolver tenant en entrada de request (subdominio o header interno confiable).
2. Login con tenant + credencial.
3. Emitir JWT con claims: sub, tenant_id, tenant_slug, rol.
4. Validar tenant mismatch en middleware.
5. Aplicar contexto tenant a DB (SET LOCAL app.tenant_id + RLS).

---

## 5) Seguridad: Vulnerabilidades Críticas

## Hallazgos críticos y estado

1. Endpoints de test expuestos
- Estado: RESUELTO.
- Evidencia: backend/server.js (montaje condicional fuera de producción).

2. Rate limiting deshabilitado
- Estado: PARCIAL.
- Evidencia: backend/src/middleware/rateLimiter.js (implementado), backend/src/routes/public.js (aplicado), falta aplicación general/auth/admin en resto de rutas.

3. JWT secret inseguro por fallback hardcodeado
- Estado: PARCIAL-RESUELTO.
- Evidencia: backend/src/middleware/auth.js (fail-fast en producción; fallback solo dev).

4. CORS abierto en uploads
- Estado: RESUELTO.
- Evidencia: backend/server.js (orígenes permitidos, sin wildcard abierto).

5. Guards de autenticación desactivados en frontend
- Estado: PARCIAL.
- Evidencia: frontend/src/app/app.routes.ts (layout principal con guard activo; `change-password` aún comentado).

6. Inconsistencias de esquema/código
- Estado: PARCIAL.
- Resuelto: referencias `auth.usuarios` críticas.
- Pendiente: inconsistencias de columnas en consentimiento y desalineación de roles en schema/rutas.

7. Manejo de transacciones con pool global
- Estado: PARCIAL.
- Evidencia: mejoras en controladores críticos con `getClient()`, pero no unificado en todo el backend.

---

## 6) Escalabilidad (10, 50, 100 clínicas)

## Escenario 10 clínicas
- Probablemente operará, pero ya con riesgo alto de fuga por errores de query.
- Soporte aún manejable manualmente.

## Escenario 50 clínicas
- Mayor probabilidad de incidentes de aislamiento.
- Crece complejidad de auditoría y soporte.
- Sin partición por tenant, comienzan cuellos en reporting/consultas cruzadas.

## Escenario 100 clínicas
- Riesgo alto de incidentes severos (datos, cumplimiento, reputación).
- Operación costosa sin observabilidad y aislamiento por tenant.
- Backups/restores por cliente difíciles sin segmentación formal.

---

## 7) Recomendaciones Concretas

## Cambios urgentes restantes (antes de producción)

1. Cerrar adopción de multi-tenancy en capa de aplicación
- Migrar controladores para usar `queryWithTenant()` o transacciones con `SET LOCAL app.tenant_id` por request.
- Incluir `id_tenant` explícito en todos los `INSERT` y `UPDATE` de tablas core.

2. Corregir autenticación multi-tenant de extremo a extremo
- Asegurar que login/refresh carguen `id_tenant` y lo propaguen al JWT siempre.
- Validar coherencia entre tenant del token y tenant de contexto en todas las rutas internas.

3. Cerrar inconsistencias de modelo
- Consentimiento: alinear columnas (`id_consentimiento`, `id_cliente`) con controladores.
- Roles: alinear constraint de DB con roles reales usados por rutas (`aux_admin`, `aux_vet`, etc.).

4. Cerrar hardening de seguridad pendiente
- Aplicar rate limiting real en auth/admin/general (no solo público).
- Reactivar guard en `change-password`.

5. Validación final de RLS en runtime
- Ejecutar pruebas funcionales por tenant para confirmar aislamiento y ausencia de regresiones.

6. Pruebas y verificación final
- Pruebas de integración por tenant.
- Pruebas de regresión en consentimiento/pacientes/citas.

## Cambios opcionales (mediano plazo)

1. Estrategia híbrida de tenancy
- Shared DB para estándar, dedicated DB para enterprise.

2. Escalado de datos
- Particionado por tenant_id en tablas voluminosas.

3. Observabilidad multi-tenant
- Métricas por tenant: latencia, errores, throughput, costo.

4. Seguridad avanzada
- WAF/API Gateway, rotación de secretos, escaneo SAST/DAST en CI.

---

## Ejemplos Técnicos de Solución

### A) Modelo multi-tenant en SQL

```sql
CREATE TABLE system.tenants (
  id_tenant UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vetplus_auth.usuarios
  ADD COLUMN id_tenant UUID NOT NULL REFERENCES system.tenants(id_tenant);

ALTER TABLE clinical.clientes
  ADD COLUMN id_tenant UUID NOT NULL REFERENCES system.tenants(id_tenant);

ALTER TABLE clinical.mascotas
  ADD COLUMN id_tenant UUID NOT NULL REFERENCES system.tenants(id_tenant);

ALTER TABLE clinical.consultas_clinicas
  ADD COLUMN id_tenant UUID NOT NULL REFERENCES system.tenants(id_tenant);

ALTER TABLE clinical.calendario_citas
  ADD COLUMN id_tenant UUID NOT NULL REFERENCES system.tenants(id_tenant);
```

### B) RLS por tenant

```sql
ALTER TABLE clinical.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_clientes
ON clinical.clientes
USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);
```

### C) JWT + middleware de tenant context

```js
const payload = {
  sub: user.id_usuario,
  tenant_id: user.id_tenant,
  rol: user.rol
};

function tenantContext(req, res, next) {
  const tokenTenant = req.user?.tenant_id;
  const resolvedTenant = resolveTenantFromHost(req); // subdominio o gateway

  if (!tokenTenant || tokenTenant !== resolvedTenant) {
    return res.status(403).json({ message: 'Tenant mismatch' });
  }

  req.tenantId = tokenTenant;
  next();
}
```

### D) Transacción correcta con cliente dedicado

```js
import { getClient } from '../config/database.js';

const client = await getClient();
try {
  await client.query('BEGIN');

  await client.query(
    'UPDATE clinical.clientes SET nombre = $1 WHERE id_cliente = $2 AND id_tenant = $3',
    [nombre, idCliente, tenantId]
  );

  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### E) Interceptor frontend con contexto tenant

```ts
const tenantSlug = window.location.hostname.split('.')[0];

const req2 = req.clone({
  setHeaders: {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': tenantSlug
  }
});
```

---

## Hoja de Ruta Sugerida (3 fases)

### Fase 1 (Inmediata - bloqueo de salida)
- Cerrar superficie insegura (`/api/test`, rate limiter, JWT secret, guards).
- Corregir inconsistencias de esquema/código.
- Estabilizar transacciones.

### Fase 2 (Multi-tenant base)
- Implementar tenants + tenant_id + backfill.
- JWT con tenant claims.
- Middleware tenant context.
- RLS en tablas core.

### Fase 3 (Escala SaaS)
- Métricas por tenant, alertas y costos.
- Particionado/optimización.
- Opcional: tenants enterprise en DB dedicada.

---

## Veredicto Final

VetPlus avanzó de forma importante y ya tiene base técnica multi-tenant en BD (tenants + tenant_id + RLS) y hardening relevante de seguridad.

Sin embargo, todavía NO debe salir como SaaS multi-tenant a producción hasta cerrar los pendientes críticos de adopción en controladores, consistencia de auth tenant-aware y alineación final de modelo/roles.

Nivel de preparación estimado actual: 65%-75%.
