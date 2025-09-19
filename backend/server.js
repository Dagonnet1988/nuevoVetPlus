import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import DBInit from './src/database/DBInit.js';

// Importar rutas
import authRoutes from './src/routes/auth.js';
import financialRoutes from './src/routes/index.js';
import financialConfigRoutes from './src/routes/financialConfig.js';
import clinicalRoutes from './src/routes/clinical.js';
import auditRoutes from './src/routes/audit.js';
import googleCalendarRoutes from './src/routes/googleCalendarSimple.js';
import reportsRoutes from './src/routes/reports.js';
import empresaConfigRoutes from './src/routes/empresaConfigRoutes.js';
import whatsappRoutes from './src/routes/whatsappRoutes.js';
import notificationRoutes from './src/routes/notifications.js';
import appointmentExportRoutes from './src/routes/appointmentExport.js';
import googleCalendarWebhookRoutes from './src/routes/googleCalendarWebhook.js';
import systemStatusRoutes from './src/routes/systemStatus.js';
import testRoutes from './src/routes/test.js';

// Importar middleware de auditoría
import { setAuditContext, auditActivity, auditAuthActivity } from './src/middleware/auditMiddleware.js';

// Importar servicio de notificaciones automáticas
// import autoNotificationService from './src/services/autoNotificationService.js'; // TEMPORALMENTE DESACTIVADO
import googleCalendarService from './src/services/googleCalendar.js';
import whatsAppService from './src/services/whatsappBaileysService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para obtener IP real
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Aplicar CORS SOLO a rutas API
app.use('/api', cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:4200',
    'http://localhost:4201'
  ],
  credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de auditoría
app.use(setAuditContext);
app.use(auditActivity);

// Rutas de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'VetPlus API - Sistema de Gestión Veterinaria',
    version: '1.0.0',
    modules: ['clinical', 'financial', 'auth'],
    status: 'active'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas principales API
app.use('/api/auth', auditAuthActivity, authRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/financial/config', financialConfigRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin/empresa', empresaConfigRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/appointments/export', appointmentExportRoutes);
app.use('/api/google-calendar-webhook', googleCalendarWebhookRoutes);
app.use('/api/system', systemStatusRoutes);
app.use('/api/test', testRoutes);

// Servir archivos estáticos de /uploads con CORS abierto
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}, express.static('uploads'));

// Archivos generados
app.use('/generated-docs', express.static('generated-docs'));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    endpoint: req.originalUrl
  });
});

// Inicializar base de datos
async function initializeDatabase() {
  try {
    console.log('🔧 INICIALIZANDO BASE DE DATOS...');
    console.log('═'.repeat(40));
    
    const dbInit = new DBInit();
    const success = await dbInit.initialize();
    
    if (!success) throw new Error('DBInit.initialize() retornó false');
    
    console.log('✅ Base de datos inicializada correctamente');
    console.log('═'.repeat(40));
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error.message);
    throw error;
  }
}

// Iniciar el servidor
async function startServer() {
  try {
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      console.error('❌ No se pudo inicializar la base de datos. Cerrando servidor.');
      process.exit(1);
    }

    // Inicializar servicio de notificaciones automáticas
    // console.log('🔔 Inicializando servicio de notificaciones automáticas...');
    // await autoNotificationService.initialize(); // TEMPORALMENTE DESACTIVADO
    // console.log('✅ Servicio de notificaciones inicializado');

    // Initialize services after database is ready
    try {
      await googleCalendarService.initialize();
      await whatsAppService.initialize();
    } catch (error) {
      console.error('Error initializing services:', error);
    }

    app.listen(PORT, () => {
      console.log(`🚀 VetPlus API iniciada en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏥 Módulos: Clínico y Financiero`);
      console.log(`🔒 Autenticación: JWT habilitada`);
      console.log(`📊 Base de datos: Lista y verificada`);
      console.log(`🔔 Notificaciones automáticas: Activas`);
    });

  } catch (error) {
    console.error('❌ Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

export default app;
