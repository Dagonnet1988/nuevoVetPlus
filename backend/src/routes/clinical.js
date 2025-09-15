import express from 'express';
import clientRoutes from './clients.js';
import petRoutes from './pets.js';
import pacientesRoutes from './pacientes.js';
import consultationRoutes from './consultations.js';
import appointmentRoutes from './appointments.js';
import { getEspecies, getRazasByEspecie } from '../controllers/pacientesController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Ruta de prueba para el módulo clínico
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas del módulo clínico funcionando correctamente',
    timestamp: new Date().toISOString(),
    module: 'clinical',
    endpoints: ['clients', 'pets', 'pacientes', 'consultations', 'appointments']
  });
});

// Montar las rutas de clientes
router.use('/clients', clientRoutes);
router.use('/clientes', clientRoutes); // Alias en español

// Montar las rutas de mascotas
router.use('/pets', petRoutes);

// Montar las rutas de pacientes (combinadas)
router.use('/pacientes', pacientesRoutes);

// Las rutas de especies están ahora en /pacientes/especies

// Ruta directa para obtener veterinarios
router.get('/veterinarians',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  async (req, res) => {
    try {
      const { query } = await import('../config/database.js');
      const result = await query(`
        SELECT 
          id_usuario as id,
          nombre,
          email,
          'Medicina Veterinaria' as especialidad
        FROM auth.usuarios 
        WHERE rol = 'vet' 
        AND activo = true
        ORDER BY nombre ASC
      `);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo veterinarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Montar las rutas de consultas clínicas
router.use('/consultations', consultationRoutes);

// Montar las rutas de citas
router.use('/appointments', appointmentRoutes);

export default router;
