import express from 'express';
import clientRoutes from './clients.js';
import petRoutes from './pets.js';
import pacientesRoutes from './pacientes.js';
import consultationRoutes from './consultations.js';
import appointmentRoutes from './appointments.js';
import { getEspecies, getRazasByEspecie } from '../controllers/pacientesController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { uploadHistoriaClinicaArchivos, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Ruta de prueba para el módulo clínico
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas del módulo clínico funcionando correctamente',
    timestamp: new Date().toISOString(),
    module: 'clinical',
    endpoints: ['clients', 'pets', 'pacientes', 'consultations', 'appointments']
  });
});

// Montar las rutas de clientes
router.use('/clients', authenticateToken, tenantContext, clientRoutes);
router.use('/clientes', authenticateToken, tenantContext, clientRoutes); // Alias en español

// Montar las rutas de mascotas
router.use('/pets', authenticateToken, tenantContext, petRoutes);

// Montar las rutas de pacientes (combinadas)
router.use('/pacientes', authenticateToken, tenantContext, pacientesRoutes);

// Las rutas de especies están ahora en /pacientes/especies

// Ruta directa para obtener veterinarios
router.get('/veterinarians',
  authenticateToken,
  tenantContext,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { query } = await import('../config/database.js');
      const result = await query(`
        SELECT 
          id_usuario as id,
          nombre,
          email,
          'Medicina Veterinaria' as especialidad
        FROM vetplus_auth.usuarios 
        WHERE rol = 'vet'
        AND id_tenant = $1
        AND activo = true
        ORDER BY nombre ASC
      `, [tenantId]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo veterinarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Ruta para subir archivos de historia clínica
router.post('/consultations/:id/upload-files',
  authenticateToken,
  tenantContext,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  (req, res, next) => {
    uploadHistoriaClinicaArchivos(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const archivos = req.files || [];

      if (!archivos || archivos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron archivos para subir'
        });
      }

      // Verificar que la consulta existe
      const { query } = await import('../config/database.js');
      const consultaResult = await query(
        'SELECT id_consulta FROM clinical.consultas_clinicas WHERE id_consulta = $1 AND id_tenant = $2',
        [id, tenantId]
      );

      if (consultaResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Consulta no encontrada'
        });
      }

      // Procesar archivos subidos y guardarlos en la base de datos
      const archivosSubidos = [];
      const dbModule = await import('../config/database.js');
      const dbQuery = dbModule.query;

      for (const file of archivos) {
        try {
          // Guardar referencia en la base de datos
          const archivoResult = await dbQuery(`
            INSERT INTO clinical.archivos_consulta (
              id_consulta, nombre_original, nombre_archivo, ruta_archivo,
              tipo_archivo, tamano_bytes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id_archivo, created_at
          `, [
            id,
            file.originalname,
            file.filename,
            `/uploads/historia-clinica/${file.filename}`,
            file.mimetype,
            file.size,
            req.user.id
          ]);

          archivosSubidos.push({
            id_archivo: archivoResult.rows[0].id_archivo,
            nombre_original: file.originalname,
            nombre_archivo: file.filename,
            ruta: `/uploads/historia-clinica/${file.filename}`,
            tipo: file.mimetype,
            tamaño: file.size,
            fecha_subida: archivoResult.rows[0].created_at
          });
        } catch (dbError) {
          console.error('Error guardando archivo en BD:', dbError);
          // Si falla guardar en BD, eliminar el archivo físico
          try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'uploads', 'historia-clinica', file.filename);
            await fs.unlink(filePath);
          } catch (fsError) {
            console.error('Error eliminando archivo físico:', fsError);
          }
          throw dbError;
        }
      }

      res.json({
        success: true,
        message: `${archivos.length} archivo(s) subido(s) exitosamente`,
        data: {
          id_consulta: id,
          archivos: archivosSubidos
        }
      });

    } catch (error) {
      console.error('Error subiendo archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Ruta para obtener archivos de una consulta
router.get('/consultations/:id/files',
  authenticateToken,
  tenantContext,
  authorize(['admin', 'vet', 'aux_admin', 'aux_vet']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      // Verificar que la consulta existe
      const { query } = await import('../config/database.js');
      const consultaResult = await query(
        'SELECT id_consulta FROM clinical.consultas_clinicas WHERE id_consulta = $1 AND id_tenant = $2',
        [id, tenantId]
      );

      if (consultaResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Consulta no encontrada'
        });
      }

      // Obtener archivos de la consulta
      let sqlQuery = `
        SELECT
          id_archivo,
          nombre_original,
          nombre_archivo,
          ruta_archivo,
          COALESCE(to_jsonb(ac)->>'tipo_archivo', to_jsonb(ac)->>'tipo_mime') as tipo_mime,
          COALESCE(
            (to_jsonb(ac)->>'tamano_bytes')::integer,
            (to_jsonb(ac)->>'tamaño_bytes')::integer
          ) as tamano_bytes,
          descripcion,
          COALESCE(
            (to_jsonb(ac)->>'created_at')::timestamp,
            (to_jsonb(ac)->>'fecha_subida')::timestamp
          ) as fecha_subida,
          COALESCE(
            (to_jsonb(ac)->>'created_by')::uuid,
            (to_jsonb(ac)->>'subido_por')::uuid
          ) as subido_por,
          u.nombre as subido_por_nombre
        FROM clinical.archivos_consulta ac
        LEFT JOIN vetplus_auth.usuarios u ON u.id_usuario = COALESCE(
          (to_jsonb(ac)->>'created_by')::uuid,
          (to_jsonb(ac)->>'subido_por')::uuid
        )
        WHERE ac.id_consulta = $1
          AND COALESCE((to_jsonb(ac)->>'activo')::boolean, true) = true
      `;

      const params = [id];

      sqlQuery += ` ORDER BY COALESCE(
        (to_jsonb(ac)->>'created_at')::timestamp,
        (to_jsonb(ac)->>'fecha_subida')::timestamp
      ) DESC`;

      const archivosResult = await query(sqlQuery, params);

      res.json({
        success: true,
        data: archivosResult.rows,
        total: archivosResult.rows.length
      });

    } catch (error) {
      console.error('Error obteniendo archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Ruta para eliminar archivo de consulta
router.delete('/consultations/:id/files/:fileId',
  authenticateToken,
  authorize(['admin', 'vet', 'aux_admin']),
  async (req, res) => {
    try {
      const { id, fileId } = req.params;

      // Verificar que el archivo existe y pertenece a la consulta
      const { query } = await import('../config/database.js');
      const archivoResult = await query(`
        SELECT nombre_archivo, ruta_archivo
        FROM clinical.archivos_consulta
        WHERE id_archivo = $1 AND id_consulta = $2 AND activo = true
      `, [fileId, id]);

      if (archivoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      const archivo = archivoResult.rows[0];

      // Marcar como inactivo en la base de datos
      await query(`
        UPDATE clinical.archivos_consulta
        SET activo = false, updated_at = CURRENT_TIMESTAMP
        WHERE id_archivo = $1
      `, [fileId]);

      // Intentar eliminar el archivo físico
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'uploads', 'historia-clinica', archivo.nombre_archivo);
        await fs.unlink(filePath);
      } catch (fsError) {
        console.warn('Archivo físico no encontrado o no se pudo eliminar:', fsError.message);
      }

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Montar las rutas de consultas clínicas
router.use('/consultations', consultationRoutes);

// Montar las rutas de citas
router.use('/appointments', appointmentRoutes);

export default router;
