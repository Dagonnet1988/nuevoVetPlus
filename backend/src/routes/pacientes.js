import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  createPacienteCompleto,
  updatePacienteCompleto,
  getMascotasConCliente,
  getEspecies,
  getRazasByEspecie,
  getEstadisticasPacientes
} from '../controllers/pacientesController.js';
import { validateCreatePacienteCompleto, validatePacienteSearch } from '../validators/pacientesValidators.js';

const router = express.Router();

/**
 * @route   POST /api/clinical/pacientes
 * @desc    Crear paciente completo (cliente + mascota)
 * @access  Private (admin, vet, aux)
 */
router.post('/',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  validateCreatePacienteCompleto,
  createPacienteCompleto
);

/**
 * @route   PUT /api/clinical/pacientes/:id
 * @desc    Actualizar paciente completo (cliente + mascota)
 * @access  Private (admin, vet, aux)
 */
router.put('/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  validateCreatePacienteCompleto,
  updatePacienteCompleto
);

/**
 * @route   GET /api/clinical/pacientes
 * @desc    Obtener lista de pacientes (mascotas con datos del cliente)
 * @access  Private (admin, vet, aux)
 */
router.get('/',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  validatePacienteSearch,
  getMascotasConCliente
);

/**
 * @route   GET /api/clinical/pacientes/stats
 * @desc    Obtener estadísticas de pacientes
 * @access  Private (admin, vet, aux)
 */
router.get('/stats',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getEstadisticasPacientes
);

/**
 * @route   GET /api/clinical/especies
 * @desc    Obtener lista de especies disponibles
 * @access  Private (admin, vet, aux)
 */
router.get('/especies',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getEspecies
);

/**
 * @route   GET /api/clinical/especies/:especie/razas
 * @desc    Obtener razas por especie
 * @access  Private (admin, vet, aux)
 */
router.get('/especies/:especie/razas',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getRazasByEspecie
);

export default router;