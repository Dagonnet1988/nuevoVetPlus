import { query } from '../config/database.js';
import { validationResult } from 'express-validator';

/**
 * Controlador para la configuración del sistema financiero
 * Permite a los administradores gestionar cajas, categorías y conceptos
 */
class FinancialConfigController {

  /**
   * Obtener todas las categorías de ingresos
   */
  async getCategoriesIngresos(req, res) {
    try {
      const { includeInactive = false } = req.query;
      
      let whereClause = '';
      if (!includeInactive) {
        whereClause = 'WHERE ci.activa = true';
      }

      const result = await query(`
        SELECT 
          ci.id_categoria,
          ci.codigo,
          ci.nombre,
          ci.descripcion,
          ci.activa,
          ci.created_at,
          COUNT(co.id_concepto) as total_conceptos,
          COUNT(CASE WHEN co.activo = true THEN 1 END) as conceptos_activos
        FROM financial.categorias_ingresos ci
        LEFT JOIN financial.conceptos_ingresos co ON ci.id_categoria = co.id_categoria
        ${whereClause}
        GROUP BY ci.id_categoria, ci.codigo, ci.nombre, ci.descripcion, ci.activa, ci.created_at
        ORDER BY ci.codigo
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo categorías de ingresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Crear nueva categoría de ingresos
   */
  async createCategoriaIngreso(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { nombre, descripcion } = req.body;

      // Generar código automático (siguiente disponible)
      const codigoResult = await query(`
        SELECT 'ING' || LPAD((COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) + 1)::TEXT, 2, '0') as nuevo_codigo
        FROM financial.categorias_ingresos 
        WHERE codigo ~ '^ING[0-9]+$'
      `);

      const nuevoCodigo = codigoResult.rows[0].nuevo_codigo;

      const result = await query(`
        INSERT INTO financial.categorias_ingresos (codigo, nombre, descripcion)
        VALUES ($1, $2, $3)
        RETURNING id_categoria, codigo, nombre, descripcion, activa, created_at
      `, [nuevoCodigo, nombre, descripcion]);

      res.status(201).json({
        success: true,
        message: `Categoría de ingreso '${nombre}' creada exitosamente`,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error creando categoría de ingreso:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre',
          error: 'DUPLICATE_CATEGORY'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener conceptos de una categoría de ingresos
   */
  async getConceptosIngreso(req, res) {
    try {
      const { categoryId } = req.params;
      const { includeInactive = false } = req.query;

      let whereClause = 'WHERE co.id_categoria = $1';
      if (!includeInactive) {
        whereClause += ' AND co.activo = true';
      }

      const result = await query(`
        SELECT 
          co.id_concepto,
          co.codigo,
          co.nombre,
          co.descripcion,
          co.activo,
          co.created_at,
          ci.codigo as categoria_codigo,
          ci.nombre as categoria_nombre,
          COUNT(ing.id_ingreso) as total_movimientos,
          COALESCE(SUM(ing.monto), 0) as total_ingresos
        FROM financial.conceptos_ingresos co
        JOIN financial.categorias_ingresos ci ON co.id_categoria = ci.id_categoria
        LEFT JOIN financial.ingresos ing ON co.id_concepto = ing.id_concepto_ingreso
        ${whereClause}
        GROUP BY co.id_concepto, co.codigo, co.nombre, co.descripcion, co.activo, co.created_at,
                 ci.codigo, ci.nombre
        ORDER BY co.codigo
      `, [categoryId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo conceptos de ingreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Crear nuevo concepto de ingreso
   */
  async createConceptoIngreso(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { categoryId } = req.params;
      const { nombre, descripcion } = req.body;

      // Verificar que la categoría existe
      const categoryResult = await query(
        'SELECT codigo FROM financial.categorias_ingresos WHERE id_categoria = $1 AND activa = true',
        [categoryId]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada o inactiva',
          error: 'CATEGORY_NOT_FOUND'
        });
      }

      const categoriaCodigo = categoryResult.rows[0].codigo;

      // Generar código automático del concepto
      const codigoResult = await query(`
        SELECT $1 || '-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(codigo FROM LENGTH($1) + 2) AS INTEGER)), 0) + 1)::TEXT, 3, '0') as nuevo_codigo
        FROM financial.conceptos_ingresos 
        WHERE codigo ~ ('^' || $1 || '-[0-9]+$')
      `, [categoriaCodigo]);

      const nuevoCodigo = codigoResult.rows[0].nuevo_codigo;

      const result = await query(`
        INSERT INTO financial.conceptos_ingresos (id_categoria, codigo, nombre, descripcion)
        VALUES ($1, $2, $3, $4)
        RETURNING id_concepto, codigo, nombre, descripcion, activo, created_at
      `, [categoryId, nuevoCodigo, nombre, descripcion]);

      res.status(201).json({
        success: true,
        message: `Concepto '${nombre}' creado exitosamente`,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error creando concepto de ingreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener todas las categorías de egresos
   */
  async getCategoriesEgresos(req, res) {
    try {
      const { includeInactive = false } = req.query;
      
      let whereClause = '';
      if (!includeInactive) {
        whereClause = 'WHERE ce.activa = true';
      }

      const result = await query(`
        SELECT 
          ce.id_categoria,
          ce.codigo,
          ce.nombre,
          ce.descripcion,
          ce.activa,
          ce.created_at,
          COUNT(co.id_concepto) as total_conceptos,
          COUNT(CASE WHEN co.activo = true THEN 1 END) as conceptos_activos
        FROM financial.categorias_egresos ce
        LEFT JOIN financial.conceptos_egresos co ON ce.id_categoria = co.id_categoria
        ${whereClause}
        GROUP BY ce.id_categoria, ce.codigo, ce.nombre, ce.descripcion, ce.activa, ce.created_at
        ORDER BY ce.codigo
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo categorías de egresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Crear nueva categoría de egresos
   */
  async createCategoriaEgreso(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { nombre, descripcion } = req.body;

      // Generar código automático
      const codigoResult = await query(`
        SELECT 'EGR' || LPAD((COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) + 1)::TEXT, 2, '0') as nuevo_codigo
        FROM financial.categorias_egresos 
        WHERE codigo ~ '^EGR[0-9]+$'
      `);

      const nuevoCodigo = codigoResult.rows[0].nuevo_codigo;

      const result = await query(`
        INSERT INTO financial.categorias_egresos (codigo, nombre, descripcion)
        VALUES ($1, $2, $3)
        RETURNING id_categoria, codigo, nombre, descripcion, activa, created_at
      `, [nuevoCodigo, nombre, descripcion]);

      res.status(201).json({
        success: true,
        message: `Categoría de egreso '${nombre}' creada exitosamente`,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error creando categoría de egreso:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre',
          error: 'DUPLICATE_CATEGORY'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Activar/desactivar categoría
   */
  async toggleCategoria(req, res) {
    try {
      const { type, categoryId } = req.params; // type: 'ingresos' o 'egresos'
      const { activa } = req.body;

      const tabla = type === 'ingresos' ? 'categorias_ingresos' : 'categorias_egresos';
      
      const result = await query(`
        UPDATE financial.${tabla} 
        SET activa = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_categoria = $2
        RETURNING codigo, nombre, activa
      `, [activa, categoryId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
          error: 'CATEGORY_NOT_FOUND'
        });
      }

      const categoria = result.rows[0];
      const estado = categoria.activa ? 'activada' : 'desactivada';

      res.json({
        success: true,
        message: `Categoría '${categoria.nombre}' ${estado} exitosamente`,
        data: categoria
      });

    } catch (error) {
      console.error('Error actualizando categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener templates predeterminados de categorías
   */
  async getTemplatesCategories(req, res) {
    try {
      const templates = {
        ingresos: [
          {
            nombre: 'Servicios Online',
            descripcion: 'Consultas y servicios virtuales',
            conceptos: [
              'Consulta Virtual',
              'Seguimiento Online',
              'Segunda Opinión'
            ]
          },
          {
            nombre: 'Servicios a Domicilio',
            descripcion: 'Servicios prestados en el domicilio del cliente',
            conceptos: [
              'Consulta a Domicilio',
              'Vacunación a Domicilio',
              'Eutanasia Domiciliaria'
            ]
          }
        ],
        egresos: [
          {
            nombre: 'Marketing Digital',
            descripcion: 'Gastos en publicidad y marketing online',
            conceptos: [
              'Facebook Ads',
              'Google Ads',
              'Página Web',
              'Redes Sociales'
            ]
          },
          {
            nombre: 'Tecnología',
            descripcion: 'Gastos en software y tecnología',
            conceptos: [
              'Software Veterinario',
              'Licencias',
              'Hosting',
              'Equipos Informáticos'
            ]
          }
        ]
      };

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error obteniendo templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default new FinancialConfigController();
