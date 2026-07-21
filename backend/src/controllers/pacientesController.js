import { query, getClient } from '../config/database.js';
import { validationResult } from 'express-validator/lib/index.js';
import { v4 as uuidv4 } from 'uuid';
import { calculatePetAge } from '../utils/ageCalculator.js';
import { eliminarFotoAnterior, getFotoDefaultPorEspecie } from '../middleware/uploadMiddleware.js';
import path from 'path';

/**
 * Crear paciente completo (cliente + mascota en una sola operación)
 */
export async function createPacienteCompleto(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const tenantId = req.tenantId;

    const {
      // Datos del cliente
      id_cliente_existente, // Nuevo campo opcional para usar cliente existente
      nombre_cliente,
      cedula,
      telefono,
      email,
      direccion,
      
      // Datos de la mascota
      nombre_mascota,
      especie,
      raza,
      sexo,
      fecha_nacimiento,
      peso,
      color,
      microchip,
      notas
    } = req.body;

    // Validaciones adicionales de negocio que no se pueden hacer con express-validator
    if (!id_cliente_existente) {
      // Si no hay cliente existente, validar que los campos del cliente estén presentes
      if (!nombre_cliente?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del cliente es requerido cuando no se selecciona un cliente existente',
          errors: [{ field: 'nombre_cliente', message: 'Campo requerido para cliente nuevo' }]
        });
      }
      
      if (!telefono?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El teléfono del cliente es requerido cuando no se selecciona un cliente existente',
          errors: [{ field: 'telefono', message: 'Campo requerido para cliente nuevo' }]
        });
      }
    }

    // Convertir sexo del frontend (M/H) al formato de base de datos (Macho/Hembra)
    const sexoDb = sexo === 'M' ? 'Macho' : sexo === 'H' ? 'Hembra' : sexo;

    // Iniciar transacción con cliente dedicado del pool
    const txClient = await getClient();

    try {
      await txClient.query('BEGIN');
      let cliente;
      let id_cliente;

      if (id_cliente_existente) {
        // Usar cliente existente
        const clienteResult = await txClient.query(
          'SELECT * FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true',
          [id_cliente_existente, tenantId]
        );

        if (clienteResult.rows.length === 0) {
          await txClient.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'Cliente no encontrado'
          });
        }

        cliente = clienteResult.rows[0];
        id_cliente = id_cliente_existente;
      } else {
        // Crear nuevo cliente
        id_cliente = uuidv4();

        const clienteQuery = `
          INSERT INTO clinical.clientes (
            id_cliente, nombre, cedula, telefono, email, direccion, activo, created_at, updated_at, created_by, id_tenant
          ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $7, $8)
          RETURNING *
        `;

        const clienteValues = [
          id_cliente,
          nombre_cliente,
          cedula || null,
          telefono,
          email || null,
          direccion || null,
          req.user.id,
          tenantId
        ];

        const clienteResult = await txClient.query(clienteQuery, clienteValues);
        cliente = clienteResult.rows[0];
      }

      // Calcular edad si hay fecha de nacimiento
      let edad = null;
      if (fecha_nacimiento) {
        const edadData = calculatePetAge(fecha_nacimiento);
        edad = edadData ? edadData.años : null;
      }

      // Crear mascota con foto por defecto
      const id_mascota = uuidv4();
      const fotoDefault = getFotoDefaultPorEspecie(especie);
      
      const mascotaQuery = `
        INSERT INTO clinical.mascotas (
          id_mascota, id_cliente, nombre, especie, raza, edad, sexo,
          peso, color, fecha_nacimiento, microchip, notas, foto_url, activo,
          created_at, updated_at, created_by, id_tenant
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $14, $15)
        RETURNING *
      `;

      const mascotaValues = [
        id_mascota,
        id_cliente,
        nombre_mascota,
        especie,
        raza || null,
        edad,
        sexoDb,
        peso || null,
        color || null,
        fecha_nacimiento || null,
        microchip || null,
        notas || null,
        fotoDefault,
        req.user.id,
        tenantId
      ];

      const mascotaResult = await txClient.query(mascotaQuery, mascotaValues);
      const mascota = mascotaResult.rows[0];

      // Confirmar transacción
      await txClient.query('COMMIT');

      // Convertir sexo de vuelta al formato frontend
      const mascotaFrontend = {
        ...mascota,
        sexo: mascota.sexo === 'Macho' ? 'M' : mascota.sexo === 'Hembra' ? 'H' : mascota.sexo,
        edadCompleta: calculatePetAge(mascota.fecha_nacimiento)
      };

      res.status(201).json({
        success: true,
        message: 'Paciente registrado exitosamente',
        data: {
          cliente,
          mascota: mascotaFrontend
        }
      });

    } catch (error) {
      // Rollback en caso de error
      try { await txClient.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      txClient.release();
    }

  } catch (error) {
    console.error('Error creando paciente completo:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esa cédula'
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
 * Actualizar paciente completo (cliente + mascota)
 */
/**
 * Obtener paciente completo por ID (mascota con datos del cliente)
 */
export async function getPacienteById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente requerido'
      });
    }

    // Obtener información completa del paciente
    const pacienteQuery = `
      SELECT 
        m.id_mascota,
        m.nombre,
        m.especie,
        m.raza,
        m.sexo,
        m.edad,
        m.peso,
        m.color,
        m.fecha_nacimiento,
        m.esterilizado,
        m.microchip,
        m.notas,
        m.foto_url,
        m.activo,
        m.created_at,
        m.updated_at,
        -- Datos del cliente
        c.id_cliente,
        c.nombre as nombre_cliente,
        c.cedula,
        c.telefono,
        c.email,
        c.direccion,
        c.created_at as cliente_created_at
      FROM clinical.mascotas m
      INNER JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_mascota = $1 AND m.id_tenant = $2 AND c.activo = true
    `;

    const result = await query(pacienteQuery, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    const paciente = result.rows[0];

    // Formatear la respuesta
    const pacienteFormatted = {
      id_mascota: paciente.id_mascota,
      nombre: paciente.nombre,
      especie: paciente.especie,
      raza: paciente.raza,
      sexo: paciente.sexo,
      edad: paciente.edad,
      peso: paciente.peso,
      color: paciente.color,
      fecha_nacimiento: paciente.fecha_nacimiento,
      esterilizado: paciente.esterilizado,
      microchip: paciente.microchip,
      notas: paciente.notas,
      foto_url: paciente.foto_url,
      activo: paciente.activo,
      created_at: paciente.created_at,
      updated_at: paciente.updated_at,
      
      // Datos del cliente
      id_cliente: paciente.id_cliente,
      nombre_cliente: paciente.nombre_cliente,
      cedula: paciente.cedula,
      telefono: paciente.telefono,
      email: paciente.email,
      direccion: paciente.direccion,
      
      // También incluir en formato anidado para compatibilidad
      cliente: {
        id_cliente: paciente.id_cliente,
        nombre: paciente.nombre_cliente,
        cedula: paciente.cedula,
        telefono: paciente.telefono,
        email: paciente.email,
        direccion: paciente.direccion,
        created_at: paciente.cliente_created_at
      },

      // Calcular edad si hay fecha de nacimiento
      edadCompleta: paciente.fecha_nacimiento ? calculatePetAge(paciente.fecha_nacimiento) : null
    };

    res.json({
      success: true,
      data: pacienteFormatted
    });

  } catch (error) {
    console.error('Error obteniendo paciente por ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Actualizar solo una mascota
 */
export async function updateMascota(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de mascota requerido'
      });
    }

    const tenantId = req.tenantId;

    if (updates.activo === false) {
      const citasActivasResult = await query(
        `SELECT COUNT(*) AS citas_activas
         FROM clinical.calendario_citas
         WHERE id_mascota = $1
           AND id_tenant = $2
           AND estado IN ('confirmada', 'en_curso')`,
        [id, tenantId]
      );

      const citasActivas = parseInt(citasActivasResult.rows[0]?.citas_activas || '0', 10);
      if (citasActivas > 0) {
        return res.status(409).json({
          success: false,
          message: `No se puede inactivar la mascota porque tiene ${citasActivas} cita(s) activa(s).`
        });
      }
    }

    // Verificar que la mascota existe
    const mascotaExiste = await query(
      'SELECT id_mascota FROM clinical.mascotas WHERE id_mascota = $1 AND id_tenant = $2',
      [id, tenantId]
    );

    if (mascotaExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // Construir la query de actualización dinámicamente
    const allowedFields = ['activo', 'nombre', 'especie', 'raza', 'sexo', 'peso', 'color', 'microchip', 'notas'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos válidos para actualizar'
      });
    }

    // Agregar el ID y tenant al final
    values.push(id);
    values.push(tenantId);

    const updateQuery = `
      UPDATE clinical.mascotas 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id_mascota = $${paramIndex} AND id_tenant = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Error actualizando la mascota'
      });
    }

    res.json({
      success: true,
      message: 'Mascota actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando mascota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Actualizar paciente completo (cliente + mascota)
 */
export async function updatePacienteCompleto(req, res) {
  try {
    const { id } = req.params; // ID de la mascota
    const tenantId = req.tenantId;
    const {
      id_cliente_existente,
      // Datos del cliente
      nombre_cliente,
      cedula,
      telefono,
      email,
      direccion,
      
      // Datos de la mascota
      nombre_mascota,
      especie,
      raza,
      sexo,
      fecha_nacimiento,
      peso,
      color,
      microchip,
      notas,
      esterilizado
    } = req.body;

    // Convertir sexo del frontend (M/H) al formato de base de datos (Macho/Hembra)
    const sexoDb = sexo === 'M' ? 'Macho' : sexo === 'H' ? 'Hembra' : sexo;

    // Iniciar transacción con cliente dedicado del pool
    const txClient = await getClient();

    try {
      await txClient.query('BEGIN');

      // 1. Obtener datos actuales de la mascota para obtener el id_cliente
      const mascotaActual = await txClient.query(
        'SELECT id_cliente FROM clinical.mascotas WHERE id_mascota = $1 AND id_tenant = $2 AND activo = true',
        [id, tenantId]
      );

      if (mascotaActual.rows.length === 0) {
        await txClient.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      const id_cliente_actual = mascotaActual.rows[0].id_cliente;
      let id_cliente = id_cliente_actual;

      if (id_cliente_existente && id_cliente_existente !== id_cliente_actual) {
        const clienteDestino = await txClient.query(
          'SELECT id_cliente FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true',
          [id_cliente_existente, tenantId]
        );

        if (clienteDestino.rows.length === 0) {
          await txClient.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'El propietario seleccionado no existe o está inactivo'
          });
        }

        id_cliente = id_cliente_existente;
      }

      // 2. Actualizar datos del cliente
      const clienteQuery = `
        UPDATE clinical.clientes
        SET
          nombre = COALESCE($2, nombre),
          cedula = $3,
          telefono = COALESCE($4, telefono),
          email = $5,
          direccion = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_cliente = $1 AND id_tenant = $7
        RETURNING *
      `;

      const clienteValues = [
        id_cliente,
        nombre_cliente,
        cedula || null,
        telefono,
        email || null,
        direccion || null,
        tenantId
      ];

      await txClient.query(clienteQuery, clienteValues);

      // 3. Calcular edad si hay fecha de nacimiento
      let edad = null;
      if (fecha_nacimiento) {
        const edadData = calculatePetAge(fecha_nacimiento);
        edad = edadData ? edadData.años : null;
      }

      // 4. Actualizar datos de la mascota
      const mascotaQuery = `
        UPDATE clinical.mascotas
        SET
          id_cliente = COALESCE($2, id_cliente),
          nombre = COALESCE($3, nombre),
          especie = COALESCE($4, especie),
          raza = $5,
          edad = COALESCE($6, edad),
          sexo = COALESCE($7, sexo),
          peso = $8,
          color = $9,
          fecha_nacimiento = $10,
          microchip = $11,
          notas = $12,
          esterilizado = COALESCE($13, esterilizado),
          updated_at = CURRENT_TIMESTAMP
        WHERE id_mascota = $1 AND id_tenant = $14
        RETURNING *
      `;

      const mascotaValues = [
        id,
        id_cliente,
        nombre_mascota,
        especie,
        raza || null,
        edad,
        sexoDb,
        peso || null,
        color || null,
        fecha_nacimiento || null,
        microchip || null,
        notas || null,
        esterilizado !== undefined ? esterilizado : null,
        tenantId
      ];

      const mascotaResult = await txClient.query(mascotaQuery, mascotaValues);
      const mascotaActualizada = mascotaResult.rows[0];

      // Confirmar transacción
      await txClient.query('COMMIT');

      // Convertir sexo de vuelta al formato frontend
      const mascotaFrontend = {
        ...mascotaActualizada,
        sexo: mascotaActualizada.sexo === 'Macho' ? 'M' : mascotaActualizada.sexo === 'Hembra' ? 'H' : mascotaActualizada.sexo,
        edadCompleta: calculatePetAge(mascotaActualizada.fecha_nacimiento)
      };

      res.json({
        success: true,
        message: 'Paciente actualizado exitosamente',
        data: {
          mascota: mascotaFrontend
        }
      });

    } catch (error) {
      // Rollback en caso de error
      try { await txClient.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      txClient.release();
    }

  } catch (error) {
    console.error('Error actualizando paciente completo:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esa cédula'
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
 * Obtener mascotas con datos del cliente (para la tabla de pacientes)
 */
export async function getMascotasConCliente(req, res) {
  try {
    const {
      search,
      especie,
      activo,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT 
        m.id_mascota,
        m.nombre,
        m.especie,
        m.raza,
        m.edad,
        m.sexo,
        m.peso,
        m.color,
        m.fecha_nacimiento,
        m.microchip,
        m.esterilizado,
        m.foto_url,
        m.activo,
        m.created_at as fecha_registro,
        c.id_cliente,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        c.email as cliente_email,
        c.direccion as cliente_direccion,
        c.cedula as cliente_cedula
      FROM clinical.mascotas m
      LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_tenant = $1
    `;
    
    const queryParams = [req.tenantId];
    let paramCount = 1;

    // Filtro de búsqueda
    if (search) {
      paramCount++;
      queryText += ` AND (
        LOWER(m.nombre) LIKE LOWER($${paramCount}) OR 
        LOWER(c.nombre) LIKE LOWER($${paramCount}) OR 
        c.telefono LIKE $${paramCount} OR
        c.cedula LIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Filtro por especie
    if (especie) {
      paramCount++;
      queryText += ` AND m.especie = $${paramCount}`;
      queryParams.push(especie);
    }

    // Filtro por estado activo (por defecto solo mostrar activos)
    if (activo !== undefined) {
      paramCount++;
      queryText += ` AND m.activo = $${paramCount}`;
      queryParams.push(activo === 'true');
    } else {
      // Por defecto, solo mostrar pacientes activos
      paramCount++;
      queryText += ` AND m.activo = $${paramCount}`;
      queryParams.push(true);
    }

    // Ordenamiento
    const sortFieldMap = {
      nombre: "LOWER(COALESCE(m.nombre, ''))",
      especie: "LOWER(COALESCE(m.especie, ''))",
      cliente_nombre: "LOWER(COALESCE(c.nombre, ''))",
      created_at: 'm.created_at'
    };
    const sortField = Object.prototype.hasOwnProperty.call(sortFieldMap, sortBy)
      ? sortFieldMap[sortBy]
      : 'm.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Orden case-insensitive para textos y consistente para empates.
    queryText += ` ORDER BY ${sortField} ${order}, m.created_at DESC`;

    // Paginación
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await query(queryText, queryParams);

    // Contar total para paginación
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM clinical.mascotas m
      LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_tenant = $1
    `;
    const countParams = [req.tenantId];
    let countParamCount = 1;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(m.nombre) LIKE LOWER($${countParamCount}) OR 
        LOWER(c.nombre) LIKE LOWER($${countParamCount}) OR 
        c.telefono LIKE $${countParamCount} OR
        c.cedula LIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (especie) {
      countParamCount++;
      countQuery += ` AND m.especie = $${countParamCount}`;
      countParams.push(especie);
    }

    if (activo !== undefined) {
      countParamCount++;
      countQuery += ` AND m.activo = $${countParamCount}`;
      countParams.push(activo === 'true');
    } else {
      // Por defecto, solo contar pacientes activos
      countParamCount++;
      countQuery += ` AND m.activo = $${countParamCount}`;
      countParams.push(true);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Formatear datos para el frontend
    const pacientes = result.rows.map(row => ({
      id_mascota: row.id_mascota,
      nombre: row.nombre,
      especie: row.especie,
      raza: row.raza,
      sexo: row.sexo === 'Macho' ? 'M' : row.sexo === 'Hembra' ? 'H' : row.sexo,
      peso: row.peso,
      color: row.color,
      fecha_nacimiento: row.fecha_nacimiento,
      microchip: row.microchip,
      esterilizado: row.esterilizado,
      foto_url: row.foto_url,
      activo: row.activo,
      fecha_registro: row.fecha_registro,
      edadCompleta: calculatePetAge(row.fecha_nacimiento),
      cliente: row.id_cliente ? {
        id_cliente: row.id_cliente,
        nombre: row.cliente_nombre,
        telefono: row.cliente_telefono,
        email: row.cliente_email,
        direccion: row.cliente_direccion,
        cedula: row.cliente_cedula,
        activo: true
      } : null
    }));

    res.json({
      success: true,
      message: 'Pacientes obtenidos exitosamente',
      data: {
        pacientes,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener lista de especies disponibles
 */
export async function getEspecies(req, res) {
  try {
    const tenantId = req.tenantId;
    const queryText = `
      SELECT DISTINCT especie 
      FROM clinical.mascotas 
      WHERE activo = true
        AND id_tenant = $1
      ORDER BY especie
    `;

    const result = await query(queryText, [tenantId]);
    const especies = result.rows.map(row => row.especie);

    // Agregar especies comunes si no están en la base de datos
    const especiesComunes = ['Perro', 'Gato', 'Ave', 'Hamster', 'Conejo', 'Reptil', 'Pez', 'Otro'];
    const especiesCompletas = [...new Set([...especies, ...especiesComunes])].sort();

    res.json({
      success: true,
      data: especiesCompletas
    });

  } catch (error) {
    console.error('Error obteniendo especies:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener razas por especie
 */
export async function getRazasByEspecie(req, res) {
  try {
    const { especie } = req.params;
    const tenantId = req.tenantId;

    const queryText = `
      SELECT DISTINCT raza 
      FROM clinical.mascotas 
      WHERE especie = $1
        AND raza IS NOT NULL
        AND activo = true
        AND id_tenant = $2
      ORDER BY raza
    `;

    const result = await query(queryText, [especie, tenantId]);
    const razas = result.rows.map(row => row.raza);

    // Razas predefinidas por especie
    const razasPredefinidas = {
      'Perro': [
        'Labrador Retriever', 'Golden Retriever', 'Bulldog Francés', 'Pastor Alemán',
        'Bulldog Inglés', 'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier',
        'Chihuahua', 'Mestizo', 'Otro'
      ],
      'Gato': [
        'Persa', 'Maine Coon', 'Siamés', 'Ragdoll', 'British Shorthair',
        'Abisinio', 'Bengalí', 'Sphynx', 'Mestizo', 'Otro'
      ],
      'Ave': ['Canario', 'Periquito', 'Cacatúa', 'Loro', 'Agapornis', 'Otro'],
      'Hamster': ['Sirio', 'Ruso', 'Chino', 'Otro'],
      'Conejo': ['Holland Lop', 'Angora', 'Cabeza de León', 'Otro'],
      'Reptil': ['Iguana', 'Gecko', 'Pitón', 'Tortuga', 'Otro'],
      'Pez': ['Goldfish', 'Betta', 'Guppy', 'Otro']
    };

    const razasEspecie = razasPredefinidas[especie] || ['Otro'];
    const razasCompletas = [...new Set([...razas, ...razasEspecie])].sort();

    res.json({
      success: true,
      data: razasCompletas
    });

  } catch (error) {
    console.error('Error obteniendo razas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener estadísticas de pacientes
 */
export async function getEstadisticasPacientes(req, res) {
  try {
    const tenantId = req.tenantId;
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT m.id_mascota) as total_pacientes,
        COUNT(DISTINCT c.id_cliente) as total_clientes,
        COUNT(DISTINCT m.especie) as total_especies,
        COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_ultimo_mes
      FROM clinical.mascotas m
      LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE m.activo = true AND m.id_tenant = $1
    `;

    const result = await query(statsQuery, [tenantId]);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalPacientes: parseInt(stats.total_pacientes),
        totalClientes: parseInt(stats.total_clientes),
        totalEspecies: parseInt(stats.total_especies),
        nuevosUltimoMes: parseInt(stats.nuevos_ultimo_mes)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Subir foto de paciente
 */
export async function uploadFotoPaciente(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de mascota requerido'
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    // Verificar que la mascota existe
    const mascotaResult = await query(
      'SELECT foto_url FROM clinical.mascotas WHERE id_mascota = $1',
      [id]
    );

    if (mascotaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const fotoAnterior = mascotaResult.rows[0].foto_url;
    const nuevaFotoUrl = `/uploads/pacientes/${req.file.filename}`;

    // Actualizar la URL de la foto en la base de datos
    const updateResult = await query(
      'UPDATE clinical.mascotas SET foto_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id_mascota = $2 RETURNING *',
      [nuevaFotoUrl, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Error actualizando la foto'
      });
    }

    // Eliminar foto anterior (si no es imagen por defecto)
    eliminarFotoAnterior(fotoAnterior);

    res.json({
      success: true,
      message: 'Foto subida exitosamente',
      data: {
        foto_url: nuevaFotoUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error subiendo foto:', error);
    
    // Handle Multer specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.'
      });
    }
    
    if (error.message && error.message.includes('Solo se permiten archivos de imagen')) {
      return res.status(400).json({
        success: false,
        message: error.message
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
 * Eliminar foto de paciente y restaurar imagen por defecto
 */
export async function eliminarFotoPaciente(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de mascota requerido'
      });
    }

    // Obtener datos actuales de la mascota
    const mascotaResult = await query(
      'SELECT foto_url, especie FROM clinical.mascotas WHERE id_mascota = $1',
      [id]
    );

    if (mascotaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const { foto_url, especie } = mascotaResult.rows[0];
    const fotoDefault = getFotoDefaultPorEspecie(especie);

    // Actualizar con imagen por defecto
    const updateResult = await query(
      'UPDATE clinical.mascotas SET foto_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id_mascota = $2 RETURNING *',
      [fotoDefault, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Error restaurando imagen por defecto'
      });
    }

    // Eliminar foto anterior (si no es imagen por defecto)
    eliminarFotoAnterior(foto_url);

    res.json({
      success: true,
      message: 'Foto eliminada y restaurada imagen por defecto',
      data: {
        foto_url: fotoDefault
      }
    });

  } catch (error) {
    console.error('Error eliminando foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener foto de paciente
 */
export async function getFotoPaciente(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de mascota requerido'
      });
    }

    // Obtener URL de la foto
    const result = await query(
      'SELECT foto_url, nombre, especie FROM clinical.mascotas WHERE id_mascota = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const { foto_url, nombre, especie } = result.rows[0];

    res.json({
      success: true,
      data: {
        foto_url: foto_url || getFotoDefaultPorEspecie(especie),
        nombre,
        especie
      }
    });

  } catch (error) {
    console.error('Error obteniendo foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Crear mascota para un cliente existente
 * POST /api/clinical/pacientes/mascota
 */
export async function createMascotaParaCliente(req, res) {
  try {
    const {
      id_cliente,
      nombre_mascota,
      especie,
      raza,
      sexo,
      fecha_nacimiento,
      peso,
      color,
      microchip,
      notas,
      esterilizado
    } = req.body;

    if (!id_cliente) {
      return res.status(400).json({ success: false, message: 'id_cliente es requerido' });
    }
    if (!nombre_mascota || !especie) {
      return res.status(400).json({ success: false, message: 'nombre_mascota y especie son requeridos' });
    }

    const tenantId = req.tenantId;

    // Verificar que el cliente existe
    const clienteResult = await query(
      'SELECT id_cliente FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true',
      [id_cliente, tenantId]
    );
    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const sexoDb = sexo === 'M' ? 'Macho' : sexo === 'H' ? 'Hembra' : sexo || null;
    let edad = null;
    if (fecha_nacimiento) {
      const edadData = calculatePetAge(fecha_nacimiento);
      edad = edadData ? edadData.años : null;
    }

    const result = await query(
      `INSERT INTO clinical.mascotas
        (id_cliente, nombre, especie, raza, edad, sexo, peso, color,
         fecha_nacimiento, esterilizado, microchip, notas, created_by, id_tenant)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        id_cliente, nombre_mascota, especie, raza || null, edad, sexoDb,
        peso || null, color || null, fecha_nacimiento || null,
        esterilizado !== undefined ? esterilizado : false,
        microchip || null, notas || null, req.user.id, tenantId
      ]
    );

    const mascota = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Mascota creada exitosamente',
      data: {
        mascota: {
          ...mascota,
          sexo: mascota.sexo === 'Macho' ? 'M' : mascota.sexo === 'Hembra' ? 'H' : mascota.sexo,
          edadCompleta: calculatePetAge(mascota.fecha_nacimiento)
        }
      }
    });

  } catch (error) {
    console.error('Error creando mascota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Eliminar mascota (soft delete: activo = false)
 * DELETE /api/clinical/pacientes/mascota/:id
 */
export async function inactivarMascota(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body; // 'Fallecida', 'Transferida', 'Error de registro', 'Otro'

    const tenantId = req.tenantId;
    const motivosValidos = ['Fallecida', 'Transferida', 'Error de registro', 'Otro'];
    if (!motivo || !motivosValidos.includes(motivo)) {
      return res.status(400).json({
        success: false,
        message: `El motivo es requerido. Valores permitidos: ${motivosValidos.join(', ')}`
      });
    }

    // Verificar si tiene consultas o citas activas
    const relacionesResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM clinical.consultas_clinicas WHERE id_mascota = $1 AND id_tenant = $2) AS consultas,
        (SELECT COUNT(*) FROM clinical.calendario_citas
         WHERE id_mascota = $1 AND id_tenant = $2 AND estado IN ('confirmada', 'en_curso')) AS citas_activas`,
      [id, tenantId]
    );

    const { consultas, citas_activas } = relacionesResult.rows[0];

    if (parseInt(consultas) > 0 && motivo === 'Error de registro') {
      return res.status(409).json({
        success: false,
        message: `No se puede marcar como 'Error de registro' una mascota con ${consultas} consulta(s) en su historial clínico.`
      });
    }

    if (parseInt(citas_activas) > 0) {
      return res.status(409).json({
        success: false,
        message: `La mascota tiene ${citas_activas} cita(s) activa(s). Cancélalas antes de inactivarla.`
      });
    }

    const result = await query(
      `UPDATE clinical.mascotas
       SET activo = false,
           notas = CASE
             WHEN notas IS NULL OR notas = '' THEN $2
             ELSE notas || E'\n[Inactivada: ' || $2 || ']'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_mascota = $1 AND id_tenant = $3 AND activo = true
       RETURNING id_mascota, nombre`,
      [id, motivo, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada o ya estaba inactiva'
      });
    }

    res.json({
      success: true,
      message: `Mascota '${result.rows[0].nombre}' marcada como inactiva. Motivo: ${motivo}`
    });

  } catch (error) {
    console.error('Error inactivando mascota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}
