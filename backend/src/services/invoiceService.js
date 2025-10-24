import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';

export class InvoiceService {
  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.stockService = new StockService();
    this.therapyService = new TherapyService();
    this.cashService = new CashService();
    this.clientService = new ClientService();
  }

  async createInvoice(invoiceData, userId) {
    const { id_cliente, cliente_nuevo, id_consulta, items, descuento = 0, notas = null, tipo_pago = 'Efectivo' } = invoiceData;

    // Resolver cliente: usar existente o crear nuevo
    let clienteId = id_cliente;
    if (cliente_nuevo) {
      clienteId = await this.clientService.findOrCreateClient(cliente_nuevo, userId);
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Validar stock para todos los productos
      await this.stockService.validateStockAvailability(items);

      // Obtener caja activa
      const cajaActiva = await this.cashService.getCajaActiva();

      // Crear factura
      const factura = await this.invoiceRepository.create({
        id_cliente: clienteId,
        id_consulta,
        descuento,
        notas,
        tipo_pago,
        id_caja: cajaActiva.id_caja,
        created_by: userId
      });

      // Procesar líneas de factura
      const lineas = await this.processInvoiceLines(factura.id_factura, items, id_consulta);

      // Calcular y actualizar totales
      const totales = this.calculateTotals(lineas, descuento);
      await this.invoiceRepository.updateTotals(factura.id_factura, totales);

      // Actualizar stock
      await this.stockService.updateStock(items);

      // Registrar movimiento en caja si no es crédito
      if (tipo_pago !== 'Crédito') {
        await this.cashService.registrarIngreso(factura, totales.total, tipo_pago, userId);
      }

      // Procesar terapias
      await this.therapyService.processTherapies(items, id_consulta, factura.id_factura);

      await query('COMMIT');

      return await this.invoiceRepository.getById(factura.id_factura);

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async processInvoiceLines(invoiceId, items, consultaId) {
    const lineas = [];

    for (const item of items) {
      const linea = await this.invoiceRepository.createLinea(invoiceId, item, consultaId);
      lineas.push(linea);
    }

    return lineas;
  }

  calculateTotals(lineas, descuento = 0) {
    const subtotal = lineas.reduce((sum, linea) => sum + (linea.precio_unitario * linea.cantidad), 0);
    const total = subtotal - descuento;

    return {
      subtotal,
      impuestos: 0, // Por ahora sin IVA
      descuento,
      total
    };
  }

  async cancelInvoice(invoiceId, userId) {
    await query('BEGIN');

    try {
      const factura = await this.invoiceRepository.getById(invoiceId);

      // Devolver stock
      await this.stockService.returnStock(invoiceId);

      // Cancelar terapias
      await this.therapyService.cancelTherapies(invoiceId);

      // Registrar egreso si estaba pagada
      if (factura.estado === 'Pagada') {
        await this.cashService.registrarEgresoCancelacion(factura, userId);
      }

      // Actualizar estado
      await this.invoiceRepository.updateStatus(invoiceId, 'Cancelada');

      await query('COMMIT');

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async payCreditInvoice(invoiceId, paymentData, userId) {
    const { metodo_pago = 'Efectivo', monto_pagado } = paymentData;

    await query('BEGIN');

    try {
      const factura = await this.invoiceRepository.getById(invoiceId);

      if (factura.estado !== 'Pendiente') {
        throw new Error(`La factura no está pendiente de pago. Estado actual: ${factura.estado}`);
      }

      const montoAPagar = monto_pagado || factura.total;
      if (montoAPagar > factura.total) {
        throw new Error('El monto a pagar no puede ser mayor al total de la factura');
      }

      const nuevoEstado = montoAPagar >= factura.total ? 'Pagada' : 'Pendiente';

      await this.invoiceRepository.updatePaymentStatus(invoiceId, nuevoEstado, metodo_pago);
      await this.cashService.registrarIngresoPagoCredito(factura, montoAPagar, metodo_pago, userId);

      await query('COMMIT');

      return {
        id_factura: invoiceId,
        codigo_factura: factura.codigo_factura,
        estado: nuevoEstado,
        monto_pagado: montoAPagar,
        total_factura: factura.total,
        pendiente: Math.max(0, factura.total - montoAPagar)
      };

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
}

export class InvoiceRepository {
  async create(invoiceData) {
    const result = await query(`
      INSERT INTO financial.facturas_venta (
        id_cliente, id_consulta, descuento, impuestos,
        estado, metodo_pago, notas, id_caja, created_by
      ) VALUES (
        $1, $2, $3, 0, 'Pendiente', $4, $5, $6, $7
      ) RETURNING id_factura, codigo_factura
    `, [
      invoiceData.id_cliente,
      invoiceData.id_consulta,
      invoiceData.descuento,
      invoiceData.tipo_pago,
      invoiceData.notas,
      invoiceData.id_caja,
      invoiceData.created_by
    ]);

    return result.rows[0];
  }

  async getById(invoiceId) {
    const result = await query(`
      SELECT
        f.*,
        c.nombre as cliente_nombre,
        c.cedula as cliente_cedula,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        u.nombre as creado_por
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      LEFT JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
      WHERE f.id_factura = $1
    `, [invoiceId]);

    if (result.rows.length === 0) {
      throw new Error('Factura no encontrada');
    }

    const factura = result.rows[0];

    // Mapear cliente
    if (factura.cliente_nombre) {
      factura.cliente = {
        nombre: factura.cliente_nombre,
        documento: factura.cliente_cedula,
        telefono: factura.cliente_telefono,
        email: factura.cliente_email,
        direccion: factura.cliente_direccion
      };
    }

    // Limpiar campos
    delete factura.cliente_nombre;
    delete factura.cliente_cedula;
    delete factura.cliente_email;
    delete factura.cliente_telefono;
    delete factura.cliente_direccion;

    // Obtener líneas
    const lineasResult = await query(`
      SELECT
        lf.*,
        p.codigo,
        p.nombre as producto_nombre,
        p.descripcion as producto_descripcion,
        p.tipo as producto_tipo,
        p.categoria as producto_categoria,
        p.marca as producto_marca
      FROM financial.lineas_factura lf
      LEFT JOIN financial.productos p ON lf.id_producto = p.id_producto
      WHERE lf.id_factura = $1
      ORDER BY lf.id_linea
    `, [invoiceId]);

    factura.detalles = lineasResult.rows.map(detalle => ({
      ...detalle,
      producto: detalle.codigo ? {
        codigo: detalle.codigo,
        nombre: detalle.producto_nombre,
        descripcion: detalle.producto_descripcion,
        tipo: detalle.producto_tipo,
        categoria: detalle.producto_categoria,
        marca: detalle.producto_marca,
        unidad_medida: 'unidad',
        iva_aplicable: 0
      } : null
    }));

    return factura;
  }

  async createLinea(invoiceId, itemData, consultaId) {
    const item = itemData.producto || itemData;
    const codigo_barras = itemData.codigo_barras || itemData.barcode;
    const codigo = itemData.codigo || itemData.code;
    const cantidad = itemData.cantidad || 1;
    const precio_unitario = itemData.precio_unitario || itemData.price;

    // Buscar producto
    let producto = null;
    if (codigo_barras) {
      const result = await query(
        'SELECT * FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
        [codigo_barras]
      );
      producto = result.rows[0];
    } else if (codigo) {
      const result = await query(
        'SELECT * FROM financial.productos WHERE codigo = $1 AND activo = true',
        [codigo]
      );
      producto = result.rows[0];
    }

    const descripcion = itemData.descripcion || producto?.nombre || 'Producto manual';
    let precioFinal = precio_unitario || producto?.precio_venta || 0;

    // Lógica especial para terapias
    if (producto?.tipo === 'Terapia Individual') {
      precioFinal = await this.calculateTherapyPrice(producto, consultaId);
    }

    // Crear línea
    const result = await query(`
      INSERT INTO financial.lineas_factura (
        id_factura, id_producto, cantidad, precio_unitario, descuento
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      invoiceId,
      producto?.id_producto || null,
      cantidad,
      precioFinal,
      0
    ]);

    return result.rows[0];
  }

  async calculateTherapyPrice(producto, consultaId) {
    if (!consultaId) return producto.precio_venta;

    // Obtener mascota de la consulta
    const consultaResult = await query(
      'SELECT id_mascota FROM clinical.consultas_clinicas WHERE id_consulta = $1',
      [consultaId]
    );

    if (consultaResult.rows.length === 0) return producto.precio_venta;

    const idMascota = consultaResult.rows[0].id_mascota;

    // Verificar paquetes activos
    const paquetesResult = await query(
      'SELECT id_control FROM financial.control_terapias WHERE id_mascota = $1 AND activo = true AND sesiones_restantes > 0',
      [idMascota]
    );

    return paquetesResult.rows.length > 0 ? 0 : producto.precio_venta;
  }

  async updateTotals(invoiceId, totales) {
    await query(`
      UPDATE financial.facturas_venta
      SET impuestos = $1, total = $2
      WHERE id_factura = $3
    `, [totales.impuestos, totales.total, invoiceId]);
  }

  async updateStatus(invoiceId, status) {
    await query(`
      UPDATE financial.facturas_venta
      SET estado = $1
      WHERE id_factura = $2
    `, [status, invoiceId]);
  }

  async updatePaymentStatus(invoiceId, status, metodoPago) {
    await query(`
      UPDATE financial.facturas_venta
      SET estado = $1, metodo_pago = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id_factura = $3
    `, [status, metodoPago, invoiceId]);
  }

  async list(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Aplicar filtros
    if (filters.estado) {
      params.push(filters.estado);
      whereClause += ` AND f.estado = $${params.length}`;
    }

    if (filters.metodo_pago) {
      params.push(filters.metodo_pago);
      whereClause += ` AND f.metodo_pago = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereClause += ` AND (f.codigo_factura ILIKE $${params.length} OR c.nombre ILIKE $${params.length})`;
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
      LEFT JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
      ${whereClause}
      ORDER BY f.fecha DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Contar total
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      ${whereClause}
    `, params.slice(0, -2));

    return {
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }
}

export class StockService {
  async validateStockAvailability(items) {
    for (const item of items) {
      const itemData = item.producto || item;
      const codigo_barras = itemData.codigo_barras || itemData.barcode;
      const codigo = itemData.codigo || itemData.code;
      const cantidad = item.cantidad || 1;

      let producto = null;

      if (codigo_barras) {
        const result = await query(
          'SELECT id_producto, nombre, stock_actual, inventariable FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
          [codigo_barras]
        );
        producto = result.rows[0];
      } else if (codigo) {
        const result = await query(
          'SELECT id_producto, nombre, stock_actual, inventariable FROM financial.productos WHERE codigo = $1 AND activo = true',
          [codigo]
        );
        producto = result.rows[0];
      }

      if (producto?.inventariable && producto.stock_actual < cantidad) {
        throw new Error(`Stock insuficiente para "${producto.nombre}" (código: ${codigo_barras || codigo}). Solicitado: ${cantidad}, Disponible: ${producto.stock_actual}`);
      }
    }
  }

  async updateStock(items) {
    for (const item of items) {
      const itemData = item.producto || item;
      const codigo_barras = itemData.codigo_barras || itemData.barcode;
      const codigo = itemData.codigo || itemData.code;
      const cantidad = item.cantidad || 1;

      if (codigo_barras) {
        await query(
          'UPDATE financial.productos SET stock_actual = stock_actual - $1 WHERE codigo_barras = $2',
          [cantidad, codigo_barras]
        );
      } else if (codigo) {
        await query(
          'UPDATE financial.productos SET stock_actual = stock_actual - $1 WHERE codigo = $2',
          [cantidad, codigo]
        );
      }
    }
  }

  async returnStock(invoiceId) {
    // Obtener líneas de la factura
    const lineasResult = await query(`
      SELECT lf.cantidad, p.nombre, p.inventariable
      FROM financial.lineas_factura lf
      JOIN financial.productos p ON lf.id_producto = p.id_producto
      WHERE lf.id_factura = $1 AND p.inventariable = true
    `, [invoiceId]);

    // Devolver stock
    for (const linea of lineasResult.rows) {
      await query(`
        UPDATE financial.productos
        SET stock_actual = stock_actual + $1, updated_at = CURRENT_TIMESTAMP
        WHERE nombre = $2
      `, [linea.cantidad, linea.nombre]);
    }
  }
}

export class TherapyService {
  async processTherapies(items, consultaId, invoiceId) {
    if (!consultaId) return;

    // Obtener mascota
    const consultaResult = await query(
      'SELECT id_mascota FROM clinical.consultas_clinicas WHERE id_consulta = $1',
      [consultaId]
    );

    if (consultaResult.rows.length === 0) return;

    const idMascota = consultaResult.rows[0].id_mascota;

    // Procesar paquetes
    const paquetes = items.filter(item => {
      const itemData = item.producto || item;
      return itemData.tipo === 'Terapia Paquete';
    });

    for (const paquete of paquetes) {
      const paqueteData = paquete.producto || paquete;
      const sesionesTotal = paqueteData.sesiones_incluidas || 10;

      await query(`
        INSERT INTO financial.control_terapias (
          id_mascota, id_factura, id_producto, tipo, sesiones_total,
          sesiones_usadas, fecha_inicio, activo, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Paquete', $4, 0, CURRENT_DATE, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        idMascota,
        invoiceId,
        paqueteData.id_producto,
        sesionesTotal
      ]);
    }

    // Procesar sesiones individuales gratis
    const sesiones = items.filter(item => {
      const itemData = item.producto || item;
      return itemData.tipo === 'Terapia Individual' && item.precio_unitario === 0;
    });

    if (sesiones.length > 0) {
      // Obtener paquetes activos
      const paquetesActivos = await query(
        'SELECT id_control, sesiones_restantes FROM financial.control_terapias WHERE id_mascota = $1 AND activo = true AND sesiones_restantes > 0 ORDER BY created_at ASC',
        [idMascota]
      );

      let sesionesPorDescontar = sesiones.length;

      for (const paquete of paquetesActivos.rows) {
        if (sesionesPorDescontar <= 0) break;

        const sesionesADescontar = Math.min(sesionesPorDescontar, paquete.sesiones_restantes);

        await query(
          'UPDATE financial.control_terapias SET sesiones_usadas = sesiones_usadas + $1, updated_at = CURRENT_TIMESTAMP WHERE id_control = $2',
          [sesionesADescontar, paquete.id_control]
        );

        await query(`
          INSERT INTO financial.sesiones_terapia (
            id_control, fecha_sesion, observaciones, realizada_por, created_at
          ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, CURRENT_TIMESTAMP)
        `, [
          paquete.id_control,
          `Sesión facturada automáticamente - Factura ${invoiceId}`,
          'Sistema'
        ]);

        sesionesPorDescontar -= sesionesADescontar;
      }
    }
  }

  async cancelTherapies(invoiceId) {
    await query(`
      UPDATE financial.control_terapias
      SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP
      WHERE id_factura = $1 AND estado = 'activa'
    `, [invoiceId]);
  }
}

export class CashService {
  async getCajaActiva() {
    const result = await query(
      'SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1'
    );

    if (result.rows.length === 0) {
      throw new Error('No hay cajas activas configuradas');
    }

    return result.rows[0];
  }

  async registrarIngreso(factura, monto, metodoPago, userId) {
    const codigoIngreso = `ING-${Date.now()}`;

    await query(`
      INSERT INTO financial.ingresos (
        id_ingreso, codigo_ingreso, id_caja, descripcion, monto, categoria, fecha, referencia, metodo_pago, created_at, created_by
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'venta', CURRENT_DATE, $5, $6, CURRENT_TIMESTAMP, $7)
    `, [
      codigoIngreso,
      factura.id_caja,
      `Pago de factura ${factura.codigo_factura}`,
      monto,
      factura.codigo_factura,
      metodoPago,
      userId
    ]);

    // Actualizar saldo de caja
    await query(`
      UPDATE financial.cajas
      SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_caja = $2
    `, [monto, factura.id_caja]);
  }

  async registrarEgresoCancelacion(factura, userId) {
    const codigoEgreso = `CANC-${Date.now()}`;

    await query(`
      INSERT INTO financial.egresos (
        id_egreso, codigo_egreso, id_caja, descripcion, monto, categoria, fecha, referencia, created_at, created_by
      ) VALUES (
        uuid_generate_v4(),
        $1,
        $2,
        $3,
        $4,
        'cancelacion',
        CURRENT_DATE,
        $5,
        CURRENT_TIMESTAMP,
        $6
      )
    `, [
      codigoEgreso,
      factura.id_caja,
      `Cancelación de factura ${factura.codigo_factura}`,
      factura.total,
      factura.codigo_factura,
      userId
    ]);

    // Actualizar saldo de caja
    await query(`
      UPDATE financial.cajas
      SET saldo_actual = saldo_actual - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_caja = $2
    `, [factura.total, factura.id_caja]);
  }

  async registrarIngresoPagoCredito(factura, monto, metodoPago, userId) {
    const codigoIngreso = `ING-${Date.now()}`;

    await query(`
      INSERT INTO financial.ingresos (
        id_ingreso, codigo_ingreso, id_caja, descripcion, monto, categoria, fecha, referencia, metodo_pago, created_at, created_by
      ) VALUES (
        uuid_generate_v4(),
        $1,
        $2,
        $3,
        $4,
        'venta',
        CURRENT_DATE,
        $5,
        $6,
        CURRENT_TIMESTAMP,
        $7
      )
    `, [
      codigoIngreso,
      factura.id_caja,
      `Pago de factura ${factura.codigo_factura}`,
      monto,
      factura.codigo_factura,
      metodoPago,
      userId
    ]);

    // Actualizar saldo de caja
    await query(`
      UPDATE financial.cajas
      SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_caja = $2
    `, [monto, factura.id_caja]);
  }
}

export class ClientService {
  async findOrCreateClient(clientData, userId) {
    const { cedula } = clientData;

    // Buscar cliente por cédula
    const existingClient = await query(
      'SELECT id_cliente FROM clinical.clientes WHERE cedula = $1 AND activo = true',
      [cedula]
    );

    if (existingClient.rows.length > 0) {
      return existingClient.rows[0].id_cliente;
    }

    // Crear nuevo cliente
    const result = await query(`
      INSERT INTO clinical.clientes (
        nombre, cedula, telefono, email, direccion, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_cliente
    `, [
      clientData.nombre,
      clientData.cedula,
      clientData.telefono,
      clientData.email,
      clientData.direccion || null,
      userId
    ]);

    return result.rows[0].id_cliente;
  }
}