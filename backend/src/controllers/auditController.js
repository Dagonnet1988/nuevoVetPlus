import { query } from '../config/database.js';

class AuditController {
  /**
   * GESTIÓN DE AUDITORÍAS - SOLO ADMINISTRADORES
   */

  // Obtener logs de auditoría con filtros
  static async getAuditLogs(req, res) {
    try {
      const {
        tabla,
        usuario_id,
        tipo_accion,
        fecha_inicio,
        fecha_fin,
        limit = 50,
        offset = 0
      } = req.query;

      let sqlQuery = `
        SELECT 
          a.*,
          u.email as usuario_email,
          u.rol as usuario_rol
        FROM system.log_auditoria a
        LEFT JOIN auth.usuarios u ON a.id_usuario = u.id_usuario
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (tabla) {
        paramCount++;
        conditions.push(`a.tabla_afectada ILIKE $${paramCount}`);
        params.push(`%${tabla}%`);
      }

      if (usuario_id) {
        paramCount++;
        conditions.push(`a.id_usuario = $${paramCount}`);
        params.push(usuario_id);
      }

      if (tipo_accion) {
        paramCount++;
        conditions.push(`a.tipo_accion = $${paramCount}`);
        params.push(tipo_accion);
      }

      if (fecha_inicio) {
        paramCount++;
        conditions.push(`DATE(a.fecha) >= $${paramCount}`);
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        conditions.push(`DATE(a.fecha) <= $${paramCount}`);
        params.push(fecha_fin);
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
      }

      sqlQuery += ' ORDER BY a.fecha DESC';

      // Agregar límite y offset
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params);

      // Obtener conteo total
      let countQuery = `SELECT COUNT(*) as total FROM system.log_auditoria a`;
      const countConditions = [];
      const countParams = [];
      let countParamCount = 0;

      if (tabla) {
        countParamCount++;
        countConditions.push(`a.tabla_afectada ILIKE $${countParamCount}`);
        countParams.push(`%${tabla}%`);
      }

      if (usuario_id) {
        countParamCount++;
        countConditions.push(`a.id_usuario = $${countParamCount}`);
        countParams.push(usuario_id);
      }

      if (tipo_accion) {
        countParamCount++;
        countConditions.push(`a.tipo_accion = $${countParamCount}`);
        countParams.push(tipo_accion);
      }

      if (fecha_inicio) {
        countParamCount++;
        countConditions.push(`DATE(a.fecha) >= $${countParamCount}`);
        countParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        countParamCount++;
        countConditions.push(`DATE(a.fecha) <= $${countParamCount}`);
        countParams.push(fecha_fin);
      }

      if (countConditions.length > 0) {
        countQuery += ' WHERE ' + countConditions.join(' AND ');
      }

      const countResult = await query(countQuery, countParams);

      res.json({
        success: true,
        message: 'Logs de auditoría obtenidos exitosamente',
        data: result.rows,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Error al obtener logs de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener actividades de usuarios
  static async getUserActivities(req, res) {
    try {
      const {
        usuario_id,
        tipo_actividad,
        fecha_inicio,
        fecha_fin,
        limit = 50,
        offset = 0
      } = req.query;

      let sqlQuery = `
        SELECT * FROM system.v_user_activities
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (usuario_id) {
        paramCount++;
        conditions.push(`id_usuario = $${paramCount}`);
        params.push(usuario_id);
      }

      if (tipo_actividad) {
        paramCount++;
        conditions.push(`tipo_actividad = $${paramCount}`);
        params.push(tipo_actividad);
      }

      if (fecha_inicio) {
        paramCount++;
        conditions.push(`DATE(timestamp) >= $${paramCount}`);
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        conditions.push(`DATE(timestamp) <= $${paramCount}`);
        params.push(fecha_fin);
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
      }

      sqlQuery += ' ORDER BY timestamp DESC';

      // Agregar límite y offset
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params);

      res.json({
        success: true,
        message: 'Actividades de usuarios obtenidas exitosamente',
        data: result.rows
      });
    } catch (error) {
      console.error('Error al obtener actividades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener actividades sospechosas
  static async getSuspiciousActivities(req, res) {
    try {
      const { limit = 100 } = req.query;

      const result = await query(`
        SELECT * FROM system.v_suspicious_activities
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);

      res.json({
        success: true,
        message: 'Actividades sospechosas obtenidas exitosamente',
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error al obtener actividades sospechosas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener sesiones de usuarios
  static async getUserSessions(req, res) {
    try {
      const {
        usuario_id,
        tipo_evento,
        fecha_inicio,
        fecha_fin,
        limit = 50,
        offset = 0
      } = req.query;

      let sqlQuery = `
        SELECT * FROM system.v_user_sessions
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (usuario_id) {
        paramCount++;
        conditions.push(`id_usuario = $${paramCount}`);
        params.push(usuario_id);
      }

      if (tipo_evento) {
        paramCount++;
        conditions.push(`tipo_evento = $${paramCount}`);
        params.push(tipo_evento);
      }

      if (fecha_inicio) {
        paramCount++;
        conditions.push(`DATE(timestamp) >= $${paramCount}`);
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        conditions.push(`DATE(timestamp) <= $${paramCount}`);
        params.push(fecha_fin);
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
      }

      sqlQuery += ' ORDER BY timestamp DESC';

      // Agregar límite y offset
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params);

      res.json({
        success: true,
        message: 'Sesiones de usuarios obtenidas exitosamente',
        data: result.rows
      });
    } catch (error) {
      console.error('Error al obtener sesiones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas de auditoría
  static async getAuditStats(req, res) {
    try {
      const { 
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date = new Date().toISOString(),
        usuario_id = null
      } = req.query;

      // Usar la función de reporte de auditoría
      const reportResult = await query(`
        SELECT * FROM system.generate_audit_report($1::timestamp, $2::timestamp, $3::uuid)
      `, [start_date, end_date, usuario_id]);

      const report = reportResult.rows[0];

      // Estadísticas adicionales
      const additionalStats = await query(`
        SELECT 
          (SELECT COUNT(DISTINCT id_usuario) FROM system.activity_log 
           WHERE timestamp BETWEEN $1 AND $2) as usuarios_activos,
          
          (SELECT COUNT(DISTINCT ip_address) FROM system.activity_log 
           WHERE timestamp BETWEEN $1 AND $2) as ips_unicas,
          
          (SELECT tipo_actividad 
           FROM system.activity_log 
           WHERE timestamp BETWEEN $1 AND $2
           GROUP BY tipo_actividad 
           ORDER BY COUNT(*) DESC 
           LIMIT 1) as actividad_mas_frecuente,
           
          (SELECT COUNT(*) FROM system.v_suspicious_activities 
           WHERE timestamp BETWEEN $1 AND $2) as actividades_sospechosas
      `, [start_date, end_date]);

      const additional = additionalStats.rows[0];

      // Top 5 usuarios más activos
      const topUsers = await query(`
        SELECT 
          u.email,
          u.rol,
          COUNT(*) as total_actividades,
          COUNT(CASE WHEN al.status_code >= 400 THEN 1 END) as actividades_fallidas
        FROM system.activity_log al
        JOIN auth.usuarios u ON al.id_usuario = u.id_usuario
        WHERE al.timestamp BETWEEN $1 AND $2
        GROUP BY u.email, u.rol
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `, [start_date, end_date]);

      // Actividades por día
      const dailyActivity = await query(`
        SELECT 
          DATE(timestamp) as fecha,
          COUNT(*) as total_actividades,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as actividades_fallidas
        FROM system.activity_log
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp)
      `, [start_date, end_date]);

      res.json({
        success: true,
        message: 'Estadísticas de auditoría obtenidas exitosamente',
        data: {
          resumen: {
            ...report,
            ...additional
          },
          top_usuarios: topUsers.rows,
          actividad_diaria: dailyActivity.rows,
          periodo: {
            inicio: start_date,
            fin: end_date
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener accesos a datos médicos
  static async getMedicalDataAccess(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const result = await query(`
        SELECT * FROM system.v_medical_data_access
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.json({
        success: true,
        message: 'Accesos a datos médicos obtenidos exitosamente',
        data: result.rows
      });
    } catch (error) {
      console.error('Error al obtener accesos médicos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Limpiar logs antiguos (solo admin)
  static async cleanupOldLogs(req, res) {
    try {
      const { retention_days = 365 } = req.body;

      const result = await query(`
        SELECT system.cleanup_audit_logs($1)
      `, [retention_days]);

      const deletedCount = result.rows[0].cleanup_audit_logs;

      res.json({
        success: true,
        message: `Limpieza completada. ${deletedCount} registros eliminados.`,
        data: {
          registros_eliminados: deletedCount,
          dias_retencion: retention_days
        }
      });
    } catch (error) {
      console.error('Error al limpiar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Exportar reporte de auditoría
  static async exportAuditReport(req, res) {
    try {
      const {
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date = new Date().toISOString(),
        formato = 'json'
      } = req.query;

      // Obtener datos completos del reporte
      const auditData = await query(`
        SELECT 
          a.timestamp,
          a.tabla_afectada,
          a.tipo_accion,
          a.descripcion,
          u.email as usuario,
          u.rol,
          a.ip_address
        FROM system.log_auditoria a
        LEFT JOIN auth.usuarios u ON a.id_usuario = u.id_usuario
        WHERE a.timestamp BETWEEN $1 AND $2
        ORDER BY a.timestamp DESC
      `, [start_date, end_date]);

      const sessionData = await query(`
        SELECT 
          s.timestamp,
          s.tipo_evento,
          s.exito,
          u.email as usuario,
          s.ip_address
        FROM system.session_audit s
        LEFT JOIN auth.usuarios u ON s.id_usuario = u.id_usuario
        WHERE s.timestamp BETWEEN $1 AND $2
        ORDER BY s.timestamp DESC
      `, [start_date, end_date]);

      const reportData = {
        meta: {
          generado: new Date(),
          periodo: { inicio: start_date, fin: end_date },
          total_registros_auditoria: auditData.rows.length,
          total_registros_sesiones: sessionData.rows.length
        },
        auditoria: auditData.rows,
        sesiones: sessionData.rows
      };

      if (formato === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 
          `attachment; filename=audit-report-${new Date().toISOString().split('T')[0]}.json`);
        res.json(reportData);
      } else {
        res.status(400).json({
          success: false,
          message: 'Formato no soportado. Use: json'
        });
      }
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default AuditController;