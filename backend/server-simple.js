/**
 * Servidor simple de VetPlus para desarrollo del frontend
 * Sin dependencias complejas de base de datos
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de autenticación mock
const mockAuth = (req, res, next) => {
  // Usuario mock para desarrollo
  req.user = {
    id: 'mock-user-id',
    email: 'admin@vetplus.com',
    nombre: 'Administrador Test',
    rol: 'admin'
  };
  next();
};

// =====================================
// RUTAS MOCK PARA DESARROLLO
// =====================================

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor simple VetPlus funcionando',
    timestamp: new Date().toISOString(),
    environment: 'development-mock'
  });
});

// Auth endpoints mock
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validación simple
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email y contraseña son requeridos'
    });
  }

  // Mock login - acepta cualquier credencial
  res.json({
    success: true,
    message: 'Login exitoso',
    token: 'mock-jwt-token-12345',
    user: {
      id_usuario: 'mock-user-id',
      email: email,
      nombre: 'Usuario Test',
      rol: email.includes('admin') ? 'admin' : 'vet',
      activo: true,
      primer_acceso: false,
      created_at: new Date().toISOString()
    }
  });
});

app.post('/api/auth/logout', mockAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

app.get('/api/auth/me', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

app.put('/api/auth/change-password', mockAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Contraseña cambiada exitosamente'
  });
});

// Dashboard endpoints mock
app.get('/api/dashboard/stats', mockAuth, (req, res) => {
  res.json({
    pacientes: {
      total: 1247,
      nuevos_mes: 34,
      activos: 892
    },
    citas: {
      hoy: 12,
      semana: 87,
      pendientes: 23
    }
  });
});

app.get('/api/dashboard/citas-estado', mockAuth, (req, res) => {
  res.json({
    labels: ['Confirmadas', 'Pendientes', 'Canceladas', 'Completadas'],
    datasets: [{
      data: [45, 23, 8, 67],
      backgroundColor: [
        '#4CAF50',
        '#FF9800',
        '#F44336',
        '#2e7d32'
      ]
    }]
  });
});

app.get('/api/dashboard/pacientes-especie', mockAuth, (req, res) => {
  res.json({
    labels: ['Perros', 'Gatos', 'Aves', 'Otros'],
    datasets: [{
      data: [65, 28, 4, 3],
      backgroundColor: [
        '#2e7d32',
        '#4CAF50',
        '#8BC34A',
        '#C8E6C9'
      ]
    }]
  });
});

app.get('/api/dashboard/actividad-reciente', mockAuth, (req, res) => {
  res.json([
    {
      id: '1',
      tipo: 'cita',
      descripcion: 'Nueva cita agendada para Max (Golden Retriever)',
      fecha: new Date().toISOString(),
      usuario: 'Dr. María García',
      icono: 'event',
      color: '#2e7d32'
    },
    {
      id: '2',
      tipo: 'paciente',
      descripcion: 'Nuevo paciente registrado: Luna (Gato Persa)',
      fecha: new Date(Date.now() - 3600000).toISOString(),
      usuario: 'Dr. Carlos Pérez',
      icono: 'pets',
      color: '#4caf50'
    }
  ]);
});

app.get('/api/dashboard/proximas-citas', mockAuth, (req, res) => {
  res.json([
    {
      id: '1',
      paciente_nombre: 'Max',
      cliente_nombre: 'Carlos Rodríguez',
      hora: '09:00',
      tipo: 'Consulta General',
      estado: 'confirmada',
      veterinario: 'Dr. García'
    },
    {
      id: '2',
      paciente_nombre: 'Luna',
      cliente_nombre: 'María López',
      hora: '10:30',
      tipo: 'Vacunación',
      estado: 'confirmada',
      veterinario: 'Dr. Pérez'
    }
  ]);
});

// Catch-all para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 ========================================');
  console.log('📋 SERVIDOR SIMPLE VETPLUS INICIADO');
  console.log('🚀 ========================================');
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS: Permitido desde http://localhost:4200`);
  console.log(`📝 Modo: Desarrollo con datos mock`);
  console.log('🚀 ========================================');
});

// Manejo de señales para cierre limpio
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  process.exit(0);
});