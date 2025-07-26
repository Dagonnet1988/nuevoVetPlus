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
import googleCalendarRoutes from './src/routes/googleCalendar.js';
import reportsRoutes from './src/routes/reports.js';
import empresaConfigRoutes from './src/routes/empresaConfigRoutes.js';
// import whatsappRoutes from './src/routes/whatsappRoutes.js'; // Comentado temporalmente

// Importar middleware de auditoría
import { setAuditContext, auditActivity, auditAuthActivity } from './src/middleware/auditMiddleware.js';

// Importar scheduler de sincronización
// import syncScheduler from './src/services/syncScheduler.js'; // Comentado temporalmente

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para obtener IP real
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de auditoría (después de parsing JSON)
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

// Rutas principales
app.use('/api/auth', auditAuthActivity, authRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/financial/config', financialConfigRoutes);

// Rutas del módulo clínico  
app.use('/api/clinical', clinicalRoutes);

// Rutas de auditoría (solo admin)
app.use('/api/audit', auditRoutes);

// Rutas de Google Calendar (solo admin/vet)
app.use('/api/google-calendar', googleCalendarRoutes);

// Rutas de reportes y analytics
app.use('/api/reports', reportsRoutes);

// Rutas de configuración de empresa
app.use('/api/admin/empresa', empresaConfigRoutes);

// Rutas de WhatsApp
// app.use('/api/whatsapp', whatsappRoutes); // Comentado temporalmente

// Servir archivos estáticos (logos, PDFs generados)
app.use('/uploads', express.static('uploads'));
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

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    console.log('🔧 INICIALIZANDO BASE DE DATOS...');
    console.log('═'.repeat(40));
    
    const dbInit = new DBInit();
    const success = await dbInit.initialize();
    
    if (!success) {
      throw new Error('DBInit.initialize() retornó false');
    }
    
    console.log('✅ Base de datos inicializada correctamente');
    console.log('═'.repeat(40));
    
    // Inicializar scheduler de sincronización
    // await syncScheduler.initialize(); // Comentado temporalmente para evitar errores de WhatsApp
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error.message);
    throw error;
  }
}

// Función para iniciar el servidor
async function startServer() {
  try {
    // 1. Inicializar base de datos
    const dbReady = await initializeDatabase();
    
    if (!dbReady) {
      console.error('❌ No se pudo inicializar la base de datos. Cerrando servidor.');
      process.exit(1);
    }

    // 2. Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 VetPlus API iniciada en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏥 Módulos: Clínico y Financiero`);
      console.log(`🔒 Autenticación: JWT habilitada`);
      console.log(`📊 Base de datos: Lista y verificada`);
    });

  } catch (error) {
    console.error('❌ Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar la aplicación
startServer();

export default app;
