-- ===========================================
-- VETPLUS - DATOS INICIALES MÍNIMOS
-- ===========================================

-- Usuario administrador por defecto
INSERT INTO auth.usuarios (
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
) VALUES (
    uuid_generate_v4(),
    'Administrador',
    'Sistema',
    'ascobidi@hotmail.com',
    '12345678',
    'CC',
    '$2b$12$LQv3c1yqBwEHbVy4Xz2nS.KmG9aJcYQBOhW8VQ8t9wKtW8s9dZhW2', -- password: admin123
    'admin',
    true,
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Log de inicialización
INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'system.initialization',
    'CREATE',
    'Base de datos VetPlus inicializada con usuario admin únicamente'
);

-- Configuración básica de empresa (mínima)
INSERT INTO system.configuracion_empresa (
    nombre_empresa, 
    nit, 
    direccion, 
    telefono, 
    email,
    ciudad,
    departamento
) VALUES (
    'VetPlus - Clínica Veterinaria',
    '900000000-0',
    'Por configurar',
    'Por configurar',
    'ascobidi@hotmail.com',
    'Por configurar',
    'Por configurar'
) ON CONFLICT DO NOTHING;
