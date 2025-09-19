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
    getConsultationStats,
    completeConsultationWithInvoice
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

// 🔥 COMPLETAR CONSULTA CON FACTURACIÓN AUTOMÁTICA
// POST /api/clinical/consultations/:id/complete-with-invoice
router.post('/:id/complete-with-invoice',
    authorize(['admin', 'vet']), // Solo admin y veterinarios
    validateConsultationId,
    validateRequest,
    completeConsultationWithInvoice
);

// ✅ EXPORTAR CONSULTA CLÍNICA A PDF
// GET /api/clinical/consultations/:id/export
router.get('/:id/export',
    authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
    validateConsultationId,
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { formato = 'pdf' } = req.query;

            if (formato !== 'pdf') {
                return res.status(400).json({
                    success: false,
                    message: 'Formato no soportado. Solo se soporta PDF.'
                });
            }

            // Importar el servicio de PDF
            const { default: pdfGeneratorService } = await import('../services/pdfGeneratorService.js');

            // Generar PDF de la consulta
            const filepath = await pdfGeneratorService.generarConsultaPDF(id);

            // Leer el archivo generado
            const fs = await import('fs/promises');
            const pdfBuffer = await fs.readFile(filepath);

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=consulta-${id}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            // Enviar PDF
            res.send(pdfBuffer);

            // Limpiar archivo temporal después de enviarlo
            setTimeout(() => {
                fs.unlink(filepath).catch(err => console.error('Error eliminando archivo temporal:', err));
            }, 1000);

        } catch (error) {
            console.error('Error exportando consulta:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
);

export default router;
