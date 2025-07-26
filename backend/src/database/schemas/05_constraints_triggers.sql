-- ===========================================
-- VETPLUS - CONSTRAINTS ADICIONALES Y TRIGGERS
-- ===========================================

-- Constraint para validar que el egreso con orden de compra sea válido
ALTER TABLE financial.egresos 
ADD CONSTRAINT fk_egresos_orden_compra 
FOREIGN KEY (id_orden_compra) 
REFERENCES financial.ordenes_compra(id_orden) 
ON DELETE SET NULL;

-- Triggers para actualizar saldos de cajas automáticamente

-- Función para actualizar saldo de caja en ingresos
CREATE OR REPLACE FUNCTION update_caja_saldo_ingreso()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual + NEW.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = NEW.id_caja;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revertir el monto anterior y aplicar el nuevo
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual - OLD.monto + NEW.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = NEW.id_caja;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual - OLD.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = OLD.id_caja;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar saldo de caja en egresos
CREATE OR REPLACE FUNCTION update_caja_saldo_egreso()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual - NEW.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = NEW.id_caja;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revertir el monto anterior y aplicar el nuevo
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual + OLD.monto - NEW.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = NEW.id_caja;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE financial.cajas 
        SET saldo_actual = saldo_actual + OLD.monto,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = OLD.id_caja;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para saldos de caja
CREATE TRIGGER trigger_update_saldo_ingreso
    AFTER INSERT OR UPDATE OR DELETE ON financial.ingresos
    FOR EACH ROW EXECUTE FUNCTION update_caja_saldo_ingreso();

CREATE TRIGGER trigger_update_saldo_egreso
    AFTER INSERT OR UPDATE OR DELETE ON financial.egresos
    FOR EACH ROW EXECUTE FUNCTION update_caja_saldo_egreso();

-- Función para actualizar stock de productos
CREATE OR REPLACE FUNCTION update_stock_producto()
RETURNS TRIGGER AS $$
DECLARE
    producto_record RECORD;
BEGIN
    -- Solo actualizar stock para productos inventariables
    SELECT inventariable INTO producto_record 
    FROM financial.productos 
    WHERE id_producto = NEW.id_producto;
    
    IF producto_record.inventariable THEN
        IF TG_TABLE_NAME = 'lineas_orden_compra' THEN
            -- Aumentar stock cuando se recibe una orden de compra
            IF TG_OP = 'INSERT' THEN
                UPDATE financial.productos 
                SET stock_actual = stock_actual + NEW.cantidad,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_producto = NEW.id_producto;
            END IF;
        ELSIF TG_TABLE_NAME = 'lineas_factura' THEN
            -- Disminuir stock cuando se vende
            IF TG_OP = 'INSERT' THEN
                UPDATE financial.productos 
                SET stock_actual = stock_actual - NEW.cantidad,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_producto = NEW.id_producto;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualización de stock
CREATE TRIGGER trigger_stock_orden_compra
    AFTER INSERT ON financial.lineas_orden_compra
    FOR EACH ROW EXECUTE FUNCTION update_stock_producto();

CREATE TRIGGER trigger_stock_factura_venta
    AFTER INSERT ON financial.lineas_factura
    FOR EACH ROW EXECUTE FUNCTION update_stock_producto();

-- Función para crear ingreso automático al facturar
CREATE OR REPLACE FUNCTION create_ingreso_from_factura()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear ingreso si la factura está pagada
    IF NEW.estado = 'Pagada' THEN
        INSERT INTO financial.ingresos (
            id_caja,
            descripcion,
            monto,
            categoria,
            referencia,
            metodo_pago,
            created_by
        ) VALUES (
            NEW.id_caja,
            'Venta - Factura ' || NEW.codigo_factura,
            NEW.total,
            'Ventas',
            NEW.codigo_factura,
            NEW.metodo_pago,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear ingreso automático
CREATE TRIGGER trigger_ingreso_factura
    AFTER INSERT ON financial.facturas_venta
    FOR EACH ROW EXECUTE FUNCTION create_ingreso_from_factura();

-- Función para auditoría automática
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    user_id UUID;
BEGIN
    -- Intentar obtener el user_id del contexto actual
    user_id := current_setting('app.current_user_id', true)::UUID;
    
    INSERT INTO system.log_auditoria (
        id_usuario,
        tabla_afectada,
        id_entidad_afectada,
        tipo_accion,
        descripcion,
        data_anterior,
        data_nueva
    ) VALUES (
        user_id,
        table_name,
        'auto-generated', -- Simplificamos para evitar errores de campos
        TG_OP,
        TG_OP || ' en ' || table_name,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas principales (ejemplo para algunas tablas críticas)
CREATE TRIGGER audit_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON auth.usuarios
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_facturas
    AFTER INSERT OR UPDATE OR DELETE ON financial.facturas_venta
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_ordenes
    AFTER INSERT OR UPDATE OR DELETE ON financial.ordenes_compra
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Validaciones adicionales con CHECK constraints
ALTER TABLE financial.control_terapias 
ADD CONSTRAINT check_sesiones_validas 
CHECK (sesiones_usadas >= 0 AND sesiones_usadas <= sesiones_total);

ALTER TABLE clinical.calendario_citas 
ADD CONSTRAINT check_fechas_validas 
CHECK (fecha_fin > fecha_inicio);

ALTER TABLE financial.productos 
ADD CONSTRAINT check_precios_validos 
CHECK (precio_venta > 0 AND (precio_compra IS NULL OR precio_compra >= 0));

-- Vistas útiles para consultas frecuentes

-- Vista de saldos de cajas
CREATE VIEW financial.v_saldos_cajas AS
SELECT 
    c.id_caja,
    c.nombre,
    c.tipo,
    c.saldo_actual,
    COALESCE(i.total_ingresos, 0) as total_ingresos,
    COALESCE(e.total_egresos, 0) as total_egresos,
    c.updated_at
FROM financial.cajas c
LEFT JOIN (
    SELECT id_caja, SUM(monto) as total_ingresos
    FROM financial.ingresos
    GROUP BY id_caja
) i ON c.id_caja = i.id_caja
LEFT JOIN (
    SELECT id_caja, SUM(monto) as total_egresos
    FROM financial.egresos
    GROUP BY id_caja
) e ON c.id_caja = e.id_caja
WHERE c.activa = true;

-- Vista de productos con stock bajo
CREATE VIEW financial.v_productos_stock_bajo AS
SELECT 
    p.id_producto,
    p.codigo,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    (p.stock_minimo - p.stock_actual) as cantidad_requerida
FROM financial.productos p
WHERE p.inventariable = true 
  AND p.activo = true 
  AND p.stock_actual <= p.stock_minimo;

-- Vista de terapias próximas a vencer
CREATE VIEW financial.v_terapias_por_vencer AS
SELECT 
    ct.id_control,
    m.nombre as mascota,
    c.nombre as cliente,
    p.nombre as terapia,
    ct.sesiones_restantes,
    ct.fecha_vencimiento,
    EXTRACT(DAYS FROM (ct.fecha_vencimiento::date - CURRENT_DATE::date)) as dias_restantes
FROM financial.control_terapias ct
JOIN clinical.mascotas m ON ct.id_mascota = m.id_mascota
JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
JOIN financial.productos p ON ct.id_producto = p.id_producto
WHERE ct.activo = true 
  AND ct.sesiones_restantes > 0
  AND ct.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ct.fecha_vencimiento;
