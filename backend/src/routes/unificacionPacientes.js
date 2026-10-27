import express from 'express';
import { authorize } from '../middleware/auth.js';
import {
    previewUnificacion,
    ejecutarUnificacion,
    listarUnificaciones
} from '../controllers/unificacionPacientesController.js';

const router = express.Router();

// Nota: authenticateToken y tenantContext ya están aplicados en clinical.js
router.use(authorize(['admin', 'vet']));

router.get('/', listarUnificaciones);
router.post('/preview', previewUnificacion);
router.post('/', ejecutarUnificacion);

export default router;
