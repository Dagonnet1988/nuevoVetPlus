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

/**
 * Obtiene los datos de la empresa para el encabezado del PDF
 */
async function getEmpresaData() {
  try {
    const result = await query(
      `SELECT nombre_empresa, nit, direccion, telefono, email, ciudad,
              representante_legal, logo_url
       FROM system.configuracion_empresa
       WHERE activa = true
       LIMIT 1`
    );
    return result.rows[0] || {
      nombre_empresa: 'VetPlus - Clínica Veterinaria',
      nit: '-',
      direccion: '-',
      telefono: '-',
      email: '-',
      ciudad: ''
    };
  } catch {
    return {
      nombre_empresa: 'VetPlus - Clínica Veterinaria',
      nit: '-',
      direccion: '-',
      telefono: '-',
      email: '-',
      ciudad: ''
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
 * @param {Object} params
 * @param {Object} params.consentimiento - Fila de clinical.consentimientos
 * @param {Object} params.cliente        - Fila de clinical.clientes
 * @param {Object} params.mascota        - Fila de clinical.mascotas (primera mascota activa)
 * @param {string} params.textoLegal     - Texto de clinical.versiones_consentimiento
 * @param {string} params.pdfNumero      - Número único del documento
 * @returns {Promise<string>} Ruta relativa del PDF guardado
 */
export async function generarPDFConsentimiento({ consentimiento, cliente, mascota, textoLegal, pdfNumero }) {
  ensurePDFDir();

  const empresa = await getEmpresaData();
  const filename = `${pdfNumero}.pdf`;
  const filepath = path.join(PDF_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // ── ENCABEZADO ────────────────────────────────────────────────
    // Logo si existe
    if (empresa.logo_url) {
      const logoPath = path.join(__dirname, '../../', empresa.logo_url);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 40, { width: 80 });
        doc.moveDown(0.5);
      }
    }

    doc.fontSize(16).font('Helvetica-Bold')
      .text(empresa.nombre_empresa, { align: 'center' });
    doc.fontSize(10).font('Helvetica')
      .text(`NIT: ${empresa.nit}`, { align: 'center' })
      .text(empresa.direccion, { align: 'center' })
      .text(`${empresa.ciudad}${empresa.telefono ? ' | Tel: ' + empresa.telefono : ''}`, { align: 'center' });

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
    doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL PROPIETARIO');
    doc.fontSize(10).font('Helvetica')
      .text(`Nombre:   ${cliente.nombre}`)
      .text(`Cédula:   ${cliente.cedula || 'No registrada'}`)
      .text(`Teléfono: ${cliente.telefono || 'No registrado'}`)
      .text(`Email:    ${cliente.email || 'No registrado'}`);
    doc.moveDown(0.5);

    // ── DATOS DE LA MASCOTA ───────────────────────────────────────
    if (mascota) {
      doc.fontSize(11).font('Helvetica-Bold').text('DATOS DE LA MASCOTA');
      doc.fontSize(10).font('Helvetica')
        .text(`Nombre:  ${mascota.nombre}`)
        .text(`Especie: ${mascota.especie}${mascota.raza ? ' - ' + mascota.raza : ''}`);
      doc.moveDown(0.5);
    }

    // ── TEXTO LEGAL ───────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Reemplazar placeholders del texto con datos reales
    const textoFinal = textoLegal
      .replace(/\[NOMBRE_CLINICA\]/g, empresa.nombre_empresa)
      .replace(/\[NIT\]/g, empresa.nit)
      .replace(/\[DIRECCION\]/g, empresa.direccion)
      .replace(/\[EMAIL_CLINICA\]/g, empresa.email || 'soporte@vetplus.com');

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
