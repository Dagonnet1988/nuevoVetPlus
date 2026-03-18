import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    createConsultation,
    createConsultationFromAppointment,
    getConsultations,
    getConsultationById,
    getConsultationByAppointmentId,
    getConsultationsByPet,
    updateConsultation,
    getConsultationStats
} from '../controllers/consultationController.js';
import {
    validateCreateConsultation,
    validateUpdateConsultation,
    validateConsultationId,
    validatePetId,
    validateConsultationFilters
} from '../validators/consultationValidators.js';

const router = express.Router();

// ✅ RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
router.use(authenticateToken);

// ✅ CREAR CONSULTA CLÍNICA
// POST /api/clinical/consultations
router.post('/',
    authorize(['admin', 'vet']), // Solo admin y veterinarios
    validateCreateConsultation,
    validateRequest,
    createConsultation
);

// ✅ LISTAR CONSULTAS CON FILTROS Y PAGINACIÓN
// GET /api/clinical/consultations?limit=10&offset=0&estado=Completada&veterinario=uuid&mascota=uuid&fecha_desde=2024-01-01&fecha_hasta=2024-12-31
router.get('/',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']), // Todos los roles pueden consultar
    validateConsultationFilters,
    validateRequest,
    getConsultations
);

// ✅ OBTENER ESTADÍSTICAS DE CONSULTAS
// GET /api/clinical/consultations/stats
router.get('/stats',
    authorize(['admin', 'vet']), // Solo admin y veterinarios
    getConsultationStats
);

// ✅ CREAR CONSULTA CLÍNICA DESDE UNA CITA
// POST /api/clinical/consultations/from-appointment/:id_cita
router.post('/from-appointment/:id_cita',
    authorize(['admin', 'vet']), // Solo admin y veterinarios pueden iniciar consultas
    createConsultationFromAppointment
);

// ✅ OBTENER CONSULTA CLÍNICA POR ID DE CITA
// GET /api/clinical/consultations/by-appointment/:id_cita
router.get('/by-appointment/:id_cita',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    getConsultationByAppointmentId
);

// ✅ OBTENER CONSULTA POR ID
// GET /api/clinical/consultations/:id
router.get('/:id',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    validateConsultationId,
    validateRequest,
    getConsultationById
);

// ✅ OBTENER CONSULTAS POR MASCOTA (HISTORIAL CLÍNICO)
// GET /api/clinical/consultations/pet/:id
router.get('/pet/:id',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    validatePetId,
    validateRequest,
    getConsultationsByPet
);

// ✅ OBTENER HISTORIAL CLÍNICO COMPLETO DE UNA MASCOTA
// GET /api/clinical/consultations/pet/:id/history
router.get('/pet/:id/history',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    validatePetId,
    validateRequest,
    getConsultationsByPet // Usa la misma función que el endpoint anterior
);

// ✅ ALIAS PARA COMPATIBILIDAD - HISTORIAL CLÍNICO POR PACIENTE
// GET /api/clinical/consultations/paciente/:id/history
router.get('/paciente/:id/history',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    validatePetId,
    validateRequest,
    getConsultationsByPet // Usa la misma función que el endpoint anterior
);

// ✅ ACTUALIZAR CONSULTA CLÍNICA
// PUT /api/clinical/consultations/:id
router.put('/:id',
    authorize(['admin', 'vet']), // Solo admin y veterinarios pueden actualizar
    validateUpdateConsultation,
    validateRequest,
    updateConsultation
);

export default router;
