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
import {
  crearConsentimiento,
  obtenerEstadoConsentimiento,
  reenviarEnlaceConsentimiento,
  descargarPDFConsentimiento,
  revocarConsentimiento
} from '../controllers/consentimientoController.js';
import { cacheInvalidation, configCache, intelligentCaching } from '../middleware/performance.js';

const router = express.Router();

router.use(cacheInvalidation(['.*pacientes.*', '.*pets.*', '.*clients.*', '.*clientes.*']));

const pacientesReadCache = intelligentCaching({ ttl: 60 });

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
  pacientesReadCache,
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
  configCache,
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
  configCache,
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
  pacientesReadCache,
  getPacienteById
);

/**
 * @route   POST /api/clinical/pacientes/mascota
 * @desc    Crear mascota para un cliente existente
 * @access  Private (admin, vet, aux)
 */
router.post('/mascota',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  createMascotaParaCliente
);

/**
 * @route   PUT /api/clinical/pacientes/mascota/:id
 * @desc    Actualizar solo datos de una mascota
 * @access  Private (admin, vet, aux)
 */
router.put('/mascota/:id',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  validateUpdateMascota,
  updateMascota
);

/**
 * @route   PATCH /api/clinical/pacientes/mascota/:id/inactivar
 * @desc    Inactivar mascota (requiere motivo: Fallecida | Transferida | Error de registro | Otro)
 * @access  Private (admin, vet, aux)
 */
router.patch('/mascota/:id/inactivar',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  inactivarMascota
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

// ── CONSENTIMIENTO DE DATOS PERSONALES ────────────────────────────────────────

/**
 * @route   GET /api/clinical/pacientes/cliente/:idCliente/consentimiento/estado
 * @desc    Estado del consentimiento vigente del cliente
 * @access  Private (admin, vet, aux)
 */
router.get('/cliente/:idCliente/consentimiento/estado',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  (req, res, next) => { req.params.id = req.params.idCliente; next(); },
  obtenerEstadoConsentimiento
);

/**
 * @route   POST /api/clinical/pacientes/cliente/:idCliente/consentimiento
 * @desc    Crear nuevo consentimiento (genera token + QR)
 * @access  Private (admin, vet, aux)
 */
router.post('/cliente/:idCliente/consentimiento',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  (req, res, next) => { req.params.id = req.params.idCliente; next(); },
  crearConsentimiento
);

/**
 * @route   POST /api/clinical/pacientes/cliente/:idCliente/consentimiento/reenviar
 * @desc    Reenviar enlace (expira el anterior y genera uno nuevo)
 * @access  Private (admin, vet, aux)
 */
router.post('/cliente/:idCliente/consentimiento/reenviar',
  authenticateToken,
  authorize(['admin', 'vet', 'aux']),
  (req, res, next) => { req.params.id = req.params.idCliente; next(); },
  reenviarEnlaceConsentimiento
);

/**
 * @route   GET /api/clinical/pacientes/cliente/:idCliente/consentimiento/pdf
 * @desc    Descargar PDF del consentimiento firmado
 * @access  Private (admin, vet)
 */
router.get('/cliente/:idCliente/consentimiento/pdf',
  authenticateToken,
  authorize(['admin', 'vet']),
  (req, res, next) => { req.params.id = req.params.idCliente; next(); },
  descargarPDFConsentimiento
);

/**
 * @route   PUT /api/clinical/pacientes/cliente/:idCliente/consentimiento/revocar
 * @desc    Revocar el consentimiento firmado vigente de un cliente
 * @access  Private (admin, vet)
 */
router.put('/cliente/:idCliente/consentimiento/revocar',
  authenticateToken,
  authorize(['admin', 'vet']),
  (req, res, next) => { req.params.id = req.params.idCliente; next(); },
  revocarConsentimiento
);

export default router;