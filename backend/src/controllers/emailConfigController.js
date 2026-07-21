import { validationResult } from 'express-validator/lib/index.js';
import { getClient, query } from '../config/database.js';
import { getSafeEmailConfig, testEmailConnection, sendEmail } from '../services/emailService.js';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { generarPDFHistoria } from '../services/historiaClinicaPDFService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OAUTH_SCOPE = [
  // SMTP OAuth2 con Gmail (Nodemailer XOAUTH2) requiere este scope amplio.
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

const STATE_SECRET = process.env.JWT_SECRET || 'vetplus_dev_only_secret_do_not_use_in_prod';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

async function resolveGoogleOAuthCredentials(tenantId, configRow = null) {
  return {
    clientId: configRow?.oauth_client_id || process.env.EMAIL_GOOGLE_CLIENT_ID || null,
    clientSecret: configRow?.oauth_client_secret || process.env.EMAIL_GOOGLE_CLIENT_SECRET || null
  };
}

async function ensureEmailConfigStructure() {
  // No-op: en despliegues nuevos, la estructura vive en schemas/06_empresa_config.sql.
  return true;
}

async function getDeliveryBySourceAndId(tenantId, source, id) {
  if (source === 'system') {
    const result = await query(
      `SELECT
         s.id_log::text AS id,
         'system'::text AS fuente,
         s.tipo_envio,
         s.destinatario_email,
         COALESCE(s.metadata->>'cliente_nombre', s.metadata->>'propietario_nombre', cl.nombre) AS propietario_nombre,
         s.asunto,
         s.estado,
         s.provider_message_id,
         s.detalle_error,
         s.metadata,
         s.id_tenant,
         s.created_by,
         s.created_at,
         s.sent_at,
         NULL::uuid AS id_cliente,
         NULL::uuid AS id_historia,
         NULL::uuid AS id_consentimiento
       FROM system.email_delivery_log s
       LEFT JOIN LATERAL (
         SELECT CASE
           WHEN (s.metadata->>'id_cita') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN (s.metadata->>'id_cita')::uuid
           ELSE NULL
         END AS id_cita
       ) meta ON TRUE
       LEFT JOIN clinical.calendario_citas cc
         ON cc.id_cita = meta.id_cita
        AND cc.id_tenant = s.id_tenant
       LEFT JOIN clinical.mascotas m
         ON m.id_mascota = cc.id_mascota
        AND m.id_tenant = s.id_tenant
       LEFT JOIN clinical.clientes cl
         ON cl.id_cliente = m.id_cliente
        AND cl.id_tenant = s.id_tenant
       WHERE s.id_tenant = $1
         AND s.id_log::text = $2
       LIMIT 1`,
      [tenantId, id]
    );

    return result.rows[0] || null;
  }

  if (source === 'clinical') {
    const result = await query(
      `SELECT
         c.id_envio::text AS id,
         'clinical'::text AS fuente,
         c.tipo_documento AS tipo_envio,
         c.destinatario_email,
         COALESCE(c.metadata->>'cliente_nombre', cl.nombre) AS propietario_nombre,
         c.asunto,
         c.estado,
         c.provider_message_id,
         c.detalle_error,
         c.metadata,
         c.id_tenant,
         c.created_by,
         c.created_at,
         c.sent_at,
         c.id_cliente,
         c.id_historia,
         c.id_consentimiento
       FROM clinical.envios_documentos c
       LEFT JOIN clinical.clientes cl
         ON cl.id_cliente = c.id_cliente
        AND cl.id_tenant = c.id_tenant
       WHERE c.id_tenant = $1
         AND c.id_envio::text = $2
       LIMIT 1`,
      [tenantId, id]
    );

    return result.rows[0] || null;
  }

  return null;
}

function extractRetryPayload(delivery) {
  const metadata = delivery?.metadata && typeof delivery.metadata === 'object'
    ? delivery.metadata
    : {};

  const fromMetadata = metadata.retry_payload || metadata.email_snapshot || null;
  if (!fromMetadata || typeof fromMetadata !== 'object') {
    return null;
  }

  const to = fromMetadata.to || delivery.destinatario_email || null;
  const subject = fromMetadata.subject || delivery.asunto || null;
  const text = fromMetadata.text || null;
  const html = fromMetadata.html || null;

  if (!to || !subject || (!text && !html)) {
    return null;
  }

  return { to, subject, text, html };
}

function snapshotAttachments(attachments = []) {
  return (attachments || []).map((attachment) => ({
    filename: attachment?.filename || null,
    contentType: attachment?.contentType || null,
    size: typeof attachment?.content === 'string'
      ? attachment.content.length
      : (Buffer.isBuffer(attachment?.content) ? attachment.content.length : null)
  }));
}

async function buildClinicalRetryAttachments(tenantId, original, metadata = {}) {
  const tipo = String(original?.tipo_envio || '').trim();

  if (tipo === 'historia_pdf') {
    const idHistoria = original?.id_historia || metadata?.id_historia || null;
    if (!idHistoria) return [];

    const pdfBuffer = await generarPDFHistoria(idHistoria, tenantId);
    const historiaResult = await query(
      `SELECT codigo_historia
       FROM clinical.historias_clinicas
       WHERE id_historia = $1 AND id_tenant = $2
       LIMIT 1`,
      [idHistoria, tenantId]
    );

    const codigo = historiaResult.rows[0]?.codigo_historia || idHistoria;
    return [
      {
        filename: `historia-${String(codigo)}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  if (tipo === 'consentimiento_pdf') {
    const idConsentimiento = original?.id_consentimiento || metadata?.id_consentimiento || null;
    if (!idConsentimiento) return [];

    const consentResult = await query(
      `SELECT pdf_path, pdf_numero
       FROM clinical.consentimientos
       WHERE id_consentimiento = $1 AND id_tenant = $2
       LIMIT 1`,
      [idConsentimiento, tenantId]
    );

    if (!consentResult.rows.length || !consentResult.rows[0]?.pdf_path) {
      return [];
    }

    const absolutePath = path.join(__dirname, '../../', consentResult.rows[0].pdf_path);
    const pdfBuffer = await fs.readFile(absolutePath);
    return [
      {
        filename: `consentimiento-${consentResult.rows[0].pdf_numero || idConsentimiento}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  if (tipo === 'consentimiento_link') {
    let firmaUrl = metadata?.firmaUrl || null;

    if (!firmaUrl) {
      const idConsentimiento = original?.id_consentimiento || metadata?.id_consentimiento || null;
      if (idConsentimiento) {
        const consentResult = await query(
          `SELECT token
           FROM clinical.consentimientos
           WHERE id_consentimiento = $1 AND id_tenant = $2
           LIMIT 1`,
          [idConsentimiento, tenantId]
        );

        const token = consentResult.rows[0]?.token || null;
        if (token) {
          firmaUrl = `${FRONTEND_URL}/consentimiento/${token}`;
        }
      }
    }

    if (!firmaUrl) return [];
    const qrBuffer = await QRCode.toBuffer(firmaUrl, { width: 256, margin: 1 });
    return [
      {
        filename: 'consentimiento-qr.png',
        content: qrBuffer,
        contentType: 'image/png'
      }
    ];
  }

  return [];
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
      try {
        await query(
          `UPDATE system.configuracion_correo
           SET oauth_refresh_token = NULL,
               oauth_access_token = NULL,
               oauth_token_expiry = NULL,
               updated_at = NOW()
           WHERE id_tenant = $1 AND activa = true`,
          [tenantId]
        );
      } catch (cleanupError) {
        console.error('No se pudo limpiar token OAuth inválido tras fallo de autenticación:', cleanupError);
      }

      return res.status(400).json({
        success: false,
        message:
          'Google OAuth rechazó el envío (token inválido/revocado o alcance insuficiente para SMTP). Se limpió la sesión actual de Google para esta clínica. Vuelve a conectar Google para regenerar tokens.'
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
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE estado = 'enviado')::text AS enviados,
         COUNT(*) FILTER (WHERE estado = 'fallido')::text AS fallidos
       FROM (
         SELECT estado
         FROM clinical.envios_documentos
         WHERE id_tenant = $1
         UNION ALL
         SELECT estado
         FROM system.email_delivery_log
         WHERE id_tenant = $1
       ) e`,
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

export async function getEmailDeliveries(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;

    const limitRaw = Number(req.query?.limit ?? 20);
    const offsetRaw = Number(req.query?.offset ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const estado = String(req.query?.estado || '').trim().toLowerCase();
    const search = String(req.query?.search || '').trim();
    const receptor = String(req.query?.receptor || '').trim();
    const fechaDesde = String(req.query?.fecha_desde || '').trim();
    const fechaHasta = String(req.query?.fecha_hasta || '').trim();

    const params = [tenantId];
    let where = 'WHERE x.id_tenant = $1';

    if (estado === 'enviado' || estado === 'fallido') {
      params.push(estado);
      where += ` AND x.estado = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (
        x.destinatario_email ILIKE $${params.length}
        OR x.asunto ILIKE $${params.length}
        OR x.tipo_envio ILIKE $${params.length}
      )`;
    }

    if (receptor) {
      params.push(`%${receptor}%`);
      where += ` AND x.destinatario_email ILIKE $${params.length}`;
    }

    if (fechaDesde) {
      params.push(fechaDesde);
      where += ` AND x.created_at >= $${params.length}::date`;
    }

    if (fechaHasta) {
      params.push(fechaHasta);
      where += ` AND x.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    const baseUnion = `
      SELECT
        s.id_log::text AS id,
        'system'::text AS fuente,
        s.tipo_envio,
        s.destinatario_email,
        COALESCE(s.metadata->>'cliente_nombre', s.metadata->>'propietario_nombre', cl.nombre) AS propietario_nombre,
        s.asunto,
        s.estado,
        s.provider_message_id,
        s.detalle_error,
        s.metadata,
        s.id_tenant,
        s.created_at,
        s.sent_at
      FROM system.email_delivery_log s
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN (s.metadata->>'id_cita') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (s.metadata->>'id_cita')::uuid
          ELSE NULL
        END AS id_cita
      ) meta ON TRUE
      LEFT JOIN clinical.calendario_citas cc
        ON cc.id_cita = meta.id_cita
       AND cc.id_tenant = s.id_tenant
      LEFT JOIN clinical.mascotas m
        ON m.id_mascota = cc.id_mascota
       AND m.id_tenant = s.id_tenant
      LEFT JOIN clinical.clientes cl
        ON cl.id_cliente = m.id_cliente
       AND cl.id_tenant = s.id_tenant

      UNION ALL

      SELECT
        c.id_envio::text AS id,
        'clinical'::text AS fuente,
        c.tipo_documento AS tipo_envio,
        c.destinatario_email,
        COALESCE(c.metadata->>'cliente_nombre', cl.nombre) AS propietario_nombre,
        c.asunto,
        c.estado,
        c.provider_message_id,
        c.detalle_error,
        c.metadata,
        c.id_tenant,
        c.created_at,
        c.sent_at
      FROM clinical.envios_documentos c
      LEFT JOIN clinical.clientes cl
        ON cl.id_cliente = c.id_cliente
       AND cl.id_tenant = c.id_tenant
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM (${baseUnion}) x
      ${where}
    `;

    const totalResult = await query(countSql, params);
    const total = Number(totalResult.rows[0]?.total || 0);

    params.push(limit, offset);
    const dataSql = `
      SELECT
        x.id,
        x.fuente,
        x.tipo_envio,
        x.destinatario_email,
        x.propietario_nombre,
        x.asunto,
        x.estado,
        x.provider_message_id,
        x.detalle_error,
        x.metadata,
        x.created_at,
        x.sent_at,
        COALESCE(jsonb_array_length(x.metadata->'attachments'), 0) AS adjuntos_count
      FROM (${baseUnion}) x
      ${where}
      ORDER BY x.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const deliveries = await query(dataSql, params);

    return res.json({
      success: true,
      data: deliveries.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial de envíos de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function getEmailDeliveryDetail(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const source = String(req.params?.source || '').trim().toLowerCase();
    const id = String(req.params?.id || '').trim();

    if (!id || !['system', 'clinical'].includes(source)) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    const delivery = await getDeliveryBySourceAndId(tenantId, source, id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Envío no encontrado' });
    }

    const metadata = delivery.metadata && typeof delivery.metadata === 'object' ? delivery.metadata : {};
    const emailSnapshot = metadata.email_snapshot && typeof metadata.email_snapshot === 'object'
      ? metadata.email_snapshot
      : null;
    const retryPayload = extractRetryPayload(delivery);

    return res.json({
      success: true,
      data: {
        ...delivery,
        copy: emailSnapshot,
        can_retry: delivery.estado === 'fallido' && Boolean(retryPayload)
      }
    });
  } catch (error) {
    console.error('Error obteniendo detalle de envío de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function retryEmailDelivery(req, res) {
  try {
    await ensureEmailConfigStructure();
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id || null;
    const source = String(req.params?.source || '').trim().toLowerCase();
    const id = String(req.params?.id || '').trim();

    if (!id || !['system', 'clinical'].includes(source)) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    const original = await getDeliveryBySourceAndId(tenantId, source, id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Envío no encontrado' });
    }

    if (original.estado !== 'fallido') {
      return res.status(400).json({ success: false, message: 'Solo se pueden reenviar correos fallidos' });
    }

    const retryPayload = extractRetryPayload(original);
    if (!retryPayload) {
      return res.status(422).json({
        success: false,
        message: 'Este envío no tiene una copia recuperable para reenvío automático'
      });
    }

    const metadata = original.metadata && typeof original.metadata === 'object' ? original.metadata : {};
    const attachments = source === 'clinical'
      ? await buildClinicalRetryAttachments(tenantId, original, metadata)
      : [];

    const retryMeta = {
      ...metadata,
      retry_of: { fuente: source, id },
      retried_by: userId,
      retried_at: new Date().toISOString(),
      retry_payload: retryPayload,
      attachments_retried: snapshotAttachments(attachments)
    };

    try {
      const sendResult = await sendEmail({
        tenantId,
        to: retryPayload.to,
        subject: retryPayload.subject,
        text: retryPayload.text,
        html: retryPayload.html,
        attachments,
        logContext: source === 'system'
          ? {
              tipo_envio: original.tipo_envio,
              userId,
              metadata: retryMeta
            }
          : null
      });

      if (source === 'clinical') {
        await query(
          `INSERT INTO clinical.envios_documentos (
             tipo_documento, canal, id_cliente, id_historia, id_consentimiento,
             destinatario_email, asunto, estado, provider_message_id, detalle_error,
             metadata, id_tenant, created_by, sent_at
           ) VALUES (
             $1, 'email', $2, $3, $4,
             $5, $6, 'enviado', $7, NULL,
             $8::jsonb, $9, $10, NOW()
           )`,
          [
            original.tipo_envio,
            original.id_cliente || null,
            original.id_historia || null,
            original.id_consentimiento || null,
            retryPayload.to,
            retryPayload.subject,
            sendResult?.messageId || null,
            JSON.stringify(retryMeta),
            tenantId,
            userId
          ]
        );
      }

      return res.json({ success: true, message: 'Correo reenviado correctamente' });
    } catch (sendError) {
      if (source === 'system') {
        await query(
          `INSERT INTO system.email_delivery_log (
             tipo_envio, destinatario_email, asunto, estado,
             provider_message_id, detalle_error, metadata,
             id_tenant, created_by, sent_at
           ) VALUES (
             $1, $2, $3, 'fallido',
             NULL, $4, $5::jsonb,
             $6, $7, NULL
           )`,
          [
            original.tipo_envio,
            retryPayload.to,
            retryPayload.subject,
            sendError?.message || 'Error reenviando correo',
            JSON.stringify(retryMeta),
            tenantId,
            userId
          ]
        );
      } else {
        await query(
          `INSERT INTO clinical.envios_documentos (
             tipo_documento, canal, id_cliente, id_historia, id_consentimiento,
             destinatario_email, asunto, estado, provider_message_id, detalle_error,
             metadata, id_tenant, created_by, sent_at
           ) VALUES (
             $1, 'email', $2, $3, $4,
             $5, $6, 'fallido', NULL, $7,
             $8::jsonb, $9, $10, NULL
           )`,
          [
            original.tipo_envio,
            original.id_cliente || null,
            original.id_historia || null,
            original.id_consentimiento || null,
            retryPayload.to,
            retryPayload.subject,
            sendError?.message || 'Error reenviando correo',
            JSON.stringify(retryMeta),
            tenantId,
            userId
          ]
        );
      }

      return res.status(400).json({
        success: false,
        message: sendError?.message || 'No fue posible reenviar el correo'
      });
    }
  } catch (error) {
    console.error('Error reenviando correo desde historial:', error);
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
      return res.status(400).send('<html><body><h3>No hay configuración OAuth de correo para esta clínica.</h3></body></html>');
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
       SET auth_mode = 'gmail_oauth',
           oauth_client_id = NULL,
           oauth_client_secret = NULL,
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
