import { query } from '../config/database.js';

class CajasController {
  /**
   * GESTIÓN DE CAJAS
   */

  // Obtener todas las cajas
  static async getCajas(req, res) {
    try {
      const { activa } = req.query;
      
      let sqlQuery = `
        SELECT 
          id_caja,
          nombre,
          descripcion,
          saldo_inicial,
          saldo_actual,
          activa,
          created_at,
          updated_at,
          created_by
        FROM financial.cajas
      `;
      
      const params = [];
      
      if (activa !== undefined) {
        sqlQuery += ' WHERE activa = $1';
        params.push(activa === 'true');
      }
      
      sqlQuery += ' ORDER BY created_at DESC';
      
      const result = await query(sqlQuery, params);
      
      res.json({
        success: true,
        message: 'Cajas obtenidas exitosamente',
        data: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error al obtener cajas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Crear nueva caja
  static async createCaja(req, res) {
    try {
      const { 
        nombre, 
        descripcion, 
        saldo_inicial 
      } = req.body;

      // Verificar si ya existe una caja activa
      const cajaActivaCheck = await query(
        'SELECT id_caja FROM financial.cajas WHERE activa = true'
      );

      if (cajaActivaCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una caja activa. Debe cerrar la caja actual antes de crear una nueva.'
        });
      }

      const result = await query(`
        INSERT INTO financial.cajas (
          nombre, 
          descripcion, 
          saldo_inicial, 
          saldo_actual,
          created_by
        ) VALUES ($1, $2, $3, $3, $4)
        RETURNING *
      `, [nombre, descripcion, saldo_inicial, req.user.id]);

      res.status(201).json({
        success: true,
        message: 'Caja creada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al crear caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cerrar caja activa
  static async cerrarCaja(req, res) {
    try {
      const { id_caja } = req.params;
      const { motivo_cierre } = req.body;

      // Verificar que la caja esté activa
      const cajaCheck = await query(
        'SELECT * FROM financial.cajas WHERE id_caja = $1 AND activa = true',
        [id_caja]
      );

      if (cajaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Caja no encontrada o ya está cerrada'
        });
      }

      // Cerrar la caja
      const result = await query(`
        UPDATE financial.cajas 
        SET 
          activa = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $1
        RETURNING *
      `, [id_caja]);

      res.json({
        success: true,
        message: 'Caja cerrada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener resumen de caja activa
  static async getResumenCajaActiva(req, res) {
    try {
      // Obtener caja activa
      const cajaActiva = await query(
        'SELECT * FROM financial.cajas WHERE activa = true'
      );

      if (cajaActiva.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No hay ninguna caja activa'
        });
      }

      const caja = cajaActiva.rows[0];

      // Obtener totales de ingresos y egresos
      const totales = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN i.id_ingreso IS NOT NULL THEN i.monto ELSE 0 END), 0) as total_ingresos,
          COALESCE(SUM(CASE WHEN e.id_egreso IS NOT NULL THEN e.monto ELSE 0 END), 0) as total_egresos,
          COUNT(i.id_ingreso) as cantidad_ingresos,
          COUNT(e.id_egreso) as cantidad_egresos
        FROM financial.cajas c
        LEFT JOIN financial.ingresos i ON c.id_caja = i.id_caja
        LEFT JOIN financial.egresos e ON c.id_caja = e.id_caja
        WHERE c.id_caja = $1
      `, [caja.id_caja]);

      const resumen = totales.rows[0];

      res.json({
        success: true,
        message: 'Resumen de caja obtenido exitosamente',
        data: {
          caja: caja,
          totales: {
            saldo_inicial: parseFloat(caja.saldo_inicial),
            total_ingresos: parseFloat(resumen.total_ingresos),
            total_egresos: parseFloat(resumen.total_egresos),
            saldo_actual: parseFloat(caja.saldo_actual),
            cantidad_ingresos: parseInt(resumen.cantidad_ingresos),
            cantidad_egresos: parseInt(resumen.cantidad_egresos)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener resumen de caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GESTIÓN DE INGRESOS
   */

  // Registrar nuevo ingreso
  static async registrarIngreso(req, res) {
    try {
      const {
        id_concepto_ingreso,
        monto,
        descripcion,
        metodo_pago,
        referencia
      } = req.body;

      // Verificar que existe una caja activa
      const cajaActiva = await query(
        'SELECT id_caja FROM financial.cajas WHERE activa = true'
      );

      if (cajaActiva.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay ninguna caja activa para registrar el ingreso'
        });
      }

      const id_caja = cajaActiva.rows[0].id_caja;

      // Generar código único para el ingreso
      const timestamp = Date.now().toString().slice(-6);
      const codigo_ingreso = `ING-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${timestamp}`;

      // Registrar el ingreso
      const result = await query(`
        INSERT INTO financial.ingresos (
          id_ingreso,
          codigo_ingreso,
          id_caja,
          monto,
          descripcion,
          metodo_pago,
          referencia,
          id_concepto_ingreso,
          created_by
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [codigo_ingreso, id_caja, monto, descripcion, metodo_pago, referencia, id_concepto_ingreso, req.user.id]);

      res.status(201).json({
        success: true,
        message: 'Ingreso registrado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al registrar ingreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener ingresos
  static async getIngresos(req, res) {
    try {
      const { 
        id_caja, 
        id_categoria, 
        fecha_inicio, 
        fecha_fin,
        limit = 50,
        offset = 0 
      } = req.query;

      let sqlQuery = `
        SELECT 
          i.*,
          ci.nombre as categoria_nombre,
          coni.nombre as concepto_nombre
        FROM financial.ingresos i
        LEFT JOIN financial.conceptos_ingresos coni ON i.id_concepto_ingreso = coni.id_concepto
        LEFT JOIN financial.categorias_ingresos ci ON coni.id_categoria = ci.id_categoria
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;

      if (id_caja) {
        paramCount++;
        sqlQuery += ` AND i.id_caja = $${paramCount}`;
        params.push(id_caja);
      }

      if (id_categoria) {
        paramCount++;
        sqlQuery += ` AND ci.id_categoria = $${paramCount}`;
        params.push(id_categoria);
      }

      if (fecha_inicio) {
        paramCount++;
        sqlQuery += ` AND DATE(i.fecha) >= $${paramCount}`;
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        sqlQuery += ` AND DATE(i.fecha) <= $${paramCount}`;
        params.push(fecha_fin);
      }

      sqlQuery += ' ORDER BY i.fecha DESC';

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
        message: 'Ingresos obtenidos exitosamente',
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Error al obtener ingresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GESTIÓN DE EGRESOS
   */

  // Registrar nuevo egreso
  static async registrarEgreso(req, res) {
    try {
      const {
        id_concepto_egreso,
        monto,
        descripcion,
        metodo_pago,
        referencia
      } = req.body;

      // Verificar que existe una caja activa
      const cajaActiva = await query(
        'SELECT id_caja, saldo_actual FROM financial.cajas WHERE activa = true'
      );

      if (cajaActiva.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay ninguna caja activa para registrar el egreso'
        });
      }

      const { id_caja, saldo_actual } = cajaActiva.rows[0];

      // Verificar que hay suficiente saldo
      if (parseFloat(saldo_actual) < parseFloat(monto)) {
        return res.status(400).json({
          success: false,
          message: 'Saldo insuficiente en la caja para realizar este egreso'
        });
      }

      // Generar código único para el egreso
      const timestamp = Date.now().toString().slice(-6);
      const codigo_egreso = `EGR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${timestamp}`;

      // Registrar el egreso
      const result = await query(`
        INSERT INTO financial.egresos (
          id_egreso,
          codigo_egreso,
          id_caja,
          monto,
          descripcion,
          metodo_pago,
          referencia,
          id_concepto_egreso,
          categoria,
          created_by
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, 'General', $8)
        RETURNING *
      `, [codigo_egreso, id_caja, monto, descripcion, metodo_pago, referencia, id_concepto_egreso, req.user.id]);

      res.status(201).json({
        success: true,
        message: 'Egreso registrado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al registrar egreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener egresos
  static async getEgresos(req, res) {
    try {
      const { 
        id_caja, 
        id_categoria, 
        fecha_inicio, 
        fecha_fin,
        limit = 50,
        offset = 0 
      } = req.query;

      let sqlQuery = `
        SELECT 
          e.*,
          ce.nombre as categoria_nombre,
          cone.nombre as concepto_nombre
        FROM financial.egresos e
        LEFT JOIN financial.conceptos_egresos cone ON e.id_concepto_egreso = cone.id_concepto
        LEFT JOIN financial.categorias_egresos ce ON cone.id_categoria = ce.id_categoria
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;

      if (id_caja) {
        paramCount++;
        sqlQuery += ` AND e.id_caja = $${paramCount}`;
        params.push(id_caja);
      }

      if (id_categoria) {
        paramCount++;
        sqlQuery += ` AND ce.id_categoria = $${paramCount}`;
        params.push(id_categoria);
      }

      if (fecha_inicio) {
        paramCount++;
        sqlQuery += ` AND DATE(e.fecha) >= $${paramCount}`;
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        sqlQuery += ` AND DATE(e.fecha) <= $${paramCount}`;
        params.push(fecha_fin);
      }

      sqlQuery += ' ORDER BY e.fecha DESC';

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
        message: 'Egresos obtenidos exitosamente',
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Error al obtener egresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * REPORTES
   */

  // Obtener reporte financiero
  static async getReporteFinanciero(req, res) {
    try {
      const { 
        fecha_inicio, 
        fecha_fin, 
        caja_id,
        grupo_por = 'dia' // dia, semana, mes
      } = req.query;

      let condicionFecha = '';
      let condicionCaja = '';
      let groupBy = '';
      const params = [];
      let paramCount = 0;

      // Construir condiciones
      if (fecha_inicio && fecha_fin) {
        paramCount++;
        condicionFecha = ` AND DATE(i.fecha) BETWEEN $${paramCount} AND $${paramCount + 1}`;
        params.push(fecha_inicio, fecha_fin);
        paramCount++;
      }

      if (caja_id) {
        paramCount++;
        condicionCaja = ` AND i.id_caja = $${paramCount}`;
        params.push(caja_id);
      }

      // Configurar agrupación
      switch (grupo_por) {
        case 'semana':
          groupBy = "DATE_TRUNC('week', i.fecha)";
          break;
        case 'mes':
          groupBy = "DATE_TRUNC('month', i.fecha)";
          break;
        default:
          groupBy = "DATE(i.fecha)";
      }

      const reporteQuery = `
        WITH ingresos_agrupados AS (
          SELECT 
            ${groupBy} as periodo,
            SUM(i.monto) as total_ingresos,
            COUNT(i.id_ingreso) as cantidad_ingresos
          FROM financial.ingresos i
          WHERE 1=1 ${condicionFecha} ${condicionCaja}
          GROUP BY ${groupBy}
        ),
        egresos_agrupados AS (
          SELECT 
            ${groupBy.replace('i.fecha', 'e.fecha')} as periodo,
            SUM(e.monto) as total_egresos,
            COUNT(e.id_egreso) as cantidad_egresos
          FROM financial.egresos e
          WHERE 1=1 ${condicionFecha.replace('i.fecha', 'e.fecha')} ${condicionCaja.replace('i.id_caja', 'e.id_caja')}
          GROUP BY ${groupBy.replace('i.fecha', 'e.fecha')}
        )
        SELECT 
          COALESCE(i.periodo, e.periodo) as periodo,
          COALESCE(i.total_ingresos, 0) as total_ingresos,
          COALESCE(e.total_egresos, 0) as total_egresos,
          COALESCE(i.total_ingresos, 0) - COALESCE(e.total_egresos, 0) as balance,
          COALESCE(i.cantidad_ingresos, 0) as cantidad_ingresos,
          COALESCE(e.cantidad_egresos, 0) as cantidad_egresos
        FROM ingresos_agrupados i
        FULL OUTER JOIN egresos_agrupados e ON i.periodo = e.periodo
        ORDER BY periodo DESC
      `;

      const result = await query(reporteQuery, params);

      res.json({
        success: true,
        message: 'Reporte financiero generado exitosamente',
        data: result.rows,
        filtros: {
          fecha_inicio,
          fecha_fin,
          caja_id,
          grupo_por
        }
      });
    } catch (error) {
      console.error('Error al generar reporte financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default CajasController;
