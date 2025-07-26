import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { handleDatabaseError } from '../utils/errorHandler.js';

// ✅ CREAR CONSULTA CLÍNICA
export const createConsultation = async (req, res) => {
    try {
        const {
            id_mascota,
            id_veterinario,
            motivo,
            anamnesis,
            examen_fisico,
            temperatura,
            peso,
            diagnostico,
            tratamiento,
            medicamentos,
            recomendaciones,
            proxima_cita,
            estado = 'Completada',
            costo
        } = req.body;

        // Generar UUID e ID único para consulta
        const id_consulta = uuidv4();
        const codigo_consulta = `CON-${Date.now().toString().slice(-8)}`;

        console.log('Creando consulta clínica con UUID:', id_consulta);
        console.log('Código de consulta:', codigo_consulta);

        // Verificar que la mascota existe
        const mascotaExiste = await query(
            'SELECT id_mascota FROM clinical.mascotas WHERE id_mascota = $1 AND activo = true',
            [id_mascota]
        );

        if (mascotaExiste.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La mascota especificada no existe o está inactiva'
            });
        }

        // Verificar que el veterinario existe
        const veterinarioExiste = await query(
            'SELECT id_usuario FROM auth.usuarios WHERE id_usuario = $1 AND activo = true AND rol IN ($2, $3)',
            [id_veterinario, 'admin', 'vet']
        );

        if (veterinarioExiste.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El veterinario especificado no existe o no tiene permisos'
            });
        }

        console.log('Creando consulta clínica con UUID:', id_consulta);
        console.log('Código de consulta:', codigo_consulta);

        // Insertar nueva consulta
        const insertSQL = `
            INSERT INTO clinical.consultas_clinicas (
                id_consulta, codigo_consulta, id_mascota, id_veterinario, motivo, anamnesis,
                examen_fisico, temperatura, peso, diagnostico, tratamiento,
                medicamentos, recomendaciones, proxima_cita, estado, costo,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `;

        const values = [
            id_consulta, codigo_consulta, id_mascota, id_veterinario, motivo, anamnesis,
            examen_fisico, temperatura, peso, diagnostico, tratamiento,
            medicamentos ? JSON.stringify(medicamentos) : null,
            recomendaciones, proxima_cita, estado, costo
        ];

        const result = await query(insertSQL, values);
        const nuevaConsulta = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Consulta clínica creada exitosamente',
            data: nuevaConsulta
        });

    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'crear consulta clínica');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ LISTAR CONSULTAS CLÍNICAS CON PAGINACIÓN Y FILTROS
export const getConsultations = async (req, res) => {
    try {
        const { 
            limit = 10, 
            offset = 0, 
            estado, 
            veterinario,
            mascota,
            fecha_desde,
            fecha_hasta 
        } = req.query;

        // Validar límites de paginación
        const maxLimit = 100;
        const validLimit = Math.min(parseInt(limit), maxLimit);
        const validOffset = Math.max(parseInt(offset), 0);

        let selectSQL = `
            SELECT 
                c.*,
                m.nombre as nombre_mascota,
                m.especie,
                m.raza,
                cl.nombre as nombre_cliente,
                cl.telefono,
                u.nombre as nombre_veterinario
            FROM clinical.consultas_clinicas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 0;

        // Filtros opcionales
        if (estado) {
            paramCount++;
            selectSQL += ` AND c.estado = $${paramCount}`;
            values.push(estado);
        }

        if (veterinario) {
            paramCount++;
            selectSQL += ` AND c.id_veterinario = $${paramCount}`;
            values.push(veterinario);
        }

        if (mascota) {
            paramCount++;
            selectSQL += ` AND c.id_mascota = $${paramCount}`;
            values.push(mascota);
        }

        if (fecha_desde) {
            paramCount++;
            selectSQL += ` AND c.fecha >= $${paramCount}`;
            values.push(fecha_desde);
        }

        if (fecha_hasta) {
            paramCount++;
            selectSQL += ` AND c.fecha <= $${paramCount}`;
            values.push(fecha_hasta);
        }

        selectSQL += ` ORDER BY c.fecha DESC`;

        // Paginación
        paramCount++;
        selectSQL += ` LIMIT $${paramCount}`;
        values.push(validLimit);

        paramCount++;
        selectSQL += ` OFFSET $${paramCount}`;
        values.push(validOffset);

        const result = await query(selectSQL, values);

        // Contar total de consultas
        let countSQL = 'SELECT COUNT(*) FROM clinical.consultas_clinicas c WHERE 1=1';
        const countValues = [];
        let countParamCount = 0;

        if (estado) {
            countParamCount++;
            countSQL += ` AND estado = $${countParamCount}`;
            countValues.push(estado);
        }

        if (veterinario) {
            countParamCount++;
            countSQL += ` AND id_veterinario = $${countParamCount}`;
            countValues.push(veterinario);
        }

        if (mascota) {
            countParamCount++;
            countSQL += ` AND id_mascota = $${countParamCount}`;
            countValues.push(mascota);
        }

        if (fecha_desde) {
            countParamCount++;
            countSQL += ` AND fecha >= $${countParamCount}`;
            countValues.push(fecha_desde);
        }

        if (fecha_hasta) {
            countParamCount++;
            countSQL += ` AND fecha <= $${countParamCount}`;
            countValues.push(fecha_hasta);
        }

        const countResult = await query(countSQL, countValues);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: validLimit,
                offset: validOffset,
                pages: Math.ceil(total / validLimit),
                hasMore: (validOffset + validLimit) < total
            }
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener consultas clínicas');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ OBTENER CONSULTA CLÍNICA POR ID
export const getConsultationById = async (req, res) => {
    try {
        const { id } = req.params;

        const selectSQL = `
            SELECT 
                c.*,
                m.nombre as nombre_mascota,
                m.especie,
                m.raza,
                m.edad,
                cl.nombre as nombre_cliente,
                cl.telefono,
                cl.email,
                u.nombre as nombre_veterinario,
                u.email as email_veterinario
            FROM clinical.consultas_clinicas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE c.id_consulta = $1
        `;

        const result = await query(selectSQL, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consulta clínica no encontrada'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener consulta clínica');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ OBTENER CONSULTAS POR MASCOTA
export const getConsultationsByPet = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const validLimit = Math.min(parseInt(limit), 100);
        const validOffset = Math.max(parseInt(offset), 0);

        const selectSQL = `
            SELECT 
                c.*,
                u.nombre as nombre_veterinario
            FROM clinical.consultas_clinicas c
            LEFT JOIN auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE c.id_mascota = $1
            ORDER BY c.fecha DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await query(selectSQL, [id, validLimit, validOffset]);

        // Contar total
        const countResult = await query(
            'SELECT COUNT(*) FROM clinical.consultas_clinicas WHERE id_mascota = $1',
            [id]
        );
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: validLimit,
                offset: validOffset,
                pages: Math.ceil(total / validLimit)
            }
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener consultas por mascota');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ ACTUALIZAR CONSULTA CLÍNICA
export const updateConsultation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            motivo,
            anamnesis,
            examen_fisico,
            temperatura,
            peso,
            diagnostico,
            tratamiento,
            medicamentos,
            recomendaciones,
            proxima_cita,
            estado,
            costo
        } = req.body;

        // Verificar que la consulta existe
        const consultaExiste = await query(
            'SELECT id_consulta FROM clinical.consultas_clinicas WHERE id_consulta = $1',
            [id]
        );

        if (consultaExiste.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consulta clínica no encontrada'
            });
        }

        const updateSQL = `
            UPDATE clinical.consultas_clinicas 
            SET 
                motivo = COALESCE($1, motivo),
                anamnesis = COALESCE($2, anamnesis),
                examen_fisico = COALESCE($3, examen_fisico),
                temperatura = COALESCE($4, temperatura),
                peso = COALESCE($5, peso),
                diagnostico = COALESCE($6, diagnostico),
                tratamiento = COALESCE($7, tratamiento),
                medicamentos = COALESCE($8, medicamentos),
                recomendaciones = COALESCE($9, recomendaciones),
                proxima_cita = COALESCE($10, proxima_cita),
                estado = COALESCE($11, estado),
                costo = COALESCE($12, costo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id_consulta = $13
            RETURNING *
        `;

        const values = [
            motivo, anamnesis, examen_fisico, temperatura, peso,
            diagnostico, tratamiento,
            medicamentos ? JSON.stringify(medicamentos) : null,
            recomendaciones, proxima_cita, estado, costo, id
        ];

        const result = await query(updateSQL, values);
        const consultaActualizada = result.rows[0];

        res.json({
            success: true,
            message: 'Consulta clínica actualizada exitosamente',
            data: consultaActualizada
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'actualizar consulta clínica');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ ESTADÍSTICAS DE CONSULTAS
export const getConsultationStats = async (req, res) => {
    try {
        const statsSQL = `
            SELECT 
                COUNT(*) as total_consultas,
                COUNT(CASE WHEN estado = 'Completada' THEN 1 END) as consultas_completadas,
                COUNT(CASE WHEN estado = 'Programada' THEN 1 END) as consultas_programadas,
                COUNT(CASE WHEN estado = 'En Curso' THEN 1 END) as consultas_en_curso,
                COUNT(CASE WHEN fecha >= CURRENT_DATE THEN 1 END) as consultas_hoy,
                COUNT(CASE WHEN fecha >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as consultas_semana,
                AVG(costo) as costo_promedio,
                COUNT(DISTINCT id_mascota) as mascotas_atendidas,
                COUNT(DISTINCT id_veterinario) as veterinarios_activos
            FROM clinical.consultas_clinicas
        `;

        const result = await query(statsSQL);
        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                ...stats,
                costo_promedio: parseFloat(stats.costo_promedio || 0).toFixed(2)
            }
        });
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener estadísticas de consultas');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};
