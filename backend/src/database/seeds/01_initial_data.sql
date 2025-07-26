-- ===========================================
-- VETPLUS - DATOS INICIALES
-- ===========================================

-- Usuario administrador por defecto
INSERT INTO auth.usuarios (
    nombre, 
    email, 
    password_hash, 
    rol, 
    activo
) VALUES (
    'Administrador',
    'admin@vetplus.com',
    '$2b$12$LQv3c1yqBwEHbVy4Xz2nS.KmG9aJcYQBOhW8VQ8t9wKtW8s9dZhW2', -- password: admin123
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Cajas predeterminadas
INSERT INTO financial.cajas (nombre, tipo, descripcion, saldo_inicial, saldo_actual) VALUES
('Caja Menor', 'Caja Menor', 'Caja para gastos menores y efectivo', 0, 0),
('Cuenta Bancaria Principal', 'Cuenta Bancaria', 'Cuenta bancaria principal de la clínica', 0, 0),
('Caja Fuerte', 'Caja Fuerte', 'Caja fuerte para valores importantes', 0, 0)
ON CONFLICT (nombre) DO NOTHING;

-- Categorías de egresos predeterminadas
-- Nota: Las categorías se manejarán como texto libre, pero aquí algunos ejemplos comunes

-- Productos base para terapias
INSERT INTO financial.productos (
    codigo,
    nombre,
    descripcion,
    tipo,
    categoria,
    precio_venta,
    inventariable,
    sesiones_incluidas,
    duracion_sesion
) VALUES
('THER-001', 'Sesión de Fisioterapia Individual', 'Sesión individual de fisioterapia', 'Terapia Individual', 'Terapias', 50000, false, 1, 60),
('THER-PKG-001', 'Paquete de 10 Sesiones de Fisioterapia', 'Paquete de 10 sesiones de fisioterapia con descuento', 'Terapia Paquete', 'Terapias', 450000, false, 10, 60),
('CONS-001', 'Consulta Veterinaria General', 'Consulta veterinaria general', 'Servicio', 'Consultas', 80000, false, NULL, 30),
('CONS-002', 'Consulta de Control', 'Consulta de control post-tratamiento', 'Servicio', 'Consultas', 40000, false, NULL, 20)
ON CONFLICT (codigo) DO NOTHING;

-- Proveedor de ejemplo
INSERT INTO financial.proveedores (
    nombre,
    nit,
    telefono,
    email,
    direccion,
    contacto_principal,
    terminos_pago
) VALUES (
    'Distribuidora Veterinaria Global',
    '900123456-1',
    '+57 301 234 5678',
    'ventas@vetglobal.com',
    'Calle 123 #45-67, Bogotá',
    'Juan Pérez',
    30
) ON CONFLICT (nit) DO NOTHING;

-- Algunos productos de inventario de ejemplo
INSERT INTO financial.productos (
    codigo,
    nombre,
    descripcion,
    tipo,
    categoria,
    marca,
    precio_compra,
    precio_venta,
    stock_actual,
    stock_minimo,
    inventariable
) VALUES
('MED-001', 'Amoxicilina 500mg', 'Antibiótico para perros y gatos', 'Producto', 'Medicamentos', 'VetPharm', 2500, 5000, 0, 10, true),
('MED-002', 'Vitaminas B-Complex', 'Complejo vitamínico para mascotas', 'Producto', 'Vitaminas', 'NutriPet', 15000, 25000, 0, 5, true),
('ACC-001', 'Collar Isabelino Mediano', 'Collar de recuperación', 'Producto', 'Accesorios', 'PetCare', 8000, 15000, 0, 3, true),
('FOOD-001', 'Alimento Terapéutico Renal', 'Alimento especializado para problemas renales', 'Producto', 'Alimentos', 'VetDiet', 45000, 75000, 0, 2, true)
ON CONFLICT (codigo) DO NOTHING;

-- Configuración inicial del sistema
-- Esta información se podría almacenar en una tabla de configuración, pero por simplicidad
-- la incluimos como comentario para referencia:

/*
CONFIGURACIÓN INICIAL RECOMENDADA:

1. Variables de entorno a configurar:
   - DB_PASSWORD: Contraseña de PostgreSQL
   - JWT_SECRET: Cambiar por una clave segura
   - SMTP_USER y SMTP_PASS: Para envío de emails
   - CLINIC_NAME, CLINIC_ADDRESS, etc.: Datos de la clínica

2. Usuarios adicionales:
   - Crear usuarios veterinarios y auxiliares según necesidad
   
3. Configuración de Google Calendar:
   - Configurar API keys para integración con calendario

4. Configuración de WhatsApp:
   - Configurar Baileys para notificaciones
*/

-- Log de inicialización
INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'system.initialization',
    'CREATE',
    'Base de datos VetPlus inicializada con datos base'
);
