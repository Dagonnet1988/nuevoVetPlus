import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Crear nuevo cliente
 */
export async function createClient(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de cliente inválidos',
        errors: errors.array()
      });
    }

    const {
      nombre,
      telefono,
      email,
      direccion,
      cedula,
      fecha_nacimiento,
      notas
    } = req.body;

    // Generar UUID en JavaScript
    const id_cliente = uuidv4();

    const queryText = `
      INSERT INTO clinical.clientes (
        id_cliente, nombre, telefono, email, direccion, cedula,
        fecha_nacimiento, notas, activo, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9)
      RETURNING *
    `;

    const values = [
      id_cliente,
      nombre,
      telefono,
      email || null,
      direccion || null,
      cedula || null,
      fecha_nacimiento || null,
      notas || null,
      req.user.id
    ];

    const result = await query(queryText, values);

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creando cliente:', error);
    
    // Manejo de errores específicos
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esa cédula o email'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener lista de clientes con filtros y paginación
 */
export async function getClients(req, res) {
  try {
    const {
      search,
      page = 1,
      limit = 50,
      sortBy = 'nombre',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT 
        id_cliente,
        nombre,
        telefono,
        email,
        direccion,
        cedula,
        fecha_nacimiento,
        activo,
        created_at,
        (SELECT COUNT(*) FROM clinical.mascotas WHERE id_cliente = c.id_cliente) as total_mascotas
      FROM clinical.clientes c
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Filtro de búsqueda
    if (search) {
      paramCount++;
      queryText += ` AND (
        LOWER(nombre) LIKE LOWER($${paramCount}) OR 
        telefono LIKE $${paramCount} OR 
        LOWER(email) LIKE LOWER($${paramCount}) OR
        cedula LIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Ordenamiento
    const allowedSortFields = ['nombre', 'telefono', 'email', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'nombre';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    // Paginación
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await query(queryText, queryParams);

    // Contar total para paginación
    let countQuery = `SELECT COUNT(*) as total FROM clinical.clientes WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (
        LOWER(nombre) LIKE LOWER($1) OR 
        telefono LIKE $1 OR 
        LOWER(email) LIKE LOWER($1) OR
        cedula LIKE $1
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: {
        clients: result.rows,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener cliente por ID
 */
export async function getClientById(req, res) {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        c.*,
        COUNT(m.id_mascota) as total_mascotas,
        COALESCE(
          JSON_AGG(
            CASE WHEN m.id_mascota IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id_mascota', m.id_mascota,
                'nombre', m.nombre,
                'especie', m.especie,
                'raza', m.raza,
                'edad_años', EXTRACT(YEAR FROM AGE(m.fecha_nacimiento)),
                'activo', m.activo
              )
            END
          ) FILTER (WHERE m.id_mascota IS NOT NULL), 
          '[]'
        ) as mascotas
      FROM clinical.clientes c
      LEFT JOIN clinical.mascotas m ON c.id_cliente = m.id_cliente
      WHERE c.id_cliente = $1
      GROUP BY c.id_cliente
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente obtenido exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Actualizar cliente
 */
export async function updateClient(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de cliente inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      nombre,
      telefono,
      email,
      direccion,
      cedula,
      fecha_nacimiento,
      notas,
      activo
    } = req.body;

    const queryText = `
      UPDATE clinical.clientes SET
        nombre = $1,
        telefono = $2,
        email = $3,
        direccion = $4,
        cedula = $5,
        fecha_nacimiento = $6,
        notas = $7,
        activo = $8,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $9
      WHERE id_cliente = $10
      RETURNING *
    `;

    const values = [
      nombre,
      telefono,
      email,
      direccion,
      cedula,
      fecha_nacimiento,
      notas,
      activo !== undefined ? activo : true,
      req.user.id,
      id
    ];

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando cliente:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esa cédula o email'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Eliminar (desactivar) cliente
 */
export async function deleteClient(req, res) {
  try {
    const { id } = req.params;

    // Verificar si el cliente tiene mascotas activas
    const checkPetsQuery = `
      SELECT COUNT(*) as pets_count 
      FROM clinical.mascotas 
      WHERE id_cliente = $1 AND activo = true
    `;
    
    const petsResult = await query(checkPetsQuery, [id]);
    const activePets = parseInt(petsResult.rows[0].pets_count);

    if (activePets > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el cliente. Tiene ${activePets} mascota(s) activa(s)`
      });
    }

    // Soft delete del cliente
    const queryText = `
      UPDATE clinical.clientes
      SET activo = false, updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id_cliente = $1
      RETURNING nombre
    `;

    const result = await query(queryText, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Cliente "${result.rows[0].nombre}" desactivado exitosamente`
    });

  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}
