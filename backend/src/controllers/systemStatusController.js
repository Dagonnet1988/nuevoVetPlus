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

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const status = {
            empresa: await checkEmpresaStatus(tenantId),
            google_calendar: await checkGoogleCalendarStatus(tenantId),
            correo: await checkCorreoStatus(tenantId),
            consentimiento: await checkConsentimientoStatus(tenantId),
            usuarios: await checkUsuariosStatus(tenantId),
            sistema: await checkSistemaStatus(tenantId)
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
async function checkEmpresaStatus(tenantId) {
  try {
    const result = await query(`
      SELECT 
        nombre_empresa,
        nit,
        direccion,
        email,
        telefono,
        logo_url
      FROM system.configuracion_empresa 
      WHERE activa = true AND id_tenant = $1
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [tenantId]);

    const row = result.rows[0] || null;
    const hasMeaningfulConfig = Boolean(
      row &&
      row.nombre_empresa &&
      row.nit && row.nit !== 'POR-DEFINIR' &&
      row.direccion && row.direccion !== 'Por definir' &&
      row.email &&
      row.telefono
    );

    return {
      estado: hasMeaningfulConfig ? 'Configurado' : 'Pendiente',
      configurado: hasMeaningfulConfig,
      logo_configurado: Boolean(row?.logo_url),
      mensaje: hasMeaningfulConfig
        ? 'Empresa configurada correctamente'
        : 'Configuración de empresa pendiente'
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
async function checkGoogleCalendarStatus(tenantId) {
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
        AND configured_by IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
      LIMIT 1
    `, [tenantId]);
    
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
async function checkCorreoStatus(tenantId) {
  try {
    const result = await query(`
      SELECT
        auth_mode,
        oauth_refresh_token
      FROM system.configuracion_correo
      WHERE activa = true AND id_tenant = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [tenantId]);

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

async function checkConsentimientoStatus(tenantId) {
  try {
    const result = await query(
      `SELECT id_version, texto_legal
       FROM clinical.versiones_consentimiento
       WHERE activa = true AND id_tenant = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    const row = result.rows[0] || null;
    const hasText = Boolean(row?.texto_legal && String(row.texto_legal).trim().length > 0);

    return {
      estado: hasText ? 'Configurado' : 'Pendiente',
      configurado: hasText,
      mensaje: hasText
        ? 'Texto de consentimiento activo'
        : 'Texto de consentimiento pendiente'
    };
  } catch (error) {
    console.error('Error verificando estado de consentimiento:', error);
    return {
      estado: 'Error',
      configurado: false,
      mensaje: 'Error al verificar configuración de consentimiento'
    };
  }
}

async function checkUsuariosStatus(tenantId) {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS total
       FROM vetplus_auth.usuarios
       WHERE id_tenant = $1
         AND activo = true
         AND rol IN ('vet', 'aux')`,
      [tenantId]
    );

    const total = Number(result.rows[0]?.total || 0);
    return {
      estado: total > 0 ? 'Configurado' : 'Pendiente',
      configurado: total > 0,
      total,
      mensaje: total > 0
        ? 'Usuarios clinicos activos configurados'
        : 'Sin usuarios clinicos activos'
    };
  } catch (error) {
    console.error('Error verificando estado de usuarios:', error);
    return {
      estado: 'Error',
      configurado: false,
      total: 0,
      mensaje: 'Error al verificar usuarios'
    };
  }
}
/**
 * Verificar estado general del sistema
 */
async function checkSistemaStatus(tenantId) {
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
        AND id_usuario IN (SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1)
    `, [tenantId]);
    
    // Verificar si hay usuarios activos
    const activeUsers = await query(`
      SELECT COUNT(*) as usuarios_activos
      FROM vetplus_auth.usuarios 
      WHERE activo = true AND id_tenant = $1
    `, [tenantId]);
    
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

        const tenantId = req.tenantId ?? req.user?.tenant_id;

        const status = {
            empresa: await checkEmpresaStatus(tenantId),
            google_calendar: await checkGoogleCalendarStatus(tenantId),
            correo: await checkCorreoStatus(tenantId),
            consentimiento: await checkConsentimientoStatus(tenantId),
            usuarios: await checkUsuariosStatus(tenantId),
            sistema: await checkSistemaStatus(tenantId)
        };

        const totalModules = 6;
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