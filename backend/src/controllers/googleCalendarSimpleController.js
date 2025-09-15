import { query } from '../config/database.js';

class GoogleCalendarSimpleController {

  // Obtener configuración actual
  async getConfig(req, res) {
    try {
      const result = await query(`
        SELECT 
          is_active as activo,
          client_id as cliente_id,
          client_secret as cliente_secret,
          calendar_id,
          timezone,
          notification_email as sync_automatico,
          redirect_uri,
          created_at,
          updated_at
        FROM vetplus_auth.google_calendar_config 
        WHERE is_active = true
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No hay configuración'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
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
      const {
        activo,
        cliente_id,
        cliente_secret,
        calendar_id,
        sync_automatico,
        prefijo_eventos
      } = req.body;

      // Validar campos requeridos
      if (!cliente_id || !cliente_secret) {
        return res.status(400).json({
          success: false,
          error: 'Client ID y Client Secret son requeridos'
        });
      }

      const redirect_uri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google-calendar/callback`;

      // Desactivar configuración anterior
      await query(`UPDATE vetplus_auth.google_calendar_config SET is_active = false WHERE is_active = true`);

      // Insertar nueva configuración (adaptando a las columnas existentes)
      const result = await query(`
        INSERT INTO vetplus_auth.google_calendar_config (
          client_id, client_secret, calendar_id, 
          timezone, notification_email, redirect_uri, is_active, configured_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        cliente_id,
        cliente_secret,
        calendar_id || 'primary',
        'UTC', // timezone por defecto
        sync_automatico || false, // usando notification_email como sync_automatico
        redirect_uri,
        activo || false, // usando is_active
        req.user?.id_usuario || null // configured_by
      ]);

      // Formatear respuesta para el frontend
      const responseData = {
        activo: result.rows[0].is_active,
        cliente_id: result.rows[0].client_id,
        cliente_secret: result.rows[0].client_secret,
        calendar_id: result.rows[0].calendar_id,
        sync_automatico: result.rows[0].notification_email,
        prefijo_eventos: '[VetPlus]', // valor por defecto
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
      const configResult = await query(`
        SELECT client_id, redirect_uri 
        FROM vetplus_auth.google_calendar_config 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

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
            <title>Error - VetPlus</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; font-size: 18px; }
            </style>
          </head>
          <body>
            <h2>❌ Error de Autorización</h2>
            <p class="error">Error: ${error}</p>
            <p>Puedes cerrar esta ventana y intentar nuevamente.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
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
            <title>Error - VetPlus</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; font-size: 18px; }
            </style>
          </head>
          <body>
            <h2>❌ Error</h2>
            <p class="error">No se recibió código de autorización.</p>
            <p>Puedes cerrar esta ventana y intentar nuevamente.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
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

      // Página de éxito simple
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Autorización Exitosa - VetPlus</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #2e7d32; font-size: 18px; }
            .countdown { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <h2>✅ Autorización Exitosa</h2>
          <p class="success">Google Calendar se ha conectado correctamente.</p>
          <p class="countdown">Esta ventana se cerrará automáticamente en <span id="countdown">3</span> segundos.</p>
          <script>
            let count = 3;
            const countdownElement = document.getElementById('countdown');
            
            const timer = setInterval(() => {
              count--;
              countdownElement.textContent = count;
              
              if (count <= 0) {
                clearInterval(timer);
                window.close();
              }
            }, 1000);
          </script>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Error en callback:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - VetPlus</title>
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
        ORDER BY created_at DESC 
        LIMIT 1
      `);

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
      const configResult = await query(`
        SELECT * FROM vetplus_auth.google_calendar_config 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

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
      await query(`
        UPDATE vetplus_auth.google_calendar_config 
        SET 
          is_active = false,
          access_token = NULL,
          refresh_token = NULL,
          token_expiry = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
      `);

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

export default new GoogleCalendarSimpleController();
