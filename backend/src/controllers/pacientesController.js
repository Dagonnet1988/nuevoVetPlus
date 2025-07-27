import { query } from '../config/database.js';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { calculatePetAge } from '../utils/ageCalculator.js';

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

    const {
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
      notas
    } = req.body;

    // Convertir sexo del frontend (M/H) al formato de base de datos (Macho/Hembra)
    const sexoDb = sexo === 'M' ? 'Macho' : sexo === 'H' ? 'Hembra' : sexo;

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Generar UUIDs
      const id_cliente = uuidv4();
      const id_mascota = uuidv4();

      // 1. Crear cliente
      const clienteQuery = `
        INSERT INTO clinical.clientes (
          id_cliente, nombre, cedula, telefono, email, direccion, activo, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const clienteValues = [
        id_cliente,
        nombre_cliente,
        cedula || null,
        telefono,
        email || null,
        direccion || null
      ];

      const clienteResult = await query(clienteQuery, clienteValues);
      const cliente = clienteResult.rows[0];

      // 2. Calcular edad si hay fecha de nacimiento
      let edad = null;
      if (fecha_nacimiento) {
        const edadData = calculatePetAge(fecha_nacimiento);
        edad = edadData ? edadData.años : null;
      }

      // 3. Crear mascota
      const mascotaQuery = `
        INSERT INTO clinical.mascotas (
          id_mascota, id_cliente, nombre, especie, raza, edad, sexo, 
          peso, color, fecha_nacimiento, microchip, notas, activo, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        notas || null
      ];

      const mascotaResult = await query(mascotaQuery, mascotaValues);
      const mascota = mascotaResult.rows[0];

      // Confirmar transacción
      await query('COMMIT');

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
      await query('ROLLBACK');
      throw error;
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
export async function updatePacienteCompleto(req, res) {
  try {
    const { id } = req.params; // ID de la mascota
    const {
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
      notas
    } = req.body;

    // Convertir sexo del frontend (M/H) al formato de base de datos (Macho/Hembra)
    const sexoDb = sexo === 'M' ? 'Macho' : sexo === 'H' ? 'Hembra' : sexo;

    // Iniciar transacción
    await query('BEGIN');

    try {
      // 1. Obtener datos actuales de la mascota para obtener el id_cliente
      const mascotaActual = await query(
        'SELECT id_cliente FROM clinical.mascotas WHERE id_mascota = $1 AND activo = true',
        [id]
      );

      if (mascotaActual.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      const id_cliente = mascotaActual.rows[0].id_cliente;

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
        WHERE id_cliente = $1
        RETURNING *
      `;

      const clienteValues = [
        id_cliente,
        nombre_cliente,
        cedula || null,
        telefono,
        email || null,
        direccion || null
      ];

      await query(clienteQuery, clienteValues);

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
          nombre = COALESCE($2, nombre),
          especie = COALESCE($3, especie),
          raza = $4,
          edad = $5,
          sexo = COALESCE($6, sexo),
          peso = $7,
          color = $8,
          fecha_nacimiento = $9,
          microchip = $10,
          notas = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_mascota = $1
        RETURNING *
      `;

      const mascotaValues = [
        id,
        nombre_mascota,
        especie,
        raza || null,
        edad,
        sexoDb,
        peso || null,
        color || null,
        fecha_nacimiento || null,
        microchip || null,
        notas || null
      ];

      const mascotaResult = await query(mascotaQuery, mascotaValues);
      const mascotaActualizada = mascotaResult.rows[0];

      // Confirmar transacción
      await query('COMMIT');

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
      await query('ROLLBACK');
      throw error;
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
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

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

    // Filtro por estado activo
    if (activo !== undefined) {
      paramCount++;
      queryText += ` AND m.activo = $${paramCount}`;
      queryParams.push(activo === 'true');
    }

    // Ordenamiento
    const allowedSortFields = ['nombre', 'especie', 'created_at', 'cliente_nombre'];
    const sortField = allowedSortFields.includes(sortBy) ? 
      (sortBy === 'cliente_nombre' ? 'c.nombre' : `m.${sortBy}`) : 'm.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
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
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM clinical.mascotas m
      LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;
    
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
    const queryText = `
      SELECT DISTINCT especie 
      FROM clinical.mascotas 
      WHERE activo = true 
      ORDER BY especie
    `;

    const result = await query(queryText);
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

    const queryText = `
      SELECT DISTINCT raza 
      FROM clinical.mascotas 
      WHERE especie = $1 AND raza IS NOT NULL AND activo = true 
      ORDER BY raza
    `;

    const result = await query(queryText, [especie]);
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
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT m.id_mascota) as total_pacientes,
        COUNT(DISTINCT c.id_cliente) as total_clientes,
        COUNT(DISTINCT m.especie) as total_especies,
        COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_ultimo_mes
      FROM clinical.mascotas m
      LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
      WHERE m.activo = true
    `;

    const result = await query(statsQuery);
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