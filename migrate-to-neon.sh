#!/bin/bash

# ===========================================
# SCRIPT DE MIGRACIÓN: BD Local → Neon.tech
# ===========================================

set -e  # Salir si hay error

echo "🐘 VetPlus - Migración de Base de Datos Local a Neon.tech"
echo "======================================================"

# ⚠️  CONFIGURACIÓN - MODIFICA ESTOS VALORES
# ===========================================

# Tu base de datos LOCAL (PostgreSQL)
LOCAL_HOST="localhost"
LOCAL_PORT="5432"
LOCAL_USER="postgres"
LOCAL_PASSWORD="postgres"
LOCAL_DB="vetplus"

# Base de datos NEON (ya configurada)
NEON_URL="postgresql://neondb_owner:npg_9GRvVyfqaQ4J@ep-purple-brook-acxo7g8s-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# ===========================================
# NO MODIFIQUES NADA DESDE AQUÍ
# ===========================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que las herramientas estén instaladas
check_dependencies() {
    print_status "Verificando dependencias..."

    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump no está instalado. Instálalo con: brew install postgresql"
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        print_error "psql no está instalado. Instálalo con: brew install postgresql"
        exit 1
    fi

    print_success "Dependencias verificadas"
}

# Verificar conexión a BD local
test_local_connection() {
    print_status "Verificando conexión a BD local..."

    if PGPASSWORD="$LOCAL_PASSWORD" psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" -c "SELECT 1;" &> /dev/null; then
        print_success "Conexión a BD local exitosa"
    else
        print_error "No se puede conectar a BD local. Verifica las credenciales."
        exit 1
    fi
}

# Verificar conexión a Neon
test_neon_connection() {
    print_status "Verificando conexión a Neon.tech..."

    if psql "$NEON_URL" -c "SELECT 1;" &> /dev/null; then
        print_success "Conexión a Neon.tech exitosa"
    else
        print_error "No se puede conectar a Neon.tech. Verifica la URL."
        exit 1
    fi
}

# Crear backup de BD local
create_backup() {
    BACKUP_FILE="vetplus_local_backup_$(date +%Y%m%d_%H%M%S).sql"

    if PGPASSWORD="$LOCAL_PASSWORD" pg_dump \
        -h "$LOCAL_HOST" \
        -p "$LOCAL_PORT" \
        -U "$LOCAL_USER" \
        -d "$LOCAL_DB" \
        --schema="vetplus_auth" \
        --schema="clinical" \
        --schema="financial" \
        --data-only \
        --inserts \
        --disable-triggers \
        > "$BACKUP_FILE" 2>/dev/null; then

        echo "$BACKUP_FILE"  # Retornar nombre del archivo
    else
        echo "ERROR"  # Indicar error
    fi
}

# Limpiar datos en Neon (no esquemas)
clean_neon_data() {
    print_warning "Limpiando datos existentes en Neon (manteniendo estructura)..."

    # Lista de tablas a limpiar (en orden inverso de dependencias)
    TABLES=(
        "system.session_audit"
        "system.activity_log"
        "system.log_auditoria"
        "financial.sesiones_terapia"
        "financial.control_terapias"
        "financial.lineas_orden_compra"
        "financial.ordenes_compra"
        "financial.lineas_factura"
        "financial.facturas_venta"
        "financial.egresos"
        "financial.ingresos"
        "financial.cajas"
        "financial.proveedores"
        "financial.productos"
        "clinical.archivos_consulta"
        "clinical.vacunas_tratamientos"
        "clinical.calendario_citas"
        "clinical.consultas_clinicas"
        "clinical.mascotas"
        "clinical.clientes"
        "vetplus_auth.password_resets"
        "vetplus_auth.google_calendar_config"
        "vetplus_auth.blacklisted_tokens"
        "vetplus_auth.usuarios"
    )

    for table in "${TABLES[@]}"; do
        print_status "Limpiando tabla: $table"
        psql "$NEON_URL" -c "TRUNCATE TABLE $table CASCADE;" 2>/dev/null || {
            print_warning "No se pudo truncar $table, intentando DELETE"
            psql "$NEON_URL" -c "DELETE FROM $table;" 2>/dev/null || true
        }
    done

    print_success "Datos limpiados (estructura mantenida)"
}

# Recrear esquemas en Neon
recreate_schemas() {
    print_status "Recreando esquemas en Neon..."

    SCHEMA_FILES=(
        "backend/src/database/schemas/01_create_database.sql"
        "backend/src/database/schemas/02_auth_tables.sql"
        "backend/src/database/schemas/03_clinical_tables.sql"
        "backend/src/database/schemas/04_financial_tables.sql"
        "backend/src/database/schemas/05_constraints_triggers.sql"
        "backend/src/database/schemas/06_categorias_conceptos.sql"
        "backend/src/database/schemas/07_audit_tables.sql"
        "backend/src/database/schemas/08_empresa_config.sql"
        "backend/src/database/schemas/09_whatsapp_integration.sql"
        "backend/src/database/schemas/10_workflow_integration.sql"
        "backend/src/database/schemas/11_audit_expansion.sql"
    )

    for schema_file in "${SCHEMA_FILES[@]}"; do
        if [ -f "$schema_file" ]; then
            print_status "Ejecutando: $(basename "$schema_file")"
            psql "$NEON_URL" -f "$schema_file" || {
                print_warning "Error en $schema_file, continuando..."
            }
        else
            print_warning "Archivo no encontrado: $schema_file"
        fi
    done

    print_success "Esquemas recreados"
}

# Importar datos por fases
import_data() {
    local backup_file="$1"
    print_status "Importando datos por fases desde: $backup_file"

    if ./import-data-phases.sh "$backup_file"; then
        print_success "Datos importados exitosamente por fases"
    else
        print_error "Error importando datos por fases"
        exit 1
    fi
}

# Ejecutar seeds
run_seeds() {
    print_status "Ejecutando seeds..."

    SEED_FILES=(
        "backend/src/database/seeds/01_initial_data.sql"
        "backend/src/database/seeds/02_test_data.sql"
    )

    for seed_file in "${SEED_FILES[@]}"; do
        if [ -f "$seed_file" ]; then
            print_status "Ejecutando seed: $(basename "$seed_file")"
            psql "$NEON_URL" -f "$seed_file" 2>/dev/null || {
                print_warning "Error en seed $seed_file, puede que ya exista"
            }
        fi
    done

    print_success "Seeds ejecutados"
}

# Verificar migración
verify_migration() {
    print_status "Verificando migración..."

    # Contar registros en tablas principales
    TABLES=("vetplus_auth.usuarios" "clinical.clientes" "clinical.mascotas" "financial.productos")

    for table in "${TABLES[@]}"; do
        count=$(psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        print_status "Tabla $table: $count registros"
    done

    print_success "Verificación completada"
}

# Función principal
main() {
    echo ""
    print_warning "⚠️  IMPORTANTE: Este script ELIMINARÁ todos los datos en Neon.tech"
    print_warning "Los esquemas y estructura de tablas se mantendrán intactos"
    print_warning "Importará datos por fases para respetar dependencias de foreign keys"
    print_warning "Asegúrate de tener un backup de tu BD local antes de continuar"
    echo ""
    read -p "¿Estás seguro de continuar? (escribe 'yes' para confirmar): " confirm

    if [ "$confirm" != "yes" ]; then
        print_status "Operación cancelada"
        exit 0
    fi

    echo ""

    # Ejecutar pasos
    check_dependencies
    test_local_connection
    test_neon_connection

    print_status "Creando backup de BD local..."
    backup_file=$(create_backup)

    if [ "$backup_file" = "ERROR" ]; then
        print_error "Error creando backup"
        exit 1
    fi

    print_success "Backup creado: $backup_file"

    clean_neon_data
    # recreate_schemas  # Ya no necesitamos recrear esquemas
    import_data "$backup_file"
    run_seeds
    verify_migration

    echo ""
    print_success "🎉 ¡Migración completada exitosamente!"
    echo ""
    print_status "Método usado: Importación por fases (respeta dependencias)"
    echo ""
    print_status "Próximos pasos:"
    echo "  1. Verifica que tu aplicación funcione con Neon"
    echo "  2. Actualiza las credenciales en producción si es necesario"
    echo "  3. Archivo de backup guardado: $backup_file"
    echo ""
    print_status "Comandos para verificar:"
    echo "  docker-compose exec vetplus-backend npm run db:check"
    echo "  docker-compose logs -f vetplus-backend  # Ver logs en tiempo real"
}

# Ejecutar script
main "$@"