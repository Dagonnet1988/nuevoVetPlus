/**
 * Configuración de Producción para VetPlus Backend
 * Sistema production-ready con todas las optimizaciones
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno según el ambiente
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const productionConfig = {
    // Configuración general
    app: {
        name: process.env.APP_NAME || 'VetPlus',
        version: process.env.APP_VERSION || '1.0.0',
        port: parseInt(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
        timezone: process.env.TIMEZONE || 'America/Bogota',
        locale: process.env.DEFAULT_LOCALE || 'es-CO'
    },

    // Base de datos optimizada
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'vetplus',
        username: process.env.DB_USER || 'vetplus_user',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true',
        pool: {
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            max: parseInt(process.env.DB_POOL_MAX) || 20,
            acquire: 30000,
            idle: 10000,
            evict: 1000
        },
        logging: process.env.ENABLE_SQL_LOGGING === 'true' ? console.log : false,
        benchmark: process.env.NODE_ENV === 'development'
    },

    // JWT optimizado
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256',
        issuer: 'vetplus-api',
        audience: 'vetplus-clients'
    },

    // Seguridad avanzada
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        sessionSecret: process.env.SESSION_SECRET,
        corsOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
        rateLimiting: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
            skipSuccessfulRequests: false,
            skipFailedRequests: false
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false
        }
    },

    // Performance optimizado
    performance: {
        cache: {
            ttl: parseInt(process.env.CACHE_TTL) || 300,
            maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
            checkPeriod: 60
        },
        compression: {
            enabled: process.env.ENABLE_COMPRESSION !== 'false',
            level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
            threshold: 1024
        },
        redis: {
            url: process.env.REDIS_URL,
            enabled: !!process.env.REDIS_URL
        }
    },

    // Logging avanzado
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: {
            enabled: process.env.NODE_ENV === 'production',
            path: process.env.LOG_FILE_PATH || './logs/vetplus.log',
            maxSize: process.env.LOG_MAX_SIZE || '10m',
            maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
            datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
        },
        console: {
            enabled: process.env.NODE_ENV !== 'production',
            colorize: process.env.NODE_ENV === 'development'
        },
        requests: process.env.ENABLE_REQUEST_LOGGING !== 'false',
        verbose: process.env.VERBOSE_LOGGING === 'true'
    },

    // Monitoring y health checks
    monitoring: {
        enabled: process.env.ENABLE_METRICS !== 'false',
        metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
        healthEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9090,
        alerts: {
            enabled: process.env.ENABLE_ALERTS === 'true',
            email: process.env.ALERT_EMAIL,
            slack: process.env.SLACK_WEBHOOK_URL,
            discord: process.env.DISCORD_WEBHOOK_URL
        }
    },

    // Archivos y uploads
    uploads: {
        path: process.env.UPLOAD_PATH || './uploads',
        maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
        ]
    },

    // Email
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        from: process.env.EMAIL_FROM || 'Ramelo <noreply@ramelo.app>'
    },

    // Google Calendar
    googleCalendar: {
        enabled: process.env.ENABLE_GOOGLE_CALENDAR !== 'false',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
    },

    // Features flags
    features: {
        googleCalendar: process.env.ENABLE_GOOGLE_CALENDAR !== 'false',
        audit: process.env.ENABLE_AUDIT !== 'false',
        advancedAnalytics: process.env.ENABLE_ADVANCED_ANALYTICS !== 'false',
        mobileAppApi: process.env.ENABLE_MOBILE_APP_API !== 'false'
    },

    // Límites del sistema
    limits: {
        maxClientsPerClinic: parseInt(process.env.MAX_CLIENTS_PER_CLINIC) || 10000,
        maxPetsPerClient: parseInt(process.env.MAX_PETS_PER_CLIENT) || 50,
        maxAppointmentsPerDay: parseInt(process.env.MAX_APPOINTMENTS_PER_DAY) || 200
    },

    // Información de la clínica
    clinic: {
        name: process.env.CLINIC_NAME || 'Mi Clínica Veterinaria',
        address: process.env.CLINIC_ADDRESS,
        phone: process.env.CLINIC_PHONE,
        email: process.env.CLINIC_EMAIL,
        website: process.env.CLINIC_WEBSITE
    },

    // SSL/TLS
    ssl: {
        enabled: process.env.SSL_ENABLED === 'true',
        cert: process.env.SSL_CERT_PATH,
        key: process.env.SSL_KEY_PATH,
        ca: process.env.SSL_CA_PATH
    },

    // Backup
    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
        s3: {
            bucket: process.env.BACKUP_S3_BUCKET,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        }
    },

    // APIs externas
    external: {
        googleMaps: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY
        },
        sendgrid: {
            apiKey: process.env.SENDGRID_API_KEY
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        }
    }
};

// Validar configuración crítica
export const validateConfig = () => {
    const requiredVars = [
        'JWT_SECRET',
        'DB_PASSWORD'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
    }

    // Validar longitud mínima del JWT secret
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
    }

    console.log('✅ Configuración validada correctamente');
};

// Configuración por ambiente
export const getConfigByEnvironment = () => {
    const env = process.env.NODE_ENV || 'development';
    
    const envConfigs = {
        development: {
            database: {
                logging: console.log,
                benchmark: true
            },
            security: {
                rateLimiting: {
                    maxRequests: 10000 // más permisivo en desarrollo
                }
            },
            logging: {
                level: 'debug',
                console: { enabled: true, colorize: true },
                requests: true,
                verbose: true
            }
        },
        
        test: {
            database: {
                logging: false,
                benchmark: false
            },
            security: {
                rateLimiting: {
                    maxRequests: 1000000 // sin límites en tests
                }
            },
            logging: {
                level: 'error',
                console: { enabled: false },
                requests: false,
                verbose: false
            }
        },
        
        production: {
            database: {
                logging: false,
                benchmark: false
            },
            security: {
                rateLimiting: {
                    maxRequests: 1000 // estricto en producción
                }
            },
            logging: {
                level: 'info',
                file: { enabled: true },
                console: { enabled: false },
                requests: true,
                verbose: false
            }
        }
    };

    // Combinar configuración base con la específica del ambiente
    const envConfig = envConfigs[env] || {};
    return mergeDeep(productionConfig, envConfig);
};

// Función auxiliar para merge profundo
const mergeDeep = (target, source) => {
    const output = Object.assign({}, target);
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    
    return output;
};

const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

export default productionConfig;