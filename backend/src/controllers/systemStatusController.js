/**
 * @fileoverview Controlador para estado general del sistema
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import { query } from '../config/database.js';

/**
 * @swagger
 * tags:
 *   name: Estado del Sistema
 *   description: Gestión del estado general del sistema y sus módulos
 */

/**
 * Obtener estado general del sistema
 * @route GET /api/system/status
 */
export const getSystemStatus = async (req, res) => {
    try {
        // Solo administradores pueden acceder
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta información'
            });
        }

        const status = {
            empresa: await checkEmpresaStatus(),
            google_calendar: await checkGoogleCalendarStatus(),
          correo: await checkCorreoStatus(),
            sistema: await checkSistemaStatus()
        };

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Error obteniendo estado del sistema:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

/**
 * Verificar estado de configuración de empresa
 */
async function checkEmpresaStatus() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as configurado,
        CASE 
          WHEN COUNT(*) > 0 THEN 'Configurado'
          ELSE 'Pendiente'
        END as estado
      FROM system.configuracion_empresa 
      WHERE activa = true
    `);
    
    return {
      estado: result.rows[0].estado || 'Error',
      configurado: result.rows[0].configurado > 0,
      mensaje: result.rows[0].configurado > 0 ? 'Empresa configurada correctamente' : 'Configuración de empresa pendiente'
    };
  } catch (error) {
    console.error('Error verificando estado de empresa:', error);
    return {
      estado: 'Error',
      configurado: false,
      mensaje: 'Error al verificar configuración de empresa'
    };
  }
}/**
 * Verificar estado de Google Calendar
 */
async function checkGoogleCalendarStatus() {
  try {
    const result = await query(`
      SELECT 
        is_active as activo,
        refresh_token,
        access_token,
        calendar_id,
        CASE 
          WHEN is_active = true AND refresh_token IS NOT NULL THEN 'Conectado'
          WHEN is_active = false THEN 'Desconectado'
          ELSE 'Pendiente'
        END as estado
      FROM vetplus_auth.google_calendar_config
      WHERE is_active = true
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return {
        estado: 'Pendiente',
        conectado: false,
        mensaje: 'Google Calendar no configurado'
      };
    }
    
    const config = result.rows[0];
    
    return {
      estado: config.estado,
      conectado: config.activo && config.refresh_token !== null,
      mensaje: config.estado === 'Conectado' ? 'Google Calendar conectado correctamente' : 'Google Calendar no conectado'
    };
  } catch (error) {
    console.error('Error verificando estado de Google Calendar:', error);
    return {
      estado: 'Error',
      conectado: false,
      mensaje: 'Error al verificar conexión con Google Calendar'
    };
  }
}/**
 * Verificar estado de configuración de correo SMTP
 */
async function checkCorreoStatus() {
  try {
    const result = await query(`
      SELECT
        auth_mode,
        oauth_refresh_token
      FROM system.configuracion_correo
      WHERE activa = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = result.rows[0] || null;

    if (!row) {
      return {
        estado: 'Pendiente',
        configurado: false,
        mensaje: 'Configuración de correo pendiente'
      };
    }

    // Caso 2: Gmail OAuth solo cuenta como configurado si existe refresh token.
    const isGmailOAuth = (row.auth_mode || 'smtp') === 'gmail_oauth';
    const isConnected = Boolean(row.oauth_refresh_token);

    const configurado = isGmailOAuth ? isConnected : true;

    return {
      estado: configurado ? 'Configurado' : 'Pendiente',
      configurado,
      mensaje: configurado
        ? 'Correo configurado correctamente'
        : 'Google OAuth de correo no está conectado'
    };
  } catch (error) {
    // Si la tabla aún no existe, mostrar pendiente en vez de romper el endpoint.
    if (error?.code === '42P01') {
      return {
        estado: 'Pendiente',
        configurado: false,
        mensaje: 'Módulo de correo pendiente de migración'
      };
    }

    console.error('Error verificando estado de Correo SMTP:', error);
    return {
      estado: 'Error',
      configurado: false,
      mensaje: 'Error al verificar configuración de correo SMTP'
    };
  }
}
/**
 * Verificar estado general del sistema
 */
async function checkSistemaStatus() {
  try {
    // Verificar versión de la base de datos
    const dbVersion = await query('SELECT version()');
    
    // Verificar última actividad del sistema
    const lastActivity = await query(`
      SELECT
        COUNT(*) as total_logs,
        MAX(fecha) as ultima_actividad
      FROM system.log_auditoria
      WHERE fecha > NOW() - INTERVAL '24 hours'
    `);
    
    // Verificar si hay usuarios activos
    const activeUsers = await query(`
      SELECT COUNT(*) as usuarios_activos
      FROM vetplus_auth.usuarios 
      WHERE activo = true
    `);
    
    const logs = lastActivity.rows[0] || { total_logs: 0 };
    const users = activeUsers.rows[0] || { usuarios_activos: 0 };
    
    return {
      estado: 'Operativo',
      version_db: dbVersion.rows[0].version.split(' ')[1] || 'Desconocida',
      usuarios_activos: users.usuarios_activos,
      logs_24h: logs.total_logs,
      mensaje: 'Sistema funcionando correctamente'
    };
  } catch (error) {
    console.error('Error verificando estado del sistema:', error);
    return {
      estado: 'Error',
      mensaje: 'Error al verificar estado del sistema'
    };
  }
}/**
 * Obtener resumen de configuraciones
 * @route GET /api/system/config-summary
 */
export const getConfigSummary = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden acceder a esta información'
            });
        }

        const status = {
            empresa: await checkEmpresaStatus(),
            google_calendar: await checkGoogleCalendarStatus(),
            correo: await checkCorreoStatus(),
            sistema: await checkSistemaStatus()
        };

        const totalModules = 4;
        const configuredModules = Object.values(status).filter(
          module => module.estado === 'Configurado' || module.estado === 'Conectado' || module.estado === 'Operativo'
        ).length;

        res.json({
            success: true,
            data: {
                configuraciones_completadas: `${configuredModules}/${totalModules}`,
                porcentaje_completado: Math.round((configuredModules / totalModules) * 100),
                modulos: status
            }
        });

    } catch (error) {
        console.error('Error obteniendo resumen de configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};