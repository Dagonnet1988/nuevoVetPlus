#!/bin/bash

# ===========================================
# IMPORTACIÓN SIMPLE DE PRODUCTOS A NEON
# ===========================================

set -e

# Configuración Neon
NEON_URL="postgresql://neondb_owner:npg_9GRvVyfqaQ4J@ep-purple-brook-acxo7g8s-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🔄 Importando productos directamente a Neon..."
echo "==============================================="

# Verificar conexión
if ! psql "$NEON_URL" -c "SELECT 1;" &> /dev/null; then
    echo "❌ Error: No se puede conectar a Neon"
    exit 1
fi

echo "✅ Conexión a Neon exitosa"

# Ejecutar INSERTs directos basados en los datos del JSON
psql "$NEON_URL" << 'EOF'

-- Insertar productos uno por uno con ON CONFLICT

-- 1. Amoxicilina 500mg
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'aecfd408-6599-46b2-b220-26dda29b0d2d',
    'Amoxicilina 500mg',
    'Antibiótico para perros y gatos',
    3000.00,
    2500.00,
    -1,
    10,
    true,
    'Producto',
    'Medicamentos',
    'VetPharm',
    'MED-001',
    '7501234567891',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Sesión de Fisioterapia
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'feda5e84-04c8-4010-a71b-bd0a4a992b31',
    'Sesión de Fisioterapia',
    'Sesión individual de fisioterapia',
    50000.00,
    NULL,
    0,
    0,
    false,
    'Terapia Individual',
    'Terapias',
    NULL,
    'THER-001',
    '7501234567894',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Consulta de Control
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    '22d121b3-af74-49b2-8a03-9511d106342b',
    'Consulta de Control',
    'Consulta de control post-tratamiento',
    40000.00,
    NULL,
    0,
    0,
    false,
    'Servicio',
    'Consultas',
    NULL,
    'CONS-002',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Vacuna Triple Felina
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    '3ee6bf18-cde0-4f81-93ac-7e16fb4d4a5f',
    'Vacuna Triple Felina',
    'Vacuna contra rinotraqueitis, calicivirus y panleucopenia',
    45000.00,
    NULL,
    23,
    0,
    true,
    'Producto',
    'Vacunas',
    NULL,
    'VAC-001',
    '7501234567892',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Paquete 10 Fisioterapias
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'a113fced-b6ab-419c-974c-2ac625c29506',
    'Paquete 10 Fisioterapias',
    'Paquete de 10 sesiones de fisioterapia con descuento',
    450000.00,
    NULL,
    0,
    0,
    false,
    'Terapia Paquete',
    'Terapias',
    NULL,
    'THER-PKG-001',
    '7501234567895',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Ketamina 10 mg/ml
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'b893941b-b603-4c64-989b-ca0085d75a08',
    'Ketamina 10 mg/ml',
    'Anestésico inyectable',
    25000.00,
    NULL,
    10,
    2,
    true,
    'Producto',
    'Medicamentos',
    'Genérico',
    'MED-105',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 7. Alimento Premium Perro Adulto
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'bfc97632-243c-430e-8e27-5dceb022d02d',
    'Alimento Premium Perro Adulto',
    'Alimento balanceado para perros adultos - 15kg',
    120000.00,
    100000.00,
    30,
    10,
    true,
    'Producto',
    'Alimentos',
    'Gosby',
    'ALI-001',
    '7501234567896',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 8. Pirantel Pamoato 150 mg
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'c6472a7c-d0d9-4abf-a9d3-e1d5e221fe5a',
    'Pirantel Pamoato 150 mg',
    'Antiparasitario interno',
    12500.00,
    NULL,
    80,
    10,
    true,
    'Producto',
    'Medicamentos',
    'Genérico',
    'MED-103',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 9. Consulta General
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'cdd7c4e0-3a05-4f76-837a-c52cf67d012e',
    'Consulta General',
    'Consulta veterinaria general',
    80000.00,
    NULL,
    0,
    0,
    false,
    'Servicio',
    'Consultas',
    NULL,
    'CONS-001',
    '7501234567893',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 10. Carprofeno 50 mg
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'd03ab85a-2d89-4558-9e95-0bca0bcbc8d2',
    'Carprofeno 50 mg',
    'Analgésico y antiinflamatorio',
    12000.00,
    NULL,
    30,
    5,
    true,
    'Producto',
    'Medicamentos',
    'Genérico',
    'MED-102',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 11. Alimento Terapéutico Renal
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'f4a0a3a9-25e3-4064-8bf3-e95f8406db03',
    'Alimento Terapéutico Renal',
    'Alimento especializado para problemas renales',
    75000.00,
    45000.00,
    0,
    2,
    true,
    'Producto',
    'Alimentos',
    'VetDiet',
    'FOOD-001',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 12. Vitaminas B-Complex
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    '79002bec-0170-4576-9333-9b0727015203',
    'Vitaminas B-Complex',
    'Complejo vitamínico para mascotas',
    25000.00,
    15000.00,
    3,
    5,
    true,
    'Producto',
    'Vitaminas',
    'NutriPet',
    'MED-002',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 13. Amoxicilina 250 mg
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'df1796f6-5219-4e64-8fe2-112124ce6adb',
    'Amoxicilina 250 mg',
    'Antibiótico oral en cápsulas',
    8500.00,
    5000.00,
    20,
    5,
    true,
    'Producto',
    'Medicamentos',
    'Genérico',
    'MED-101',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 14. Fipronil 10% Spot-On
INSERT INTO financial.productos (
    id_producto, nombre, descripcion, precio_venta, precio_compra,
    stock_actual, stock_minimo, inventariable, tipo, categoria,
    marca, codigo, codigo_barras, activo, created_at, updated_at
) VALUES (
    'c96764f5-1934-411c-bc1c-3587348e482d',
    'Fipronil 10% Spot-On',
    'Antiparasitario externo tópico',
    15000.00,
    NULL,
    40,
    5,
    true,
    'Producto',
    'Medicamentos',
    'Genérico',
    'MED-104',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id_producto) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_venta = EXCLUDED.precio_venta,
    precio_compra = EXCLUDED.precio_compra,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    inventariable = EXCLUDED.inventariable,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca,
    codigo = EXCLUDED.codigo,
    codigo_barras = EXCLUDED.codigo_barras,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

EOF

echo "✅ Productos importados exitosamente"

# Verificar resultados
echo ""
echo "📊 Verificación final:"
psql "$NEON_URL" -c "
    SELECT
        COUNT(*) as total_productos,
        COUNT(CASE WHEN inventariable THEN 1 END) as inventariables,
        COUNT(CASE WHEN tipo = 'Medicamentos' THEN 1 END) as medicamentos,
        COUNT(CASE WHEN tipo = 'Servicio' THEN 1 END) as servicios,
        COUNT(CASE WHEN tipo LIKE '%Terapia%' THEN 1 END) as terapias
    FROM financial.productos;
"

echo ""
echo "🎉 ¡Importación completada exitosamente!"