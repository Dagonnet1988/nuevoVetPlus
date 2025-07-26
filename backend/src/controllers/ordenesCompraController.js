import { query } from '../config/database.js';

class OrdenesCompraController {
  /**
   * GESTIÓN DE ÓRDENES DE COMPRA
   */

  // Obtener todas las órdenes de compra
  static async getOrdenesCompra(req, res) {
    try {
      const { 
        estado, 
        proveedor_id, 
        fecha_inicio, 
        fecha_fin,
        vencidas,
        limit = 50, 
        offset = 0 
      } = req.query;
      
      let sqlQuery = `
        SELECT 
          o.*,
          p.nombre as proveedor_nombre,
          p.nit as proveedor_nit,
          (
            SELECT COUNT(*)
            FROM financial.lineas_orden_compra l 
            WHERE l.id_orden = o.id_orden
          ) as cantidad_productos
        FROM financial.ordenes_compra o
        JOIN financial.proveedores p ON o.id_proveedor = p.id_proveedor
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (estado) {
        paramCount++;
        conditions.push(`o.estado = $${paramCount}`);
        params.push(estado);
      }

      if (proveedor_id) {
        paramCount++;
        conditions.push(`o.id_proveedor = $${paramCount}`);
        params.push(proveedor_id);
      }

      if (fecha_inicio) {
        paramCount++;
        conditions.push(`DATE(o.fecha) >= $${paramCount}`);
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        conditions.push(`DATE(o.fecha) <= $${paramCount}`);
        params.push(fecha_fin);
      }

      if (vencidas === 'true') {
        conditions.push(`o.fecha_vencimiento < CURRENT_DATE AND o.estado != 'Pagada'`);
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
      }
      
      sqlQuery += ' ORDER BY o.fecha DESC, o.created_at DESC';

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
        message: 'Órdenes de compra obtenidas exitosamente',
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Error al obtener órdenes de compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener orden de compra por ID con líneas
  static async getOrdenCompraById(req, res) {
    try {
      const { id } = req.params;

      // Obtener orden principal
      const ordenResult = await query(`
        SELECT 
          o.*,
          p.nombre as proveedor_nombre,
          p.nit as proveedor_nit,
          p.telefono as proveedor_telefono,
          p.email as proveedor_email,
          p.direccion as proveedor_direccion
        FROM financial.ordenes_compra o
        JOIN financial.proveedores p ON o.id_proveedor = p.id_proveedor
        WHERE o.id_orden = $1
      `, [id]);

      if (ordenResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden de compra no encontrada'
        });
      }

      // Obtener líneas de la orden
      const lineasResult = await query(`
        SELECT 
          l.*,
          pr.nombre as producto_nombre,
          pr.codigo as producto_codigo,
          pr.marca as producto_marca
        FROM financial.lineas_orden_compra l
        JOIN financial.productos pr ON l.id_producto = pr.id_producto
        WHERE l.id_orden = $1
        ORDER BY l.created_at
      `, [id]);

      const orden = ordenResult.rows[0];
      orden.lineas = lineasResult.rows;

      res.json({
        success: true,
        message: 'Orden de compra obtenida exitosamente',
        data: orden
      });
    } catch (error) {
      console.error('Error al obtener orden de compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Crear nueva orden de compra
  static async createOrdenCompra(req, res) {
    try {
      const {
        id_proveedor,
        tipo_pago,
        fecha_vencimiento,
        notas,
        lineas
      } = req.body;

      if (!lineas || lineas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La orden debe tener al menos una línea de productos'
        });
      }

      // Generar código único para la orden
      const timestamp = Date.now().toString().slice(-6);
      const codigo_orden = `OC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${timestamp}`;

      // Calcular total
      const total = lineas.reduce((sum, linea) => {
        return sum + (parseFloat(linea.precio_unitario) * parseInt(linea.cantidad));
      }, 0);

      // Iniciar transacción
      await query('BEGIN');

      try {
        // Crear orden principal
        const ordenResult = await query(`
          INSERT INTO financial.ordenes_compra (
            id_orden,
            codigo_orden,
            id_proveedor,
            total,
            tipo_pago,
            fecha_vencimiento,
            notas,
            created_by
          ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [codigo_orden, id_proveedor, total, tipo_pago, fecha_vencimiento, notas, req.user.id]);

        const orden = ordenResult.rows[0];

        // Crear líneas de la orden
        const lineasCreadas = [];
        for (const linea of lineas) {
          const lineaResult = await query(`
            INSERT INTO financial.lineas_orden_compra (
              id_linea,
              id_orden,
              id_producto,
              cantidad,
              precio_unitario
            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4)
            RETURNING *
          `, [
            orden.id_orden,
            linea.id_producto,
            linea.cantidad,
            linea.precio_unitario
          ]);

          lineasCreadas.push(lineaResult.rows[0]);
        }

        await query('COMMIT');

        orden.lineas = lineasCreadas;

        res.status(201).json({
          success: true,
          message: 'Orden de compra creada exitosamente',
          data: orden
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error al crear orden de compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Recibir orden de compra (actualizar stock)
  static async recibirOrdenCompra(req, res) {
    try {
      const { id } = req.params;
      const { crear_egreso = true, notas_recepcion } = req.body;

      // Verificar que la orden existe y está pendiente
      const ordenCheck = await query(
        'SELECT * FROM financial.ordenes_compra WHERE id_orden = $1 AND estado = $2',
        [id, 'Pendiente']
      );

      if (ordenCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden de compra no encontrada o ya fue procesada'
        });
      }

      const orden = ordenCheck.rows[0];

      // Iniciar transacción
      await query('BEGIN');

      try {
        // Actualizar estado de la orden
        await query(`
          UPDATE financial.ordenes_compra 
          SET 
            estado = 'Recibida',
            notas = COALESCE(notas, '') || $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id_orden = $1
        `, [id, notas_recepcion ? `\n[RECEPCIÓN] ${notas_recepcion}` : '']);

        // Obtener líneas de la orden
        const lineasResult = await query(`
          SELECT l.*, p.inventariable
          FROM financial.lineas_orden_compra l
          JOIN financial.productos p ON l.id_producto = p.id_producto
          WHERE l.id_orden = $1
        `, [id]);

        // Actualizar stock de productos inventariables
        for (const linea of lineasResult.rows) {
          if (linea.inventariable) {
            await query(`
              UPDATE financial.productos 
              SET 
                stock_actual = stock_actual + $2,
                precio_compra = $3,
                updated_at = CURRENT_TIMESTAMP
              WHERE id_producto = $1
            `, [linea.id_producto, linea.cantidad, linea.precio_unitario]);
          }
        }

        // Crear egreso automático si se solicita
        if (crear_egreso) {
          // Obtener concepto de egreso para compras
          const conceptoResult = await query(`
            SELECT id_concepto 
            FROM financial.conceptos_egresos 
            WHERE codigo = 'EGR02-001'
            LIMIT 1
          `);

          if (conceptoResult.rows.length > 0) {
            const timestamp = Date.now().toString().slice(-6);
            const codigo_egreso = `EGR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${timestamp}`;

            // Obtener caja activa
            const cajaActiva = await query(
              'SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1'
            );

            if (cajaActiva.rows.length > 0) {
              await query(`
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
                  id_orden_compra,
                  created_by
                ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, 'Compras', $8, $9)
              `, [
                codigo_egreso,
                cajaActiva.rows[0].id_caja,
                orden.total,
                `Pago orden de compra ${orden.codigo_orden}`,
                orden.tipo_pago === 'Contado' ? 'Efectivo' : 'Transferencia',
                orden.codigo_orden,
                conceptoResult.rows[0].id_concepto,
                orden.id_orden,
                req.user.id
              ]);
            }
          }
        }

        await query('COMMIT');

        res.json({
          success: true,
          message: 'Orden de compra recibida exitosamente',
          data: {
            orden_actualizada: true,
            stock_actualizado: true,
            egreso_creado: crear_egreso
          }
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error al recibir orden de compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener órdenes próximas a vencer
  static async getOrdenesVencimientos(req, res) {
    try {
      const { dias = 7 } = req.query;

      const result = await query(`
        SELECT 
          o.*,
          p.nombre as proveedor_nombre,
          p.telefono as proveedor_telefono,
          EXTRACT(DAY FROM (o.fecha_vencimiento - CURRENT_DATE)) as dias_restantes
        FROM financial.ordenes_compra o
        JOIN financial.proveedores p ON o.id_proveedor = p.id_proveedor
        WHERE o.tipo_pago = 'Crédito'
          AND o.estado IN ('Recibida', 'Pendiente')
          AND o.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${parseInt(dias)} days'
        ORDER BY o.fecha_vencimiento ASC
      `);

      res.json({
        success: true,
        message: 'Órdenes próximas a vencer obtenidas exitosamente',
        data: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error al obtener vencimientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Marcar orden como pagada
  static async pagarOrdenCompra(req, res) {
    try {
      const { id } = req.params;
      const { metodo_pago, referencia_pago, notas } = req.body;

      const result = await query(`
        UPDATE financial.ordenes_compra 
        SET 
          estado = 'Pagada',
          notas = COALESCE(notas, '') || $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_orden = $1 AND estado IN ('Recibida', 'Pendiente')
        RETURNING *
      `, [id, `\n[PAGO] ${metodo_pago} - ${referencia_pago || 'Sin referencia'} - ${notas || ''}`]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden de compra no encontrada o ya está pagada'
        });
      }

      res.json({
        success: true,
        message: 'Orden de compra marcada como pagada',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al marcar orden como pagada:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default OrdenesCompraController;