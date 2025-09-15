import { query } from '../config/database.js';

/**
 * Dashboard gerencial con estadísticas generales
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Solo admins, veterinarios y auxiliares pueden ver el dashboard completo
        if (!['admin', 'vet', 'aux_admin', 'aux_vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver las estadísticas del dashboard'
            });
        }

        const {
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0]
        } = req.query;

        // Estadísticas paralelas para mejor rendimiento
        const [
            ventasResult,
            citasResult,
            inventarioResult,
            clientesResult,
            mascotasResult,
            proveedoresResult,
            comprasResult,
            cajaResult
        ] = await Promise.all([
            // Ventas del período
            query(`
                SELECT 
                    COUNT(*) as total_facturas,
                    COALESCE(SUM(total), 0) as total_ventas,
                    COALESCE(AVG(total), 0) as promedio_venta
                FROM financial.facturas_venta 
                WHERE fecha >= $1 AND fecha <= $2
                AND estado = 'Pagada'
            `, [fecha_inicio, fecha_fin]),

            // Citas del período
            query(`
                SELECT 
                    COUNT(*) as total_citas,
                    COUNT(CASE WHEN estado = 'Completada' THEN 1 END) as citas_completadas,
                    COUNT(CASE WHEN estado = 'Cancelada' THEN 1 END) as citas_canceladas,
                    COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as citas_pendientes
                FROM clinical.calendario_citas 
                WHERE fecha_inicio >= $1 AND fecha_inicio <= $2
            `, [fecha_inicio, fecha_fin + ' 23:59:59']),

            // Inventario crítico
            query(`
                SELECT 
                    COUNT(*) as total_productos,
                    COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as productos_criticos,
                    COALESCE(SUM(stock_actual * precio_venta), 0) as valor_inventario
                FROM financial.productos 
                WHERE activo = true
            `),

            // Clientes activos
            query(`
                SELECT 
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN created_at >= $1 THEN 1 END) as clientes_nuevos
                FROM clinical.clientes 
                WHERE activo = true
            `, [fecha_inicio]),

            // Mascotas activas
            query(`
                SELECT 
                    COUNT(*) as total_mascotas,
                    COUNT(CASE WHEN created_at >= $1 THEN 1 END) as mascotas_nuevas,
                    COUNT(DISTINCT especie) as especies_atendidas
                FROM clinical.mascotas 
                WHERE activo = true
            `, [fecha_inicio]),

            // Proveedores
            query(`
                SELECT 
                    COUNT(*) as total_proveedores,
                    COUNT(CASE WHEN activo = true THEN 1 END) as proveedores_activos
                FROM financial.proveedores
            `),

            // Compras del período
            query(`
                SELECT 
                    COUNT(*) as total_ordenes,
                    COALESCE(SUM(total), 0) as total_compras
                FROM financial.ordenes_compra 
                WHERE fecha >= $1 AND fecha <= $2
                AND estado = 'completada'
            `, [fecha_inicio, fecha_fin]),

            // Estado de caja (combinando ingresos y egresos)
            query(`
                WITH movimientos AS (
                    SELECT monto, 'ingreso' as tipo, fecha FROM financial.ingresos WHERE fecha >= $1 AND fecha <= $2
                    UNION ALL
                    SELECT -monto, 'egreso' as tipo, fecha FROM financial.egresos WHERE fecha >= $1 AND fecha <= $2
                )
                SELECT 
                    COALESCE(SUM(monto), 0) as balance_caja,
                    COUNT(CASE WHEN tipo = 'ingreso' THEN 1 END) as total_ingresos,
                    COUNT(CASE WHEN tipo = 'egreso' THEN 1 END) as total_egresos
                FROM movimientos
            `, [fecha_inicio, fecha_fin])
        ]);

        // Calcular métricas derivadas
        const citasData = citasResult.rows[0];
        const tasaCompletamiento = citasData.total_citas > 0 
            ? Math.round((citasData.citas_completadas / citasData.total_citas) * 100) 
            : 0;

        const inventarioData = inventarioResult.rows[0];
        const porcentajeCritico = inventarioData.total_productos > 0
            ? Math.round((inventarioData.productos_criticos / inventarioData.total_productos) * 100)
            : 0;

        const dashboard = {
            periodo: {
                fecha_inicio,
                fecha_fin,
                dias: Math.ceil((new Date(fecha_fin) - new Date(fecha_inicio)) / (1000 * 60 * 60 * 24)) + 1
            },
            ventas: {
                total_facturas: parseInt(ventasResult.rows[0].total_facturas),
                total_ventas: parseFloat(ventasResult.rows[0].total_ventas),
                promedio_venta: parseFloat(ventasResult.rows[0].promedio_venta)
            },
            citas: {
                total_citas: parseInt(citasData.total_citas),
                completadas: parseInt(citasData.citas_completadas),
                canceladas: parseInt(citasData.citas_canceladas),
                pendientes: parseInt(citasData.citas_pendientes),
                tasa_completamiento: tasaCompletamiento
            },
            inventario: {
                total_productos: parseInt(inventarioData.total_productos),
                productos_criticos: parseInt(inventarioData.productos_criticos),
                porcentaje_critico: porcentajeCritico,
                valor_total: parseFloat(inventarioData.valor_inventario)
            },
            clientes: {
                total_clientes: parseInt(clientesResult.rows[0].total_clientes),
                clientes_nuevos: parseInt(clientesResult.rows[0].clientes_nuevos)
            },
            mascotas: {
                total_mascotas: parseInt(mascotasResult.rows[0].total_mascotas),
                mascotas_nuevas: parseInt(mascotasResult.rows[0].mascotas_nuevas),
                especies_atendidas: parseInt(mascotasResult.rows[0].especies_atendidas)
            },
            proveedores: {
                total_proveedores: parseInt(proveedoresResult.rows[0].total_proveedores),
                proveedores_activos: parseInt(proveedoresResult.rows[0].proveedores_activos)
            },
            compras: {
                total_ordenes: parseInt(comprasResult.rows[0].total_ordenes),
                total_compras: parseFloat(comprasResult.rows[0].total_compras)
            },
            caja: {
                balance_actual: parseFloat(cajaResult.rows[0].balance_caja),
                total_ingresos: parseInt(cajaResult.rows[0].total_ingresos),
                total_egresos: parseInt(cajaResult.rows[0].total_egresos)
            }
        };

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reportes de ventas por período
 */
export const getSalesReports = async (req, res) => {
    try {
        // Solo admins, veterinarios y auxiliares pueden ver reportes de ventas
        if (!['admin', 'vet', 'aux_admin', 'aux_vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver reportes de ventas'
            });
        }

        const {
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0],
            grupo_por = 'dia', // dia, semana, mes
            id_veterinario,
            tipo_servicio
        } = req.query;

        let agrupacion = "DATE(fecha)";
        let formatoFecha = "YYYY-MM-DD";

        switch (grupo_por) {
            case 'semana':
                agrupacion = "DATE_TRUNC('week', fecha)";
                formatoFecha = "YYYY-\"W\"WW";
                break;
            case 'mes':
                agrupacion = "DATE_TRUNC('month', fecha)";
                formatoFecha = "YYYY-MM";
                break;
        }

        let whereConditions = ['f.fecha >= $1', 'f.fecha <= $2', "f.estado = 'Pagada'"];
        let queryParams = [fecha_inicio, fecha_fin];
        let paramCount = 2;

        if (id_veterinario) {
            paramCount++;
            whereConditions.push(`f.created_by = $${paramCount}`);
            queryParams.push(id_veterinario);
        }

        // Reporte principal de ventas
        const ventasQuery = `
            SELECT 
                ${agrupacion} as periodo,
                TO_CHAR(${agrupacion}, '${formatoFecha}') as periodo_texto,
                COUNT(*) as total_facturas,
                SUM(f.total) as total_ventas,
                AVG(f.total) as promedio_venta,
                SUM(f.subtotal) as subtotal,
                SUM(f.impuestos) as impuestos,
                COUNT(DISTINCT f.id_cliente) as clientes_unicos
            FROM financial.facturas_venta f
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY ${agrupacion}
            ORDER BY periodo ASC
        `;

        // Top productos vendidos
        const productosQuery = `
            SELECT 
                p.nombre,
                p.codigo,
                SUM(lf.cantidad) as cantidad_vendida,
                SUM(lf.cantidad * lf.precio_unitario) as total_ventas,
                COUNT(DISTINCT lf.id_factura) as facturas
            FROM financial.lineas_factura lf
            INNER JOIN financial.facturas_venta f ON lf.id_factura = f.id_factura
            INNER JOIN financial.productos p ON lf.id_producto = p.id_producto
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY p.id_producto, p.nombre, p.codigo
            ORDER BY cantidad_vendida DESC
            LIMIT 10
        `;

        // Ventas por veterinario
        const veterinariosQuery = `
            SELECT 
                u.nombre as veterinario,
                COUNT(*) as total_facturas,
                SUM(f.total) as total_ventas,
                AVG(f.total) as promedio_venta
            FROM financial.facturas_venta f
            INNER JOIN vetplus_auth.usuarios u ON f.created_by = u.id_usuario
            WHERE ${whereConditions.join(' AND ')}
            AND u.rol IN ('vet', 'admin')
            GROUP BY u.id_usuario, u.nombre
            ORDER BY total_ventas DESC
        `;

        const [ventasResult, productosResult, veterinariosResult] = await Promise.all([
            query(ventasQuery, queryParams),
            query(productosQuery, queryParams),
            query(veterinariosQuery, queryParams)
        ]);

        // Calcular totales generales
        const totales = ventasResult.rows.reduce((acc, row) => ({
            total_facturas: acc.total_facturas + parseInt(row.total_facturas),
            total_ventas: acc.total_ventas + parseFloat(row.total_ventas),
            total_clientes: acc.total_clientes + parseInt(row.clientes_unicos)
        }), { total_facturas: 0, total_ventas: 0, total_clientes: 0 });

        res.json({
            success: true,
            data: {
                periodo: {
                    fecha_inicio,
                    fecha_fin,
                    agrupacion: grupo_por
                },
                totales,
                ventas_por_periodo: ventasResult.rows,
                productos_mas_vendidos: productosResult.rows,
                ventas_por_veterinario: veterinariosResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo reportes de ventas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Análisis de compras y proveedores
 */
export const getPurchaseReports = async (req, res) => {
    try {
        // Solo admins pueden ver reportes de compras
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver reportes de compras'
            });
        }

        const {
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0],
            id_proveedor
        } = req.query;

        let whereConditions = ['oc.fecha_orden >= $1', 'oc.fecha_orden <= $2'];
        let queryParams = [fecha_inicio, fecha_fin];
        let paramCount = 2;

        if (id_proveedor) {
            paramCount++;
            whereConditions.push(`oc.id_proveedor = $${paramCount}`);
            queryParams.push(id_proveedor);
        }

        // Resumen de compras por proveedor
        const proveedoresQuery = `
            SELECT 
                p.nombre as proveedor,
                p.telefono,
                p.email,
                COUNT(oc.id_orden) as total_ordenes,
                SUM(oc.total) as total_compras,
                AVG(oc.total) as promedio_orden,
                COUNT(CASE WHEN oc.estado = 'completada' THEN 1 END) as ordenes_completadas,
                COUNT(CASE WHEN oc.estado = 'pendiente' THEN 1 END) as ordenes_pendientes,
                MAX(oc.fecha_orden) as ultima_compra
            FROM financial.ordenes_compra oc
            INNER JOIN financial.proveedores p ON oc.id_proveedor = p.id_proveedor
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY p.id_proveedor, p.nombre, p.telefono, p.email
            ORDER BY total_compras DESC
        `;

        // Productos más comprados
        const productosQuery = `
            SELECT 
                pr.nombre as producto,
                pr.codigo,
                SUM(loc.cantidad) as cantidad_comprada,
                SUM(loc.cantidad * loc.precio_unitario) as total_invertido,
                COUNT(DISTINCT oc.id_proveedor) as proveedores_diferentes,
                AVG(loc.precio_unitario) as precio_promedio
            FROM financial.lineas_orden_compra loc
            INNER JOIN financial.ordenes_compra oc ON loc.id_orden = oc.id_orden
            INNER JOIN financial.productos pr ON loc.id_producto = pr.id_producto
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY pr.id_producto, pr.nombre, pr.codigo
            ORDER BY cantidad_comprada DESC
            LIMIT 10
        `;

        // Análisis temporal de compras
        const temporalQuery = `
            SELECT 
                DATE_TRUNC('month', oc.fecha_orden) as mes,
                TO_CHAR(DATE_TRUNC('month', oc.fecha_orden), 'YYYY-MM') as mes_texto,
                COUNT(*) as total_ordenes,
                SUM(oc.total) as total_compras,
                COUNT(DISTINCT oc.id_proveedor) as proveedores_activos
            FROM financial.ordenes_compra oc
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY DATE_TRUNC('month', oc.fecha_orden)
            ORDER BY mes ASC
        `;

        // Órdenes pendientes críticas
        const pendientesQuery = `
            SELECT 
                oc.codigo_orden,
                p.nombre as proveedor,
                oc.fecha_orden,
                oc.total,
                oc.estado,
                oc.fecha_entrega_esperada,
                CASE 
                    WHEN oc.fecha_entrega_esperada < CURRENT_DATE THEN true 
                    ELSE false 
                END as vencida
            FROM financial.ordenes_compra oc
            INNER JOIN financial.proveedores p ON oc.id_proveedor = p.id_proveedor
            WHERE oc.estado IN ('pendiente', 'parcial')
            ORDER BY oc.fecha_entrega_esperada ASC
            LIMIT 20
        `;

        const [proveedoresResult, productosResult, temporalResult, pendientesResult] = await Promise.all([
            query(proveedoresQuery, queryParams),
            query(productosQuery, queryParams),
            query(temporalQuery, queryParams),
            query(pendientesQuery)
        ]);

        // Calcular totales
        const totales = proveedoresResult.rows.reduce((acc, row) => ({
            total_ordenes: acc.total_ordenes + parseInt(row.total_ordenes),
            total_compras: acc.total_compras + parseFloat(row.total_compras),
            proveedores_activos: acc.proveedores_activos + 1
        }), { total_ordenes: 0, total_compras: 0, proveedores_activos: 0 });

        res.json({
            success: true,
            data: {
                periodo: {
                    fecha_inicio,
                    fecha_fin
                },
                totales,
                compras_por_proveedor: proveedoresResult.rows,
                productos_mas_comprados: productosResult.rows,
                evolucion_temporal: temporalResult.rows,
                ordenes_pendientes: pendientesResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo reportes de compras:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reportes de inventario y stock
 */
export const getInventoryReports = async (req, res) => {
    try {
        // Solo admins pueden ver reportes de inventario
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver reportes de inventario'
            });
        }

        const { categoria, critico_only = false } = req.query;

        let whereConditions = ['p.activo = true'];
        let queryParams = [];
        let paramCount = 0;

        if (categoria) {
            paramCount++;
            whereConditions.push(`p.categoria = $${paramCount}`);
            queryParams.push(categoria);
        }

        if (critico_only === 'true') {
            whereConditions.push('p.stock_actual <= p.stock_minimo');
        }

        // Resumen de inventario
        const resumenQuery = `
            SELECT 
                COUNT(*) as total_productos,
                COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as productos_criticos,
                COUNT(CASE WHEN stock_actual = 0 THEN 1 END) as productos_agotados,
                COALESCE(SUM(stock_actual * precio_venta), 0) as valor_inventario,
                COALESCE(SUM(stock_actual * precio_compra), 0) as costo_inventario,
                COUNT(DISTINCT categoria) as categorias_activas
            FROM financial.productos p
            WHERE ${whereConditions.join(' AND ')}
        `;

        // Productos con stock crítico
        const criticosQuery = `
            WITH ventas_promedio AS (
                SELECT 
                    lf.id_producto,
                    AVG(lf.cantidad) as promedio_venta_mensual
                FROM financial.lineas_factura lf
                INNER JOIN financial.facturas_venta f ON lf.id_factura = f.id_factura
                WHERE f.fecha >= CURRENT_DATE - INTERVAL '3 months'
                GROUP BY lf.id_producto
            )
            SELECT 
                p.nombre,
                p.codigo,
                p.categoria,
                p.stock_actual,
                p.stock_minimo,
                p.precio_venta,
                vm.promedio_venta_mensual,
                CASE 
                    WHEN vm.promedio_venta_mensual > 0 
                    THEN ROUND(p.stock_actual / vm.promedio_venta_mensual, 1)
                    ELSE NULL 
                END as meses_stock_restante
            FROM financial.productos p
            LEFT JOIN ventas_promedio vm ON p.id_producto = vm.id_producto
            WHERE ${whereConditions.join(' AND ')}
            AND p.stock_actual <= p.stock_minimo
            ORDER BY meses_stock_restante ASC NULLS LAST
        `;

        // Productos más vendidos vs stock actual
        const rotacionQuery = `
            SELECT 
                p.nombre,
                p.codigo,
                p.stock_actual,
                COALESCE(SUM(lf.cantidad), 0) as cantidad_vendida_mes,
                COALESCE(p.stock_actual * p.precio_venta, 0) as valor_stock,
                CASE 
                    WHEN p.stock_actual > 0 AND SUM(lf.cantidad) > 0
                    THEN ROUND(p.stock_actual / SUM(lf.cantidad), 2)
                    ELSE NULL
                END as rotacion_mensual
            FROM financial.productos p
            LEFT JOIN financial.lineas_factura lf ON p.id_producto = lf.id_producto
            LEFT JOIN financial.facturas_venta f ON lf.id_factura = f.id_factura 
                AND f.fecha >= DATE_TRUNC('month', CURRENT_DATE)
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY p.id_producto, p.nombre, p.codigo, p.stock_actual, p.precio_venta
            ORDER BY cantidad_vendida_mes DESC
            LIMIT 20
        `;

        const [resumenResult, criticosResult, rotacionResult] = await Promise.all([
            query(resumenQuery, queryParams),
            query(criticosQuery, queryParams), 
            query(rotacionQuery, queryParams)
        ]);

        res.json({
            success: true,
            data: {
                resumen: resumenResult.rows[0],
                productos_criticos: criticosResult.rows,
                analisis_rotacion: rotacionResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo reportes de inventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Estadísticas de pacientes y citas
 */
export const getPatientStats = async (req, res) => {
    try {
        // Solo admins, veterinarios y auxiliares pueden ver estadísticas de pacientes
        if (!['admin', 'vet', 'aux_admin', 'aux_vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver estadísticas de pacientes'
            });
        }

        const {
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0],
            id_veterinario
        } = req.query;

        let whereConditions = ['c.fecha >= $1', 'c.fecha <= $2'];
        let queryParams = [fecha_inicio, fecha_fin];
        let paramCount = 2;

        if (id_veterinario) {
            paramCount++;
            whereConditions.push(`c.id_veterinario = $${paramCount}`);
            queryParams.push(id_veterinario);
        }

        // Estadísticas generales de pacientes
        const generalQuery = `
            SELECT 
                COUNT(DISTINCT c.id_mascota) as mascotas_atendidas,
                COUNT(DISTINCT m.id_cliente) as clientes_atendidos,
                COUNT(c.id_consulta) as total_consultas,
                AVG(c.costo) as costo_promedio_consulta,
                COUNT(DISTINCT c.id_veterinario) as veterinarios_activos
            FROM clinical.consultas_clinicas c
            INNER JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            WHERE ${whereConditions.join(' AND ')}
        `;

        // Patologías más frecuentes
        const patologiasQuery = `
            SELECT 
                c.diagnostico,
                COUNT(*) as frecuencia,
                COUNT(DISTINCT c.id_mascota) as mascotas_afectadas,
                AVG(c.costo) as costo_promedio_tratamiento
            FROM clinical.consultas_clinicas c
            WHERE ${whereConditions.join(' AND ')}
            AND c.diagnostico IS NOT NULL 
            AND c.diagnostico != ''
            GROUP BY c.diagnostico
            ORDER BY frecuencia DESC
            LIMIT 10
        `;

        // Distribución por especies
        const especiesQuery = `
            SELECT 
                m.especie,
                COUNT(DISTINCT c.id_mascota) as mascotas_atendidas,
                COUNT(c.id_consulta) as total_consultas,
                AVG(c.costo) as costo_promedio
            FROM clinical.consultas_clinicas c
            INNER JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY m.especie
            ORDER BY mascotas_atendidas DESC
        `;

        // Análisis de citas
        const citasQuery = `
            SELECT 
                cit.tipo,
                COUNT(*) as total_citas,
                COUNT(CASE WHEN cit.estado = 'Completada' THEN 1 END) as completadas,
                COUNT(CASE WHEN cit.estado = 'Cancelada' THEN 1 END) as canceladas,
                COUNT(CASE WHEN cit.estado = 'No Asistió' THEN 1 END) as no_asistio,
                ROUND(AVG(EXTRACT(epoch FROM (cit.fecha_fin - cit.fecha_inicio))/60), 2) as duracion_promedio_minutos
            FROM clinical.calendario_citas cit
            WHERE cit.fecha_inicio >= $1 AND cit.fecha_inicio <= $2
            ${id_veterinario ? `AND cit.id_veterinario = $${paramCount}` : ''}
            GROUP BY cit.tipo
            ORDER BY total_citas DESC
        `;

        // Próximos controles y vacunas
        const proximosQuery = `
            SELECT 'Control Médico' as tipo_recordatorio,
                   cl.nombre as cliente,
                   m.nombre as mascota,
                   'Control médico' as detalle,
                   c.proxima_cita as fecha_programada
            FROM clinical.consultas_clinicas c
            INNER JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            INNER JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            WHERE c.proxima_cita BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            
            UNION ALL
            
            SELECT 'Vacuna' as tipo_recordatorio,
                   cl.nombre as cliente,
                   m.nombre as mascota,
                   v.nombre as detalle,
                   v.proxima_dosis as fecha_programada
            FROM clinical.vacunas_tratamientos v
            INNER JOIN clinical.mascotas m ON v.id_mascota = m.id_mascota
            INNER JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            WHERE v.proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            
            ORDER BY fecha_programada ASC
            LIMIT 20
        `;

        const [generalResult, patologiasResult, especiesResult, citasResult, proximosResult] = await Promise.all([
            query(generalQuery, queryParams),
            query(patologiasQuery, queryParams),
            query(especiesQuery, queryParams),
            query(citasQuery, queryParams.slice(0, id_veterinario ? 3 : 2)),
            query(proximosQuery)
        ]);

        res.json({
            success: true,
            data: {
                periodo: {
                    fecha_inicio,
                    fecha_fin
                },
                estadisticas_generales: generalResult.rows[0],
                patologias_frecuentes: patologiasResult.rows,
                distribucion_especies: especiesResult.rows,
                analisis_citas: citasResult.rows,
                proximos_recordatorios: proximosResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de pacientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Análisis de rentabilidad
 */
export const getProfitabilityAnalysis = async (req, res) => {
    try {
        // Solo admins pueden ver análisis de rentabilidad
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden ver análisis de rentabilidad'
            });
        }

        const {
            fecha_inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin = new Date().toISOString().split('T')[0]
        } = req.query;

        // Rentabilidad por producto
        const productosQuery = `
            SELECT 
                p.nombre,
                p.codigo,
                p.precio_compra,
                p.precio_venta,
                (p.precio_venta - p.precio_compra) as margen_unitario,
                CASE 
                    WHEN p.precio_compra > 0 
                    THEN ROUND(((p.precio_venta - p.precio_compra) / p.precio_compra * 100), 2)
                    ELSE NULL 
                END as porcentaje_margen,
                COALESCE(SUM(lf.cantidad), 0) as cantidad_vendida,
                COALESCE(SUM(lf.cantidad * p.precio_compra), 0) as costo_total,
                COALESCE(SUM(lf.cantidad * lf.precio_unitario), 0) as ingresos_totales,
                COALESCE(SUM(lf.cantidad * (lf.precio_unitario - p.precio_compra)), 0) as ganancia_total
            FROM financial.productos p
            LEFT JOIN financial.lineas_factura lf ON p.id_producto = lf.id_producto
            LEFT JOIN financial.facturas_venta f ON lf.id_factura = f.id_factura 
                AND f.fecha >= $1 AND f.fecha <= $2 AND f.estado = 'Pagada'
            WHERE p.precio_compra IS NOT NULL
            GROUP BY p.id_producto, p.nombre, p.codigo, p.precio_compra, p.precio_venta
            ORDER BY ganancia_total DESC
            LIMIT 20
        `;

        // Rentabilidad por veterinario
        const veterinariosQuery = `
            SELECT 
                u.nombre as veterinario,
                COUNT(f.id_factura) as consultas_realizadas,
                COALESCE(SUM(f.total), 0) as ingresos_generados,
                COALESCE(AVG(f.total), 0) as ticket_promedio,
                COUNT(c.id_consulta) as total_consultas,
                COALESCE(AVG(c.costo), 0) as costo_promedio_consulta
            FROM vetplus_auth.usuarios u
            LEFT JOIN financial.facturas_venta f ON u.id_usuario = f.created_by 
                AND f.fecha >= $1 AND f.fecha <= $2 AND f.estado = 'Pagada'
            LEFT JOIN clinical.consultas_clinicas c ON u.id_usuario = c.id_veterinario
                AND c.fecha >= $1 AND c.fecha <= $2
            WHERE u.rol = 'vet' AND u.activo = true
            GROUP BY u.id_usuario, u.nombre
            ORDER BY ingresos_generados DESC
        `;

        // Análisis de costos operativos
        const costosQuery = `
            SELECT 
                ce.nombre as categoria,
                COALESCE(SUM(e.monto), 0) as total_gastos,
                COUNT(e.id_egreso) as cantidad_movimientos,
                COALESCE(AVG(e.monto), 0) as gasto_promedio
            FROM financial.categorias_egresos ce
            INNER JOIN financial.conceptos_egresos co ON ce.id_categoria = co.id_categoria
            INNER JOIN financial.egresos e ON co.id_concepto = e.id_concepto_egreso
            WHERE e.fecha >= $1 AND e.fecha <= $2
            GROUP BY ce.id_categoria, ce.nombre
            ORDER BY total_gastos DESC
        `;

        // Resumen financiero
        const resumenQuery = `
            WITH ingresos AS (
                SELECT COALESCE(SUM(total), 0) as total_ingresos
                FROM financial.facturas_venta
                WHERE fecha >= $1 AND fecha <= $2 AND estado = 'Pagada'
            ),
            egresos AS (
                SELECT COALESCE(SUM(monto), 0) as total_egresos
                FROM financial.egresos
                WHERE fecha >= $1 AND fecha <= $2
            )
            SELECT 
                i.total_ingresos,
                e.total_egresos,
                (i.total_ingresos - e.total_egresos) as utilidad_neta,
                CASE 
                    WHEN i.total_ingresos > 0 
                    THEN ROUND(((i.total_ingresos - e.total_egresos) / i.total_ingresos * 100), 2)
                    ELSE 0 
                END as margen_neto
            FROM ingresos i, egresos e
        `;

        const [productosResult, veterinariosResult, costosResult, resumenResult] = await Promise.all([
            query(productosQuery, [fecha_inicio, fecha_fin]),
            query(veterinariosQuery, [fecha_inicio, fecha_fin]),
            query(costosQuery, [fecha_inicio, fecha_fin]),
            query(resumenQuery, [fecha_inicio, fecha_fin])
        ]);

        res.json({
            success: true,
            data: {
                periodo: {
                    fecha_inicio,
                    fecha_fin
                },
                resumen_financiero: resumenResult.rows[0],
                rentabilidad_productos: productosResult.rows,
                rendimiento_veterinarios: veterinariosResult.rows,
                costos_operativos: costosResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo análisis de rentabilidad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Sistema de alertas y KPIs
 */
export const getAlertsAndKPIs = async (req, res) => {
    try {
        // Solo admins, veterinarios y auxiliares pueden ver alertas
        if (!['admin', 'vet', 'aux_admin', 'aux_vet'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver alertas y KPIs'
            });
        }

        const kpisQuery = `
            WITH kpis AS (
                SELECT 
                    -- Ingresos del mes
                    (SELECT COALESCE(SUM(total), 0) FROM financial.facturas_venta 
                     WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE) AND estado = 'Pagada') as ingresos_mes,
                    
                    -- Consultas del mes
                    (SELECT COUNT(*) FROM clinical.consultas_clinicas 
                     WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)) as consultas_mes,
                    
                    -- Nuevos clientes del mes
                    (SELECT COUNT(*) FROM clinical.clientes 
                     WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as nuevos_clientes_mes,
                    
                    -- Terapias activas
                    (SELECT COUNT(*) FROM financial.control_terapias 
                     WHERE activo = true AND sesiones_restantes > 0) as terapias_activas,
                    
                    -- Productos en stock crítico
                    (SELECT COUNT(*) FROM financial.productos 
                     WHERE stock_actual <= stock_minimo AND inventariable = true) as productos_criticos,
                    
                    -- Citas pendientes hoy
                    (SELECT COUNT(*) FROM clinical.calendario_citas 
                     WHERE DATE(fecha_inicio) = CURRENT_DATE AND estado = 'Pendiente') as citas_hoy,
                    
                    -- Facturas pendientes de pago
                    (SELECT COUNT(*) FROM financial.facturas_venta 
                     WHERE estado = 'pendiente') as facturas_pendientes
            )
            SELECT * FROM kpis
        `;

        const alertasQuery = `
            -- Próximas vacunas (próximos 7 días)
            SELECT 'Vacuna Pendiente' as tipo_alerta,
                   'warning' as nivel,
                   c.nombre as cliente,
                   m.nombre as mascota,
                   v.nombre as detalle,
                   v.proxima_dosis as fecha_limite,
                   EXTRACT(days FROM (v.proxima_dosis - CURRENT_DATE)) as dias_restantes
            FROM clinical.vacunas_tratamientos v
            INNER JOIN clinical.mascotas m ON v.id_mascota = m.id_mascota
            INNER JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE v.proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            
            UNION ALL
            
            -- Controles médicos pendientes
            SELECT 'Control Médico' as tipo_alerta,
                   'info' as nivel,
                   c.nombre as cliente,
                   m.nombre as mascota,
                   'Control médico programado' as detalle,
                   cc.proxima_cita as fecha_limite,
                   EXTRACT(days FROM (cc.proxima_cita - CURRENT_DATE)) as dias_restantes
            FROM clinical.consultas_clinicas cc
            INNER JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
            INNER JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
            WHERE cc.proxima_cita BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            
            UNION ALL
            
            -- Stock crítico
            SELECT 'Stock Crítico' as tipo_alerta,
                   'error' as nivel,
                   'Sistema' as cliente,
                   p.nombre as mascota,
                   CONCAT('Stock actual: ', p.stock_actual, ' | Mínimo: ', p.stock_minimo) as detalle,
                   CURRENT_DATE as fecha_limite,
                   0 as dias_restantes
            FROM financial.productos p
            WHERE p.stock_actual <= p.stock_minimo AND p.inventariable = true
            
            ORDER BY nivel DESC, fecha_limite ASC
        `;

        const [kpisResult, alertasResult] = await Promise.all([
            query(kpisQuery),
            query(alertasQuery)
        ]);

        res.json({
            success: true,
            data: {
                kpis: kpisResult.rows[0],
                alertas: alertasResult.rows,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error obteniendo alertas y KPIs:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};