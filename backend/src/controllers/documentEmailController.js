import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { sendEmail } from '../services/emailService.js';
import { renderEmailTemplate } from '../services/emailTemplateService.js';
import { generarPDFHistoria } from '../services/historiaClinicaPDFService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const TOKEN_DURATION_HOURS = parseInt(process.env.CONSENT_TOKEN_HOURS ?? '48', 10);

async function logEmailDelivery({
  tenantId,
  userId,
  tipoDocumento,
  idCliente = null,
  idHistoria = null,
  idConsentimiento = null,
  destinatarioEmail,
  asunto,
  estado,
  providerMessageId = null,
  detalleError = null,
  metadata = {}
}) {
  await query(
    `INSERT INTO clinical.envios_documentos (
       tipo_documento, canal, id_cliente, id_historia, id_consentimiento,
       destinatario_email, asunto, estado, provider_message_id, detalle_error,
       metadata, id_tenant, created_by, sent_at
     ) VALUES (
       $1, 'email', $2, $3, $4,
       $5, $6, $7, $8, $9,
       $10::jsonb, $11, $12,
       CASE WHEN $7::varchar = 'enviado'::varchar THEN NOW() ELSE NULL END
     )`,
    [
      tipoDocumento,
      idCliente,
      idHistoria,
      idConsentimiento,
      destinatarioEmail,
      asunto,
      estado,
      providerMessageId,
      detalleError,
      JSON.stringify(metadata || {}),
      tenantId,
      userId
    ]
  );
}

function buildHistoryPdfName(codigo) {
  const safe = String(codigo || 'historia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safe || 'historia'}.pdf`;
}

function getTipoDocumentoLabel(tipoDocumento) {
  return ({
    valoracion_inicial: 'Valoración inicial',
    seguimiento: 'Seguimiento',
    formula: 'Fórmula médica',
    remision: 'Remisión'
  })[tipoDocumento] || tipoDocumento || 'Documento clínico';
}

function formatDocumentDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildAttachmentsSnapshot(attachments = []) {
  return (attachments || []).map((attachment) => ({
    filename: attachment?.filename || null,
    contentType: attachment?.contentType || null,
    size: typeof attachment?.content === 'string'
      ? attachment.content.length
      : (Buffer.isBuffer(attachment?.content) ? attachment.content.length : null)
  }));
}

function buildEmailSnapshot({ to, subject, text, html, attachments = [] }) {
  return {
    to: to || null,
    subject: subject || null,
    text: text || null,
    html: html || null,
    attachments: buildAttachmentsSnapshot(attachments)
  };
}

async function getClinicName(tenantId) {
  try {
    const result = await query(
      `SELECT nombre_empresa
       FROM system.configuracion_empresa
       WHERE activa = true AND id_tenant = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    return result.rows[0]?.nombre_empresa || process.env.CLINIC_NAME || 'VetPlus Clínica';
  } catch {
    return process.env.CLINIC_NAME || 'VetPlus Clínica';
  }
}

async function resolveConsentForEmail(idCliente, tenantId, userId) {
  const consentResult = await query(
    `SELECT c.id_consentimiento, c.id_cliente, c.id_version, c.estado, c.token, c.token_expires_at,
            c.pdf_path, c.pdf_numero,
            cl.nombre AS cliente_nombre, cl.email AS cliente_email
     FROM clinical.consentimientos c
     JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente
     WHERE c.id_cliente = $1 AND c.id_tenant = $2
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [idCliente, tenantId]
  );

  let consent = consentResult.rows[0] || null;

  if (!consent) {
    const clientResult = await query(
      `SELECT id_cliente, nombre AS cliente_nombre, email AS cliente_email
       FROM clinical.clientes
       WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true
       LIMIT 1`,
      [idCliente, tenantId]
    );

    if (!clientResult.rows.length) {
      return null;
    }

    consent = {
      id_cliente: clientResult.rows[0].id_cliente,
      cliente_nombre: clientResult.rows[0].cliente_nombre,
      cliente_email: clientResult.rows[0].cliente_email,
      estado: 'sin_consentimiento'
    };
  }

  const now = new Date();

  if (consent.estado === 'firmado' && consent.pdf_path) {
    return { mode: 'pdf', consent };
  }

  if (consent.estado === 'pendiente' && consent.token && consent.token_expires_at && new Date(consent.token_expires_at) > now) {
    return { mode: 'link', consent };
  }

  const versionResult = await query(
    `SELECT id_version
     FROM clinical.versiones_consentimiento
     WHERE activa = true AND id_tenant = $1
     LIMIT 1`,
    [tenantId]
  );

  if (!versionResult.rows.length) {
    throw new Error('No hay versión activa de consentimiento para generar enlace');
  }

  await query(
    `UPDATE clinical.consentimientos
     SET estado = 'expirado'
     WHERE id_cliente = $1 AND id_tenant = $2 AND estado = 'pendiente'`,
    [idCliente, tenantId]
  );

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + TOKEN_DURATION_HOURS * 60 * 60 * 1000);

  const insert = await query(
    `INSERT INTO clinical.consentimientos (
       id_cliente, id_version, estado, token, token_expires_at, created_by, id_tenant
     ) VALUES ($1, $2, 'pendiente', $3, $4, $5, $6)
     RETURNING id_consentimiento, id_cliente, estado, token, token_expires_at, pdf_path, pdf_numero`,
    [idCliente, versionResult.rows[0].id_version, token, expiresAt, userId, tenantId]
  );

  const generated = {
    ...insert.rows[0],
    cliente_nombre: consent.cliente_nombre,
    cliente_email: consent.cliente_email
  };

  return { mode: 'link', consent: generated };
}

export async function sendConsentEmail(req, res) {
  const tenantId = req.tenantId ?? req.user?.tenant_id;
  const userId = req.user?.id_usuario || req.user?.id || null;
  const { idCliente } = req.params;
  let retryPayload = null;

  try {
    const resolved = await resolveConsentForEmail(idCliente, tenantId, userId);
    if (!resolved) {
      return res.status(404).json({ success: false, message: 'No se encontró consentimiento para el cliente' });
    }

    const targetEmail = (req.body?.email_destino || resolved.consent.cliente_email || '').trim();
    if (!targetEmail) {
      return res.status(422).json({ success: false, message: 'El cliente no tiene correo para envío' });
    }

    const nombre = resolved.consent.cliente_nombre || 'propietario';

    if (resolved.mode === 'pdf') {
      const absolutePath = path.join(__dirname, '../../', resolved.consent.pdf_path);
      const pdfBuffer = await fs.readFile(absolutePath);
      const fileName = `consentimiento-${resolved.consent.pdf_numero || resolved.consent.id_consentimiento}.pdf`;
      const subject = `Consentimiento firmado - ${nombre}`;
      const textBody = `Hola ${nombre}, adjuntamos el consentimiento firmado en formato PDF.`;
      const htmlBody = `<p>Hola ${nombre},</p><p>Adjuntamos el consentimiento firmado en formato PDF.</p>`;
      const attachments = [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];

      retryPayload = {
        to: targetEmail,
        subject,
        text: textBody,
        html: htmlBody
      };

      const sendResult = await sendEmail({
        tenantId,
        to: targetEmail,
        subject,
        text: textBody,
        html: htmlBody,
        attachments
      });

      await query(
        'UPDATE clinical.consentimientos SET email_enviado = true WHERE id_consentimiento = $1',
        [resolved.consent.id_consentimiento]
      );

      await logEmailDelivery({
        tenantId,
        userId,
        tipoDocumento: 'consentimiento_pdf',
        idCliente,
        idConsentimiento: resolved.consent.id_consentimiento,
        destinatarioEmail: targetEmail,
        asunto: subject,
        estado: 'enviado',
        providerMessageId: sendResult.messageId,
        metadata: {
          mode: 'pdf',
             email_snapshot: sendResult?.emailSnapshot || null,
          retry_payload: retryPayload,
          id_cliente: idCliente,
          id_consentimiento: resolved.consent.id_consentimiento
        }
      });

      return res.json({
        success: true,
        message: 'Consentimiento enviado por correo en formato PDF',
        data: { mode: 'pdf', to: targetEmail }
      });
    }

    const firmaUrl = `${FRONTEND_URL}/consentimiento/${resolved.consent.token}`;
    const qrBase64 = await QRCode.toDataURL(firmaUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256
    });
    const subject = `Firma de consentimiento - ${nombre}`;
    const textBody =
      `Hola ${nombre}, por favor firma tu consentimiento en este enlace: ${firmaUrl}` +
      `\nVigente hasta: ${new Date(resolved.consent.token_expires_at).toLocaleString('es-CO')}`;
    const htmlBody =
      `<p>Hola ${nombre},</p>` +
      `<p>Por favor firma tu consentimiento en este enlace:</p>` +
      `<p><a href="${firmaUrl}">${firmaUrl}</a></p>` +
      `<p>También puedes escanear este código QR:</p>` +
      `<p><img src="${qrBase64}" alt="QR de firma de consentimiento" width="220" height="220" style="max-width:220px;height:auto;border:1px solid #e5e7eb;border-radius:8px;" /></p>` +
      `<p>Vigente hasta: ${new Date(resolved.consent.token_expires_at).toLocaleString('es-CO')}</p>`;
    const attachments = [];

    retryPayload = {
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody
    };

    const sendResult = await sendEmail({
      tenantId,
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments
    });

    await query(
      'UPDATE clinical.consentimientos SET email_enviado = true WHERE id_consentimiento = $1',
      [resolved.consent.id_consentimiento]
    );

    await logEmailDelivery({
      tenantId,
      userId,
      tipoDocumento: 'consentimiento_link',
      idCliente,
      idConsentimiento: resolved.consent.id_consentimiento,
      destinatarioEmail: targetEmail,
      asunto: subject,
      estado: 'enviado',
      providerMessageId: sendResult.messageId,
        metadata: {
          mode: 'link',
          firmaUrl,
           email_snapshot: sendResult?.emailSnapshot || null,
          retry_payload: retryPayload,
          id_cliente: idCliente,
          id_consentimiento: resolved.consent.id_consentimiento
        }
    });

    return res.json({
      success: true,
      message: 'Consentimiento enviado por correo con enlace y QR',
      data: {
        mode: 'link',
        to: targetEmail,
        expiresAt: resolved.consent.token_expires_at,
        firmaUrl,
        qrBase64,
        clienteNombre: nombre
      }
    });
  } catch (error) {
    console.error('Error enviando consentimiento por correo:', error);

    try {
      await logEmailDelivery({
        tenantId,
        userId,
        tipoDocumento: 'consentimiento_link',
        idCliente,
        destinatarioEmail: req.body?.email_destino || 'sin-destino',
        asunto: 'Envío consentimiento',
        estado: 'fallido',
        detalleError: error.message,
        metadata: {
          source: 'sendConsentEmail',
          retry_payload: retryPayload,
          id_cliente: idCliente
        }
      });
    } catch (logError) {
      console.error('Error registrando log de envío fallido:', logError);
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'No se pudo enviar el consentimiento por correo'
    });
  }
}

export async function sendHistoriaEmail(req, res) {
  const tenantId = req.tenantId ?? req.user?.tenant_id;
  const userId = req.user?.id_usuario || req.user?.id || null;
  const { idHistoria } = req.params;
  let retryPayload = null;

  try {
    const historiaResult = await query(
      `SELECT h.id_historia, h.codigo_historia, h.tipo_documento,
              h.fecha,
              m.nombre AS mascota_nombre,
              cl.id_cliente, cl.nombre AS cliente_nombre, cl.email AS cliente_email
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes cl ON cl.id_cliente = m.id_cliente
       WHERE h.id_historia = $1 AND h.id_tenant = $2
       LIMIT 1`,
      [idHistoria, tenantId]
    );

    if (!historiaResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Historia clínica no encontrada' });
    }

    const historia = historiaResult.rows[0];
    const targetEmail = (req.body?.email_destino || historia.cliente_email || '').trim();
    if (!targetEmail) {
      return res.status(422).json({ success: false, message: 'El cliente no tiene correo para envío' });
    }

    const pdfBuffer = await generarPDFHistoria(idHistoria, tenantId);
    const fileName = buildHistoryPdfName(historia.codigo_historia);
    const tipoDocumentoLabel = getTipoDocumentoLabel(historia.tipo_documento);
    const rendered = await renderEmailTemplate({
      tenantId,
      key: 'documento_clinico_pdf',
      userId,
      variables: {
        cliente_nombre: historia.cliente_nombre || 'propietario',
        mascota_nombre: historia.mascota_nombre || 'mascota',
        tipo_documento: tipoDocumentoLabel,
        codigo_documento: historia.codigo_historia,
        fecha_documento: formatDocumentDate(historia.fecha),
        clinica_nombre: await getClinicName(tenantId)
      }
    });

    const subject = rendered?.asunto_render || `${tipoDocumentoLabel} ${historia.codigo_historia}`;
    const textBody = rendered?.cuerpo_text_render || `Hola ${historia.cliente_nombre || 'propietario'}, adjuntamos ${tipoDocumentoLabel} ${historia.codigo_historia}.`;
    const htmlBody = rendered?.cuerpo_html_render ||
      `<p>Hola ${historia.cliente_nombre || 'propietario'},</p>` +
      `<p>Adjuntamos <strong>${tipoDocumentoLabel} ${historia.codigo_historia}</strong> en formato PDF.</p>`;
    const attachments = [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];

    retryPayload = {
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody
    };

    const sendResult = await sendEmail({
      tenantId,
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments
    });

    await logEmailDelivery({
      tenantId,
      userId,
      tipoDocumento: 'historia_pdf',
      idCliente: historia.id_cliente,
      idHistoria,
      destinatarioEmail: targetEmail,
      asunto: subject,
      estado: 'enviado',
      providerMessageId: sendResult.messageId,
      metadata: {
        codigo_historia: historia.codigo_historia,
        tipo_documento: historia.tipo_documento,
           email_snapshot: sendResult?.emailSnapshot || null,
        retry_payload: retryPayload,
        id_historia: idHistoria,
        id_cliente: historia.id_cliente
      }
    });

    return res.json({
      success: true,
      message: 'Historia clínica enviada por correo',
      data: { to: targetEmail, codigo_historia: historia.codigo_historia }
    });
  } catch (error) {
    console.error('Error enviando historia clínica por correo:', error);

    try {
      await logEmailDelivery({
        tenantId,
        userId,
        tipoDocumento: 'historia_pdf',
        idHistoria,
        destinatarioEmail: req.body?.email_destino || 'sin-destino',
        asunto: 'Envío historia clínica',
        estado: 'fallido',
        detalleError: error.message,
        metadata: {
          source: 'sendHistoriaEmail',
          retry_payload: retryPayload,
          id_historia: idHistoria
        }
      });
    } catch (logError) {
      console.error('Error registrando log de envío fallido:', logError);
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'No se pudo enviar la historia clínica por correo'
    });
  }
}

export async function sendAppointmentDocumentsEmail(req, res) {
  const tenantId = req.tenantId ?? req.user?.tenant_id;
  const userId = req.user?.id_usuario || req.user?.id || null;
  const { idCita } = req.params;
  let retryPayload = null;

  try {
    const docsResult = await query(
      `SELECT h.id_historia, h.codigo_historia, h.tipo_documento, h.fecha, h.created_at,
              m.nombre AS mascota_nombre,
              cl.id_cliente, cl.nombre AS cliente_nombre, cl.email AS cliente_email
       FROM clinical.historias_clinicas h
       JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
       JOIN clinical.clientes cl ON cl.id_cliente = m.id_cliente
       WHERE h.id_tenant = $1
         AND h.id_cita = $2
         AND h.estado <> 'Cancelado'
       ORDER BY h.created_at ASC`,
      [tenantId, idCita]
    );

    const docs = docsResult.rows || [];
    if (!docs.length) {
      return res.status(404).json({ success: false, message: 'No hay documentos clínicos para esta cita' });
    }

    const targetEmail = (req.body?.email_destino || docs[0].cliente_email || '').trim();
    if (!targetEmail) {
      return res.status(422).json({ success: false, message: 'El cliente no tiene correo para envío' });
    }

    const clienteNombre = docs[0].cliente_nombre || 'propietario';
    const mascotaNombre = docs[0].mascota_nombre || 'mascota';
    const fechaCita = formatDocumentDate(docs[0].fecha);
    const subject = `Documentos clínicos de cita - ${mascotaNombre}`;

    const attachments = [];
    for (const doc of docs) {
      const pdfBuffer = await generarPDFHistoria(doc.id_historia, tenantId);
      attachments.push({
        filename: buildHistoryPdfName(doc.codigo_historia),
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const docsListText = docs
      .map((d, idx) => `${idx + 1}. ${getTipoDocumentoLabel(d.tipo_documento)} (${d.codigo_historia})`)
      .join('\n');
    const docsListHtml = docs
      .map((d, idx) => `<li>${idx + 1}. ${getTipoDocumentoLabel(d.tipo_documento)} (${d.codigo_historia})</li>`)
      .join('');

    const textBody =
      `Hola ${clienteNombre},\n` +
      `Te compartimos los documentos clínicos de la cita de ${mascotaNombre}` +
      `${fechaCita ? ` del ${fechaCita}` : ''}:\n` +
      `${docsListText}\n\n` +
      'Si requieres ayuda con algo responde este mensaje y te apoyamos.';

    const htmlBody =
      `<p>Hola ${clienteNombre},</p>` +
      `<p>Te compartimos los documentos clínicos de la cita de <strong>${mascotaNombre}</strong>${fechaCita ? ` del <strong>${fechaCita}</strong>` : ''}:</p>` +
      `<ol>${docsListHtml}</ol>` +
      `<p>Si requieres ayuda con algo responde este mensaje y te apoyamos.</p>`;

    retryPayload = {
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody
    };

    const sendResult = await sendEmail({
      tenantId,
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments
    });

    await logEmailDelivery({
      tenantId,
      userId,
      tipoDocumento: 'historia_pdf',
      idCliente: docs[0].id_cliente,
      idHistoria: null,
      destinatarioEmail: targetEmail,
      asunto: subject,
      estado: 'enviado',
      providerMessageId: sendResult.messageId,
      metadata: {
        mode: 'lote_cita',
        id_cita: idCita,
        total_documentos: docs.length,
        documentos: docs.map((d) => ({
          id_historia: d.id_historia,
          codigo_historia: d.codigo_historia,
          tipo_documento: d.tipo_documento
        })),
        email_snapshot: sendResult?.emailSnapshot || null,
        retry_payload: retryPayload,
        id_cliente: docs[0].id_cliente
      }
    });

    return res.json({
      success: true,
      message: `Se enviaron ${docs.length} documento(s) en un solo correo`,
      data: {
        to: targetEmail,
        total_documentos: docs.length,
        id_cita: idCita
      }
    });
  } catch (error) {
    console.error('Error enviando documentos de cita por correo:', error);

    try {
      await logEmailDelivery({
        tenantId,
        userId,
        tipoDocumento: 'historia_pdf',
        destinatarioEmail: req.body?.email_destino || 'sin-destino',
        asunto: 'Envío documentos de cita',
        estado: 'fallido',
        detalleError: error.message,
        metadata: {
          source: 'sendAppointmentDocumentsEmail',
          retry_payload: retryPayload,
          id_cita: idCita
        }
      });
    } catch (logError) {
      console.error('Error registrando log de envío fallido de documentos de cita:', logError);
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'No se pudieron enviar los documentos de la cita'
    });
  }
}
