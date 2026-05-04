import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { sendEmail } from '../services/emailService.js';
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
       CASE WHEN $7 = 'enviado' THEN NOW() ELSE NULL END
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

  if (!consentResult.rows.length) {
    return null;
  }

  const consent = consentResult.rows[0];
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

      const sendResult = await sendEmail({
        tenantId,
        to: targetEmail,
        subject,
        text: `Hola ${nombre}, adjuntamos el consentimiento firmado en formato PDF.`,
        html: `<p>Hola ${nombre},</p><p>Adjuntamos el consentimiento firmado en formato PDF.</p>`,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
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
        metadata: { mode: 'pdf' }
      });

      return res.json({
        success: true,
        message: 'Consentimiento enviado por correo en formato PDF',
        data: { mode: 'pdf', to: targetEmail }
      });
    }

    const firmaUrl = `${FRONTEND_URL}/consentimiento/${resolved.consent.token}`;
    const qrBuffer = await QRCode.toBuffer(firmaUrl, { width: 256, margin: 1 });
    const subject = `Firma de consentimiento - ${nombre}`;

    const sendResult = await sendEmail({
      tenantId,
      to: targetEmail,
      subject,
      text:
        `Hola ${nombre}, por favor firma tu consentimiento en este enlace: ${firmaUrl}` +
        `\nVigente hasta: ${new Date(resolved.consent.token_expires_at).toLocaleString('es-CO')}`,
      html:
        `<p>Hola ${nombre},</p>` +
        `<p>Por favor firma tu consentimiento en este enlace:</p>` +
        `<p><a href="${firmaUrl}">${firmaUrl}</a></p>` +
        `<p>También adjuntamos el código QR para escanearlo.</p>` +
        `<p>Vigente hasta: ${new Date(resolved.consent.token_expires_at).toLocaleString('es-CO')}</p>`,
      attachments: [
        {
          filename: 'consentimiento-qr.png',
          content: qrBuffer,
          contentType: 'image/png'
        }
      ]
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
      metadata: { mode: 'link', firmaUrl }
    });

    return res.json({
      success: true,
      message: 'Consentimiento enviado por correo con enlace y QR',
      data: {
        mode: 'link',
        to: targetEmail,
        expiresAt: resolved.consent.token_expires_at
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
        metadata: { source: 'sendConsentEmail' }
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

  try {
    const historiaResult = await query(
      `SELECT h.id_historia, h.codigo_historia, h.tipo_documento,
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
    const subject = `Historia clínica ${historia.codigo_historia}`;

    const sendResult = await sendEmail({
      tenantId,
      to: targetEmail,
      subject,
      text: `Hola ${historia.cliente_nombre || 'propietario'}, adjuntamos la historia clínica ${historia.codigo_historia}.`,
      html:
        `<p>Hola ${historia.cliente_nombre || 'propietario'},</p>` +
        `<p>Adjuntamos la historia clínica <strong>${historia.codigo_historia}</strong> en formato PDF.</p>`,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
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
      metadata: { codigo_historia: historia.codigo_historia, tipo_documento: historia.tipo_documento }
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
        metadata: { source: 'sendHistoriaEmail' }
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
