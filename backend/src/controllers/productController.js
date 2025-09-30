import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';

/**
 * Controlador para gestión de productos
 */
class ProductController {

  /**
   * Crear producto
   */
  async create(req, res) {
    try {
      // Verificar validaciones
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const {
        codigo,
        codigo_barras,
        nombre,
        descripcion,
        tipo,
        categoria,
        subcategoria,
        marca,
        precio_compra,
        precio_venta,
        stock_minimo,
        stock_actual,
        stock_maximo,
        unidad_medida,
        lote,
        fecha_vencimiento,
        ubicacion,
        inventariable,
        requiere_receta,
        iva_aplicable,
        sesiones_incluidas,
        duracion_sesion
      } = req.body;

      // Verificar que el código no exista
      const existingProduct = await query(
        'SELECT id_producto FROM financial.productos WHERE codigo = $1 OR ($2 IS NOT NULL AND codigo_barras = $2)',
        [codigo, codigo_barras || null]
      );

      if (existingProduct.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un producto con ese código o código de barras',
          error: 'DUPLICATE_CODE_OR_BARCODE'
        });
      }

      // Crear producto
      const result = await query(`
        INSERT INTO financial.productos (
          codigo, codigo_barras, nombre, descripcion, tipo, categoria, subcategoria, marca,
          precio_compra, precio_venta, stock_minimo, stock_actual, stock_maximo,
          unidad_medida, lote, fecha_vencimiento, ubicacion, inventariable,
          requiere_receta, iva_aplicable, sesiones_incluidas, duracion_sesion, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        codigo,
        codigo_barras || null,
        nombre,
        descripcion || null,
        tipo,
        categoria,
        subcategoria || null,
        marca || null,
        precio_compra || null,
        precio_venta,
        stock_minimo || 0,
        stock_actual || 0,
        stock_maximo || null,
        unidad_medida || 'unidad',
        lote || null,
        fecha_vencimiento || null,
        ubicacion || null,
        inventariable || false,
        requiere_receta || false,
        iva_aplicable || 16.00,
        sesiones_incluidas || null,
        duracion_sesion || null,
        req.user.id
      ]);

      const product = result.rows[0];

      console.log(`✅ Producto creado: ${product.codigo} - ${product.nombre} por usuario ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
      });

    } catch (error) {
      console.error('Error creando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar productos con filtros y paginación
   */
  async list(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de consulta inválidos',
          errors: errors.array()
        });
      }

      const {
        tipo,
        categoria,
        activo,
        inventariable,
        search,
        codigo_barras,
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros WHERE
      const filters = [];
      const params = [];
      let paramCount = 0;

      if (tipo) {
        paramCount++;
        filters.push(`tipo = $${paramCount}`);
        params.push(tipo);
      }

      if (categoria) {
        paramCount++;
        filters.push(`categoria = $${paramCount}`);
        params.push(categoria);
      }

      if (activo !== undefined) {
        paramCount++;
        filters.push(`activo = $${paramCount}`);
        params.push(activo === 'true');
      }

      if (inventariable !== undefined) {
        paramCount++;
        filters.push(`inventariable = $${paramCount}`);
        params.push(inventariable === 'true');
      }

      if (search) {
        paramCount++;
        filters.push(`(nombre ILIKE $${paramCount} OR descripcion ILIKE $${paramCount} OR codigo ILIKE $${paramCount} OR codigo_barras ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      if (codigo_barras) {
        paramCount++;
        filters.push(`codigo_barras = $${paramCount}`);
        params.push(codigo_barras);
      }

      const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

      // Calcular offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Consulta principal con paginación
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      params.push(parseInt(limit), offset);

      const productsResult = await query(`
        SELECT 
          id_producto,
          codigo,
          codigo_barras,
          nombre,
          descripcion,
          tipo,
          categoria,
          subcategoria,
          marca,
          precio_compra,
          precio_venta,
          stock_minimo,
          stock_actual,
          stock_maximo,
          unidad_medida,
          lote,
          fecha_vencimiento,
          ubicacion,
          inventariable,
          activo,
          requiere_receta,
          iva_aplicable,
          sesiones_incluidas,
          duracion_sesion,
          created_at,
          updated_at
        FROM financial.productos
        ${whereClause}
        ORDER BY nombre
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `, params);

      // Contar total de registros
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM financial.productos
        ${whereClause}
      `, params.slice(0, -2)); // Remover limit y offset para el count

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          products: productsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error listando productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener producto por ID
   */
  async getById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido',
          errors: errors.array()
        });
      }

      const { id } = req.params;

      const result = await query(`
        SELECT 
          p.*,
          u.nombre as created_by_name
        FROM financial.productos p
        LEFT JOIN vetplus_auth.usuarios u ON p.created_by = u.id_usuario
        WHERE p.id_producto = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error obteniendo producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Actualizar producto
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Verificar que el producto existe
      const existingProduct = await query(
        'SELECT id_producto, codigo FROM financial.productos WHERE id_producto = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      // Si se está actualizando el código, verificar que no exista otro producto con ese código
      if (updateData.codigo && updateData.codigo !== existingProduct.rows[0].codigo) {
        const codeCheck = await query(
          'SELECT id_producto FROM financial.productos WHERE codigo = $1 AND id_producto != $2',
          [updateData.codigo, id]
        );

        if (codeCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otro producto con ese código',
            error: 'DUPLICATE_CODE'
          });
        }
      }

      // Construir query de actualización dinámicamente
      const updates = [];
      const params = [];
      let paramCount = 0;

      const allowedFields = [
        'codigo', 'codigo_barras', 'nombre', 'descripcion', 'tipo', 'categoria', 'subcategoria', 'marca',
        'precio_compra', 'precio_venta', 'stock_minimo', 'stock_actual', 'stock_maximo',
        'unidad_medida', 'lote', 'fecha_vencimiento', 'ubicacion', 'inventariable', 'activo',
        'requiere_receta', 'iva_aplicable', 'sesiones_incluidas', 'duracion_sesion'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount}`);
          params.push(updateData[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos válidos para actualizar',
          error: 'NO_VALID_FIELDS'
        });
      }

      // Agregar updated_at
      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Agregar ID para la condición WHERE
      paramCount++;
      params.push(id);

      const result = await query(`
        UPDATE financial.productos 
        SET ${updates.join(', ')}
        WHERE id_producto = $${paramCount}
        RETURNING *
      `, params);

      const updatedProduct = result.rows[0];

      console.log(`✅ Producto actualizado: ${updatedProduct.codigo} por usuario ${req.user.email}`);

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: updatedProduct
      });

    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Eliminar producto (soft delete)
   */
  async delete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido',
          errors: errors.array()
        });
      }

      const { id } = req.params;

      // Verificar que el producto existe y está activo
      const existingProduct = await query(
        'SELECT id_producto, codigo, nombre, activo FROM financial.productos WHERE id_producto = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      const product = existingProduct.rows[0];

      if (!product.activo) {
        return res.status(400).json({
          success: false,
          message: 'El producto ya está desactivado',
          error: 'ALREADY_INACTIVE'
        });
      }

      // Soft delete - marcar como inactivo
      await query(
        'UPDATE financial.productos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id_producto = $1',
        [id]
      );

      console.log(`🗑️ Producto desactivado: ${product.codigo} - ${product.nombre} por usuario ${req.user.email}`);

      res.json({
        success: true,
        message: 'Producto desactivado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Buscar producto por código de barras (para facturación rápida)
   */
  async getByBarcode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Código de barras inválido',
          errors: errors.array()
        });
      }

      const { barcode } = req.params;

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
          activo,
          sesiones_incluidas,
          duracion_sesion
        FROM financial.productos
        WHERE codigo_barras = $1 AND activo = true
      `, [barcode]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado con ese código de barras',
          error: 'PRODUCT_NOT_FOUND'
        });
      }

      const product = result.rows[0];

      // Verificar stock para productos inventariables
      if (product.inventariable && product.stock_actual <= 0) {
        return res.status(200).json({
          success: true,
          data: product,
          warning: 'PRODUCTO_SIN_STOCK',
          message: 'Producto encontrado pero sin stock disponible'
        });
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      console.error('Error buscando producto por código de barras:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener categorías disponibles
   */
  async getCategories(req, res) {
    try {
      const result = await query(`
        SELECT categoria, COUNT(*) as count
        FROM financial.productos
        WHERE activo = true
        GROUP BY categoria
        ORDER BY categoria
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default new ProductController();
