import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import fs from 'fs/promises';
import pdfGeneratorService from '../services/pdfGeneratorService.js';
import { InvoiceService } from '../services/invoiceService.js';

const invoiceService = new InvoiceService();

// Endpoint de debug para verificar estado de facturas
export async function debugInvoices(req, res) {
  try {
    console.log('🔍 Verificando estado de facturas...');

    // Verificar facturas recientes
    const facturasRecientes = await query(`
      SELECT
        f.id_factura,
        f.codigo_factura,
        f.estado,
        f.total,
        f.fecha,
        c.nombre as cliente,
        COUNT(lf.id_linea) as lineas
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      LEFT JOIN financial.lineas_factura lf ON f.id_factura = lf.id_factura
      WHERE f.fecha >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY f.id_factura, f.codigo_factura, f.estado, f.total, f.fecha, c.nombre
      ORDER BY f.fecha DESC
      LIMIT 10
    `);

    // Verificar movimientos de caja recientes
    const movimientosCaja = await query(`
      SELECT
        i.id_ingreso,
        i.descripcion,
        i.monto,
        i.fecha,
        i.referencia as codigo_factura,
        f.id_factura
      FROM financial.ingresos i
      LEFT JOIN financial.facturas_venta f ON i.referencia = f.codigo_factura
      WHERE i.fecha >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY i.fecha DESC
      LIMIT 10
    `);

    // Verificar saldo de cajas
    const saldoCajas = await query(`
      SELECT
        id_caja,
        nombre,
        saldo_actual,
        activa
      FROM financial.cajas
      WHERE activa = true
    `);

    res.json({
      success: true,
      data: {
        facturas_recientes: facturasRecientes.rows,
        movimientos_caja: movimientosCaja.rows,
        saldo_cajas: saldoCajas.rows
      }
    });

  } catch (error) {
    console.error('Error en debug de facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

// Crear nueva factura
export async function createInvoice(req, res) {
  try {
    console.log('📝 Datos recibidos en createInvoice:', JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      console.log('📝 Datos que fallaron validación:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Datos de factura inválidos',
        errors: errors.array()
      });
    }

    const {
      id_cliente,
      cliente_nuevo,
      id_consulta,
      items, // Array de {codigo_barras?, codigo?, cantidad, precio_unitario, descripcion?}
      lineas, // Array alternativo de líneas de factura
      descuento = 0,
      notas = null,
      tipo_pago = 'Efectivo'
    } = req.body;

    // Usar items o lineas según lo que llegue
    const productos = items || lineas;

    console.log('🔍 Items/lineas extraídos:', productos);
    console.log('📊 Tipo de productos:', Array.isArray(productos) ? 'Array' : typeof productos);
    console.log('📊 Longitud de productos:', productos ? productos.length : 'undefined');

    const userId = req.user.id;

    // Validar que productos sea un array
    if (!Array.isArray(productos)) {
      return res.status(400).json({
        success: false,
        message: 'El campo items/lineas debe ser un array de productos'
      });
    }

    // Validar que haya al menos un producto
    if (productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un producto en la factura'
      });
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // VALIDACIÓN PREVIA: Verificar stock de todos los productos antes de procesar
      console.log('🔍 Realizando validación previa de stock para todos los productos...');

      for (const item of productos) {
        const itemData = item.producto || item;
        const codigo_barras = itemData.codigo_barras || itemData.barcode;
        const codigo = itemData.codigo || itemData.code;
        const cantidad = item.cantidad || itemData.cantidad || 1;

        if (codigo_barras) {
          const productoResult = await query(
            'SELECT id_producto, nombre, stock_actual, inventariable FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
            [codigo_barras]
          );

          if (productoResult.rows.length > 0) {
            const producto = productoResult.rows[0];
            if (producto.inventariable && producto.stock_actual < cantidad) {
              throw new Error(`Stock insuficiente para "${producto.nombre}" (código: ${codigo_barras}). Solicitado: ${cantidad}, Disponible: ${producto.stock_actual}`);
            }
          }
        } else if (codigo) {
          const productoResult = await query(
            'SELECT id_producto, nombre, stock_actual, inventariable FROM financial.productos WHERE codigo = $1 AND activo = true',
            [codigo]
          );

          if (productoResult.rows.length > 0) {
            const producto = productoResult.rows[0];
            if (producto.inventariable && producto.stock_actual < cantidad) {
              throw new Error(`Stock insuficiente para "${producto.nombre}" (código: ${codigo}). Solicitado: ${cantidad}, Disponible: ${producto.stock_actual}`);
            }
          }
        }
      }

      console.log('✅ Validación previa de stock completada exitosamente');

      // Obtener una caja activa (necesario para el esquema existente)
      const cajaResult = await query(
        'SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1'
      );

      if (cajaResult.rows.length === 0) {
        throw new Error('No hay cajas activas configuradas');
      }

      const idCaja = cajaResult.rows[0].id_caja;

      // CALCULAR SUBTOTAL CON DESCUENTOS APLICADOS
      let subtotal = 0;
      for (const item of productos) {
        console.log('🔍 Procesando item para cálculo de subtotal:', JSON.stringify(item, null, 2));
        let precioUnitario = 0;

        // Extraer información del producto (manejar estructura anidada del frontend)
        const itemData = item.producto || item;
        const codigo_barras = itemData.codigo_barras || itemData.barcode;
        const codigo = itemData.codigo || itemData.code;
        const cantidad = item.cantidad || itemData.cantidad || 1;
        const descuentoItem = item.descuento || 0;

        // Buscar producto por código de barras o código
        if (codigo_barras) {
          console.log('🔎 Buscando por código de barras:', codigo_barras);
          const productoResult = await query(
            'SELECT precio_venta FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
            [codigo_barras]
          );
          if (productoResult.rows.length > 0) {
            precioUnitario = productoResult.rows[0].precio_venta;
          }
        } else if (codigo) {
          console.log('🔎 Buscando por código:', codigo);
          const productoResult = await query(
            'SELECT precio_venta FROM financial.productos WHERE codigo = $1 AND activo = true',
            [codigo]
          );
          if (productoResult.rows.length > 0) {
            precioUnitario = productoResult.rows[0].precio_venta;
          }
        }

        // Usar precio del item si no se encontró producto
        precioUnitario = item.precio_unitario || itemData.precio_unitario || itemData.price || precioUnitario || 0;

        // Aplicar descuento por línea
        const precioConDescuento = precioUnitario * (1 - descuentoItem / 100);
        const subtotalLinea = precioConDescuento * cantidad;

        subtotal += subtotalLinea;
      }

      console.log('💰 Subtotal calculado con descuentos:', subtotal);

      // Calcular total inicial (sin impuestos por ahora, descuento general ya aplicado en subtotal)
      const totalInicial = subtotal;

      // Crear la factura con subtotal y total calculados
      const facturaResult = await query(`
        INSERT INTO financial.facturas_venta (
          id_cliente, id_consulta, subtotal, descuento, total, impuestos,
          estado, metodo_pago, notas, id_caja, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 0, 'Pendiente', $6, $7, $8, $9
        ) RETURNING id_factura, codigo_factura
      `, [id_cliente, id_consulta, subtotal, descuento, totalInicial, tipo_pago, notas, idCaja, userId]);

      const factura = facturaResult.rows[0];

      // Procesar cada item
      for (const item of productos) {
        console.log('🔍 Procesando item:', JSON.stringify(item, null, 2));
        let producto = null;

        // Extraer información del producto (manejar estructura anidada del frontend)
        const itemData = item.producto || item; // Si hay objeto producto anidado, usarlo
        const codigo_barras = itemData.codigo_barras || itemData.barcode;
        const codigo = itemData.codigo || itemData.code;
        const cantidad = item.cantidad || itemData.cantidad || 1;
        const precio_unitario = item.precio_unitario || itemData.precio_unitario || itemData.price;
        const descripcion = item.descripcion || itemData.descripcion || itemData.description;

        console.log('📋 Datos extraídos:', { codigo_barras, codigo, cantidad, precio_unitario, descripcion });

        // Buscar producto por código de barras o código
        if (codigo_barras) {
          console.log('🔎 Buscando por código de barras:', codigo_barras);
          const productoResult = await query(
            'SELECT * FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
            [codigo_barras]
          );
          producto = productoResult.rows[0];
          console.log('📦 Producto encontrado por código de barras:', producto ? producto.nombre : 'No encontrado');
        } else if (codigo) {
          console.log('🔎 Buscando por código:', codigo);
          const productoResult = await query(
            'SELECT * FROM financial.productos WHERE codigo = $1 AND activo = true',
            [codigo]
          );
          producto = productoResult.rows[0];
          console.log('�� Producto encontrado por código:', producto ? producto.nombre : 'No encontrado');
        }

        if (!producto && !descripcion) {
          console.log('❌ Error: No se encontró producto y no hay descripción');
          throw new Error(`Producto no encontrado: ${codigo_barras || codigo}`);
        }

        // Usar datos del producto o datos manuales
        const descripcionFinal = descripcion || producto?.nombre || 'Producto manual';
        let precioUnitario = precio_unitario || producto?.precio_venta || 0;

        // LÓGICA ESPECIAL PARA TERAPIAS:
        // 1. Si hay paquete de terapia en la misma factura, sesiones individuales cuestan $0
        // 2. Si no hay paquete, sesiones cuestan precio normal
        // 3. Si se compran paquete + sesión juntos, solo se cobra el paquete

        let hayPaqueteTerapiaEnFactura = false;
        for (const itemCheck of productos) {
          if (itemCheck !== item) { // No verificar el mismo item
            const itemCheckData = itemCheck.producto || itemCheck;
            const checkCodigoBarras = itemCheckData.codigo_barras || itemCheckData.barcode;
            const checkCodigo = itemCheckData.codigo || itemCheckData.code;

            if (checkCodigoBarras) {
              const paqueteResult = await query(
                'SELECT tipo FROM financial.productos WHERE codigo_barras = $1 AND tipo = \'Terapia Paquete\' AND activo = true',
                [checkCodigoBarras]
              );
              if (paqueteResult.rows.length > 0) {
                hayPaqueteTerapiaEnFactura = true;
                break;
              }
            } else if (checkCodigo) {
              const paqueteResult = await query(
                'SELECT tipo FROM financial.productos WHERE codigo = $1 AND tipo = \'Terapia Paquete\' AND activo = true',
                [checkCodigo]
              );
              if (paqueteResult.rows.length > 0) {
                hayPaqueteTerapiaEnFactura = true;
                break;
              }
            }
          }
        }

        // Aplicar lógica de precios según reglas de negocio
        if (hayPaqueteTerapiaEnFactura && producto?.tipo === 'Terapia Individual') {
          precioUnitario = 0; // Sesión individual gratis si hay paquete en la misma factura
          console.log(`🏥 Sesión individual "${producto.nombre}" gratis por paquete en factura`);
        } else if (producto?.tipo === 'Terapia Individual') {
          // Verificar si hay paquetes activos para esta mascota (fuera de esta factura)
          if (id_consulta) {
            // Obtener id_mascota desde la consulta
            const consultaResult = await query(
              'SELECT id_mascota FROM clinical.consultas_clinicas WHERE id_consulta = $1',
              [id_consulta]
            );
            if (consultaResult.rows.length > 0) {
              const idMascota = consultaResult.rows[0].id_mascota;
              const paquetesActivos = await query(
                'SELECT id_control, sesiones_restantes FROM financial.control_terapias WHERE id_mascota = $1 AND activo = true AND sesiones_restantes > 0',
                [idMascota]
              );
              if (paquetesActivos.rows.length > 0) {
                precioUnitario = 0; // Sesión gratis si hay paquete activo
                console.log(`🏥 Sesión individual "${producto.nombre}" gratis por paquete activo existente`);
              }
            }
          }
        }

        const total = precioUnitario * cantidad;

        // Verificar stock si es inventariable
        if (producto?.inventariable) {
          console.log(`📦 Verificando stock para ${producto.nombre}: solicitado=${cantidad}, disponible=${producto.stock_actual}`);

          if (producto.stock_actual < cantidad) {
            throw new Error(`Stock insuficiente para "${producto.nombre}". Cantidad solicitada: ${cantidad}, Stock disponible: ${producto.stock_actual}`);
          }

          if (producto.stock_actual - cantidad < 0) {
            throw new Error(`Operación resultaría en stock negativo para "${producto.nombre}". Stock actual: ${producto.stock_actual}, Cantidad solicitada: ${cantidad}`);
          }

          console.log(`✅ Stock verificado correctamente para ${producto.nombre}`);
        } else if (producto) {
          console.log(`📦 Producto "${producto.nombre}" no es inventariable, omitiendo validación de stock`);
        } else {
          console.log(`📝 Producto manual "${descripcionFinal}", omitiendo validación de stock`);
        }

        // Calcular descuento por línea si existe
        const descuentoLinea = item.descuento || 0;
        const subtotalLinea = precioUnitario * cantidad;
        const montoDescuentoLinea = (subtotalLinea * descuentoLinea) / 100;
        const precioConDescuento = precioUnitario - (precioUnitario * descuentoLinea / 100);

        // Insertar detalle de factura
        await query(`
          INSERT INTO financial.lineas_factura (
            id_factura, id_producto, cantidad, precio_unitario, descuento
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          factura.id_factura,
          producto?.id_producto || null,
          cantidad,
          precioConDescuento,
          descuentoLinea
        ]);

        // Actualizar stock si es inventariable
        if (producto?.inventariable) {
          console.log(`📦 Actualizando stock para ${producto.nombre}: ${producto.stock_actual} - ${cantidad} = ${producto.stock_actual - cantidad}`);

          const updateResult = await query(
            'UPDATE financial.productos SET stock_actual = stock_actual - $1 WHERE id_producto = $2 RETURNING stock_actual',
            [cantidad, producto.id_producto]
          );

          if (updateResult.rows.length === 0) {
            throw new Error(`Error al actualizar stock: producto ${producto.nombre} no encontrado`);
          }

          const nuevoStock = updateResult.rows[0].stock_actual;
          console.log(`✅ Stock actualizado para ${producto.nombre}: nuevo stock = ${nuevoStock}`);

          // Verificación adicional: asegurar que no haya stock negativo
          if (nuevoStock < 0) {
            throw new Error(`Error crítico: stock negativo detectado para "${producto.nombre}" después de actualización. Stock: ${nuevoStock}`);
          }
        }

        // Subtotal ya calculado antes del INSERT
      }

      // Calcular totales finales (impuestos = 0 por defecto, se puede configurar después si es necesario)
      const impuestos = 0; // No calcular IVA automáticamente
      const totalFinal = subtotal - descuento + impuestos;

      // Determinar estado según tipo de pago
      const estadoFinal = (tipo_pago === 'Crédito') ? 'Pendiente' : 'Pagada';

      // Actualizar estado de la factura (total ya está calculado en el INSERT)
      await query(`
        UPDATE financial.facturas_venta
        SET estado = $1
        WHERE id_factura = $2
      `, [estadoFinal, factura.id_factura]);

      // REGISTRAR MOVIMIENTO EN LA CAJA SOLO SI NO ES CRÉDITO
      if (tipo_pago !== 'Crédito') {
        console.log('💰 Registrando movimiento en caja...');
        const codigoIngreso = `ING-${Date.now()}`;
        await query(`
          INSERT INTO financial.ingresos (
            id_ingreso, codigo_ingreso, id_caja, descripcion, monto, categoria, fecha, referencia, metodo_pago, created_at, created_by
          ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'venta', CURRENT_DATE, $5, $6, CURRENT_TIMESTAMP, $7)
        `, [codigoIngreso, idCaja, `Pago de factura ${factura.codigo_factura}`, totalInicial, factura.codigo_factura, tipo_pago, userId]);

        // Actualizar saldo de la caja
        await query(`
          UPDATE financial.cajas
          SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id_caja = $2
        `, [totalInicial, idCaja]);

        console.log('✅ Movimiento de caja registrado exitosamente');
      } else {
        console.log('💳 Factura a crédito - No se registra movimiento en caja');
      }      await query('COMMIT');

      // PROCESAR PAQUETES DE TERAPIA: Crear registros en control_terapias
      console.log('🏥 Procesando paquetes de terapia...');
      const paquetesTerapia = productos.filter(item => {
        const itemData = item.producto || item;
        return itemData.tipo === 'Terapia Paquete';
      });

      if (paquetesTerapia.length > 0 && id_consulta) {
        // Obtener id_mascota desde la consulta
        const consultaResult = await query(
          'SELECT id_mascota FROM clinical.consultas_clinicas WHERE id_consulta = $1',
          [id_consulta]
        );

        if (consultaResult.rows.length > 0) {
          const idMascota = consultaResult.rows[0].id_mascota;

          for (const paquete of paquetesTerapia) {
            const paqueteData = paquete.producto || paquete;
            const sesionesTotal = paqueteData.sesiones_incluidas || 10; // Default 10 sesiones

            // Crear registro en control_terapias
            await query(`
              INSERT INTO financial.control_terapias (
                id_mascota, id_factura, id_producto, tipo, sesiones_total,
                sesiones_usadas, fecha_inicio, activo, created_at, updated_at
              ) VALUES ($1, $2, $3, 'Paquete', $4, 0, CURRENT_DATE, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              idMascota,
              factura.id_factura,
              paqueteData.id_producto,
              sesionesTotal
            ]);

            console.log(`✅ Paquete de terapia registrado: ${paqueteData.nombre} (${sesionesTotal} sesiones) para mascota ${idMascota}`);
          }
        } else {
          console.warn('⚠️ No se pudo obtener id_mascota para procesar paquetes de terapia');
        }
      }

      // PROCESAR SESIONES DE TERAPIA: Descontar de paquetes activos
      console.log('🏥 Procesando sesiones de terapia...');
      const sesionesTerapia = productos.filter(item => {
        const itemData = item.producto || item;
        return itemData.tipo === 'Terapia Individual' && item.precio_unitario === 0; // Solo sesiones gratis
      });

      if (sesionesTerapia.length > 0 && id_consulta) {
        // Obtener id_mascota desde la consulta
        const consultaResult = await query(
          'SELECT id_mascota FROM clinical.consultas_clinicas WHERE id_consulta = $1',
          [id_consulta]
        );

        if (consultaResult.rows.length > 0) {
          const idMascota = consultaResult.rows[0].id_mascota;

          // Obtener paquetes activos para esta mascota
          const paquetesActivos = await query(
            'SELECT id_control, sesiones_restantes FROM financial.control_terapias WHERE id_mascota = $1 AND activo = true AND sesiones_restantes > 0 ORDER BY created_at ASC',
            [idMascota]
          );

          if (paquetesActivos.rows.length > 0) {
            let sesionesPorDescontar = sesionesTerapia.length;

            for (const paquete of paquetesActivos.rows) {
              if (sesionesPorDescontar <= 0) break;

              const sesionesADescontar = Math.min(sesionesPorDescontar, paquete.sesiones_restantes);

              // Actualizar sesiones usadas en el paquete
              await query(
                'UPDATE financial.control_terapias SET sesiones_usadas = sesiones_usadas + $1, updated_at = CURRENT_TIMESTAMP WHERE id_control = $2',
                [sesionesADescontar, paquete.id_control]
              );

              // Registrar sesión individual
              await query(`
                INSERT INTO financial.sesiones_terapia (
                  id_control, fecha_sesion, observaciones, realizada_por, created_at
                ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, CURRENT_TIMESTAMP)
              `, [
                paquete.id_control,
                `Sesión facturada automáticamente - Factura ${factura.codigo_factura}`,
                userId
              ]);

              sesionesPorDescontar -= sesionesADescontar;
              console.log(`✅ Descontadas ${sesionesADescontar} sesiones del paquete ${paquete.id_control}`);
            }

            if (sesionesPorDescontar > 0) {
              console.warn(`⚠️ No había suficientes sesiones en paquetes activos. Faltaron ${sesionesPorDescontar} sesiones`);
            }
          } else {
            console.warn('⚠️ No hay paquetes activos para descontar sesiones de terapia');
          }
        }
      }

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
        nombre,
        descripcion,
        tipo,
        categoria,
        precio_venta,
        stock_actual,
        inventariable,
        CASE 
          WHEN inventariable = true AND stock_actual <= 0 THEN false
          ELSE true
        END as disponible
      FROM financial.productos
      WHERE codigo = $1 AND activo = true
    `, [barcode]);    if (result.rows.length === 0) {
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
      cliente,
      search,
      metodo_pago,
      caja
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

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (f.codigo_factura ILIKE $${params.length} OR c.nombre ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    if (metodo_pago) {
      params.push(metodo_pago);
      whereClause += ` AND f.metodo_pago = $${params.length}`;
    }

    if (caja) {
      params.push(caja);
      whereClause += ` AND f.id_caja = $${params.length}`;
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

    // Contar total de registros
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM financial.facturas_venta f
      LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
      ${whereClause}
    `, params.slice(0, -2));;
    
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
      c.cedula as cliente_cedula,
      c.email as cliente_email,
      c.telefono as cliente_telefono,
      c.direccion as cliente_direccion,
      u.nombre as creado_por
    FROM financial.facturas_venta f
    LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
    LEFT JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
    WHERE f.id_factura = $1
  `, [idFactura]);

  console.log('Factura query result:', facturaResult.rows.length, 'rows');

  if (facturaResult.rows.length === 0) {
    throw new Error('Factura no encontrada');
  }

  const factura = facturaResult.rows[0];

  // Mapear información del cliente
  if (factura.cliente_nombre) {
    factura.cliente = {
      nombre: factura.cliente_nombre,
      documento: factura.cliente_cedula,
      telefono: factura.cliente_telefono,
      email: factura.cliente_email,
      direccion: factura.cliente_direccion
    };
  }

  // Limpiar campos del cliente del objeto principal
  delete factura.cliente_nombre;
  delete factura.cliente_cedula;
  delete factura.cliente_email;
  delete factura.cliente_telefono;
  delete factura.cliente_direccion;

  // Obtener detalles
  const detallesResult = await query(`
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
  `, [idFactura]);

  console.log('Detalles query result:', detallesResult.rows.length, 'rows');

  // Mapear detalles con información del producto
  factura.detalles = detallesResult.rows.map(detalle => ({
    ...detalle,
    producto: detalle.codigo ? {
      codigo: detalle.codigo,
      nombre: detalle.producto_nombre,
      descripcion: detalle.producto_descripcion,
      tipo: detalle.producto_tipo,
      categoria: detalle.producto_categoria,
      marca: detalle.producto_marca,
      unidad_medida: 'unidad', // Valor por defecto
      iva_aplicable: 0 // Valor por defecto
    } : null
  }));

  return factura;
}export async function getInvoice(req, res) {
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

// Actualizar factura completa
export async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const {
      id_cliente,
      fecha,
      subtotal,
      impuestos,
      descuento,
      total,
      metodo_pago,
      estado,
      id_caja,
      notas,
      lineas
    } = req.body;

    // Verificar que la factura existe
    const existingInvoice = await query(
      'SELECT id_factura FROM financial.facturas_venta WHERE id_factura = $1',
      [id]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Actualizar la factura principal
    const updateResult = await query(`
      UPDATE financial.facturas_venta
      SET
        id_cliente = COALESCE($1, id_cliente),
        fecha = COALESCE($2, fecha),
        impuestos = COALESCE($3, impuestos),
        descuento = COALESCE($4, descuento),
        metodo_pago = COALESCE($5, metodo_pago),
        estado = COALESCE($6, estado),
        id_caja = COALESCE($7, id_caja),
        notas = COALESCE($8, notas)
      WHERE id_factura = $9
      RETURNING *
    `, [id_cliente, fecha, impuestos, descuento, metodo_pago, estado, id_caja, notas, id]);

    // Si se proporcionan líneas, actualizarlas también
    if (lineas && Array.isArray(lineas)) {
      // Primero eliminar las líneas existentes
      await query('DELETE FROM financial.lineas_factura WHERE id_factura = $1', [id]);

      // Insertar las nuevas líneas
      for (const linea of lineas) {
        await query(`
          INSERT INTO financial.lineas_factura (
            id_factura, id_producto, cantidad, precio_unitario, descuento
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          id,
          linea.id_producto,
          linea.cantidad,
          linea.precio_unitario,
          linea.descuento || 0
        ]);
      }
    }

    res.json({
      success: true,
      message: 'Factura actualizada exitosamente',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando factura:', error);
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
    const userId = req.user.id;

    const validStates = ['pendiente', 'pagada', 'cancelada'];
    const estadoLower = estado.toLowerCase();

    if (!validStates.includes(estadoLower)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Estados válidos: pendiente, pagada, cancelada'
      });
    }

    // Iniciar transacción para asegurar consistencia
    await query('BEGIN');

    try {
      // Verificar que la factura existe y obtener su estado actual
      const facturaResult = await query(`
        SELECT id_factura, codigo_factura, estado, total, id_caja
        FROM financial.facturas_venta
        WHERE id_factura = $1
      `, [id]);

      if (facturaResult.rows.length === 0) {
        throw new Error('Factura no encontrada');
      }

      const factura = facturaResult.rows[0];

      // Validaciones de negocio
      if (factura.estado === 'cancelada' && estadoLower !== 'cancelada') {
        throw new Error('No se puede cambiar el estado de una factura cancelada');
      }

      if (factura.estado === 'pagada' && estadoLower === 'cancelada') {
        throw new Error('No se puede cancelar una factura que ya fue pagada');
      }

      // Si se está cancelando la factura, ejecutar lógica de cancelación
      if (estadoLower === 'cancelada') {
        await cancelInvoiceLogic(id, userId);
      }

      // Si se está marcando como pagada una factura pendiente (crédito)
      if (estadoLower === 'pagada' && factura.estado === 'pendiente') {
        await markInvoiceAsPaid(id, userId, factura);
      }

      // Actualizar el estado de la factura
      const result = await query(`
        UPDATE financial.facturas_venta
        SET estado = $1
        WHERE id_factura = $2
        RETURNING id_factura, codigo_factura, estado
      `, [estadoLower, id]);

      await query('COMMIT');

      res.json({
        success: true,
        message: `Estado de factura actualizado a ${estadoLower}`,
        data: result.rows[0]
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error actualizando estado de factura:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}

// Procesar pago de factura a crédito
export async function payCreditInvoice(req, res) {
  try {
    const { id } = req.params;
    const { metodo_pago = 'Efectivo', monto_pagado } = req.body;
    const userId = req.user.id;

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Verificar que la factura existe y está pendiente
      const facturaResult = await query(`
        SELECT id_factura, codigo_factura, estado, total, id_caja, cliente_id
        FROM financial.facturas_venta
        WHERE id_factura = $1
      `, [id]);

      if (facturaResult.rows.length === 0) {
        throw new Error('Factura no encontrada');
      }

      const factura = facturaResult.rows[0];

      // Validaciones de negocio
      if (factura.estado !== 'pendiente') {
        throw new Error(`La factura no está pendiente de pago. Estado actual: ${factura.estado}`);
      }

      // Validar monto a pagar (opcional, por defecto paga el total)
      const montoAPagar = monto_pagado || factura.total;
      if (montoAPagar > factura.total) {
        throw new Error('El monto a pagar no puede ser mayor al total de la factura');
      }

      // Actualizar estado de la factura
      const nuevoEstado = montoAPagar >= factura.total ? 'pagada' : 'pendiente';
      await query(`
        UPDATE financial.facturas_venta
        SET estado = $1, metodo_pago = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id_factura = $3
      `, [nuevoEstado, metodo_pago, id]);

      // Registrar movimiento en la caja
      console.log('💰 Registrando pago de factura a crédito en caja...');
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
        montoAPagar,
        factura.codigo_factura,
        metodo_pago,
        userId
      ]);

      // Actualizar saldo de la caja
      await query(`
        UPDATE financial.cajas
        SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_caja = $2
      `, [montoAPagar, factura.id_caja]);

      await query('COMMIT');

      console.log('✅ Pago de factura a crédito procesado exitosamente');

      res.json({
        success: true,
        message: 'Pago de factura a crédito procesado exitosamente',
        data: {
          id_factura: id,
          codigo_factura: factura.codigo_factura,
          estado: nuevoEstado,
          monto_pagado: montoAPagar,
          total_factura: factura.total,
          pendiente: Math.max(0, factura.total - montoAPagar)
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error procesando pago de factura a crédito:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}

// Exportar factura en PDF
export async function exportInvoice(req, res) {
  try {
    const { id } = req.params;
    const { formato = 'pdf' } = req.query;

    if (formato !== 'pdf') {
      return res.status(400).json({
        success: false,
        message: 'Formato no soportado. Solo se soporta PDF.'
      });
    }

    // Generar PDF usando el método existente
    const filepath = await pdfGeneratorService.generarFacturaPDF(id);

    // Leer el archivo generado
    const pdfBuffer = await fs.readFile(filepath);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);

    // Limpiar archivo temporal después de enviarlo
    setTimeout(() => {
      fs.unlink(filepath).catch(err => console.error('Error eliminando archivo temporal:', err));
    }, 1000);

  } catch (error) {
    console.error('Error exportando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

// Obtener resumen de facturación
export async function getInvoiceSummary(req, res) {
  try {
    // Obtener estadísticas básicas de facturación (todas las facturas)
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN estado = 'Pagada' THEN 1 END) as facturas_pagadas,
        COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as facturas_pendientes,
        COUNT(CASE WHEN estado = 'Cancelada' THEN 1 END) as facturas_canceladas,
        COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN total ELSE 0 END), 0) as ingresos_totales,
        COALESCE(SUM(CASE WHEN estado = 'Pendiente' THEN total ELSE 0 END), 0) as pendientes_cobro,
        COALESCE(AVG(CASE WHEN estado = 'Pagada' THEN total ELSE 0 END), 0) as factura_promedio
      FROM financial.facturas_venta
    `);

    // Obtener ventas del día actual (todas las facturas del día, no solo pagadas)
    const ventasDiaResult = await query(`
      SELECT COALESCE(SUM(total), 0) as total_ventas_dia
      FROM financial.facturas_venta
      WHERE DATE(fecha) = CURRENT_DATE
    `);

    // Obtener ventas del mes actual (todas las facturas del mes, no solo pagadas)
    const ventasMesResult = await query(`
      SELECT COALESCE(SUM(total), 0) as total_ventas_mes
      FROM financial.facturas_venta
      WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const stats = statsResult.rows[0];
    const ventasDia = ventasDiaResult.rows[0];
    const ventasMes = ventasMesResult.rows[0];

    res.json({
      success: true,
      data: {
        total_facturas: parseInt(stats.total_facturas),
        total_ventas_dia: parseFloat(ventasDia.total_ventas_dia),
        total_ventas_mes: parseFloat(ventasMes.total_ventas_mes),
        facturas_pendientes: parseInt(stats.facturas_pendientes),
        productos_mas_vendidos: [],
        ventas_por_metodo_pago: [],
        facturas_recientes: []
      }
    });

  } catch (error) {
    console.error('Error obteniendo resumen de facturación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Función auxiliar para cancelar factura con lógica de negocio completa
async function cancelInvoiceLogic(invoiceId, userId) {
  console.log('🔄 Iniciando proceso de cancelación de factura...');

  // 1. Obtener las líneas de la factura
  const lineasResult = await query(`
    SELECT
      lf.id_linea,
      lf.id_producto,
      lf.cantidad,
      p.nombre as producto_nombre,
      p.tipo,
      p.inventariable
    FROM financial.lineas_factura lf
    JOIN financial.productos p ON lf.id_producto = p.id_producto
    WHERE lf.id_factura = $1
  `, [invoiceId]);

  // 2. Devolver items al inventario (solo productos inventariables)
  for (const linea of lineasResult.rows) {
    if (linea.inventariable && linea.tipo === 'inventariable') {
      console.log(`📦 Devolviendo ${linea.cantidad} unidades de ${linea.producto_nombre} al inventario`);

      await query(`
        UPDATE financial.productos
        SET stock_actual = stock_actual + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = $2
      `, [linea.cantidad, linea.id_producto]);
    }
  }

  // 3. Cancelar paquetes de terapias asociados
  const terapiasResult = await query(`
    SELECT ct.id_control, ct.sesiones_total, ct.sesiones_usadas, p.nombre
    FROM financial.control_terapias ct
    JOIN financial.productos p ON ct.id_producto = p.id_producto
    WHERE ct.id_factura = $1 AND ct.estado = 'activa'
  `, [invoiceId]);

  for (const terapia of terapiasResult.rows) {
    console.log(`🏥 Cancelando paquete de terapia: ${terapia.nombre} (${terapia.sesiones_total} sesiones)`);

    await query(`
      UPDATE financial.control_terapias
      SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP
      WHERE id_control = $1
    `, [terapia.id_control]);
  }

  // 4. Registrar movimiento de cancelación en caja si la factura estaba pagada
  const facturaResult = await query(`
    SELECT estado, total, id_caja, codigo_factura
    FROM financial.facturas_venta
    WHERE id_factura = $1
  `, [invoiceId]);

  if (facturaResult.rows[0].estado === 'pagada') {
    console.log('💰 Registrando movimiento de cancelación en caja...');

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
      facturaResult.rows[0].id_caja,
      `Cancelación de factura ${facturaResult.rows[0].codigo_factura}`,
      facturaResult.rows[0].total,
      facturaResult.rows[0].codigo_factura,
      userId
    ]);

    // Actualizar saldo de la caja
    await query(`
      UPDATE financial.cajas
      SET saldo_actual = saldo_actual - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_caja = $2
    `, [facturaResult.rows[0].total, facturaResult.rows[0].id_caja]);
  }

  console.log('✅ Cancelación de factura completada exitosamente');
}

// Función auxiliar para marcar factura como pagada (manejo de créditos)
async function markInvoiceAsPaid(invoiceId, userId, factura) {
  console.log('💰 Procesando pago de factura a crédito...');

  // Registrar movimiento en la caja
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
      'credito_pago',
      CURRENT_TIMESTAMP,
      $6
    )
  `, [
    codigoIngreso,
    factura.id_caja,
    `Pago de factura ${factura.codigo_factura}`,
    factura.total,
    factura.codigo_factura,
    userId
  ]);

  // Actualizar saldo de la caja
  await query(`
    UPDATE financial.cajas
    SET saldo_actual = saldo_actual + $1, updated_at = CURRENT_TIMESTAMP
    WHERE id_caja = $2
  `, [factura.total, factura.id_caja]);

  console.log('✅ Pago de factura a crédito registrado exitosamente');
}

// Función para obtener estado detallado de una factura
export async function getInvoiceStatus(req, res) {
  try {
    const { id } = req.params;

    // Obtener información básica de la factura
    const facturaResult = await query(`
      SELECT
        f.id_factura,
        f.codigo_factura,
        f.estado,
        f.total,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.metodo_pago,
        f.created_at,
        c.nombre as cliente_nombre,
        c.cedula as cliente_cedula
      FROM financial.facturas_venta f
      LEFT JOIN financial.clientes c ON f.cliente_id = c.id_cliente
      WHERE f.id_factura = $1
    `, [id]);

    if (facturaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const factura = facturaResult.rows[0];

    // Obtener pagos realizados
    const pagosResult = await query(`
      SELECT
        i.id_ingreso,
        i.descripcion,
        i.monto,
        i.fecha,
        i.metodo_pago,
        i.created_at
      FROM financial.ingresos i
      WHERE i.referencia = $1
      ORDER BY i.fecha DESC
    `, [factura.codigo_factura]);

    // Obtener información de terapias si existen
    const terapiasResult = await query(`
      SELECT
        ct.id_control,
        ct.estado as estado_terapia,
        ct.sesiones_total,
        ct.sesiones_usadas,
        ct.sesiones_restantes,
        p.nombre as producto_nombre
      FROM financial.control_terapias ct
      JOIN financial.productos p ON ct.id_producto = p.id_producto
      WHERE ct.id_factura = $1
    `, [id]);

    // Calcular total pagado
    const totalPagado = pagosResult.rows.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
    const pendiente = Math.max(0, parseFloat(factura.total) - totalPagado);

    res.json({
      success: true,
      data: {
        factura: {
          ...factura,
          total_pagado: totalPagado,
          pendiente: pendiente,
          esta_pagada_completamente: pendiente === 0 && factura.estado === 'pagada'
        },
        pagos: pagosResult.rows,
        terapias: terapiasResult.rows,
        puede_cancelar: factura.estado !== 'cancelada' && factura.estado !== 'pagada',
        puede_pagar: factura.estado === 'pendiente' && pendiente > 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo estado de factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Función de diagnóstico para verificar restricciones de tabla
export async function diagnoseTableConstraints(req, res) {
  try {
    console.log('🔍 Verificando restricciones de tabla facturas_venta...');

    // Verificar restricciones de check
    const constraintsResult = await query(`
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'financial.facturas_venta'::regclass
        AND contype = 'c'
    `);

    console.log('📋 Restricciones de check encontradas:', constraintsResult.rows);

    // Verificar estructura de la tabla
    const tableStructureResult = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'financial'
        AND table_name = 'facturas_venta'
      ORDER BY ordinal_position
    `);

    console.log('📊 Estructura de la tabla:', tableStructureResult.rows);

    // Verificar si existe la tabla control_terapias
    const terapiasTableResult = await query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'financial'
          AND table_name = 'control_terapias'
      ) as exists
    `);

    console.log('🏥 Tabla control_terapias existe:', terapiasTableResult.rows[0].exists);

    res.json({
      success: true,
      data: {
        constraints: constraintsResult.rows,
        table_structure: tableStructureResult.rows,
        terapias_table_exists: terapiasTableResult.rows[0].exists
      }
    });

  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      message: 'Error en diagnóstico',
      error: error.message
    });
  }
}
