# Analisis Completo VetPlus V2

## Matriz de Compatibilidad Frontend vs Backend

Leyenda:
- OK: Endpoint consumido por frontend y existente en backend.
- NO: Endpoint consumido por frontend y no existente o con path/metodo distinto.
- PARCIAL: Existe endpoint cercano, pero la ruta o contrato no coincide totalmente.

### 1) Auth y Usuarios

| Modulo | Metodo | Frontend usa | Backend real | Estado | Accion recomendada |
|---|---|---|---|---|---|
| Auth | POST | /api/auth/login | /api/auth/login | OK | Sin cambios |
| Auth | POST | /api/auth/logout | /api/auth/logout | OK | Sin cambios |
| Auth | PUT | /api/auth/change-password | /api/auth/change-password | OK | Sin cambios |
| Auth | POST | /api/auth/refresh | /api/auth/refresh | OK | Sin cambios |
| Auth | GET | /api/auth/me | /api/auth/me | OK | Sin cambios |
| Usuarios | GET | /api/auth/users | /api/auth/users | OK | Sin cambios |
| Usuarios | GET | /api/auth/users/:id | /api/auth/users/:id | OK | Sin cambios |
| Usuarios | POST | /api/auth/users | /api/auth/users | OK | Sin cambios |
| Usuarios | PUT | /api/auth/users/:id | /api/auth/users/:id | OK | Sin cambios |
| Usuarios | PATCH | /api/auth/users/:id/estado | /api/auth/users/:id/estado | OK | Sin cambios |
| Usuarios | DELETE | /api/auth/users/:id | /api/auth/users/:id | OK | Sin cambios |
| Usuarios | GET | /api/auth/users/stats | /api/auth/users/stats | OK | Sin cambios |
| Usuarios | POST | /api/auth/admin/generate-temp-password | /api/auth/admin/generate-temp-password | OK | Sin cambios |
| Usuarios | POST | /api/auth/users/:id/cambiar-password | No existe | NO | Cambiar frontend a /api/auth/users/:id/set-password o crear ruta alias |
| Usuarios | POST | /api/auth/users/resetear-password | No existe | NO | Cambiar frontend a /api/auth/users/:id/reset-password |
| Usuarios | PUT | /api/auth/admin/force-password-change/:id | No existe (backend usa POST /api/auth/users/:id/force-password-change) | NO | Ajustar frontend a POST /api/auth/users/:id/force-password-change |
| Usuarios | GET | /api/auth/roles | No existe | NO | Implementar roles o remover consumo |
| Usuarios | GET | /api/auth/permisos | No existe | NO | Implementar permisos o remover consumo |
| Usuarios | GET | /api/auth/logs-actividad | No existe en auth (existe audit en /api/audit/activities) | NO | Redirigir frontend a /api/audit/activities o crear alias |
| Usuarios | GET | /api/auth/sesiones-activas | No existe en auth (existe /api/audit/sessions) | NO | Redirigir frontend a /api/audit/sessions o crear alias |
| Usuarios | GET/PUT | /api/auth/configuracion-seguridad | No existe | NO | Implementar endpoint o quitar funcionalidad |

### 2) Clinico: Citas, Consultas, Pacientes, Clientes

| Modulo | Metodo | Frontend usa | Backend real | Estado | Accion recomendada |
|---|---|---|---|---|---|
| Citas | GET | /api/clinical/appointments | /api/clinical/appointments | OK | Sin cambios |
| Citas | POST | /api/clinical/appointments | /api/clinical/appointments | OK | Sin cambios |
| Citas | GET | /api/clinical/appointments/:id | /api/clinical/appointments/:id | OK | Sin cambios |
| Citas | PUT | /api/clinical/appointments/:id | /api/clinical/appointments/:id | OK | Sin cambios |
| Citas | PATCH | /api/clinical/appointments/:id/status | /api/clinical/appointments/:id/status | OK | Sin cambios |
| Citas | DELETE | /api/clinical/appointments/:id | /api/clinical/appointments/:id | OK | Sin cambios |
| Citas | GET | /api/clinical/appointments/calendar | /api/clinical/appointments/calendar | OK | Sin cambios |
| Citas | GET | /api/clinical/appointments/stats | /api/clinical/appointments/stats | OK | Sin cambios |
| Citas | POST | /api/clinical/appointments/:id/sync-google | /api/clinical/appointments/:id/sync-google | OK | Sin cambios |
| Citas | POST | /api/clinical/appointments/force-sync-google | /api/clinical/appointments/force-sync-google | OK | Sin cambios |
| Citas | GET | /api/clinical/appointments/veterinarian/:id | /api/clinical/appointments/vet/:id | NO | Cambiar frontend a /vet/:id o agregar alias /veterinarian/:id |
| Citas | GET | /api/clinical/appointments/veterinarian/:id/availability | /api/clinical/appointments/vet/:id/availability | NO | Cambiar frontend a /vet/:id/availability o agregar alias |
| Citas | GET | /api/clinical/appointments/pet/:id | /api/clinical/appointments/pet/:id | OK | Sin cambios |
| Citas | GET | /api/clinical/veterinarians | /api/clinical/veterinarians | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations | /api/clinical/consultations | OK | Sin cambios |
| Consultas | POST | /api/clinical/consultations | /api/clinical/consultations | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations/:id | /api/clinical/consultations/:id | OK | Sin cambios |
| Consultas | PUT | /api/clinical/consultations/:id | /api/clinical/consultations/:id | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations/stats | /api/clinical/consultations/stats | OK | Sin cambios |
| Consultas | POST | /api/clinical/consultations/from-appointment/:id_cita | /api/clinical/consultations/from-appointment/:id_cita | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations/by-appointment/:id_cita | /api/clinical/consultations/by-appointment/:id_cita | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations/pet/:id | /api/clinical/consultations/pet/:id | OK | Sin cambios |
| Consultas | GET | /api/clinical/consultations/pet/:id/history | /api/clinical/consultations/pet/:id/history | OK | Sin cambios |
| Consultas | GET | /api/clinical/appointments/:id/consultation | /api/clinical/appointments/:id/consultation | OK | Sin cambios |
| Consultas | DELETE | /api/clinical/consultations/:id | No existe | NO | Agregar DELETE en backend o eliminar opcion de UI |
| Consultas | POST | /api/clinical/consultations/:id/documents | Existe similar: /api/clinical/consultations/:id/upload-files | PARCIAL | Ajustar frontend a upload-files o crear alias documents |
| Consultas | GET | /api/clinical/consultations/:id/documents | Existe similar: /api/clinical/consultations/:id/files | PARCIAL | Ajustar frontend a files o crear alias documents |
| Consultas | DELETE | /api/clinical/consultations/:id/documents/:docId | Existe similar: /api/clinical/consultations/:id/files/:fileId | PARCIAL | Alinear path y nombre de parametro |
| Consultas | GET | /api/clinical/documents/:id/download | No existe | NO | Crear endpoint download o exponer URL directa de archivos |
| Consultas | DELETE | /api/clinical/documents/:id | No existe | NO | Crear endpoint o usar /consultations/:id/files/:fileId |
| Consultas | GET | /api/clinical/consultations/pet/:id/export | No existe | NO | Implementar export historico o retirar boton |
| Consultas | GET/POST/PUT/DELETE | /api/clinical/consultation-templates* | No existe | NO | Implementar modulo de plantillas o quitar consumo |
| Pacientes | GET | /api/clinical/pacientes | /api/clinical/pacientes | OK | Sin cambios |
| Pacientes | POST | /api/clinical/pacientes | /api/clinical/pacientes | OK | Sin cambios |
| Pacientes | PUT | /api/clinical/pacientes/:id | /api/clinical/pacientes/:id | OK | Sin cambios |
| Pacientes | GET | /api/clinical/pacientes/:id | /api/clinical/pacientes/:id | OK | Sin cambios |
| Pacientes | GET | /api/clinical/pacientes/stats | /api/clinical/pacientes/stats | OK | Sin cambios |
| Pacientes | GET | /api/clinical/pacientes/especies | /api/clinical/pacientes/especies | OK | Sin cambios |
| Pacientes | GET | /api/clinical/pacientes/especies/:especie/razas | /api/clinical/pacientes/especies/:especie/razas | OK | Sin cambios |
| Pacientes | PUT | /api/clinical/pacientes/mascota/:id | /api/clinical/pacientes/mascota/:id | OK | Sin cambios |
| Pacientes | POST | /api/clinical/pacientes/:id/foto | /api/clinical/pacientes/:id/foto | OK | Sin cambios |
| Pacientes | GET | /api/clinical/pacientes/:id/foto | /api/clinical/pacientes/:id/foto | OK | Sin cambios |
| Pacientes | DELETE | /api/clinical/pacientes/:id/foto | /api/clinical/pacientes/:id/foto | OK | Sin cambios |
| Pacientes | POST | /api/clinical/pacientes/mascota | No existe | NO | Crear endpoint o migrar a /api/clinical/pets |
| Pacientes | DELETE | /api/clinical/pacientes/mascota/:id | No existe | NO | Crear endpoint o migrar a /api/clinical/pets/:id |
| Clientes | GET/POST/PUT/DELETE | /api/clinical/clientes* | Alias existente via clinical.js -> clients.js | OK | Sin cambios |

### 3) Financiero: Facturas, Productos, Cajas, Terapias, Proveedores

| Modulo | Metodo | Frontend usa | Backend real | Estado | Accion recomendada |
|---|---|---|---|---|---|
| Facturas | GET | /api/financial/invoices | /api/financial/invoices | OK | Sin cambios |
| Facturas | GET | /api/financial/invoices/:id | /api/financial/invoices/:id | OK | Sin cambios |
| Facturas | POST | /api/financial/invoices | /api/financial/invoices | OK | Sin cambios |
| Facturas | PUT | /api/financial/invoices/:id | /api/financial/invoices/:id | OK | Sin cambios |
| Facturas | PATCH | /api/financial/invoices/:id/status | /api/financial/invoices/:id/status | OK | Sin cambios |
| Facturas | GET | /api/financial/invoices/:id/export | /api/financial/invoices/:id/export | OK | Sin cambios |
| Facturas | GET/POST | /api/financial/cotizaciones* | No existe | NO | Implementar modulo cotizaciones o quitar UI |
| Facturas | POST | /api/financial/invoices/:id/whatsapp | No existe (backend usa /api/whatsapp/send-factura) | NO | Cambiar frontend a /api/whatsapp/send-factura |
| Productos | GET | /api/financial/products | /api/financial/products | OK | Sin cambios |
| Productos | GET | /api/financial/products/:id | /api/financial/products/:id | OK | Sin cambios |
| Productos | POST | /api/financial/products | /api/financial/products | OK | Sin cambios |
| Productos | PUT | /api/financial/products/:id | /api/financial/products/:id | OK | Sin cambios |
| Productos | DELETE | /api/financial/products/:id | /api/financial/products/:id | OK | Sin cambios |
| Productos | GET | /api/financial/products/categories | /api/financial/products/categories | OK | Sin cambios |
| Productos | GET | /api/financial/products/barcode/:barcode | /api/financial/products/barcode/:barcode | OK | Sin cambios |
| Productos | POST | /api/financial/movements | No existe | NO | Implementar movimientos o retirar llamada |
| Productos | CRUD | /api/financial/categories* | No existe | NO | Implementar categorias o usar products/categories existente |
| Productos | CRUD | /api/financial/subcategories* | No existe | NO | Implementar subcategorias o remover |
| Productos | GET | /api/financial/categories/export | No existe | NO | Implementar export o quitar opcion |
| Productos | GET | /api/financial/proveedores/export | No existe | NO | Implementar export proveedores |
| Productos | GET | /api/financial/proveedores/template | No existe | NO | Implementar template proveedores |
| Productos | GET | /api/financial/products/expiring-soon | No existe | NO | Implementar endpoint o remover consumo |
| Productos | GET | /api/financial/reports/movements | No existe | NO | Ajustar a /api/reports o crear en financiero |
| Productos | GET | /api/financial/reports/valuation | No existe | NO | Implementar o remover |
| Productos | GET | /api/financial/products/by-code/:codigo | No existe | NO | Usar /products/barcode/:barcode o crear alias |
| Productos | GET | /api/financial/export | No existe | NO | Implementar export inventario |
| Productos | POST | /api/financial/import | No existe | NO | Implementar import inventario |
| Productos | GET | /api/financial/import/template | No existe | NO | Implementar plantilla import |
| Cajas | GET/POST/PUT/PATCH/DELETE | /api/financial/cajas* | /api/financial/cajas* | OK | Sin cambios |
| Cajas | GET/POST | /api/financial/ingresos | Backend expone /api/financial/cajas/ingresos | NO | Cambiar frontend a /api/financial/cajas/ingresos |
| Cajas | GET/POST | /api/financial/egresos | Backend expone /api/financial/cajas/egresos | NO | Cambiar frontend a /api/financial/cajas/egresos |
| Cajas | GET/POST | /api/financial/transferencias | Backend expone /api/financial/cajas/transferencias | NO | Cambiar frontend a /api/financial/cajas/transferencias |
| Cajas | GET | /api/financial/reportes/financiero | Backend expone /api/financial/cajas/reportes/financiero | NO | Cambiar frontend a /api/financial/cajas/reportes/financiero |
| Terapias | GET/POST | /api/financial/therapies/* | Backend expone /api/financial/therapy/* | NO | Unificar prefijo therapy vs therapies (backend o frontend) |
| Proveedores | CRUD | /api/financial/proveedores* | /api/financial/proveedores* | OK | Sin cambios |

### 4) Reportes, Google Calendar, Configuracion, WhatsApp, Sistema

| Modulo | Metodo | Frontend usa | Backend real | Estado | Accion recomendada |
|---|---|---|---|---|---|
| Reportes | GET | /api/reports/dashboard | /api/reports/dashboard | OK | Sin cambios |
| Reportes | GET | /api/reports/sales | /api/reports/sales | OK | Sin cambios |
| Reportes | GET | /api/reports/inventory | /api/reports/inventory | OK | Sin cambios |
| Reportes | GET | /api/reports/patients | /api/reports/patients | OK | Sin cambios |
| Reportes | GET | /api/reports/profitability | /api/reports/profitability | OK | Sin cambios |
| Reportes | GET | /api/reports/alerts-kpis | /api/reports/alerts-kpis | OK | Sin cambios |
| Configuracion Empresa | GET/PUT | /api/admin/empresa/config | /api/admin/empresa/config | OK | Sin cambios |
| Configuracion Empresa | POST | /api/admin/empresa/logo | /api/admin/empresa/logo | OK | Sin cambios |
| Configuracion Empresa | GET/POST | /api/admin/empresa/dias-especiales | /api/admin/empresa/dias-especiales | OK | Sin cambios |
| Configuracion Empresa | GET | /api/admin/empresa/siguiente-numero/factura | /api/admin/empresa/siguiente-numero/factura | OK | Sin cambios |
| WhatsApp Config | GET/PUT | /api/admin/empresa/whatsapp | /api/admin/empresa/whatsapp | OK | Sin cambios |
| WhatsApp Config | GET/PUT | /api/admin/empresa/whatsapp/limites | /api/admin/empresa/whatsapp/limites | OK | Sin cambios |
| WhatsApp Config | GET | /api/admin/empresa/whatsapp/estado-limites | /api/admin/empresa/whatsapp/estado-limites | OK | Sin cambios |
| WhatsApp Config | POST | /api/admin/empresa/whatsapp/reset-contadores | /api/admin/empresa/whatsapp/reset-contadores | OK | Sin cambios |
| WhatsApp Config | POST | /api/admin/empresa/whatsapp/reanudar | /api/admin/empresa/whatsapp/reanudar | OK | Sin cambios |
| WhatsApp Operativo | GET/POST | /api/whatsapp/status, /qr, /restart, /logout, /stats, /messages, /retry/:id | Mismos endpoints existentes | OK | Sin cambios |
| Sistema | GET | /api/system/status | /api/system/status | OK | Sin cambios |
| Sistema | GET | /api/system/config-summary | /api/system/config-summary | OK | Sin cambios |
| Export Agenda | GET | /api/appointments/export/pdf | /api/appointments/export/pdf | OK | Sin cambios |
| Export Agenda | GET | /api/appointments/export/xlsx | /api/appointments/export/xlsx | OK | Sin cambios |
| Google Calendar (simple) | GET/POST | /api/google-calendar/simple/* | /api/google-calendar/simple/* | OK | Sin cambios |
| Google Calendar (core) | GET/POST | /api/google-calendar/configure, /auth-url, /sync-changes, /scheduler/* | Existen | OK | Sin cambios |
| Google Calendar (legacy service) | GET/POST | /api/google-calendar/status, /test, /force-sync, /disconnect, /calendars, POST /config | No existen con esos paths/metodos | NO | Deprecar servicio legacy y usar configuracion.service |

## Priorizacion de Correccion (orden recomendado)

1. Corregir rutas que rompen flujo principal (citas, pacientes, consultas, cajas).
2. Corregir auth/usuarios desalineado (password, roles/permisos falsos).
3. Corregir financiero avanzado (cotizaciones y productos no implementados).
4. Deprecar y eliminar servicios legacy de Google Calendar.
5. Agregar aliases controlados solo si son necesarios para compatibilidad temporal.

## Paquete Minimo para dejar sistema estable

- Alinear frontend con:
	- /api/clinical/appointments/vet/:id y /vet/:id/availability
	- /api/financial/cajas/ingresos, /egresos, /transferencias, /reportes/financiero
	- /api/whatsapp/send-factura (en lugar de /financial/invoices/:id/whatsapp)
	- /api/auth/users/:id/reset-password|set-password|force-password-change
- Remover temporalmente en frontend los modulos no implementados:
	- cotizaciones
	- consultation-templates
	- endpoints financieros de import/export/categorias/subcategorias/movements no existentes

## Checklist Ejecutable (orden sugerido)

1) Compatibilidad critica (flujo citas/consultas)
- Frontend: cambiar /api/clinical/appointments/veterinarian/* a /vet/* (ruta y availability).
- Backend (opcional alias): agregar alias /veterinarian/* si se prefiere compatibilidad rapida.
- Consultas: alinear documentos -> usar /:id/upload-files, /:id/files, /:id/files/:fileId y agregar DELETE en backend o desactivar boton.
- Decidir: implementar /api/clinical/documents/:id(/download) o ajustar UI para usar files existentes.

2) Cajas y facturacion
- Frontend: actualizar ingresos/egresos/transferencias/reportes a prefijo /api/financial/cajas/*.
- Frontend: enviar factura por WhatsApp via /api/whatsapp/send-factura (no /financial/invoices/:id/whatsapp).
- Terapias: unificar prefijo therapy vs therapies (elegir uno y ajustar frontend/backend o crear alias temporal).

3) Auth/Usuarios
- Ajustar llamadas de password a rutas reales: /api/auth/users/:id/set-password, /reset-password, /force-password-change (POST).
- Definir estrategia roles/permisos/logs/sesiones: implementar endpoints o desactivar UI (redirigir logs/sesiones a /api/audit/* si aplica).

4) Modulos no implementados (desactivar o planificar)
- Cotizaciones: esconder UI o crear modulo en backend.
- Consultation templates: esconder UI o implementar CRUD.
- Movements, categorias/subcategorias, import/export productos y reportes valuation/movements: decidir implementar o retirar.

5) Google Calendar legacy
- Deprecar servicio legacy (/status, /test, /force-sync, /disconnect, /calendars, POST /config) y usar configuracion.service (simple/core) como unico flujo.


