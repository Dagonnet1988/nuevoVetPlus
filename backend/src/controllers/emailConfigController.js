import { validationResult } from 'express-validator/lib/index.js';
import { getClient, query } from '../config/database.js';
import { getSafeEmailConfig, testEmailConnection, sendEmail } from '../services/emailService.js';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

const OAUTH_SCOPE = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const STATE_SECRET = process.env.JWT_SECRET || 'vetplus_dev_only_secret_do_not_use_in_prod';

async function resolveGoogleOAuthCredentials(tenantId, configRow = null) {
  let calendarClientId = null;
  let calendarClientSecret = null;

  if (!configRow?.oauth_client_id || !configRow?.oauth_client_secret) {
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
      calendarClientId = calendarCfg.rows[0].client_id || null;
      calendarClientSecret = calendarCfg.rows[0].client_secret || null;
    }
  }

  return {
    clientId: configRow?.oauth_client_id || calendarClientId,
    clientSecret: configRow?.oauth_client_secret || calendarClientSecret
  };
}

async function ensureEmailConfigStructure() {
  // No-op: en despliegues nuevos, la estructura vive en schemas/06_empresa_config.sql.
  return true;
}

function getOAuthRedirectUri() {
  const backendBase = process.env.BACKEND_URL || 'http://localhost:3000';
  return `${backendBase}/api/admin/email/google/callback`;
}

export async function getEmailConfig(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const config = await getSafeEmailConfig(tenantId);
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error obteniendo configuración de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function upsertEmailConfig(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: errors.array()
    });
  }

  const tenantId = req.tenantId ?? req.user?.tenant_id;
  const userId = req.user?.id_usuario || req.user?.id || null;

  await ensureEmailConfigStructure();

  const {
    proveedor = 'smtp',
    auth_mode = 'smtp',
    nombre_remitente,
    correo_remitente,
    correo_respuesta,
    smtp_host,
    smtp_port = 587,
    smtp_secure = false,
    smtp_usuario,
    smtp_password,
    oauth_client_id,
    oauth_client_secret,
    oauth_email
  } = req.body;

  const tx = await getClient();
  try {
    await tx.query('BEGIN');

    const existing = await tx.query(
      `SELECT *
       FROM system.configuracion_correo
       WHERE id_tenant = $1 AND activa = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    const current = existing.rows[0] || null;
    const passwordToSave = (typeof smtp_password === 'string' && smtp_password.trim().length > 0)
      ? smtp_password.trim()
      : current?.smtp_password;

    const oauthClientIdToSave = (typeof oauth_client_id === 'string' && oauth_client_id.trim().length > 0)
      ? oauth_client_id.trim()
      : current?.oauth_client_id;

    const oauthClientSecretToSave = (typeof oauth_client_secret === 'string' && oauth_client_secret.trim().length > 0)
      ? oauth_client_secret.trim()
      : current?.oauth_client_secret;

    const oauthResolved = await resolveGoogleOAuthCredentials(tenantId, {
      oauth_client_id: oauthClientIdToSave,
      oauth_client_secret: oauthClientSecretToSave
    });

    if (auth_mode === 'smtp' && !passwordToSave) {
      await tx.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'La contraseña SMTP es obligatoria para crear la configuración inicial'
      });
    }

    if (auth_mode === 'gmail_oauth' && (!oauthResolved.clientId || !oauthResolved.clientSecret)) {
      await tx.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Para Google OAuth faltan credenciales. Define EMAIL_GOOGLE_CLIENT_ID y EMAIL_GOOGLE_CLIENT_SECRET en el backend o guárdalas en configuración.'
      });
    }

    await tx.query(
      'UPDATE system.configuracion_correo SET activa = false, updated_at = NOW(), updated_by = $1 WHERE id_tenant = $2 AND activa = true',
      [userId, tenantId]
    );

    const result = await tx.query(
      `INSERT INTO system.configuracion_correo (
         proveedor, auth_mode, nombre_remitente, correo_remitente, correo_respuesta,
         smtp_host, smtp_port, smtp_secure, smtp_usuario, smtp_password,
         oauth_client_id, oauth_client_secret, oauth_refresh_token, oauth_access_token,
         oauth_token_expiry, oauth_email, oauth_redirect_uri,
         activa, id_tenant, created_by, updated_by
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,$9,$10,
         $11,$12,$13,$14,
         $15,$16,$17,
         true,$18,$19,$19
       )
       RETURNING id_config_correo`,
      [
        proveedor,
        auth_mode,
        nombre_remitente || null,
        correo_remitente,
        correo_respuesta || null,
        auth_mode === 'smtp' ? smtp_host : null,
        auth_mode === 'smtp' ? Number(smtp_port) : 587,
        auth_mode === 'smtp' ? Boolean(smtp_secure) : false,
        auth_mode === 'smtp' ? smtp_usuario : null,
        auth_mode === 'smtp' ? passwordToSave : null,
        oauthResolved.clientId || null,
        oauthResolved.clientSecret || null,
        current?.oauth_refresh_token || null,
        current?.oauth_access_token || null,
        current?.oauth_token_expiry || null,
        oauth_email || current?.oauth_email || correo_remitente,
        getOAuthRedirectUri(),
        tenantId,
        userId
      ]
    );

    await tx.query('COMMIT');

    const config = await getSafeEmailConfig(tenantId);
    return res.json({
      success: true,
      message: 'Configuración de correo guardada correctamente',
      data: {
        id_config_correo: result.rows[0].id_config_correo,
        ...config
      }
    });
  } catch (error) {
    try { await tx.query('ROLLBACK'); } catch {}
    console.error('Error guardando configuración de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  } finally {
    tx.release();
  }
}

export async function testEmailConfig(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const destination = req.body?.email_prueba || req.user?.email;
    const currentConfig = await getSafeEmailConfig(tenantId);

    if (!destination) {
      return res.status(400).json({ success: false, message: 'No se encontró correo de destino para la prueba' });
    }

    await testEmailConnection(tenantId);

    await sendEmail({
      tenantId,
      to: destination,
      subject: 'Prueba de configuración de correo - VetPlus',
      text: 'Este correo confirma que la configuración SMTP quedó activa en VetPlus.',
      html: '<p>Este correo confirma que la configuración SMTP quedó activa en <strong>VetPlus</strong>.</p>'
    });

    return res.json({
      success: true,
      message: `Correo de prueba enviado a ${destination}`
    });
  } catch (error) {
    console.error('Error probando configuración de correo:', error);

    const isAuthError = error?.code === 'EAUTH' || error?.responseCode === 535;
    const responseText = String(error?.response || '').toLowerCase();
    const isGmailAuthError = responseText.includes('gmail') || responseText.includes('gsmtp');
    const isXOAuth2 = String(error?.command || '').toUpperCase().includes('XOAUTH2');
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const currentConfig = await getSafeEmailConfig(tenantId);

    if (isAuthError && isGmailAuthError && isXOAuth2 && currentConfig?.auth_mode === 'gmail_oauth') {
      return res.status(400).json({
        success: false,
        message:
          'Google OAuth rechazó el envío (credenciales/token no coinciden). Desconecta Google y vuelve a conectar para regenerar tokens con el Client ID/Secret actual.'
      });
    }

    if (isAuthError && isGmailAuthError) {
      return res.status(400).json({
        success: false,
        message:
          'Autenticación SMTP rechazada por Gmail (535). Usa contraseña de aplicación (App Password), no la contraseña normal de la cuenta. Revisa también host smtp.gmail.com, puerto 587, secure=false y usuario completo.'
      });
    }

    if (isAuthError) {
      return res.status(400).json({
        success: false,
        message:
          'Autenticación SMTP rechazada. Verifica usuario/contraseña SMTP, host, puerto y tipo de seguridad (SSL/TLS).'
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'No fue posible validar el servicio de correo'
    });
  }
}

export async function getEmailModuleStatus(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const config = await getSafeEmailConfig(tenantId);

    const stats = await query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE estado = 'enviado') AS enviados,
         COUNT(*) FILTER (WHERE estado = 'fallido') AS fallidos
       FROM clinical.envios_documentos
       WHERE id_tenant = $1`,
      [tenantId]
    );

    return res.json({
      success: true,
      data: {
        configured: Boolean(config),
        config,
        stats: stats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado del módulo de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function getGoogleEmailAuthUrl(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id;
    const userEmail = req.user?.email || null;

    const current = await query(
      `SELECT oauth_client_id, oauth_client_secret
       FROM system.configuracion_correo
       WHERE id_tenant = $1 AND activa = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (!current.rows.length) {
      if (!userEmail) {
        return res.status(400).json({
          success: false,
          message: 'No hay configuración activa y no fue posible inferir correo remitente del usuario'
        });
      }

      await query(
        `INSERT INTO system.configuracion_correo (
           proveedor, auth_mode, nombre_remitente, correo_remitente, correo_respuesta,
           smtp_host, smtp_port, smtp_secure, smtp_usuario, smtp_password,
           oauth_redirect_uri,
           activa, id_tenant, created_by, updated_by
         ) VALUES (
           'smtp', 'gmail_oauth', NULL, $1, NULL,
           NULL, 587, false, NULL, NULL,
           $2,
           true, $3, $4, $4
         )`,
        [userEmail, getOAuthRedirectUri(), tenantId, userId]
      );

      current.rows = [{ oauth_client_id: null, oauth_client_secret: null }];
    }

    const oauthCreds = await resolveGoogleOAuthCredentials(tenantId, current.rows[0]);
    if (!oauthCreds.clientId || !oauthCreds.clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Faltan credenciales OAuth de Google en backend (EMAIL_GOOGLE_CLIENT_ID / EMAIL_GOOGLE_CLIENT_SECRET)'
      });
    }

    const redirectUri = getOAuthRedirectUri();
    const oauth2Client = new google.auth.OAuth2(
      oauthCreds.clientId,
      oauthCreds.clientSecret,
      redirectUri
    );

    const stateToken = jwt.sign({ tenantId, userId, type: 'email_google_oauth' }, STATE_SECRET, { expiresIn: '10m' });
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: OAUTH_SCOPE,
      state: stateToken
    });

    return res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generando auth URL de Google para correo:', error);
    return res.status(500).json({ success: false, message: 'No fue posible generar la URL de autorización' });
  }
}

export async function handleGoogleEmailCallback(req, res) {
  try {
    await ensureEmailConfigStructure();
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(`<html><body><h3>Error OAuth: ${String(error)}</h3></body></html>`);
    }

    if (!code || !state) {
      return res.status(400).send('<html><body><h3>Falta código de autorización.</h3></body></html>');
    }

    const payload = jwt.verify(String(state), STATE_SECRET);
    if (!payload?.tenantId || payload?.type !== 'email_google_oauth') {
      return res.status(400).send('<html><body><h3>State inválido.</h3></body></html>');
    }

    const current = await query(
      `SELECT *
       FROM system.configuracion_correo
       WHERE id_tenant = $1 AND activa = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [payload.tenantId]
    );

    if (!current.rows.length) {
      return res.status(400).send('<html><body><h3>No hay configuración OAuth de correo para este tenant.</h3></body></html>');
    }

    const cfg = current.rows[0];
    const redirectUri = getOAuthRedirectUri();

    const oauthCreds = await resolveGoogleOAuthCredentials(payload.tenantId, cfg);
    if (!oauthCreds.clientId || !oauthCreds.clientSecret) {
      return res.status(400).send('<html><body><h3>Faltan credenciales OAuth en backend.</h3></body></html>');
    }

    const oauth2Client = new google.auth.OAuth2(oauthCreds.clientId, oauthCreds.clientSecret, redirectUri);
    const tokenResult = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokenResult.tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const me = await oauth2.userinfo.get();
    const email = me.data?.email || cfg.correo_remitente;

    await query(
      `UPDATE system.configuracion_correo
       SET auth_mode = 'gmail_oauth',
           oauth_client_id = $1,
           oauth_client_secret = $2,
           oauth_refresh_token = COALESCE($3, oauth_refresh_token),
           oauth_access_token = $4,
           oauth_token_expiry = $5,
           oauth_email = $6,
           oauth_redirect_uri = $7,
           updated_at = NOW()
       WHERE id_config_correo = $8`,
      [
        oauthCreds.clientId,
        oauthCreds.clientSecret,
        tokenResult.tokens.refresh_token || null,
        tokenResult.tokens.access_token || null,
        tokenResult.tokens.expiry_date ? new Date(tokenResult.tokens.expiry_date) : null,
        email,
        redirectUri,
        cfg.id_config_correo
      ]
    );

    // Unificacion Calendar + Correo: reutiliza el mismo consentimiento OAuth para Google Calendar.
    await query(
      `UPDATE vetplus_auth.google_calendar_config gc
       SET refresh_token = COALESCE($1, gc.refresh_token),
           access_token = $2,
           token_expiry = $3,
           updated_at = NOW()
       WHERE gc.is_active = true
         AND gc.configured_by IN (
           SELECT u.id_usuario
           FROM vetplus_auth.usuarios u
           WHERE u.id_tenant = $4
         )`,
      [
        tokenResult.tokens.refresh_token || null,
        tokenResult.tokens.access_token || null,
        tokenResult.tokens.expiry_date ? new Date(tokenResult.tokens.expiry_date) : null,
        payload.tenantId
      ]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const target = `${frontendUrl}/configuracion/correo?google_oauth=ok`;
    return res.send(`<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Autorización de Correo - VetPlus</title>
        <meta http-equiv="refresh" content="5;url=${target}">
      </head>
      <body data-target="${target}" data-status="ok" data-type="email-google-oauth">
        <p>Autorización completada. Cerrando ventana...</p>
        <p>Si no se cierra automáticamente, serás redirigido en unos segundos.</p>
        <script src="/api/admin/email/google/callback-script.js"></script>
      </body>
      </html>`);
  } catch (error) {
    console.error('Error en callback OAuth de correo:', error);
    return res.status(400).send('<html><body><h3>No se pudo completar la autorización de Google.</h3></body></html>');
  }
}

export async function serveGoogleEmailCallbackScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.send(`
    (function () {
      const body = document.body || {};
      const target = body.dataset?.target || '/';
      const type = body.dataset?.type || 'email-google-oauth';
      const status = body.dataset?.status || 'ok';

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type, status }, '*');
        }
      } catch (_) {}

      try {
        localStorage.setItem('vetplus-email-oauth-result', JSON.stringify({ type, status, timestamp: new Date().toISOString() }));
      } catch (_) {}

      function closeOrRedirect() {
        try { window.close(); } catch (_) {}
        setTimeout(function () {
          if (!window.closed) {
            window.location.replace(target);
          }
        }, 400);
      }

      closeOrRedirect();
      setTimeout(closeOrRedirect, 2200);
    })();
  `);
}

export async function disconnectGoogleEmail(req, res) {
  try {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    await ensureEmailConfigStructure();
    await query(
      `UPDATE system.configuracion_correo
       SET auth_mode = 'smtp',
           oauth_refresh_token = NULL,
           oauth_access_token = NULL,
           oauth_token_expiry = NULL,
           oauth_email = NULL,
           updated_at = NOW()
       WHERE id_tenant = $1 AND activa = true`,
      [tenantId]
    );

    return res.json({ success: true, message: 'Conexión con Google desconectada' });
  } catch (error) {
    console.error('Error desconectando Google Email:', error);
    return res.status(500).json({ success: false, message: 'No se pudo desconectar Google Email' });
  }
}
