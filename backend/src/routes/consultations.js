import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    createConsultation,
    getConsultations,
    getConsultationById,
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
    authorize(['admin', 'vet', 'aux']), // Todos los roles pueden consultar
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

// ✅ OBTENER CONSULTA POR ID
// GET /api/clinical/consultations/:id
router.get('/:id',
    authorize(['admin', 'vet', 'aux']),
    validateConsultationId,
    validateRequest,
    getConsultationById
);

// ✅ OBTENER CONSULTAS POR MASCOTA (HISTORIAL CLÍNICO)
// GET /api/clinical/consultations/pet/:id
router.get('/pet/:id',
    authorize(['admin', 'vet', 'aux']),
    validatePetId,
    validateRequest,
    getConsultationsByPet
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
