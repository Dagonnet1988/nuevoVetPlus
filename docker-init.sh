#!/bin/bash

# Script de inicialización para Docker Compose - VetPlus
# Uso: ./docker-init.sh

echo "🐳 Inicializando VetPlus con Docker Compose..."

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instálalo desde https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Verificar Docker Compose (nueva sintaxis)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo "✅ Docker Compose (nueva sintaxis) encontrado"
elif docker-compose --version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo "✅ Docker Compose (vieja sintaxis) encontrado"
else
    echo "❌ Docker Compose no está disponible."
    exit 1
fi

# Verificar que existe archivo .env
if [ ! -f ".env" ]; then
    echo "❌ No se encontró archivo .env"
    echo "📝 Crea un archivo .env basado en .env.example"
    echo "💡 Para Neon.tech: configura las variables de conexión"
    exit 1
fi

echo "✅ Archivo .env encontrado"

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env desde template..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env
        echo "✅ Archivo .env creado"
    else
        echo "⚠️  No se encontró backend/.env.example"
    fi
fi

# Construir e iniciar servicios
echo "🏗️  Construyendo e iniciando servicios..."
$DOCKER_COMPOSE_CMD up -d --build

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
sleep 15

# Verificar que los servicios estén corriendo
echo "🔍 Verificando servicios..."
$DOCKER_COMPOSE_CMD ps

# Verificar que el backend responde
echo "🔌 Probando conexión al backend..."
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "✅ Backend está listo y responde"
else
    echo "❌ Backend no responde. Revisa los logs:"
    $DOCKER_COMPOSE_CMD logs vetplus-backend
    exit 1
fi

# Verificar conexión a Neon (intentando inicializar DB)
echo "🗄️  Verificando conexión a Neon.tech..."
$DOCKER_COMPOSE_CMD exec vetplus-backend npm run db:init

if [ $? -eq 0 ]; then
    echo "✅ Conexión a Neon.tech exitosa - Base de datos inicializada"
else
    echo "⚠️  Error conectando a Neon.tech. Verifica tus credenciales en .env"
    echo "💡 Asegúrate de que:"
    echo "   - La base de datos en Neon esté creada"
    echo "   - Las credenciales en .env sean correctas"
    echo "   - Neon permita conexiones desde tu IP"
    exit 1
fi

# Ejecutar seeds
echo "🌱 Ejecutando seeds..."
$DOCKER_COMPOSE_CMD exec vetplus-backend npm run db:seed

if [ $? -eq 0 ]; then
    echo "✅ Seeds ejecutados exitosamente"
else
    echo "⚠️  Error ejecutando seeds (puede que ya estén ejecutados)"
fi

echo ""
echo "🎉 ¡VetPlus está listo!"
echo ""
echo "📋 Servicios disponibles:"
echo "  - Backend API: http://localhost:3000"
echo "  - Base de datos: localhost:5432"
echo "  - Usuario: vetplus_user"
echo "  - Base de datos: vetplus_db"
echo ""
echo "🛠️  Comandos útiles:"
echo "  docker-compose logs -f          # Ver logs en tiempo real"
echo "  docker-compose down            # Detener servicios"
echo "  docker-compose restart         # Reiniciar servicios"
echo "  npm run dev                    # Desarrollar (tu app local conecta a DB Docker)"
echo ""
echo "💡 Para desarrollo: ejecuta 'npm run dev' en otra terminal"