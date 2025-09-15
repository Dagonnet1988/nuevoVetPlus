import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * Endpoint de prueba para simular confirmación de propietario
 * POST /api/test/simulate-owner-response
 */
router.post('/simulate-owner-response', async (req, res) => {
    try {
        const { codigo_cita, response_status, propietario_email } = req.body;

        // Validar parámetros
        if (!codigo_cita || !response_status) {
            return res.status(400).json({
                success: false,
                message: 'codigo_cita y response_status son requeridos'
            });
        }

        console.log('🧪 [TEST] Simulando respuesta de propietario:', {
            codigo_cita,
            response_status,
            propietario_email
        });

        // Buscar la cita
        const citaResult = await query(`
            SELECT 
                cc.id_cita,
                cc.codigo_cita,
                cc.estado,
                cc.id_mascota,
                m.nombre as mascota_nombre,
                c.nombre as cliente_nombre,
                c.email as cliente_email
            FROM clinical.calendario_citas cc
            JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
            JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE cc.codigo_cita = $1
        `, [codigo_cita]);

        if (citaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        const cita = citaResult.rows[0];
        console.log('📋 [TEST] Cita encontrada:', cita);

        // Simular la lógica de updateCitaFromAttendeeResponse
        let nuevoEstado = cita.estado;
        let notas = '';

        switch (response_status) {
            case 'accepted':
                nuevoEstado = 'confirmada';
                notas = `[TEST] Cita confirmada por ${cita.cliente_nombre} via simulación`;
                break;
                
            case 'declined':
                nuevoEstado = 'cancelada';
                notas = `[TEST] Cita rechazada por ${cita.cliente_nombre} via simulación`;
                break;
                
            case 'tentative':
                notas = `[TEST] Respuesta tentativa de ${cita.cliente_nombre} via simulación`;
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'response_status inválido. Use: accepted, declined, tentative'
                });
        }

        console.log('🔄 [TEST] Actualizando estado:', {
            estado_anterior: cita.estado,
            estado_nuevo: nuevoEstado,
            notas: notas
        });

        // Actualizar la cita
        const updateResult = await query(`
            UPDATE clinical.calendario_citas 
            SET 
                estado = $1,
                notas = COALESCE(notas, '') || CASE 
                    WHEN notas IS NULL OR notas = '' THEN $2
                    ELSE ' | ' || $2
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $3
            RETURNING codigo_cita, estado, notas
        `, [nuevoEstado, notas, cita.id_cita]);

        if (updateResult.rows.length > 0) {
            console.log('✅ [TEST] Cita actualizada exitosamente:', updateResult.rows[0]);

            res.json({
                success: true,
                message: 'Respuesta de propietario simulada exitosamente',
                data: {
                    codigo_cita: updateResult.rows[0].codigo_cita,
                    estado_anterior: cita.estado,
                    estado_nuevo: updateResult.rows[0].estado,
                    notas: updateResult.rows[0].notas
                }
            });
        } else {
            throw new Error('No se pudo actualizar la cita');
        }

    } catch (error) {
        console.error('❌ [TEST] Error simulando respuesta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Endpoint para listar citas pendientes de confirmación
 * GET /api/test/pending-appointments
 */
router.get('/pending-appointments', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                cc.codigo_cita,
                cc.estado,
                cc.fecha_inicio,
                cc.google_event_id,
                m.nombre as mascota_nombre,
                c.nombre as cliente_nombre,
                c.email as cliente_email
            FROM clinical.calendario_citas cc
            JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
            JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE cc.estado = 'pendiente'
            ORDER BY cc.fecha_inicio DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo citas pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

export default router;