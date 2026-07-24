# Dia 0 - Comandos base (PM2 + Nginx)

## 1. Paquetes base
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw git

## 2. Node 20 con nvm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v
npm -v

## 3. Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status

## 4. Estructura de carpetas
sudo mkdir -p /var/www/vetplus/backend
sudo mkdir -p /var/www/vetplus/frontend
sudo mkdir -p /var/vetplus/uploads
sudo mkdir -p /var/backups/vetplus
sudo mkdir -p /var/log/vetplus

## 5. Codigo (opcion: clonar directo)
cd /var/www/vetplus
sudo git clone https://github.com/Dagonnet1988/nuevoVetPlus.git repo
sudo chown -R $USER:$USER /var/www/vetplus/repo

## 6. Backend
cd /var/www/vetplus/repo/backend
npm ci
cp /ruta-segura/.env.production /var/www/vetplus/repo/backend/.env.production
npm i -g pm2
pm2 start /var/www/vetplus/repo/deploy/ecosystem.config.cjs
pm2 save
pm2 startup

## 7. Frontend
cd /var/www/vetplus/repo/frontend
npm ci
npm run build
sudo rm -rf /var/www/vetplus/frontend/*
sudo cp -R dist/vetplus-frontend/browser/* /var/www/vetplus/frontend/

## 8. Nginx
sudo cp /var/www/vetplus/repo/deploy/nginx-vetplus.conf /etc/nginx/sites-available/vetplus
sudo ln -s /etc/nginx/sites-available/vetplus /etc/nginx/sites-enabled/vetplus
sudo nginx -t
sudo systemctl reload nginx

## 9. SSL
sudo certbot --nginx -d ramelo.app -d api.ramelo.app

## 10. Smoke test minimo
curl -I https://api.ramelo.app/health
curl -I https://api.ramelo.app/health/ready
curl -I https://api.ramelo.app/health/live

## 11. Backups (base ejemplo)
# Crear script de backup y agregar cron segun politica definida.
