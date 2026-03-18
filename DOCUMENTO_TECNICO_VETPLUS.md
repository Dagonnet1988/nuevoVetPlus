# Documentación Técnica - Sistema VetPlus

## Arquitectura General

### Backend
- Node.js v16 + Express
- PostgreSQL 14
- Autenticación JWT
- 6 Módulos principales (auth, clinical, financial, etc.)
- Arquitectura por capas (controllers, services, models/routes)

### Frontend
- Angular 16
- RxJS para manejo de estado
- Interceptores para JWT
- 5 Módulos funcionales
- Consumo de endpoints REST

## Flujo de Datos
1. Frontend → HTTP Interceptor (+JWT) → API REST
2. Backend → Middlewares → Controllers → Services → DB
3. DB → Services → Controllers → Frontend

## API Documentation [/api]
### Auth
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| /login | POST | Autenticación |
| /logout | POST | Cierre sesión |

### Clinical
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| /pacientes | GET | Listado |
| /pacientes | POST | Creación |
| /citas | GET | Listado |
| /citas | POST | Nueva cita |

## Modelos DB Principales
| Tabla | Campos clave | Relaciones |
|-------|-------------|------------|
| usuario | id, email, rol | -
| cliente | id, cédula | mascotas
| mascota | id, cliente_id | cliente, consultas
| consulta | id, mascota_id | mascota, veterinario
| producto | id, código | facturas
| factura | id, cliente_id | cliente, lineas_factura

## Mantenimiento Documental
Este documento será actualizado automáticamente tras:
1. Cambios en endpoints
2. Nuevos módulos
3. Modificaciones en modelos DB

Última actualización: 2026-03-13 21:42
