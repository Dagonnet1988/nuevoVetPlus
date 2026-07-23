import nodemailer from 'nodemailer';
import { query } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_PUBLIC_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getActiveEmailConfig(tenantId) {
  const result = await query(
    `SELECT *
     FROM system.configuracion_correo
     WHERE id_tenant = $1 AND activa = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  const config = result.rows[0] || null;
  if (!config) return null;

  return config;
}

async function getCompanyBranding(tenantId) {
  const result = await query(
    `SELECT nombre_empresa, direccion, telefono, email, sitio_web, logo_url
     FROM system.configuracion_empresa
     WHERE id_tenant = $1 AND activa = true
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  return result.rows[0] || null;
}

function toAbsoluteUrl(urlValue) {
  const raw = String(urlValue || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${BACKEND_PUBLIC_URL}${raw}`;
  return `${BACKEND_PUBLIC_URL}/${raw}`;
}

function getLogoContentType(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

async function buildInlineLogoAttachment(logoUrl, companyName = 'logo-clinica') {
  const raw = String(logoUrl || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return null;

  const normalized = raw.replace(/^\/+/, '').replace(/^backend\//, '');
  const candidates = [
    path.resolve(__dirname, '../../', normalized),
    path.resolve(__dirname, '../../../', normalized)
  ];

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate);
      return {
        filename: path.basename(candidate) || `${companyName}.png`,
        content,
        contentType: getLogoContentType(candidate),
        cid: 'vetplus-clinic-logo',
        contentDisposition: 'inline'
      };
    } catch {
      // Try next candidate path.
    }
  }

  return null;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCorporateFooterHtml(branding, fallbackName, logoSrc = null) {
  const companyName = String(branding?.nombre_empresa || fallbackName || 'Qi Animal').trim();
  const lines = [
    branding?.direccion,
    branding?.telefono,
    branding?.email,
    branding?.sitio_web
  ].map((value) => String(value || '').trim()).filter(Boolean);

  const detailsHtml = lines.length
    ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; line-height: 1.5;">${lines.map((line) => escapeHtml(line)).join(' | ')}</p>`
    : '';

  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(companyName)}" style="max-height: 42px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />`
    : '';

  return [
    '<div data-vetplus-footer="true" style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb;">',
    logoHtml,
    `<p style="margin: 0; font-size: 12px; color: #374151;"><strong>${escapeHtml(companyName)}</strong></p>`,
    detailsHtml,
    '<p style="margin: 8px 0 0; font-size: 11px; color: #9ca3af;">Este mensaje fue enviado desde Ramelo.</p>',
    '</div>'
  ].join('');
}

function appendCorporateFooterHtml(baseHtml, footerHtml) {
  const html = String(baseHtml || '').trim();
  if (!footerHtml || !html) return html;
  if (html.includes('data-vetplus-footer="true"')) return html;
  if (/este\s+mensaje\s+fue\s+enviado\s+desde\s+vetplus/i.test(html)) return html;
  return `${html}${footerHtml}`;
}

function appendCorporateFooterText(baseText, branding, fallbackName) {
  const text = String(baseText || '').trim();
  if (!text) return text;
  if (/este\s+mensaje\s+fue\s+enviado\s+desde\s+(vetplus|ramelo)/i.test(text)) return text;

  const companyName = String(branding?.nombre_empresa || fallbackName || 'Qi Animal').trim();
  const lines = [
    branding?.direccion,
    branding?.telefono,
    branding?.email,
    branding?.sitio_web
  ].map((value) => String(value || '').trim()).filter(Boolean);

  const footerParts = [`${companyName}`].concat(lines);
  return `${text}\n\n---\n${footerParts.join(' | ')}\nEste mensaje fue enviado desde Ramelo.`;
}

function buildTransport(config) {
  const oauthClientId = config.oauth_client_id || null;
  const oauthClientSecret = config.oauth_client_secret || null;

  if (config.auth_mode === 'gmail_oauth' && config.oauth_refresh_token) {
    if (!oauthClientId || !oauthClientSecret) {
      throw new Error('Faltan credenciales OAuth de Google (client_id/client_secret) para enviar correo');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: config.oauth_email || config.correo_remitente,
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        refreshToken: config.oauth_refresh_token,
        accessToken: config.oauth_access_token || undefined,
        expires: config.oauth_token_expiry ? new Date(config.oauth_token_expiry).getTime() : undefined
      }
    });
  }

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port || 587),
    secure: Boolean(config.smtp_secure),
    auth: {
      user: config.smtp_usuario,
      pass: config.smtp_password
    }
  });
}

function buildFrom(config) {
  if (config.nombre_remitente) {
    return `${config.nombre_remitente} <${config.correo_remitente}>`;
  }
  return config.correo_remitente;
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

function buildEmailSnapshot({ to, subject, text, html, attachments, replyTo }) {
  return {
    to: to || null,
    subject: subject || null,
    text: text || null,
    html: html || null,
    reply_to: replyTo || null,
    attachments: buildAttachmentsSnapshot(attachments)
  };
}

export async function testEmailConnection(tenantId) {
  const config = await getActiveEmailConfig(tenantId);
  if (!config) {
    return { ok: false, message: 'No hay configuración de correo activa para esta clínica' };
  }

  const transporter = buildTransport(config);
  await transporter.verify();
  return {
    ok: true,
    message: config.auth_mode === 'gmail_oauth'
      ? 'Conexión con Google OAuth validada correctamente'
      : 'Conexión SMTP validada correctamente'
  };
}

export async function sendEmail({
  tenantId,
  to,
  subject,
  html,
  text,
  attachments = [],
  logContext = null
}) {
  const config = await getActiveEmailConfig(tenantId);
  if (!config) {
    throw new Error('No hay configuración de correo activa para esta clínica. Configúrala en Configuración > Correo.');
  }

  const branding = await getCompanyBranding(tenantId);
  const companyName = config.nombre_remitente || branding?.nombre_empresa || 'Qi Animal';
  const inlineLogoAttachment = await buildInlineLogoAttachment(branding?.logo_url, companyName);
  const logoSrc = inlineLogoAttachment ? `cid:${inlineLogoAttachment.cid}` : toAbsoluteUrl(branding?.logo_url);
  const footerHtml = buildCorporateFooterHtml(branding, companyName, logoSrc);
  const finalHtml = appendCorporateFooterHtml(html, footerHtml);
  const finalText = appendCorporateFooterText(text, branding, companyName);
  const finalAttachments = inlineLogoAttachment
    ? [...(attachments || []), inlineLogoAttachment]
    : attachments;

  const transporter = buildTransport(config);
  const emailSnapshot = buildEmailSnapshot({
    to,
    subject,
    text: finalText,
    html: finalHtml,
    attachments: finalAttachments,
    replyTo: config.correo_respuesta || null
  });

  const info = await transporter.sendMail({
    from: buildFrom(config),
    to,
    replyTo: config.correo_respuesta || undefined,
    subject,
    text: finalText,
    html: finalHtml,
    attachments: finalAttachments
  });

  if (logContext && logContext.tipo_envio) {
    const logMetadata = {
      ...(logContext.metadata || {}),
      email_snapshot: emailSnapshot,
      retry_payload: {
        to,
        subject,
        text: finalText || null,
        html: finalHtml || null
      }
    };

    await query(
      `INSERT INTO system.email_delivery_log (
         tipo_envio,
         destinatario_email,
         asunto,
         estado,
         provider_message_id,
         metadata,
         id_tenant,
         created_by,
         sent_at
       ) VALUES (
         $1,$2,$3,'enviado',$4,$5::jsonb,$6,$7,NOW()
       )`,
      [
        logContext.tipo_envio,
        to,
        subject,
        info.messageId || null,
        JSON.stringify(logMetadata),
        tenantId,
        logContext.userId || null
      ]
    );
  }

  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    emailSnapshot
  };
}

export async function getSafeEmailConfig(tenantId) {
  const config = await getActiveEmailConfig(tenantId);
  if (!config) return null;

  return {
    id_config_correo: config.id_config_correo,
    proveedor: config.proveedor,
    auth_mode: config.auth_mode || 'smtp',
    nombre_remitente: config.nombre_remitente,
    correo_remitente: config.correo_remitente,
    correo_respuesta: config.correo_respuesta,
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port,
    smtp_secure: config.smtp_secure,
    smtp_usuario: config.smtp_usuario,
    tiene_password: Boolean(config.smtp_password),
    oauth_email: config.oauth_email,
    oauth_connected: Boolean(config.oauth_refresh_token),
    oauth_client_id: config.oauth_client_id,
    oauth_client_secret: config.oauth_client_secret ? '***' : null,
    oauth_redirect_uri: config.oauth_redirect_uri,
    activa: config.activa,
    created_at: config.created_at,
    updated_at: config.updated_at
  };
}
