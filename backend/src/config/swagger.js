import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Configuración de Swagger para Documentación API
 * Sistema completo de documentación para VetPlus API
 */

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VetPlus API',
            version: '1.0.0',
            description: `
                Sistema de Gestión Veterinaria VetPlus - API REST Completa
                
                ## Características Principales
                - 🔐 Autenticación JWT con roles diferenciados
                - 🏥 Gestión clínica completa (clientes, mascotas, consultas, citas)
                - 💰 Sistema financiero integrado (facturación, inventario, cajas)
                - 🏭 Gestión de proveedores y órdenes de compra
                - 📅 Integración con Google Calendar
                - 📊 Reportes y analytics avanzados
                - 🔍 Sistema de auditoría completo
                - 🛡️ Rate limiting y validaciones exhaustivas
                - 📈 Monitoring y health checks
                
                ## Autenticación
                La API utiliza tokens JWT. Incluye el token en el header Authorization:
                \`Authorization: Bearer <tu_token>\`
                
                ## Roles de Usuario
                - **admin**: Acceso completo al sistema
                - **vet**: Acceso a módulos clínicos y reportes
                - **auxiliar**: Acceso limitado a operaciones básicas
                
                ## Rate Limiting
                - Límites diferenciados por rol y endpoint
                - Headers informativos en cada respuesta
                - Límites específicos para operaciones críticas
                
                ## Códigos de Respuesta
                - **200**: Operación exitosa
                - **201**: Recurso creado exitosamente
                - **400**: Error en datos de entrada
                - **401**: No autenticado
                - **403**: Sin permisos
                - **404**: Recurso no encontrado
                - **429**: Rate limit excedido
                - **500**: Error interno del servidor
            `,
            contact: {
                name: 'Equipo VetPlus',
                email: 'soporte@vetplus.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Servidor de Desarrollo'
            },
            {
                url: 'https://api.vetplus.com/api',
                description: 'Servidor de Producción'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtenido del endpoint de login'
                }
            },
            schemas: {
                // Schemas base
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Mensaje de error descriptivo'
                        },
                        code: {
                            type: 'string',
                            example: 'ERROR_CODE'
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' },
                                    value: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operación completada exitosamente'
                        },
                        data: {
                            type: 'object',
                            description: 'Datos de respuesta específicos del endpoint'
                        }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'array',
                            items: { type: 'object' }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 10 },
                                total: { type: 'integer', example: 100 },
                                totalPages: { type: 'integer', example: 10 }
                            }
                        }
                    }
                },
                
                // Schemas de autenticación
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'admin@vetplus.com'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            example: 'Admin123!'
                        }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Login exitoso' },
                        data: {
                            type: 'object',
                            properties: {
                                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string', format: 'uuid' },
                                        nombre: { type: 'string', example: 'Juan Pérez' },
                                        email: { type: 'string', example: 'admin@vetplus.com' },
                                        rol: { type: 'string', enum: ['admin', 'vet', 'auxiliar'] }
                                    }
                                }
                            }
                        }
                    }
                },
                
                // Schemas clínicos
                Cliente: {
                    type: 'object',
                    properties: {
                        id_cliente: { type: 'string', format: 'uuid' },
                        nombre: { type: 'string', example: 'María García' },
                        email: { type: 'string', format: 'email' },
                        telefono: { type: 'string', example: '573001234567' },
                        direccion: { type: 'string', example: 'Calle 123 #45-67' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                Mascota: {
                    type: 'object',
                    properties: {
                        id_mascota: { type: 'string', format: 'uuid' },
                        nombre: { type: 'string', example: 'Rex' },
                        especie: { type: 'string', example: 'Perro' },
                        raza: { type: 'string', example: 'Golden Retriever' },
                        fecha_nacimiento: { type: 'string', format: 'date' },
                        sexo: { type: 'string', enum: ['M', 'F'] },
                        peso: { type: 'number', format: 'float', example: 25.5 },
                        color: { type: 'string', example: 'Dorado' },
                        id_cliente: { type: 'string', format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                
                // Schemas financieros
                Producto: {
                    type: 'object',
                    properties: {
                        id_producto: { type: 'string', format: 'uuid' },
                        nombre: { type: 'string', example: 'Vacuna Antirrábica' },
                        categoria: { type: 'string', example: 'Medicamentos' },
                        codigo_barras: { type: 'string', example: '7891234567890' },
                        precio_venta: { type: 'number', format: 'float', example: 45000 },
                        stock_actual: { type: 'integer', example: 15 },
                        stock_minimo: { type: 'integer', example: 5 },
                        activo: { type: 'boolean', example: true }
                    }
                },
                Factura: {
                    type: 'object',
                    properties: {
                        id_factura: { type: 'string', format: 'uuid' },
                        numero_factura: { type: 'string', example: 'F-2024-001' },
                        id_cliente: { type: 'string', format: 'uuid' },
                        subtotal: { type: 'number', format: 'float', example: 100000 },
                        impuestos: { type: 'number', format: 'float', example: 19000 },
                        total: { type: 'number', format: 'float', example: 119000 },
                        estado: { type: 'string', enum: ['pendiente', 'pagada', 'cancelada'] },
                        fecha: { type: 'string', format: 'date-time' }
                    }
                },
                
                // Schemas de reportes
                DashboardStats: {
                    type: 'object',
                    properties: {
                        ventas: {
                            type: 'object',
                            properties: {
                                total_facturas: { type: 'integer', example: 45 },
                                total_ventas: { type: 'number', format: 'float', example: 2500000 },
                                promedio_venta: { type: 'number', format: 'float', example: 55555.56 }
                            }
                        },
                        clientes: {
                            type: 'object',
                            properties: {
                                total_clientes: { type: 'integer', example: 150 },
                                nuevos_clientes: { type: 'integer', example: 12 }
                            }
                        },
                        inventario: {
                            type: 'object',
                            properties: {
                                productos_bajo_stock: { type: 'integer', example: 5 },
                                productos_agotados: { type: 'integer', example: 2 }
                            }
                        },
                        citas: {
                            type: 'object',
                            properties: {
                                total_citas: { type: 'integer', example: 78 },
                                citas_completadas: { type: 'integer', example: 65 },
                                tasa_cumplimiento: { type: 'number', format: 'float', example: 83.33 }
                            }
                        }
                    }
                },
                
                // Schemas de health checks
                HealthCheck: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string', example: '1.0.0' },
                        uptime: { type: 'integer', example: 3600 },
                        environment: { type: 'string', example: 'production' },
                        checks: {
                            type: 'object',
                            properties: {
                                database: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        responseTime: { type: 'number' },
                                        message: { type: 'string' }
                                    }
                                },
                                memory: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        usage: { type: 'string' },
                                        percentage: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            parameters: {
                PageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Número de página para paginación',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    }
                },
                LimitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Número de elementos por página',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    }
                },
                SortByParam: {
                    name: 'sortBy',
                    in: 'query',
                    description: 'Campo por el cual ordenar',
                    required: false,
                    schema: {
                        type: 'string'
                    }
                },
                SortOrderParam: {
                    name: 'sortOrder',
                    in: 'query',
                    description: 'Orden de clasificación',
                    required: false,
                    schema: {
                        type: 'string',
                        enum: ['asc', 'desc'],
                        default: 'asc'
                    }
                }
            },
            responses: {
                Unauthorized: {
                    description: 'Token de autenticación requerido o inválido',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'Token de autenticación requerido',
                                code: 'UNAUTHORIZED'
                            }
                        }
                    }
                },
                Forbidden: {
                    description: 'Sin permisos para acceder a este recurso',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'No tienes permisos para acceder a este recurso',
                                code: 'FORBIDDEN'
                            }
                        }
                    }
                },
                NotFound: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'Recurso no encontrado',
                                code: 'NOT_FOUND'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Error de validación en los datos de entrada',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'Errores de validación en los datos enviados',
                                code: 'VALIDATION_ERROR',
                                errors: [
                                    {
                                        field: 'email',
                                        message: 'Email debe ser válido',
                                        value: 'email_invalido'
                                    }
                                ]
                            }
                        }
                    }
                },
                RateLimitExceeded: {
                    description: 'Límite de rate limiting excedido',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
                                code: 'RATE_LIMIT_EXCEEDED'
                            }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Error interno del servidor',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: {
                                success: false,
                                message: 'Error interno del servidor',
                                code: 'INTERNAL_ERROR'
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            {
                name: 'Autenticación',
                description: 'Endpoints de autenticación y gestión de usuarios'
            },
            {
                name: 'Clientes',
                description: 'Gestión de clientes de la clínica veterinaria'
            },
            {
                name: 'Mascotas',
                description: 'Gestión de mascotas y su información médica'
            },
            {
                name: 'Consultas',
                description: 'Consultas médicas e historia clínica'
            },
            {
                name: 'Citas',
                description: 'Sistema de citas y calendario'
            },
            {
                name: 'Productos',
                description: 'Gestión de inventario y productos'
            },
            {
                name: 'Facturación',
                description: 'Sistema de facturación y ventas'
            },
            {
                name: 'Cajas',
                description: 'Control de ingresos y egresos'
            },
            {
                name: 'Proveedores',
                description: 'Gestión de proveedores y órdenes de compra'
            },
            {
                name: 'Google Calendar',
                description: 'Integración con Google Calendar'
            },
            {
                name: 'Reportes',
                description: 'Reportes y analytics del sistema'
            },
            {
                name: 'Auditoría',
                description: 'Sistema de auditoría y logs'
            },
            {
                name: 'Sistema',
                description: 'Health checks y monitoring del sistema'
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js',
        './src/middleware/*.js'
    ]
};

const specs = swaggerJsdoc(options);

// Configuración personalizada para Swagger UI
const swaggerUiOptions = {
    explorer: true,
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c5530 }
        .swagger-ui .info .description p { font-size: 14px; line-height: 1.6 }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px }
    `,
    customSiteTitle: 'VetPlus API Documentation',
    customfavIcon: '/favicon.ico'
};

export { specs, swaggerUi, swaggerUiOptions };