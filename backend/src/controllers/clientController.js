import { query } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import { v4 as uuidv4 } from 'uuid';

let clientesUpdatedByColumnExistsCache = null;

const hasClientesUpdatedByColumn = async () => {
  if (clientesUpdatedByColumnExistsCache !== null) {
    return clientesUpdatedByColumnExistsCache;
  }

  try {
    const result = await query(
      `SELECT COUNT(*)::int AS total
       FROM information_schema.columns
       WHERE table_schema = 'clinical'
         AND table_name = 'clientes'
         AND column_name = 'updated_by'`
    );

    clientesUpdatedByColumnExistsCache = Number(result.rows[0]?.total || 0) === 1;
    return clientesUpdatedByColumnExistsCache;
  } catch {
    clientesUpdatedByColumnExistsCache = false;
    return false;
  }
};

const logClientActivity = async ({ req, type, description, entityId, payload }) => {
  try {
    await query(
      `INSERT INTO system.activity_log (
         id_log,
         id_usuario,
         tipo_actividad,
         descripcion,
         url,
         metodo_http,
         status_code,
         duracion_ms,
         ip_address,
         user_agent,
         request_data,
         response_data,
         id_tenant,
         id_entidad_afectada
       ) VALUES (
         uuid_generate_v4(),
         $1, $2, $3, $4, $5, 200, 0, $6, $7, $8, $9, $10, $11
       )`,
      [
        req.user?.id || null,
        type,
        description,
        req.originalUrl || req.url || '/api/clinical/clients',
        req.method || 'SYSTEM',
        req.ip || null,
        req.get?.('user-agent') || null,
        JSON.stringify(payload || {}),
        null,
        req.tenantId || null,
        entityId || null
      ]
    );
  } catch (error) {
    console.warn('⚠️ No se pudo registrar activity_log de clientes:', error.message);
  }
};

/**
 * Crear nuevo cliente
 */
export async function createClient(req, res) {
  try {
    const tenantId = req.tenantId;

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
        fecha_nacimiento, notas, activo, created_at, updated_at, created_by, id_tenant
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9, $10)
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
      req.user.id,
      tenantId
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
    const tenantId = req.tenantId;

    const {
      search,
      activo,
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
        consentimiento_firmado,
        created_at,
        (SELECT COUNT(*) FROM clinical.mascotas WHERE id_cliente = c.id_cliente AND activo = true) as total_mascotas,
        (
          SELECT m.foto_url
          FROM clinical.mascotas m
          WHERE m.id_cliente = c.id_cliente
            AND m.activo = true
            AND m.foto_url IS NOT NULL
            AND TRIM(m.foto_url) <> ''
          ORDER BY m.created_at ASC
          LIMIT 1
        ) as foto_primer_mascota
      FROM clinical.clientes c
      WHERE c.id_tenant = $1
    `;
    
    const queryParams = [tenantId];
    let paramCount = 1;

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

    if (activo !== undefined) {
      paramCount++;
      queryText += ` AND c.activo = $${paramCount}`;
      queryParams.push(activo === 'true');
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
    let countQuery = `SELECT COUNT(*) as total FROM clinical.clientes WHERE id_tenant = $1`;
    const countParams = [tenantId];
    let countParamCount = 1;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(nombre) LIKE LOWER($${countParamCount}) OR 
        telefono LIKE $${countParamCount} OR 
        LOWER(email) LIKE LOWER($${countParamCount}) OR
        cedula LIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (activo !== undefined) {
      countParamCount++;
      countQuery += ` AND activo = $${countParamCount}`;
      countParams.push(activo === 'true');
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: {
        clientes: result.rows,
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
    const tenantId = req.tenantId;

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
                'sexo', m.sexo,
                'peso', m.peso,
                'foto_url', m.foto_url,
                'edad_años', EXTRACT(YEAR FROM AGE(m.fecha_nacimiento)),
                'activo', m.activo
              )
            END
          ) FILTER (WHERE m.id_mascota IS NOT NULL), 
          '[]'
        ) as mascotas
      FROM clinical.clientes c
      LEFT JOIN clinical.mascotas m ON c.id_cliente = m.id_cliente
      WHERE c.id_cliente = $1 AND c.id_tenant = $2
      GROUP BY c.id_cliente
    `;

    const result = await query(queryText, [id, tenantId]);

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
    const tenantId = req.tenantId;

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

    const canUseUpdatedBy = await hasClientesUpdatedByColumn();

    const queryText = canUseUpdatedBy
      ? `
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
          WHERE id_cliente = $10 AND id_tenant = $11
          RETURNING *
        `
      : `
          UPDATE clinical.clientes SET
            nombre = $1,
            telefono = $2,
            email = $3,
            direccion = $4,
            cedula = $5,
            fecha_nacimiento = $6,
            notas = $7,
            activo = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id_cliente = $9 AND id_tenant = $10
          RETURNING *
        `;

    const values = canUseUpdatedBy
      ? [
          nombre,
          telefono,
          email,
          direccion,
          cedula,
          fecha_nacimiento,
          notas,
          activo !== undefined ? activo : true,
          req.user?.id || null,
          id,
          tenantId
        ]
      : [
          nombre,
          telefono,
          email,
          direccion,
          cedula,
          fecha_nacimiento,
          notas,
          activo !== undefined ? activo : true,
          id,
          tenantId
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
    const tenantId = req.tenantId;

    const clientResult = await query(
      `SELECT id_cliente, nombre, activo
       FROM clinical.clientes
       WHERE id_cliente = $1 AND id_tenant = $2`,
      [id, tenantId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const client = clientResult.rows[0];

    // Si tiene mascotas asociadas no se elimina físicamente; se desactiva.
    const checkPetsQuery = `
      SELECT COUNT(*) as pets_count 
      FROM clinical.mascotas 
      WHERE id_cliente = $1 AND id_tenant = $2
    `;
    
    const petsResult = await query(checkPetsQuery, [id, tenantId]);
    const totalPets = parseInt(petsResult.rows[0].pets_count, 10);

    if (totalPets > 0) {
      if (!client.activo) {
        return res.json({
          success: true,
          message: `Cliente "${client.nombre}" ya está desactivado`
        });
      }

      const canUseUpdatedBy = await hasClientesUpdatedByColumn();
      const softDeleteQuery = canUseUpdatedBy
        ? `
            UPDATE clinical.clientes
            SET activo = false, updated_at = CURRENT_TIMESTAMP, updated_by = $3
            WHERE id_cliente = $1 AND id_tenant = $2
            RETURNING nombre
          `
        : `
            UPDATE clinical.clientes
            SET activo = false, updated_at = CURRENT_TIMESTAMP
            WHERE id_cliente = $1 AND id_tenant = $2
            RETURNING nombre
          `;

      const softDeleteResult = await query(
        softDeleteQuery,
        canUseUpdatedBy ? [id, tenantId, req.user?.id || null] : [id, tenantId]
      );

      await logClientActivity({
        req,
        type: 'CLIENT_MANAGEMENT',
        description: `Propietario desactivado: ${softDeleteResult.rows[0].nombre} (mascotas asociadas: ${totalPets})`,
        entityId: id,
        payload: { action: 'deactivate', reason: 'has_related_pets', totalPets }
      });

      return res.json({
        success: true,
        message: `Cliente "${softDeleteResult.rows[0].nombre}" desactivado automáticamente porque tiene ${totalPets} mascota(s) asociada(s)`
      });
    }

    // Sin mascotas asociadas: eliminación física permitida.
    const hardDeleteQuery = `
      DELETE FROM clinical.clientes
      WHERE id_cliente = $1 AND id_tenant = $2
      RETURNING nombre
    `;

    const result = await query(hardDeleteQuery, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await logClientActivity({
      req,
      type: 'CLIENT_MANAGEMENT',
      description: `Propietario eliminado definitivamente: ${result.rows[0].nombre} (sin mascotas asociadas)`,
      entityId: id,
      payload: { action: 'hard_delete', reason: 'no_related_pets' }
    });

    res.json({
      success: true,
      message: `Cliente "${result.rows[0].nombre}" eliminado definitivamente (sin mascotas asociadas)`
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

/**
 * Reactivar cliente
 */
export async function restoreClient(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const canUseUpdatedBy = await hasClientesUpdatedByColumn();
    const restoreQuery = canUseUpdatedBy
      ? `UPDATE clinical.clientes
         SET activo = true, updated_at = CURRENT_TIMESTAMP, updated_by = $3
         WHERE id_cliente = $1 AND id_tenant = $2
         RETURNING id_cliente, nombre, activo`
      : `UPDATE clinical.clientes
         SET activo = true, updated_at = CURRENT_TIMESTAMP
         WHERE id_cliente = $1 AND id_tenant = $2
         RETURNING id_cliente, nombre, activo`;

    const result = await query(
      restoreQuery,
      canUseUpdatedBy ? [id, tenantId, req.user?.id || null] : [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await logClientActivity({
      req,
      type: 'CLIENT_MANAGEMENT',
      description: `Propietario reactivado: ${result.rows[0].nombre}`,
      entityId: id,
      payload: { action: 'restore' }
    });

    res.json({
      success: true,
      message: `Cliente "${result.rows[0].nombre}" reactivado exitosamente`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error reactivando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}
