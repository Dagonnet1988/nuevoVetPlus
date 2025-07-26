import { query } from '../config/database.js';

class ProveedoresController {
  /**
   * GESTIÓN DE PROVEEDORES
   */

  // Obtener todos los proveedores
  static async getProveedores(req, res) {
    try {
      const { activo, search, limit = 50, offset = 0 } = req.query;
      
      let sqlQuery = `
        SELECT 
          id_proveedor,
          nombre,
          nit,
          telefono,
          email,
          direccion,
          contacto_principal,
          terminos_pago,
          activo,
          created_at,
          updated_at
        FROM financial.proveedores
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (activo !== undefined) {
        paramCount++;
        conditions.push(`activo = $${paramCount}`);
        params.push(activo === 'true');
      }

      if (search) {
        paramCount++;
        conditions.push(`(nombre ILIKE $${paramCount} OR nit ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
      }
      
      sqlQuery += ' ORDER BY nombre ASC';

      // Agregar límite y offset
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params);

      // Obtener conteo total
      let countQuery = `SELECT COUNT(*) as total FROM financial.proveedores`;
      const countConditions = [];
      const countParams = [];
      let countParamCount = 0;

      if (activo !== undefined) {
        countParamCount++;
        countConditions.push(`activo = $${countParamCount}`);
        countParams.push(activo === 'true');
      }

      if (search) {
        countParamCount++;
        countConditions.push(`(nombre ILIKE $${countParamCount} OR nit ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`);
        countParams.push(`%${search}%`);
      }

      if (countConditions.length > 0) {
        countQuery += ' WHERE ' + countConditions.join(' AND ');
      }

      const countResult = await query(countQuery, countParams);
      
      res.json({
        success: true,
        message: 'Proveedores obtenidos exitosamente',
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
      console.error('Error al obtener proveedores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener proveedor por ID
  static async getProveedorById(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        'SELECT * FROM financial.proveedores WHERE id_proveedor = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Proveedor obtenido exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al obtener proveedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Crear nuevo proveedor
  static async createProveedor(req, res) {
    try {
      const {
        nombre,
        nit,
        telefono,
        email,
        direccion,
        contacto_principal,
        terminos_pago = 30
      } = req.body;

      const result = await query(`
        INSERT INTO financial.proveedores (
          id_proveedor,
          nombre,
          nit,
          telefono,
          email,
          direccion,
          contacto_principal,
          terminos_pago,
          created_by
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [nombre, nit, telefono, email, direccion, contacto_principal, terminos_pago, req.user.id]);

      res.status(201).json({
        success: true,
        message: 'Proveedor creado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      
      if (error.code === '23505' && error.constraint === 'proveedores_nit_key') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con este NIT'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Actualizar proveedor
  static async updateProveedor(req, res) {
    try {
      const { id } = req.params;
      const {
        nombre,
        nit,
        telefono,
        email,
        direccion,
        contacto_principal,
        terminos_pago
      } = req.body;

      const result = await query(`
        UPDATE financial.proveedores 
        SET 
          nombre = $2,
          nit = $3,
          telefono = $4,
          email = $5,
          direccion = $6,
          contacto_principal = $7,
          terminos_pago = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_proveedor = $1
        RETURNING *
      `, [id, nombre, nit, telefono, email, direccion, contacto_principal, terminos_pago]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Proveedor actualizado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);

      if (error.code === '23505' && error.constraint === 'proveedores_nit_key') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con este NIT'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Desactivar proveedor (soft delete)
  static async deleteProveedor(req, res) {
    try {
      const { id } = req.params;

      const result = await query(`
        UPDATE financial.proveedores 
        SET 
          activo = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_proveedor = $1 AND activo = true
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado o ya está inactivo'
        });
      }

      res.json({
        success: true,
        message: 'Proveedor desactivado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al desactivar proveedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas de proveedores
  static async getEstadisticasProveedores(req, res) {
    try {
      const stats = await query(`
        SELECT 
          COUNT(*) as total_proveedores,
          COUNT(*) FILTER (WHERE activo = true) as proveedores_activos,
          COUNT(*) FILTER (WHERE activo = false) as proveedores_inactivos,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as nuevos_ultimo_mes
        FROM financial.proveedores
      `);

      const ordenesStats = await query(`
        SELECT 
          COUNT(*) as total_ordenes,
          SUM(total) as monto_total_ordenes,
          COUNT(*) FILTER (WHERE estado = 'Pendiente') as ordenes_pendientes,
          COUNT(*) FILTER (WHERE fecha_vencimiento < CURRENT_DATE AND estado != 'Pagada') as ordenes_vencidas
        FROM financial.ordenes_compra
      `);

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          proveedores: stats.rows[0],
          ordenes: ordenesStats.rows[0]
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default ProveedoresController;