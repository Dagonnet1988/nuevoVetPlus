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
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Credenciales de acceso:';
    RAISE NOTICE '   Admin: ascobidi@hotmail.com / admin123';
    RAISE NOTICE '   Vet: maria.vet@vetplus.com / admin123';
    RAISE NOTICE '   Aux: pedro.aux@vetplus.com / admin123';
END $$;