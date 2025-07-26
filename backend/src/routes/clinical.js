import express from 'express';
import clientRoutes from './clients.js';
import petRoutes from './pets.js';
import consultationRoutes from './consultations.js';
import appointmentRoutes from './appointments.js';

const router = express.Router();

// Ruta de prueba para el módulo clínico
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas del módulo clínico funcionando correctamente',
    timestamp: new Date().toISOString(),
    module: 'clinical',
    endpoints: ['clients', 'pets', 'consultations', 'appointments']
  });
});

// Montar las rutas de clientes
router.use('/clients', clientRoutes);

// Montar las rutas de mascotas
router.use('/pets', petRoutes);

// Montar las rutas de consultas clínicas
router.use('/consultations', consultationRoutes);

// Montar las rutas de citas
router.use('/appointments', appointmentRoutes);

export default router;
