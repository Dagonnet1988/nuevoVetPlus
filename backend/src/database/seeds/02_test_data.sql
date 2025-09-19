-- ===========================================
-- VETPLUS - DATOS DE PRUEBA COMPLETOS
-- ===========================================

-- ===========================================
-- USUARIOS DE PRUEBA
-- ===========================================

-- Veterinarios
INSERT INTO vetplus_auth.usuarios (
    id_usuario,
    nombre,
    apellido,
    email,
    documento,
    tipo_documento,
    password_hash,
    rol,
    activo,
    password_temporal,
    debe_cambiar_password
) VALUES
(uuid_generate_v4(), 'María', 'González', 'maria.vet@vetplus.com', '12345678', 'CC', '$2b$12$CxEe.Lmjxiysh0u0uwf3DeZXp3tXFYcDVN5bEq.mB2Lk0hn.e.LaW', 'vet', true, false, false),
(uuid_generate_v4(), 'Carlos', 'Rodríguez', 'carlos.vet@vetplus.com', '87654321', 'CC', '$2b$12$CxEe.Lmjxiysh0u0uwf3DeZXp3tXFYcDVN5bEq.mB2Lk0hn.e.LaW', 'vet', true, false, false),
(uuid_generate_v4(), 'Ana', 'Martínez', 'ana.vet@vetplus.com', '11223344', 'CC', '$2b$12$CxEe.Lmjxiysh0u0uwf3DeZXp3tXFYcDVN5bEq.mB2Lk0hn.e.LaW', 'vet', true, false, false)
ON CONFLICT (email) DO NOTHING;

-- Auxiliares
INSERT INTO vetplus_auth.usuarios (
    id_usuario,
    nombre,
    apellido,
    email,
    documento,
    tipo_documento,
    password_hash,
    rol,
    activo,
    password_temporal,
    debe_cambiar_password
) VALUES
(uuid_generate_v4(), 'Pedro', 'López', 'pedro.aux@vetplus.com', '44332211', 'CC', '$2b$12$CxEe.Lmjxiysh0u0uwf3DeZXp3tXFYcDVN5bEq.mB2Lk0hn.e.LaW', 'aux_vet', true, false, false),
(uuid_generate_v4(), 'Laura', 'Sánchez', 'laura.aux@vetplus.com', '55667788', 'CC', '$2b$12$CxEe.Lmjxiysh0u0uwf3DeZXp3tXFYcDVN5bEq.mB2Lk0hn.e.LaW', 'aux_admin', true, false, false)
ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- CLIENTES DE PRUEBA
-- ===========================================

INSERT INTO clinical.clientes (
    id_cliente,
    nombre,
    documento,
    tipo_documento,
    telefono,
    email,
    direccion,
    ciudad,
    departamento,
    fecha_nacimiento,
    activo
) VALUES
(uuid_generate_v4(), 'Juan Pérez García', '11111111', 'CC', '3001234567', 'juan.perez@email.com', 'Calle 123 #45-67', 'Bogotá', 'Cundinamarca', '1985-03-15', true),
(uuid_generate_v4(), 'María López Rodríguez', '22222222', 'CC', '3007654321', 'maria.lopez@email.com', 'Carrera 89 #12-34', 'Medellín', 'Antioquia', '1990-07-22', true),
(uuid_generate_v4(), 'Carlos Martínez Silva', '33333333', 'CC', '3012345678', 'carlos.martinez@email.com', 'Avenida 68 #23-45', 'Cali', 'Valle del Cauca', '1978-11-08', true),
(uuid_generate_v4(), 'Ana García Torres', '44444444', 'CC', '3023456789', 'ana.garcia@email.com', 'Transversal 45 #67-89', 'Barranquilla', 'Atlántico', '1982-05-30', true),
(uuid_generate_v4(), 'Pedro Rodríguez Morales', '55555555', 'CC', '3034567890', 'pedro.rodriguez@email.com', 'Diagonal 12 #34-56', 'Cartagena', 'Bolívar', '1995-09-12', true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- MASCOTAS DE PRUEBA
-- ===========================================

-- Mascotas para Juan Pérez
INSERT INTO clinical.mascotas (
    id_mascota,
    id_cliente,
    nombre,
    especie,
    raza,
    fecha_nacimiento,
    sexo,
    color,
    peso,
    esterilizado,
    activo
) VALUES
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '11111111'), 'Max', 'Perro', 'Labrador Retriever', '2020-05-15', 'Macho', 'Dorado', 25.5, true, true),
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '11111111'), 'Luna', 'Gato', 'Siamés', '2019-08-20', 'Hembra', 'Gris', 4.2, false, true);

-- Mascotas para María López
INSERT INTO clinical.mascotas (
    id_mascota,
    id_cliente,
    nombre,
    especie,
    raza,
    fecha_nacimiento,
    sexo,
    color,
    peso,
    esterilizado,
    activo
) VALUES
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '22222222'), 'Rocky', 'Perro', 'Bulldog Francés', '2021-02-10', 'Macho', 'Blanco con negro', 12.8, false, true),
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '22222222'), 'Bella', 'Perro', 'Golden Retriever', '2018-11-25', 'Hembra', 'Dorado', 28.3, true, true);

-- Mascotas para Carlos Martínez
INSERT INTO clinical.mascotas (
    id_mascota,
    id_cliente,
    nombre,
    especie,
    raza,
    fecha_nacimiento,
    sexo,
    color,
    peso,
    esterilizado,
    activo
) VALUES
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '33333333'), 'Coco', 'Gato', 'Persa', '2022-01-08', 'Hembra', 'Blanco', 3.5, false, true);

-- Mascotas para Ana García
INSERT INTO clinical.mascotas (
    id_mascota,
    id_cliente,
    nombre,
    especie,
    raza,
    fecha_nacimiento,
    sexo,
    color,
    peso,
    esterilizado,
    activo
) VALUES
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '44444444'), 'Toby', 'Perro', 'Beagle', '2019-12-03', 'Macho', 'Tricolor', 11.2, true, true),
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '44444444'), 'Mimi', 'Gato', 'Maine Coon', '2020-06-18', 'Hembra', 'Gris', 5.8, false, true);

-- Mascotas para Pedro Rodríguez
INSERT INTO clinical.mascotas (
    id_mascota,
    id_cliente,
    nombre,
    especie,
    raza,
    fecha_nacimiento,
    sexo,
    color,
    peso,
    esterilizado,
    activo
) VALUES
(uuid_generate_v4(), (SELECT id_cliente FROM clinical.clientes WHERE documento = '55555555'), 'Bruno', 'Perro', 'Pastor Alemán', '2021-09-14', 'Macho', 'Negro con marrón', 32.1, false, true);

-- ===========================================
-- PRODUCTOS DE PRUEBA
-- ===========================================

-- Productos de terapia
INSERT INTO financial.productos (
    id_producto,
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    tipo,
    categoria,
    precio_compra,
    precio_venta,
    stock_actual,
    stock_minimo,
    stock_maximo,
    inventariable,
    sesiones_incluidas,
    duracion_sesion,
    activo
) VALUES
(uuid_generate_v4(), 'TER-001', '7700000000001', 'Paquete Terapia Completo 10 Sesiones', 'Paquete completo de fisioterapia con 10 sesiones', 'Terapia Paquete', 'Terapias', 300000, 450000, 50, 5, 100, false, 10, 60, true),
(uuid_generate_v4(), 'TER-002', '7700000000002', 'Sesión Terapia Individual', 'Sesión individual de fisioterapia', 'Terapia Individual', 'Terapias', 40000, 50000, 999, 10, 1000, false, null, 60, true);

-- Medicamentos
INSERT INTO financial.productos (
    id_producto,
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    tipo,
    categoria,
    precio_compra,
    precio_venta,
    stock_actual,
    stock_minimo,
    stock_maximo,
    inventariable,
    activo
) VALUES
(uuid_generate_v4(), 'MED-001', '7700000000003', 'Vacuna Antirrábica', 'Vacuna antirrábica para perros y gatos', 'Producto', 'Vacunas', 25000, 35000, 50, 10, 100, true, true),
(uuid_generate_v4(), 'MED-002', '7700000000004', 'Antibiótico Amoxicilina 500mg', 'Antibiótico de amplio espectro', 'Producto', 'Medicamentos', 8000, 15000, 100, 20, 200, true, true),
(uuid_generate_v4(), 'MED-003', '7700000000005', 'Antiinflamatorio Ibuprofeno', 'Antiinflamatorio para dolor e inflamación', 'Producto', 'Medicamentos', 5000, 12000, 80, 15, 150, true, true),
(uuid_generate_v4(), 'MED-004', '7700000000006', 'Desparasitante Interno', 'Desparasitante para perros y gatos', 'Producto', 'Desparasitantes', 15000, 25000, 60, 12, 120, true, true),
(uuid_generate_v4(), 'MED-005', '7700000000007', 'Shampoo Medicinal', 'Shampoo medicinal para piel sensible', 'Producto', 'Cuidado e Higiene', 12000, 25000, 30, 5, 60, true, true);

-- Alimentos y accesorios
INSERT INTO financial.productos (
    id_producto,
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    tipo,
    categoria,
    precio_compra,
    precio_venta,
    stock_actual,
    stock_minimo,
    stock_maximo,
    inventariable,
    activo
) VALUES
(uuid_generate_v4(), 'ALI-001', '7700000000008', 'Pienso Premium Perros Adultos', 'Alimento balanceado para perros adultos', 'Producto', 'Alimentos', 75000, 120000, 25, 5, 50, true, true),
(uuid_generate_v4(), 'ALI-002', '7700000000009', 'Pienso Premium Gatos Adultos', 'Alimento balanceado para gatos adultos', 'Producto', 'Alimentos', 70000, 110000, 20, 4, 40, true, true),
(uuid_generate_v4(), 'ACC-001', '7700000000010', 'Collar Antipulgas', 'Collar antipulgas para perros', 'Producto', 'Accesorios', 8000, 18000, 40, 8, 80, true, true),
(uuid_generate_v4(), 'ACC-002', '7700000000011', 'Cama para Mascotas Grande', 'Cama acolchada para perros grandes', 'Producto', 'Accesorios', 45000, 85000, 15, 3, 30, true, true);

-- Servicios
INSERT INTO financial.productos (
    id_producto,
    codigo,
    nombre,
    descripcion,
    tipo,
    categoria,
    precio_venta,
    inventariable,
    activo
) VALUES
(uuid_generate_v4(), 'SER-001', 'Consulta General Veterinaria', 'Consulta veterinaria general', 'Servicio', 'Consultas', 80000, false, true),
(uuid_generate_v4(), 'SER-002', 'Consulta Especializada Dermatología', 'Consulta especializada en dermatología', 'Servicio', 'Consultas', 120000, false, true),
(uuid_generate_v4(), 'SER-003', 'Baño y Corte de Pelo', 'Servicio de baño y corte de pelo', 'Servicio', 'Grooming', 60000, false, true),
(uuid_generate_v4(), 'SER-004', 'Análisis de Sangre Básico', 'Análisis de sangre básico', 'Servicio', 'Laboratorio', 150000, false, true);

-- ===========================================
-- CAJA ACTIVA
-- ===========================================

INSERT INTO financial.cajas (
    id_caja,
    nombre,
    tipo,
    descripcion,
    saldo_inicial,
    saldo_actual,
    activa
) VALUES
(uuid_generate_v4(), 'Caja Principal', 'Caja Menor', 'Caja principal de la veterinaria', 1000000, 1000000, true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- CONSULTAS DE PRUEBA
-- ===========================================

-- Consultas para Max (Juan Pérez)
INSERT INTO clinical.consultas_clinicas (
    id_consulta,
    id_mascota,
    id_veterinario,
    fecha,
    motivo_consulta,
    diagnostico,
    tratamiento,
    costo,
    proxima_cita,
    estado
) VALUES
(
    uuid_generate_v4(),
    (SELECT id_mascota FROM clinical.mascotas WHERE nombre = 'Max' LIMIT 1),
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'maria.vet@vetplus.com'),
    CURRENT_DATE - INTERVAL '30 days',
    'Revisión anual y vacunación',
    'Paciente en buen estado general',
    'Vacuna antirrábica aplicada',
    80000,
    CURRENT_DATE + INTERVAL '365 days',
    'Completada'
),
(
    uuid_generate_v4(),
    (SELECT id_mascota FROM clinical.mascotas WHERE nombre = 'Max' LIMIT 1),
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'carlos.vet@vetplus.com'),
    CURRENT_DATE - INTERVAL '15 days',
    'Control post vacunación',
    'Sin reacciones adversas',
    'Recomendaciones de cuidado',
    60000,
    NULL,
    'Completada'
);

-- Consultas para Luna (Juan Pérez)
INSERT INTO clinical.consultas_clinicas (
    id_consulta,
    id_mascota,
    id_veterinario,
    fecha,
    motivo_consulta,
    diagnostico,
    tratamiento,
    costo,
    proxima_cita,
    estado
) VALUES
(
    uuid_generate_v4(),
    (SELECT id_mascota FROM clinical.mascotas WHERE nombre = 'Luna' LIMIT 1),
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'ana.vet@vetplus.com'),
    CURRENT_DATE - INTERVAL '20 days',
    'Problemas dermatológicos',
    'Dermatitis alérgica',
    'Shampoo medicinal y antihistamínicos',
    100000,
    CURRENT_DATE + INTERVAL '14 days',
    'Completada'
);

-- ===========================================
-- FACTURAS DE PRUEBA
-- ===========================================

-- Factura 1: Juan Pérez - Vacuna para Max
INSERT INTO financial.facturas_venta (
    id_factura,
    codigo_factura,
    id_cliente,
    fecha,
    subtotal,
    impuestos,
    descuento,
    total,
    metodo_pago,
    estado,
    id_caja,
    notas
) VALUES (
    uuid_generate_v4(),
    'FAC-001',
    (SELECT id_cliente FROM clinical.clientes WHERE documento = '11111111'),
    CURRENT_DATE - INTERVAL '30 days',
    115000,
    0,
    0,
    115000,
    'Efectivo',
    'Pagada',
    (SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1),
    'Factura por vacunación anual'
);

-- Líneas de la factura 1
INSERT INTO financial.lineas_factura (
    id_linea,
    id_factura,
    id_producto,
    cantidad,
    precio_unitario,
    descuento
) VALUES
(
    uuid_generate_v4(),
    (SELECT id_factura FROM financial.facturas_venta WHERE codigo_factura = 'FAC-001'),
    (SELECT id_producto FROM financial.productos WHERE codigo = 'SER-001'),
    1,
    80000,
    0
),
(
    uuid_generate_v4(),
    (SELECT id_factura FROM financial.facturas_venta WHERE codigo_factura = 'FAC-001'),
    (SELECT id_producto FROM financial.productos WHERE codigo = 'MED-001'),
    1,
    35000,
    0
);

-- Factura 2: María López - Terapia para Rocky
INSERT INTO financial.facturas_venta (
    id_factura,
    codigo_factura,
    id_cliente,
    fecha,
    subtotal,
    impuestos,
    descuento,
    total,
    metodo_pago,
    estado,
    id_caja,
    notas
) VALUES (
    uuid_generate_v4(),
    'FAC-002',
    (SELECT id_cliente FROM clinical.clientes WHERE documento = '22222222'),
    CURRENT_DATE - INTERVAL '15 days',
    450000,
    0,
    0,
    450000,
    'Tarjeta',
    'Pagada',
    (SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1),
    'Paquete de terapia física'
);

-- Líneas de la factura 2
INSERT INTO financial.lineas_factura (
    id_linea,
    id_factura,
    id_producto,
    cantidad,
    precio_unitario,
    descuento
) VALUES
(
    uuid_generate_v4(),
    (SELECT id_factura FROM financial.facturas_venta WHERE codigo_factura = 'FAC-002'),
    (SELECT id_producto FROM financial.productos WHERE codigo = 'TER-001'),
    1,
    450000,
    0
);

-- ===========================================
-- CONTROL DE TERAPIAS
-- ===========================================

-- Control de terapia para Rocky (María López)
INSERT INTO financial.control_terapias (
    id_control,
    id_mascota,
    id_factura,
    id_producto,
    tipo,
    sesiones_total,
    sesiones_usadas,
    fecha_inicio,
    fecha_vencimiento,
    activo
) VALUES (
    uuid_generate_v4(),
    (SELECT id_mascota FROM clinical.mascotas WHERE nombre = 'Rocky' LIMIT 1),
    (SELECT id_factura FROM financial.facturas_venta WHERE codigo_factura = 'FAC-002'),
    (SELECT id_producto FROM financial.productos WHERE codigo = 'TER-001'),
    'Paquete',
    10,
    2,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '15 days' + INTERVAL '6 months',
    true
);

-- ===========================================
-- SESIONES DE TERAPIA
-- ===========================================

-- Sesiones realizadas para Rocky
INSERT INTO financial.sesiones_terapia (
    id_sesion,
    id_control,
    fecha_sesion,
    observaciones,
    duracion_real,
    realizada_por
) VALUES
(
    uuid_generate_v4(),
    (SELECT id_control FROM financial.control_terapias LIMIT 1),
    CURRENT_DATE - INTERVAL '12 days',
    'Primera sesión de terapia física. Paciente responde bien al tratamiento.',
    60,
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'maria.vet@vetplus.com')
),
(
    uuid_generate_v4(),
    (SELECT id_control FROM financial.control_terapias LIMIT 1),
    CURRENT_DATE - INTERVAL '5 days',
    'Segunda sesión. Mejora notable en la movilidad.',
    60,
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'carlos.vet@vetplus.com')
);

-- ===========================================
-- MOVIMIENTOS DE CAJA
-- ===========================================

-- Ingresos por facturas
INSERT INTO financial.ingresos (
    id_ingreso,
    codigo_ingreso,
    id_caja,
    descripcion,
    monto,
    categoria,
    fecha,
    referencia,
    metodo_pago,
    created_by
) VALUES
(
    uuid_generate_v4(),
    'ING-001',
    (SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1),
    'Pago de factura FAC-001',
    115000,
    'venta',
    CURRENT_DATE - INTERVAL '30 days',
    'FAC-001',
    'Efectivo',
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'maria.vet@vetplus.com')
),
(
    uuid_generate_v4(),
    'ING-002',
    (SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1),
    'Pago de factura FAC-002',
    450000,
    'venta',
    CURRENT_DATE - INTERVAL '15 days',
    'FAC-002',
    'Tarjeta',
    (SELECT id_usuario FROM vetplus_auth.usuarios WHERE email = 'carlos.vet@vetplus.com')
);

-- Actualizar saldo de caja
UPDATE financial.cajas
SET saldo_actual = saldo_actual + 565000
WHERE activa = true;

-- ===========================================
-- LOG DE INICIALIZACIÓN
-- ===========================================

INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'system.test_data',
    'CREATE',
    'Datos de prueba completos insertados en VetPlus'
);

-- ===========================================
-- MENSAJE FINAL
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '✅ DATOS DE PRUEBA INSERTADOS EXITOSAMENTE';
    RAISE NOTICE '📊 Resumen de datos creados:';
    RAISE NOTICE '   👥 Usuarios: 6 (3 veterinarios, 2 auxiliares, 1 admin)';
    RAISE NOTICE '   👨‍👩‍👧‍👦 Clientes: 5';
    RAISE NOTICE '   🐾 Mascotas: 7';
    RAISE NOTICE '   📦 Productos: 12 (medicamentos, alimentos, terapias, servicios)';
    RAISE NOTICE '   🧾 Facturas: 2';
    RAISE NOTICE '   💰 Movimientos de caja: 2';
    RAISE NOTICE '   🏥 Controles de terapia: 1';
    RAISE NOTICE '   📅 Sesiones de terapia: 2';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Credenciales de acceso:';
    RAISE NOTICE '   Admin: ascobidi@hotmail.com / admin123';
    RAISE NOTICE '   Vet: maria.vet@vetplus.com / admin123';
    RAISE NOTICE '   Aux: pedro.aux@vetplus.com / admin123';
END $$;