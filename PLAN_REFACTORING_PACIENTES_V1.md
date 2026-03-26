# PLAN REFACTORING MÓDULO DE PACIENTES + CONSENTIMIENTO DE DATOS
**VetPlus** | Rama: `feature/pacientes-refactor` | Fecha: Marzo 2026

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

## 6. PLAN DE IMPLEMENTACIÓN — FASES

---

### FASE 0 — Corrección de bugs críticos del módulo de pacientes
*(Sin estos fixes el refactoring es inestable)*

| # | Bug | Archivo | Acción |
|---|-----|---------|--------|
| 0.1 | `esterilizado` no se guarda en update | `pacientesController.js` | Agregar al SQL UPDATE |
| 0.2 | `edad` se pone NULL si no se reenvía `fecha_nacimiento` | `pacientesController.js` | Hacer el campo condicional |
| 0.3 | `DELETE /pacientes/mascota/:id` no existe | `pacientes.js` (routes) | Crear la ruta DELETE correcta |
| 0.4 | `POST /pacientes/mascota` no existe | `pacientes.service.ts` | Apuntar a `POST /` o crear ruta |
| 0.5 | `PUT /mascota/:id` sin validación | `pacientes.js` (routes) | Agregar middleware validador |
| 0.6 | `loadClientes()` usa key incorrecta | `paciente-form.component.ts` | Corregir `response.data.clients` → `response.data.clientes` |
| 0.7 | `medicamentos.split(',')` sobre JSONB | `paciente-details.component.ts` | Parsear correctamente el JSONB |

---

### FASE 1 — Migración de base de datos
*(Idempotente, sin romper datos existentes)*

| # | Tarea | Archivo a crear |
|---|-------|----------------|
| 1.1 | Crear tabla `clinical.consentimientos` | `13_consentimientos.sql` |
| 1.2 | Crear tabla `clinical.versiones_consentimiento` con texto legal inicial | `13_consentimientos.sql` |
| 1.3 | Agregar columnas `consentimiento_firmado` e `id_consentimiento_vigente` a `clientes` | `13_consentimientos.sql` |
| 1.4 | Registrar migration en `DBInit.js` | `DBInit.js` |

---

### FASE 2 — Backend: Controlador y rutas de consentimiento
| # | Tarea | Archivo |
|---|-------|---------|
| 2.1 | Crear `consentimientoController.js` con métodos: `crearConsentimiento`, `obtenerEstado`, `reenviarEnlace`, `descargarPDF`, `obtenerFormularioPublico`, `firmarConsentimiento` | `backend/src/controllers/consentimientoController.js` |
| 2.2 | Servicio `generarPDFConsentimiento()` usando PDFKit | `backend/src/services/consentimientoPDFService.js` |
| 2.3 | Crear rutas autenticadas bajo `/api/clinical/pacientes/:id/consentimiento` | `backend/src/routes/pacientes.js` |
| 2.4 | Crear rutas **públicas** (sin auth) bajo `/api/public/consentimiento/:token` con rate limit | `backend/src/routes/public.js` |
| 2.5 | Montar rutas públicas en `server.js` | `backend/server.js` |
| 2.6 | Agregar directorio de PDFs: `uploads/consentimientos/` | — |

---

### FASE 3 — Frontend: Página pública de firma
| # | Tarea | Archivo |
|---|-------|---------|
| 3.1 | Instalar `signature_pad` | `npm install signature_pad` |
| 3.2 | Crear `ConsentimientoPublicoComponent` (mobile-first, sin guard) | `frontend/src/app/components/consentimiento-publico/` |
| 3.3 | Agregar ruta pública en `app.routes.ts`: `/consentimiento/:token` | `app.routes.ts` |
| 3.4 | El componente muestra: texto legal + datos propietario + canvas firma + botón aceptar | — |
| 3.5 | Pantallas de estado: expirado / ya firmado / error / éxito | — |

---

### FASE 4 — Frontend: Panel de consentimiento en expediente
| # | Tarea | Archivo |
|---|-------|---------|
| 4.1 | Crear `ConsentimientoStatusComponent` (badge + botones) | `frontend/src/app/components/consentimiento-status/` |
| 4.2 | Integrar en `paciente-details.component.ts` — sección "Propietario" | `paciente-details.component.ts` |
| 4.3 | Integrar en `paciente-form.component.ts` — modal post-creación con QR | `paciente-form.component.ts` |
| 4.4 | Crear `QRModalComponent` — muestra QR + polling de confirmación | `frontend/src/app/components/qr-modal/` |
| 4.5 | Crear `ConsentimientosService` con métodos HTTP | `frontend/src/app/services/consentimientos.service.ts` |

---

### FASE 5 — Integración WhatsApp + Email
*(Depende de que WhatsApp y email estén configurados)*
| # | Tarea | Archivo |
|---|-------|---------|
| 5.1 | Integrar envío de WhatsApp con enlace en `crearConsentimiento()` | `consentimientoController.js` |
| 5.2 | Integrar envío de email con enlace + PDF en `firmarConsentimiento()` | `consentimientoController.js` |
| 5.3 | Cron job: recordatorio automático a propietarios con consentimiento pendiente > 24h | `backend/src/services/syncScheduler.js` |

---

### FASE 6 — Unificación de deuda técnica (legacy)
| # | Tarea | Riesgo |
|---|-------|-------|
| 6.1 | Unificar `sexo` a un solo formato en DB (`'Macho'`/`'Hembra'`) + migration de filas existentes | Medio |
| 6.2 | Deprecar y eliminar rutas `/api/clinical/pets` (legacy petController) | Alto — coordinar con frontend |
| 6.3 | Arreglar semántica de `edad` (años vs meses) en schema comment | Bajo |
| 6.4 | Eliminar import muerto en `clinical.js` | Bajo |
| 6.5 | Agregar validación UUID en `GET /:id` y `PUT /:id` | Bajo |
| 6.6 | Exponer `error.message` interno en respuestas 500 → reemplazar por mensaje genérico | Bajo |

---

## 7. ESTRUCTURA DE ARCHIVOS NUEVA

```
backend/src/
├── controllers/
│   └── consentimientoController.js       (NUEVO)
├── routes/
│   ├── pacientes.js                      (MODIFICADO — nuevas rutas de consentimiento)
│   └── public.js                         (NUEVO — rutas sin auth)
├── services/
│   └── consentimientoPDFService.js       (NUEVO)
├── database/
│   └── schemas/
│       └── 13_consentimientos.sql        (NUEVO)
└── uploads/
    └── consentimientos/                  (NUEVO — PDFs generados)

frontend/src/app/
├── components/
│   ├── consentimiento-publico/           (NUEVO)
│   │   ├── consentimiento-publico.component.ts
│   │   └── consentimiento-publico.component.html
│   ├── consentimiento-status/            (NUEVO — badge + botones)
│   │   └── consentimiento-status.component.ts
│   └── qr-modal/                         (NUEVO)
│       └── qr-modal.component.ts
└── services/
    └── consentimientos.service.ts        (NUEVO)
```

---

## 8. ORDEN DE EJECUCIÓN RECOMENDADO

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6
(bugs)   (DB)    (API)    (pág pub) (panel)  (notif)  (legacy)

Mínimo viable para producción:  FASE 0 + FASE 1 + FASE 2 + FASE 3
(funciona sin WhatsApp/email — el QR en recepción es suficiente)
```

---

## 9. DEPENDENCIAS NPM A INSTALAR

```bash
# Frontend
npm install signature_pad --prefix frontend

# Backend (ya están instaladas)
# pdfkit ✅  qrcode ✅  uuid ✅  multer ✅
```

---

*Este documento es la fuente de verdad para el desarrollo. Actualizar el estado de cada fase al completarla.*
