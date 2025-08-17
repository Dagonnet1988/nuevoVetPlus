import { query } from '../config/database.js';
import googleCalendarService from '../services/googleCalendar.js';

/**
 * Verificar webhook de Google Calendar (para configuración inicial)
 */
export const verifyWebhook = async (req, res) => {
    try {
        // Google Calendar envía un token para verificar el webhook
        const challenge = req.query['hub.challenge'];
        const verifyToken = req.query['hub.verify_token'];
        
        // Verificar que el token coincida con el configurado
        const expectedToken = process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN || 'vetplus-webhook-token';
        
        if (verifyToken === expectedToken) {
            console.log('✅ Webhook de Google Calendar verificado exitosamente');
            res.status(200).send(challenge);
        } else {
            console.log('❌ Token de verificación inválido:', verifyToken);
            res.status(403).send('Token de verificación inválido');
        }
    } catch (error) {
        console.error('Error verificando webhook de Google Calendar:', error);
        res.status(500).send('Error interno del servidor');
    }
};

/**
 * Procesar notificaciones de webhook de Google Calendar
 */
export const processWebhook = async (req, res) => {
    try {
        console.log('📨 Webhook recibido de Google Calendar:', {
            headers: req.headers,
            body: req.body
        });

        // Verificar que sea una notificación válida de Google
        const channelId = req.headers['x-goog-channel-id'];
        const resourceState = req.headers['x-goog-resource-state'];
        const resourceUri = req.headers['x-goog-resource-uri'];

        if (!channelId || !resourceState) {
            console.log('❌ Headers requeridos faltantes en webhook');
            return res.status(400).json({
                success: false,
                message: 'Headers requeridos faltantes'
            });
        }

        console.log('📋 Detalles del webhook:', {
            channelId,
            resourceState,
            resourceUri
        });

        // Procesar diferentes tipos de cambios
        switch (resourceState) {
            case 'sync':
                console.log('🔄 Sincronización inicial del webhook');
                break;
                
            case 'exists':
                console.log('📅 Cambio en evento detectado, procesando...');
                await processEventChange(channelId);
                break;
                
            case 'not_exists':
                console.log('🗑️ Evento eliminado detectado');
                await processEventDeletion(channelId);
                break;
                
            default:
                console.log('⚠️ Estado de recurso desconocido:', resourceState);
        }

        res.status(200).json({
            success: true,
            message: 'Webhook procesado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error procesando webhook de Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando webhook',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Procesar cambio en evento (incluyendo respuestas de asistentes)
 */
async function processEventChange(channelId) {
    try {
        console.log('🔍 Procesando cambio en evento para channel:', channelId);

        // Obtener eventos recientes modificados
        const changesResult = await googleCalendarService.detectChangesFromGoogle(
            new Date(Date.now() - 5 * 60 * 1000).toISOString() // Últimos 5 minutos
        );

        if (!changesResult.success) {
            console.error('Error detectando cambios:', changesResult.error);
            return;
        }

        console.log(`📊 ${changesResult.changes.length} cambios detectados`);

        // Procesar cada cambio
        for (const change of changesResult.changes) {
            await processIndividualEventChange(change);
        }

    } catch (error) {
        console.error('Error procesando cambio en evento:', error);
    }
}

/**
 * Procesar cambio individual en evento
 */
async function processIndividualEventChange(change) {
    try {
        const { google_event, parsed_data, change_type } = change;
        
        console.log('🔄 Procesando cambio individual:', {
            eventId: google_event.id,
            changeType: change_type,
            eventSummary: google_event.summary
        });

        // Buscar la cita en nuestra base de datos
        const citaResult = await query(`
            SELECT id_cita, codigo_cita, estado, id_mascota 
            FROM clinical.calendario_citas 
            WHERE google_event_id = $1
        `, [google_event.id]);

        if (citaResult.rows.length === 0) {
            console.log('⚠️ No se encontró cita local para evento de Google:', google_event.id);
            return;
        }

        const cita = citaResult.rows[0];
        console.log('📋 Cita encontrada:', cita.codigo_cita);

        // Verificar respuestas de asistentes
        if (google_event.attendees && google_event.attendees.length > 0) {
            await processAttendeeResponses(cita, google_event.attendees);
        }

        // Verificar otros cambios (fecha, título, etc.)
        if (change_type === 'updated') {
            await checkForEventUpdates(cita, google_event, parsed_data);
        }

    } catch (error) {
        console.error('Error procesando cambio individual:', error);
    }
}

/**
 * Procesar respuestas de asistentes
 */
async function processAttendeeResponses(cita, attendees) {
    try {
        console.log('👥 Procesando respuestas de asistentes para cita:', cita.codigo_cita);

        for (const attendee of attendees) {
            const { email, responseStatus, comment } = attendee;
            
            console.log('📧 Respuesta de asistente:', {
                email: email,
                status: responseStatus,
                comment: comment
            });

            // Verificar si es el email del propietario
            const propietarioResult = await query(`
                SELECT c.nombre as cliente_nombre, c.email as cliente_email
                FROM clinical.mascotas m
                JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
                WHERE m.id_mascota = $1
            `, [cita.id_mascota]);

            if (propietarioResult.rows.length === 0) {
                console.log('⚠️ No se encontró propietario para la mascota');
                continue;
            }

            const propietario = propietarioResult.rows[0];
            
            // Verificar si el email corresponde al propietario
            if (propietario.cliente_email && 
                propietario.cliente_email.toLowerCase() === email.toLowerCase()) {
                
                console.log('✅ Respuesta del propietario detectada:', responseStatus);
                await updateCitaFromAttendeeResponse(cita, responseStatus, comment, propietario);
            }
        }

    } catch (error) {
        console.error('Error procesando respuestas de asistentes:', error);
    }
}

/**
 * Actualizar cita basado en respuesta del asistente
 */
async function updateCitaFromAttendeeResponse(cita, responseStatus, comment, propietario) {
    try {
        let nuevoEstado = cita.estado;
        let notas = '';

        switch (responseStatus) {
            case 'accepted':
                nuevoEstado = 'confirmada';
                notas = `Cita confirmada por ${propietario.cliente_nombre} via Google Calendar`;
                console.log('✅ Propietario aceptó la cita');
                break;
                
            case 'declined':
                nuevoEstado = 'cancelada';
                notas = `Cita rechazada por ${propietario.cliente_nombre} via Google Calendar`;
                console.log('❌ Propietario rechazó la cita');
                break;
                
            case 'tentative':
                // Mantener estado actual, solo agregar nota
                notas = `Respuesta tentativa de ${propietario.cliente_nombre} via Google Calendar`;
                console.log('⏳ Propietario respondió tentativamente');
                break;
                
            default:
                console.log('⚠️ Estado de respuesta desconocido:', responseStatus);
                return;
        }

        // Agregar comentario del propietario si existe
        if (comment) {
            notas += `. Comentario: "${comment}"`;
        }

        // Actualizar la cita en la base de datos
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
            RETURNING codigo_cita, estado
        `, [nuevoEstado, notas, cita.id_cita]);

        if (updateResult.rows.length > 0) {
            console.log('✅ Cita actualizada exitosamente:', {
                codigo: updateResult.rows[0].codigo_cita,
                nuevoEstado: updateResult.rows[0].estado
            });

            // Registrar el evento para auditoría
            await query(`
                INSERT INTO audit.audit_log (
                    table_name, operation, record_id, old_values, new_values, user_id
                ) VALUES (
                    'calendario_citas', 'UPDATE', $1, 
                    jsonb_build_object('estado', $2),
                    jsonb_build_object('estado', $3, 'respuesta_google', $4),
                    NULL
                )
            `, [
                cita.id_cita, 
                cita.estado, 
                nuevoEstado, 
                responseStatus
            ]);

        } else {
            console.error('❌ No se pudo actualizar la cita');
        }

    } catch (error) {
        console.error('Error actualizando cita desde respuesta:', error);
    }
}

/**
 * Verificar otros tipos de actualizaciones del evento
 */
async function checkForEventUpdates(cita, googleEvent, parsedData) {
    try {
        console.log('🔍 Verificando actualizaciones del evento:', googleEvent.id);

        // Verificar cambios en fechas
        const startTime = new Date(googleEvent.start.dateTime || googleEvent.start.date);
        const endTime = new Date(googleEvent.end.dateTime || googleEvent.end.date);

        // Obtener fechas actuales de la cita
        const citaActualResult = await query(`
            SELECT fecha_inicio, fecha_fin, motivo, notas
            FROM clinical.calendario_citas 
            WHERE id_cita = $1
        `, [cita.id_cita]);

        if (citaActualResult.rows.length === 0) return;

        const citaActual = citaActualResult.rows[0];
        const fechaInicioActual = new Date(citaActual.fecha_inicio);
        const fechaFinActual = new Date(citaActual.fecha_fin);

        let cambios = [];
        let updateFields = {};

        // Verificar cambio de fecha/hora
        if (startTime.getTime() !== fechaInicioActual.getTime() || 
            endTime.getTime() !== fechaFinActual.getTime()) {
            
            cambios.push('fecha/hora modificada');
            updateFields.fecha_inicio = startTime;
            updateFields.fecha_fin = endTime;
        }

        // Verificar cambio en el título/motivo
        if (googleEvent.summary && googleEvent.summary !== citaActual.motivo) {
            cambios.push('título modificado');
            updateFields.motivo = googleEvent.summary;
        }

        // Si hay cambios, actualizar la cita
        if (cambios.length > 0) {
            console.log('📝 Cambios detectados:', cambios.join(', '));

            const updateQuery = `
                UPDATE clinical.calendario_citas 
                SET ${Object.keys(updateFields).map((key, index) => `${key} = $${index + 2}`).join(', ')},
                    notas = COALESCE(notas, '') || ' | Actualizado desde Google Calendar: ${cambios.join(', ')}',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_cita = $1
            `;

            await query(updateQuery, [cita.id_cita, ...Object.values(updateFields)]);
            
            console.log('✅ Cita actualizada con cambios desde Google Calendar');
        }

    } catch (error) {
        console.error('Error verificando actualizaciones del evento:', error);
    }
}

/**
 * Procesar eliminación de evento
 */
async function processEventDeletion(channelId) {
    try {
        console.log('🗑️ Procesando eliminación de evento para channel:', channelId);
        
        // Para eliminaciones, necesitaríamos más información del evento
        // Por ahora, solo registramos que se detectó una eliminación
        console.log('⚠️ Eliminación detectada - implementar lógica específica si es necesario');
        
    } catch (error) {
        console.error('Error procesando eliminación de evento:', error);
    }
}