import { query, getClient } from '../config/database.js';
import { logActivity } from '../utils/activityLog.js';
import { syncAppointmentWithGoogle, getAppointmentWithDetails } from './appointmentController.js';

/**
 * Unificación de pacientes duplicados (ej. "Lulu" y "Lulú").
 * - El paciente PRINCIPAL se conserva; el SECUNDARIO se elimina al final.
 * - Citas, series e historias del secundario pasan al principal.
 * - Las sesiones de Terapia/Hidroterapia del principal se renumeran por fecha.
 * - Un propietario que quede sin mascotas se elimina; sus consentimientos y envíos
 *   de documentos pasan al propietario que queda.
 * - Todo queda registrado en clinical.unificaciones_pacientes (con copia de lo eliminado).
 * Solo admin y vet (ver routes/unificacionPacientes.js).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Campos de la mascota que se pueden tomar del secundario.
const CAMPOS_ELEGIBLES = [
    'nombre', 'especie', 'raza', 'sexo', 'edad', 'peso', 'color',
    'fecha_nacimiento', 'esterilizado', 'microchip', 'foto_url'
];

const getTenantId = (req) => req.tenantId ?? req.user?.tenant_id;

const tablaFaltante = (error) => error?.code === '42P01'
    && String(error?.message || '').includes('unificaciones_pacientes');

/** Datos de un paciente para comparar: ficha, propietario y conteos. */
const cargarPaciente = async (db, tenantId, idMascota) => {
    const base = await db.query(`
        SELECT m.*,
               TO_CHAR(m.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento_txt,
               c.nombre AS propietario_nombre, c.cedula AS propietario_cedula,
               c.telefono AS propietario_telefono, c.email AS propietario_email
        FROM clinical.mascotas m
        JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
        WHERE m.id_mascota = $1 AND m.id_tenant = $2
    `, [idMascota, tenantId]);
    if (base.rows.length === 0) return null;
    const m = base.rows[0];

    const [citas, historias, series, propietario] = await Promise.all([
        db.query(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE google_event_id IS NOT NULL)::int AS en_google,
                   COUNT(*) FILTER (WHERE estado = 'confirmada' AND fecha_inicio >= NOW())::int AS futuras,
                   TO_CHAR(MIN(fecha_inicio), 'YYYY-MM-DD') AS primera,
                   TO_CHAR(MAX(fecha_inicio) FILTER (WHERE fecha_inicio < NOW()), 'YYYY-MM-DD') AS ultima_pasada
            FROM clinical.calendario_citas WHERE id_mascota = $1 AND id_tenant = $2
        `, [idMascota, tenantId]),
        db.query(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE tipo_documento = 'seguimiento' AND estado <> 'Cancelado')::int AS sesiones
            FROM clinical.historias_clinicas
            WHERE id_mascota = $1 AND id_tenant = $2
        `, [idMascota, tenantId]),
        db.query(`SELECT COUNT(*)::int AS total FROM clinical.calendario_series WHERE id_mascota = $1 AND id_tenant = $2`,
            [idMascota, tenantId]),
        db.query(`
            SELECT
              (SELECT COUNT(*)::int FROM clinical.mascotas WHERE id_cliente = $1 AND id_tenant = $2) AS mascotas,
              (SELECT COUNT(*)::int FROM clinical.consentimientos WHERE id_cliente = $1) AS consentimientos,
              (SELECT COUNT(*)::int FROM clinical.envios_documentos WHERE id_cliente = $1) AS envios
        `, [m.id_cliente, tenantId])
    ]);

    const porTipo = await db.query(`
        SELECT tipo_documento, COUNT(*)::int AS n FROM clinical.historias_clinicas
        WHERE id_mascota = $1 AND id_tenant = $2 GROUP BY 1
    `, [idMascota, tenantId]);

    return {
        id_mascota: m.id_mascota,
        id_cliente: m.id_cliente,
        ficha: {
            nombre: m.nombre, especie: m.especie, raza: m.raza, sexo: m.sexo, edad: m.edad,
            peso: m.peso, color: m.color, fecha_nacimiento: m.fecha_nacimiento_txt,
            esterilizado: m.esterilizado, microchip: m.microchip, foto_url: m.foto_url,
            activo: m.activo
        },
        propietario: {
            id_cliente: m.id_cliente,
            nombre: m.propietario_nombre,
            cedula: m.propietario_cedula,
            telefono: m.propietario_telefono,
            email: m.propietario_email,
            total_mascotas: propietario.rows[0].mascotas,
            consentimientos: propietario.rows[0].consentimientos,
            envios: propietario.rows[0].envios
        },
        conteos: {
            citas: citas.rows[0].total,
            citas_en_google: citas.rows[0].en_google,
            citas_futuras: citas.rows[0].futuras,
            primera_cita: citas.rows[0].primera,
            ultima_cita_pasada: citas.rows[0].ultima_pasada,
            historias: historias.rows[0].total,
            sesiones_terapia: historias.rows[0].sesiones,
            historias_por_tipo: Object.fromEntries(porTipo.rows.map(r => [r.tipo_documento, r.n])),
            series: series.rows[0].total
        }
    };
};

/** Qué pasará con los propietarios según cuál se conserve. */
const calcularPropietarios = (principal, secundario, propietarioDe) => {
    const idFinal = propietarioDe === 'secundario' ? secundario.id_cliente : principal.id_cliente;
    const candidatos = [...new Set([principal.id_cliente, secundario.id_cliente])].filter(id => id !== idFinal);

    const eliminar = candidatos.map(id => {
        const prop = id === principal.id_cliente ? principal.propietario : secundario.propietario;
        // Mascotas que le quedarán: se va el secundario si era suyo, y el principal si cambia de dueño.
        const restantes = prop.total_mascotas
            - (secundario.id_cliente === id ? 1 : 0)
            - (principal.id_cliente === id ? 1 : 0);
        return { ...prop, mascotas_restantes: restantes };
    }).filter(p => p.mascotas_restantes <= 0);

    return { idFinal, eliminar };
};

const construirEfectos = (principal, secundario, opciones) => {
    const nombreFinal = opciones.campos?.nombre === 'secundario' ? secundario.ficha.nombre : principal.ficha.nombre;
    const { idFinal, eliminar } = calcularPropietarios(principal, secundario, opciones.propietario);
    const propietarioFinal = idFinal === principal.id_cliente ? principal.propietario : secundario.propietario;

    const retitularGoogle =
        (nombreFinal !== secundario.ficha.nombre ? secundario.conteos.citas_en_google : 0) +
        (nombreFinal !== principal.ficha.nombre ? principal.conteos.citas_en_google : 0);

    return {
        nombre_final: nombreFinal,
        propietario_final: { id_cliente: propietarioFinal.id_cliente, nombre: propietarioFinal.nombre },
        citas_a_mover: secundario.conteos.citas,
        historias_a_mover: secundario.conteos.historias,
        series_a_mover: secundario.conteos.series,
        sesiones_a_renumerar: principal.conteos.sesiones_terapia + secundario.conteos.sesiones_terapia,
        propietarios_a_eliminar: eliminar.map(p => ({
            id_cliente: p.id_cliente, nombre: p.nombre,
            consentimientos_a_mover: p.consentimientos, envios_a_mover: p.envios
        })),
        eventos_google_a_retitular: retitularGoogle
    };
};

const validarIds = (body) => {
    const { id_principal, id_secundario } = body || {};
    if (!UUID_RE.test(String(id_principal || '')) || !UUID_RE.test(String(id_secundario || ''))) {
        return 'Elige los dos pacientes';
    }
    if (id_principal === id_secundario) return 'Elige dos pacientes distintos';
    return null;
};

const normalizarOpciones = (body) => {
    const campos = {};
    for (const campo of CAMPOS_ELEGIBLES) {
        campos[campo] = body?.campos?.[campo] === 'secundario' ? 'secundario' : 'principal';
    }
    return { campos, propietario: body?.propietario === 'secundario' ? 'secundario' : 'principal' };
};

/**
 * POST /unificaciones/preview
 * Body: { id_principal, id_secundario, propietario?: 'principal'|'secundario', campos?: {campo: 'principal'|'secundario'} }
 */
export const previewUnificacion = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const errorIds = validarIds(req.body);
        if (errorIds) return res.status(400).json({ success: false, message: errorIds });

        const db = { query };
        const [principal, secundario] = await Promise.all([
            cargarPaciente(db, tenantId, req.body.id_principal),
            cargarPaciente(db, tenantId, req.body.id_secundario)
        ]);
        if (!principal || !secundario) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }

        const opciones = normalizarOpciones(req.body);
        res.json({
            success: true,
            data: { principal, secundario, campos_elegibles: CAMPOS_ELEGIBLES, efectos: construirEfectos(principal, secundario, opciones) }
        });
    } catch (error) {
        console.error('Error en vista previa de unificación:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

/** Reescribe en Google el título (nombre de la mascota) de las citas del paciente final. */
const retitularEnGoogle = async (idsCitas, tenantId, idUnificacion) => {
    let ok = 0;
    let failed = 0;
    for (const id of idsCitas) {
        try {
            const cita = await getAppointmentWithDetails(id, tenantId);
            if (!cita?.google_event_id || cita.estado === 'cancelada') continue;
            const result = await syncAppointmentWithGoogle(cita, 'update', 'unificacion', { sendUpdates: 'none' });
            if (result?.success) ok++; else failed++;
        } catch (error) {
            failed++;
            console.warn(`⚠️ Unificación ${idUnificacion}: no se pudo actualizar en Google la cita ${id}:`, error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    console.log(`✅ Unificación ${idUnificacion}: Google actualizados ${ok}, fallidos ${failed}`);
};

/**
 * POST /unificaciones
 * Body: { id_principal, id_secundario, propietario, campos, motivo }
 */
export const ejecutarUnificacion = async (req, res) => {
    let tx = null;
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id ?? req.user?.id_usuario ?? null;
        const errorIds = validarIds(req.body);
        if (errorIds) return res.status(400).json({ success: false, message: errorIds });

        const motivo = String(req.body?.motivo || '').trim();
        if (motivo.length < 5) {
            return res.status(400).json({ success: false, message: 'El motivo es obligatorio (mínimo 5 caracteres)' });
        }
        const { id_principal: idA, id_secundario: idB } = req.body;
        const opciones = normalizarOpciones(req.body);

        tx = await getClient();
        await tx.query('BEGIN');

        // Bloquear ambos pacientes para que nadie los modifique durante la unificación.
        const lock = await tx.query(
            `SELECT * FROM clinical.mascotas WHERE id_tenant = $1 AND id_mascota = ANY($2::uuid[]) FOR UPDATE`,
            [tenantId, [idA, idB]]
        );
        if (lock.rows.length !== 2) {
            await tx.query('ROLLBACK');
            tx.release(); tx = null;
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }
        const filaA = lock.rows.find(r => r.id_mascota === idA);
        const filaB = lock.rows.find(r => r.id_mascota === idB);

        const principal = await cargarPaciente(tx, tenantId, idA);
        const secundario = await cargarPaciente(tx, tenantId, idB);
        const efectos = construirEfectos(principal, secundario, opciones);

        // 1) Ficha del paciente final: campos elegidos del secundario + propietario.
        const sets = [];
        const vals = [];
        for (const campo of CAMPOS_ELEGIBLES) {
            if (opciones.campos[campo] === 'secundario') {
                vals.push(filaB[campo]);
                sets.push(`${campo} = $${vals.length}`);
            }
        }
        vals.push(efectos.propietario_final.id_cliente);
        sets.push(`id_cliente = $${vals.length}`);
        const notaUnificacion = `[Unificado con "${filaB.nombre}" el ${new Date().toISOString().slice(0, 10)}]`
            + (filaB.notas ? ` ${filaB.notas}` : '');
        vals.push(notaUnificacion);
        sets.push(`notas = CASE WHEN notas IS NULL OR notas = '' THEN $${vals.length} ELSE notas || E'\\n' || $${vals.length} END`);
        vals.push(idA, tenantId);
        await tx.query(
            `UPDATE clinical.mascotas SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id_mascota = $${vals.length - 1} AND id_tenant = $${vals.length}`,
            vals
        );

        // 2) Mover citas, series e historias del secundario al principal.
        const citasMovidas = await tx.query(
            `UPDATE clinical.calendario_citas SET id_mascota = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id_mascota = $2 AND id_tenant = $3 RETURNING id_cita`, [idA, idB, tenantId]);
        const seriesMovidas = await tx.query(
            `UPDATE clinical.calendario_series SET id_mascota = $1
             WHERE id_mascota = $2 AND id_tenant = $3 RETURNING id_serie`, [idA, idB, tenantId]);
        const historiasMovidas = await tx.query(
            `UPDATE clinical.historias_clinicas SET id_mascota = $1, updated_at = NOW()
             WHERE id_mascota = $2 AND id_tenant = $3 RETURNING id_historia`, [idA, idB, tenantId]);

        // 3) Renumerar por fecha las sesiones de Terapia/Hidroterapia activas del paciente final.
        const renumeracion = await tx.query(`
            WITH ord AS (
                SELECT s.id_historia, s.numero_sesion AS antes,
                       ROW_NUMBER() OVER (ORDER BY h.fecha ASC, h.created_at ASC, h.id_historia) AS despues
                FROM clinical.historias_clinicas h
                JOIN clinical.historia_seguimiento s ON s.id_historia = h.id_historia
                WHERE h.id_mascota = $1 AND h.id_tenant = $2 AND h.estado <> 'Cancelado'
            )
            UPDATE clinical.historia_seguimiento s
            SET numero_sesion = ord.despues
            FROM ord
            WHERE s.id_historia = ord.id_historia AND s.numero_sesion IS DISTINCT FROM ord.despues
            RETURNING s.id_historia, ord.antes, ord.despues
        `, [idA, tenantId]);

        // 4) Eliminar el paciente secundario (ya no tiene nada asociado).
        await tx.query(`DELETE FROM clinical.mascotas WHERE id_mascota = $1 AND id_tenant = $2`, [idB, tenantId]);

        // 5) Propietarios que quedaron sin mascotas: mover sus documentos y eliminarlos.
        const propietariosEliminados = [];
        const idFinal = efectos.propietario_final.id_cliente;
        const candidatos = [...new Set([filaA.id_cliente, filaB.id_cliente])].filter(id => id !== idFinal);
        for (const idCliente of candidatos) {
            const quedan = await tx.query(
                `SELECT COUNT(*)::int AS n FROM clinical.mascotas WHERE id_cliente = $1 AND id_tenant = $2`,
                [idCliente, tenantId]);
            if (quedan.rows[0].n > 0) continue;

            const filaCliente = await tx.query(
                `SELECT * FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2`, [idCliente, tenantId]);
            const consentimientos = await tx.query(
                `UPDATE clinical.consentimientos SET id_cliente = $1 WHERE id_cliente = $2 RETURNING id_consentimiento`,
                [idFinal, idCliente]);
            const envios = await tx.query(
                `UPDATE clinical.envios_documentos SET id_cliente = $1 WHERE id_cliente = $2 RETURNING id_envio`,
                [idFinal, idCliente]);
            await tx.query(`DELETE FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2`, [idCliente, tenantId]);

            propietariosEliminados.push({
                fila: filaCliente.rows[0] || null,
                consentimientos_movidos: consentimientos.rows.map(r => r.id_consentimiento),
                envios_movidos: envios.rows.map(r => r.id_envio)
            });
        }

        // 6) Historial (con copia de lo eliminado para poder reconstruirlo si hiciera falta).
        const resumen = {
            citas_movidas: citasMovidas.rowCount,
            series_movidas: seriesMovidas.rowCount,
            historias_movidas: historiasMovidas.rowCount,
            sesiones_renumeradas: renumeracion.rowCount,
            propietarios_eliminados: propietariosEliminados.length,
            nombre_final: efectos.nombre_final,
            propietario_final: efectos.propietario_final.nombre
        };
        const detalle = {
            opciones,
            mascota_principal_antes: filaA,
            mascota_eliminada: filaB,
            citas_movidas: citasMovidas.rows.map(r => r.id_cita),
            series_movidas: seriesMovidas.rows.map(r => r.id_serie),
            historias_movidas: historiasMovidas.rows.map(r => r.id_historia),
            renumeracion: renumeracion.rows,
            propietarios_eliminados: propietariosEliminados
        };
        const registro = await tx.query(`
            INSERT INTO clinical.unificaciones_pacientes
                (id_tenant, id_mascota_principal, id_mascota_eliminada, nombre_principal, nombre_eliminada,
                 motivo, resumen, detalle, id_usuario)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
            RETURNING id_unificacion, created_at
        `, [tenantId, idA, idB, efectos.nombre_final, filaB.nombre, motivo,
            JSON.stringify(resumen), JSON.stringify(detalle), userId]);

        await tx.query('COMMIT');
        tx.release();
        tx = null;

        const idUnificacion = registro.rows[0].id_unificacion;

        await logActivity({
            req,
            type: 'PET_MANAGEMENT',
            description: `Paciente "${filaB.nombre}" unificado en "${efectos.nombre_final}" `
                + `(${resumen.citas_movidas} citas y ${resumen.historias_movidas} historias movidas)`,
            entityId: idA,
            payload: { accion: 'unificacion_pacientes', id_unificacion: idUnificacion, motivo, resumen }
        });

        // Títulos en Google: si el evento conserva un nombre distinto, la sincronización
        // entrante podría volver a separar la cita o recrear el paciente eliminado.
        const idsGoogle = [];
        if (efectos.nombre_final !== filaB.nombre) idsGoogle.push(...citasMovidas.rows.map(r => r.id_cita));
        if (efectos.nombre_final !== filaA.nombre) {
            const propias = await query(
                `SELECT id_cita FROM clinical.calendario_citas
                 WHERE id_mascota = $1 AND id_tenant = $2 AND google_event_id IS NOT NULL
                   AND id_cita <> ALL($3::uuid[])`,
                [idA, tenantId, citasMovidas.rows.map(r => r.id_cita)]);
            idsGoogle.push(...propias.rows.map(r => r.id_cita));
        }
        if (idsGoogle.length > 0) {
            retitularEnGoogle(idsGoogle, tenantId, idUnificacion)
                .catch(err => console.error(`Unificación ${idUnificacion}: error actualizando Google:`, err));
        }

        res.json({
            success: true,
            message: `"${filaB.nombre}" quedó unificado en "${efectos.nombre_final}"`,
            data: { id_unificacion: idUnificacion, id_mascota: idA, resumen, google_en_proceso: idsGoogle.length }
        });
    } catch (error) {
        if (tx) {
            try { await tx.query('ROLLBACK'); } catch {}
            tx.release();
        }
        if (tablaFaltante(error)) {
            return res.status(500).json({ success: false, message: 'Falta crear la tabla clinical.unificaciones_pacientes en la base de datos' });
        }
        console.error('Error unificando pacientes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

/** GET /unificaciones?limit=&offset= — historial de unificaciones de la clínica. */
export const listarUnificaciones = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

        const [rows, total] = await Promise.all([
            query(`
                SELECT u.id_unificacion, u.id_mascota_principal, u.nombre_principal, u.nombre_eliminada,
                       u.motivo, u.resumen, u.created_at,
                       TRIM(CONCAT(us.nombre, ' ', us.apellido)) AS usuario_nombre,
                       EXISTS (SELECT 1 FROM clinical.mascotas m WHERE m.id_mascota = u.id_mascota_principal) AS principal_existe
                FROM clinical.unificaciones_pacientes u
                LEFT JOIN vetplus_auth.usuarios us ON us.id_usuario = u.id_usuario
                WHERE u.id_tenant = $1
                ORDER BY u.created_at DESC
                LIMIT $2 OFFSET $3
            `, [tenantId, limit, offset]),
            query(`SELECT COUNT(*)::int AS n FROM clinical.unificaciones_pacientes WHERE id_tenant = $1`, [tenantId])
        ]);

        res.json({ success: true, data: rows.rows, total: total.rows[0].n });
    } catch (error) {
        if (tablaFaltante(error)) return res.json({ success: true, data: [], total: 0, aviso: 'Tabla de historial no creada' });
        console.error('Error listando unificaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
