import express from 'express';
import { authorize } from '../middleware/auth.js';
import {
    listEventos,
    listUsuariosParaCompartir,
    createEvento,
    updateEvento,
    deleteEvento
} from '../controllers/eventosCalendarioController.js';

const router = express.Router();

// Nota: authenticateToken y tenantContext ya están aplicados en clinical.js
router.use(authorize(['admin', 'vet', 'aux']));

router.get('/usuarios', listUsuariosParaCompartir);
router.get('/', listEventos);
router.post('/', createEvento);
router.put('/:id', updateEvento);
router.delete('/:id', deleteEvento);

export default router;
