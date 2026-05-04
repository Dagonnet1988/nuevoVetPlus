import nodemailer from 'nodemailer';
import { query } from '../config/database.js';

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

  if (!config.oauth_client_id || !config.oauth_client_secret) {
    const calendarCfg = await query(
      `SELECT gc.client_id, gc.client_secret
       FROM vetplus_auth.google_calendar_config gc
       WHERE gc.is_active = true
         AND gc.configured_by IN (
           SELECT u.id_usuario
           FROM vetplus_auth.usuarios u
           WHERE u.id_tenant = $1
         )
       ORDER BY gc.created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (calendarCfg.rows.length) {
      config.oauth_client_id = config.oauth_client_id || calendarCfg.rows[0].client_id;
      config.oauth_client_secret = config.oauth_client_secret || calendarCfg.rows[0].client_secret;
    }
  }

  return config;
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

export async function testEmailConnection(tenantId) {
  const config = await getActiveEmailConfig(tenantId);
  if (!config) {
    return { ok: false, message: 'No hay configuración de correo activa para este tenant' };
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
  attachments = []
}) {
  const config = await getActiveEmailConfig(tenantId);
  if (!config) {
    throw new Error('No hay configuración de correo activa para este tenant');
  }

  const transporter = buildTransport(config);
  const info = await transporter.sendMail({
    from: buildFrom(config),
    to,
    replyTo: config.correo_respuesta || undefined,
    subject,
    text,
    html,
    attachments
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || []
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
