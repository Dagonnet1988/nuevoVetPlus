import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from '../services/googleCalendar.js';
import bidirectionalSyncService from '../services/bidirectionalSyncService.js';
import syncScheduler from '../services/syncScheduler.js';

/**
 * Obtener configuración actual de Google Calendar (solo admins)
 */
export const getGoogleCalendarConfig = async (req, res) => {
    try {
        // Solo administradores pueden ver la configuración
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta configuración'
            });
        }

        const result = await query(`
            SELECT 
                id_config,
                client_id,
                redirect_uri,
                calendar_id,
                timezone,
                notification_email,
                notification_popup,
                default_reminder_minutes,
                email_reminder_hours,
                is_active,
                configured_by,
                created_at,
                updated_at,
                CASE 
                    WHEN refresh_token IS NOT NULL THEN true 
                    ELSE false 
                END as has_refresh_token
            FROM vetplus_auth.google_calendar_config 
            WHERE is_active = true
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'Google Calendar no ha sido configurado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo configuración de Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Configurar credenciales de Google Calendar (solo admins)
 */
export const configureGoogleCalendar = async (req, res) => {
    try {
        console.log('🔧 Iniciando configuración de Google Calendar para usuario:', req.user?.id_usuario);
        
        // Solo administradores pueden configurar
        if (req.user.rol !== 'admin') {
            console.log('❌ Usuario no es admin:', req.user.rol);
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden configurar Google Calendar'
            });
        }

        const {
            client_id,
            client_secret,
            redirect_uri,
            calendar_id = 'primary',
            timezone = 'America/Bogota',
            notification_email = true,
            notification_popup = true,
            default_reminder_minutes = 30,
            email_reminder_hours = 24
        } = req.body;

        console.log('📋 Datos recibidos:', {
            client_id: client_id ? `${client_id.substring(0, 10)}...` : 'NO',
            client_secret: client_secret ? 'SÍ' : 'NO',
            redirect_uri,
            calendar_id
        });

        // Validaciones básicas
        if (!client_id || !client_secret || !redirect_uri) {
            console.log('❌ Faltan campos obligatorios');
            return res.status(400).json({
                success: false,
                message: 'Client ID, Client Secret y Redirect URI son obligatorios'
            });
        }

        const id_config = uuidv4();
        const configured_by = req.user.id_usuario;

        console.log('🗃️ Desactivando configuración anterior...');
        // Desactivar configuración anterior si existe
        await query('UPDATE vetplus_auth.google_calendar_config SET is_active = false');

        console.log('💾 Guardando nueva configuración...');
        // Crear nueva configuración
        const insertResult = await query(`
            INSERT INTO vetplus_auth.google_calendar_config (
                id_config, client_id, client_secret, redirect_uri, 
                calendar_id, timezone, notification_email, notification_popup,
                default_reminder_minutes, email_reminder_hours, configured_by, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            RETURNING *
        `, [
            id_config, client_id, client_secret, redirect_uri,
            calendar_id, timezone, notification_email, notification_popup,
            default_reminder_minutes, email_reminder_hours, configured_by
        ]);

        console.log('🔄 Reinicializando servicio de Google Calendar...');
        // Reinicializar el servicio de Google Calendar con las nuevas credenciales
        await googleCalendarService.reinitializeWithConfig(insertResult.rows[0]);

        console.log('🔗 Generando URL de autorización...');
        // Generar URL de autorización
        const authUrl = googleCalendarService.getAuthUrl();

        console.log('✅ Configuración guardada exitosamente');
        res.status(201).json({
            success: true,
            message: 'Configuración de Google Calendar guardada exitosamente',
            data: {
                id_config: insertResult.rows[0].id_config,
                authUrl,
                next_step: 'Visita la URL de autorización para completar la configuración'
            }
        });

    } catch (error) {
        console.error('❌ Error configurando Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Completar autorización de Google Calendar con el código recibido
 */
export const completeGoogleAuth = async (req, res) => {
    try {
        // Solo administradores pueden completar la autorización
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden completar la autorización'
            });
        }

        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'El código de autorización es obligatorio'
            });
        }

        // Obtener tokens usando el código
        const tokenResult = await googleCalendarService.getTokens(code);

        if (!tokenResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Error obteniendo tokens: ' + tokenResult.error
            });
        }

        // Actualizar configuración con los tokens
        const updateResult = await query(`
            UPDATE vetplus_auth.google_calendar_config 
            SET 
                refresh_token = $1,
                access_token = $2,
                token_expiry = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE is_active = true
            RETURNING *
        `, [
            tokenResult.tokens.refresh_token,
            tokenResult.tokens.access_token,
            tokenResult.tokens.expiry_date ? new Date(tokenResult.tokens.expiry_date) : null
        ]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró una configuración activa de Google Calendar'
            });
        }

        // Reinicializar el servicio con los tokens
        await googleCalendarService.reinitializeWithConfig(updateResult.rows[0]);

        // Probar la conexión creando un evento de prueba
        const testResult = await googleCalendarService.testConnection();

        res.json({
            success: true,
            message: 'Autorización completada exitosamente',
            data: {
                configured: true,
                test_connection: testResult.success,
                test_message: testResult.message
            }
        });

    } catch (error) {
        console.error('Error completando autorización de Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Probar conexión con Google Calendar
 */
export const testGoogleCalendarConnection = async (req, res) => {
    try {
        // Solo administradores pueden probar la conexión
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden probar la conexión'
            });
        }

        const testResult = await googleCalendarService.testConnection();

        res.json({
            success: true,
            data: testResult
        });

    } catch (error) {
        console.error('Error probando conexión de Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Desactivar integración con Google Calendar
 */
export const disableGoogleCalendar = async (req, res) => {
    try {
        // Solo administradores pueden desactivar
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden desactivar Google Calendar'
            });
        }

        await query('UPDATE vetplus_auth.google_calendar_config SET is_active = false');

        res.json({
            success: true,
            message: 'Integración con Google Calendar desactivada exitosamente'
        });

    } catch (error) {
        console.error('Error desactivando Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estadísticas del scheduler de sincronización
 */
export const getSchedulerStats = async (req, res) => {
    try {
        // Solo administradores pueden ver estadísticas del scheduler
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver estadísticas del scheduler'
            });
        }

        const stats = await syncScheduler.getSyncStats();
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Ejecutar sincronización manual del scheduler
 */
export const runManualSync = async (req, res) => {
    try {
        // Solo administradores pueden ejecutar sincronización manual
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ejecutar sincronización manual'
            });
        }

        const result = await syncScheduler.runManualSync();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Sincronización manual ejecutada exitosamente',
                data: result.results
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error ejecutando sincronización manual',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error ejecutando sincronización manual:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estado del scheduler
 */
export const getSchedulerStatus = async (req, res) => {
    try {
        // Solo administradores pueden ver el estado del scheduler
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver el estado del scheduler'
            });
        }

        const status = syncScheduler.getStatus();
        
        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Error obteniendo estado del scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estado de sincronización de citas
 */
export const getSyncStatus = async (req, res) => {
    try {
        // Solo admins y veterinarios pueden ver el estado
        if (!['admin', 'vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver el estado de sincronización'
            });
        }

        const statsResult = await query(`
            SELECT 
                google_sync_status,
                COUNT(*) as cantidad
            FROM clinical.calendario_citas 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY google_sync_status
        `);

        const recentErrorsResult = await query(`
            SELECT 
                c.codigo_cita,
                c.google_sync_error,
                c.last_google_sync,
                m.nombre as mascota_nombre,
                cl.nombre as cliente_nombre
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            WHERE c.google_sync_status = 'failed'
            AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY c.last_google_sync DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                stats: statsResult.rows,
                recent_errors: recentErrorsResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo estado de sincronización:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Importar eventos desde Google Calendar
 */
export const importFromGoogleCalendar = async (req, res) => {
    try {
        // Solo administradores pueden importar
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden importar desde Google Calendar'
            });
        }

        const {
            fecha_inicio,
            fecha_fin,
            auto_match = true,
            create_missing_data = false,
            dry_run = false
        } = req.body;

        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son obligatorias'
            });
        }

        const importResult = await bidirectionalSyncService.importFromGoogle(
            fecha_inicio,
            fecha_fin,
            {
                autoMatch: auto_match,
                createMissingData: create_missing_data,
                dryRun: dry_run
            }
        );

        if (!importResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Error importando desde Google Calendar',
                error: importResult.error
            });
        }

        res.json({
            success: true,
            message: dry_run ? 'Simulación de importación completada' : 'Importación completada exitosamente',
            data: importResult.results,
            dry_run: importResult.dry_run
        });

    } catch (error) {
        console.error('Error importando desde Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Sincronizar cambios desde Google Calendar
 */
export const syncChangesFromGoogle = async (req, res) => {
    try {
        // Solo administradores pueden sincronizar cambios
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden sincronizar cambios'
            });
        }

        const syncResult = await bidirectionalSyncService.syncChangesFromGoogle();

        if (!syncResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Error sincronizando cambios desde Google Calendar',
                error: syncResult.error
            });
        }

        res.json({
            success: true,
            message: 'Sincronización de cambios completada',
            data: syncResult.results
        });

    } catch (error) {
        console.error('Error sincronizando cambios desde Google Calendar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener eventos pendientes de matching manual
 */
export const getPendingMatches = async (req, res) => {
    try {
        // Solo administradores y veterinarios pueden ver eventos pendientes
        if (!['admin', 'vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver eventos pendientes'
            });
        }

        const pendingResult = await query(`
            SELECT 
                c.id_cita,
                c.codigo_cita,
                c.fecha_inicio,
                c.fecha_fin,
                c.tipo,
                c.motivo,
                c.notas,
                c.google_event_id,
                c.google_sync_status,
                m.nombre as mascota_nombre,
                cl.nombre as cliente_nombre,
                v.nombre as veterinario_nombre
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN vetplus_auth.usuarios v ON c.id_veterinario = v.id_usuario
            WHERE c.google_event_id IS NOT NULL
            AND c.google_sync_status IN ('pending', 'failed')
            AND c.notas LIKE '%Importado desde Google Calendar%'
            ORDER BY c.fecha_inicio ASC
        `);

        res.json({
            success: true,
            data: pendingResult.rows,
            total: pendingResult.rows.length
        });

    } catch (error) {
        console.error('Error obteniendo eventos pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Resolver matching manual para una cita
 */
export const resolveManualMatch = async (req, res) => {
    try {
        // Solo administradores pueden resolver matching
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden resolver matching manual'
            });
        }

        const { id_cita } = req.params;
        const { id_cliente, id_mascota, id_veterinario } = req.body;

        if (!id_cliente || !id_mascota || !id_veterinario) {
            return res.status(400).json({
                success: false,
                message: 'Cliente, mascota y veterinario son obligatorios'
            });
        }

        // Verificar que la cita existe y está pendiente
        const citaResult = await query(`
            SELECT id_cita, google_event_id 
            FROM clinical.calendario_citas 
            WHERE id_cita = $1 AND google_sync_status IN ('pending', 'failed')
        `, [id_cita]);

        if (citaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada o no está pendiente de matching'
            });
        }

        // Actualizar la cita con los datos correctos
        const updateResult = await query(`
            UPDATE clinical.calendario_citas 
            SET 
                id_cliente = (SELECT id_cliente FROM clinical.mascotas WHERE id_mascota = $2),
                id_mascota = $2,
                id_veterinario = $3,
                google_sync_status = 'synced',
                updated_at = CURRENT_TIMESTAMP,
                notas = COALESCE(notas, '') || ' | Matching manual resuelto por admin'
            WHERE id_cita = $1
            RETURNING *
        `, [id_cita, id_mascota, id_veterinario]);

        res.json({
            success: true,
            message: 'Matching manual resuelto exitosamente',
            data: updateResult.rows[0]
        });

    } catch (error) {
        console.error('Error resolviendo matching manual:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener URL de autorización de Google Calendar
 */
export const getGoogleCalendarAuthUrl = async (req, res) => {
    try {
        console.log('🔍 Iniciando getGoogleCalendarAuthUrl para usuario:', req.user?.id_usuario);
        
        // Solo administradores pueden obtener URL de autorización
        if (req.user.rol !== 'admin') {
            console.log('❌ Usuario no es admin:', req.user.rol);
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden obtener la URL de autorización'
            });
        }

        // Verificar que el servicio esté configurado
        const isConfigured = await googleCalendarService.isConfigured();
        console.log('📋 Servicio configurado:', isConfigured);
        
        if (!isConfigured) {
            console.log('❌ Google Calendar no está configurado');
            return res.status(400).json({
                success: false,
                message: 'Google Calendar no está configurado. Configura primero las credenciales.'
            });
        }

        // Generar URL de autorización
        const authUrl = googleCalendarService.getAuthUrl();
        console.log('🔗 URL de autorización generada:', authUrl ? 'Sí' : 'No');

        if (!authUrl) {
            console.log('❌ Error generando URL de autorización');
            return res.status(500).json({
                success: false,
                message: 'Error generando URL de autorización'
            });
        }

        console.log('✅ URL de autorización enviada exitosamente');
        res.json({
            success: true,
            authUrl: authUrl,
            message: 'URL de autorización generada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en getGoogleCalendarAuthUrl:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Configurar webhook de Google Calendar
 */
export const setupWebhook = async (req, res) => {
    try {
        // Solo administradores pueden configurar webhook
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden configurar webhook'
            });
        }

        const setupResult = await googleCalendarService.setupWebhook();

        if (setupResult.success) {
            res.json({
                success: true,
                message: 'Webhook configurado exitosamente',
                data: setupResult
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error configurando webhook',
                error: setupResult.error
            });
        }

    } catch (error) {
        console.error('Error configurando webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Detener webhook de Google Calendar
 */
export const stopWebhook = async (req, res) => {
    try {
        // Solo administradores pueden detener webhook
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden detener webhook'
            });
        }

        const stopResult = await googleCalendarService.stopWebhook();

        if (stopResult.success) {
            res.json({
                success: true,
                message: stopResult.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error deteniendo webhook',
                error: stopResult.error
            });
        }

    } catch (error) {
        console.error('Error deteniendo webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estado del webhook
 */
export const getWebhookStatus = async (req, res) => {
    try {
        // Solo administradores y veterinarios pueden ver el estado
        if (!['admin', 'vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver el estado del webhook'
            });
        }

        const statusResult = await googleCalendarService.getWebhookStatus();

        res.json({
            success: true,
            data: statusResult
        });

    } catch (error) {
        console.error('Error obteniendo estado del webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Renovar webhook de Google Calendar
 */
export const renewWebhook = async (req, res) => {
    try {
        // Solo administradores pueden renovar webhook
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden renovar webhook'
            });
        }

        const renewResult = await googleCalendarService.renewWebhook();

        if (renewResult.success) {
            res.json({
                success: true,
                message: 'Webhook renovado exitosamente',
                data: renewResult
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error renovando webhook',
                error: renewResult.error
            });
        }

    } catch (error) {
        console.error('Error renovando webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};