#!/bin/bash

# Script para probar conexión a Neon.tech
echo "🧪 Probando conexión a Neon.tech..."

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo "❌ No se encontró archivo .env"
    echo "💡 Crea un archivo .env con las credenciales de Neon"
    exit 1
fi

# Extraer variables del .env
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)
DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2)
DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)

# Verificar que las variables estén configuradas
if [[ "$DB_HOST" == "tu-host-de-neon-aqui" || "$DB_USER" == "tu-usuario-de-neon" ]]; then
    echo "❌ Las credenciales de Neon no están configuradas en .env"
    echo "💡 Edita el archivo .env con tus credenciales reales de Neon.tech"
    echo "🔗 Ve a: https://console.neon.tech → Connection Details"
    exit 1
fi

echo "🔗 Probando conexión a: $DB_HOST:$DB_PORT/$DB_NAME"

# Probar conexión usando Docker temporal
if [[ "$DB_HOST" == *"neon.tech"* ]]; then
    # Para Neon, usar SSL
    docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:15-alpine psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --set=sslmode=require \
        -c "SELECT version();" 2>/dev/null
else
    # Para otras conexiones
    docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:15-alpine psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT version();" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✅ ¡Conexión exitosa a Neon.tech!"
    echo "🎉 Tus credenciales son correctas"
    echo ""
    echo "🚀 Ahora puedes ejecutar:"
    echo "   ./docker-init.sh"
else
    echo "❌ Error conectando a Neon.tech"
    echo "💡 Verifica:"
    echo "   - Credenciales en .env son correctas"
    echo "   - Neon permite conexiones externas"
    echo "   - Tu IP está permitida en Neon"
    echo ""
    echo "🔗 Dashboard de Neon: https://console.neon.tech"
fi