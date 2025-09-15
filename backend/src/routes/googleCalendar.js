import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getGoogleCalendarConfig,
    configureGoogleCalendar,
    completeGoogleAuth,
    testGoogleCalendarConnection,
    disableGoogleCalendar,
    getSyncStatus,
    importFromGoogleCalendar,
    syncChangesFromGoogle,
    getPendingMatches,
    resolveManualMatch,
    getSchedulerStats,
    runManualSync,
    getSchedulerStatus,
    getGoogleCalendarAuthUrl
} from '../controllers/googleCalendarController.js';

const router = express.Router();

// Callback de Google Calendar (no requiere autenticación)
router.get('/callback', async (req, res) => {
    try {
        const { code, error } = req.query;
        
        if (error) {
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Error de Autorización - VetPlus</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
                        .error { color: #d32f2f; }
                        .button { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Error de Autorización</h2>
                        <p class="error">Error: ${error}</p>
                        <p>La autorización de Google Calendar ha fallado.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="button">Volver a Configuración</a>
                    </div>
                </body>
                </html>
            `;
            return res.send(errorHtml);
        }
        
        if (!code) {
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Error - VetPlus</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
                        .error { color: #d32f2f; }
                        .button { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Error</h2>
                        <p class="error">No se recibió el código de autorización.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="button">Volver a Configuración</a>
                    </div>
                </body>
                </html>
            `;
            return res.send(errorHtml);
        }
        
        // Procesar automáticamente la autorización
        try {
            // Importar el servicio aquí para evitar dependencias circulares
            const googleCalendarService = (await import('../services/googleCalendar.js')).default;
            
            // Obtener tokens usando el código
            const tokenResult = await googleCalendarService.getTokens(code);
            
            if (!tokenResult.success) {
                throw new Error(tokenResult.error);
            }
            
            // Actualizar configuración con los tokens
            const { query } = await import('../config/database.js');
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
                throw new Error('No se encontró una configuración activa de Google Calendar');
            }
            
            // Reinicializar el servicio con los tokens
            await googleCalendarService.reinitializeWithConfig(updateResult.rows[0]);
            
            // Probar la conexión
            const testResult = await googleCalendarService.testConnection();
            
            // Mostrar página de éxito
            const successHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Autorización Exitosa - VetPlus</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; text-align: center; }
                        .success { color: #2e7d32; }
                        .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
                        .button { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
                        .test-result { margin-top: 20px; padding: 15px; border-radius: 4px; }
                        .test-success { background: #e8f5e8; color: #2e7d32; }
                        .test-error { background: #ffebee; color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>✅ Autorización Exitosa</h2>
                        <p class="success">Google Calendar se ha configurado correctamente.</p>
                        <div class="info">
                            <strong>🎉 ¡Configuración Completada!</strong><br>
                            VetPlus ahora puede sincronizar citas con Google Calendar.
                        </div>
                        <div class="test-result ${testResult.success ? 'test-success' : 'test-error'}">
                            <strong>🔍 Prueba de Conexión:</strong><br>
                            ${testResult.message}
                        </div>
                        <p>Puedes cerrar esta ventana y volver al panel de configuración.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="button">Volver a Configuración</a>
                    </div>
                    <script>
                        console.log('🎯 Callback de Google: iniciando comunicación con popup padre');
                        
                        // Auto-cerrar inmediatamente si es una ventana popup
                        if (window.opener) {
                            try {
                                console.log('📤 Enviando mensaje de éxito al popup padre');
                                
                                // Enviar mensaje de éxito con detalles
                                const message = { 
                                    type: 'google-calendar-success',
                                    success: true,
                                    testResult: ${JSON.stringify(testResult)},
                                    message: 'Google Calendar configurado exitosamente. ${testResult.success ? '✅ Conexión verificada' : '⚠️ Configurado pero con advertencias'}',
                                    timestamp: new Date().toISOString()
                                };
                                
                                console.log('📤 Mensaje a enviar:', message);
                                window.opener.postMessage(message, '*');
                                
                                console.log('✅ Mensaje enviado, cerrando popup en 1 segundo...');
                                
                                // Cerrar con pequeño delay para asegurar que el mensaje se envíe
                                setTimeout(() => {
                                    window.close();
                                }, 1000);
                            } catch (e) {
                                console.error('❌ Error comunicando con ventana padre:', e);
                                // Fallback: redirigir si falla el popup
                                window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                            }
                        } else {
                            console.log('🔄 No es popup, redirigiendo en 3 segundos...');
                            // Si no es popup, mostrar mensaje y redirigir
                            setTimeout(() => {
                                window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                            }, 3000);
                        }
                    </script>
                </body>
                </html>
            `;
            
            res.send(successHtml);
            
        } catch (processingError) {
            console.error('Error procesando autorización:', processingError);
            
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Error de Procesamiento - VetPlus</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
                        .error { color: #d32f2f; }
                        .details { background: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; font-family: monospace; }
                        .button { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Error de Procesamiento</h2>
                        <p class="error">Error procesando la autorización de Google Calendar.</p>
                        <div class="details">
                            <strong>Código recibido:</strong> ${code}<br>
                            <strong>Error:</strong> ${processingError.message}
                        </div>
                        <p>Puedes intentar usar manualmente el código en el panel de configuración.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="button">Volver a Configuración</a>
                    </div>
                    <script>
                        console.log('❌ Callback de Google: error en autorización');
                        
                        // Comunicar error si es popup
                        if (window.opener) {
                            try {
                                console.log('📤 Enviando mensaje de error al popup padre');
                                
                                const errorMessage = { 
                                    type: 'google-calendar-error',
                                    success: false,
                                    error: '${processingError.message.replace(/'/g, "\\'")}',
                                    code: '${code}',
                                    message: 'Error procesando la autorización',
                                    timestamp: new Date().toISOString()
                                };
                                
                                console.log('📤 Mensaje de error a enviar:', errorMessage);
                                window.opener.postMessage(errorMessage, '*');
                                
                                console.log('✅ Mensaje de error enviado, cerrando popup en 2 segundos...');
                                setTimeout(() => window.close(), 2000);
                            } catch (e) {
                                console.error('❌ Error comunicando error:', e);
                            }
                        } else {
                            console.log('🔄 No es popup, manteniendo página abierta');
                        }
                    </script>
                </body>
                </html>
            `;
            
            res.send(errorHtml);
        }
        
    } catch (error) {
        console.error('Error en callback de Google:', error);
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error Interno - VetPlus</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
                    .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
                    .error { color: #d32f2f; }
                    .button { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>❌ Error Interno del Servidor</h2>
                    <p class="error">Ha ocurrido un error inesperado.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="button">Volver a Configuración</a>
                </div>
                <script>
                    console.log('💥 Callback de Google: error interno del servidor');
                    
                    // Comunicar error si es popup
                    if (window.opener) {
                        try {
                            console.log('📤 Enviando mensaje de error interno al popup padre');
                            
                            const errorMessage = { 
                                type: 'google-calendar-error',
                                success: false,
                                error: 'Error interno del servidor',
                                message: 'Ha ocurrido un error inesperado',
                                timestamp: new Date().toISOString()
                            };
                            
                            console.log('📤 Mensaje de error interno a enviar:', errorMessage);
                            window.opener.postMessage(errorMessage, '*');
                            
                            console.log('✅ Mensaje de error interno enviado, cerrando popup en 2 segundos...');
                            setTimeout(() => window.close(), 2000);
                        } catch (e) {
                            console.error('❌ Error comunicando error interno:', e);
                        }
                    } else {
                        console.log('🔄 No es popup, manteniendo página abierta');
                    }
                </script>
            </body>
            </html>
        `;
        res.send(errorHtml);
    }
});

// Aplicar autenticación a todas las demás rutas
router.use(authenticateToken);

/**
 * @route GET /api/google-calendar/config
 * @desc Obtener configuración actual de Google Calendar (solo admins)
 * @access Admin
 */
router.get('/config', getGoogleCalendarConfig);

/**
 * @route GET /api/google-calendar/auth-url
 * @desc Obtener URL de autorización de Google Calendar (solo admins)
 * @access Admin
 */
router.get('/auth-url', getGoogleCalendarAuthUrl);

/**
 * @route POST /api/google-calendar/configure
 * @desc Configurar credenciales de Google Calendar (solo admins)
 * @access Admin
 * @body { client_id, client_secret, redirect_uri, calendar_id?, timezone?, notification_email?, notification_popup?, default_reminder_minutes?, email_reminder_hours? }
 */
router.post('/configure', configureGoogleCalendar);

/**
 * @route POST /api/google-calendar/complete-auth
 * @desc Completar autorización con código de Google (solo admins)
 * @access Admin
 * @body { code }
 */
router.post('/complete-auth', completeGoogleAuth);

/**
 * @route POST /api/google-calendar/test-connection
 * @desc Probar conexión con Google Calendar (solo admins)
 * @access Admin
 */
router.post('/test-connection', testGoogleCalendarConnection);

/**
 * @route POST /api/google-calendar/disable
 * @desc Desactivar integración con Google Calendar (solo admins)
 * @access Admin
 */
router.post('/disable', disableGoogleCalendar);

/**
 * @route GET /api/google-calendar/sync-status
 * @desc Obtener estado de sincronización de citas
 * @access Admin, Vet
 */
router.get('/sync-status', getSyncStatus);

/**
 * @route POST /api/google-calendar/import
 * @desc Importar eventos desde Google Calendar
 * @access Admin
 * @body { fecha_inicio, fecha_fin, auto_match?, create_missing_data?, dry_run? }
 */
router.post('/import', importFromGoogleCalendar);

/**
 * @route POST /api/google-calendar/sync-changes
 * @desc Sincronizar cambios desde Google Calendar
 * @access Admin
 */
router.post('/sync-changes', syncChangesFromGoogle);

/**
 * @route GET /api/google-calendar/pending-matches
 * @desc Obtener eventos pendientes de matching manual
 * @access Admin, Vet
 */
router.get('/pending-matches', getPendingMatches);

/**
 * @route POST /api/google-calendar/resolve-match/:id_cita
 * @desc Resolver matching manual para una cita
 * @access Admin
 * @body { id_cliente, id_mascota, id_veterinario }
 */
router.post('/resolve-match/:id_cita', resolveManualMatch);

/**
 * @route GET /api/google-calendar/scheduler/stats
 * @desc Obtener estadísticas del scheduler de sincronización
 * @access Admin
 */
router.get('/scheduler/stats', getSchedulerStats);

/**
 * @route POST /api/google-calendar/scheduler/run-sync
 * @desc Ejecutar sincronización manual del scheduler
 * @access Admin
 */
router.post('/scheduler/run-sync', runManualSync);

/**
 * @route GET /api/google-calendar/scheduler/status
 * @desc Obtener estado del scheduler
 * @access Admin
 */
router.get('/scheduler/status', getSchedulerStatus);

export default router;