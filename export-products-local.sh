#!/bin/bash

# ===========================================
# EXPORTAR PRODUCTOS DE BD LOCAL A JSON
# ===========================================

set -e

# Configuración
LOCAL_HOST="localhost"
LOCAL_PORT="5432"
LOCAL_USER="postgres"
LOCAL_PASSWORD="postgres"
LOCAL_DB="vetplus"

OUTPUT_FILE="productos_local.json"

echo "📦 Exportando productos de BD local..."
echo "======================================"

# Verificar conexión
if ! PGPASSWORD="$LOCAL_PASSWORD" psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" -c "SELECT 1;" &> /dev/null; then
    echo "❌ Error: No se puede conectar a BD local"
    exit 1
fi

echo "✅ Conexión a BD local exitosa"

# Exportar productos a JSON
PGPASSWORD="$LOCAL_PASSWORD" psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" \
    --tuples-only \
    --no-align \
    -c "
    SELECT json_agg(
        json_build_object(
            'id_producto', id_producto,
            'nombre', nombre,
            'descripcion', descripcion,
            'precio_venta', precio_venta,
            'precio_compra', precio_compra,
            'stock_actual', stock_actual,
            'stock_minimo', stock_minimo,
            'inventariable', inventariable,
            'tipo', tipo,
            'categoria', categoria,
            'marca', marca,
            'codigo', codigo,
            'codigo_barras', codigo_barras,
            'activo', activo,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) FROM financial.productos WHERE activo = true;
    " > "$OUTPUT_FILE"

echo "✅ Productos exportados a: $OUTPUT_FILE"

# Mostrar resumen
PRODUCT_COUNT=$(jq '. | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
echo "📊 Total de productos exportados: $PRODUCT_COUNT"

# Mostrar primeros productos
echo ""
echo "📋 Primeros productos:"
jq '.[0:3] | .[] | {nombre, precio_venta, stock_actual}' "$OUTPUT_FILE" 2>/dev/null || echo "Error leyendo JSON"

echo ""
echo "🎯 Archivo listo para importar a Neon: $OUTPUT_FILE"