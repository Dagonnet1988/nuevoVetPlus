import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { handleDatabaseError } from '../utils/errorHandler.js';
import { calculatePetAge } from '../utils/ageCalculator.js';

// ✅ CREAR MASCOTA
export const createPet = async (req, res) => {
    try {
        const {
            id_cliente,
            nombre,
            especie,
            raza,
            sexo,
            peso,
            color,
            fecha_nacimiento,
            esterilizado,
            microchip
        } = req.body;

        // Generar UUID en JavaScript
        const id_mascota = uuidv4();
        
        // Calcular edad completa con años y meses
        const edadData = calculatePetAge(fecha_nacimiento);
        const edad = edadData ? edadData.años : null; // Mantener compatibilidad con campo numérico

        // Verificar que el cliente existe
        const clienteExiste = await query(
            'SELECT id_cliente FROM clinical.clientes WHERE id_cliente = $1 AND activo = true',
            [id_cliente]
        );

        if (clienteExiste.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El cliente especificado no existe o está inactivo'
            });
        }

        console.log('Creando mascota con UUID:', id_mascota);
        console.log('Datos de edad calculados:', edadData);

        // Insertar nueva mascota con UUID generado en JS
        const insertSQL = `
            INSERT INTO clinical.mascotas (
                id_mascota, id_cliente, nombre, especie, raza, edad, 
                sexo, peso, color, fecha_nacimiento, esterilizado, microchip,
                activo, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 
                $7, $8, $9, $10, $11, $12,
                true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `;

        const values = [
            id_mascota, id_cliente, nombre, especie, raza, edad,
            sexo, peso, color, fecha_nacimiento, esterilizado, microchip
        ];

        console.log('SQL:', insertSQL);
        console.log('Values:', values);

        const result = await query(insertSQL, values);
        const nuevaMascota = result.rows[0];

        // Agregar datos de edad completos a la respuesta
        const edadCompleta = calculatePetAge(nuevaMascota.fecha_nacimiento);

        res.status(201).json({
            success: true,
            message: 'Mascota creada exitosamente',
            data: {
                ...nuevaMascota,
                edadCompleta
            }
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'crear mascota');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ OBTENER TODAS LAS MASCOTAS
export const getPets = async (req, res) => {
    try {
        const { 
            limit = 10, 
            offset = 0, 
            especie, 
            cliente,
            activo = true 
        } = req.query;

        // Validar límites de paginación
        const maxLimit = 100;
        const validLimit = Math.min(parseInt(limit), maxLimit);
        const validOffset = Math.max(parseInt(offset), 0);

        let selectSQL = `
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
                m.esterilizado,
                m.microchip,
                m.created_at,
                m.updated_at,
                c.nombre as nombre_cliente,
                c.telefono,
                c.email
            FROM clinical.mascotas m
            LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE m.activo = true
        `;
        
        const values = [];
        let paramCount = 0;

        // Filtro por especie
        if (especie) {
            paramCount++;
            selectSQL += ` AND LOWER(m.especie) = LOWER($${paramCount})`;
            values.push(especie);
        }

        // Filtro por cliente
        if (cliente) {
            paramCount++;
            selectSQL += ` AND m.id_cliente = $${paramCount}`;
            values.push(cliente);
        }

        selectSQL += ` ORDER BY m.created_at DESC`;

        // Paginación
        paramCount++;
        selectSQL += ` LIMIT $${paramCount}`;
        values.push(validLimit);

        paramCount++;
        selectSQL += ` OFFSET $${paramCount}`;
        values.push(validOffset);

        const result = await query(selectSQL, values);
        
        console.log('Query SQL:', selectSQL);
        console.log('Values:', values);
        console.log('Result rows:', result.rows.length);

        // Contar total de mascotas
        let countSQL = 'SELECT COUNT(*) FROM clinical.mascotas WHERE activo = true';
        const countValues = [];
        let countParamCount = 0;

        if (especie) {
            countParamCount++;
            countSQL += ` AND LOWER(especie) = LOWER($${countParamCount})`;
            countValues.push(especie);
        }

        if (cliente) {
            countParamCount++;
            countSQL += ` AND id_cliente = $${countParamCount}`;
            countValues.push(cliente);
        }

        const countResult = await query(countSQL, countValues);
        const total = parseInt(countResult.rows[0].count);

        // Agregar datos de edad completos a cada mascota
        const mascotasConEdad = result.rows.map(mascota => ({
            ...mascota,
            edadCompleta: calculatePetAge(mascota.fecha_nacimiento)
        }));

        res.json({
            success: true,
            data: mascotasConEdad,
            pagination: {
                total,
                limit: validLimit,
                offset: validOffset,
                pages: Math.ceil(total / validLimit),
                hasMore: (validOffset + validLimit) < total
            }
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener mascotas');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ OBTENER MASCOTA POR ID
export const getPetById = async (req, res) => {
    try {
        const { id } = req.params;

        const selectSQL = `
            SELECT 
                m.*,
                c.nombre as nombre_cliente,
                c.cedula,
                c.telefono,
                c.email,
                c.direccion,
                COUNT(con.id_consulta) as total_consultas
            FROM clinical.mascotas m
            LEFT JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            LEFT JOIN clinical.consultas_clinicas con ON m.id_mascota = con.id_mascota
            WHERE m.id_mascota = $1 AND m.activo = true
            GROUP BY m.id_mascota, c.id_cliente
        `;

        const result = await query(selectSQL, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada'
            });
        }

        const mascota = result.rows[0];
        const edadCompleta = calculatePetAge(mascota.fecha_nacimiento);

        res.json({
            success: true,
            data: {
                ...mascota,
                edadCompleta
            }
        });
    } catch (error) {
        console.error('Error al obtener mascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ✅ OBTENER MASCOTAS POR CLIENTE
export const getPetsByClient = async (req, res) => {
    try {
        const { id } = req.params;

        const selectSQL = `
            SELECT 
                m.*,
                COUNT(con.id_consulta) as total_consultas,
                COUNT(CASE WHEN ct.activo = true THEN 1 END) as terapias_activas
            FROM clinical.mascotas m
            LEFT JOIN clinical.consultas_clinicas con ON m.id_mascota = con.id_mascota
            LEFT JOIN financial.control_terapias ct ON m.id_mascota = ct.id_mascota
            WHERE m.id_cliente = $1 AND m.activo = true
            GROUP BY m.id_mascota
            ORDER BY m.created_at DESC
        `;

        const result = await query(selectSQL, [id]);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error al obtener mascotas por cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ✅ ACTUALIZAR MASCOTA
export const updatePet = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            especie,
            raza,
            sexo,
            peso,
            color,
            fecha_nacimiento,
            esterilizado,
            microchip
        } = req.body;

        // Verificar que la mascota existe
        const mascotaExiste = await query(
            'SELECT id_mascota FROM clinical.mascotas WHERE id_mascota = $1 AND activo = true',
            [id]
        );

        if (mascotaExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada'
            });
        }

        // Calcular edad si se proporciona fecha de nacimiento
        let edad = null;
        if (fecha_nacimiento) {
            const edadData = calculatePetAge(fecha_nacimiento);
            edad = edadData ? edadData.años : null; // Mantener compatibilidad con campo numérico
        }

        const updateSQL = `
            UPDATE clinical.mascotas 
            SET 
                nombre = COALESCE($1, nombre),
                especie = COALESCE($2, especie),
                raza = COALESCE($3, raza),
                edad = COALESCE($4, edad),
                sexo = COALESCE($5, sexo),
                peso = COALESCE($6, peso),
                color = COALESCE($7, color),
                fecha_nacimiento = COALESCE($8, fecha_nacimiento),
                esterilizado = COALESCE($9, esterilizado),
                microchip = COALESCE($10, microchip),
                activo = COALESCE($11, activo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id_mascota = $12
            RETURNING *
        `;

        const values = [
            nombre, especie, raza, edad, sexo, peso, color,
            fecha_nacimiento, esterilizado, microchip, req.body.activo, id
        ];

        console.log('=== UPDATE PET DEBUG ===');
        console.log('ID:', id);
        console.log('Body completo:', req.body);
        console.log('Campo activo recibido:', req.body.activo);
        console.log('Valores SQL:', values);
        console.log('========================');

        const result = await query(updateSQL, values);
        const mascotaActualizada = result.rows[0];

        // Agregar datos de edad completos a la respuesta
        const edadCompleta = calculatePetAge(mascotaActualizada.fecha_nacimiento);

        res.json({
            success: true,
            message: 'Mascota actualizada exitosamente',
            data: {
                ...mascotaActualizada,
                edadCompleta
            }
        });
    } catch (error) {
        console.error('Error al actualizar mascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ✅ ELIMINAR MASCOTA (SOFT DELETE)
export const deletePet = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la mascota existe
        const mascotaExiste = await query(
            'SELECT id_mascota FROM clinical.mascotas WHERE id_mascota = $1 AND activo = true',
            [id]
        );

        if (mascotaExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada'
            });
        }

        // Verificar si tiene terapias activas
        const terapiasActivas = await query(
            'SELECT COUNT(*) FROM financial.control_terapias WHERE id_mascota = $1 AND activo = true',
            [id]
        );

        if (parseInt(terapiasActivas.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la mascota porque tiene terapias activas'
            });
        }

        // Soft delete
        const deleteSQL = `
            UPDATE clinical.mascotas 
            SET 
                activo = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_mascota = $1
            RETURNING nombre
        `;

        const result = await query(deleteSQL, [id]);

        res.json({
            success: true,
            message: `Mascota "${result.rows[0].nombre}" eliminada exitosamente`
        });
    } catch (error) {
        console.error('Error al eliminar mascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ✅ ESTADÍSTICAS DE MASCOTAS
export const getPetStats = async (req, res) => {
    try {
        const statsSQL = `
            SELECT 
                COUNT(*) as total_mascotas,
                COUNT(CASE WHEN especie = 'Perro' THEN 1 END) as total_perros,
                COUNT(CASE WHEN especie = 'Gato' THEN 1 END) as total_gatos,
                COUNT(CASE WHEN esterilizado = true THEN 1 END) as total_esterilizados,
                AVG(edad) as edad_promedio,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevas_ultimo_mes
            FROM clinical.mascotas 
            WHERE activo = true
        `;

        const result = await query(statsSQL);
        const stats = result.rows[0];

        // Estadísticas por especie
        const especiesSQL = `
            SELECT 
                especie,
                COUNT(*) as cantidad,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM clinical.mascotas WHERE activo = true)), 2) as porcentaje
            FROM clinical.mascotas 
            WHERE activo = true
            GROUP BY especie
            ORDER BY cantidad DESC
        `;

        const especiesResult = await query(especiesSQL);

        res.json({
            success: true,
            data: {
                resumen: {
                    total_mascotas: parseInt(stats.total_mascotas),
                    total_perros: parseInt(stats.total_perros),
                    total_gatos: parseInt(stats.total_gatos),
                    total_esterilizados: parseInt(stats.total_esterilizados),
                    edad_promedio: parseFloat(stats.edad_promedio).toFixed(1),
                    nuevas_ultimo_mes: parseInt(stats.nuevas_ultimo_mes)
                },
                por_especie: especiesResult.rows
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de mascotas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};