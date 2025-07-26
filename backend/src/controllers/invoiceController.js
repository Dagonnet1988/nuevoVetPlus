import { query } from '../config/database.js';
import { validationResult } from 'express-validator';

// Crear nueva factura
export async function createInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de factura inválidos',
        errors: errors.array()
      });
    }

    const {
      id_cliente,
      items, // Array de {codigo_barras?, codigo?, cantidad, precio_unitario, descripcion?}
      descuento = 0,
      notas = null,
      tipo_pago = 'efectivo'
    } = req.body;

    const userId = req.user.id;

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Obtener una caja activa (necesario para el esquema existente)
      const cajaResult = await query(
        'SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1'
      );
      
      if (cajaResult.rows.length === 0) {
        throw new Error('No hay cajas activas configuradas');
      }
      
      const idCaja = cajaResult.rows[0].id_caja;

      // Crear la factura
      const facturaResult = await query(`
        INSERT INTO financial.facturas_venta (
          id_cliente, subtotal, descuento, impuestos, total, 
          estado, metodo_pago, notas, id_caja, created_by
        ) VALUES (
          $1, 0, $2, 0, 0, 'Pendiente', $3, $4, $5, $6
        ) RETURNING id_factura, codigo_factura
      `, [id_cliente, descuento, tipo_pago, notas, idCaja, userId]);

      const factura = facturaResult.rows[0];
      let subtotal = 0;

      // Procesar cada item
      for (const item of items) {
        let producto = null;

        // Buscar producto por código de barras o código
        if (item.codigo_barras) {
          const productoResult = await query(
            'SELECT * FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
            [item.codigo_barras]
          );
          producto = productoResult.rows[0];
        } else if (item.codigo) {
          const productoResult = await query(
            'SELECT * FROM financial.productos WHERE codigo = $1 AND activo = true',
            [item.codigo]
          );
          producto = productoResult.rows[0];
        }

        if (!producto && !item.descripcion) {
          throw new Error(`Producto no encontrado: ${item.codigo_barras || item.codigo}`);
        }

        // Usar datos del producto o datos manuales
        const descripcion = item.descripcion || producto?.nombre || 'Producto manual';
        const precioUnitario = item.precio_unitario || producto?.precio_venta || 0;
        const cantidad = item.cantidad || 1;
        const total = precioUnitario * cantidad;

        // Verificar stock si es inventariable
        if (producto?.inventariable && producto.stock_actual < cantidad) {
          throw new Error(`Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock_actual}`);
        }

        // Insertar detalle de factura
        await query(`
          INSERT INTO financial.lineas_factura (
            id_factura, id_producto, cantidad, precio_unitario, descuento
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          factura.id_factura,
          producto?.id_producto || null,
          cantidad,
          precioUnitario,
          0 // descuento por línea
        ]);

        // Actualizar stock si es inventariable
        if (producto?.inventariable) {
          await query(
            'UPDATE financial.productos SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
            [cantidad, producto.id_producto]
          );
        }

        subtotal += total;
      }

      // Calcular totales
      const impuestos = subtotal * 0.19; // IVA 19%
      const total = subtotal - descuento + impuestos;

      // Actualizar totales de la factura
      await query(`
        UPDATE financial.facturas_venta 
        SET subtotal = $1, impuestos = $2, total = $3, estado = 'Pagada'
        WHERE id_factura = $4
      `, [subtotal, impuestos, total, factura.id_factura]);

      await query('COMMIT');

      // Obtener factura completa
      const facturaCompleta = await getInvoiceById(factura.id_factura);

      res.status(201).json({
        success: true,
        message: 'Factura creada exitosamente',
        data: facturaCompleta
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

// Buscar productos por código de barras para facturación rápida
export async function searchProductForInvoice(req, res) {
  try {
    const { barcode } = req.params;

    if (!barcode || barcode.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Código de barras debe tener al menos 8 dígitos'
      });
    }

    const result = await query(`
      SELECT 
        id_producto,
        codigo,
        codigo_barras,
        nombre,
        descripcion,
        tipo,
        categoria,
        precio_venta,
        stock_actual,
        inventariable,
        sesiones_incluidas,
        duracion_sesion,
        CASE 
          WHEN inventariable = true AND stock_actual <= 0 THEN false
          ELSE true
        END as disponible
      FROM financial.productos 
      WHERE codigo_barras = $1 AND activo = true
    `, [barcode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado con ese código de barras'
      });
    }

    const producto = result.rows[0];

    res.json({
      success: true,
      data: {
        ...producto,
        suggested_quantity: 1,
        line_total: producto.precio_venta
      }
    });

  } catch (error) {
    console.error('Error buscando producto por código de barras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Listar facturas
export async function listInvoices(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      estado,
      desde,
      hasta,
      cliente
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (estado) {
      params.push(estado);
      whereClause += ` AND f.estado = $${params.length}`;
    }

    if (desde) {
      params.push(desde);
      whereClause += ` AND f.fecha >= $${params.length}`;
    }

    if (hasta) {
      params.push(hasta);
      whereClause += ` AND f.fecha <= $${params.length}`;
    }

    if (cliente) {
      params.push(`%${cliente}%`);
      whereClause += ` AND (c.nombre ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    params.push(limit, offset);

    const result = await query(`
      SELECT 
        f.*,
        c.nombre as cliente_nombre,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        u.nombre as creado_por
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      LEFT JOIN auth.usuarios u ON f.created_by = u.id_usuario
      ${whereClause}
      ORDER BY f.fecha DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Contar total de registros
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      ${whereClause}
    `, params.slice(0, -2));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error listando facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener factura por ID
async function getInvoiceById(idFactura) {
  const facturaResult = await query(`
    SELECT 
      f.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono,
      u.nombre as creado_por
    FROM financial.facturas_venta f
    LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
    LEFT JOIN auth.usuarios u ON f.created_by = u.id_usuario
    WHERE f.id_factura = $1
  `, [idFactura]);

  if (facturaResult.rows.length === 0) {
    throw new Error('Factura no encontrada');
  }

  const factura = facturaResult.rows[0];

  // Obtener detalles
  const detallesResult = await query(`
    SELECT 
      lf.*,
      p.codigo,
      p.codigo_barras,
      p.nombre as producto_nombre
    FROM financial.lineas_factura lf
    LEFT JOIN financial.productos p ON lf.id_producto = p.id_producto
    WHERE lf.id_factura = $1
    ORDER BY lf.id_linea
  `, [idFactura]);

  factura.detalles = detallesResult.rows;
  return factura;
}

export async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    const factura = await getInvoiceById(id);

    res.json({
      success: true,
      data: factura
    });

  } catch (error) {
    console.error('Error obteniendo factura:', error);
    if (error.message === 'Factura no encontrada') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Actualizar estado de factura
export async function updateInvoiceStatus(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const validStates = ['Pendiente', 'Pagada', 'Cancelada'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    const result = await query(`
      UPDATE financial.facturas_venta 
      SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_factura = $2
      RETURNING id_factura, codigo_factura, estado
    `, [estado, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Estado de factura actualizado',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando estado de factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
