# Plan Pre-Despliegue VetPlus (VPS Hetzner)

## 1) Objetivo
Tener un entorno real en VPS (backend + frontend + PostgreSQL + archivos) listo en pocos dias para pruebas operativas con usuarios reales de prueba, con seguridad minima, backups y rollback.

## 2) Arquitectura objetivo (1 VPS)
- Sistema operativo: Ubuntu 24.04 LTS.
- Reverse proxy: Nginx (80/443).
- Backend: Node.js (PM2 o systemd) en puerto interno 3000.
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
   - Levantar proceso con PM2 o systemd.
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
- [ ] PM2/systemd con restart automatico.
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

### PM2 (opcional)
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
