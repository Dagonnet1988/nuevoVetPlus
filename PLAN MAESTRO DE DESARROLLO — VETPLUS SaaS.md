# PLAN MAESTRO DE DESARROLLO — VETPLUS SaaS
**VetPlus** | Rama: `feature/calendario-mejoras` | Actualizado: Marzo 2026 v2.0

> Plan ajustado tras la **Auditoría Técnica SaaS Multi-Tenant (26/03/2026)**.  
> Integra las fases originales del módulo de pacientes/consentimiento con los  
> requisitos obligatorios de seguridad y multi-tenancy antes de producción.

---

## 1. FLUJO COMPLETO DEL CONSENTIMIENTO DE DATOS

### 1.1 Diagrama de flujo

```
RECEPCIÓN (Sistema VetPlus)                   PROPIETARIO (Su celular)
══════════════════════════                    ══════════════════════════

1. Staff registra al propietario
   + mascota en el formulario
   (nombre, cédula, teléfono, email)
            │
            ▼
2. Sistema crea:
   - registro en clinical.clientes
   - registro en clinical.mascotas
   - token único (UUID, expira 48h)
   - registro en clinical.consentimientos
     (estado: PENDIENTE)
            │
            ├──── 3a. Envía WhatsApp:
            │         "Hola Juan 👋 Bienvenido a VetPlus.
            │          Para completar el registro de Firulais
            │          necesitamos su autorización de datos.
            │          Firme aquí (válido 48h):
            │          https://app.vetplus.com/consentimiento/abc123"
            │
            ├──── 3b. Envía Email (si tiene):
            │         Mismo mensaje + PDF borrador adjunto
            │
            └──── 3c. Muestra QR en pantalla de recepción:
                      Si el propietario está presente puede
                      escanear con su celular ahí mismo
                            │
                            ▼
                  4. Propietario abre el enlace en su celular
                     (página pública, sin login requerido)
                            │
                            ▼
                  5. Página muestra:
                     - Encabezado: logo + nombre clínica
                     - Texto completo del consentimiento
                     - Datos del propietario (nombre, cédula)
                     - Datos de la mascota (nombre, especie)
                     - Fecha y hora actual
                     - Recuadro de FIRMA (canvas táctil)
                       "Firme aquí con su dedo"
                            │
                            ▼
                  6. Propietario firma y presiona
                     "ACEPTO Y FIRMO"
                            │
                            ▼
7. Backend recibe:                            7. Propietario recibe confirmación
   - firma como PNG base64                       en pantalla:
   - IP del dispositivo                          "✅ Documento firmado exitosamente.
   - User-agent (device info)                     Recibirá una copia en su WhatsApp/email"
   - Timestamp exacto
            │
            ▼
8. Sistema:
   - Marca consentimiento FIRMADO
   - Genera PDF con PDFKit:
     * Encabezado clínica (logo, NIT, dirección)
     * Texto legal del consentimiento
     * Datos del propietario y mascota
     * Imagen de la firma embebida
     * Fecha/hora/IP de firma
     * Número de documento único
   - Guarda PDF en servidor
   - Actualiza clinical.clientes.consentimiento_firmado = true
            │
            ├──── 9a. Envía PDF por WhatsApp al propietario
            └──── 9b. Envía PDF por email al propietario

10. Staff en recepción ve en el expediente:
    - Badge verde "Consentimiento firmado ✓"
    - Botón "Ver/Descargar documento"
    - Fecha y hora de firma
```

### 1.2 Casos especiales

| Caso | Comportamiento |
|------|---------------|
| Token expirado (>48h) | Página muestra "Enlace expirado. Solicite uno nuevo a la clínica" |
| Token ya usado | Página muestra "Este documento ya fue firmado el [fecha]" |
| Sin teléfono ni email | Staff imprime el QR y se lo da al propietario para escanear |
| Propietario no firma | Badge naranja "Consentimiento pendiente" — recordatorio automático a 24h |
| Propietario regresa sin firmar | Admin puede reenviar el enlace desde el expediente |

---

## 2. NUEVAS TABLAS DE BASE DE DATOS

### 2.1 `clinical.consentimientos`
```sql
CREATE TABLE clinical.consentimientos (
    id_consentimiento  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_cliente         UUID NOT NULL REFERENCES clinical.clientes(id_cliente) ON DELETE CASCADE,
    
    -- Estado del flujo
    estado             VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'firmado', 'expirado', 'revocado')),
    
    -- Token para el enlace público
    token              VARCHAR(100) UNIQUE NOT NULL,
    token_expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Datos de la firma (se llenan al firmar)
    firmado_en         TIMESTAMP WITH TIME ZONE,
    ip_firmante        INET,
    device_info        TEXT,   -- user-agent del celular
    firma_imagen       TEXT,   -- base64 PNG de la firma manuscrita
    
    -- Documento generado
    pdf_path           TEXT,   -- ruta del PDF en servidor
    pdf_numero         VARCHAR(30) UNIQUE, -- ej: CONS-2026-00001
    
    -- Versión del texto legal firmado (para auditoría)
    version_documento  INTEGER NOT NULL DEFAULT 1,
    
    -- Intentos de envío
    whatsapp_enviado   BOOLEAN DEFAULT false,
    email_enviado      BOOLEAN DEFAULT false,
    recordatorio_enviado BOOLEAN DEFAULT false,
    
    -- Auditoría
    created_by         UUID REFERENCES vetplus_auth.usuarios(id_usuario),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consentimientos_cliente ON clinical.consentimientos(id_cliente);
CREATE INDEX idx_consentimientos_token   ON clinical.consentimientos(token);
CREATE INDEX idx_consentimientos_estado  ON clinical.consentimientos(estado);
```

### 2.2 `clinical.versiones_consentimiento`
Guarda el texto legal completo de cada versión, para que el PDF siempre refleje el exacto texto que firmó el propietario.
```sql
CREATE TABLE clinical.versiones_consentimiento (
    id_version    INTEGER PRIMARY KEY,
    titulo        VARCHAR(200) NOT NULL,
    texto_legal   TEXT NOT NULL,       -- Texto completo del documento
    activa        BOOLEAN DEFAULT false,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by    UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

CREATE UNIQUE INDEX idx_version_activa ON clinical.versiones_consentimiento(activa) WHERE activa = true;

-- Insertar versión inicial
INSERT INTO clinical.versiones_consentimiento (id_version, titulo, texto_legal, activa)
VALUES (1, 
'Consentimiento de Tratamiento de Datos Personales',
'Texto legal completo aquí (ver sección 5)',
true);
```

### 2.3 Columna nueva en `clinical.clientes`
```sql
ALTER TABLE clinical.clientes 
    ADD COLUMN consentimiento_firmado BOOLEAN DEFAULT false,
    ADD COLUMN id_consentimiento_vigente UUID REFERENCES clinical.consentimientos(id_consentimiento);
```

---

## 3. RUTAS BACKEND NUEVAS

### 3.1 Rutas autenticadas (staff) — `/api/clinical/pacientes/:id/consentimiento`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/clinical/pacientes/:id/consentimiento` | Genera token y envía enlace al propietario |
| `GET`  | `/api/clinical/pacientes/:id/consentimiento` | Estado actual + URL del PDF si está firmado |
| `POST` | `/api/clinical/pacientes/:id/consentimiento/reenviar` | Reenvía el enlace (genera nuevo token) |
| `GET`  | `/api/clinical/pacientes/:id/consentimiento/pdf` | Descarga el PDF desde el expediente |

### 3.2 Rutas públicas (sin autenticación) — `/api/public/consentimiento`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/public/consentimiento/:token` | Devuelve datos del formulario para mostrar (valida token) |
| `POST` | `/api/public/consentimiento/:token/firmar` | Recibe la firma, genera PDF, actualiza estado |

> ⚠️ Las rutas públicas tienen rate limiting estricto (10 req/min por IP) y validación de token en cada request.

---

## 4. COMPONENTES FRONTEND NUEVOS

### 4.1 Página pública de consentimiento
```
/consentimiento/:token  →  ConsentimientoPublicoComponent
```
- **No requiere login** — está fuera del `AuthGuard`
- Responsive mobile-first (se firma desde el celular)
- Incluye canvas con `signature_pad` (npm: `signature_pad`)
- En caso de error muestra mensaje claro (expirado, ya firmado, inválido)

### 4.2 Badge + panel en expediente del propietario
En `paciente-details.component.ts` y en el formulario:
- Badge `Consentimiento: ✅ Firmado` / `⏳ Pendiente` / `❌ Expirado`
- Botón "Reenviar enlace"
- Botón "Ver PDF"
- Botón "Mostrar QR" (para dueños presentes)

### 4.3 QR modal en recepción
Modal que aparece al crear un propietario si el dueño está presente:
- Muestra el QR generado con `qrcode`
- Instrucción: "Pida al propietario que escanee este código"
- Automáticamente verifica si fue firmado (polling cada 5s)
- Se cierra con mensaje de éxito al confirmar la firma

---

## 5. TEXTO LEGAL DEL DOCUMENTO DE CONSENTIMIENTO

*(Personalizable desde la configuración de empresa)*

```
AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES

En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 
(o la normativa vigente en su país), yo [NOMBRE_PROPIETARIO], 
identificado con cédula [CEDULA], en calidad de propietario de la 
mascota [NOMBRE_MASCOTA] ([ESPECIE]), autorizo expresamente a 
[NOMBRE_CLINICA], NIT [NIT], con domicilio en [DIRECCION], 
para que realice el tratamiento de mis datos personales 
(nombre, documento de identificación, teléfono, correo electrónico 
y dirección) con las siguientes finalidades:

1. Gestión del historial clínico y atención veterinaria de mi mascota.
2. Envío de recordatorios de citas, vacunas y tratamientos.
3. Comunicaciones relacionadas con el estado de salud de mi mascota.
4. Facturación y gestión administrativa.

Declaro que:
- He sido informado sobre la Política de Tratamiento de Datos de la clínica.
- Puedo revocar esta autorización en cualquier momento comunicándome 
  con [EMAIL_CLINICA].
- Mis datos no serán compartidos con terceros sin mi consentimiento 
  expreso, salvo obligación legal.

Fecha de firma: [FECHA_HORA]
IP de firma:    [IP_FIRMANTE]
Dispositivo:    [DEVICE_INFO]
Nro. Documento: [PDF_NUMERO]
```

---

## 6. ESTADO ACTUAL DE IMPLEMENTACIÓN

| Fase | Descripción | Estado | Commit |
|------|-------------|--------|--------|
| Fase 0 | 7 bug fixes críticos módulo pacientes | ✅ COMPLETO | aa24872 |
| inactivarMascota | Reemplazar deleteMascota con inactivación + motivo | ✅ COMPLETO | 05b1d0f |
| Fase 1 | DB — tablas consentimiento + renumeración schemas | ✅ COMPLETO | fcc8b0e |
| Fase 2 | Backend API consentimiento digital (5 archivos) | ✅ COMPLETO | df38930 |
| Fase S | Seguridad urgente (hardening pre-producción) | ✅ COMPLETO | 0d857a2 |
| Fase MT1 | Multi-tenancy DB (tenants + tenant_id) | ✅ COMPLETO | — |
| Fase MT2 | Multi-tenancy Auth (JWT + middleware + frontend) | ⏳ PENDIENTE | — |
| Fase MT3 | RLS — aislamiento de datos por tenant | ⏳ PENDIENTE | — |
| Fase 3 | Frontend — página pública de firma | ⏳ PENDIENTE | — |
| Fase 4 | Frontend — panel expediente (badge + QR modal) | ⏳ PENDIENTE | — |
| Fase 5 | WhatsApp + Email + cron recordatorio | ⏳ PENDIENTE | — |
| Fase 6 | Legacy + deuda técnica | ⏳ PENDIENTE | — |

---

## 7. PLAN DE IMPLEMENTACIÓN — FASES AJUSTADAS

---

### ✅ FASE 0 — Bug fixes críticos módulo pacientes  *(COMPLETO)*

| # | Bug | Archivo | Estado |
|---|-----|---------|--------|
| 0.1 | `esterilizado` no se guarda en update | `pacientesController.js` | ✅ |
| 0.2 | `edad` se pone NULL sin `fecha_nacimiento` | `pacientesController.js` | ✅ |
| 0.3 | `DELETE /mascota/:id` no existía → `PATCH inactivar` | `pacientes.js` routes | ✅ |
| 0.4 | `POST /mascota` no existía | `pacientesController.js` | ✅ |
| 0.5 | `PUT /mascota/:id` sin validación | `pacientes.js` routes | ✅ |
| 0.6 | `loadClientes()` usaba `response.data.clients` | `paciente-form.component.ts` | ✅ |
| 0.7 | `medicamentos.split(',')` sobre JSONB | `paciente-details.component.ts` | ✅ |

---

### ✅ FASE 1 — Migración de base de datos  *(COMPLETO)*

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 1.1 | Tabla `clinical.versiones_consentimiento` | `10_consentimientos.sql` | ✅ |
| 1.2 | Tabla `clinical.consentimientos` | `10_consentimientos.sql` | ✅ |
| 1.3 | Columnas `consentimiento_firmado` + `id_consentimiento_vigente` en `clientes` | `10_consentimientos.sql` | ✅ |
| 1.4 | Schemas renumerados consecutivamente 01→10 | `DBInit.js` | ✅ |

---

### ✅ FASE 2 — Backend API consentimiento digital  *(COMPLETO)*

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 2.1 | `consentimientoPDFService.js` — genera PDF con firma embebida | `services/` | ✅ |
| 2.2 | `consentimientoController.js` — 6 funciones auth + públicas | `controllers/` | ✅ |
| 2.3 | `routes/public.js` — GET/POST `/api/public/consentimiento/:token` | `routes/` | ✅ |
| 2.4 | Rutas `/cliente/:idCliente/consentimiento/` en `pacientes.js` | `routes/` | ✅ |
| 2.5 | Montar `/api/public` + `mkdirSync uploads/consentimientos` | `server.js` | ✅ |

---

### 🔴 FASE S — Seguridad urgente  *(BLOQUEO DE PRODUCCIÓN)*

> Todos los ítems de esta fase son **obligatorios antes de cualquier despliegue** con usuarios reales.  
> Tiempo estimado: 1 día de trabajo.

#### S.1 — JWT secret fail-fast
**Problema:** `auth.js:6` usa `'vetplus_secret_key_2024'` como fallback si `JWT_SECRET` no está definida.  
**Riesgo:** Despliegue mal configurado compromete toda la autenticación.

| # | Tarea | Archivo | Cambio |
|---|-------|---------|--------|
| S.1.1 | Eliminar fallback hardcodeado — lanzar error si `JWT_SECRET` no está en `.env` | `backend/src/middleware/auth.js` | `if (!process.env.JWT_SECRET) throw new Error(...)` |
| S.1.2 | Agregar `JWT_SECRET` como requerida en `.env.example` | `.env.example` | Documentar |

#### S.2 — Rate limiting real
**Problema:** `rateLimiter.js` — todas las funciones son `next()` sin límites reales.  
**Riesgo:** Brute force en login, abuso de firma pública, DoS lógico.

| # | Tarea | Archivo | Límite recomendado |
|---|-------|---------|-------------------|
| S.2.1 | Activar `authRateLimit` real | `rateLimiter.js` | 10 req/15min por IP |
| S.2.2 | Activar `publicRateLimit` real | `rateLimiter.js` | 20 req/min por IP |
| S.2.3 | Activar `generalRateLimit` real | `rateLimiter.js` | 200 req/min por IP |
| S.2.4 | Condicional `NODE_ENV === 'development'` para desactivar en local | `rateLimiter.js` | — |

#### S.3 — Proteger `/api/test`
**Problema:** `server.js` monta `testRoutes` sin restricción de entorno.  
**Riesgo:** Rutas operativas expuestas en producción.

| # | Tarea | Archivo |
|---|-------|---------|
| S.3.1 | Condicionar montaje: `if (process.env.NODE_ENV !== 'production')` | `backend/server.js` |

#### S.4 — Restringir CORS en uploads
**Problema:** `/uploads` responde con `Access-Control-Allow-Origin: *`.  
**Riesgo:** Consumo cruzado no controlado de recursos.

| # | Tarea | Archivo |
|---|-------|---------|
| S.4.1 | Restringir a `FRONTEND_URL` y dominios conocidos | `backend/server.js` |

#### S.5 — Reactivar AuthGuard en frontend
**Problema:** `app.routes.ts` tiene `canActivate: [AuthGuard]` comentado en el layout principal y en `change-password`.  
**Riesgo:** Toda la UI accesible sin sesión activa.

| # | Tarea | Archivo | Líneas |
|---|-------|---------|--------|
| S.5.1 | Descomentar `canActivate: [AuthGuard]` en layout principal | `app.routes.ts` | ~44 |
| S.5.2 | Descomentar `canActivate: [AuthGuard]` en `change-password` | `app.routes.ts` | ~31 |

#### S.6 — Corregir inconsistencia `auth.usuarios` vs `vetplus_auth.usuarios`
**Problema:** Dos archivos usan el schema incorrecto `auth.` en lugar de `vetplus_auth.`.  
**Riesgo:** Queries fallando en runtime de forma silenciosa o con errores 500.

| # | Tarea | Archivo | Líneas |
|---|-------|---------|--------|
| S.6.1 | Cambiar `auth.usuarios` → `vetplus_auth.usuarios` | `backend/src/middleware/passwordCheck.js` | 21, 69 |
| S.6.2 | Cambiar `FROM auth.usuarios` → `FROM vetplus_auth.usuarios` | `backend/src/routes/appointments.js` | 252 |

#### S.7 — Corregir transacciones con cliente dedicado
**Problema:** Controladores que usan `BEGIN/COMMIT/ROLLBACK` llaman a `pool.query()` global, no a un cliente dedicado.  
**Riesgo:** Inconsistencia de datos bajo concurrencia (transacciones se mezclan entre requests).  
**Nota:** `getClient()` ya existe en `database.js` — solo falta usarlo consistentemente.

| # | Tarea | Archivo |
|---|-------|---------|
| S.7.1 | Auditar controladores con transacciones manuales y migrar a `getClient()` + `client.release()` | `controllers/*.js` |

---

### 🟠 FASE MT1 — Multi-tenancy: capa de base de datos

> Primer pilar del SaaS. Sin esto, todos los datos de todas las clínicas son accesibles transversalmente.

#### MT1.1 — Tabla `system.tenants`
Archivo nuevo: `backend/src/database/schemas/11_tenants.sql`

```sql
CREATE TABLE IF NOT EXISTS system.tenants (
  id_tenant  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT UNIQUE NOT NULL,        -- ej: 'vetplus-norte', usado en subdominio
  nombre     TEXT NOT NULL,
  estado     TEXT NOT NULL DEFAULT 'active'
             CHECK (estado IN ('active', 'suspended', 'cancelled')),
  plan       TEXT NOT NULL DEFAULT 'standard'
             CHECK (plan IN ('standard', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant inicial (clínica demo/admin)
INSERT INTO system.tenants (id_tenant, slug, nombre)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'VetPlus Demo')
ON CONFLICT (slug) DO NOTHING;
```

#### MT1.2 — Columna `id_tenant` en tablas core
Archivo nuevo: `backend/src/database/schemas/12_tenant_columns.sql`

Tablas que requieren `id_tenant`:

| Tabla | Schema |
|-------|--------|
| `vetplus_auth.usuarios` | auth |
| `clinical.clientes` | clinical |
| `clinical.mascotas` | clinical |
| `clinical.consultas_clinicas` | clinical |
| `clinical.calendario_citas` | clinical |
| `clinical.consentimientos` | clinical |
| `system.configuracion_empresa` | system |

```sql
-- Patrón para cada tabla:
ALTER TABLE <schema>.<tabla>
  ADD COLUMN IF NOT EXISTS id_tenant UUID
  REFERENCES system.tenants(id_tenant)
  ON DELETE RESTRICT;

-- Backfill con tenant inicial
UPDATE <schema>.<tabla>
SET id_tenant = '00000000-0000-0000-0000-000000000001'
WHERE id_tenant IS NULL;

-- Una vez backfill completo, hacer NOT NULL
ALTER TABLE <schema>.<tabla>
  ALTER COLUMN id_tenant SET NOT NULL;
```

#### MT1.3 — Registrar en DBInit.js
- Agregar `11_tenants.sql` y `12_tenant_columns.sql` a `migrationFiles` y `schemaFiles`

---

### 🟠 FASE MT2 — Multi-tenancy: autenticación y contexto

#### MT2.1 — JWT con `tenant_id`
**Archivo:** `backend/src/middleware/auth.js`

```js
// generateToken — agregar tenant_id al payload
const payload = {
  id: user.id_usuario,
  email: user.email,
  rol: user.rol,
  nombre: user.nombre,
  tenant_id: user.id_tenant   // NUEVO
};
```

La consulta en `authenticateToken` debe enriquecer `req.user` con `id_tenant`:
```js
'SELECT id_usuario, email, nombre, rol, activo, id_tenant
 FROM vetplus_auth.usuarios WHERE id_usuario = $1'
```

#### MT2.2 — Middleware `tenantContext`
Archivo nuevo: `backend/src/middleware/tenantContext.js`

```js
export function tenantContext(req, res, next) {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(403).json({ message: 'Contexto de clínica no resuelto' });
  req.tenantId = tenantId;
  next();
}
```
- Montar después de `authenticateToken` en todas las rutas clínicas
- En rutas públicas (consentimiento), resolver `tenant_id` desde el consentimiento mismo (via token)

#### MT2.3 — Frontend: interceptor con tenant slug
**Archivo:** interceptor HTTP de Angular

```ts
// Resolver slug desde subdominio
const tenantSlug = window.location.hostname.split('.')[0];

req.clone({ setHeaders: {
  Authorization: `Bearer ${token}`,
  'X-Tenant-Slug': tenantSlug
}});
```

---

### 🟡 FASE MT3 — RLS: aislamiento fuerte de datos

> Se ejecuta una vez que `tenant_id` está en todas las tablas y backfill completo.

Archivo nuevo: `backend/src/database/schemas/13_rls_policies.sql`

```sql
-- Patrón por tabla:
ALTER TABLE clinical.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_clientes ON clinical.clientes
  USING (id_tenant = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id_tenant = current_setting('app.tenant_id', true)::uuid);
```

Tablas a proteger: `clientes`, `mascotas`, `consultas_clinicas`, `calendario_citas`, `consentimientos`

Activar contexto en cada query autenticada:
```js
await client.query(`SET LOCAL app.tenant_id = '${req.tenantId}'`);
```

---

### 🔵 FASE 3 — Frontend: página pública de firma

> Sin dependencias de MT (las rutas públicas trabajan con token, no con tenant JWT).  
> Puede desarrollarse en paralelo a las fases MT si se desea.

| # | Tarea | Archivo |
|---|-------|---------|
| 3.1 | `npm install signature_pad --prefix frontend` | — |
| 3.2 | Crear `ConsentimientoPublicoComponent` — mobile-first, fuera del `AuthGuard` | `frontend/src/app/components/consentimiento-publico/` |
| 3.3 | Ruta pública en `app.routes.ts`: `/consentimiento/:token` | `app.routes.ts` |
| 3.4 | Layout: logo clínica + texto legal (scroll) + datos propietario/mascota + canvas `signature_pad` | — |
| 3.5 | Estados: `cargando` / `pendiente` / `ya firmado` / `expirado` / `error` / `éxito` | — |
| 3.6 | Servicio `ConsentimientosPublicoService` para consumir `/api/public/consentimiento/` | `services/` |

---

### 🔵 FASE 4 — Frontend: panel de consentimiento en expediente

| # | Tarea | Archivo |
|---|-------|---------|
| 4.1 | `ConsentimientosService` — métodos HTTP (crear, estado, reenviar, descargar PDF) | `frontend/src/app/services/consentimientos.service.ts` |
| 4.2 | `ConsentimientoStatusComponent` — badge + botones (Enviar/Reenviar/Ver QR/Descargar PDF) | `components/consentimiento-status/` |
| 4.3 | Integrar `ConsentimientoStatusComponent` en `paciente-details.component.ts`, sección propietario | `paciente-details.component.ts` |
| 4.4 | `QRModalComponent` — muestra QR generado + polling `/estado` cada 5s + cierre automático al firmar | `components/qr-modal/` |
| 4.5 | Abrir `QRModalComponent` automáticamente al crear nuevo paciente (post `createPacienteCompleto`) | `paciente-form.component.ts` |

---

### 🟢 FASE 5 — Integración WhatsApp + Email

*Depende de que el servicio de WhatsApp esté configurado en el tenant.*

| # | Tarea | Archivo |
|---|-------|---------|
| 5.1 | Enviar enlace de firma por WhatsApp al crear consentimiento | `consentimientoController.js → crearConsentimiento()` |
| 5.2 | Enviar PDF firmado por WhatsApp al procesar firma | `consentimientoController.js → firmarConsentimiento()` |
| 5.3 | Enviar PDF firmado por email si `cliente.email` existe | `consentimientoController.js → firmarConsentimiento()` |
| 5.4 | Cron job: recordatorio 24h a consentimientos pendientes sin firmar | `backend/src/services/syncScheduler.js` |

---

### 🟢 FASE 6 — Deuda técnica y legacy

| # | Tarea | Riesgo |
|---|-------|--------|
| 6.1 | Unificar `sexo` a `'Macho'`/`'Hembra'` en DB + migration de filas existentes | Medio |
| 6.2 | Deprecar y eliminar rutas `/api/clinical/pets` (legacy petController) | Alto — coordinar con frontend |
| 6.3 | Agregar validación UUID en `GET /:id` y `PUT /:id` en pacientes routes | Bajo |
| 6.4 | Eliminar imports muertos en `clinical.js` | Bajo |
| 6.5 | Reemplazar `error.message` expuesto en respuestas 500 por mensaje genérico | Bajo |

---

## 8. ORDEN DE EJECUCIÓN Y MÍNIMOS POR ETAPA

```
COMPLETADO:
  Fase 0 ✅ → Fase 1 ✅ → Fase 2 ✅

PRÓXIMAS ITERACIONES:
  Fase S → Fase MT1 → Fase MT2 → Fase MT3 → Fase 3 → Fase 4 → Fase 5 → Fase 6
  (seg)    (DB MT)    (auth MT)   (RLS)      (pág pub) (panel)  (notif)  (legacy)

── MÍNIMO PARA PRODUCCIÓN SINGLE-TENANT (una clave clínica) ──────────────────
   Fase S + Fase 3
   (seguridad básica + página pública de firma funcional)

── MÍNIMO PARA PRODUCCIÓN MULTI-TENANT (varias clínicas) ────────────────────
   Fase S + Fase MT1 + Fase MT2 + Fase MT3 + Fase 3

── PRODUCTO COMPLETO ─────────────────────────────────────────────────────────
   Todas las fases
```

---

## 9. DEPENDENCIAS NPM

```bash
# Frontend (pendiente)
npm install signature_pad --prefix frontend

# Backend (ya instaladas)
# pdfkit ✅  qrcode ✅  uuid ✅  multer ✅  express-rate-limit ✅
```

---

## 10. ARQUITECTURA OBJETIVO (SaaS multi-tenant)

```
Request HTTP
    │
    ├─ [AuthGuard Frontend] ← Fase S (reactivar)
    │
    ▼
Express Server
    │
    ├─ authenticateToken     ← Fase MT2 (+ tenant_id en JWT)
    ├─ tenantContext          ← Fase MT2 (nuevo middleware)
    ├─ SET LOCAL app.tenant_id ← Fase MT3 (contexto RLS)
    │
    ▼
PostgreSQL + RLS
    │
    └─ POLICY: id_tenant = current_setting('app.tenant_id') ← Fase MT3
```

---

*Este documento es la fuente de verdad. Actualizar estado de cada fase al completarla.*

