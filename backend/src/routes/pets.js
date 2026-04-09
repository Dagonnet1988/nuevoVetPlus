import express from 'express';
import {
    createPet,
    getPets,
    getPetById,
    getPetsByClient,
    updatePet,
    deletePet,
    getPetStats
} from '../controllers/petController.js';

import {
    validateCreatePet,
    validateUpdatePet,
    validatePetId,
    validateClientId,
    validatePetSearch
} from '../validators/petValidators.js';

import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// 🔒 Todas las rutas requieren autenticación
router.use(authenticateToken);

// ✅ CREAR MASCOTA
// POST /api/clinical/pets
router.post('/',
    authorize(['admin', 'vet', 'aux']),
    validateCreatePet,
    validateRequest,
    createPet
);

// ✅ OBTENER TODAS LAS MASCOTAS (con filtros y paginación)
// GET /api/clinical/pets?limit=20&offset=0&especie=Perro&cliente=uuid
router.get('/',
    authorize(['admin', 'vet', 'aux']),
    validatePetSearch,
    validateRequest,
    getPets
);

// ✅ OBTENER ESTADÍSTICAS DE MASCOTAS
// GET /api/clinical/pets/stats
router.get('/stats',
    authorize(['admin', 'vet']),
    getPetStats
);

// ✅ OBTENER MASCOTAS POR CLIENTE
// GET /api/clinical/pets/client/:id
router.get('/client/:id',
    authorize(['admin', 'vet', 'aux']),
    validateClientId,
    validateRequest,
    getPetsByClient
);

// ✅ OBTENER MASCOTA POR ID
// GET /api/clinical/pets/:id
router.get('/:id',
    authorize(['admin', 'vet', 'aux']),
    validatePetId,
    validateRequest,
    getPetById
);

// ✅ ACTUALIZAR MASCOTA
// PUT /api/clinical/pets/:id
router.put('/:id',
    authorize(['admin', 'vet', 'aux']),
    validateUpdatePet,
    validateRequest,
    updatePet
);

// ✅ ELIMINAR MASCOTA (SOFT DELETE)
// DELETE /api/clinical/pets/:id
router.delete('/:id',
    authorize(['admin', 'vet']), // Solo admin y vet pueden eliminar
    validatePetId,
    validateRequest,
    deletePet
);

export default router;
