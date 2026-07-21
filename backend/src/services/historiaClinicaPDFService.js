/**
 * Servicio PDF — Historia Clínica
 * Genera PDFs para los cuatro tipos de documento: valoracion_inicial,
 * seguimiento, formula y remision.
 *
 * Fuentes de datos:
 *   - system.configuracion_empresa  → logo, nombre, NIT, dirección, teléfono
 *   - vetplus_auth.usuarios         → nombre, licencia, especialidad, firma_url (vet)
 *   - clinical.mascotas + clientes  → paciente y propietario
 *   - clinical.historias_clinicas + tabla hija
 */

import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** CamelCase: "JUAN JOSE" → "Juan Jose" */
function toCamelCase(str = '') {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d) ? String(val) : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function field(v) { return v != null && v !== '' ? String(v) : '—'; }

function hasAnyValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (Array.isArray(value)) return value.some((v) => hasAnyValue(v));
  if (typeof value === 'object') return Object.values(value).some((v) => hasAnyValue(v));
  return false;
}

function normalizeMedicamentos(medicamentos) {
  if (!medicamentos) return [];
  if (Array.isArray(medicamentos)) return medicamentos;

  if (typeof medicamentos === 'string') {
    try {
      const parsed = JSON.parse(medicamentos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseLegacyInstrucciones(instrucciones = '') {
  const raw = String(instrucciones || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { dosis: '', frecuencia: '', duracion: '' };

  const frecuenciaMatch = raw.match(/(cada\s+\d+\s*(?:h|hs|hora|horas|dia|dias|d[ií]a|d[ií]as|semana|semanas|mes|meses))/i);
  const duracionMatch = raw.match(/(?:por|durante)\s+(\d+\s*(?:h|hs|hora|horas|dia|dias|d[ií]a|d[ií]as|semana|semanas|mes|meses))/i);

  const frecuencia = frecuenciaMatch?.[1]?.trim() || '';
  const duracion = duracionMatch?.[1]?.trim() || '';

  let dosis = raw;
  if (frecuenciaMatch?.[1]) dosis = dosis.replace(frecuenciaMatch[1], ' ');
  if (duracionMatch?.[0]) dosis = dosis.replace(duracionMatch[0], ' ');
  dosis = dosis.replace(/\s+/g, ' ').trim();

  return { dosis, frecuencia, duracion };
}

function prettySeguimientoGroupTitle(rawTitle = '') {
  return String(rawTitle)
    .replace(/^ejercicios\s+de\s+/i, '')
    .replace(/\s+y\s+/gi, ' y ')
    .trim()
    .replace(/^[a-záéíóúñ]/, (m) => m.toUpperCase());
}

function parseSeguimientoChecklist(rawEjercicios = '') {
  const raw = String(rawEjercicios || '');
  if (!raw.trim()) return { grupos: [], otros: '' };

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const grupos = [];
  let otros = '';

  lines.forEach((line) => {
    const idx = line.indexOf(':');
    if (idx <= 0) return;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!value) return;

    if (/^otros$/i.test(key)) {
      otros = value;
      return;
    }

    const items = value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    if (!items.length) return;
    grupos.push({ titulo: prettySeguimientoGroupTitle(key), items });
  });

  return { grupos, otros };
}

function formatDosisPaciente(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const hasUnit = /(mg|mcg|g|ml|ui|u\.i\.|gota(?:s)?|tableta(?:s)?|capsula(?:s)?|c[aá]psula(?:s)?|comprimido(?:s)?|sobre(?:s)?)/i.test(raw);
  const isOnlyNumber = /^\d+(?:[.,]\d+)?$/.test(raw);

  if (hasUnit) return raw;
  if (isOnlyNumber) return `${raw} (unidad no especificada)`;
  return raw;
}

// ─── data loaders ────────────────────────────────────────────────────────────

async function getEmpresa(tenantId) {
  try {
    const r = await query(
      `SELECT nombre_empresa, nit, direccion, telefono, email, ciudad, logo_url, eslogan
       FROM system.configuracion_empresa
       WHERE activa = true AND id_tenant = $1
       LIMIT 1`,
      [tenantId]
    );
    return r.rows[0] || {};
  } catch { return {}; }
}

async function getHistoriaFull(idHistoria, tenantId) {
  // Madre con datos del vet, mascota y propietario
  const base = await query(
    `SELECT h.*,
            u.nombre       AS vet_nombre,
            u.apellido     AS vet_apellido,
            u.especialidad AS vet_especialidad,
            u.numero_licencia AS vet_licencia,
            u.firma_url    AS vet_firma_url,
            m.nombre       AS mascota_nombre,
            m.especie      AS mascota_especie,
            m.raza         AS mascota_raza,
            m.sexo         AS mascota_sexo,
            m.fecha_nacimiento AS mascota_nacimiento,
            m.color        AS mascota_color,
            m.peso         AS mascota_peso,
            c.nombre       AS propietario_nombre,
                 c.telefono     AS propietario_telefono,
                 c.cedula       AS propietario_cedula,
                 c.email        AS propietario_email
     FROM   clinical.historias_clinicas h
     JOIN   vetplus_auth.usuarios u ON u.id_usuario = h.id_veterinario
     JOIN   clinical.mascotas m     ON m.id_mascota = h.id_mascota
     JOIN   clinical.clientes c     ON c.id_cliente = m.id_cliente
     WHERE  h.id_historia = $1 AND h.id_tenant = $2`,
    [idHistoria, tenantId]
  );
  if (!base.rows.length) return null;

  const h = base.rows[0];
  let hijo = {};

  const tablas = {
    valoracion_inicial: 'historia_valoracion_inicial',
    seguimiento:        'historia_seguimiento',
    formula:            'historia_formula',
    remision:           'historia_remision',
  };

  const tabla = tablas[h.tipo_documento];
  if (tabla) {
    const hr = await query(
      `SELECT * FROM clinical.${tabla} WHERE id_historia = $1`,
      [idHistoria]
    );
    if (hr.rows.length) hijo = hr.rows[0];
  }

  return { ...h, ...hijo };
}

// ─── PDF layout helpers ───────────────────────────────────────────────────────

const COLORS = {
  primary:  '#1565C0',
  accent:   '#0288D1',
  dark:     '#263238',
  mid:      '#546E7A',
  light:    '#ECEFF1',
  line:     '#CFD8DC',
  white:    '#FFFFFF',
};
const MARGIN  = 50;
const PAGE_W  = 595.28; // A4
const CONTENT = PAGE_W - MARGIN * 2;

function ensureSpace(doc, needed = 32) {
  const bottom = doc.page.height - (doc.page.margins?.bottom ?? 60);
  if (doc.y + needed > bottom) {
    doc.addPage();
    doc.y = doc.page.margins?.top ?? MARGIN;
  }
}

function newDoc() {
  return new PDFDocument({ size: 'A4', margins: { top: MARGIN, bottom: 60, left: MARGIN, right: MARGIN }, bufferPages: true });
}

/** Dibuja el header: logo + datos empresa + código historia */
function drawHeader(doc, empresa, historia) {
  const top = MARGIN;
  let x = MARGIN;

  // Logo (si existe y es PNG/JPG)
  const logoPath = empresa.logo_url ? path.join(UPLOADS_DIR, empresa.logo_url.replace('/uploads/', '')) : null;
  const hasLogo  = logoPath && fs.existsSync(logoPath);
  const LOGO_W   = 80;

  if (hasLogo) {
    doc.image(logoPath, x, top, { width: LOGO_W, height: 50, fit: [LOGO_W, 50] });
    x += LOGO_W + 12;
  }

  // Datos empresa
  const nombre = empresa.nombre_empresa || 'VetPlus';
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary)
     .text(nombre, x, top, { width: CONTENT - LOGO_W - 12 });
  if (empresa.eslogan) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.accent)
      .text(empresa.eslogan, x, doc.y, { width: CONTENT - LOGO_W - 12 });
  }
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.mid)
     .text(`NIT: ${field(empresa.nit)}`, x, doc.y, { width: CONTENT - LOGO_W - 12 })
     .text(`${field(empresa.direccion)}${empresa.ciudad ? '  ·  ' + empresa.ciudad : ''}`, { width: CONTENT - LOGO_W - 12 })
     .text(`Tel: ${field(empresa.telefono)}  ·  ${field(empresa.email)}`, { width: CONTENT - LOGO_W - 12 });

  // Línea separadora
  doc.moveTo(MARGIN, top + 58).lineTo(PAGE_W - MARGIN, top + 58)
     .strokeColor(COLORS.primary).lineWidth(1.5).stroke();

  // Tipo de documento + código + fecha
  const tipoLabel = {
    valoracion_inicial: 'Valoración Inicial',
    seguimiento:        'Nota de Seguimiento',
    formula:            'Fórmula',
    remision:           'Remisión',
  }[historia.tipo_documento] ?? historia.tipo_documento;

  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.dark)
     .text(tipoLabel, MARGIN, top + 66, { align: 'left', width: CONTENT / 2 });
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.mid)
     .text(`Código: ${historia.codigo_historia}`, PAGE_W - MARGIN - 140, top + 66, { align: 'right', width: 140 })
      .text(`Fecha doc: ${fmtDate(historia.fecha)}`,   PAGE_W - MARGIN - 140, doc.y,    { align: 'right', width: 140 })
      .text(`Creado: ${fmtDateTime(historia.created_at ?? historia.fecha)}`,   PAGE_W - MARGIN - 170, doc.y,    { align: 'right', width: 170 });

  doc.moveDown(0.5);
  doc.y = top + 105;
}

/** Caja azul oscuro con texto blanco para títulos de sección */
function sectionTitle(doc, title) {
  ensureSpace(doc, 28);
  const y = doc.y + 6;
  doc.rect(MARGIN, y, CONTENT, 16).fill(COLORS.primary);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white)
     .text(title.toUpperCase(), MARGIN + 6, y + 4, { width: CONTENT - 12 });
  doc.y = y + 24;
}

/** Fila etiqueta + valor en dos columnas */
function row(doc, label, value, opts = {}) {
  ensureSpace(doc, 26);
  const col  = opts.col ?? 0;           // 0 = izq, 1 = der
  const cols = opts.cols ?? 1;          // 1 = full, 2 = mitad
  const colW = CONTENT / 2;
  const x    = MARGIN + col * colW;
  const w    = colW * cols;
  const y    = doc.y;

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.mid)
     .text(label.toUpperCase() + ':', x, y, { width: w, continued: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.dark)
      .text(field(value), x, doc.y, { width: w - 4, lineGap: 1 });
    if (cols === 1) doc.moveDown(0.55);
}

/** Dos campos lado a lado */
function row2(doc, label1, val1, label2, val2) {
  ensureSpace(doc, 30);
  const y = doc.y;
  const half = CONTENT / 2 - 8;
  let bottomY = y;

  if (hasAnyValue(label1)) {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.mid)
       .text(String(label1).toUpperCase() + ':', MARGIN, y, { width: half });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.dark)
        .text(field(val1), MARGIN, doc.y, { width: half, lineGap: 1 });
    bottomY = Math.max(bottomY, doc.y);
  }

  if (hasAnyValue(label2)) {
    doc.y = y;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.mid)
       .text(String(label2).toUpperCase() + ':', MARGIN + half + 16, y, { width: half });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.dark)
        .text(field(val2), MARGIN + half + 16, doc.y, { width: half, lineGap: 1 });
    bottomY = Math.max(bottomY, doc.y);
  }

  doc.y = bottomY + 6;
}

function noteBlock(doc, title, value) {
  if (!hasAnyValue(value)) return;

  const text = field(value);
  const titleH = 16;
  const bodyPadding = 8;
  const bodyH = Math.max(20, doc.heightOfString(text, { width: CONTENT - 16, lineGap: 1.5 }) + bodyPadding * 2);
  const blockH = titleH + bodyH;

  ensureSpace(doc, blockH + 10);
  const y = doc.y;

  doc.rect(MARGIN, y, CONTENT, titleH).fill('#1E88E5');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white)
    .text(String(title).toUpperCase(), MARGIN + 6, y + 4, { width: CONTENT - 12 });

  const bodyY = y + titleH;
  doc.rect(MARGIN, bodyY, CONTENT, bodyH).fill('#F8FBFF');
  doc.rect(MARGIN, bodyY, CONTENT, bodyH).strokeColor('#D9E6F5').lineWidth(0.8).stroke();

  doc.font('Helvetica').fontSize(8.2).fillColor(COLORS.dark)
    .text(text, MARGIN + 8, bodyY + bodyPadding, { width: CONTENT - 16, lineGap: 1.5 });

  doc.y = bodyY + bodyH + 8;
}

/** Tabla de goniometría */
function tableGoniometria(doc, gonioData) {
  if (!gonioData || !hasAnyValue(gonioData)) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.mid)
      .text('Sin registros de goniometría.', MARGIN, doc.y);
    doc.moveDown(0.5);
    return;
  }

  const groups = [
    { title: 'Miembro Torácico Derecho', suffix: 'd', arts: ['hombro', 'codo', 'carpo'] },
    { title: 'Miembro Torácico Izquierdo', suffix: 'i', arts: ['hombro', 'codo', 'carpo'] },
    { title: 'Miembro Pélvico Derecho', suffix: 'd', arts: ['cadera', 'rodilla', 'tarso'] },
    { title: 'Miembro Pélvico Izquierdo', suffix: 'i', arts: ['cadera', 'rodilla', 'tarso'] },
  ];

  const COL = [MARGIN, MARGIN + 150, MARGIN + 250];
  const ROW_H = 14;

  groups.forEach((group) => {
    const rows = group.arts.map((art) => {
      const flex = gonioData[`${art}_flexion_${group.suffix}`];
      const ext = gonioData[`${art}_extension_${group.suffix}`];
      return { art: toCamelCase(art), flex, ext };
    }).filter((r) => hasAnyValue(r.flex) || hasAnyValue(r.ext));

    if (!rows.length) return;

    ensureSpace(doc, 24 + rows.length * ROW_H);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent)
      .text(group.title, MARGIN, doc.y, { width: CONTENT });
    doc.moveDown(0.25);

    const hy = doc.y;
    doc.rect(MARGIN, hy, CONTENT * 0.72, ROW_H).fill(COLORS.light);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.mid)
      .text('Articulación', COL[0] + 2, hy + 4, { width: 140 })
      .text('Flexión', COL[1] + 2, hy + 4, { width: 90 })
      .text('Extensión', COL[2] + 2, hy + 4, { width: 90 });
    doc.y = hy + ROW_H;

    rows.forEach((r, idx) => {
      const y = doc.y;
      if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT * 0.72, ROW_H).fill('#F9FAFB');
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.dark)
        .text(field(r.art), COL[0] + 2, y + 4, { width: 140 })
        .text(field(r.flex), COL[1] + 2, y + 4, { width: 90 })
        .text(field(r.ext), COL[2] + 2, y + 4, { width: 90 });
      doc.y = y + ROW_H;
    });

    doc.moveDown(0.45);
  });
}

/** Tabla de reflejos */
function tableReflejos(doc, reflejosData) {
  if (!reflejosData) return;

  const COL_LABEL = MARGIN;
  const COL_D     = MARGIN + 130;
  const COL_I     = MARGIN + 200;
  const ROW_H     = 13;

  const grupos = [
    { header: 'Torácico', cols: ['MTD', 'MTI'], items: [
      { label: 'Tricipital',    d: 'tricipital_d',     i: 'tricipital_i' },
      { label: 'Flexor Tor.',   d: 'flexor_tor_d',     i: 'flexor_tor_i' },
    ]},
    { header: 'Pélvico', cols: ['MPD', 'MPI'], items: [
      { label: 'Patelar',       d: 'patelar_d',        i: 'patelar_i' },
      { label: 'Tibial Cran.',  d: 'tibial_craneal_d', i: 'tibial_craneal_i' },
      { label: 'Ciático',       d: 'ciatico_d',        i: 'ciatico_i' },
      { label: 'Flexor Pelv.',  d: 'flexor_pelv_d',    i: 'flexor_pelv_i' },
    ]},
  ];

  grupos.forEach(grupo => {
    ensureSpace(doc, ROW_H * (grupo.items.length + 2));
    const hy = doc.y;
    doc.rect(MARGIN, hy, 270, ROW_H).fill(COLORS.accent);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
       .text(grupo.header, COL_LABEL + 2, hy + 3, { width: 126 });
    grupo.cols.forEach((c, i) => {
      doc.text(c, (i === 0 ? COL_D : COL_I) + 2, hy + 3, { width: 60 });
    });
    doc.y = hy + ROW_H;

    grupo.items.forEach((item, idx) => {
      ensureSpace(doc, ROW_H + 4);
      const y = doc.y;
      if (idx % 2 === 0) doc.rect(MARGIN, y, 270, ROW_H).fill('#F9FAFB');
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.dark)
         .text(item.label,                 COL_LABEL + 2, y + 3, { width: 126 })
         .text(field(reflejosData[item.d]), COL_D     + 2, y + 3, { width: 60 })
         .text(field(reflejosData[item.i]), COL_I     + 2, y + 3, { width: 60 });
      doc.y = y + ROW_H;
    });
    doc.moveDown(0.4);
  });

  const observacionesPalpacion = String(reflejosData?.observaciones_palpacion || '').trim();
  if (observacionesPalpacion) {
    ensureSpace(doc, 36);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent)
      .text('Observaciones a la palpación', MARGIN, doc.y, { width: CONTENT });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.dark)
      .text(observacionesPalpacion, MARGIN, doc.y, { width: CONTENT, lineGap: 2 });
    doc.moveDown(0.4);
  }
}

/** Tabla de medicamentos (fórmula) */
function tableMedicamentos(doc, medicamentos = []) {
  if (!medicamentos.length) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.mid).text('Sin medicamentos registrados.', MARGIN, doc.y);
    doc.moveDown(0.5);
    return;
  }

  const colWidths = [190, 80, 80, 80, 65];
  const colX = [MARGIN];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i] + colWidths[i]);
  }
  const ROW_H = 16;

  ensureSpace(doc, 30);
  const hy = doc.y;
  doc.rect(MARGIN, hy, CONTENT, ROW_H).fill(COLORS.primary);
  ['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Cantidad'].forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLORS.white)
       .text(h, colX[i] + 4, hy + 4, { width: colWidths[i] - 8 });
  });
  doc.y = hy + ROW_H;

  medicamentos.forEach((m, idx) => {
    const legacyParsed = parseLegacyInstrucciones(m?.instrucciones ?? '');
    const nombre = m?.nombre ?? m?.medicamento ?? '';
    const dosis = m?.dosis ?? legacyParsed.dosis ?? '';
    const frecuencia = m?.frecuencia ?? legacyParsed.frecuencia ?? '';
    const duracion = m?.duracion ?? legacyParsed.duracion ?? '';
    const cantidad = m?.cantidad ?? '';

    const instruccionesRaw = String(m?.instrucciones ?? '').trim();
    const indicacionesRaw = String(m?.indicaciones ?? '').trim();
    const hayRegimenEstructurado = hasAnyValue(m?.dosis) || hasAnyValue(m?.frecuencia) || hasAnyValue(m?.duracion);
    const indicaciones = indicacionesRaw || (hayRegimenEstructurado ? instruccionesRaw : '');
    const tieneIndicaciones = hasAnyValue(indicaciones);

    let rowHeight = ROW_H + 2;
    if (tieneIndicaciones) {
      const txt = `Indicaciones: ${indicaciones}`;
      doc.font('Helvetica-Oblique').fontSize(7.2).fillColor(COLORS.mid);
      rowHeight += doc.heightOfString(txt, { width: CONTENT - 12, lineGap: 1 }) + 6;
    }

    ensureSpace(doc, rowHeight + 6);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT, rowHeight).fill(idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF');
    doc.rect(MARGIN, y, CONTENT, rowHeight).strokeColor('#E3EAF0').lineWidth(0.7).stroke();

    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.dark);

    doc.text(field(nombre), colX[0] + 4, y + 4, { width: colWidths[0] - 8 });
    doc.text(field(formatDosisPaciente(dosis)), colX[1] + 4, y + 4, { width: colWidths[1] - 8 });
    doc.text(field(frecuencia), colX[2] + 4, y + 4, { width: colWidths[2] - 8 });
    doc.text(field(duracion), colX[3] + 4, y + 4, { width: colWidths[3] - 8 });
    doc.text(field(cantidad), colX[4] + 4, y + 4, { width: colWidths[4] - 8 });

    if (tieneIndicaciones) {
      doc.font('Helvetica-Oblique').fontSize(7.2).fillColor(COLORS.mid)
         .text(`Indicaciones: ${indicaciones}`, MARGIN + 6, y + ROW_H + 3, { width: CONTENT - 12, lineGap: 1 });
    }

    doc.y = y + rowHeight;
  });
  doc.moveDown(0.5);
}

/** Bloque de firma al final */
function drawFirma(doc, vet) {
  const fullName = `${vet.vet_nombre ?? ''} ${vet.vet_apellido ?? ''}`.trim();
  const firmaNombre = fullName ? toCamelCase(fullName) : 'Profesional tratante';
  const firmaPath   = vet.vet_firma_url
    ? path.join(UPLOADS_DIR, vet.vet_firma_url.replace('/uploads/', ''))
    : null;
  const hasFirma = firmaPath && fs.existsSync(firmaPath);

  const bottomLimit = doc.page.height - (doc.page.margins?.bottom ?? 60);
  const topLimit = doc.page.margins?.top ?? MARGIN;
  const blockHeight = hasFirma ? 95 : 62;

  const remaining = bottomLimit - doc.y;
  if (remaining < blockHeight + 14) {
    doc.addPage();
    doc.y = topLimit;
  }

  let Y_START = doc.y + 18;
  if (Y_START + blockHeight > bottomLimit) Y_START = bottomLimit - blockHeight;
  if (Y_START < topLimit) Y_START = topLimit;

  const FIRMA_X = PAGE_W - MARGIN - 180;
  const LINE_Y  = Y_START + (hasFirma ? 65 : 30);

  if (hasFirma) {
    doc.image(firmaPath, FIRMA_X, Y_START, { width: 140, height: 55, fit: [140, 55] });
  }

  doc.moveTo(FIRMA_X, LINE_Y).lineTo(FIRMA_X + 160, LINE_Y)
     .strokeColor(COLORS.dark).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.dark)
     .text(firmaNombre, FIRMA_X, LINE_Y + 3, { width: 160, align: 'center' });
  if (vet.vet_especialidad) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.mid)
      .text(String(vet.vet_especialidad).trim(), FIRMA_X, doc.y, { width: 160, align: 'center' });
  }
  if (vet.vet_licencia) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.mid)
       .text(`Lic. ${vet.vet_licencia}`, FIRMA_X, doc.y, { width: 160, align: 'center' });
  }
}

function drawPaginationFooter(doc, meta = {}) {
  const empresaNombre = field(meta.empresaNombre);
  const codigoDocumento = field(meta.codigoDocumento);
  const range = doc.bufferedPageRange();
  const total = range.count;

  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins?.left ?? MARGIN;
    const right = doc.page.margins?.right ?? MARGIN;
    const bottom = doc.page.margins?.bottom ?? 60;
    const lineY = pageHeight - bottom - 14;
    const footerY = pageHeight - bottom - 11;

    doc.save();
    doc.moveTo(left, lineY)
      .lineTo(pageWidth - right, lineY)
      .strokeColor('#D0D7DE')
      .lineWidth(0.6)
      .stroke();

    const footerText = `${empresaNombre} • Código: ${codigoDocumento} • Página ${i + 1} de ${total}`;
    doc.font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.mid)
      .text(footerText, left, footerY, {
        width: pageWidth - left - right,
        align: 'center',
        lineBreak: false,
      });
    doc.restore();
  }
}

// ─── secciones por tipo ───────────────────────────────────────────────────────

function seccionPaciente(doc, d) {
  sectionTitle(doc, 'Datos de la Mascota');
  row2(doc, 'Paciente', toCamelCase(d.mascota_nombre), 'Especie', field(d.mascota_especie));
  row2(doc, 'Raza', field(d.mascota_raza), 'Sexo', field(d.mascota_sexo));
  row2(doc, 'Color / Pelaje', field(d.mascota_color), 'Peso', d.mascota_peso ? `${d.mascota_peso} kg` : '—');
  row(doc, 'Fecha de Nacimiento', fmtDate(d.mascota_nacimiento));

  sectionTitle(doc, 'Datos del Propietario');
  const propietario = toCamelCase(d.propietario_nombre || '');
  row2(doc, 'Propietario', propietario, 'Teléfono', field(d.propietario_telefono));
  row2(doc, 'Cédula', field(d.propietario_cedula), 'Correo', field(d.propietario_email));
  doc.moveDown(0.3);
}

function seccionAnamnesis(doc, d) {
  sectionTitle(doc, 'Anamnesis');
  row2(doc, 'Remitido por', field(d.remitido_por), 'Antigüedad signos', field(d.antiguedad_signos));
  row(doc, 'Medicación previa', field(d.medicacion_previa));
  row(doc, 'Enfermedades anteriores', field(d.enfermedades_anteriores));
  row(doc, 'Actividad física', field(d.actividad_fisica));
  row(doc, 'Anamnesis', field(d.anamnesis));
}

function seccionValoracion(doc, d) {
  sectionTitle(doc, 'Valoración Estática y Dinámica');
  row(doc, 'Valoración estática', field(d.valoracion_estatica));
  row(doc, 'Valoración dinámica', field(d.valoracion_dinamica));
  row(doc, 'Hallazgos musculares', field(d.hallazgos_musculares));
  row(doc, 'Hallazgos osteoarticulares', field(d.hallazgos_osteoarticulares));
}

function seccionPerimetria(doc, d) {
  const rows = [
    ['Miembro Torácico Derecho (MTD)', d.perimetria_mtd_1, d.perimetria_mtd_2],
    ['Miembro Torácico Izquierdo (MTI)', d.perimetria_mti_1, d.perimetria_mti_2],
    ['Miembro Pélvico Derecho (MPD)', d.perimetria_mpd_1, d.perimetria_mpd_2],
    ['Miembro Pélvico Izquierdo (MPI)', d.perimetria_mpi_1, d.perimetria_mpi_2],
  ].filter(([, m1, m2]) => hasAnyValue(m1) || hasAnyValue(m2));

  if (!rows.length) return;

  sectionTitle(doc, 'Perímetría (cm)');

  const COL = [MARGIN, MARGIN + 280, MARGIN + 380];
  const ROW_H = 14;
  ensureSpace(doc, ROW_H * 2);
  const hy = doc.y;
  doc.rect(MARGIN, hy, CONTENT * 0.9, ROW_H).fill(COLORS.light);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.mid)
    .text('Miembro', COL[0] + 2, hy + 4, { width: 270 })
    .text('Medida 1', COL[1] + 2, hy + 4, { width: 90 })
    .text('Medida 2', COL[2] + 2, hy + 4, { width: 90 });
  doc.y = hy + ROW_H;

  rows.forEach(([lbl, m1, m2], idx) => {
    ensureSpace(doc, ROW_H + 4);
    const y = doc.y;
    if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT * 0.9, ROW_H).fill('#F9FAFB');
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.dark)
      .text(field(lbl), COL[0] + 2, y + 4, { width: 270 })
      .text(field(m1), COL[1] + 2, y + 4, { width: 90 })
      .text(field(m2), COL[2] + 2, y + 4, { width: 90 });
    doc.y = y + ROW_H;
  });
  doc.moveDown(0.6);
}

function seccionExploracion(doc, d) {
  sectionTitle(doc, 'Pruebas Ortopédicas y Neurológicas');
  row2(doc, 'Prueba del cajón', field(d.prueba_cajon), 'Compresión tibial', field(d.prueba_compresion_tibial));
  row2(doc, 'Prueba de Ortolani', field(d.prueba_ortolani), 'Luxación patelar', field(d.luxacion_patelar));
  row2(doc, 'Sensibilidad', field(d.sensibilidad), 'Propiocepción', field(d.propiocepcion));
  row2(doc, 'Equilibrio', field(d.equilibrio), 'Paniculo', field(d.paniculo));

  // Reflejos
  sectionTitle(doc, 'Reflejos');
  tableReflejos(doc, d.reflejos);
}

function seccionGoniometria(doc, d) {
  if (!hasAnyValue(d.goniometria)) return;
  sectionTitle(doc, 'Goniometría (°)');
  tableGoniometria(doc, d.goniometria);
}

function seccionDiagnostico(doc, d) {
  sectionTitle(doc, 'Diagnóstico y Tratamiento');
  row(doc, 'Diagnóstico', field(d.diagnostico));
  row(doc, 'Tratamiento', field(d.tratamiento));
  row(doc, 'Recomendaciones', field(d.recomendaciones));
  row(doc, 'Próxima cita', fmtDate(d.proxima_cita));
}

function drawSeguimientoChecklist(doc, rawEjercicios = '') {
  const parsed = parseSeguimientoChecklist(rawEjercicios);
  if (!parsed.grupos.length && !parsed.otros) return;

  sectionTitle(doc, 'Checklist de Ejercicios Realizados');

  const gap = 10;
  const colWidth = (CONTENT - gap) / 2;
  const groupHeight = (grupo) => {
    const rowsH = grupo.items.length * 12;
    return 12 + 6 + rowsH + 8;
  };

  const drawGroup = (grupo, x, y) => {
    const h = groupHeight(grupo);

    doc.rect(x, y, colWidth, h).fill('#F8FAFC');
    doc.rect(x, y, colWidth, h).strokeColor('#D7E3EF').lineWidth(0.7).stroke();

    doc.font('Helvetica-Bold').fontSize(7.2).fillColor('#355E8D')
      .text(grupo.titulo.toUpperCase(), x + 6, y + 4, { width: colWidth - 12 });

    let itemY = y + 18;
    grupo.items.forEach((item) => {
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor('#2E7D32')
        .text('•', x + 7, itemY + 1, { width: 6 });
      doc.font('Helvetica').fontSize(7.6).fillColor(COLORS.dark)
        .text(field(item), x + 14, itemY, { width: colWidth - 20, lineGap: 0.6 });
      itemY += 12;
    });
  };

  for (let i = 0; i < parsed.grupos.length; i += 2) {
    const left = parsed.grupos[i];
    const right = parsed.grupos[i + 1] || null;
    const rowHeight = Math.max(groupHeight(left), right ? groupHeight(right) : 0);

    ensureSpace(doc, rowHeight + 8);
    const y = doc.y;

    drawGroup(left, MARGIN, y);
    if (right) drawGroup(right, MARGIN + colWidth + gap, y);

    doc.y = y + rowHeight + 8;
  }

  if (parsed.otros) {
    row(doc, 'Otros', parsed.otros);
  }
}

// ─── builder principal ────────────────────────────────────────────────────────

/**
 * Genera el PDF de una historia clínica y devuelve el Buffer.
 * @param {string} idHistoria
 * @param {string} tenantId
 * @returns {Promise<Buffer>}
 */
export async function generarPDFHistoria(idHistoria, tenantId) {
  const [empresa, historia] = await Promise.all([
    getEmpresa(tenantId),
    getHistoriaFull(idHistoria, tenantId),
  ]);

  if (!historia) throw new Error('Historia clínica no encontrada');

  return new Promise((resolve, reject) => {
    const doc = newDoc();
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────────────────
    drawHeader(doc, empresa, historia);

    // ── Datos del paciente (todos los tipos) ─────────────────────────────────
    seccionPaciente(doc, historia);

    // ── Secciones por tipo ───────────────────────────────────────────────────
    switch (historia.tipo_documento) {
      case 'valoracion_inicial':
        if (hasAnyValue(historia.remitido_por) || hasAnyValue(historia.antiguedad_signos) || hasAnyValue(historia.medicacion_previa)
          || hasAnyValue(historia.enfermedades_anteriores) || hasAnyValue(historia.actividad_fisica) || hasAnyValue(historia.anamnesis)) {
          seccionAnamnesis(doc, historia);
        }
        if (hasAnyValue(historia.valoracion_estatica) || hasAnyValue(historia.valoracion_dinamica)
          || hasAnyValue(historia.hallazgos_musculares) || hasAnyValue(historia.hallazgos_osteoarticulares)) {
          seccionValoracion(doc, historia);
        }
        seccionPerimetria(doc, historia);
        if (hasAnyValue(historia.prueba_cajon) || hasAnyValue(historia.prueba_compresion_tibial) || hasAnyValue(historia.prueba_ortolani)
          || hasAnyValue(historia.luxacion_patelar) || hasAnyValue(historia.sensibilidad) || hasAnyValue(historia.propiocepcion)
          || hasAnyValue(historia.equilibrio) || hasAnyValue(historia.paniculo) || hasAnyValue(historia.reflejos)) {
          seccionExploracion(doc, historia);
        }
        seccionGoniometria(doc, historia);
        if (hasAnyValue(historia.diagnostico) || hasAnyValue(historia.tratamiento)
          || hasAnyValue(historia.recomendaciones)
          || hasAnyValue(historia.proxima_cita)) {
          seccionDiagnostico(doc, historia);
        }
        break;

      case 'seguimiento':
        sectionTitle(doc, 'Nota de Seguimiento');
        row2(doc, 'N.º de sesión', field(historia.numero_sesion), 'Fecha de control', fmtDate(historia.fecha));
        noteBlock(doc, 'Evolución reportada en casa', historia.observaciones_en_casa);

        drawSeguimientoChecklist(doc, historia.ejercicios_realizados);

        noteBlock(doc, 'Plan para casa', historia.recomendaciones_casa);
        noteBlock(doc, 'Notas clínicas del profesional', historia.notas_clinicas);
        break;

      case 'formula':
        sectionTitle(doc, 'Medicamentos formulados');
        tableMedicamentos(doc, normalizeMedicamentos(historia.medicamentos));

        if (hasAnyValue(historia.plan_terapeutico)) {
          sectionTitle(doc, 'Plan terapéutico');
          row(doc, 'Plan', field(historia.plan_terapeutico));
        }

        if (hasAnyValue(historia.notas)) {
          sectionTitle(doc, 'Notas del profesional');
          row(doc, 'Notas', field(historia.notas));
        }
        break;

      case 'remision':
        sectionTitle(doc, 'Información de Remisión');
        row(doc, 'Motivo de remisión', field(historia.motivo));
        row(doc, 'Especialidad destino', field(historia.especialidad_destino));
        row2(doc, 'Profesional destino', field(historia.profesional_destino), 'Institución', field(historia.institucion_destino));
        row(doc, 'Descripción / Texto de remisión', field(historia.texto_remision));
        break;
    }

    // ── Firma ────────────────────────────────────────────────────────────────
    drawFirma(doc, historia);

    // ── Pie de página (paginado) ─────────────────────────────────────────────
    drawPaginationFooter(doc, {
      empresaNombre: empresa.nombre_empresa || 'VetPlus',
      codigoDocumento: historia.codigo_historia,
    });

    doc.end();
  });
}
