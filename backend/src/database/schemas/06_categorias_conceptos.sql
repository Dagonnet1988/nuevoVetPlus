-- ===========================================
-- VETPLUS - MEJORAS AL SISTEMA DE CAJAS
-- Categorías y Conceptos de Ingresos/Egresos
-- ===========================================

-- Tabla de categorías de ingresos
CREATE TABLE financial.categorias_ingresos (
    id_categoria UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(10) UNIQUE NOT NULL, -- ING01, ING02, etc.
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de conceptos específicos de ingresos
CREATE TABLE financial.conceptos_ingresos (
    id_concepto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_categoria UUID NOT NULL REFERENCES financial.categorias_ingresos(id_categoria),
    codigo VARCHAR(15) UNIQUE NOT NULL, -- ING01-001, ING01-002, etc.
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de categorías de egresos
CREATE TABLE financial.categorias_egresos (
    id_categoria UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(10) UNIQUE NOT NULL, -- EGR01, EGR02, etc.
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de conceptos específicos de egresos
CREATE TABLE financial.conceptos_egresos (
    id_concepto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_categoria UUID NOT NULL REFERENCES financial.categorias_egresos(id_categoria),
    codigo VARCHAR(15) UNIQUE NOT NULL, -- EGR01-001, EGR01-002, etc.
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales para categorías de INGRESOS
INSERT INTO financial.categorias_ingresos (codigo, nombre, descripcion) VALUES
('ING01', 'Servicios Veterinarios', 'Ingresos por consultas y servicios médicos'),
('ING02', 'Venta de Productos', 'Ingresos por venta de medicamentos y productos'),
('ING03', 'Terapias y Tratamientos', 'Ingresos por sesiones de terapia y tratamientos especiales'),
('ING04', 'Otros Ingresos', 'Ingresos diversos no clasificados en otras categorías');

-- Conceptos específicos de SERVICIOS VETERINARIOS
INSERT INTO financial.conceptos_ingresos (id_categoria, codigo, nombre, descripcion) 
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_ingresos ci,
(VALUES 
    ('ING01-001', 'Consulta General', 'Consulta veterinaria general'),
    ('ING01-002', 'Consulta Especializada', 'Consulta con veterinario especialista'),
    ('ING01-003', 'Cirugías', 'Procedimientos quirúrgicos'),
    ('ING01-004', 'Vacunación', 'Aplicación de vacunas'),
    ('ING01-005', 'Desparasitación', 'Tratamientos antiparasitarios'),
    ('ING01-006', 'Exámenes Diagnósticos', 'Rayos X, ecografías, análisis')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ci.codigo = 'ING01';

-- Conceptos específicos de VENTA DE PRODUCTOS
INSERT INTO financial.conceptos_ingresos (id_categoria, codigo, nombre, descripcion)
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_ingresos ci,
(VALUES 
    ('ING02-001', 'Medicamentos', 'Venta de medicamentos veterinarios'),
    ('ING02-002', 'Alimentos Medicados', 'Venta de alimentos terapéuticos'),
    ('ING02-003', 'Accesorios', 'Venta de collares, correas, juguetes'),
    ('ING02-004', 'Productos de Higiene', 'Shampoos, cepillos, productos de limpieza')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ci.codigo = 'ING02';

-- Conceptos específicos de TERAPIAS
INSERT INTO financial.conceptos_ingresos (id_categoria, codigo, nombre, descripcion)
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_ingresos ci,
(VALUES 
    ('ING03-001', 'Terapia Individual', 'Sesión individual de terapia'),
    ('ING03-002', 'Paquete 5 Sesiones', 'Paquete de 5 sesiones de terapia'),
    ('ING03-003', 'Paquete 10 Sesiones', 'Paquete de 10 sesiones de terapia'),
    ('ING03-004', 'Rehabilitación', 'Terapias de rehabilitación post-operatoria')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ci.codigo = 'ING03';

-- Datos iniciales para categorías de EGRESOS
INSERT INTO financial.categorias_egresos (codigo, nombre, descripcion) VALUES
('EGR01', 'Nómina y Personal', 'Gastos relacionados con el personal'),
('EGR02', 'Compra de Inventario', 'Compras a proveedores de medicamentos y productos'),
('EGR03', 'Gastos Operativos', 'Servicios públicos, mantenimiento, seguros'),
('EGR04', 'Marketing y Publicidad', 'Gastos en promoción y publicidad'),
('EGR05', 'Gastos Administrativos', 'Papelería, software, licencias'),
('EGR06', 'Otros Gastos', 'Gastos diversos no clasificados');

-- Conceptos específicos de NÓMINA Y PERSONAL
INSERT INTO financial.conceptos_egresos (id_categoria, codigo, nombre, descripcion)
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_egresos ce,
(VALUES 
    ('EGR01-001', 'Salarios Base', 'Salarios base del personal'),
    ('EGR01-002', 'Bonificaciones', 'Bonificaciones y primas'),
    ('EGR01-003', 'Seguridad Social', 'Aportes a seguridad social'),
    ('EGR01-004', 'Cesantías', 'Aportes a cesantías'),
    ('EGR01-005', 'Horas Extra', 'Pago de horas extra'),
    ('EGR01-006', 'Vacaciones', 'Pago de vacaciones')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ce.codigo = 'EGR01';

-- Conceptos específicos de COMPRA DE INVENTARIO
INSERT INTO financial.conceptos_egresos (id_categoria, codigo, nombre, descripcion)
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_egresos ce,
(VALUES 
    ('EGR02-001', 'Medicamentos', 'Compra de medicamentos veterinarios'),
    ('EGR02-002', 'Vacunas', 'Compra de vacunas'),
    ('EGR02-003', 'Material Quirúrgico', 'Instrumental y material quirúrgico'),
    ('EGR02-004', 'Alimentos Medicados', 'Compra de alimentos terapéuticos'),
    ('EGR02-005', 'Productos de Limpieza', 'Desinfectantes y productos de aseo')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ce.codigo = 'EGR02';

-- Conceptos específicos de GASTOS OPERATIVOS
INSERT INTO financial.conceptos_egresos (id_categoria, codigo, nombre, descripcion)
SELECT id_categoria, codigo_concepto, nombre_concepto, descripcion_concepto
FROM financial.categorias_egresos ce,
(VALUES 
    ('EGR03-001', 'Servicios Públicos', 'Electricidad, agua, gas, internet'),
    ('EGR03-002', 'Arriendo', 'Arriendo del local'),
    ('EGR03-003', 'Mantenimiento Equipos', 'Mantenimiento de equipos médicos'),
    ('EGR03-004', 'Seguros', 'Seguros del local y equipos'),
    ('EGR03-005', 'Combustible', 'Combustible para vehículos'),
    ('EGR03-006', 'Telecomunicaciones', 'Teléfono, internet, celulares')
) AS conceptos(codigo_concepto, nombre_concepto, descripcion_concepto)
WHERE ce.codigo = 'EGR03';

-- Índices para optimización
CREATE INDEX idx_conceptos_ingresos_categoria ON financial.conceptos_ingresos(id_categoria);
CREATE INDEX idx_conceptos_egresos_categoria ON financial.conceptos_egresos(id_categoria);
CREATE INDEX idx_categorias_ingresos_codigo ON financial.categorias_ingresos(codigo);
CREATE INDEX idx_categorias_egresos_codigo ON financial.categorias_egresos(codigo);

-- Comentarios
COMMENT ON TABLE financial.categorias_ingresos IS 'Categorías principales de ingresos (ING01, ING02, etc.)';
COMMENT ON TABLE financial.conceptos_ingresos IS 'Conceptos específicos dentro de cada categoría de ingresos';
COMMENT ON TABLE financial.categorias_egresos IS 'Categorías principales de egresos (EGR01, EGR02, etc.)';
COMMENT ON TABLE financial.conceptos_egresos IS 'Conceptos específicos dentro de cada categoría de egresos';
