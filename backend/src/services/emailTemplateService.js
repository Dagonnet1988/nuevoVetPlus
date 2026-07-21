import { query } from '../config/database.js';

const DEFAULT_TEMPLATES = [
  {
    clave_template: 'cita_agendada',
    nombre_template: 'Cita agendada',
    descripcion: 'Correo enviado cuando una cita queda creada',
    asunto: 'Cita agendada - {{mascota_nombre}}',
    cuerpo_html:
      '<p>Hola {{cliente_nombre}},</p><p>Tu cita para <strong>{{mascota_nombre}}</strong> fue agendada para el día <strong>{{fecha_hora}}</strong>.</p><p>Te esperamos.</p><p>{{clinica_nombre}}</p>',
    cuerpo_text:
      'Hola {{cliente_nombre}}, tu cita para {{mascota_nombre}} fue agendada para el día {{fecha_hora}}. Te esperamos. {{clinica_nombre}}',
    variables_permitidas: ['cliente_nombre', 'mascota_nombre', 'fecha_hora', 'clinica_nombre']
  },
  {
    clave_template: 'cita_reagendada',
    nombre_template: 'Cita reagendada',
    descripcion: 'Correo enviado cuando cambia fecha u hora de la cita',
    asunto: 'Cambio de cita - {{mascota_nombre}}',
    cuerpo_html:
      '<p>Hola {{cliente_nombre}},</p><p>Tu cita para <strong>{{mascota_nombre}}</strong> fue reagendada.</p><p>Nueva fecha y hora: <strong>{{fecha_hora}}</strong>.</p><p>Te esperamos.</p><p>{{clinica_nombre}}</p>',
    cuerpo_text:
      'Hola {{cliente_nombre}}, tu cita para {{mascota_nombre}} fue reagendada. Nueva fecha y hora: {{fecha_hora}}. Te esperamos. {{clinica_nombre}}',
    variables_permitidas: ['cliente_nombre', 'mascota_nombre', 'fecha_hora', 'clinica_nombre']
  },
  {
    clave_template: 'recordatorio_cita_1h',
    nombre_template: 'Recordatorio 1 hora antes',
    descripcion: 'Correo recordatorio previo a la cita',
    asunto: 'Recordatorio de cita - {{mascota_nombre}}',
    cuerpo_html:
      '<p>Hola {{cliente_nombre}},</p><p>Te recordamos que la cita de <strong>{{mascota_nombre}}</strong> es el día <strong>{{fecha_hora}}</strong>.</p><p>Te esperamos.</p><p>{{clinica_nombre}}</p>',
    cuerpo_text:
      'Hola {{cliente_nombre}}, te recordamos que la cita de {{mascota_nombre}} es el día {{fecha_hora}}. Te esperamos. {{clinica_nombre}}',
    variables_permitidas: ['cliente_nombre', 'mascota_nombre', 'fecha_hora', 'clinica_nombre']
  },
  {
    clave_template: 'documento_clinico_pdf',
    nombre_template: 'Documento clínico PDF',
    descripcion: 'Correo usado para enviar historias clínicas, fórmulas, seguimientos y remisiones en PDF',
    asunto: '{{tipo_documento}} - {{mascota_nombre}} - {{codigo_documento}}',
    cuerpo_html:
      '<p>Hola {{cliente_nombre}},</p><p>Adjuntamos el documento <strong>{{tipo_documento}}</strong> de <strong>{{mascota_nombre}}</strong> en formato PDF.</p><p>Código: <strong>{{codigo_documento}}</strong><br>Fecha: {{fecha_documento}}</p><p>{{clinica_nombre}}</p>',
    cuerpo_text:
      'Hola {{cliente_nombre}}, adjuntamos el documento {{tipo_documento}} de {{mascota_nombre}} en formato PDF. Código: {{codigo_documento}}. Fecha: {{fecha_documento}}. {{clinica_nombre}}',
    variables_permitidas: ['cliente_nombre', 'mascota_nombre', 'tipo_documento', 'codigo_documento', 'fecha_documento', 'clinica_nombre']
  },
  {
    clave_template: 'usuario_credenciales',
    nombre_template: 'Credenciales de usuario nuevo',
    descripcion: 'Correo con credenciales iniciales al crear usuario',
    asunto: 'Acceso a VetPlus - {{usuario_nombre}}',
    cuerpo_html:
      '<p>Hola {{usuario_nombre}},</p><p>Se creó tu acceso a VetPlus.</p><p>Usuario: <strong>{{usuario_email}}</strong><br>Contraseña temporal: <strong>{{password_temporal}}</strong></p><p>Debes cambiarla al iniciar sesión.</p>',
    cuerpo_text:
      'Hola {{usuario_nombre}}, se creó tu acceso a VetPlus. Usuario: {{usuario_email}}. Contraseña temporal: {{password_temporal}}. Debes cambiarla al iniciar sesión.',
    variables_permitidas: ['usuario_nombre', 'usuario_email', 'password_temporal']
  },
  {
    clave_template: 'usuario_reset_temporal',
    nombre_template: 'Reset temporal de usuario',
    descripcion: 'Correo de restablecimiento temporal por administrador',
    asunto: 'Restablecimiento de acceso - {{usuario_nombre}}',
    cuerpo_html:
      '<p>Hola {{usuario_nombre}},</p><p>Se generó una nueva contraseña temporal para tu acceso.</p><p>Contraseña temporal: <strong>{{password_temporal}}</strong></p><p>Debes cambiarla al iniciar sesión.</p>',
    cuerpo_text:
      'Hola {{usuario_nombre}}, se generó una nueva contraseña temporal: {{password_temporal}}. Debes cambiarla al iniciar sesión.',
    variables_permitidas: ['usuario_nombre', 'password_temporal']
  },
  {
    clave_template: 'auth_reset_link',
    nombre_template: 'Recuperación de contraseña',
    descripcion: 'Correo de recuperación con enlace temporal',
    asunto: 'Recuperar acceso a VetPlus',
    cuerpo_html:
      '<p>Hola {{usuario_nombre}},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="{{reset_url}}">Restablecer contraseña</a></p><p>Este enlace vence en {{expiracion_minutos}} minutos.</p>',
    cuerpo_text:
      'Hola {{usuario_nombre}}, restablece tu contraseña usando este enlace: {{reset_url}}. Este enlace vence en {{expiracion_minutos}} minutos.',
    variables_permitidas: ['usuario_nombre', 'reset_url', 'expiracion_minutos']
  }
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(message = '') {
  const paragraphs = String(message || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) return '';

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function wrapMessageHtml(messageHtml = '') {
  return [
    '<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5; max-width: 640px; margin: 0 auto;">',
    '<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background: #ffffff;">',
    messageHtml,
    '</div>',
    '<p style="font-size: 12px; color: #6b7280; margin-top: 16px;">Este mensaje fue enviado desde VetPlus.</p>',
    '</div>'
  ].join('');
}

function deriveMessageFromHtml(html = '') {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeTemplateRow(row) {
  return {
    id_template: row.id_template,
    clave_template: row.clave_template,
    nombre_template: row.nombre_template,
    descripcion: row.descripcion,
    asunto: row.asunto,
    cuerpo_html: row.cuerpo_html,
    cuerpo_text: row.cuerpo_text,
    mensaje: row.cuerpo_text || deriveMessageFromHtml(row.cuerpo_html),
    variables_permitidas: Array.isArray(row.variables_permitidas) ? row.variables_permitidas : [],
    activa: row.activa,
    updated_at: row.updated_at
  };
}

export async function ensureDefaultEmailTemplates(tenantId, userId = null) {
  for (const tpl of DEFAULT_TEMPLATES) {
    await query(
      `INSERT INTO system.email_templates (
         clave_template, nombre_template, descripcion, asunto,
         cuerpo_html, cuerpo_text, variables_permitidas,
         activa, id_tenant, created_by, updated_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,true,$8,$9,$9)
       ON CONFLICT (id_tenant, clave_template) DO NOTHING`,
      [
        tpl.clave_template,
        tpl.nombre_template,
        tpl.descripcion,
        tpl.asunto,
        tpl.cuerpo_html,
        tpl.cuerpo_text,
        JSON.stringify(tpl.variables_permitidas || []),
        tenantId,
        userId
      ]
    );
  }
}

export async function listEmailTemplates(tenantId, userId = null) {
  await ensureDefaultEmailTemplates(tenantId, userId);

  const result = await query(
    `SELECT id_template, clave_template, nombre_template, descripcion,
            asunto, cuerpo_html, cuerpo_text, variables_permitidas,
            activa, updated_at
     FROM system.email_templates
     WHERE id_tenant = $1
     ORDER BY nombre_template ASC`,
    [tenantId]
  );

  return result.rows.map(normalizeTemplateRow);
}

export async function getEmailTemplateByKey(tenantId, key, userId = null) {
  await ensureDefaultEmailTemplates(tenantId, userId);

  const result = await query(
    `SELECT id_template, clave_template, nombre_template, descripcion,
            asunto, cuerpo_html, cuerpo_text, variables_permitidas,
            activa, updated_at
     FROM system.email_templates
     WHERE id_tenant = $1 AND clave_template = $2
     LIMIT 1`,
    [tenantId, key]
  );

  return result.rows.length ? normalizeTemplateRow(result.rows[0]) : null;
}

export async function updateEmailTemplateByKey({ tenantId, key, payload, userId = null }) {
  const current = await getEmailTemplateByKey(tenantId, key, userId);
  if (!current) return null;

  const asunto = String(payload?.asunto ?? current.asunto).trim();
  const mensaje = typeof payload?.mensaje === 'string'
    ? payload.mensaje.trim()
    : (typeof payload?.cuerpo_text === 'string' ? payload.cuerpo_text.trim() : String(current.mensaje || '').trim());
  const cuerpoHtml = typeof payload?.mensaje === 'string'
    ? wrapMessageHtml(textToHtml(mensaje))
    : String(payload?.cuerpo_html ?? current.cuerpo_html).trim();
  const cuerpoText = mensaje || (typeof payload?.cuerpo_text === 'string' ? payload.cuerpo_text : current.cuerpo_text);
  const activa = typeof payload?.activa === 'boolean' ? payload.activa : current.activa;

  if (!asunto || !cuerpoText) {
    throw new Error('Los campos asunto y mensaje son obligatorios');
  }

  await query(
    `UPDATE system.email_templates
     SET asunto = $1,
         cuerpo_html = $2,
         cuerpo_text = $3,
         activa = $4,
         updated_at = NOW(),
         updated_by = $5
     WHERE id_tenant = $6
       AND clave_template = $7`,
    [asunto, cuerpoHtml, cuerpoText || null, activa, userId, tenantId, key]
  );

  return getEmailTemplateByKey(tenantId, key, userId);
}

export async function resetEmailTemplateToDefault(tenantId, key, userId = null) {
  const def = DEFAULT_TEMPLATES.find((tpl) => tpl.clave_template === key);
  if (!def) {
    throw new Error('No existe plantilla predeterminada para la clave solicitada');
  }

  await query(
    `UPDATE system.email_templates
     SET nombre_template = $1,
         descripcion = $2,
         asunto = $3,
         cuerpo_html = $4,
         cuerpo_text = $5,
         variables_permitidas = $6::jsonb,
         activa = true,
         updated_at = NOW(),
         updated_by = $7
     WHERE id_tenant = $8
       AND clave_template = $9`,
    [
      def.nombre_template,
      def.descripcion,
      def.asunto,
      def.cuerpo_html,
      def.cuerpo_text,
      JSON.stringify(def.variables_permitidas || []),
      userId,
      tenantId,
      key
    ]
  );

  return getEmailTemplateByKey(tenantId, key, userId);
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function applyVariables(text, variables = {}) {
  const source = String(text || '');
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return normalizeValue(variables[key]);
  });
}

export async function renderEmailTemplate({ tenantId, key, variables = {}, userId = null }) {
  const template = await getEmailTemplateByKey(tenantId, key, userId);
  if (!template || !template.activa) {
    return null;
  }

  return {
    ...template,
    asunto_render: applyVariables(template.asunto, variables),
    cuerpo_html_render: applyVariables(template.cuerpo_html, variables),
    cuerpo_text_render: applyVariables(template.cuerpo_text || '', variables)
  };
}
