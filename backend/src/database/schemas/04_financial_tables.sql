-- ===========================================
-- VETPLUS - TABLAS DEL MÓDULO FINANCIERO
-- ===========================================

-- Tabla de cajas (múltiples cajas para manejo de efectivo)
CREATE TABLE financial.cajas (
    id_caja UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL DEFAULT 'Personalizada' CHECK (tipo IN ('Caja Menor', 'Cuenta Bancaria', 'Caja Fuerte', 'Personalizada')),
    descripcion TEXT,
    saldo_inicial DECIMAL(15,2) DEFAULT 0,
    saldo_actual DECIMAL(15,2) DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_cajas_updated_at 
    BEFORE UPDATE ON financial.cajas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de ingresos
CREATE TABLE financial.ingresos (
    id_ingreso UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_ingreso VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('ING-'),
    id_caja UUID NOT NULL REFERENCES financial.cajas(id_caja),
    descripcion TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(50) DEFAULT 'Ventas',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(100), -- Número de factura, recibo, etc.
    metodo_pago VARCHAR(30) DEFAULT 'Efectivo' CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Cheque')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Tabla de egresos
CREATE TABLE financial.egresos (
    id_egreso UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_egreso VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('EGR-'),
    id_caja UUID NOT NULL REFERENCES financial.cajas(id_caja),
    descripcion TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(50) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(100),
    metodo_pago VARCHAR(30) DEFAULT 'Efectivo' CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Cheque')),
    id_orden_compra UUID, -- Referencia a orden de compra si aplica
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Tabla de proveedores
CREATE TABLE financial.proveedores (
    id_proveedor UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    nit VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    contacto_principal VARCHAR(100),
    terminos_pago INTEGER DEFAULT 30, -- días de crédito
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_proveedores_updated_at 
    BEFORE UPDATE ON financial.proveedores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de productos e inventario
CREATE TABLE financial.productos (
    id_producto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    codigo_barras VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('Producto', 'Servicio', 'Terapia Individual', 'Terapia Paquete')),
    categoria VARCHAR(50),
    subcategoria VARCHAR(50), -- Nueva subcategoría
    marca VARCHAR(100),
    precio_compra DECIMAL(15,2),
    precio_venta DECIMAL(15,2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    stock_maximo INTEGER DEFAULT 0, -- Nuevo stock máximo
    unidad_medida VARCHAR(20) DEFAULT 'unidad', -- Nueva unidad de medida
    lote VARCHAR(50), -- Nuevo lote/batch
    fecha_vencimiento DATE, -- Nueva fecha de vencimiento
    ubicacion VARCHAR(100), -- Nueva ubicación física
    inventariable BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN DEFAULT true,
    requiere_receta BOOLEAN DEFAULT false, -- Nueva validación receta
    iva_aplicable DECIMAL(5,2) DEFAULT 16.00, -- Nuevo IVA aplicable
    -- Campos específicos para terapias
    sesiones_incluidas INTEGER, -- Para paquetes de terapia
    duracion_sesion INTEGER, -- En minutos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_productos_updated_at 
    BEFORE UPDATE ON financial.productos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de órdenes de compra
CREATE TABLE financial.ordenes_compra (
    id_orden UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_orden VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('ORD-'),
    id_proveedor UUID NOT NULL REFERENCES financial.proveedores(id_proveedor),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(15,2) NOT NULL,
    tipo_pago VARCHAR(20) DEFAULT 'Contado' CHECK (tipo_pago IN ('Contado', 'Crédito')),
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Recibida', 'Pagada', 'Cancelada')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_ordenes_updated_at 
    BEFORE UPDATE ON financial.ordenes_compra 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de líneas de orden de compra
CREATE TABLE financial.lineas_orden_compra (
    id_linea UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_orden UUID NOT NULL REFERENCES financial.ordenes_compra(id_orden) ON DELETE CASCADE,
    id_producto UUID NOT NULL REFERENCES financial.productos(id_producto),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(15,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- Tabla de facturas de venta
CREATE TABLE financial.facturas_venta (
    id_factura UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_factura VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('FAC-'),
    id_cliente UUID REFERENCES clinical.clientes(id_cliente),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(15,2) NOT NULL,
    impuestos DECIMAL(15,2) DEFAULT 0,
    descuento DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    metodo_pago VARCHAR(30) DEFAULT 'Efectivo' CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Cheque')),
    estado VARCHAR(20) DEFAULT 'Pagada' CHECK (estado IN ('Pendiente', 'Pagada', 'Cancelada')),
    id_caja UUID NOT NULL REFERENCES financial.cajas(id_caja),
    notas TEXT,
    whatsapp_enviado BOOLEAN DEFAULT false,
    fecha_envio_whatsapp TIMESTAMP WITH TIME ZONE,
    telefono_envio VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario)
);

-- Tabla de líneas de factura
CREATE TABLE financial.lineas_factura (
    id_linea UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_factura UUID NOT NULL REFERENCES financial.facturas_venta(id_factura) ON DELETE CASCADE,
    id_producto UUID NOT NULL REFERENCES financial.productos(id_producto),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(15,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS ((cantidad * precio_unitario) - descuento) STORED
);

-- Tabla de control de terapias (para paquetes)
CREATE TABLE financial.control_terapias (
    id_control UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_mascota UUID NOT NULL REFERENCES clinical.mascotas(id_mascota),
    id_factura UUID NOT NULL REFERENCES financial.facturas_venta(id_factura),
    id_producto UUID NOT NULL REFERENCES financial.productos(id_producto),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('Individual', 'Paquete')),
    sesiones_total INTEGER NOT NULL,
    sesiones_usadas INTEGER DEFAULT 0,
    sesiones_restantes INTEGER GENERATED ALWAYS AS (sesiones_total - sesiones_usadas) STORED,
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_ultima_sesion DATE,
    fecha_vencimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_control_terapias_updated_at 
    BEFORE UPDATE ON financial.control_terapias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de sesiones individuales de terapia
CREATE TABLE financial.sesiones_terapia (
    id_sesion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_control UUID NOT NULL REFERENCES financial.control_terapias(id_control) ON DELETE CASCADE,
    fecha_sesion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    duracion_real INTEGER, -- duración en minutos
    realizada_por UUID NOT NULL REFERENCES vetplus_auth.usuarios(id_usuario),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios en las tablas
COMMENT ON TABLE financial.cajas IS 'Múltiples cajas para manejo de efectivo';
COMMENT ON TABLE financial.ingresos IS 'Registro de todos los ingresos';
COMMENT ON TABLE financial.egresos IS 'Registro de todos los egresos por categorías';
COMMENT ON TABLE financial.proveedores IS 'Base de datos de proveedores';
COMMENT ON TABLE financial.productos IS 'Inventario de productos y servicios';
COMMENT ON TABLE financial.ordenes_compra IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE financial.facturas_venta IS 'Facturas de venta a clientes';
COMMENT ON TABLE financial.control_terapias IS 'Control de sesiones de terapia por paquetes';
COMMENT ON TABLE financial.sesiones_terapia IS 'Registro individual de cada sesión de terapia realizada';

-- Índices para optimización
CREATE INDEX idx_cajas_activa ON financial.cajas(activa);
CREATE INDEX idx_ingresos_caja ON financial.ingresos(id_caja);
CREATE INDEX idx_ingresos_fecha ON financial.ingresos(fecha);
CREATE INDEX idx_egresos_caja ON financial.egresos(id_caja);
CREATE INDEX idx_egresos_fecha ON financial.egresos(fecha);
CREATE INDEX idx_egresos_categoria ON financial.egresos(categoria);
CREATE INDEX idx_proveedores_activo ON financial.proveedores(activo);
CREATE INDEX idx_productos_codigo ON financial.productos(codigo);
CREATE INDEX idx_productos_tipo ON financial.productos(tipo);
CREATE INDEX idx_productos_inventariable ON financial.productos(inventariable);
CREATE INDEX idx_ordenes_proveedor ON financial.ordenes_compra(id_proveedor);
CREATE INDEX idx_ordenes_estado ON financial.ordenes_compra(estado);
CREATE INDEX idx_ordenes_vencimiento ON financial.ordenes_compra(fecha_vencimiento);
CREATE INDEX idx_facturas_cliente ON financial.facturas_venta(id_cliente);
CREATE INDEX idx_facturas_fecha ON financial.facturas_venta(fecha);
CREATE INDEX idx_facturas_estado ON financial.facturas_venta(estado);
CREATE INDEX idx_control_mascota ON financial.control_terapias(id_mascota);
CREATE INDEX idx_control_activo ON financial.control_terapias(activo);
CREATE INDEX idx_sesiones_control ON financial.sesiones_terapia(id_control);
CREATE INDEX idx_sesiones_fecha ON financial.sesiones_terapia(fecha_sesion);
CREATE INDEX idx_sesiones_realizador ON financial.sesiones_terapia(realizada_por);

-- ===========================================
-- TRANSFERENCIAS ENTRE CAJAS
-- ===========================================

-- Tabla de transferencias entre cajas
CREATE TABLE financial.transferencias_cajas (
    id_transferencia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_transferencia VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_unique_code('TRF-'),
    id_caja_origen UUID NOT NULL REFERENCES financial.cajas(id_caja),
    id_caja_destino UUID NOT NULL REFERENCES financial.cajas(id_caja),
    monto DECIMAL(15,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(30) DEFAULT 'Efectivo' CHECK (metodo_pago IN ('Efectivo', 'Transferencia')),
    estado VARCHAR(20) DEFAULT 'Completada' CHECK (estado IN ('Completada', 'Cancelada')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES vetplus_auth.usuarios(id_usuario),

    -- Validación: cajas origen y destino deben ser diferentes
    CONSTRAINT transferencias_cajas_diferentes CHECK (id_caja_origen != id_caja_destino)
);

-- Índices para optimizar consultas
CREATE INDEX idx_transferencias_origen ON financial.transferencias_cajas(id_caja_origen);
CREATE INDEX idx_transferencias_destino ON financial.transferencias_cajas(id_caja_destino);
CREATE INDEX idx_transferencias_fecha ON financial.transferencias_cajas(fecha);

-- Función para procesar transferencia entre cajas
CREATE OR REPLACE FUNCTION procesar_transferencia_cajas(
    p_id_caja_origen UUID,
    p_id_caja_destino UUID,
    p_monto DECIMAL(15,2),
    p_descripcion TEXT,
    p_metodo_pago VARCHAR(30),
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_id_transferencia UUID;
    v_saldo_origen DECIMAL(15,2);
BEGIN
    -- Verificar que ambas cajas existan y estén activas
    IF NOT EXISTS (
        SELECT 1 FROM financial.cajas
        WHERE id_caja IN (p_id_caja_origen, p_id_caja_destino)
        AND activa = true
    ) THEN
        RAISE EXCEPTION 'Una o ambas cajas no existen o no están activas';
    END IF;

    -- Verificar saldo suficiente en caja origen
    SELECT saldo_actual INTO v_saldo_origen
    FROM financial.cajas
    WHERE id_caja = p_id_caja_origen;

    IF v_saldo_origen < p_monto THEN
        RAISE EXCEPTION 'Saldo insuficiente en caja origen. Saldo actual: %', v_saldo_origen;
    END IF;

    -- Crear registro de transferencia
    INSERT INTO financial.transferencias_cajas (
        id_caja_origen,
        id_caja_destino,
        monto,
        descripcion,
        metodo_pago,
        created_by
    ) VALUES (
        p_id_caja_origen,
        p_id_caja_destino,
        p_monto,
        p_descripcion,
        p_metodo_pago,
        p_created_by
    ) RETURNING id_transferencia INTO v_id_transferencia;

    -- Actualizar saldos de cajas
    UPDATE financial.cajas
    SET saldo_actual = saldo_actual - p_monto,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_caja = p_id_caja_origen;

    UPDATE financial.cajas
    SET saldo_actual = saldo_actual + p_monto,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_caja = p_id_caja_destino;

    RETURN v_id_transferencia;
END;
$$ LANGUAGE plpgsql;

-- Función para cancelar transferencia
CREATE OR REPLACE FUNCTION cancelar_transferencia_cajas(
    p_id_transferencia UUID,
    p_motivo_cancelacion TEXT DEFAULT 'Cancelada por usuario'
)
RETURNS VOID AS $$
DECLARE
    v_transferencia RECORD;
BEGIN
    -- Obtener datos de la transferencia
    SELECT * INTO v_transferencia
    FROM financial.transferencias_cajas
    WHERE id_transferencia = p_id_transferencia
    AND estado = 'Completada';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transferencia no encontrada o ya cancelada';
    END IF;

    -- Revertir saldos
    UPDATE financial.cajas
    SET saldo_actual = saldo_actual + v_transferencia.monto,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_caja = v_transferencia.id_caja_origen;

    UPDATE financial.cajas
    SET saldo_actual = saldo_actual - v_transferencia.monto,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_caja = v_transferencia.id_caja_destino;

    -- Marcar transferencia como cancelada
    UPDATE financial.transferencias_cajas
    SET estado = 'Cancelada',
        notas = COALESCE(notas, '') || ' | CANCELADA: ' || p_motivo_cancelacion,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_transferencia = p_id_transferencia;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de transferencias por período
CREATE OR REPLACE FUNCTION get_resumen_transferencias(
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    fecha DATE,
    total_transferencias INTEGER,
    monto_total DECIMAL(15,2),
    caja_origen_mas_activa VARCHAR(50),
    caja_destino_mas_activa VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.fecha::DATE,
        COUNT(*)::INTEGER as total_transferencias,
        SUM(t.monto)::DECIMAL(15,2) as monto_total,
        (SELECT c.nombre FROM financial.cajas c
         WHERE c.id_caja = (
             SELECT t2.id_caja_origen
             FROM financial.transferencias_cajas t2
             WHERE t2.fecha::DATE = t.fecha::DATE
             GROUP BY t2.id_caja_origen
             ORDER BY COUNT(*) DESC LIMIT 1
         )) as caja_origen_mas_activa,
        (SELECT c.nombre FROM financial.cajas c
         WHERE c.id_caja = (
             SELECT t2.id_caja_destino
             FROM financial.transferencias_cajas t2
             WHERE t2.fecha::DATE = t.fecha::DATE
             GROUP BY t2.id_caja_destino
             ORDER BY COUNT(*) DESC LIMIT 1
         )) as caja_destino_mas_activa
    FROM financial.transferencias_cajas t
    WHERE t.fecha::DATE BETWEEN fecha_inicio AND fecha_fin
    AND t.estado = 'Completada'
    GROUP BY t.fecha::DATE
    ORDER BY t.fecha::DATE DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE financial.transferencias_cajas IS 'Registro de transferencias de dinero entre cajas';
COMMENT ON FUNCTION procesar_transferencia_cajas IS 'Procesa una transferencia entre cajas actualizando saldos automáticamente';
COMMENT ON FUNCTION cancelar_transferencia_cajas IS 'Cancela una transferencia y revierte los saldos';
COMMENT ON FUNCTION get_resumen_transferencias IS 'Obtiene resumen estadístico de transferencias por período';

-- ===========================================
-- MEJORAS A INGRESOS Y EGRESOS
-- ===========================================

-- Agregar campos de categoría y concepto a la tabla de ingresos
ALTER TABLE financial.ingresos
ADD COLUMN IF NOT EXISTS id_concepto_ingreso UUID REFERENCES financial.conceptos_ingresos(id_concepto),
ADD COLUMN IF NOT EXISTS categoria_legacy VARCHAR(50), -- Mantener campo anterior por compatibilidad
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Agregar campos de categoría y concepto a la tabla de egresos
ALTER TABLE financial.egresos
ADD COLUMN IF NOT EXISTS id_concepto_egreso UUID REFERENCES financial.conceptos_egresos(id_concepto),
ADD COLUMN IF NOT EXISTS categoria_legacy VARCHAR(50), -- Mantener campo anterior por compatibilidad
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ingresos_concepto ON financial.ingresos(id_concepto_ingreso);
CREATE INDEX IF NOT EXISTS idx_egresos_concepto ON financial.egresos(id_concepto_egreso);

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
        LEFT JOIN vetplus_auth.usuarios u ON ing.created_by = u.id_usuario
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
        LEFT JOIN vetplus_auth.usuarios u ON egr.created_by = u.id_usuario
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

-- Comentarios finales
COMMENT ON FUNCTION get_ingresos_por_categoria IS 'Obtiene totales de ingresos agrupados por categoría en un período';
COMMENT ON FUNCTION get_egresos_por_categoria IS 'Obtiene totales de egresos agrupados por categoría en un período';
COMMENT ON FUNCTION get_detalle_por_concepto IS 'Obtiene detalle de movimientos por concepto específico';
COMMENT ON VIEW financial.reporte_pnl IS 'Vista consolidada de Pérdidas y Ganancias del mes actual';
