import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from '../services/googleCalendar.js';
import bidirectionalSyncService from '../services/bidirectionalSyncService.js';
import syncScheduler from '../services/syncScheduler.js';

// Controlador simplificado integrado
class GoogleCalendarSimpleController {
  constructor() {
    this.ensureConfigSchema = this.ensureConfigSchema.bind(this);
    this.getDefaultSyncPreferences = this.getDefaultSyncPreferences.bind(this);
    this.normalizeSyncPreferences = this.normalizeSyncPreferences.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.saveConfig = this.saveConfig.bind(this);
    this.getAuthUrl = this.getAuthUrl.bind(this);
    this.handleCallback = this.handleCallback.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.testConnection = this.testConnection.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  async ensureConfigSchema() {
    // No-op: en despliegues nuevos, el schema canónico ya incluye sync_preferences.
    return true;
  }

  getDefaultSyncPreferences(tenantId = null) {
    const defaultGlobal = {
      prefijo_eventos: 'VetPlus',
      mapeo_colores: {
        consulta: '#2196f3',
        cirugia: '#f44336',
        vacunacion: '#4caf50',
        control: '#ff9800'
      },
      configuracion_eventos: {
        duracion_default: 30,
        recordatorio_default: 30,
        incluir_cliente: true,
        incluir_mascota: true,
        incluir_veterinario: true,
        invitar_propietario_calendario: false
      }
    };

    // Reglas especificas para tenant QI Animal.
    if (String(tenantId || '').toLowerCase() === '490957aa-d5f6-4441-be85-1aa5b2f92614') {
      return {
        prefijo_eventos: 'QI',
        mapeo_colores: {
          // Compatibilidad con UI actual
          consulta: '#46d6db',   // terapia (azul claro)
          cirugia: '#5484ed',    // hidroterapia (azul oscuro)
          vacunacion: '#51b749', // domicilio (verde)
          control: '#fbd75b',    // valoracion (amarillo)
          // Mapeo semantico de negocio
          domicilio: '#51b749',
          valoracion: '#fbd75b',
          terapia: '#46d6db',
          hidroterapia: '#5484ed'
        },
        configuracion_eventos: {
          duracion_default: 60,
          recordatorio_default: 30,
          incluir_cliente: true,
          incluir_mascota: true,
          incluir_veterinario: true,
          invitar_propietario_calendario: false
        }
      };
    }

    return defaultGlobal;
  }

  normalizeSyncPreferences(rawPreferences = {}, tenantId = null) {
    const defaults = this.getDefaultSyncPreferences(tenantId);
    const prefs = rawPreferences && typeof rawPreferences === 'object' ? rawPreferences : {};

    return {
      prefijo_eventos: String(prefs.prefijo_eventos || defaults.prefijo_eventos).slice(0, 30),
      mapeo_colores: {
        ...defaults.mapeo_colores,
        ...(prefs.mapeo_colores || {})
      },
      configuracion_eventos: {
        ...defaults.configuracion_eventos,
        ...(prefs.configuracion_eventos || {})
      }
    };
  }

  // Obtener configuración actual
  async getConfig(req, res) {
    try {
      await this.ensureConfigSchema();
      const tenantId = req.tenantId ?? req.user?.tenant_id;
      const tenantDefaults = this.getDefaultSyncPreferences(tenantId);
      const result = await query(`
        SELECT
          id_config,
          is_active as activo,
          client_id as cliente_id,
          (client_secret IS NOT NULL AND LENGTH(TRIM(client_secret)) > 0) as has_client_secret,
          calendar_id,
          timezone,
          notification_email as sync_automatico,
          default_reminder_minutes as intervalo_sync,
          sync_preferences,
          redirect_uri,
          created_at,
          updated_at
        FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
          AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            ...tenantDefaults,
            activo: false,
            cliente_id: '',
            has_client_secret: false,
            calendar_id: 'primary',
            sync_automatico: true,
            intervalo_sync: 30
          },
          message: 'No hay configuración'
        });
      }

      const row = result.rows[0];
      const syncPreferences = this.normalizeSyncPreferences(
        row.sync_preferences || {},
        tenantId
      );

      res.json({
        success: true,
        data: {
          ...row,
          prefijo_eventos: syncPreferences.prefijo_eventos,
          mapeo_colores: syncPreferences.mapeo_colores,
          configuracion_eventos: syncPreferences.configuracion_eventos
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Guardar configuración
  async saveConfig(req, res) {
    try {
      await this.ensureConfigSchema();
      const {
        activo,
        cliente_id,
        cliente_secret,
        calendar_id,
        sync_automatico,
        intervalo_sync,
        prefijo_eventos,
        mapeo_colores,
        configuracion_eventos
      } = req.body;

      const tenantId = req.tenantId ?? req.user?.tenant_id;

      const previousConfigResult = await query(
        `SELECT client_id, client_secret, sync_preferences,
                access_token, refresh_token, token_expiry,
                webhook_channel_id, webhook_url, webhook_expiration, webhook_resource_id,
                is_active
         FROM vetplus_auth.google_calendar_config
         WHERE is_active = true
           AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      );

      const previousConfig = previousConfigResult.rows[0] || null;
      const resolvedClientId = (typeof cliente_id === 'string' && cliente_id.trim().length > 0)
        ? cliente_id.trim()
        : previousConfig?.client_id;
      const resolvedClientSecret = (typeof cliente_secret === 'string' && cliente_secret.trim().length > 0)
        ? cliente_secret.trim()
        : previousConfig?.client_secret;
      const resolvedIsActive = typeof activo === 'boolean'
        ? activo
        : (previousConfig?.is_active ?? true);
      const credentialsChanged = Boolean(previousConfig) && (
        previousConfig.client_id !== resolvedClientId ||
        previousConfig.client_secret !== resolvedClientSecret
      );

      const mergedSyncPreferences = this.normalizeSyncPreferences({
        ...(previousConfig?.sync_preferences || {}),
        prefijo_eventos,
        mapeo_colores,
        configuracion_eventos
      }, tenantId);

      // Validar campos requeridos
      if (!resolvedClientId || !resolvedClientSecret) {
        return res.status(400).json({
          success: false,
          error: 'Client ID y Client Secret son requeridos'
        });
      }

      const redirect_uri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google-calendar/callback`;

      // Desactivar configuración anterior de este tenant
      await query(
        `UPDATE vetplus_auth.google_calendar_config SET is_active = false WHERE configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)`,
        [tenantId]
      );

      // Insertar nueva configuración (adaptando a las columnas existentes)
      const result = await query(`
        INSERT INTO vetplus_auth.google_calendar_config (
          client_id, client_secret, calendar_id,
          timezone, notification_email, default_reminder_minutes, redirect_uri, is_active, configured_by, sync_preferences,
          access_token, refresh_token, token_expiry,
          webhook_channel_id, webhook_url, webhook_expiration, webhook_resource_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        resolvedClientId,
        resolvedClientSecret,
        (typeof calendar_id === 'string' && calendar_id.trim().length > 0) ? calendar_id.trim() : 'primary',
        'America/Bogota',
        sync_automatico ?? false,
        Number.isFinite(Number(intervalo_sync)) ? Math.max(5, Number(intervalo_sync)) : 30,
        redirect_uri,
        resolvedIsActive,
        req.user?.id_usuario || null,
        JSON.stringify(mergedSyncPreferences),
        credentialsChanged ? null : (previousConfig?.access_token || null),
        credentialsChanged ? null : (previousConfig?.refresh_token || null),
        credentialsChanged ? null : (previousConfig?.token_expiry || null),
        previousConfig?.webhook_channel_id || null,
        previousConfig?.webhook_url || null,
        previousConfig?.webhook_expiration || null,
        previousConfig?.webhook_resource_id || null
      ]);

      await googleCalendarService.reinitializeWithConfig(result.rows[0]);
      await syncScheduler.restart();

      // Formatear respuesta para el frontend
      const responseData = {
        id_config: result.rows[0].id_config,
        activo: result.rows[0].is_active,
        cliente_id: result.rows[0].client_id,
        has_client_secret: Boolean(result.rows[0].client_secret),
        calendar_id: result.rows[0].calendar_id,
        sync_automatico: result.rows[0].notification_email,
        intervalo_sync: result.rows[0].default_reminder_minutes,
        prefijo_eventos: mergedSyncPreferences.prefijo_eventos,
        mapeo_colores: mergedSyncPreferences.mapeo_colores,
        configuracion_eventos: mergedSyncPreferences.configuracion_eventos,
        redirect_uri: result.rows[0].redirect_uri
      };

      res.json({
        success: true,
        data: responseData,
        message: 'Configuración guardada correctamente'
      });
    } catch (error) {
      console.error('Error guardando configuración:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener URL de autorización
  async getAuthUrl(req, res) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenant_id;
      const configResult = await query(`
        SELECT client_id, redirect_uri
        FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
          AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);

      if (configResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay configuración válida'
        });
      }

      const { client_id, redirect_uri } = configResult.rows[0];

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `access_type=offline&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events')}&` +
        `prompt=consent&` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(client_id)}&` +
        `redirect_uri=${encodeURIComponent(redirect_uri)}`;

      res.json({
        success: true,
        authUrl: authUrl
      });
    } catch (error) {
      console.error('Error generando URL de autorización:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Callback de autorización (simplificado)
  async handleCallback(req, res) {
    try {
      const { code, error } = req.query;

      if (error) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - Ramelo</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; font-size: 18px; }
              .close-btn {
                background: #1976d2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 20px;
              }
              .close-btn:hover { background: #1565c0; }
            </style>
          </head>
          <body>
            <h2>❌ Error de Autorización</h2>
            <p class="error">Error: ${error}</p>
            <p>Puedes cerrar esta ventana y intentar nuevamente.</p>
            <button class="close-btn" id="closeErrorBtn2">Cerrar Ventana</button>
            <script>
              function closeWindow() {
                try {
                  window.close();
                  setTimeout(() => {
                    if (!window.closed) {
                      window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                    }
                  }, 100);
                } catch (e) {
                  console.error('Error cerrando ventana:', e);
                  window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                }
              }

              // Configurar event listener para botón (sin usar onclick para evitar CSP)
              const closeErrorBtn2 = document.getElementById('closeErrorBtn2');
              if (closeErrorBtn2) {
                closeErrorBtn2.addEventListener('click', closeWindow);
              }

              // Auto-cerrar después de 5 segundos
              setTimeout(closeWindow, 5000);

              // Permitir cerrar con Escape
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                  closeWindow();
                }
              });
            </script>
          </body>
          </html>
        `);
      }

      if (!code) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - Ramelo</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; font-size: 18px; }
              .close-btn {
                background: #1976d2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 20px;
              }
              .close-btn:hover { background: #1565c0; }
            </style>
          </head>
          <body>
            <h2>❌ Error</h2>
            <p class="error">No se recibió código de autorización.</p>
            <p>Puedes cerrar esta ventana y intentar nuevamente.</p>
            <button class="close-btn" id="closeErrorBtn">Cerrar Ventana</button>
            <script>
              function closeWindow() {
                try {
                  window.close();
                  setTimeout(() => {
                    if (!window.closed) {
                      window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                    }
                  }, 100);
                } catch (e) {
                  console.error('Error cerrando ventana:', e);
                  window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar';
                }
              }

              // Configurar event listener para botón (sin usar onclick para evitar CSP)
              const closeErrorBtn = document.getElementById('closeErrorBtn');
              if (closeErrorBtn) {
                closeErrorBtn.addEventListener('click', closeWindow);
              }

              // Auto-cerrar después de 5 segundos
              setTimeout(closeWindow, 5000);

              // Permitir cerrar con Escape
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                  closeWindow();
                }
              });
            </script>
          </body>
          </html>
        `);
      }

      // Obtener configuración
      const configResult = await query(`
        SELECT * FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (configResult.rows.length === 0) {
        throw new Error('No se encontró configuración válida');
      }

      const config = configResult.rows[0];

      // Intercambiar código por tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: config.redirect_uri,
          grant_type: 'authorization_code'
        })
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokens.error_description || 'Error obteniendo tokens');
      }

      // Guardar tokens en la configuración
      await query(`
        UPDATE vetplus_auth.google_calendar_config
        SET
          access_token = $1,
          refresh_token = $2,
          token_expiry = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
      `, [
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      ]);

      const updatedConfigResult = await query(`
        SELECT *
        FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (updatedConfigResult.rows[0]) {
        await googleCalendarService.reinitializeWithConfig(updatedConfigResult.rows[0]);
        await syncScheduler.restart();
      }

      // Página de éxito simplificada sin JavaScript inline (compatible con CSP)
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Autorización Exitosa - Ramelo</title>
          <meta http-equiv="refresh" content="5;url=${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(10px);
              max-width: 500px;
              margin: 0 auto;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            .success { color: #4CAF50; font-size: 24px; font-weight: bold; }
            .message { font-size: 16px; margin: 20px 0; }
            .countdown {
              font-size: 18px;
              color: #FFD700;
              font-weight: bold;
              margin: 20px 0;
            }
            .manual-actions {
              margin-top: 30px;
            }
            .action-link {
              display: inline-block;
              background: #4CAF50;
              color: white;
              text-decoration: none;
              padding: 15px 30px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              transition: all 0.3s ease;
              margin: 10px;
            }
            .action-link:hover {
              background: #45a049;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .secondary-link {
              background: #2196F3;
            }
            .secondary-link:hover {
              background: #1976D2;
            }
            .status {
              font-size: 14px;
              color: #E0E0E0;
              margin-top: 20px;
            }
            .help-text {
              font-size: 12px;
              color: #B0B0B0;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h2 class="success">¡Autorización Exitosa!</h2>
            <p class="message">Google Calendar se ha conectado correctamente a Ramelo.</p>
            <p class="countdown">Redirigiendo automáticamente en 5 segundos...</p>

            <div class="manual-actions">
              <a href="javascript:window.close()" class="action-link">Cerrar Ventana</a>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/configuracion/google-calendar" class="action-link secondary-link">Ir a Ramelo</a>
            </div>

            <div class="status">Configuración completada exitosamente</div>
            <div class="help-text">
              Si la ventana no se cierra automáticamente, use los botones de arriba.<br>
              También puede presionar Escape para cerrar.
            </div>
          </div>

          <!-- Script externo para funcionalidades básicas -->
          <script src="/api/google-calendar/static/callback-script.js"></script>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Error en callback:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - Ramelo</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; font-size: 18px; }
          </style>
        </head>
        <body>
          <h2>❌ Error Procesando Autorización</h2>
          <p class="error">${error.message}</p>
          <p>Puedes cerrar esta ventana y intentar nuevamente.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
        </html>
      `);
    }
  }

  // Obtener estado de conexión
  async getStatus(req, res) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenant_id;
      const result = await query(`
        SELECT
          is_active as activo,
          access_token,
          refresh_token,
          token_expiry,
          calendar_id,
          updated_at
        FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
          AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            conectado: false,
            ultimo_sync: 'Nunca',
            eventos_sincronizados: 0,
            errores_recientes: [],
            calendario_info: {
              nombre: 'No configurado',
              descripcion: 'No hay configuración',
              zona_horaria: 'UTC'
            }
          }
        });
      }

      const config = result.rows[0];
      const hasTokens = config.access_token && config.refresh_token;
      const isActive = config.activo;

      res.json({
        success: true,
        data: {
          conectado: hasTokens && isActive,
          ultimo_sync: config.updated_at || 'Nunca',
          eventos_sincronizados: 0,
          errores_recientes: hasTokens ? [] : ['No autorizado'],
          calendario_info: {
            nombre: config.calendar_id || 'primary',
            descripcion: hasTokens ? 'Conectado' : 'No autorizado',
            zona_horaria: 'UTC'
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Probar conexión
  async testConnection(req, res) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenant_id;
      const configResult = await query(`
        SELECT * FROM vetplus_auth.google_calendar_config
        WHERE is_active = true
          AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);

      if (configResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay configuración válida'
        });
      }

      const config = configResult.rows[0];

      if (!config.access_token) {
        return res.status(400).json({
          success: false,
          message: 'No está autorizado con Google'
        });
      }

      // Probar llamada a Google Calendar API
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${config.calendar_id || 'primary'}`,
        {
          headers: {
            'Authorization': `Bearer ${config.access_token}`
          }
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        res.json({
          success: true,
          message: 'Conexión exitosa',
          calendar: {
            name: calendarData.summary,
            timezone: calendarData.timeZone
          }
        });
      } else {
        res.json({
          success: false,
          message: 'Error conectando con Google Calendar'
        });
      }

    } catch (error) {
      console.error('Error probando conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Desconectar
  async disconnect(req, res) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenant_id;
      await query(`
        UPDATE vetplus_auth.google_calendar_config
        SET
          is_active = false,
          access_token = NULL,
          refresh_token = NULL,
          token_expiry = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
          AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
      `, [tenantId]);

      res.json({
        success: true,
        message: 'Google Calendar desconectado correctamente'
      });
    } catch (error) {
      console.error('Error desconectando:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

export const googleCalendarSimpleController = new GoogleCalendarSimpleController();

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

        const tenantId = req.tenantId ?? req.user?.tenant_id;

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
              AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
            ORDER BY created_at DESC 
            LIMIT 1
        `, [tenantId]);

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
        const tenantId = req.tenantId ?? req.user?.tenant_id;

        console.log('🗃️ Desactivando configuración anterior...');
        // Desactivar configuración anterior si existe
        await query(`UPDATE vetplus_auth.google_calendar_config SET is_active = false WHERE configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)`, [tenantId]);

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

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        // Actualizar configuración con los tokens
        const updateResult = await query(`
            UPDATE vetplus_auth.google_calendar_config 
            SET 
                refresh_token = $1,
                access_token = $2,
                token_expiry = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE is_active = true
              AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $4)
            RETURNING *
        `, [
            tokenResult.tokens.refresh_token,
            tokenResult.tokens.access_token,
            tokenResult.tokens.expiry_date ? new Date(tokenResult.tokens.expiry_date) : null,
            tenantId
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

        const tenantId = req.tenantId ?? req.user?.tenant_id;
        await query(`UPDATE vetplus_auth.google_calendar_config SET is_active = false WHERE configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)`, [tenantId]);

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
    // Admin, veterinario y auxiliar pueden ver estadísticas del scheduler
    if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
        message: 'No tienes permisos para ver estadísticas del scheduler'
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
    // Admin, veterinario y auxiliar pueden ejecutar sincronización manual
    if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
        message: 'No tienes permisos para ejecutar sincronización manual'
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
    // Admin, veterinario y auxiliar pueden ver el estado del scheduler
    if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
        message: 'No tienes permisos para ver el estado del scheduler'
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
        // Admin, veterinario y auxiliar pueden ver el estado
        if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver el estado de sincronización'
            });
        }

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const currentConfigResult = await query(`
            SELECT refresh_token
            FROM vetplus_auth.google_calendar_config
            WHERE is_active = true
              AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
            ORDER BY created_at DESC
            LIMIT 1
        `, [tenantId]);

        const currentConfig = currentConfigResult.rows[0] || null;
        const hasCurrentGoogleToken = Boolean(currentConfig?.refresh_token);

        const statsResult = await query(`
            SELECT
                google_sync_status,
                COUNT(*) as cantidad
            FROM clinical.calendario_citas
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
              AND id_tenant = $1
            GROUP BY google_sync_status
        `, [tenantId]);

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
            AND c.id_tenant = $1
            AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY c.last_google_sync DESC
            LIMIT 10
        `, [tenantId]);

        const authIssueResult = await query(`
          SELECT
            created_at,
            response_data
          FROM system.activity_log
          WHERE tipo_actividad = 'SYNC_CALENDAR'
            AND descripcion IN ('google_calendar_sync:auto_sync_error', 'google_calendar_sync:manual_sync_error')
            AND created_at >= NOW() - INTERVAL '72 hours'
          ORDER BY created_at DESC
          LIMIT 1
        `);

        let googleAuth = {
          requires_reauth: false,
          code: null,
          message: null,
          last_error_at: null
        };

        if (authIssueResult.rows.length > 0) {
          const row = authIssueResult.rows[0];
          const payload = row.response_data && typeof row.response_data === 'object'
            ? row.response_data
            : {};

          const rawCode = String(payload?.code || '').toUpperCase();
          const rawError = String(payload?.error || '').toLowerCase();
          const requiresReauth = payload?.requires_reauth === true
            || rawCode === 'GOOGLE_REAUTH_REQUIRED'
            || rawError.includes('invalid_grant');

          if (requiresReauth && !hasCurrentGoogleToken) {
            googleAuth = {
              requires_reauth: true,
              code: rawCode || 'GOOGLE_REAUTH_REQUIRED',
              message: payload?.error || 'La autorización de Google Calendar expiró o fue revocada.',
              last_error_at: row.created_at
            };
          }
        }

        res.json({
            success: true,
            data: {
                stats: statsResult.rows,
            recent_errors: recentErrorsResult.rows,
            google_auth: googleAuth
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
 * Diagnóstico de sincronización con Google Calendar
 */
export const diagnoseGoogleCalendarSync = async (req, res) => {
    try {
        // Solo administradores pueden hacer diagnóstico
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ejecutar diagnóstico'
            });
        }

        console.log('🔍 Iniciando diagnóstico de sincronización con Google Calendar...');

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const diagnostic = {
            connection_status: null,
            calendar_events: null,
            vetplus_events: null,
            last_sync_info: null,
            configuration: null
        };

        // 1. Verificar conexión
        console.log('📡 Probando conexión...');
        const connectionTest = await googleCalendarService.testConnection();
        diagnostic.connection_status = connectionTest;

        if (!connectionTest.success) {
            return res.json({
                success: true,
                diagnostic,
                message: 'Conexión fallida - revisar configuración'
            });
        }

        // 2. Obtener configuración
        console.log('⚙️ Obteniendo configuración...');
        const configResult = await query(`
            SELECT
                calendar_id,
                timezone,
                is_active,
                refresh_token IS NOT NULL as has_refresh_token,
                created_at,
                updated_at
            FROM vetplus_auth.google_calendar_config
            WHERE is_active = true
              AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
            LIMIT 1
        `, [tenantId]);
        diagnostic.configuration = configResult.rows[0] || null;

        // 3. Obtener información de última sincronización
        console.log('📅 Obteniendo información de última sincronización...');
        const lastSyncResult = await query(`
            SELECT
                COALESCE(MAX(last_google_sync), CURRENT_TIMESTAMP - INTERVAL '1 day') as last_sync,
                COUNT(*) as total_citas_sync,
                COUNT(CASE WHEN google_event_id IS NOT NULL THEN 1 END) as citas_con_event_id
            FROM clinical.calendario_citas
            WHERE (google_event_id IS NOT NULL OR created_at >= CURRENT_DATE - INTERVAL '7 days')
              AND id_tenant = $1
        `, [tenantId]);
        diagnostic.last_sync_info = lastSyncResult.rows[0];

        // 4. Listar eventos recientes de Google Calendar (últimos 7 días)
        console.log('📅 Listando eventos recientes de Google Calendar...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 días atrás

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 días adelante

        const eventsResult = await googleCalendarService.listEvents(
            startDate.toISOString(),
            endDate.toISOString()
        );

        if (eventsResult.success) {
            diagnostic.calendar_events = {
                total: eventsResult.events.length,
                sample_events: eventsResult.events.slice(0, 5).map(event => ({
                    id: event.id,
                    summary: event.summary,
                    start: event.start,
                    status: event.status,
                    updated: event.updated
                }))
            };

            // 5. Filtrar eventos que serían considerados de VetPlus
            const vetEvents = eventsResult.events.filter(event => {
                const summary = event.summary || '';
                const description = event.description || '';

                return summary.includes('VetPlus') ||
                       summary.includes('Cita') ||
                       summary.includes('Consulta') ||
                       description.includes('VetPlus') ||
                       description.includes('Código de cita:');
            });

            diagnostic.vetplus_events = {
                total: vetEvents.length,
                sample_events: vetEvents.slice(0, 3).map(event => ({
                    id: event.id,
                    summary: event.summary,
                    description: event.description?.substring(0, 100) + '...',
                    start: event.start,
                    status: event.status
                }))
            };
        } else {
            diagnostic.calendar_events = {
                error: eventsResult.error
            };
        }

        console.log('✅ Diagnóstico completado');

        res.json({
            success: true,
            diagnostic,
            recommendations: diagnostic.vetplus_events?.total === 0 ? [
                'No se encontraron eventos de VetPlus en Google Calendar',
                'Asegúrate de que los eventos contengan palabras clave como "VetPlus", "Cita" o "Consulta"',
                'Verifica que estés consultando el calendario correcto',
                'Considera crear un evento de prueba con "VetPlus" en el título'
            ] : [
                'Eventos encontrados correctamente',
                'La sincronización debería funcionar'
            ]
        });

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
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
    // Admin, veterinario y auxiliar pueden importar
    if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
        message: 'No tienes permisos para importar desde Google Calendar'
            });
        }

        const {
            fecha_inicio,
            fecha_fin,
            auto_match = true,
          create_missing_data = true,
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
            dryRun: dry_run,
            tenantId: req.tenantId ?? req.user?.tenant_id ?? null
            }
        );

        if (!importResult.success) {
          const statusCode = Number.isFinite(Number(importResult?.status))
            ? Number(importResult.status)
            : 500;

          return res.status(statusCode).json({
                success: false,
                message: 'Error importando desde Google Calendar',
            error: importResult.error,
            code: importResult.code,
            requires_reauth: importResult.requires_reauth === true
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
        // Admin, veterinario y auxiliar pueden sincronizar cambios
        if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
            message: 'No tienes permisos para sincronizar cambios'
            });
        }

        const {
            only_today = true,
            start_date = null,
            end_date = null
        } = req.body || {};

        // Si llega un rango explícito, priorizar sincronización por rango.
        const hasExplicitRange = Boolean(start_date && end_date);
        const effectiveOnlyToday = hasExplicitRange ? false : Boolean(only_today);

        const syncResult = await bidirectionalSyncService.syncChangesFromGoogle({
          onlyToday: effectiveOnlyToday,
          startDate: start_date,
          endDate: end_date,
          tenantId: req.tenantId ?? req.user?.tenant_id ?? null
        });

        if (!syncResult.success) {
          const statusCode = Number.isFinite(Number(syncResult?.status))
            ? Number(syncResult.status)
            : 500;

          return res.status(statusCode).json({
                success: false,
                message: 'Error sincronizando cambios desde Google Calendar',
            error: syncResult.error,
            code: syncResult.code,
            requires_reauth: syncResult.requires_reauth === true
            });
        }

        res.json({
            success: true,
          message: effectiveOnlyToday
            ? 'Sincronización de cambios de hoy completada'
            : 'Sincronización de cambios por rango completada',
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

/**
 * Importar eventos de Google Calendar como citas en VetPlus
 */
export const importGoogleEventsToVetPlus = async (req, res) => {
    try {
    // Admin, veterinario y auxiliar pueden importar
    if (!['admin', 'vet', 'aux'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
        message: 'No tienes permisos para importar eventos a VetPlus'
            });
        }

        const {
            fecha_inicio,
            fecha_fin,
            create_missing_data = false,
            dry_run = false
        } = req.body;

        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son obligatorias'
            });
        }

        // 1. Obtener eventos de Google Calendar
        const eventsResult = await googleCalendarService.listEvents(fecha_inicio, fecha_fin);

        if (!eventsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Error obteniendo eventos de Google Calendar',
                error: eventsResult.error
            });
        }

        // 2. Filtrar eventos que parecen ser de VetPlus
        const vetEvents = eventsResult.events.filter(event => {
            const summary = event.summary || '';
            const description = event.description || '';

            return summary.includes('VetPlus') ||
                   summary.includes('Cita') ||
                   summary.includes('Consulta') ||
                   summary.includes('Veterinaria') ||
                   description.includes('VetPlus') ||
                   description.includes('Código de cita:');
        });

        const results = {
            total_events: eventsResult.events.length,
            vetplus_events: vetEvents.length,
            imported: 0,
            skipped: 0,
            errors: 0,
            details: []
        };

        // 3. Procesar cada evento
        for (const event of vetEvents) {
            try {
                console.log(`🔄 Procesando evento: ${event.summary}`);

                // Extraer información del evento
                const eventData = parseVetPlusEvent(event);

                if (!eventData) {
                    console.log(`⚠️ Evento no válido: ${event.summary}`);
                    results.details.push({
                        event_id: event.id,
                        summary: event.summary,
                        status: 'skipped',
                        reason: 'No se pudo parsear la información del evento'
                    });
                    results.skipped++;
                    continue;
                }

                // Verificar si ya existe una cita con este event_id
                const existingCita = await query(`
                    SELECT id_cita, codigo_cita
                    FROM clinical.calendario_citas
                    WHERE google_event_id = $1
                `, [event.id]);

                if (existingCita.rows.length > 0) {
                    console.log(`⏭️ Cita ya existe: ${existingCita.rows[0].codigo_cita}`);
                    results.details.push({
                        event_id: event.id,
                        summary: event.summary,
                        status: 'skipped',
                        reason: 'Cita ya existe en VetPlus',
                        existing_cita: existingCita.rows[0].codigo_cita
                    });
                    results.skipped++;
                    continue;
                }

                // Verificar datos requeridos
                if (!eventData.id_mascota && !create_missing_data) {
                    console.log(`⚠️ Mascota no encontrada y create_missing_data=false: ${event.summary}`);
                    results.details.push({
                        event_id: event.id,
                        summary: event.summary,
                        status: 'skipped',
                        reason: 'Mascota no encontrada y creación de datos faltantes deshabilitada'
                    });
                    results.skipped++;
                    continue;
                }

                if (!dry_run) {
                    // Crear la cita en VetPlus
                    const citaResult = await createCitaFromEvent(event, eventData, req.user.id_usuario);

                    results.details.push({
                        event_id: event.id,
                        summary: event.summary,
                        status: 'imported',
                        nueva_cita: citaResult.codigo_cita,
                        id_cita: citaResult.id_cita
                    });
                    results.imported++;
                } else {
                    results.details.push({
                        event_id: event.id,
                        summary: event.summary,
                        status: 'would_import',
                        event_data: eventData
                    });
                    results.imported++;
                }

            } catch (error) {
                console.error(`❌ Error procesando evento ${event.id}:`, error);
                results.details.push({
                    event_id: event.id,
                    summary: event.summary,
                    status: 'error',
                    error: error.message
                });
                results.errors++;
            }
        }

        console.log('✅ Importación completada:', results);

        res.json({
            success: true,
            message: dry_run ? 'Simulación de importación completada' : 'Importación completada exitosamente',
            data: results,
            dry_run
        });

    } catch (error) {
        console.error('❌ Error importando eventos a VetPlus:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Función auxiliar para parsear información de eventos de VetPlus
 */
function parseVetPlusEvent(event) {
    const summary = event.summary || '';
    const description = event.description || '';

    // Intentar extraer información de la descripción
    const mascotaMatch = description.match(/🐕 Mascota: ([^\n]+)/);
    const clienteMatch = description.match(/👤 Cliente: ([^\n]+)/);
    const veterinarioMatch = description.match(/👨‍⚕️ Veterinario: ([^\n]+)/);
    const codigoMatch = description.match(/Código de cita: ([^\n]+)/);

    let eventData = {
        tipo: 'consulta_general',
        motivo: summary,
        notas: description,
        fecha_inicio: event.start.dateTime || event.start.date,
        fecha_fin: event.end.dateTime || event.end.date,
        google_event_id: event.id
    };

    // Determinar tipo de cita basado en el título
    if (summary.toLowerCase().includes('cirugía') || summary.toLowerCase().includes('cirugia')) {
        eventData.tipo = 'cirugia';
    } else if (summary.toLowerCase().includes('vacunación') || summary.toLowerCase().includes('vacuna')) {
        eventData.tipo = 'vacunacion';
    } else if (summary.toLowerCase().includes('control')) {
        eventData.tipo = 'control';
    }

    // Buscar mascota por nombre si está en la descripción
    if (mascotaMatch) {
        const mascotaNombre = mascotaMatch[1].trim();
        // Buscar mascota en BD
        // Nota: Esta búsqueda se hace en el contexto de createCitaFromEvent
        eventData.mascota_nombre = mascotaNombre;
    }

    // Buscar cliente por nombre
    if (clienteMatch) {
        const clienteNombre = clienteMatch[1].trim();
        eventData.cliente_nombre = clienteNombre;
    }

    // Buscar veterinario por nombre
    if (veterinarioMatch) {
        const veterinarioNombre = veterinarioMatch[1].trim();
        eventData.veterinario_nombre = veterinarioNombre;
    }

    return eventData;
}

/**
 * Función auxiliar para crear cita desde evento
 */
async function createCitaFromEvent(event, eventData, createdBy) {
    // Buscar o crear datos faltantes
    let id_mascota = null;
    let id_cliente = null;
    let id_veterinario = null;

    // Buscar mascota
    if (eventData.mascota_nombre) {
        const mascotaResult = await query(`
            SELECT m.id_mascota, m.id_cliente
            FROM clinical.mascotas m
            WHERE LOWER(m.nombre) = LOWER($1)
            LIMIT 1
        `, [eventData.mascota_nombre]);

        if (mascotaResult.rows.length > 0) {
            id_mascota = mascotaResult.rows[0].id_mascota;
            id_cliente = mascotaResult.rows[0].id_cliente;
        }
    }

    // Buscar veterinario
    if (eventData.veterinario_nombre) {
        const vetResult = await query(`
            SELECT id_usuario
            FROM vetplus_auth.usuarios
            WHERE LOWER(nombre) = LOWER($1) AND rol IN ('vet', 'admin')
            LIMIT 1
        `, [eventData.veterinario_nombre]);

        if (vetResult.rows.length > 0) {
            id_veterinario = vetResult.rows[0].id_usuario;
        }
    }

    // Generar código de cita único
    const codigo_cita = `GC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Crear la cita
    const citaResult = await query(`
        INSERT INTO clinical.calendario_citas (
            codigo_cita,
            id_mascota,
            id_cliente,
            id_veterinario,
            fecha_inicio,
            fecha_fin,
            tipo,
            motivo,
            notas,
            estado,
            google_event_id,
            google_sync_status,
            created_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9 || ' | Importado desde Google Calendar',
            'confirmada', $10, 'synced', $11
        )
        RETURNING id_cita, codigo_cita
    `, [
        codigo_cita,
        id_mascota,
        id_cliente,
        id_veterinario,
        eventData.fecha_inicio,
        eventData.fecha_fin,
        eventData.tipo,
        eventData.motivo,
        eventData.notas,
        event.google_event_id || event.id,
        createdBy
    ]);

    return citaResult.rows[0];
}

// Servir archivo JavaScript estático para callback (compatible con CSP)
export const serveCallbackScript = async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

  res.send(`
    console.log('🎯 Script de callback de Google Calendar cargado');

    // Función para comunicar con la ventana padre
    function communicateWithParent() {
      try {
        // Método 1: postMessage (funciona si es same-origin)
        if (window.opener && !window.opener.closed) {
          console.log('📤 Enviando mensaje a ventana padre');
          window.opener.postMessage({
            type: 'google-calendar-success',
            success: true,
            message: 'Google Calendar configurado exitosamente',
            timestamp: new Date().toISOString()
          }, '*');
        }

        // Método 2: localStorage (funciona cross-origin)
        try {
          localStorage.setItem('vetplus-google-auth-success', JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Google Calendar configurado exitosamente'
          }));
          console.log('💾 Datos guardados en localStorage');
        } catch (e) {
          console.warn('⚠️ No se pudo usar localStorage:', e.message);
        }

        // Método 3: sessionStorage
        try {
          sessionStorage.setItem('vetplus-google-auth-success', JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Google Calendar configurado exitosamente'
          }));
          console.log('💾 Datos guardados en sessionStorage');
        } catch (e) {
          console.warn('⚠️ No se pudo usar sessionStorage:', e.message);
        }

        return true;
      } catch (e) {
        console.error('❌ Error en comunicación:', e);
        return false;
      }
    }

    // Función para intentar cerrar la ventana
    function attemptClose() {
      try {
        console.log('🚪 Intentando cerrar ventana');
        window.close();

        // Verificar si se cerró después de un delay
        setTimeout(() => {
          if (!window.closed) {
            console.log('⚠️ Ventana no se cerró automáticamente');
          } else {
            console.log('✅ Ventana cerrada exitosamente');
          }
        }, 500);

      } catch (e) {
        console.error('❌ Error cerrando ventana:', e);
      }
    }

    // Comunicar inmediatamente al cargar
    communicateWithParent();

    // Intentar cerrar después de un breve delay
    setTimeout(attemptClose, 100);

    // Permitir cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        console.log('⎋ Tecla Escape presionada');
        attemptClose();
      }
    });

    console.log('✅ Script de callback inicializado');
  `);
};