-- ===========================================
-- ACTUALIZACIÓN DE TABLAS INGRESOS Y EGRESOS
-- Para usar el nuevo sistema de categorías y conceptos
-- ===========================================

-- Agregar campos de categoría y concepto a la tabla de ingresos
ALTER TABLE financial.ingresos 
ADD COLUMN id_concepto_ingreso UUID REFERENCES financial.conceptos_ingresos(id_concepto),
ADD COLUMN categoria_legacy VARCHAR(50), -- Mantener campo anterior por compatibilidad
ADD COLUMN observaciones TEXT;

-- Agregar campos de categoría y concepto a la tabla de egresos  
ALTER TABLE financial.egresos
ADD COLUMN id_concepto_egreso UUID REFERENCES financial.conceptos_egresos(id_concepto),
ADD COLUMN categoria_legacy VARCHAR(50), -- Mantener campo anterior por compatibilidad
ADD COLUMN observaciones TEXT;

-- Crear índices para optimizar consultas
CREATE INDEX idx_ingresos_concepto ON financial.ingresos(id_concepto_ingreso);
CREATE INDEX idx_egresos_concepto ON financial.egresos(id_concepto_egreso);

-- Función para obtener totales por categoría de ingresos
CREATE OR REPLACE FUNCTION get_ingresos_por_categoria(
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    categoria_codigo VARCHAR(10),
    categoria_nombre VARCHAR(100),
    total_ingresos DECIMAL(15,2),
    cantidad_movimientos INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.codigo as categoria_codigo,
        ci.nombre as categoria_nombre,
        COALESCE(SUM(ing.monto), 0)::DECIMAL(15,2) as total_ingresos,
        COUNT(ing.id_ingreso)::INTEGER as cantidad_movimientos
    FROM financial.categorias_ingresos ci
    LEFT JOIN financial.conceptos_ingresos co ON ci.id_categoria = co.id_categoria
    LEFT JOIN financial.ingresos ing ON co.id_concepto = ing.id_concepto_ingreso
        AND ing.fecha::DATE BETWEEN fecha_inicio AND fecha_fin
    WHERE ci.activa = true
    GROUP BY ci.codigo, ci.nombre
    ORDER BY total_ingresos DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener totales por categoría de egresos
CREATE OR REPLACE FUNCTION get_egresos_por_categoria(
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    categoria_codigo VARCHAR(10),
    categoria_nombre VARCHAR(100),
    total_egresos DECIMAL(15,2),
    cantidad_movimientos INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.codigo as categoria_codigo,
        ce.nombre as categoria_nombre,
        COALESCE(SUM(egr.monto), 0)::DECIMAL(15,2) as total_egresos,
        COUNT(egr.id_egreso)::INTEGER as cantidad_movimientos
    FROM financial.categorias_egresos ce
    LEFT JOIN financial.conceptos_egresos co ON ce.id_categoria = co.id_categoria
    LEFT JOIN financial.egresos egr ON co.id_concepto = egr.id_concepto_egreso
        AND egr.fecha::DATE BETWEEN fecha_inicio AND fecha_fin
    WHERE ce.activa = true
    GROUP BY ce.codigo, ce.nombre
    ORDER BY total_egresos DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener detalles por concepto específico
CREATE OR REPLACE FUNCTION get_detalle_por_concepto(
    concepto_codigo VARCHAR(15),
    tipo_movimiento VARCHAR(10), -- 'ingreso' o 'egreso'
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    fecha TIMESTAMP,
    codigo_movimiento VARCHAR(20),
    descripcion TEXT,
    monto DECIMAL(15,2),
    metodo_pago VARCHAR(30),
    caja_nombre VARCHAR(50),
    usuario_nombre VARCHAR(100)
) AS $$
BEGIN
    IF tipo_movimiento = 'ingreso' THEN
        RETURN QUERY
        SELECT 
            ing.fecha,
            ing.codigo_ingreso as codigo_movimiento,
            ing.descripcion,
            ing.monto,
            ing.metodo_pago,
            c.nombre as caja_nombre,
            u.nombre as usuario_nombre
        FROM financial.ingresos ing
        JOIN financial.conceptos_ingresos co ON ing.id_concepto_ingreso = co.id_concepto
        JOIN financial.cajas c ON ing.id_caja = c.id_caja
        LEFT JOIN auth.usuarios u ON ing.created_by = u.id_usuario
        WHERE co.codigo = concepto_codigo
        AND ing.fecha::DATE BETWEEN fecha_inicio AND fecha_fin
        ORDER BY ing.fecha DESC;
    ELSE
        RETURN QUERY
        SELECT 
            egr.fecha,
            egr.codigo_egreso as codigo_movimiento,
            egr.descripcion,
            egr.monto,
            egr.metodo_pago,
            c.nombre as caja_nombre,
            u.nombre as usuario_nombre
        FROM financial.egresos egr
        JOIN financial.conceptos_egresos co ON egr.id_concepto_egreso = co.id_concepto
        JOIN financial.cajas c ON egr.id_caja = c.id_caja
        LEFT JOIN auth.usuarios u ON egr.created_by = u.id_usuario
        WHERE co.codigo = concepto_codigo
        AND egr.fecha::DATE BETWEEN fecha_inicio AND fecha_fin
        ORDER BY egr.fecha DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Vista para reporte consolidado de P&L (Pérdidas y Ganancias)
CREATE OR REPLACE VIEW financial.reporte_pnl AS
SELECT 
    'INGRESOS' as tipo,
    ci.codigo as categoria_codigo,
    ci.nombre as categoria_nombre,
    co.codigo as concepto_codigo,
    co.nombre as concepto_nombre,
    COALESCE(SUM(ing.monto), 0) as total,
    COUNT(ing.id_ingreso) as cantidad_movimientos
FROM financial.categorias_ingresos ci
JOIN financial.conceptos_ingresos co ON ci.id_categoria = co.id_categoria
LEFT JOIN financial.ingresos ing ON co.id_concepto = ing.id_concepto_ingreso
    AND ing.fecha >= DATE_TRUNC('month', CURRENT_DATE)
WHERE ci.activa = true AND co.activo = true
GROUP BY ci.codigo, ci.nombre, co.codigo, co.nombre

UNION ALL

SELECT 
    'EGRESOS' as tipo,
    ce.codigo as categoria_codigo,
    ce.nombre as categoria_nombre,
    co.codigo as concepto_codigo,
    co.nombre as concepto_nombre,
    COALESCE(SUM(egr.monto), 0) * -1 as total, -- Negativo para egresos
    COUNT(egr.id_egreso) as cantidad_movimientos
FROM financial.categorias_egresos ce
JOIN financial.conceptos_egresos co ON ce.id_categoria = co.id_categoria
LEFT JOIN financial.egresos egr ON co.id_concepto = egr.id_concepto_egreso
    AND egr.fecha >= DATE_TRUNC('month', CURRENT_DATE)
WHERE ce.activa = true AND co.activo = true
GROUP BY ce.codigo, ce.nombre, co.codigo, co.nombre

ORDER BY tipo, categoria_codigo, concepto_codigo;

-- Comentarios
COMMENT ON FUNCTION get_ingresos_por_categoria IS 'Obtiene totales de ingresos agrupados por categoría en un período';
COMMENT ON FUNCTION get_egresos_por_categoria IS 'Obtiene totales de egresos agrupados por categoría en un período';
COMMENT ON FUNCTION get_detalle_por_concepto IS 'Obtiene detalle de movimientos por concepto específico';
COMMENT ON VIEW financial.reporte_pnl IS 'Vista consolidada de Pérdidas y Ganancias del mes actual';
