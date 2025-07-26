import { query } from '../config/database.js';
import { validationResult } from 'express-validator';

// Registrar una sesión de terapia usada
export async function recordTherapySession(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de sesión inválidos',
        errors: errors.array()
      });
    }

    const { id_control, observaciones, duracion_real } = req.body;
    const userId = req.user.id;

    await query('BEGIN');

    try {
      // Verificar que el control de terapia existe y está activo
      const controlResult = await query(`
        SELECT 
          ct.*,
          p.nombre as producto_nombre,
          p.sesiones_incluidas,
          p.duracion_sesion,
          m.nombre as mascota_nombre,
          c.nombre as cliente_nombre
        FROM financial.control_terapias ct
        JOIN financial.productos p ON ct.id_producto = p.id_producto
        JOIN clinical.mascotas m ON ct.id_mascota = m.id_mascota
        JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
        WHERE ct.id_control = $1 AND ct.activo = true
      `, [id_control]);

      if (controlResult.rows.length === 0) {
        throw new Error('Control de terapia no encontrado o inactivo');
      }

      const control = controlResult.rows[0];

      // Verificar que aún quedan sesiones disponibles
      if (control.sesiones_usadas >= control.sesiones_total) {
        throw new Error('No hay sesiones disponibles en este paquete');
      }

      // Verificar que no haya vencido
      if (control.fecha_vencimiento && new Date() > new Date(control.fecha_vencimiento)) {
        throw new Error('El paquete de terapia ha vencido');
      }

      // Registrar la sesión en tabla de sesiones
      const sesionResult = await query(`
        INSERT INTO financial.sesiones_terapia (
          id_control, fecha_sesion, observaciones, duracion_real, 
          realizada_por, created_at
        ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id_sesion, fecha_sesion
      `, [id_control, observaciones, duracion_real, userId]);

      const sesion = sesionResult.rows[0];

      // Actualizar el control de terapias
      await query(`
        UPDATE financial.control_terapias 
        SET 
          sesiones_usadas = sesiones_usadas + 1,
          fecha_ultima_sesion = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_control = $1
      `, [id_control]);

      // Verificar si se completó el paquete
      const nuevasSesionesUsadas = control.sesiones_usadas + 1;
      if (nuevasSesionesUsadas >= control.sesiones_total) {
        await query(`
          UPDATE financial.control_terapias 
          SET activo = false, updated_at = CURRENT_TIMESTAMP
          WHERE id_control = $1
        `, [id_control]);
      }

      await query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Sesión de terapia registrada exitosamente',
        data: {
          sesion: {
            id_sesion: sesion.id_sesion,
            fecha_sesion: sesion.fecha_sesion,
            observaciones,
            duracion_real
          },
          control: {
            sesiones_usadas: nuevasSesionesUsadas,
            sesiones_restantes: control.sesiones_total - nuevasSesionesUsadas,
            paquete_completado: nuevasSesionesUsadas >= control.sesiones_total
          },
          mascota: control.mascota_nombre,
          cliente: control.cliente_nombre,
          terapia: control.producto_nombre
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error registrando sesión de terapia:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}

// Obtener control de terapias por mascota
export async function getTherapyControlByPet(req, res) {
  try {
    const { id_mascota } = req.params;
    const { activo = 'true' } = req.query;

    let whereClause = 'WHERE ct.id_mascota = $1';
    const params = [id_mascota];

    if (activo === 'true') {
      whereClause += ' AND ct.activo = true';
    }

    const result = await query(`
      SELECT 
        ct.*,
        p.nombre as producto_nombre,
        p.categoria,
        p.duracion_sesion as duracion_prevista,
        m.nombre as mascota_nombre,
        c.nombre as cliente_nombre,
        fv.codigo_factura,
        fv.fecha as fecha_compra,
        CASE 
          WHEN ct.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
          WHEN ct.fecha_vencimiento < CURRENT_DATE + INTERVAL '7 days' THEN 'por_vencer'
          WHEN ct.sesiones_restantes = 0 THEN 'completado'
          ELSE 'activo'
        END as estado_paquete
      FROM financial.control_terapias ct
      JOIN financial.productos p ON ct.id_producto = p.id_producto
      JOIN clinical.mascotas m ON ct.id_mascota = m.id_mascota
      JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      JOIN financial.facturas_venta fv ON ct.id_factura = fv.id_factura
      ${whereClause}
      ORDER BY ct.fecha_inicio DESC, ct.activo DESC
    `, params);

    // Obtener las últimas sesiones realizadas para cada control
    const controls = result.rows;
    for (let control of controls) {
      const sesionesResult = await query(`
        SELECT 
          st.fecha_sesion,
          st.observaciones,
          st.duracion_real,
          u.nombre as realizada_por
        FROM financial.sesiones_terapia st
        LEFT JOIN auth.usuarios u ON st.realizada_por = u.id_usuario
        WHERE st.id_control = $1
        ORDER BY st.fecha_sesion DESC
        LIMIT 5
      `, [control.id_control]);

      control.ultimas_sesiones = sesionesResult.rows;
    }

    res.json({
      success: true,
      data: controls
    });

  } catch (error) {
    console.error('Error obteniendo control de terapias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Listar todos los paquetes de terapia disponibles
export async function getTherapyPackages(req, res) {
  try {
    const { categoria } = req.query;

    let whereClause = 'WHERE p.tipo IN (\'Terapia Individual\', \'Terapia Paquete\') AND p.activo = true';
    const params = [];

    if (categoria) {
      params.push(categoria);
      whereClause += ` AND p.categoria = $${params.length}`;
    }

    const result = await query(`
      SELECT 
        p.id_producto,
        p.codigo,
        p.codigo_barras,
        p.nombre,
        p.descripcion,
        p.tipo,
        p.categoria,
        p.precio_venta,
        p.sesiones_incluidas,
        p.duracion_sesion,
        CASE 
          WHEN p.tipo = 'Terapia Paquete' THEN 
            ROUND(p.precio_venta / NULLIF(p.sesiones_incluidas, 0), 2)
          ELSE p.precio_venta
        END as precio_por_sesion,
        CASE 
          WHEN p.tipo = 'Terapia Paquete' THEN 
            ROUND((1 - (p.precio_venta / NULLIF(p.sesiones_incluidas, 0)) / p.precio_venta) * 100, 1)
          ELSE 0
        END as descuento_porcentaje
      FROM financial.productos p
      ${whereClause}
      ORDER BY p.categoria, p.nombre
    `, params);

    res.json({
      success: true,
      data: result.rows,
      summary: {
        total_packages: result.rows.filter(p => p.tipo === 'Terapia Paquete').length,
        individual_therapies: result.rows.filter(p => p.tipo === 'Terapia Individual').length,
        categories: [...new Set(result.rows.map(p => p.categoria))]
      }
    });

  } catch (error) {
    console.error('Error obteniendo paquetes de terapia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener estadísticas de terapias
export async function getTherapyStats(req, res) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (fecha_desde) {
      params.push(fecha_desde);
      whereClause += ` AND ct.fecha_inicio >= $${params.length}`;
    }

    if (fecha_hasta) {
      params.push(fecha_hasta);
      whereClause += ` AND ct.fecha_inicio <= $${params.length}`;
    }

    // Estadísticas generales
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_paquetes,
        COUNT(*) FILTER (WHERE ct.activo = true) as paquetes_activos,
        COUNT(*) FILTER (WHERE ct.activo = false) as paquetes_completados,
        COUNT(*) FILTER (WHERE ct.fecha_vencimiento < CURRENT_DATE AND ct.activo = true) as paquetes_vencidos,
        SUM(ct.sesiones_total) as sesiones_vendidas,
        SUM(ct.sesiones_usadas) as sesiones_realizadas,
        ROUND(AVG(ct.sesiones_usadas::decimal / ct.sesiones_total * 100), 2) as promedio_uso
      FROM financial.control_terapias ct
      ${whereClause}
    `, params);

    // Terapias más populares
    const popularResult = await query(`
      SELECT 
        p.nombre,
        p.categoria,
        COUNT(*) as paquetes_vendidos,
        SUM(ct.sesiones_total) as sesiones_incluidas,
        SUM(ct.sesiones_usadas) as sesiones_realizadas
      FROM financial.control_terapias ct
      JOIN financial.productos p ON ct.id_producto = p.id_producto
      ${whereClause}
      GROUP BY p.id_producto, p.nombre, p.categoria
      ORDER BY paquetes_vendidos DESC
      LIMIT 10
    `, params);

    // Próximos vencimientos
    const vencimientosResult = await query(`
      SELECT 
        ct.id_control,
        ct.fecha_vencimiento,
        ct.sesiones_restantes,
        p.nombre as terapia,
        m.nombre as mascota,
        c.nombre as cliente,
        c.telefono,
        c.email
      FROM financial.control_terapias ct
      JOIN financial.productos p ON ct.id_producto = p.id_producto
      JOIN clinical.mascotas m ON ct.id_mascota = m.id_mascota
      JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE ct.activo = true 
        AND ct.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY ct.fecha_vencimiento ASC
    `);

    res.json({
      success: true,
      data: {
        estadisticas_generales: statsResult.rows[0],
        terapias_populares: popularResult.rows,
        proximos_vencimientos: vencimientosResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de terapias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Actualizar control de terapia (extender vencimiento, etc.)
export async function updateTherapyControl(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de actualización inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { fecha_vencimiento, activo, notas } = req.body;

    const updateFields = [];
    const params = [];

    if (fecha_vencimiento !== undefined) {
      params.push(fecha_vencimiento);
      updateFields.push(`fecha_vencimiento = $${params.length}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updateFields.push(`activo = $${params.length}`);
    }

    if (notas !== undefined) {
      params.push(notas);
      updateFields.push(`notas = $${params.length}`);
    }

    params.push(id);
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(`
      UPDATE financial.control_terapias 
      SET ${updateFields.join(', ')}
      WHERE id_control = $${params.length}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Control de terapia no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Control de terapia actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando control de terapia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener historial de sesiones de terapia con filtros
 */
export async function getTherapySessions(req, res) {
  try {
    const { 
      petId, 
      controlId, 
      fechaInicio, 
      fechaFin, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    let queryText = `
      SELECT 
        st.id_sesion,
        st.fecha_sesion,
        st.observaciones,
        st.created_at,
        ct.id_control as control_id,
        ct.tipo as control_tipo,
        ct.sesiones_total,
        ct.sesiones_usadas,
        ct.activo as control_activo,
        m.nombre as mascota_nombre,
        c.nombre as cliente_nombre
      FROM financial.sesiones_terapia st
      JOIN financial.control_terapias ct ON st.id_control = ct.id_control
      JOIN clinical.mascotas m ON ct.id_mascota = m.id_mascota
      JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Filtros opcionales
    if (petId) {
      paramCount++;
      queryText += ` AND ct.id_mascota = $${paramCount}`;
      params.push(petId);
    }
    
    if (controlId) {
      paramCount++;
      queryText += ` AND st.id_control = $${paramCount}`;
      params.push(controlId);
    }
    
    if (fechaInicio) {
      paramCount++;
      queryText += ` AND st.fecha_sesion >= $${paramCount}`;
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      paramCount++;
      queryText += ` AND st.fecha_sesion <= $${paramCount}`;
      params.push(fechaFin);
    }
    
    // Paginación
    const offset = (page - 1) * limit;
    paramCount++;
    queryText += ` ORDER BY st.fecha_sesion DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await query(queryText, params);
    
    // Contar total de registros para paginación
    let countQueryText = `
      SELECT COUNT(*) as total
      FROM financial.sesiones_terapia st
      JOIN financial.control_terapias ct ON st.id_control = ct.id_control
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (petId) {
      countParamCount++;
      countQueryText += ` AND ct.id_mascota = $${countParamCount}`;
      countParams.push(petId);
    }
    
    if (controlId) {
      countParamCount++;
      countQueryText += ` AND st.id_control = $${countParamCount}`;
      countParams.push(controlId);
    }
    
    if (fechaInicio) {
      countParamCount++;
      countQueryText += ` AND st.fecha_sesion >= $${countParamCount}`;
      countParams.push(fechaInicio);
    }
    
    if (fechaFin) {
      countParamCount++;
      countQueryText += ` AND st.fecha_sesion <= $${countParamCount}`;
      countParams.push(fechaFin);
    }
    
    const countResult = await query(countQueryText, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      message: 'Sesiones de terapia obtenidas exitosamente',
      data: {
        sessions: result.rows,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error al obtener sesiones de terapia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener sesiones de terapia',
      error: error.message
    });
  }
}
