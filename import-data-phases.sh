#!/bin/bash

# ===========================================
# IMPORTACIÓN POR FASES: Respeta dependencias
# ===========================================

set -e

# Configuración
NEON_URL="postgresql://neondb_owner:npg_9GRvVyfqaQ4J@ep-purple-brook-acxo7g8s-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Uso: $0 <archivo_backup.sql>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Archivo no encontrado: $BACKUP_FILE"
    exit 1
fi

echo "📦 Importando datos por fases desde: $BACKUP_FILE"
echo "================================================="

# Función para extraer y ejecutar solo ciertas tablas
import_table_data() {
    local table_name="$1"
    local temp_file="/tmp/${table_name}_data.sql"

    echo "🔍 Extrayendo datos de tabla: $table_name"

    # Extraer solo las instrucciones INSERT para esta tabla (con o sin indentación)
    grep -E "^[[:space:]]*INSERT INTO.*${table_name}" "$BACKUP_FILE" > "$temp_file" || true

    if [ -s "$temp_file" ]; then
        echo "📥 Importando $(wc -l < "$temp_file") registros para $table_name"
        psql "$NEON_URL" -f "$temp_file" 2>/dev/null || {
            echo "⚠️  Algunos registros de $table_name fallaron (foreign keys), continuando..."
        }
    else
        echo "ℹ️  No hay datos para $table_name"
    fi

    rm -f "$temp_file"
}

# FASE 1: Datos base (sin dependencias)
echo ""
echo "🏗️  FASE 1: Datos base (usuarios, clientes, productos)"
echo "===================================================="

import_table_data "vetplus_auth.usuarios"
import_table_data "clinical.clientes"
import_table_data "financial.productos"
import_table_data "financial.proveedores"
import_table_data "financial.cajas"

# FASE 2: Datos clínicos
echo ""
echo "🏥 FASE 2: Datos clínicos"
echo "========================="

import_table_data "clinical.mascotas"
import_table_data "clinical.consultas_clinicas"
import_table_data "clinical.calendario_citas"
import_table_data "clinical.vacunas_tratamientos"
import_table_data "clinical.archivos_consulta"

# FASE 3: Datos financieros
echo ""
echo "💰 FASE 3: Datos financieros"
echo "============================"

import_table_data "financial.ordenes_compra"
import_table_data "financial.lineas_orden_compra"
import_table_data "financial.facturas_venta"
import_table_data "financial.lineas_factura"
import_table_data "financial.ingresos"
import_table_data "financial.egresos"
import_table_data "financial.control_terapias"
import_table_data "financial.sesiones_terapia"

# FASE 4: Datos de sistema
echo ""
echo "🔧 FASE 4: Datos de sistema"
echo "==========================="

import_table_data "vetplus_auth.blacklisted_tokens"
import_table_data "vetplus_auth.password_resets"
import_table_data "vetplus_auth.google_calendar_config"
import_table_data "system.activity_log"
import_table_data "system.log_auditoria"
import_table_data "system.session_audit"

echo ""
echo "✅ Importación por fases completada"
echo ""
echo "📊 Verificación final:"
psql "$NEON_URL" -c "
    SELECT
        (SELECT COUNT(*) FROM vetplus_auth.usuarios) as usuarios,
        (SELECT COUNT(*) FROM clinical.clientes) as clientes,
        (SELECT COUNT(*) FROM clinical.mascotas) as mascotas,
        (SELECT COUNT(*) FROM financial.productos) as productos,
        (SELECT COUNT(*) FROM financial.facturas_venta) as facturas;
"