import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { handleDatabaseError } from '../utils/errorHandler.js';
import { generarPDFHistoria } from '../services/historiaClinicaPDFService.js';

function toSafeFilenamePart(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
    .toLowerCase() || 'historia';
}

function formatDateForFilename(dateValue) {
  const d = new Date(dateValue);
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const day = String(safeDate.getUTCDate()).padStart(2, '0');
  const month = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
  const year = String(safeDate.getUTCFullYear());
  return `${day}${month}${year}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_PREFIJOS = {
  valoracion_inicial: 'VI',
  seguimiento:        'ST',
  formula:            'FX',
  remision:           'RM',
};

const TIPO_FILENAME = {
  valoracion_inicial: 'valoracion_inicial',
  seguimiento: 'seguimiento',
  formula: 'formula',
  remision: 'remision',
};

const TIPOS_VALIDOS = Object.keys(TIPO_PREFIJOS);

/** Tabla hija correspondiente a cada tipo_documento */
const TABLA_HIJA = {
  valoracion_inicial: 'historia_valoracion_inicial',
  seguimiento:        'historia_seguimiento',
  formula:            'historia_formula',
  remision:           'historia_remision',
};

export const getMedicamentosSugeridos = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const search = String(req.query.search || '').trim();
    const params = [tenantId];

    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      searchClause = `AND medicamento ILIKE $${params.length}`;
    }

    const result = await query(
      `WITH medicamentos_usados AS (
         SELECT NULLIF(BTRIM(med->>'medicamento'), '') AS medicamento
         FROM clinical.historia_formula hf
         JOIN clinical.historias_clinicas h ON h.id_historia = hf.id_historia
         CROSS JOIN LATERAL jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(hf.medicamentos) = 'array' THEN hf.medicamentos
             ELSE '[]'::jsonb
           END
         ) med
         WHERE h.id_tenant = $1
           AND h.estado <> 'Cancelado'

         UNION

         SELECT NULLIF(BTRIM(med->>'nombre'), '') AS medicamento
         FROM clinical.historia_formula hf
         JOIN clinical.historias_clinicas h ON h.id_historia = hf.id_historia
         CROSS JOIN LATERAL jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(hf.medicamentos) = 'array' THEN hf.medicamentos
             ELSE '[]'::jsonb
           END
         ) med
         WHERE h.id_tenant = $1
           AND h.estado <> 'Cancelado'
       )
       SELECT DISTINCT medicamento
       FROM medicamentos_usados
       WHERE medicamento IS NOT NULL
       ${searchClause}
       ORDER BY medicamento ASC
       LIMIT 100`,
      params
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => row.medicamento)
    });
  } catch (error) {
    console.error('Error obteniendo medicamentos sugeridos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/** Genera código legible: VI-20260427-A3F2 */
function generarCodigo(tipo) {
  const prefijo = TIPO_PREFIJOS[tipo] ?? 'HC';
  const fecha   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand    = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefijo}-${fecha}-${rand}`;
}

/** Devuelve los campos específicos de cada tipo desde req.body */
function extraerDatosHijo(tipo, body) {
  switch (tipo) {
    case 'valoracion_inicial':
      return {
        remitido_por:               body.remitido_por               ?? null,
        anamnesis:                  body.anamnesis                  ?? null,
        antiguedad_signos:          body.antiguedad_signos          ?? null,
        medicacion_previa:          body.medicacion_previa          ?? null,
        enfermedades_anteriores:    body.enfermedades_anteriores    ?? null,
        actividad_fisica:           body.actividad_fisica           ?? null,
        valoracion_estatica:        body.valoracion_estatica        ?? null,
        valoracion_dinamica:        body.valoracion_dinamica        ?? null,
        hallazgos_musculares:       body.hallazgos_musculares       ?? null,
        perimetria_mtd_1:           body.perimetria_mtd_1           ?? null,
        perimetria_mtd_2:           body.perimetria_mtd_2           ?? null,
        perimetria_mti_1:           body.perimetria_mti_1           ?? null,
        perimetria_mti_2:           body.perimetria_mti_2           ?? null,
        perimetria_mpd_1:           body.perimetria_mpd_1           ?? null,
        perimetria_mpd_2:           body.perimetria_mpd_2           ?? null,
        perimetria_mpd_3:           body.perimetria_mpd_3           ?? null,
        perimetria_mpi_1:           body.perimetria_mpi_1           ?? null,
        perimetria_mpi_2:           body.perimetria_mpi_2           ?? null,
        perimetria_mpi_3:           body.perimetria_mpi_3           ?? null,
        hallazgos_osteoarticulares: body.hallazgos_osteoarticulares ?? null,
        goniometria:                {
          hombro_flexion_d:    body.gonio_hombro_flexion_d    ?? null,
          hombro_extension_d:  body.gonio_hombro_extension_d  ?? null,
          codo_flexion_d:      body.gonio_codo_flexion_d      ?? null,
          codo_extension_d:    body.gonio_codo_extension_d    ?? null,
          carpo_flexion_d:     body.gonio_carpo_flexion_d     ?? null,
          carpo_extension_d:   body.gonio_carpo_extension_d   ?? null,
          hombro_flexion_i:    body.gonio_hombro_flexion_i    ?? null,
          hombro_extension_i:  body.gonio_hombro_extension_i  ?? null,
          codo_flexion_i:      body.gonio_codo_flexion_i      ?? null,
          codo_extension_i:    body.gonio_codo_extension_i    ?? null,
          carpo_flexion_i:     body.gonio_carpo_flexion_i     ?? null,
          carpo_extension_i:   body.gonio_carpo_extension_i   ?? null,
          cadera_flexion_d:    body.gonio_cadera_flexion_d    ?? null,
          cadera_extension_d:  body.gonio_cadera_extension_d  ?? null,
          rodilla_flexion_d:   body.gonio_rodilla_flexion_d   ?? null,
          rodilla_extension_d: body.gonio_rodilla_extension_d ?? null,
          tarso_flexion_d:     body.gonio_tarso_flexion_d     ?? null,
          tarso_extension_d:   body.gonio_tarso_extension_d   ?? null,
          cadera_flexion_i:    body.gonio_cadera_flexion_i    ?? null,
          cadera_extension_i:  body.gonio_cadera_extension_i  ?? null,
          rodilla_flexion_i:   body.gonio_rodilla_flexion_i   ?? null,
          rodilla_extension_i: body.gonio_rodilla_extension_i ?? null,
          tarso_flexion_i:     body.gonio_tarso_flexion_i     ?? null,
          tarso_extension_i:   body.gonio_tarso_extension_i   ?? null,
        },
        prueba_cajon:               body.prueba_cajon               ?? null,
        prueba_compresion_tibial:   body.prueba_compresion_tibial   ?? null,
        prueba_ortolani:            body.prueba_ortolani            ?? null,
        luxacion_patelar:           body.luxacion_patelar           ?? null,
        sensibilidad:               body.sensibilidad               ?? null,
        propiocepcion:              body.propiocepcion              ?? null,
        equilibrio:                 body.equilibrio                 ?? null,
        paniculo:                   body.paniculo                   ?? null,
        reflejos: {
          tricipital_d:     body.reflejo_tricipital_d     ?? null,
          tricipital_i:     body.reflejo_tricipital_i     ?? null,
          flexor_tor_d:     body.reflejo_flexor_tor_d     ?? null,
          flexor_tor_i:     body.reflejo_flexor_tor_i     ?? null,
          patelar_d:        body.reflejo_patelar_d        ?? null,
          patelar_i:        body.reflejo_patelar_i        ?? null,
          tibial_craneal_d: body.reflejo_tibial_craneal_d ?? null,
          tibial_craneal_i: body.reflejo_tibial_craneal_i ?? null,
          ciatico_d:        body.reflejo_ciatico_d        ?? null,
          ciatico_i:        body.reflejo_ciatico_i        ?? null,
          flexor_pelv_d:    body.reflejo_flexor_pelv_d    ?? null,
          flexor_pelv_i:    body.reflejo_flexor_pelv_i    ?? null,
          observaciones_palpacion: body.observaciones_palpacion ?? null,
        },
        imagenes_diagnosticas:      body.imagenes_diagnosticas      ?? null,
        diagnostico:                body.diagnostico                ?? null,
        tratamiento:                body.tratamiento                ?? null,
        recomendaciones:            body.recomendaciones            ?? null,
        proxima_cita:               body.proxima_cita ? String(body.proxima_cita).trim() : null,
      };

    case 'seguimiento':
      return {
        numero_sesion:         body.numero_sesion         ?? null,
        observaciones_en_casa: body.observaciones_en_casa ?? null,
        ejercicios_realizados: body.ejercicios_realizados ?? null,
        recomendaciones_casa:  body.recomendaciones_casa  ?? null,
        notas_clinicas:        body.notas_clinicas        ?? null,
      };

    case 'formula':
      return {
        medicamentos:     body.medicamentos     ?? [],
        plan_terapeutico: body.plan_terapeutico ?? null,
        notas:            body.notas            ?? null,
      };

    case 'remision':
      return {
        motivo:               body.motivo               ?? null,
        texto_remision:       body.texto_remision        ?? null,
        especialidad_destino: body.especialidad_destino  ?? null,
        profesional_destino:  body.profesional_destino   ?? null,
        institucion_destino:  body.institucion_destino   ?? null,
      };

    default:
      return {};
  }
}

/** pg no serializa arrays/objetos JS como JSONB automáticamente — hay que usar JSON.stringify */
function pgVal(v) {
  if (v !== null && v !== undefined && typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Construye INSERT dinámico para la tabla hija */
function buildChildInsert(tabla, idHistoria, datos) {
  const keys   = ['id_historia', ...Object.keys(datos)];
  const values = [idHistoria,    ...Object.values(datos).map(pgVal)];
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const cols = keys.map(k => `"${k}"`).join(', ');
  return {
    text:   `INSERT INTO clinical.${tabla} (${cols}) VALUES (${placeholders})`,
    values,
  };
}

/** Construye UPDATE dinámico para la tabla hija */
function buildChildUpdate(tabla, idHistoria, datos) {
  const entries = Object.entries(datos);
  if (!entries.length) return null;
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...entries.map(([, v]) => pgVal(v)), idHistoria];
  return {
    text:   `UPDATE clinical.${tabla} SET ${sets} WHERE id_historia = $${entries.length + 1}`,
    values,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createHistoria = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id_mascota, id_veterinario, id_cita, tipo_documento, estado = 'Completado' } = req.body;

    if (!id_mascota || !id_veterinario || !tipo_documento) {
      return res.status(400).json({
        success: false,
        message: 'id_mascota, id_veterinario y tipo_documento son obligatorios',
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo_documento)) {
      return res.status(400).json({
        success: false,
        message: `tipo_documento debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }

    // Regla de consistencia: una cita no debe tener dos documentos activos del mismo tipo.
    if (id_cita) {
      const duplicateResult = await query(
        `SELECT id_historia, codigo_historia, tipo_documento, estado
         FROM clinical.historias_clinicas
         WHERE id_tenant = $1
           AND id_cita = $2
           AND tipo_documento = $3
           AND estado <> 'Cancelado'
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, id_cita, tipo_documento]
      );

      if (duplicateResult.rows.length) {
        const existing = duplicateResult.rows[0];
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_HISTORIA_BY_APPOINTMENT_TYPE',
          message: `Ya existe un documento de tipo ${tipo_documento} para esta cita`,
          data: {
            existing,
          },
        });
      }
    }

    const id_historia    = uuidv4();
    const codigo_historia = generarCodigo(tipo_documento);

    // ── Insertar madre ────────────────────────────────────────────────────────
    await query(
      `INSERT INTO clinical.historias_clinicas
         (id_historia, codigo_historia, tipo_documento, id_mascota, id_veterinario,
          id_cita, fecha, estado, id_tenant, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7,$8, NOW())`,
      [
        id_historia, codigo_historia, tipo_documento,
        id_mascota, id_veterinario,
        id_cita || null,
        estado,
        tenantId,
      ]
    );

    // ── Insertar hijo ─────────────────────────────────────────────────────────
    const datosHijo = extraerDatosHijo(tipo_documento, req.body);
    const { text, values } = buildChildInsert(TABLA_HIJA[tipo_documento], id_historia, datosHijo);
    await query(text, values);

    // ── Si viene de una cita, actualizar el enlace ────────────────────────────
    if (id_cita) {
      await query(
        `UPDATE clinical.calendario_citas SET id_historia = $1 WHERE id_cita = $2 AND id_tenant = $3`,
        [id_historia, id_cita, tenantId]
      );
    }

    // ── Retornar historia completa ────────────────────────────────────────────
    const result = await query(
      `SELECT h.*, m.nombre as mascota_nombre, c.nombre as cliente_nombre,
              u.nombre as veterinario_nombre
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
       JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
       WHERE h.id_historia = $1`,
      [id_historia]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'createHistoria');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

export const getHistorias = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      page = 1, limit = 20,
      id_mascota, tipo_documento, estado, fecha_desde, fecha_hasta,
      search,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [tenantId];
    const filters = ['h.id_tenant = $1'];

    if (id_mascota) {
      params.push(id_mascota);
      filters.push(`h.id_mascota = $${params.length}`);
    }
    if (tipo_documento) {
      params.push(tipo_documento);
      filters.push(`h.tipo_documento = $${params.length}`);
    }
    if (estado) {
      params.push(estado);
      filters.push(`h.estado = $${params.length}`);
    }
    if (fecha_desde) {
      params.push(fecha_desde);
      filters.push(`h.fecha >= $${params.length}`);
    }
    if (fecha_hasta) {
      params.push(fecha_hasta);
      filters.push(`h.fecha <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(m.nombre ILIKE $${params.length} OR c.nombre ILIKE $${params.length} OR h.codigo_historia ILIKE $${params.length})`);
    }

    const where = filters.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT h.id_historia, h.codigo_historia, h.tipo_documento, h.fecha, h.estado,
                h.motivo_anulacion,
                h.id_mascota, m.nombre AS mascota_nombre,
                h.id_veterinario, u.nombre AS veterinario_nombre,
                c.id_cliente, c.nombre AS cliente_nombre,
                h.id_cita, h.created_at
         FROM clinical.historias_clinicas h
         JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
         JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
         JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
         WHERE ${where}
         ORDER BY h.fecha DESC, h.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM clinical.historias_clinicas h
         JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
         JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
         JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
         WHERE ${where}`,
        params
      ),
    ]);

    const total = parseInt(countResult.rows[0].total);

    return res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'getHistorias');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── GET ALL BY APPOINTMENT ID ──────────────────────────────────────────────

export const getHistoriasByAppointmentId = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id_cita } = req.params;

    const result = await query(
      `SELECT h.id_historia, h.codigo_historia, h.tipo_documento, h.fecha, h.estado, h.created_at,
              m.id_mascota, m.nombre AS mascota_nombre,
              c.id_cliente, c.nombre AS cliente_nombre,
              u.id_usuario AS id_veterinario, u.nombre AS veterinario_nombre
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
       JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
       WHERE h.id_tenant = $1
         AND h.id_cita = $2
       ORDER BY h.created_at DESC`,
      [tenantId, id_cita]
    );

    return res.json({
      success: true,
      message: 'Documentos de historia clínica obtenidos exitosamente',
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'getHistoriasByAppointmentId');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── GET BY APPOINTMENT ID ──────────────────────────────────────────────────

export const getHistoriaByAppointmentId = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id_cita } = req.params;

    const historiaResult = await query(
      `SELECT h.id_historia
       FROM clinical.historias_clinicas h
       WHERE h.id_tenant = $1
         AND h.id_cita = $2
       ORDER BY h.created_at DESC
       LIMIT 1`,
      [tenantId, id_cita]
    );

    if (!historiaResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró historia clínica para esta cita',
      });
    }

    const idHistoria = historiaResult.rows[0].id_historia;

    const madreResult = await query(
      `SELECT h.*,
              cc.id_cita AS id_cita_relacionada,
              m.nombre AS mascota_nombre, m.especie, m.raza, m.sexo, m.peso,
              c.id_cliente, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              u.nombre AS veterinario_nombre, u.email AS veterinario_email
       FROM clinical.historias_clinicas h
       LEFT JOIN clinical.calendario_citas cc ON cc.id_historia = h.id_historia AND cc.id_tenant = h.id_tenant
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
       JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
       WHERE h.id_historia = $1 AND h.id_tenant = $2`,
      [idHistoria, tenantId]
    );

    if (!madreResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    const historia = madreResult.rows[0];
    if (!historia.id_cita && historia.id_cita_relacionada) {
      historia.id_cita = historia.id_cita_relacionada;
    }
    const tabla = TABLA_HIJA[historia.tipo_documento];

    const hijoResult = await query(
      `SELECT * FROM clinical.${tabla} WHERE id_historia = $1`,
      [idHistoria]
    );
    historia.datos = hijoResult.rows[0] ?? null;

    const archivosResult = await query(
      `SELECT ah.id_archivo, ah.nombre_original, ah.nombre_archivo, ah.ruta_archivo,
              ah.tipo_mime, ah.tamano_bytes, ah.descripcion,
              ah.created_at, ah.created_by, u.nombre AS subido_por_nombre
       FROM clinical.archivos_historia ah
       LEFT JOIN vetplus_auth.usuarios u ON u.id_usuario = ah.created_by
       WHERE ah.id_historia = $1 AND ah.activo = true
       ORDER BY ah.created_at DESC`,
      [idHistoria]
    );
    historia.archivos = archivosResult.rows;

    return res.json({ success: true, data: historia });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'getHistoriaByAppointmentId');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── GET BY ID (con datos del hijo) ──────────────────────────────────────────

export const getHistoriaById = async (req, res) => {
  try {
    const tenantId  = req.tenantId;
    const { id }    = req.params;

    // Madre
    const madreResult = await query(
      `SELECT h.*,
              cc.id_cita AS id_cita_relacionada,
              m.nombre AS mascota_nombre, m.especie, m.raza, m.sexo, m.peso,
              c.id_cliente, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              u.nombre AS veterinario_nombre, u.email AS veterinario_email
       FROM clinical.historias_clinicas h
       LEFT JOIN clinical.calendario_citas cc ON cc.id_historia = h.id_historia AND cc.id_tenant = h.id_tenant
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
       JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
       WHERE h.id_historia = $1 AND h.id_tenant = $2`,
      [id, tenantId]
    );

    if (!madreResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    const historia = madreResult.rows[0];
    if (!historia.id_cita && historia.id_cita_relacionada) {
      historia.id_cita = historia.id_cita_relacionada;
    }
    const tabla    = TABLA_HIJA[historia.tipo_documento];

    // Hijo
    const hijoResult = await query(
      `SELECT * FROM clinical.${tabla} WHERE id_historia = $1`,
      [id]
    );
    historia.datos = hijoResult.rows[0] ?? null;

    // Archivos adjuntos
    const archivosResult = await query(
          `SELECT ah.id_archivo, ah.nombre_original, ah.nombre_archivo, ah.ruta_archivo,
            ah.tipo_mime, ah.tamano_bytes, ah.descripcion,
              ah.created_at, ah.created_by, u.nombre AS subido_por_nombre
       FROM clinical.archivos_historia ah
       LEFT JOIN vetplus_auth.usuarios u ON u.id_usuario = ah.created_by
       WHERE ah.id_historia = $1 AND ah.activo = true
       ORDER BY ah.created_at DESC`,

      [id]
    );
    historia.archivos = archivosResult.rows;

    return res.json({ success: true, data: historia });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'getHistoriaById');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateHistoria = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    // Verificar que existe y pertenece al tenant
    const existing = await query(
      `SELECT id_historia, tipo_documento FROM clinical.historias_clinicas
       WHERE id_historia = $1 AND id_tenant = $2`,
      [id, tenantId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    const tipo = existing.rows[0].tipo_documento;
    const { estado, id_cita, motivo_modificacion } = req.body;

    if (!motivo_modificacion || motivo_modificacion.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un motivo de modificación (mínimo 10 caracteres)',
      });
    }

    // ── Actualizar madre ──────────────────────────────────────────────────────
    const madreUpdates = [];
    const madreValues  = [];
    if (estado) { madreValues.push(estado); madreUpdates.push(`estado = $${madreValues.length}`); }
    if (id_cita !== undefined) { madreValues.push(id_cita || null); madreUpdates.push(`id_cita = $${madreValues.length}`); }
    // Siempre guardar motivo de modificación
    madreValues.push(motivo_modificacion.trim());
    madreUpdates.push(`motivo_modificacion = $${madreValues.length}`);

    if (madreUpdates.length) {
      madreValues.push(id, tenantId);
      await query(
        `UPDATE clinical.historias_clinicas
         SET ${madreUpdates.join(', ')}, updated_at = NOW()
         WHERE id_historia = $${madreValues.length - 1} AND id_tenant = $${madreValues.length}`,
        madreValues
      );
    }

    // ── Actualizar hijo ───────────────────────────────────────────────────────
    const datosHijo = extraerDatosHijo(tipo, req.body);
    const childQuery = buildChildUpdate(TABLA_HIJA[tipo], id, datosHijo);
    if (childQuery) {
      await query(childQuery.text, childQuery.values);
    }

    // ── Retornar estado actualizado ───────────────────────────────────────────
    const updated = await query(
      `SELECT h.*, m.nombre AS mascota_nombre, c.nombre AS cliente_nombre,
              u.nombre AS veterinario_nombre
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes c ON c.id_cliente = m.id_cliente
       JOIN vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
       WHERE h.id_historia = $1`,
      [id]
    );
    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'updateHistoria');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── DELETE (soft) ────────────────────────────────────────────────────────────

export const deleteHistoria = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;
    const { motivo_anulacion } = req.body ?? {};

    if (!motivo_anulacion || !String(motivo_anulacion).trim()) {
      return res.status(400).json({
        success: false,
        message: 'El motivo de anulación es obligatorio',
      });
    }

    const result = await query(
      `UPDATE clinical.historias_clinicas
       SET estado = 'Cancelado',
           motivo_anulacion = $3,
           updated_at = NOW()
       WHERE id_historia = $1 AND id_tenant = $2
       RETURNING id_historia`,
      [id, tenantId, String(motivo_anulacion).trim()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    return res.json({ success: true, message: 'Historia anulada correctamente' });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'deleteHistoria');
    return res.status(status).json({ success: false, message, code });
  }
};

export const reactivateHistoria = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const result = await query(
      `UPDATE clinical.historias_clinicas
       SET estado = 'Completado',
           motivo_anulacion = NULL,
           updated_at = NOW()
       WHERE id_historia = $1 AND id_tenant = $2
       RETURNING id_historia`,
      [id, tenantId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    return res.json({ success: true, message: 'Historia reactivada correctamente' });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'reactivateHistoria');
    return res.status(status).json({ success: false, message, code });
  }
};

export const uploadHistoriaArchivos = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id_usuario ?? null;
    const { id } = req.params;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No se encontraron archivos para subir' });
    }

    const historiaResult = await query(
      `SELECT id_historia
       FROM clinical.historias_clinicas
       WHERE id_historia = $1 AND id_tenant = $2`,
      [id, tenantId]
    );

    if (!historiaResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    const archivosSubidos = [];
    for (const file of files) {
      const insertResult = await query(
        `INSERT INTO clinical.archivos_historia (
          id_historia,
          nombre_original,
          nombre_archivo,
          ruta_archivo,
          tipo_mime,
          tamano_bytes,
          descripcion,
          created_by,
          id_tenant
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id_archivo, nombre_original, ruta_archivo, tipo_mime, tamano_bytes, created_at`,
        [
          id,
          file.originalname,
          file.filename,
          `/uploads/historia-clinica/${file.filename}`,
          file.mimetype,
          file.size,
          null,
          userId,
          tenantId,
        ]
      );
      archivosSubidos.push(insertResult.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${archivosSubidos.length} archivo(s) subido(s) correctamente`,
      data: { archivos: archivosSubidos },
    });
  } catch (error) {
    const { status, message, code } = handleDatabaseError(error, 'uploadHistoriaArchivos');
    return res.status(status).json({ success: false, message, code });
  }
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const downloadHistoriaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const buffer = await generarPDFHistoria(id, tenantId);

    const metaResult = await query(
      `SELECT h.tipo_documento, h.fecha, m.nombre AS mascota_nombre
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       WHERE h.id_historia = $1 AND h.id_tenant = $2`,
      [id, tenantId]
    );

    const meta = metaResult.rows[0] || {};
    const tipo = toSafeFilenamePart(TIPO_FILENAME[meta.tipo_documento] || meta.tipo_documento || 'historia');
    const mascota = toSafeFilenamePart(meta.mascota_nombre || 'mascota');
    const fecha = formatDateForFilename(meta.fecha);
    const filename = `${tipo}_${mascota}_${fecha}.pdf`;
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error generando PDF historia:', error);
    res.status(500).json({ success: false, message: error.message ?? 'Error generando PDF' });
  }
};
