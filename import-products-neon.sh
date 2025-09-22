#!/bin/bash

# ===========================================
# IMPORTAR PRODUCTOS A NEON DESDE JSON
# ===========================================

set -e

# Configuración Neon
NEON_URL="postgresql://neondb_owner:npg_9GRvVyfqaQ4J@ep-purple-brook-acxo7g8s-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# Archivo de entrada
INPUT_FILE="${1:-productos_local.json}"

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Archivo $INPUT_FILE no encontrado"
    echo "Uso: $0 [archivo.json]"
    exit 1
fi

echo "📦 Importando productos a Neon desde: $INPUT_FILE"
echo "=================================================="

# Verificar conexión a Neon
if ! psql "$NEON_URL" -c "SELECT 1;" &> /dev/null; then
    echo "❌ Error: No se puede conectar a Neon"
    exit 1
fi

echo "✅ Conexión a Neon exitosa"

# Contar productos en el archivo
PRODUCT_COUNT=$(jq '. | length' "$INPUT_FILE" 2>/dev/null || echo "0")
echo "📊 Productos a importar: $PRODUCT_COUNT"

if [ "$PRODUCT_COUNT" -eq 0 ]; then
    echo "❌ Error: No hay productos en el archivo"
    exit 1
fi

# Crear archivo SQL temporal
TEMP_SQL="/tmp/import_products.sql"
echo "-- Importación de productos a Neon" > "$TEMP_SQL"

# Procesar cada producto del JSON
jq -c '.[]' "$INPUT_FILE" | while read -r product; do
    # Extraer valores del JSON
    id_producto=$(echo "$product" | jq -r '.id_producto')
    nombre=$(echo "$product" | jq -r '.nombre // empty' | sed "s/'/''/g")
    descripcion=$(echo "$product" | jq -r '.descripcion // empty' | sed "s/'/''/g")
    precio_venta=$(echo "$product" | jq -r '.precio_venta // 0')
    precio_compra=$(echo "$product" | jq -r '.precio_compra // empty')
    stock_actual=$(echo "$product" | jq -r '.stock_actual // 0')
    stock_minimo=$(echo "$product" | jq -r '.stock_minimo // 0')
    inventariable=$(echo "$product" | jq -r '.inventariable // false')
    tipo=$(echo "$product" | jq -r '.tipo // "Producto"' | sed "s/'/''/g")
    categoria=$(echo "$product" | jq -r '.categoria // empty' | sed "s/'/''/g")
    marca=$(echo "$product" | jq -r '.marca // empty' | sed "s/'/''/g")
    codigo=$(echo "$product" | jq -r '.codigo // empty' | sed "s/'/''/g")
    codigo_barras=$(echo "$product" | jq -r '.codigo_barras // empty' | sed "s/'/''/g")
    activo=$(echo "$product" | jq -r '.activo // true')

    # Preparar valores para SQL (manejar nulls correctamente)
    nombre_sql="'$nombre'"
    descripcion_sql="'$descripcion'"
    precio_compra_sql="$precio_compra"
    categoria_sql="'$categoria'"
    marca_sql="'$marca'"
    codigo_sql="'$codigo'"
    codigo_barras_sql="'$codigo_barras'"

    # Convertir "empty" a NULL
    [ "$nombre" = "empty" ] && nombre_sql="NULL"
    [ "$descripcion" = "empty" ] && descripcion_sql="NULL"
    [ "$precio_compra" = "empty" ] && precio_compra_sql="NULL"
    [ "$categoria" = "empty" ] && categoria_sql="NULL"
    [ "$marca" = "empty" ] && marca_sql="NULL"
    [ "$codigo" = "empty" ] && codigo_sql="NULL"
    [ "$codigo_barras" = "empty" ] && codigo_barras_sql="NULL"

    # Crear INSERT statement
    echo "-- Insertando producto: $nombre" >> "$TEMP_SQL"
    echo "INSERT INTO financial.productos (" >> "$TEMP_SQL"
    echo "    id_producto, nombre, descripcion, precio_venta, precio_compra," >> "$TEMP_SQL"
    echo "    stock_actual, stock_minimo, inventariable, tipo, categoria," >> "$TEMP_SQL"
    echo "    marca, codigo, codigo_barras, activo, created_at, updated_at" >> "$TEMP_SQL"
    echo ") VALUES (" >> "$TEMP_SQL"
    echo "    '$id_producto'," >> "$TEMP_SQL"
    echo "    $nombre_sql," >> "$TEMP_SQL"
    echo "    $descripcion_sql," >> "$TEMP_SQL"
    echo "    $precio_venta," >> "$TEMP_SQL"
    echo "    $precio_compra_sql," >> "$TEMP_SQL"
    echo "    $stock_actual," >> "$TEMP_SQL"
    echo "    $stock_minimo," >> "$TEMP_SQL"
    echo "    $inventariable," >> "$TEMP_SQL"
    echo "    '$tipo'," >> "$TEMP_SQL"
    echo "    $categoria_sql," >> "$TEMP_SQL"
    echo "    $marca_sql," >> "$TEMP_SQL"
    echo "    $codigo_sql," >> "$TEMP_SQL"
    echo "    $codigo_barras_sql," >> "$TEMP_SQL"
    echo "    $activo," >> "$TEMP_SQL"
    echo "    CURRENT_TIMESTAMP," >> "$TEMP_SQL"
    echo "    CURRENT_TIMESTAMP" >> "$TEMP_SQL"
    echo ") ON CONFLICT (id_producto) DO UPDATE SET" >> "$TEMP_SQL"
    echo "    nombre = EXCLUDED.nombre," >> "$TEMP_SQL"
    echo "    descripcion = EXCLUDED.descripcion," >> "$TEMP_SQL"
    echo "    precio_venta = EXCLUDED.precio_venta," >> "$TEMP_SQL"
    echo "    precio_compra = EXCLUDED.precio_compra," >> "$TEMP_SQL"
    echo "    stock_actual = EXCLUDED.stock_actual," >> "$TEMP_SQL"
    echo "    stock_minimo = EXCLUDED.stock_minimo," >> "$TEMP_SQL"
    echo "    inventariable = EXCLUDED.inventariable," >> "$TEMP_SQL"
    echo "    tipo = EXCLUDED.tipo," >> "$TEMP_SQL"
    echo "    categoria = EXCLUDED.categoria," >> "$TEMP_SQL"
    echo "    marca = EXCLUDED.marca," >> "$TEMP_SQL"
    echo "    codigo = EXCLUDED.codigo," >> "$TEMP_SQL"
    echo "    codigo_barras = EXCLUDED.codigo_barras," >> "$TEMP_SQL"
    echo "    activo = EXCLUDED.activo," >> "$TEMP_SQL"
    echo "    updated_at = CURRENT_TIMESTAMP;" >> "$TEMP_SQL"
    echo "" >> "$TEMP_SQL"
done

echo "SET session_replication_role = 'origin';" >> "$TEMP_SQL"

echo "🔄 Ejecutando importación en Neon..."

# Ejecutar el SQL en Neon
if psql "$NEON_URL" -f "$TEMP_SQL"; then
    echo "✅ Productos importados exitosamente"

    # Verificar resultados
    echo ""
    echo "📊 Verificación:"
    psql "$NEON_URL" -c "
        SELECT
            COUNT(*) as total_productos,
            COUNT(CASE WHEN inventariable THEN 1 END) as inventariables,
            COUNT(CASE WHEN tipo = 'Medicamentos' THEN 1 END) as medicamentos,
            COUNT(CASE WHEN tipo = 'Vacunas' THEN 1 END) as vacunas
        FROM financial.productos;
    "

    # Limpiar archivo temporal
    rm -f "$TEMP_SQL"

else
    echo "❌ Error importando productos"
    echo "Archivo temporal guardado en: $TEMP_SQL"
    exit 1
fi

echo ""
echo "🎉 ¡Importación completada!"