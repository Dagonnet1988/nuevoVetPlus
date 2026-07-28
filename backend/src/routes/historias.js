import express from 'express';
import { authorize } from '../middleware/auth.js';
import {
  createHistoria,
  getHistorias,
  getHistoriasByAppointmentId,
  getHistoriaByAppointmentId,
  getHistoriaById,
  updateHistoria,
  deleteHistoria,
  reactivateHistoria,
  getMedicamentosSugeridos,
  uploadHistoriaArchivos,
  downloadHistoriaPDF,
} from '../controllers/historiaClinicaController.js';
import { uploadHistoriaClinicaArchivos, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// GET  /api/clinical/historias          → listar con filtros + paginación
router.get('/',    authorize(['admin', 'vet', 'aux']), getHistorias);

// GET  /api/clinical/historias/medicamentos/sugerencias → medicamentos usados en fórmulas previas
router.get('/medicamentos/sugerencias', authorize(['admin', 'vet', 'aux']), getMedicamentosSugeridos);

// POST /api/clinical/historias          → crear nueva historia
// 'aux' puede llegar acá, pero createHistoria valida que solo cree tipo 'seguimiento'
// (Terapia/Hidroterapia) y que la cita vinculada sea de ese mismo tipo.
router.post('/',   authorize(['admin', 'vet', 'aux']), createHistoria);

// GET  /api/clinical/historias/:id/pdf  → descargar PDF
router.get('/:id/pdf', authorize(['admin', 'vet', 'aux']), downloadHistoriaPDF);

// GET /api/clinical/historias/by-appointment/:id_cita → historia por cita
router.get('/by-appointment/:id_cita', authorize(['admin', 'vet', 'aux']), getHistoriaByAppointmentId);

// GET /api/clinical/historias/by-appointment/:id_cita/all → todos los documentos por cita
router.get('/by-appointment/:id_cita/all', authorize(['admin', 'vet', 'aux']), getHistoriasByAppointmentId);

// GET  /api/clinical/historias/:id      → detalle completo con datos hijo + archivos
router.get('/:id', authorize(['admin', 'vet', 'aux']), getHistoriaById);

// PUT  /api/clinical/historias/:id      → actualizar madre + hijo
// 'aux' puede llegar acá, pero updateHistoria valida que el documento sea de
// tipo 'seguimiento' (Terapia/Hidroterapia) antes de permitir la edición.
router.put('/:id', authorize(['admin', 'vet', 'aux']), updateHistoria);

// POST /api/clinical/historias/:id/upload-files → subir adjuntos diagnósticos
router.post('/:id/upload-files',
  authorize(['admin', 'vet']),
  (req, res, next) => {
    uploadHistoriaClinicaArchivos(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, () => {
          return res.status(400).json({
            success: false,
            message: err.message || 'Error subiendo archivos'
          });
        });
      }
      next();
    });
  },
  uploadHistoriaArchivos
);

// DELETE /api/clinical/historias/:id   → soft delete (estado = Cancelado)
router.delete('/:id', authorize(['admin', 'vet']),     deleteHistoria);

// POST /api/clinical/historias/:id/reactivar → reactivar documento anulado
router.post('/:id/reactivar', authorize(['admin', 'vet']), reactivateHistoria);

export default router;
