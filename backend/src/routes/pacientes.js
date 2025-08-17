import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  createPacienteCompleto,
  updatePacienteCompleto,
  updateMascota,
  getPacienteById,
  getMascotasConCliente,
  getEstadisticasPacientes,
  getEspecies,
  getRazasByEspecie,
  uploadFotoPaciente,
  eliminarFotoPaciente,
  getFotoPaciente
} from '../controllers/pacientesController.js';
import { validateCreatePacienteCompleto, validatePacienteSearch } from '../validators/pacientesValidators.js';
import { uploadPacienteFoto, handleUploadError } from '../middleware/uploadMiddleware.js';

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
 * @route   GET /api/clinical/pacientes/especies
 * @desc    Obtener lista de especies disponibles
 * @access  Private (admin, vet, aux)
 */
router.get('/especies',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getEspecies
);

/**
 * @route   GET /api/clinical/pacientes/especies/:especie/razas
 * @desc    Obtener razas por especie
 * @access  Private (admin, vet, aux)
 */
router.get('/especies/:especie/razas',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getRazasByEspecie
);

/**
 * @route   GET /api/clinical/pacientes/:id
 * @desc    Obtener paciente por ID (mascota con datos del cliente)
 * @access  Private (admin, vet, aux)
 */
router.get('/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getPacienteById
);

/**
 * @route   PUT /api/clinical/pacientes/mascota/:id
 * @desc    Actualizar solo datos de una mascota
 * @access  Private (admin, vet, aux)
 */
router.put('/mascota/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  updateMascota
);

/**
 * @route   POST /api/clinical/pacientes/:id/foto
 * @desc    Subir foto de paciente
 * @access  Private (admin, vet, aux)
 */
router.post('/:id/foto',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  uploadPacienteFoto,
  uploadFotoPaciente
);

/**
 * @route   GET /api/clinical/pacientes/:id/foto
 * @desc    Obtener foto de paciente
 * @access  Private (admin, vet, aux)
 */
router.get('/:id/foto',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  getFotoPaciente
);

/**
 * @route   DELETE /api/clinical/pacientes/:id/foto
 * @desc    Eliminar foto de paciente y restaurar imagen por defecto
 * @access  Private (admin, vet, aux)
 */
router.delete('/:id/foto',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  eliminarFotoPaciente
);

export default router;