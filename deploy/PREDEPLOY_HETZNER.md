# Plan Pre-Despliegue VetPlus (VPS Hetzner)

## 0) Pre-fase tecnica (Punto 1 cerrado)

### Decision de arquitectura para primera salida
- Modelo: monolito web en 1 VPS (frontend + backend + PostgreSQL + uploads en el mismo servidor).
- Objetivo: salir rapido a pruebas reales, minimizar complejidad operativa y costo inicial.
- Orquestacion: sin Docker en esta primera fase.
- Proceso backend: `PM2` como estandar operativo.

### Topologia base aprobada
- Dominio: multi-tenant por subdominio para frontend (`tenant-a.tu-dominio.com`, `tenant-b.tu-dominio.com`) y API compartida en `api.tu-dominio.com`.
- Nginx:
   - sirve el build Angular estatico.
   - enruta `api.tu-dominio.com` hacia Node en `127.0.0.1:3000`.
- Backend Node: escucha solo en localhost (no expuesto directo a Internet).
- PostgreSQL: escucha solo en localhost.
- Uploads: persistencia local en `/var/vetplus/uploads`.

### Tamano inicial recomendado (arranque)
- VPS: 4 vCPU, 8 GB RAM, 160 GB SSD, Ubuntu 24.04 LTS.
- Escalamiento esperado: vertical (8 vCPU/16 GB) si crece carga en pruebas reales.

### Lo que NO haremos en esta primera salida
- No microservicios.
- No base de datos gestionada externa.
- No cluster de alta disponibilidad.
- No CDN avanzada desde el dia 1.

### Criterio de exito de este punto
- Arquitectura aprobada por negocio/tecnico.
- Costos de infraestructura inicial definidos.
- Lista de compra preparada: 1 VPS + 1 dominio + SSL Let's Encrypt.

### Decision multi-tenant de acceso (cerrada)
- Todos los tenants usan el mismo backend y la misma base de codigo frontend.
- El contexto tenant se resuelve por subdominio en login (`X-Tenant-Slug`).
- No se usara login central con selector manual en esta fase.

#### Implicaciones operativas
- DNS requerido:
   - `api.tu-dominio.com` -> IP del VPS.
   - `*.tu-dominio.com` -> IP del VPS (wildcard para tenants).
- SSL recomendado:
   - certificado para `api.tu-dominio.com`.
   - wildcard `*.tu-dominio.com` para subdominios tenant.
- Naming tenant:
   - usar slugs simples y estables (ej: `clinica-norte`, `santa-maria`).
   - evitar cambios de slug en caliente durante pruebas reales.

## 1) Objetivo
Tener un entorno real en VPS (backend + frontend + PostgreSQL + archivos) listo en pocos dias para pruebas operativas con usuarios reales de prueba, con seguridad minima, backups y rollback.

## 2) Arquitectura objetivo (1 VPS)
- Sistema operativo: Ubuntu 24.04 LTS.
- Reverse proxy: Nginx (80/443).
- Backend: Node.js gestionado con PM2 en puerto interno 3000.
- Frontend: Angular build estatico servido por Nginx.
- Base de datos: PostgreSQL local (misma VPS, localhost).
- Archivos: disco local en `/var/vetplus/uploads`.
- SSL: Let's Encrypt.

## 3) Criterios de salida (Go/No-Go)
Se autoriza salida a pruebas reales solo si:
- Health checks OK (`/health`, `/health/ready`, `/health/live`).
- Login, creacion de cita, cierre de cita, envio de correo y firma consentimiento funcionan en dominio real.
- Backups automaticos de BD y uploads verificados con restauracion de prueba.
- Endpoints administrativos protegidos (sin exposicion publica).
- Logs y monitoreo basico habilitados.

## 4) Plan por dias (ejecutable)

### Dia 1: Hardening y calidad minima en codigo
1. Quitar secretos versionados y rotar credenciales.
2. Proteger endpoints admin no autenticados.
3. Dejar comandos de calidad funcionales:
   - Backend: lint + tests minimos.
   - Frontend: build de produccion estable.
4. Congelar variables requeridas para produccion (`.env.production` en servidor, no en git).

Entregables Dia 1:
- Lista de secretos rotados.
- Commit de seguridad aplicado.
- `npm run build` frontend OK.
- `npm run test` backend ejecutable (al menos smoke).

### Dia 2: Provisionamiento VPS Hetzner
1. Crear VPS (recomendado: 4 vCPU, 8 GB RAM, 160+ GB SSD).
2. Configuracion base:
   - Usuario no root con sudo.
   - UFW habilitado (22, 80, 443; PostgreSQL solo localhost).
   - Fail2ban opcional.
3. Instalar runtime:
   - Node.js LTS (20+), npm.
   - PostgreSQL 16.
   - Nginx.
   - Certbot.
4. Estructura de carpetas:
   - `/var/www/vetplus/frontend`
   - `/var/www/vetplus/backend`
   - `/var/vetplus/uploads`
   - `/var/log/vetplus`
   - `/var/backups/vetplus`

Entregables Dia 2:
- VPS accesible por SSH.
- Dominio apuntando a IP.
- Servicios instalados.

### Dia 3: Despliegue tecnico inicial
1. Backend:
   - Subir codigo a `/var/www/vetplus/backend`.
   - Crear `.env.production` en servidor.
   - Ejecutar `npm ci` y migraciones.
   - Levantar proceso con PM2.
2. Frontend:
   - `npm ci && npm run build`.
   - Publicar dist en `/var/www/vetplus/frontend`.
3. Nginx:
   - Configurar server block para SPA + `/api` proxy.
   - Activar gzip/cache.
4. SSL:
   - Emitir certificado y forzar HTTPS.

Entregables Dia 3:
- App disponible en dominio.
- API respondiendo por HTTPS.

### Dia 4: Datos y operacion real de pruebas
1. Cargar datos de prueba representativos (no productivos).
2. Verificar flujos criticos end-to-end:
   - Auth multi-tenant.
   - Citas y documentos clinicos.
   - Correo saliente y logs de entrega.
   - Consentimiento (link/QR/firma).
3. Ajustar limites operativos:
   - Pool DB.
   - rate limit.
   - tamano maximo de archivos.

Entregables Dia 4:
- Matriz de pruebas firmada.
- Lista corta de bugs de bloqueo.

### Dia 5: Backups, monitoreo y rollback
1. Backups automaticos:
   - BD diaria (`pg_dump`) + retencion 7-14 dias.
   - Uploads con `rsync`/snapshot diario.
2. Prueba de restauracion real (BD + archivos).
3. Monitoreo basico:
   - estado de servicio backend.
   - uso CPU/RAM/disco.
   - errores 5xx en Nginx/backend.
4. Plan de rollback documentado y probado.

Entregables Dia 5:
- Backup/restore validado.
- Procedimiento de rollback en 15 min.

## 5) Checklist tecnico (must-have)

### Seguridad
- [ ] No hay secretos en repositorio.
- [ ] JWT y claves SMTP rotadas.
- [ ] Endpoints admin protegidos por auth + rol.
- [ ] UFW activo y puertos minimos.
- [ ] HTTPS forzado + certificado valido.

### Backend
- [ ] `NODE_ENV=production`.
- [ ] Migraciones aplicadas y validadas.
- [ ] PM2 con restart automatico.
- [ ] Logs persistentes en disco.
- [ ] Health endpoints respondiendo.

### Frontend
- [ ] Build de produccion desplegado.
- [ ] `environment.prod` apuntando al dominio real API.
- [ ] Carga SPA y rutas internas funcionando.

### Base de datos y archivos
- [ ] PostgreSQL solo local (sin exposicion publica).
- [ ] Backups diarios configurados.
- [ ] Restore de prueba ejecutado correctamente.
- [ ] Permisos correctos en `/var/vetplus/uploads`.

### Operacion
- [ ] Smoke test funcional completado.
- [ ] Error budget inicial definido (ej: <=1% 5xx en pruebas).
- [ ] Responsable de guardia durante pruebas reales.

## 6) Comandos base sugeridos (VPS)

### Paquetes base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw
```

### Node LTS (nvm)
```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
```

### Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### PM2 (estandar)
```bash
npm i -g pm2
pm2 start server-production.js --name vetplus-backend
pm2 save
pm2 startup
```

### Backup BD diario (ejemplo cron)
```bash
0 2 * * * pg_dump -U vetplus_user vetplus > /var/backups/vetplus/db_$(date +\%F).sql
```

## 7) Riesgos actuales que deben cerrarse antes de pruebas reales
- Endpoints administrativos expuestos en servidor de produccion.
- Archivo `.env.production` dentro del repositorio.
- Suite de pruebas/lint sin ejecucion estable en este entorno.

## 8) Definicion de "listo para pruebas reales"
Se considera listo cuando se completen todos los items must-have del checklist, se aprueben flujos criticos E2E, y exista restauracion probada de backups.

## 9) Que hacer mientras Hetzner valida la cuenta (hoy)

Objetivo: llegar al dia de aprobacion con todo listo para desplegar en una sola jornada.

### 9.1 Preparar DNS (sin cambiar nada aun)
- Definir estos registros para aplicar apenas exista la IP del VPS:
   - `A ramelo.app -> IP_VPS`
   - `A api.ramelo.app -> IP_VPS`
   - `A *.ramelo.app -> IP_VPS`
- Definir TTL inicial en 300s para cambios rapidos durante salida.

### 9.2 Definir variables de produccion
- Crear y llenar archivo base de entorno con valores reales (ver `deploy/env.production.backend.template`).
- Rotar o crear secretos fuertes:
   - `JWT_SECRET`
   - `GOOGLE_WEBHOOK_VERIFY_TOKEN`
   - `DB_PASSWORD`
   - `SUPERADMIN_PASSWORD`
   - `SUPERADMIN_DOCUMENTO`

### 9.3 Congelar release inicial
- Elegir commit objetivo de salida y etiquetarlo:
   - `git checkout main`
   - `git pull`
   - `git tag -a v1.0.0-prod-candidate -m "Primer candidato prod"`
   - `git push origin v1.0.0-prod-candidate`

### 9.4 Preparar smoke test de salida
Checklist rapido para ejecutar post-deploy:
- `GET /health`, `GET /health/ready`, `GET /health/live`
- Login por subdominio tenant
- Crear cita
- Completar cita y envio de correo
- Firma de consentimiento

### 9.5 Definir backups antes de salir
- BD: dump diario + retencion 14 dias.
- Uploads: copia diaria + retencion 14 dias.
- Snapshot VPS habilitado en Hetzner.

### 9.6 Definir decision de visibilidad publica del directorio de tenants
- Estado actual: listado publico activo.
- Decidir con cliente uno de estos modos:
   - publico completo
   - solo tenants autorizados (opt-in)
   - privado (sin listado publico)

### 9.7 Dia de aprobacion Hetzner: orden de ejecucion
1. Crear VPS Ubuntu 24.04 LTS.
2. Asociar SSH key y conectar por `ssh root@IP_VPS`.
3. Aplicar hardening basico (usuario sudo + UFW).
4. Instalar stack (Node, PostgreSQL, Nginx, Certbot, PM2).
5. Clonar codigo, cargar `.env.production`, migrar BD.
6. Build frontend, configurar Nginx, emitir SSL.
7. Ejecutar smoke test.

## 10) Criterio de avance para pasar al deploy
- [ ] DNS definido y validado en proveedor.
- [ ] Template de variables de produccion lleno (sin subir secretos a git).
- [ ] Tag de release creado.
- [ ] Smoke test acordado.
- [ ] Politica de backups confirmada.

## 11) Estado validado hoy (local, antes de VPS)

### 11.1 Backend y salud
- [x] `GET /health` responde 200.
- [x] `GET /health/ready` responde 200.
- [x] `GET /health/live` responde 200.

### 11.2 Recuperacion de acceso
- [x] Flujo de "Olvidaste tu contraseña" operativo por documento/correo.
- [x] Enlace de recuperacion apunta a ruta publica de reset de contraseña.
- [x] Endpoint de reset valida token invalido y responde 400 (sin error 500).

### 11.3 Flujos criticos de negocio (confirmados)
- [x] Salida y entrega de correo de recuperacion de contraseña.
- [x] Salida y entrega de correo de reseteo.
- [x] Salida y entrega de correo de nueva cita.
- [x] Salida y entrega de correo de reagendamiento.
- [x] Salida y entrega de correo de documentos clinicos.
- [x] Salida y entrega de correo de consentimiento.

### 11.4 Pendientes que siguen bloqueando salida real
- [ ] Ejecutar las mismas validaciones en dominio HTTPS real con subdominios tenant.
- [ ] Validar DNS wildcard y certificado SSL en VPS.
- [ ] Validar backup y restauracion en servidor de produccion.

## 12) Runbook Dia 0 (cuando Hetzner habilite la cuenta)

Objetivo: desplegar en una jornada y cerrar smoke test en dominio real.

### 12.1 Preparacion inicial en VPS
1. Conectar por SSH como root y crear usuario operativo con sudo.
2. Activar firewall (22, 80, 443) y deshabilitar acceso root por password.
3. Instalar Node 20, PostgreSQL 16, Nginx y Certbot.

### 12.2 Estructura y permisos
1. Crear carpetas:
   - `/var/www/vetplus/backend`
   - `/var/www/vetplus/frontend`
   - `/var/vetplus/uploads`
   - `/var/backups/vetplus`
   - `/var/log/vetplus`
2. Asignar propietario al usuario operativo y permisos minimos necesarios.

### 12.3 Base de datos
1. Crear usuario y base PostgreSQL de produccion.
2. Cargar esquema/migraciones.
3. Validar conexion desde backend con variables de entorno de produccion.

### 12.4 Backend
1. Publicar codigo en `/var/www/vetplus/backend`.
2. Crear archivo `/var/www/vetplus/backend/.env.production` con valores reales.
3. Ejecutar `npm ci` y levantar con PM2.
4. Confirmar que escucha solo en localhost:3000.

### 12.5 Frontend
1. Publicar codigo en `/var/www/vetplus/frontend`.
2. Ejecutar `npm ci` y `npm run build`.
3. Configurar Nginx para servir la SPA y proxy `/api` hacia `127.0.0.1:3000`.

### 12.6 DNS y SSL
1. Aplicar registros DNS:
   - `A ramelo.app -> IP_VPS`
   - `A api.ramelo.app -> IP_VPS`
   - `A *.ramelo.app -> IP_VPS`
2. Emitir certificados SSL para dominio raiz, API y wildcard tenant segun estrategia DNS elegida.
3. Forzar HTTPS en Nginx.

### 12.7 Smoke test final (go/no-go)
1. `GET /health`, `/health/ready`, `/health/live` en `api.ramelo.app`.
2. Login desde subdominio tenant.
3. Crear cita, reagendar, completar cita.
4. Verificar envio real de correos (recuperacion, nueva cita, reagendamiento, documentos, consentimiento).
5. Abrir enlace de recuperacion y confirmar cambio de contraseña completo.

### 12.8 Cierre de salida
1. Activar backups diarios (BD + uploads) con retencion.
2. Verificar logs y monitoreo basico.
3. Documentar resultado de smoke test y decision final go/no-go.
