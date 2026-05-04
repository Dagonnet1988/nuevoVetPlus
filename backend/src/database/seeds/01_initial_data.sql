-- ===========================================
-- VETPLUS - DATOS INICIALES
-- ===========================================
-- No se crean clínicas, tenants ni usuarios admin automáticamente.
-- El superadmin se crea automáticamente desde DBInit usando las
-- variables SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD del .env.
-- Las clínicas y sus admins se crean desde el panel de superadmin.

-- Log de inicialización
INSERT INTO system.log_auditoria (
    tabla_afectada,
    tipo_accion,
    descripcion
) VALUES (
    'system.initialization',
    'CREATE',
    'Base de datos VetPlus inicializada (sin tenant ni usuario admin por defecto)'
);
