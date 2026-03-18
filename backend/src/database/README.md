# 🗄️ Sistema de Base de Datos VetPlus

## Arquitectura de Base de Datos

VetPlus utiliza **PostgreSQL** con un sistema de schemas consolidado que garantiza:
- ✅ **Estructura completa desde instalación**
- ✅ **Fácil configuración en nuevos entornos**
- ✅ **Sin dependencias de migraciones**
- ✅ **Organización modular por funcionalidad**

## Estructura de Esquemas

```
vetplus/
├── auth.*          # Autenticación y usuarios
├── clinical.*      # Módulo clínico (mascotas, consultas)
└── system.*        # Sistema (migraciones, logs)
```

## Comandos Disponibles

### 🔍 Verificación
```bash
npm run db:test      # Probar conexión a PostgreSQL
npm run db:check     # Verificación rápida del sistema
```

### 🚀 Inicialización
```bash
npm run db:init      # Inicializar sistema completo (recomendado)
npm run db:create    # Solo crear base de datos
npm run db:seed      # Insertar datos iniciales
```

### ⚠️ Desarrollo (CUIDADO)
```bash
npm run db:reset     # ELIMINAR toda la BD (solo desarrollo)
```

## Flujo de Trabajo

### Primera vez (Setup inicial)
```bash
# 1. Configurar variables de entorno
cp .env.example .env
# Editar .env con datos de PostgreSQL

# 2. Crear base de datos
npm run db:create

# 3. Insertar datos iniciales
npm run db:seed

# 4. Verificar estado
npm run db:status
```

### Desarrollo continuo
```bash
# Ver qué migraciones faltan
npm run db:status

# Ejecutar migraciones pendientes
npm run db:migrate
```

## Sistema de Migraciones

### Archivos de Migración
1. **01_create_database.sql** - Esquemas y funciones base
2. **02_auth_tables.sql** - Usuarios y autenticación
3. **03_clinical_tables.sql** - Clientes, mascotas, consultas
4. **05_constraints_triggers.sql** - Triggers y validaciones

### Características de Seguridad
- ✅ **Transacciones** - Si algo falla, se revierte todo
- ✅ **Tracking** - Tabla `system.migrations` registra todo
- ✅ **Idempotencia** - Se puede ejecutar múltiples veces
- ✅ **Validaciones** - Constraints y checks en BD

## Esquemas Principales

### Auth (Autenticación)
- `auth.usuarios` - Usuarios del sistema (admin, vet, aux)
- `auth.sesiones` - Control de sesiones JWT
- `system.log_auditoria` - Auditoría de todas las acciones

### Clinical (Módulo Clínico)
- `clinical.clientes` - Propietarios de mascotas
- `clinical.mascotas` - Registro de mascotas
- `clinical.consultas_clinicas` - Historial médico
- `clinical.calendario_citas` - Agenda integrada

## Configuración de Base de Datos

### Variables de Entorno (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetplus
DB_USER=postgres
DB_PASSWORD=tu_password
```

### Requisitos
- PostgreSQL 12+ instalado
- Usuario con permisos de creación de BD
- Extensiones: uuid-ossp, pgcrypto

## Datos Iniciales

Después de ejecutar `npm run db:seed`:
- ✅ Usuario admin por defecto (admin@vetplus.com / admin123)
- ✅ Configuración de empresa básica

## Backup y Restauración

### Backup manual
```bash
pg_dump vetplus > backup_vetplus_$(date +%Y%m%d).sql
```

### Restauración
```bash
psql vetplus < backup_vetplus_20240721.sql
```

## Troubleshooting

### Error: "role postgres does not exist"
```bash
# Crear usuario postgres
createuser --superuser postgres
```

### Error: "database vetplus does not exist"
```bash
# Crear base de datos manualmente
createdb vetplus
```

### Error de conexión
1. Verificar que PostgreSQL esté ejecutándose
2. Revisar variables de entorno en `.env`
3. Verificar permisos de usuario
