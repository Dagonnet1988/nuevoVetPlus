# Auditoría Técnica SaaS Multi-Tenant - VetPlus

Fecha: 2026-03-26  
Repositorio: nuevoVetPlus  
Branch analizada: feature/calendario-mejoras

## Resumen Ejecutivo

Estado actual: la aplicación no está lista para operar como SaaS multi-tenant en producción.

Conclusión principal:
- La arquitectura funciona para modo single-tenant.
- No existe aislamiento fuerte por clínica (tenant) en modelo de datos, autenticación ni autorización.
- Existen riesgos críticos de seguridad y consistencia que deben corregirse antes de salida a producción.

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
No.

### ¿Cómo se separan hoy los datos?
- Actualmente no hay separación técnica por tenant.
- No hay columnas tenant_id/id_clinica en tablas core.
- No hay Row Level Security (RLS) ni políticas por tenant.

### Riesgo de fuga entre clientes
Alto.

Si una consulta o endpoint omite filtros manuales, puede exponer datos entre clínicas porque todos los datos viven en los mismos esquemas/tablas lógicas.

### Evidencia técnica
- Modelo auth sin tenant: backend/src/database/schemas/02_auth_tables.sql
- Modelo clínico sin tenant: backend/src/database/schemas/03_clinical_tables.sql
- Sin políticas RLS: búsqueda en backend/src/database/**/*.sql sin resultados para `ROW LEVEL SECURITY` y `CREATE POLICY`.
- JWT sin tenant claims: backend/src/middleware/auth.js

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
- JWT incluye id, email, rol, nombre.
- JWT no incluye tenant_id.
- Middleware de auth resuelve usuario global por id.
- Authorization se basa en rol global (`admin`, `vet`, etc.), no en pertenencia a clínica.

## Riesgo
Un usuario válido puede consultar entidades fuera de su clínica si endpoint/query no filtra explícitamente por tenant.

## Diseño recomendado
1. Resolver tenant en entrada de request (subdominio o header interno confiable).
2. Login con tenant + credencial.
3. Emitir JWT con claims: sub, tenant_id, tenant_slug, rol.
4. Validar tenant mismatch en middleware.
5. Aplicar contexto tenant a DB (SET LOCAL app.tenant_id + RLS).

---

## 5) Seguridad: Vulnerabilidades Críticas

## Hallazgos críticos

1. Endpoints de test expuestos
- `/api/test` está montado en el servidor principal.
- Evidencia: backend/server.js
- Riesgo: manipulación operativa por rutas no productivas.

2. Rate limiting deshabilitado
- Middleware retorna `next()` en todos los casos.
- Evidencia: backend/src/middleware/rateLimiter.js
- Riesgo: brute force, abuso de endpoints públicos y DoS lógico.

3. JWT secret inseguro por fallback hardcodeado
- Usa secreto por defecto si falta variable de entorno.
- Evidencia: backend/src/middleware/auth.js
- Riesgo: compromiso total de autenticación en despliegues mal configurados.

4. CORS abierto en uploads
- `Access-Control-Allow-Origin: *` para `/uploads`.
- Evidencia: backend/server.js
- Riesgo: exposición amplia de recursos y consumo cruzado no deseado.

5. Guards de autenticación desactivados en frontend
- `AuthGuard` comentado en rutas principales.
- Evidencia: frontend/src/app/app.routes.ts
- Riesgo: superficie de acceso UI ampliada (aunque backend siga siendo la barrera real).

6. Inconsistencias de esquema/código
- Referencias mezcladas `auth.usuarios` vs `vetplus_auth.usuarios`.
- Mismatch de columnas en consentimiento (`id` vs `id_cliente`).
- Evidencia: backend/src/routes/appointments.js, backend/src/controllers/consentimientoController.js, backend/src/database/schemas/10_consentimientos.sql
- Riesgo: fallos runtime y baja confiabilidad en producción.

7. Manejo de transacciones con pool global
- Uso de `BEGIN/COMMIT/ROLLBACK` a través de helper global sin cliente dedicado.
- Evidencia: backend/src/config/database.js + múltiples controladores.
- Riesgo: inconsistencias bajo concurrencia.

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

## Cambios urgentes (antes de producción)

1. Multi-tenancy estructural
- Crear tabla `system.tenants`.
- Agregar `tenant_id` a tablas auth/clinical/system de negocio.
- Backfill de datos existentes para tenant inicial.

2. Aislamiento en base de datos
- Habilitar RLS en tablas sensibles.
- Crear policies `USING` y `WITH CHECK` por tenant.

3. AuthN/AuthZ multi-tenant
- Incluir `tenant_id` en JWT.
- Validar tenant mismatch en middleware.
- Enriquecer `req.user` con tenant context.

4. Seguridad de superficie
- Eliminar o proteger `/api/test` por entorno y rol admin.
- Reactivar rate limiting real.
- Eliminar fallback hardcoded de JWT secret (fail-fast).
- Restringir CORS de uploads a dominios conocidos.

5. Confiabilidad operativa
- Corregir inconsistencias de esquema/código (`auth` vs `vetplus_auth`, ids).
- Corregir transacciones con `client = await pool.connect()` + `client.query(...)`.

6. Frontend
- Reactivar `AuthGuard`.
- Introducir tenant context por subdominio o config centralizada.

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

VetPlus, en su estado actual, NO debe salir como SaaS multi-tenant a producción.

Sí puede evolucionar de forma segura en corto plazo si se ejecutan primero los cambios urgentes de aislamiento, autenticación multi-tenant y hardening de seguridad descritos en este documento.
