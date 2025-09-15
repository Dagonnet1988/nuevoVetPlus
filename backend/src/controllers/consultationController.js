import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { handleDatabaseError } from '../utils/errorHandler.js';

// ✅ CREAR CONSULTA CLÍNICA
export const createConsultation = async (req, res) => {
    try {
        const {
            id_mascota,
            id_veterinario,
            id_cita,
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
            'SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_usuario = $1 AND activo = true AND rol IN ($2, $3)',
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
                id_consulta, codigo_consulta, id_cita, id_mascota, id_veterinario, motivo, anamnesis,
                examen_fisico, temperatura, peso, diagnostico, tratamiento,
                medicamentos, recomendaciones, proxima_cita, estado, costo,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `;

        const values = [
            id_consulta, codigo_consulta, id_cita || null, id_mascota, id_veterinario, motivo, anamnesis,
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

// ✅ CREAR CONSULTA CLÍNICA DESDE UNA CITA
export const createConsultationFromAppointment = async (req, res) => {
    try {
        const { id_cita } = req.params;
        
        // Verificar que la cita existe y obtener sus datos
        const citaSQL = `
            SELECT 
                c.*,
                m.nombre as nombre_mascota,
                cl.nombre as nombre_cliente
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            WHERE c.id_cita = $1
        `;
        
        const citaResult = await query(citaSQL, [id_cita]);
        
        if (citaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }
        
        const cita = citaResult.rows[0];
        
        // Verificar si ya existe una consulta para esta cita
        const consultaExistente = await query(
            'SELECT id_consulta FROM clinical.consultas_clinicas WHERE id_cita = $1',
            [id_cita]
        );
        
        if (consultaExistente.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una consulta clínica para esta cita',
                data: { id_consulta: consultaExistente.rows[0].id_consulta }
            });
        }
        
        // Generar UUID e ID único para consulta
        const id_consulta = uuidv4();
        const codigo_consulta = `CON-${Date.now().toString().slice(-8)}`;
        
        // Crear consulta con datos básicos de la cita
        const insertSQL = `
            INSERT INTO clinical.consultas_clinicas (
                id_consulta, codigo_consulta, id_cita, id_mascota, id_veterinario, 
                motivo, estado, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `;
        
        const values = [
            id_consulta, 
            codigo_consulta, 
            id_cita, 
            cita.id_mascota, 
            cita.id_veterinario,
            cita.motivo || 'Consulta programada',
            'En Curso'
        ];
        
        const result = await query(insertSQL, values);
        const nuevaConsulta = result.rows[0];
        
        // Actualizar estado de la cita a 'en_curso'
        await db.query(
            'UPDATE calendario_citas SET estado = ? WHERE id_cita = ?',
            ['en_curso', id_cita]
        );
        
        console.log('✅ Consulta creada exitosamente:', nuevaConsulta.id_consulta);
        
        res.status(201).json({
            success: true,
            message: 'Consulta clínica creada desde cita exitosamente',
            data: {
                id_consulta: nuevaConsulta.id_consulta,
                codigo_consulta: nuevaConsulta.codigo_consulta,
                estado: nuevaConsulta.estado
            }
        });
        
    } catch (error) {
        console.error('❌ Error en createConsultationFromAppointment:', error);
        const errorInfo = handleDatabaseError(error, 'crear consulta desde cita');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};

// ✅ OBTENER CONSULTA CLÍNICA POR ID DE CITA
export const getConsultationByAppointmentId = async (req, res) => {
    try {
        const { id_cita } = req.params;
        
        const selectSQL = `
            SELECT 
                c.*,
                c.fecha as fecha_consulta,
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
            LEFT JOIN vetplus_auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE c.id_cita = $1
        `;
        
        const result = await query(selectSQL, [id_cita]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró consulta clínica para esta cita'
            });
        }
        
        const consulta = result.rows[0];
        
        // Estructurar respuesta con relaciones
        const consultaStructured = {
            id_consulta: consulta.id_consulta,
            codigo_consulta: consulta.codigo_consulta,
            id_cita: consulta.id_cita,
            id_mascota: consulta.id_mascota,
            id_veterinario: consulta.id_veterinario,
            fecha_consulta: consulta.fecha_consulta,
            motivo: consulta.motivo,
            anamnesis: consulta.anamnesis,
            examen_fisico: consulta.examen_fisico,
            temperatura: consulta.temperatura,
            peso: consulta.peso,
            diagnostico: consulta.diagnostico,
            tratamiento: consulta.tratamiento,
            medicamentos: consulta.medicamentos,
            recomendaciones: consulta.recomendaciones,
            proxima_cita: consulta.proxima_cita,
            estado: consulta.estado,
            costo: consulta.costo,
            created_at: consulta.created_at,
            updated_at: consulta.updated_at,
            // Relaciones estructuradas
            mascota: {
                id_mascota: consulta.id_mascota,
                nombre: consulta.nombre_mascota,
                especie: consulta.especie,
                raza: consulta.raza,
                edad: consulta.edad
            },
            veterinario: {
                id_usuario: consulta.id_veterinario,
                nombre: consulta.nombre_veterinario,
                email: consulta.email_veterinario
            },
            cliente: {
                nombre: consulta.nombre_cliente,
                telefono: consulta.telefono,
                email: consulta.email
            }
        };
        
        res.json({
            success: true,
            data: consultaStructured
        });
        
    } catch (error) {
        const errorInfo = handleDatabaseError(error, 'obtener consulta por cita');
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
            fecha_hasta,
            search
        } = req.query;

        // Validar límites de paginación
        const maxLimit = 100;
        const validLimit = Math.min(parseInt(limit), maxLimit);
        const validOffset = Math.max(parseInt(offset), 0);

        let selectSQL = `
            SELECT 
                c.*,
                c.fecha as fecha_consulta,
                m.nombre as nombre_mascota,
                m.especie,
                m.raza,
                cl.nombre as nombre_cliente,
                cl.telefono,
                u.nombre as nombre_veterinario
            FROM clinical.consultas_clinicas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN vetplus_auth.usuarios u ON c.id_veterinario = u.id_usuario
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

        // Filtro de búsqueda de texto
        if (search) {
            paramCount++;
            selectSQL += ` AND (
                LOWER(c.motivo) LIKE LOWER($${paramCount}) OR 
                LOWER(c.diagnostico) LIKE LOWER($${paramCount}) OR 
                LOWER(m.nombre) LIKE LOWER($${paramCount}) OR 
                LOWER(cl.nombre) LIKE LOWER($${paramCount}) OR
                LOWER(c.tratamiento) LIKE LOWER($${paramCount})
            )`;
            values.push(`%${search}%`);
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

        // Filtro de búsqueda para el conteo (necesita JOIN para buscar en nombres)
        if (search) {
            countSQL = `
                SELECT COUNT(*) FROM clinical.consultas_clinicas c
                LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
                LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                WHERE 1=1
            `;
            
            // Re-aplicar todos los filtros para el conteo con búsqueda
            const newCountValues = [];
            let newCountParamCount = 0;
            
            if (estado) {
                newCountParamCount++;
                countSQL += ` AND c.estado = $${newCountParamCount}`;
                newCountValues.push(estado);
            }
            
            if (veterinario) {
                newCountParamCount++;
                countSQL += ` AND c.id_veterinario = $${newCountParamCount}`;
                newCountValues.push(veterinario);
            }
            
            if (mascota) {
                newCountParamCount++;
                countSQL += ` AND c.id_mascota = $${newCountParamCount}`;
                newCountValues.push(mascota);
            }
            
            if (fecha_desde) {
                newCountParamCount++;
                countSQL += ` AND c.fecha >= $${newCountParamCount}`;
                newCountValues.push(fecha_desde);
            }
            
            if (fecha_hasta) {
                newCountParamCount++;
                countSQL += ` AND c.fecha <= $${newCountParamCount}`;
                newCountValues.push(fecha_hasta);
            }
            
            newCountParamCount++;
            countSQL += ` AND (
                LOWER(c.motivo) LIKE LOWER($${newCountParamCount}) OR 
                LOWER(c.diagnostico) LIKE LOWER($${newCountParamCount}) OR 
                LOWER(m.nombre) LIKE LOWER($${newCountParamCount}) OR 
                LOWER(cl.nombre) LIKE LOWER($${newCountParamCount}) OR
                LOWER(c.tratamiento) LIKE LOWER($${newCountParamCount})
            )`;
            newCountValues.push(`%${search}%`);
            
            // Usar los nuevos valores para el conteo
            countValues.length = 0;
            countValues.push(...newCountValues);
        }

        const countResult = await query(countSQL, countValues);
        const total = parseInt(countResult.rows[0].count);

        // Estructurar cada consulta de la lista
        const consultasStructured = result.rows.map(consulta => ({
            id_consulta: consulta.id_consulta,
            codigo_consulta: consulta.codigo_consulta,
            id_mascota: consulta.id_mascota,
            id_veterinario: consulta.id_veterinario,
            fecha_consulta: consulta.fecha_consulta,
            motivo: consulta.motivo,
            anamnesis: consulta.anamnesis,
            examen_fisico: consulta.examen_fisico,
            temperatura: consulta.temperatura,
            peso: consulta.peso,
            diagnostico: consulta.diagnostico,
            tratamiento: consulta.tratamiento,
            medicamentos: consulta.medicamentos,
            recomendaciones: consulta.recomendaciones,
            proxima_cita: consulta.proxima_cita,
            estado: consulta.estado,
            costo: consulta.costo,
            created_at: consulta.created_at,
            updated_at: consulta.updated_at,
            // Relaciones estructuradas para la lista
            mascota: {
                id_mascota: consulta.id_mascota,
                nombre: consulta.nombre_mascota,
                especie: consulta.especie,
                raza: consulta.raza
            },
            veterinario: {
                id_usuario: consulta.id_veterinario,
                nombre: consulta.nombre_veterinario
            },
            cliente: {
                nombre: consulta.nombre_cliente,
                telefono: consulta.telefono
            }
        }));

        res.json({
            success: true,
            data: consultasStructured,
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
                c.fecha as fecha_consulta,
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
            LEFT JOIN vetplus_auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE c.id_consulta = $1
        `;

        const result = await query(selectSQL, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consulta clínica no encontrada'
            });
        }

        const consulta = result.rows[0];
        
        // Estructurar la respuesta para que coincida con la interfaz del frontend
        const consultaStructured = {
            id_consulta: consulta.id_consulta,
            codigo_consulta: consulta.codigo_consulta,
            id_mascota: consulta.id_mascota,
            id_veterinario: consulta.id_veterinario,
            fecha_consulta: consulta.fecha_consulta,
            motivo: consulta.motivo,
            anamnesis: consulta.anamnesis,
            examen_fisico: consulta.examen_fisico,
            temperatura: consulta.temperatura,
            peso: consulta.peso,
            diagnostico: consulta.diagnostico,
            tratamiento: consulta.tratamiento,
            medicamentos: consulta.medicamentos,
            recomendaciones: consulta.recomendaciones,
            proxima_cita: consulta.proxima_cita,
            estado: consulta.estado,
            costo: consulta.costo,
            created_at: consulta.created_at,
            updated_at: consulta.updated_at,
            // Campos adicionales de la BD
            formula_enviada_whatsapp: consulta.formula_enviada_whatsapp,
            fecha_envio_formula: consulta.fecha_envio_formula,
            recordatorio_medicamentos_enviado: consulta.recordatorio_medicamentos_enviado,
            // Relaciones estructuradas
            mascota: {
                id_mascota: consulta.id_mascota,
                nombre: consulta.nombre_mascota,
                especie: consulta.especie,
                raza: consulta.raza,
                edad: consulta.edad
            },
            veterinario: {
                id_usuario: consulta.id_veterinario,
                nombre: consulta.nombre_veterinario,
                email: consulta.email_veterinario
            },
            cliente: {
                nombre: consulta.nombre_cliente,
                telefono: consulta.telefono,
                email: consulta.email
            }
        };

        res.json({
            success: true,
            data: consultaStructured
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
            LEFT JOIN vetplus_auth.usuarios u ON c.id_veterinario = u.id_usuario
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

// 🔥 COMPLETAR CONSULTA CON FACTURACIÓN AUTOMÁTICA
export const completeConsultationWithInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            // Datos de la consulta
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
            // Datos para la factura
            productos_servicios, // Array de {codigo_barras?, codigo?, cantidad, precio_unitario, descripcion?}
            metodo_pago = 'efectivo',
            descuento_factura = 0,
            notas_factura = null
        } = req.body;

        // Iniciar transacción completa
        await query('BEGIN');

        try {
            // 1. Verificar que la consulta existe y obtener datos completos
            const consultaResult = await query(`
                SELECT 
                    cc.*,
                    m.id_cliente,
                    m.nombre as mascota_nombre,
                    c.nombre as cliente_nombre,
                    c.email as cliente_email,
                    c.telefono as cliente_telefono,
                    u.nombre as veterinario_nombre
                FROM clinical.consultas_clinicas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
                JOIN vetplus_auth.usuarios u ON cc.id_veterinario = u.id_usuario
                WHERE cc.id_consulta = $1
            `, [id]);

            if (consultaResult.rows.length === 0) {
                await query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Consulta clínica no encontrada'
                });
            }

            const consultaData = consultaResult.rows[0];

            // 2. Completar la consulta clínica
            const updateConsultaSQL = `
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
                    estado = 'completada',
                    fecha_completada = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_consulta = $11
                RETURNING *
            `;

            const consultaActualizada = await query(updateConsultaSQL, [
                motivo,
                anamnesis,
                examen_fisico,
                temperatura,
                peso,
                diagnostico,
                tratamiento ? JSON.stringify(tratamiento) : null,
                medicamentos ? JSON.stringify(medicamentos) : null,
                recomendaciones,
                proxima_cita,
                id
            ]);

            console.log('✅ Consulta completada exitosamente');

            // 3. Crear factura automáticamente si hay productos/servicios
            let facturaCreada = null;
            if (productos_servicios && productos_servicios.length > 0) {
                console.log('💰 Generando factura automática...');

                // Obtener caja activa
                const cajaResult = await query(
                    'SELECT id_caja FROM financial.cajas WHERE activa = true LIMIT 1'
                );

                if (cajaResult.rows.length === 0) {
                    console.warn('⚠️ No hay cajas activas, factura no será creada');
                } else {
                    const idCaja = cajaResult.rows[0].id_caja;

                    // Crear la factura
                    const facturaResult = await query(`
                        INSERT INTO financial.facturas_venta (
                            id_cliente, subtotal, descuento, impuestos, total, 
                            estado, metodo_pago, notas, id_caja, id_consulta, created_by
                        ) VALUES (
                            $1, 0, $2, 0, 0, 'Pendiente', $3, $4, $5, $6, $7
                        ) RETURNING id_factura, codigo_factura
                    `, [
                        consultaData.id_cliente, 
                        descuento_factura, 
                        metodo_pago, 
                        notas_factura || `Factura por consulta ${consultaData.codigo_consulta}`,
                        idCaja,
                        id,
                        req.user.id
                    ]);

                    const factura = facturaResult.rows[0];
                    let subtotal = 0;

                    // Procesar cada producto/servicio
                    for (const item of productos_servicios) {
                        let producto = null;

                        // Buscar producto por código de barras o código
                        if (item.codigo_barras) {
                            const productoResult = await query(
                                'SELECT * FROM financial.productos WHERE codigo_barras = $1 AND activo = true',
                                [item.codigo_barras]
                            );
                            producto = productoResult.rows[0];
                        } else if (item.codigo) {
                            const productoResult = await query(
                                'SELECT * FROM financial.productos WHERE codigo = $1 AND activo = true',
                                [item.codigo]
                            );
                            producto = productoResult.rows[0];
                        }

                        // Usar datos del producto o datos manuales
                        const descripcion = item.descripcion || producto?.nombre || 'Servicio consulta';
                        const precioUnitario = item.precio_unitario || producto?.precio_venta || 0;
                        const cantidad = item.cantidad || 1;
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
                            console.log(`📝 Producto manual "${descripcion}", omitiendo validación de stock`);
                        }

                        // Insertar detalle de factura
                        await query(`
                            INSERT INTO financial.lineas_factura (
                                id_factura, id_producto, cantidad, precio_unitario, descuento
                            ) VALUES ($1, $2, $3, $4, $5)
                        `, [
                            factura.id_factura,
                            producto?.id_producto || null,
                            cantidad,
                            precioUnitario,
                            0 // descuento por línea
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

                        subtotal += total;
                    }

                    // Calcular totales
                    const impuestos = subtotal * 0.19; // IVA 19%
                    const total = subtotal - descuento_factura + impuestos;

                    // Actualizar totales de la factura
                    await query(`
                        UPDATE financial.facturas_venta 
                        SET subtotal = $1, impuestos = $2, total = $3, estado = 'Pagada'
                        WHERE id_factura = $4
                    `, [subtotal, impuestos, total, factura.id_factura]);

                    // Obtener factura completa (reutilizar función del invoiceController)
                    const facturaCompleta = await query(`
                        SELECT 
                            f.*,
                            c.nombre as cliente_nombre,
                            c.email as cliente_email,
                            c.telefono as cliente_telefono,
                            u.nombre as creado_por
                        FROM financial.facturas_venta f
                        LEFT JOIN clinical.clientes c ON f.id_cliente = c.id_cliente
                        LEFT JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
                        WHERE f.id_factura = $1
                    `, [factura.id_factura]);

                    facturaCreada = facturaCompleta.rows[0];

                    console.log('✅ Factura generada automáticamente:', {
                        id_factura: factura.id_factura,
                        codigo_factura: factura.codigo_factura,
                        total: total
                    });
                }
            }

            await query('COMMIT');

            res.json({
                success: true,
                message: facturaCreada ? 
                    'Consulta completada y factura generada automáticamente' : 
                    'Consulta completada exitosamente',
                data: {
                    consulta: consultaActualizada.rows[0],
                    factura: facturaCreada
                }
            });

        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error completando consulta con facturación:', error);
        const errorInfo = handleDatabaseError(error, 'completar consulta con facturación');
        res.status(errorInfo.status).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
