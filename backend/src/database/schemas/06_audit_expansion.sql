-- ===========================================
-- VETPLUS - EXPANSIÓN SISTEMA DE AUDITORÍA
-- ===========================================

-- Expandir triggers de auditoría a todas las tablas críticas

-- MÓDULO CLÍNICO
CREATE TRIGGER audit_clientes
    AFTER INSERT OR UPDATE OR DELETE ON clinical.clientes
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_mascotas
    AFTER INSERT OR UPDATE OR DELETE ON clinical.mascotas
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_consultas
    AFTER INSERT OR UPDATE OR DELETE ON clinical.consultas_clinicas
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_citas
    AFTER INSERT OR UPDATE OR DELETE ON clinical.calendario_citas
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- MÓDULO FINANCIERO - PRODUCTOS Y INVENTARIO
CREATE TRIGGER audit_productos
    AFTER INSERT OR UPDATE OR DELETE ON financial.productos
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON financial.proveedores
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- MÓDULO FINANCIERO - CAJAS Y MOVIMIENTOS
CREATE TRIGGER audit_cajas
    AFTER INSERT OR UPDATE OR DELETE ON financial.cajas
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_ingresos
    AFTER INSERT OR UPDATE OR DELETE ON financial.ingresos
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_egresos
    AFTER INSERT OR UPDATE OR DELETE ON financial.egresos
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- MÓDULO FINANCIERO - LÍNEAS DE ÓRDENES Y FACTURAS
CREATE TRIGGER audit_lineas_orden
    AFTER INSERT OR UPDATE OR DELETE ON financial.lineas_orden_compra
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_lineas_factura
    AFTER INSERT OR UPDATE OR DELETE ON financial.lineas_factura
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- MÓDULO TERAPIAS
CREATE TRIGGER audit_control_terapias
    AFTER INSERT OR UPDATE OR DELETE ON financial.control_terapias
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Función mejorada para auditoría con mejor manejo de errores
CREATE OR REPLACE FUNCTION create_audit_log_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    user_id UUID;
    entity_id TEXT;
    ip_address INET;
    user_agent TEXT;
BEGIN
    -- Intentar obtener el user_id del contexto actual
    BEGIN
        user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        user_id := NULL;
    END;
    
    -- Intentar obtener IP y User Agent del contexto
    BEGIN
        ip_address := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        ip_address := NULL;
    END;
    
    BEGIN
        user_agent := current_setting('app.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        user_agent := NULL;
    END;
    
    -- Obtener ID de la entidad según la tabla
    BEGIN
        CASE TG_TABLE_NAME
            WHEN 'usuarios' THEN entity_id := COALESCE(NEW.id_usuario, OLD.id_usuario)::TEXT;
            WHEN 'clientes' THEN entity_id := COALESCE(NEW.id_cliente, OLD.id_cliente)::TEXT;
            WHEN 'mascotas' THEN entity_id := COALESCE(NEW.id_mascota, OLD.id_mascota)::TEXT;
            WHEN 'productos' THEN entity_id := COALESCE(NEW.id_producto, OLD.id_producto)::TEXT;
            WHEN 'proveedores' THEN entity_id := COALESCE(NEW.id_proveedor, OLD.id_proveedor)::TEXT;
            WHEN 'cajas' THEN entity_id := COALESCE(NEW.id_caja, OLD.id_caja)::TEXT;
            WHEN 'ingresos' THEN entity_id := COALESCE(NEW.id_ingreso, OLD.id_ingreso)::TEXT;
            WHEN 'egresos' THEN entity_id := COALESCE(NEW.id_egreso, OLD.id_egreso)::TEXT;
            WHEN 'ordenes_compra' THEN entity_id := COALESCE(NEW.id_orden, OLD.id_orden)::TEXT;
            WHEN 'facturas_venta' THEN entity_id := COALESCE(NEW.id_factura, OLD.id_factura)::TEXT;
            WHEN 'consultas_clinicas' THEN entity_id := COALESCE(NEW.id_consulta, OLD.id_consulta)::TEXT;
            WHEN 'calendario_citas' THEN entity_id := COALESCE(NEW.id_cita, OLD.id_cita)::TEXT;
            WHEN 'control_terapias' THEN entity_id := COALESCE(NEW.id_control, OLD.id_control)::TEXT;
            ELSE entity_id := 'unknown';
        END CASE;
    EXCEPTION WHEN OTHERS THEN
        entity_id := 'error';
    END;
    
    -- Insertar log de auditoría
    INSERT INTO system.log_auditoria (
        id_usuario,
        tabla_afectada,
        id_entidad_afectada,
        tipo_accion,
        descripcion,
        data_anterior,
        data_nueva,
        ip_address,
        user_agent
    ) VALUES (
        user_id,
        table_name,
        entity_id,
        TG_OP,
        TG_OP || ' en ' || table_name || CASE WHEN entity_id != 'unknown' THEN ' (ID: ' || entity_id || ')' ELSE '' END,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        ip_address,
        user_agent
    );
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- En caso de error, no fallar la transacción principal
    RAISE WARNING 'Error en auditoría para tabla %: %', table_name, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Vista para consultar auditorías con información de usuario
CREATE VIEW system.v_audit_log AS
SELECT 
    a.id_log,
    a.tabla_afectada,
    a.id_entidad_afectada,
    a.tipo_accion,
    a.descripcion,
    a.fecha,
    a.ip_address,
    a.user_agent,
    u.email as usuario_email,
    u.rol as usuario_rol,
    CASE 
        WHEN a.tipo_accion = 'INSERT' THEN 'Creación'
        WHEN a.tipo_accion = 'UPDATE' THEN 'Modificación'
        WHEN a.tipo_accion = 'DELETE' THEN 'Eliminación'
        ELSE a.tipo_accion
    END as accion_descripcion
FROM system.log_auditoria a
LEFT JOIN auth.usuarios u ON a.id_usuario = u.id_usuario
ORDER BY a.fecha DESC;

-- Índices para optimizar consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_audit_tabla_fecha ON system.log_auditoria(tabla_afectada, fecha);
CREATE INDEX IF NOT EXISTS idx_audit_usuario_fecha ON system.log_auditoria(id_usuario, fecha);
CREATE INDEX IF NOT EXISTS idx_audit_entidad ON system.log_auditoria(tabla_afectada, id_entidad_afectada);
CREATE INDEX IF NOT EXISTS idx_audit_tipo_accion ON system.log_auditoria(tipo_accion, fecha);