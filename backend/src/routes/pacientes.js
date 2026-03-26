import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  createPacienteCompleto,
  updatePacienteCompleto,
  updateMascota,
  createMascotaParaCliente,
  inactivarMascota,
  getPacienteById,
  getMascotasConCliente,
  getEstadisticasPacientes,
  getEspecies,
  getRazasByEspecie,
  uploadFotoPaciente,
  eliminarFotoPaciente,
  getFotoPaciente
} from '../controllers/pacientesController.js';
import { validateCreatePacienteCompleto, validatePacienteSearch, validateUpdateMascota } from '../validators/pacientesValidators.js';
import { uploadPacienteFoto, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/clinical/pacientes
 * @desc    Crear paciente completo (cliente + mascota)
 * @access  Private (admin, vet, aux)
 */
router.post('/',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
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
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
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
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
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
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  getEstadisticasPacientes
);

/**
 * @route   GET /api/clinical/pacientes/especies
 * @desc    Obtener lista de especies disponibles
 * @access  Private (admin, vet, aux)
 */
router.get('/especies',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  getEspecies
);

/**
 * @route   GET /api/clinical/pacientes/especies/:especie/razas
 * @desc    Obtener razas por especie
 * @access  Private (admin, vet, aux)
 */
router.get('/especies/:especie/razas',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  getRazasByEspecie
);

/**
 * @route   GET /api/clinical/pacientes/:id
 * @desc    Obtener paciente por ID (mascota con datos del cliente)
 * @access  Private (admin, vet, aux)
 */
router.get('/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  getPacienteById
);

/**
 * @route   POST /api/clinical/pacientes/mascota
 * @desc    Crear mascota para un cliente existente
 * @access  Private (admin, vet, aux)
 */
router.post('/mascota',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  createMascotaParaCliente
);

/**
 * @route   PUT /api/clinical/pacientes/mascota/:id
 * @desc    Actualizar solo datos de una mascota
 * @access  Private (admin, vet, aux)
 */
router.put('/mascota/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  validateUpdateMascota,
  updateMascota
);

/**
 * @route   PATCH /api/clinical/pacientes/mascota/:id/inactivar
 * @desc    Inactivar mascota (requiere motivo: Fallecida | Transferida | Error de registro | Otro)
 * @access  Private (admin, vet)
 */
router.patch('/mascota/:id/inactivar',
  authenticateToken,
  authorize(['admin', 'vet']),
  inactivarMascota
);

/**
 * @route   POST /api/clinical/pacientes/:id/foto
 * @desc    Subir foto de paciente
 * @access  Private (admin, vet, aux)
 */
router.post('/:id/foto',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
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
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  getFotoPaciente
);

/**
 * @route   DELETE /api/clinical/pacientes/:id/foto
 * @desc    Eliminar foto de paciente y restaurar imagen por defecto
 * @access  Private (admin, vet, aux)
 */
router.delete('/:id/foto',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  eliminarFotoPaciente
);

export default router;