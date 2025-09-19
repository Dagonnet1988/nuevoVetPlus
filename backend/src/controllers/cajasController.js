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

      // Actualizar saldo de la caja
      await query(`
        UPDATE financial.cajas
        SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $2
      `, [monto, id_caja]);

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

      // Actualizar saldo de la caja
      await query(`
        UPDATE financial.cajas
        SET saldo_actual = saldo_actual - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $2
      `, [monto, id_caja]);

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

  // Actualizar caja
  static async updateCaja(req, res) {
    try {
      const { caja_id } = req.params;
      const { nombre, descripcion, tipo, saldo_inicial } = req.body;
      const userId = req.user.id;

      // Verificar que la caja existe
      const cajaExistente = await query(
        'SELECT * FROM financial.cajas WHERE id_caja = $1',
        [caja_id]
      );

      if (cajaExistente.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Caja no encontrada'
        });
      }

      // Verificar que no exista otra caja con el mismo nombre
      if (nombre) {
        const nombreDuplicado = await query(
          'SELECT id_caja FROM financial.cajas WHERE nombre = $1 AND id_caja != $2',
          [nombre, caja_id]
        );

        if (nombreDuplicado.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe una caja con ese nombre'
          });
        }
      }

      // Actualizar caja
      const result = await query(`
        UPDATE financial.cajas
        SET nombre = COALESCE($1, nombre),
            descripcion = COALESCE($2, descripcion),
            tipo = COALESCE($3, tipo),
            saldo_inicial = COALESCE($4, saldo_inicial),
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $5
        RETURNING *
      `, [nombre, descripcion, tipo, saldo_inicial, caja_id]);

      res.json({
        success: true,
        message: 'Caja actualizada exitosamente',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error al actualizar caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Eliminar/desactivar caja
  static async deleteCaja(req, res) {
    try {
      const { caja_id } = req.params;
      const userId = req.user.id;

      // Verificar que la caja existe
      const cajaExistente = await query(
        'SELECT * FROM financial.cajas WHERE id_caja = $1',
        [caja_id]
      );

      if (cajaExistente.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Caja no encontrada'
        });
      }

      // Verificar que no sea la única caja activa
      const cajasActivas = await query(
        'SELECT COUNT(*) as total FROM financial.cajas WHERE activa = true AND id_caja != $1',
        [caja_id]
      );

      if (cajasActivas.rows[0].total === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar la única caja activa del sistema'
        });
      }

      // Verificar que no tenga saldo
      if (cajaExistente.rows[0].saldo_actual !== 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar una caja con saldo. Transfiera el saldo primero.'
        });
      }

      // Desactivar caja (no eliminar físicamente)
      await query(`
        UPDATE financial.cajas
        SET activa = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $1
      `, [caja_id]);

      res.json({
        success: true,
        message: 'Caja desactivada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * TRANSFERENCIAS ENTRE CAJAS
   */

  // Realizar transferencia entre cajas
  static async transferirEntreCajas(req, res) {
    try {
      const {
        id_caja_origen,
        id_caja_destino,
        monto,
        descripcion,
        metodo_pago = 'Efectivo',
        notas
      } = req.body;
      const userId = req.user.id;

      // Validar que las cajas sean diferentes
      if (id_caja_origen === id_caja_destino) {
        return res.status(400).json({
          success: false,
          message: 'La caja origen y destino deben ser diferentes'
        });
      }

      // Usar la función de PostgreSQL para procesar la transferencia
      const result = await query(`
        SELECT procesar_transferencia_cajas(
          $1::UUID, $2::UUID, $3::DECIMAL, $4::TEXT, $5::VARCHAR, $6::UUID
        ) as id_transferencia
      `, [id_caja_origen, id_caja_destino, monto, descripcion, metodo_pago, userId]);

      const idTransferencia = result.rows[0].id_transferencia;

      // Obtener datos de la transferencia creada
      const transferenciaResult = await query(`
        SELECT
          t.*,
          co.nombre as caja_origen_nombre,
          cd.nombre as caja_destino_nombre,
          u.nombre as usuario_nombre
        FROM financial.transferencias_cajas t
        JOIN financial.cajas co ON t.id_caja_origen = co.id_caja
        JOIN financial.cajas cd ON t.id_caja_destino = cd.id_caja
        LEFT JOIN vetplus_auth.usuarios u ON t.created_by = u.id_usuario
        WHERE t.id_transferencia = $1
      `, [idTransferencia]);

      res.status(201).json({
        success: true,
        message: 'Transferencia realizada exitosamente',
        data: transferenciaResult.rows[0]
      });

    } catch (error) {
      console.error('Error al transferir entre cajas:', error);

      // Manejar errores específicos de PostgreSQL
      if (error.code === 'P0001') { // RAISE EXCEPTION
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener historial de transferencias
  static async getTransferencias(req, res) {
    try {
      const {
        fecha_inicio,
        fecha_fin,
        id_caja_origen,
        id_caja_destino,
        estado = 'Completada',
        limit = 50,
        offset = 0
      } = req.query;

      let sqlQuery = `
        SELECT
          t.*,
          co.nombre as caja_origen_nombre,
          cd.nombre as caja_destino_nombre,
          u.nombre as usuario_nombre
        FROM financial.transferencias_cajas t
        JOIN financial.cajas co ON t.id_caja_origen = co.id_caja
        JOIN financial.cajas cd ON t.id_caja_destino = cd.id_caja
        LEFT JOIN vetplus_auth.usuarios u ON t.created_by = u.id_usuario
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      if (fecha_inicio) {
        paramCount++;
        sqlQuery += ` AND t.fecha::DATE >= $${paramCount}`;
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        sqlQuery += ` AND t.fecha::DATE <= $${paramCount}`;
        params.push(fecha_fin);
      }

      if (id_caja_origen) {
        paramCount++;
        sqlQuery += ` AND t.id_caja_origen = $${paramCount}`;
        params.push(id_caja_origen);
      }

      if (id_caja_destino) {
        paramCount++;
        sqlQuery += ` AND t.id_caja_destino = $${paramCount}`;
        params.push(id_caja_destino);
      }

      if (estado) {
        paramCount++;
        sqlQuery += ` AND t.estado = $${paramCount}`;
        params.push(estado);
      }

      sqlQuery += ` ORDER BY t.fecha DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(sqlQuery, params);

      // Obtener total para paginación
      const countQuery = sqlQuery.replace('SELECT t.*', 'SELECT COUNT(*) as total').replace('ORDER BY t.fecha DESC LIMIT', 'ORDER BY').replace('OFFSET', '').split('ORDER BY')[0];
      const countResult = await query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        message: 'Transferencias obtenidas exitosamente',
        data: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + parseInt(limit) < total
        }
      });

    } catch (error) {
      console.error('Error al obtener transferencias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener movimientos de una caja específica (ingresos + egresos)
   */
  static async getMovimientosCaja(req, res) {
    try {
      const { caja_id } = req.params;
      const { 
        fecha_inicio, 
        fecha_fin,
        limit = 25,
        offset = 0,
        tipo // 'ingreso', 'egreso', o undefined para ambos
      } = req.query;

      // Verificar que la caja existe
      const cajaResult = await query(
        'SELECT id_caja, nombre FROM financial.cajas WHERE id_caja = $1',
        [caja_id]
      );

      if (cajaResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Caja no encontrada'
        });
      }

      let sqlQuery = `
        SELECT 
          'ingreso' as tipo,
          i.id_ingreso as id_movimiento,
          i.descripcion,
          i.monto,
          i.fecha,
          i.referencia,
          i.metodo_pago,
          i.created_at,
          i.created_by,
          ci.nombre as categoria,
          coni.nombre as concepto
        FROM financial.ingresos i
        LEFT JOIN financial.conceptos_ingresos coni ON i.id_concepto_ingreso = coni.id_concepto
        LEFT JOIN financial.categorias_ingresos ci ON coni.id_categoria = ci.id_categoria
        WHERE i.id_caja = $1
      `;

      const params = [caja_id];
      let paramCount = 1;

      // Agregar egresos si no se especifica tipo o se pide ambos
      if (!tipo || tipo === 'egreso') {
        sqlQuery += `
          UNION ALL
          SELECT 
            'egreso' as tipo,
            e.id_egreso as id_movimiento,
            e.descripcion,
            -e.monto as monto, -- Monto negativo para egresos
            e.fecha,
            e.referencia,
            e.metodo_pago,
            e.created_at,
            e.created_by,
            ce.nombre as categoria,
            cone.nombre as concepto
          FROM financial.egresos e
          LEFT JOIN financial.conceptos_egresos cone ON e.id_concepto_egreso = cone.id_concepto
          LEFT JOIN financial.categorias_egresos ce ON cone.id_categoria = ce.id_categoria
          WHERE e.id_caja = $1
        `;
      }

      // Filtros de fecha
      if (fecha_inicio) {
        paramCount++;
        if (!tipo || tipo === 'egreso') {
          sqlQuery += ` AND (i.fecha >= $${paramCount} OR e.fecha >= $${paramCount})`;
        } else {
          sqlQuery += ` AND i.fecha >= $${paramCount}`;
        }
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        if (!tipo || tipo === 'egreso') {
          sqlQuery += ` AND (i.fecha <= $${paramCount} OR e.fecha <= $${paramCount})`;
        } else {
          sqlQuery += ` AND i.fecha <= $${paramCount}`;
        }
        params.push(fecha_fin);
      }

      // Filtro por tipo si se especifica
      // Nota: La lógica de filtrado por tipo se maneja en la construcción inicial de sqlQuery

      sqlQuery += ' ORDER BY fecha DESC, created_at DESC';

      // Agregar paginación
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params);

      // Obtener total de registros para paginación
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM (
          SELECT id_ingreso FROM financial.ingresos WHERE id_caja = $1
      `;

      const countParams = [caja_id];
      let countParamCount = 1;

      if (!tipo || tipo === 'egreso') {
        countQuery += `
          UNION ALL
          SELECT id_egreso FROM financial.egresos WHERE id_caja = $1
        `;
      }

      if (fecha_inicio) {
        countParamCount++;
        countQuery += ` AND fecha >= $${countParamCount}`;
        countParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        countParamCount++;
        countQuery += ` AND fecha <= $${countParamCount}`;
        countParams.push(fecha_fin);
      }

      countQuery += ') as movimientos';

      const countResult = await query(countQuery, countParams);

      res.json({
        success: true,
        message: 'Movimientos obtenidos exitosamente',
        data: {
          caja: cajaResult.rows[0],
          movimientos: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset),
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener movimientos de caja:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default CajasController;
