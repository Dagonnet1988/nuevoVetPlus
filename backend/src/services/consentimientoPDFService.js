import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio donde se guardan los PDFs generados
const PDF_DIR = path.join(__dirname, '../../uploads/consentimientos');

/**
 * Asegura que el directorio de PDFs existe
 */
function ensurePDFDir() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }
}

function field(value, fallback = 'No registrado') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function safeSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function resolveLogoPath(logoUrl) {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return null;

  const clean = String(logoUrl).replace(/^\/+/, '');
  const normalized = clean.startsWith('uploads/') ? clean : `uploads/${clean.replace(/^uploads\//, '')}`;
  return path.join(__dirname, '../../', normalized);
}

function resolveConsentText(textoLegal, empresa) {
  const replacements = {
    NOMBRE_CLINICA: field(empresa.nombre_empresa, 'Clínica veterinaria'),
    SLOGAN_CLINICA: field(empresa.eslogan, ''),
    NIT: field(empresa.nit, 'No registrado'),
    DIRECCION: field(empresa.direccion, 'No registrada'),
    EMAIL_CLINICA: field(empresa.email, 'No registrado'),
    EMAIL_EMPRESA: field(empresa.email, 'No registrado'),
    CORREO_CLINICA: field(empresa.email, 'No registrado'),
    CORREO_EMPRESA: field(empresa.email, 'No registrado')
  };

  let text = String(textoLegal || '');
  for (const [key, value] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }

  // Si quedó algún placeholder no reconocido, evitar que salga literal en el PDF.
  return text.replace(/\[[A-Z_]{3,}\]/g, 'No registrado');
}

/**
 * Obtiene los datos de la empresa para el encabezado del PDF
 */
async function getEmpresaData(tenantId) {
  try {
    const result = await query(
      `SELECT nombre_empresa, nit, direccion, telefono, email, ciudad,
              logo_url, eslogan
       FROM system.configuracion_empresa
       WHERE activa = true
         AND id_tenant = $1
       LIMIT 1`
      , [tenantId]
    );
    return result.rows[0] || {
      nombre_empresa: 'Ramelo - Clínica Veterinaria',
      nit: '-',
      direccion: '-',
      telefono: '-',
      email: '-',
      ciudad: '',
      eslogan: ''
    };
  } catch {
    return {
      nombre_empresa: 'Ramelo - Clínica Veterinaria',
      nit: '-',
      direccion: '-',
      telefono: '-',
      email: '-',
      ciudad: '',
      eslogan: ''
    };
  }
}

/**
 * Genera el número único del documento: CONS-YYYY-NNNNN
 */
async function generarNumeroPDF() {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) AS total
     FROM clinical.consentimientos
     WHERE pdf_numero IS NOT NULL
       AND pdf_numero LIKE $1`,
    [`CONS-${year}-%`]
  );
  const next = parseInt(result.rows[0].total) + 1;
  return `CONS-${year}-${String(next).padStart(5, '0')}`;
}

/**
 * Genera el PDF de consentimiento firmado.
 * @param {Object}   params
 * @param {Object}   params.consentimiento - Fila de clinical.consentimientos
 * @param {Object}   params.cliente        - Fila de clinical.clientes
 * @param {string}   params.textoLegal     - Texto de clinical.versiones_consentimiento
 * @param {string}   params.pdfNumero      - Número único del documento
 * @returns {Promise<string>} Ruta relativa del PDF guardado
 */
export async function generarPDFConsentimiento({ consentimiento, cliente, textoLegal, pdfNumero, tenantId }) {
  ensurePDFDir();

  const empresa = await getEmpresaData(tenantId);
  const clientSlug = safeSlug(cliente?.nombre) || 'cliente';
  const filename = `${pdfNumero}-${clientSlug}.pdf`;
  const filepath = path.join(PDF_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // ── ENCABEZADO ────────────────────────────────────────────────
    // Logo si existe y es un formato soportado por PDFKit (PNG o JPEG)
    if (empresa.logo_url) {
      const logoPath = resolveLogoPath(empresa.logo_url);
      const ext = logoPath ? path.extname(logoPath).toLowerCase() : '';
      const soportado = ['.png', '.jpg', '.jpeg'].includes(ext);
      if (logoPath && soportado && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 40, { width: 80 });
          doc.moveDown(0.5);
        } catch (logoErr) {
          console.warn('No se pudo incluir el logo en el PDF:', logoErr.message);
        }
      }
    }

    doc.fontSize(16).font('Helvetica-Bold')
      .text(empresa.nombre_empresa, { align: 'center' });
    if (empresa.eslogan) {
      doc.fontSize(9).font('Helvetica-Oblique')
        .text(empresa.eslogan, { align: 'center' });
    }
    doc.fontSize(10).font('Helvetica')
      .text(`NIT: ${field(empresa.nit)}`, { align: 'center' })
      .text(field(empresa.direccion), { align: 'center' })
      .text(`${field(empresa.ciudad, '-')}${empresa.telefono ? ' | Tel: ' + empresa.telefono : ''}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Número de documento
    doc.fontSize(9).font('Helvetica')
      .text(`N° Documento: ${pdfNumero}`, { align: 'right' });
    doc.moveDown(0.5);

    // ── TÍTULO ────────────────────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold')
      .text('AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES', { align: 'center' });
    doc.moveDown(1);

    // ── DATOS DEL PROPIETARIO ─────────────────────────────────────
    doc.rect(50, doc.y - 2, 495, 18).fill('#f2f7f2');
    doc.fillColor('#1b5e20').fontSize(11).font('Helvetica-Bold').text('DATOS DEL PROPIETARIO', 56, doc.y + 2);
    doc.fillColor('black');
    doc.moveDown(0.9);
    doc.fontSize(10).font('Helvetica')
      .text(`Nombre:   ${field(cliente.nombre)}`)
      .text(`Cédula:   ${field(cliente.cedula)}`)
      .text(`Teléfono: ${field(cliente.telefono)}`)
      .text(`Email:    ${field(cliente.email)}`);
    doc.moveDown(0.5);

    // ── TEXTO LEGAL ───────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Reemplazar placeholders del texto con datos reales
    const textoFinal = resolveConsentText(textoLegal, empresa);

    doc.fontSize(10).font('Helvetica').text(textoFinal, { align: 'justify', lineGap: 2 });
    doc.moveDown(1);

    // ── FIRMA ─────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('FIRMA DEL PROPIETARIO');
    doc.moveDown(0.3);

    if (consentimiento.firma_imagen) {
      try {
        // Extraer base64 puro (remover prefijo data:image/png;base64,)
        const base64Data = consentimiento.firma_imagen.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, 50, doc.y, { width: 200, height: 80 });
        doc.moveDown(5);
      } catch {
        doc.text('[Firma no disponible]');
        doc.moveDown(1);
      }
    }

    // ── METADATOS DE FIRMA ────────────────────────────────────────
    const fechaFirma = consentimiento.firmado_en
      ? new Date(consentimiento.firmado_en).toLocaleString('es-CO', {
          dateStyle: 'long',
          timeStyle: 'medium',
          timeZone: 'America/Bogota'
        })
      : '-';

    doc.fontSize(9).font('Helvetica')
      .text(`Fecha de firma:  ${fechaFirma}`)
      .text(`IP del firmante: ${consentimiento.ip_firmante || '-'}`)
      .text(`Dispositivo:     ${consentimiento.device_info ? consentimiento.device_info.substring(0, 100) : '-'}`);

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('grey')
      .text(
        `Documento generado automáticamente por ${empresa.nombre_empresa}. ` +
        `Versión del consentimiento: ${consentimiento.id_version}. ` +
        `Documento N°: ${pdfNumero}.`,
        { align: 'center' }
      );

    doc.end();

    stream.on('finish', () => resolve(`uploads/consentimientos/${filename}`));
    stream.on('error', reject);
  });
}

export { generarNumeroPDF, ensurePDFDir };
