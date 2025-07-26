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
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    created_by UUID REFERENCES auth.usuarios(id_usuario)
);

-- Trigger para updated_at
CREATE TRIGGER update_proveedores_updated_at 
    BEFORE UPDATE ON financial.proveedores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de productos e inventario
CREATE TABLE financial.productos (
    id_producto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('Producto', 'Servicio', 'Terapia Individual', 'Terapia Paquete')),
    categoria VARCHAR(50),
    marca VARCHAR(100),
    precio_compra DECIMAL(15,2),
    precio_venta DECIMAL(15,2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    inventariable BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN DEFAULT true,
    -- Campos específicos para terapias
    sesiones_incluidas INTEGER, -- Para paquetes de terapia
    duracion_sesion INTEGER, -- En minutos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.usuarios(id_usuario)
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
    realizada_por UUID NOT NULL REFERENCES auth.usuarios(id_usuario),
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
