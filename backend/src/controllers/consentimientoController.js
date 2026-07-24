import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { query } from '../config/database.js';
import { generarPDFConsentimiento, generarNumeroPDF } from '../services/consentimientoPDFService.js';
import { sendEmail } from '../services/emailService.js';
import { cache } from '../middleware/performance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL base del frontend (donde se servirá la página pública de firma)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Duración del token de firma en horas (configurable aquí o por variable de entorno)
const TOKEN_DURATION_HOURS = parseInt(process.env.CONSENT_TOKEN_HOURS ?? '48', 10);

function invalidateConsentRelatedCache() {
  const patterns = ['.*consentimiento.*', '.*pacientes.*', '.*clientes.*', '.*clients.*'];
  patterns.forEach((pattern) => cache.deletePattern(pattern));
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

function resolveConsentText(textoLegal, empresa) {
  const replacements = {
    NOMBRE_CLINICA: field(empresa.nombre, 'Clínica veterinaria'),
    NIT: field(empresa.nit),
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

  return text.replace(/\[[A-Z_]{3,}\]/g, 'No registrado');
}

function toAbsoluteAssetUrl(req, assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const clean = String(assetPath).startsWith('/') ? assetPath : `/${assetPath}`;
  return `${base}${clean}`;
}

async function logConsentEmailDelivery({
  tenantId,
  userId = null,
  tipoDocumento,
  idCliente = null,
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
       $1, 'email', $2, NULL, $3,
       $4, $5, $6, $7, $8,
       $9::jsonb, $10, $11,
       CASE WHEN $6::varchar = 'enviado'::varchar THEN NOW() ELSE NULL END
     )`,
    [
      tipoDocumento,
      idCliente,
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

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS AUTENTICADAS (personal de la clínica)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/clinical/pacientes/:id/consentimiento
 * Crea un nuevo consentimiento pendiente para el cliente del paciente.
 * Responde con la URL de firma y el QR en base64.
 */
export async function crearConsentimiento(req, res) {
  const { id } = req.params; // id del cliente
  const userId = req.user?.id;
  const tenantId = req.tenantId;

  try {
    // Verificar que el cliente existe
    const clienteResult = await query(
      `SELECT id_cliente, nombre, email, telefono, cedula
       FROM clinical.clientes
       WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true`,
      [id, tenantId]
    );
    if (!clienteResult.rows.length) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    const cliente = clienteResult.rows[0];

    // Obtener la versión activa del consentimiento
    const versionResult = await query(
      `SELECT id_version, titulo, texto_legal
       FROM clinical.versiones_consentimiento
       WHERE activa = true AND id_tenant = $1
       LIMIT 1`,
      [tenantId]
    );
    if (!versionResult.rows.length) {
      return res.status(422).json({ message: 'No hay versión activa del consentimiento configurada' });
    }
    const version = versionResult.rows[0];

    // Expirar consentimientos pendientes anteriores para este cliente
    await query(
      `UPDATE clinical.consentimientos
       SET estado = 'expirado'
       WHERE id_cliente = $1 AND estado = 'pendiente'`,
      [id]
    );

    // Crear el nuevo consentimiento
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_HOURS * 60 * 60 * 1000);

    const insertResult = await query(
      `INSERT INTO clinical.consentimientos
         (id_cliente, id_version, estado, token, token_expires_at, created_by, id_tenant)
       VALUES ($1, $2, 'pendiente', $3, $4, $5, $6)
       RETURNING id_consentimiento, token`,
      [id, version.id_version, token, expiresAt, userId, tenantId]
    );
    const consentimiento = insertResult.rows[0];

    // Al generar un nuevo enlace, el estado vigente vuelve a pendiente.
    await query(
      `UPDATE clinical.clientes
       SET consentimiento_firmado = false,
           id_consentimiento_vigente = NULL
       WHERE id_cliente = $1 AND id_tenant = $2`,
      [id, tenantId]
    );

    // Construir URL pública de firma
    const firmaUrl = `${FRONTEND_URL}/consentimiento/${token}`;

    // Generar QR como base64
    const qrBase64 = await QRCode.toDataURL(firmaUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: { dark: '#1a1a1a', light: '#ffffff' }
    });

    return res.status(201).json({
      message: 'Consentimiento creado exitosamente',
      id: consentimiento.id_consentimiento,
      token,
      firmaUrl,
      qrBase64,
      expiresAt,
      cliente: { id: cliente.id_cliente, nombre: cliente.nombre },
      version: { id: version.id_version, titulo: version.titulo }
    });
  } catch (error) {
    console.error('Error en crearConsentimiento:', error);
    return res.status(500).json({ message: 'Error al crear el consentimiento' });
  }
}

/**
 * GET /api/clinical/pacientes/:id/consentimiento/estado
 * Retorna el estado del consentimiento vigente del cliente.
 */
export async function obtenerEstadoConsentimiento(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId ?? req.user?.tenant_id;

  try {
    const result = await query(
      `SELECT c.id_consentimiento, c.estado, c.token, c.token_expires_at, c.firmado_en,
              c.pdf_path, c.pdf_numero, c.whatsapp_enviado, c.email_enviado,
              v.titulo AS version_titulo, v.id_version
       FROM clinical.consentimientos c
       JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version
       WHERE c.id_cliente = $1 AND c.id_tenant = $2
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [id, tenantId]
    );

    if (!result.rows.length) {
      return res.json({ estado: 'sin_consentimiento', consentimiento: null });
    }

    const c = result.rows[0];

    // Marcar como expirado si venció sin firmar
    if (c.estado === 'pendiente' && new Date(c.token_expires_at) < new Date()) {
      await query(
        `UPDATE clinical.consentimientos SET estado = 'expirado' WHERE id_consentimiento = $1`,
        [c.id_consentimiento]
      );
      c.estado = 'expirado';
    }

    const firmaUrl = c.estado === 'pendiente'
      ? `${FRONTEND_URL}/consentimiento/${c.token}`
      : null;

    return res.json({
      estado: c.estado,
      consentimiento: {
        id: c.id_consentimiento,
        estado: c.estado,
        firmaUrl,
        expiresAt: c.token_expires_at,
        firmadoEn: c.firmado_en,
        pdfDisponible: c.estado === 'firmado' && !!c.pdf_path,
        pdfNumero: c.pdf_numero,
        versionTitulo: c.version_titulo,
        idVersion: c.id_version,
        whatsappEnviado: c.whatsapp_enviado,
        emailEnviado: c.email_enviado
      }
    });
  } catch (error) {
    console.error('Error en obtenerEstadoConsentimiento:', error);
    return res.status(500).json({ message: 'Error al consultar el estado del consentimiento' });
  }
}

/**
 * POST /api/clinical/pacientes/:id/consentimiento/reenviar
 * Expira el token actual y genera uno nuevo con QR.
 */
export async function reenviarEnlaceConsentimiento(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const tenantId = req.tenantId;

  try {
    // Verificar cliente
    const clienteResult = await query(
      `SELECT id_cliente, nombre FROM clinical.clientes WHERE id_cliente = $1 AND id_tenant = $2 AND activo = true`,
      [id, tenantId]
    );
    if (!clienteResult.rows.length) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Verificar versión activa
    const versionResult = await query(
      `SELECT id_version, titulo FROM clinical.versiones_consentimiento WHERE activa = true AND id_tenant = $1 LIMIT 1`,
      [tenantId]
    );
    if (!versionResult.rows.length) {
      return res.status(422).json({ message: 'No hay versión activa del consentimiento configurada' });
    }

    // Expirar pendientes anteriores
    await query(
      `UPDATE clinical.consentimientos SET estado = 'expirado'
       WHERE id_cliente = $1 AND estado = 'pendiente'`,
      [id]
    );

    // Crear nuevo token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_HOURS * 60 * 60 * 1000);

    const insertResult = await query(
      `INSERT INTO clinical.consentimientos
         (id_cliente, id_version, estado, token, token_expires_at, created_by, id_tenant)
       VALUES ($1, $2, 'pendiente', $3, $4, $5, $6)
       RETURNING id_consentimiento, token`,
      [id, versionResult.rows[0].id_version, token, expiresAt, userId, tenantId]
    );

    // El reenvío crea una nueva solicitud pendiente: reflejar estado en cliente.
    await query(
      `UPDATE clinical.clientes
       SET consentimiento_firmado = false,
           id_consentimiento_vigente = NULL
       WHERE id_cliente = $1 AND id_tenant = $2`,
      [id, tenantId]
    );

    const firmaUrl = `${FRONTEND_URL}/consentimiento/${token}`;
    const qrBase64 = await QRCode.toDataURL(firmaUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256
    });

    return res.json({
      message: 'Enlace reenviado exitosamente',
      id: insertResult.rows[0].id_consentimiento,
      token,
      firmaUrl,
      qrBase64,
      expiresAt
    });
  } catch (error) {
    console.error('Error en reenviarEnlaceConsentimiento:', error);
    return res.status(500).json({ message: 'Error al reenviar el enlace' });
  }
}

/**
 * GET /api/clinical/pacientes/:id/consentimiento/pdf
 * Descarga el PDF del consentimiento firmado.
 */
export async function descargarPDFConsentimiento(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId ?? req.user?.tenant_id;

  try {
    const result = await query(
      `SELECT c.pdf_path, c.pdf_numero, c.estado, cl.nombre AS cliente_nombre
       FROM clinical.consentimientos c
       JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente
       WHERE c.id_cliente = $1 AND c.id_tenant = $2 AND c.estado = 'firmado'
       ORDER BY c.firmado_en DESC
       LIMIT 1`,
      [id, tenantId]
    );

    if (!result.rows.length || !result.rows[0].pdf_path) {
      return res.status(404).json({ message: 'No hay PDF disponible para este cliente' });
    }

    const { pdf_path, pdf_numero, cliente_nombre } = result.rows[0];

    // pdf_path es relativo a la raíz del backend (ej: uploads/consentimientos/CONS-xxx.pdf)
    const absolutePath = path.join(__dirname, '../../', pdf_path);

    const clienteSlug = safeSlug(cliente_nombre) || 'cliente';
    const displayName = `consentimiento-${clienteSlug}-${pdf_numero}.pdf`;

    const encodedFilename = encodeURIComponent(displayName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${displayName}"; filename*=UTF-8''${encodedFilename}`);

    return res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        console.error('Error al enviar PDF:', err);
        res.status(500).json({ message: 'Error al mostrar el PDF' });
      }
    });
  } catch (error) {
    console.error('Error en descargarPDFConsentimiento:', error);
    return res.status(500).json({ message: 'Error al descargar el PDF' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — TEXTO LEGAL (solo admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/config/consentimiento/texto
 * Devuelve la versión activa del texto legal (título + texto).
 */
export async function getTextoConsentimiento(req, res) {
  const tenantId = req.tenantId ?? req.user?.tenant_id;
  try {
    const result = await query(
      `SELECT id_version, titulo, texto_legal, activa, created_at
       FROM clinical.versiones_consentimiento
       WHERE activa = true AND id_tenant = $1
       LIMIT 1`,
      [tenantId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'No hay versión activa del consentimiento' });
    }

    return res.json({ version: result.rows[0] });
  } catch (error) {
    console.error('Error en getTextoConsentimiento:', error);
    return res.status(500).json({ message: 'Error al obtener el texto del consentimiento' });
  }
}

/**
 * PUT /api/config/consentimiento/texto
 * Crea una nueva versión del texto y la activa (desactiva la anterior).
 * Body: { titulo: string, textoLegal: string, tipoCambio: 'menor'|'mayor' }
 * tipoCambio 'mayor' marca como 'desactualizado' todos los consentimientos firmados
 * con la versión anterior, requiriendo nueva firma del propietario.
 */
export async function updateTextoConsentimiento(req, res) {
  const { titulo, textoLegal, tipoCambio = 'menor' } = req.body;
  const userId = req.user?.id;
  const tenantId = req.tenantId ?? req.user?.tenant_id;

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
    return res.status(400).json({ message: 'El título es requerido (mínimo 3 caracteres)' });
  }
  if (!textoLegal || typeof textoLegal !== 'string' || textoLegal.trim().length < 20) {
    return res.status(400).json({ message: 'El texto legal es requerido (mínimo 20 caracteres)' });
  }
  if (!['menor', 'mayor'].includes(tipoCambio)) {
    return res.status(400).json({ message: 'tipoCambio debe ser \'menor\' o \'mayor\'.' });
  }

  try {
    // Obtener el id_version máximo actual para este tenant
    const maxResult = await query(
      `SELECT COALESCE(MAX(id_version), 0) AS max_id FROM clinical.versiones_consentimiento WHERE id_tenant = $1`,
      [tenantId]
    );
    const newId = maxResult.rows[0].max_id + 1;

    // Desactivar versión actual de este tenant
    await query(
      `UPDATE clinical.versiones_consentimiento SET activa = false WHERE activa = true AND id_tenant = $1`,
      [tenantId]
    );

    // Insertar nueva versión activa para este tenant
    const insertResult = await query(
      `INSERT INTO clinical.versiones_consentimiento (id_version, titulo, texto_legal, activa, tipo_cambio, created_by, id_tenant)
       VALUES ($1, $2, $3, true, $4, $5, $6)
       RETURNING id_version, titulo, activa, tipo_cambio, created_at`,
      [newId, titulo.trim(), textoLegal.trim(), tipoCambio, userId, tenantId]
    );

    let desactualizados = 0;

    // Si el cambio es mayor: marcar como 'desactualizado' todos los consentimientos
    // firmados con versiones anteriores y limpiar el flag del cliente
    if (tipoCambio === 'mayor') {
      const updateResult = await query(
        `UPDATE clinical.consentimientos
         SET estado = 'desactualizado', updated_at = NOW()
         WHERE estado = 'firmado' AND id_version < $1
         RETURNING id_cliente`,
        [newId]
      );
      desactualizados = updateResult.rows.length;

      // Limpiar flag consentimiento_firmado en los clientes afectados (solo del tenant del usuario)
      if (desactualizados > 0) {
        const idsClientes = [...new Set(updateResult.rows.map(r => r.id_cliente))];
        await query(
          `UPDATE clinical.clientes
           SET consentimiento_firmado = false,
               id_consentimiento_vigente = NULL
           WHERE id_cliente = ANY($1::uuid[])
             AND id_tenant = $2`,
          [idsClientes, req.tenantId ?? req.user?.tenant_id]
        );
      }
    }

    return res.json({
      message: tipoCambio === 'mayor'
        ? `Texto actualizado (cambio mayor). ${desactualizados} consentimiento(s) marcado(s) como desactualizados.`
        : 'Texto del consentimiento actualizado correctamente (cambio menor, firmas anteriores siguen vigentes).',
      version: insertResult.rows[0],
      desactualizados
    });
  } catch (error) {
    console.error('Error en updateTextoConsentimiento:', error);
    return res.status(500).json({ message: 'Error al actualizar el texto del consentimiento' });
  }
}

/**
 * PUT /api/clinical/pacientes/cliente/:idCliente/consentimiento/revocar
 * Revoca manualmente el consentimiento firmado vigente del cliente.
 * Solo admin o vet. Requiere { motivo: string } en el body.
 */
export async function revocarConsentimiento(req, res) {
  const { id } = req.params; // idCliente
  const { motivo } = req.body;
  const tenantId = req.tenantId ?? req.user?.tenant_id;

  if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 5) {
    return res.status(400).json({ message: 'Se requiere un motivo de revocación (mínimo 5 caracteres).' });
  }

  try {
    // Buscar el consentimiento firmado vigente del cliente (filtrado por tenant)
    const result = await query(
      `SELECT c.id_consentimiento, c.pdf_numero, cl.nombre AS cliente_nombre, cl.email AS cliente_email
       FROM clinical.consentimientos c
       JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente AND cl.id_tenant = c.id_tenant
      WHERE c.id_cliente = $1 AND c.id_tenant = $2 AND c.estado IN ('firmado', 'desactualizado')
       ORDER BY c.firmado_en DESC
       LIMIT 1`,
      [id, tenantId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'No hay consentimiento vigente para revocar.' });
    }

    const consent = result.rows[0];
    const idConsentimiento = consent.id_consentimiento;

    await query(
      `UPDATE clinical.consentimientos
       SET estado = 'revocado', updated_at = NOW()
       WHERE id_consentimiento = $1`,
      [idConsentimiento]
    );

    // Limpiar flag del cliente
    await query(
      `UPDATE clinical.clientes
       SET consentimiento_firmado = false,
           id_consentimiento_vigente = NULL
       WHERE id_cliente = $1`,
      [id]
    );

    if (consent.cliente_email) {
      const subject = 'Notificación de revocación de consentimiento';
      const textBody =
        `Hola ${consent.cliente_nombre || 'propietario'},\n\n` +
        `Te informamos que tu consentimiento de tratamiento de datos personales fue revocado.\n` +
        `Si deseas otorgar nuevamente tu consentimiento, comunícate con la clínica.`;
      const htmlBody =
        `<p>Hola ${consent.cliente_nombre || 'propietario'},</p>` +
        `<p>Te informamos que tu consentimiento de tratamiento de datos personales fue <strong>revocado</strong>.</p>` +
        `<p>Si deseas otorgar nuevamente tu consentimiento, comunícate con la clínica.</p>`;

      try {
        const sendResult = await sendEmail({
          tenantId,
          to: consent.cliente_email,
          subject,
          text: textBody,
          html: htmlBody,
          attachments: []
        });

        await logConsentEmailDelivery({
          tenantId,
          userId: req.user?.id_usuario || req.user?.id || null,
          tipoDocumento: 'consentimiento_pdf',
          idCliente: id,
          idConsentimiento,
          destinatarioEmail: consent.cliente_email,
          asunto: subject,
          estado: 'enviado',
          providerMessageId: sendResult?.messageId || null,
          metadata: {
            mode: 'revocacion',
            motivo_revocacion: motivo.trim(),
            email_snapshot: sendResult?.emailSnapshot || null,
            id_cliente: id,
            id_consentimiento: idConsentimiento,
            pdf_numero: consent.pdf_numero || null
          }
        });
      } catch (mailError) {
        console.error('No se pudo enviar correo de revocación:', mailError);
        await logConsentEmailDelivery({
          tenantId,
          userId: req.user?.id_usuario || req.user?.id || null,
          tipoDocumento: 'consentimiento_pdf',
          idCliente: id,
          idConsentimiento,
          destinatarioEmail: consent.cliente_email,
          asunto: subject,
          estado: 'fallido',
          detalleError: mailError?.message || 'Error enviando correo de revocación',
          metadata: {
            mode: 'revocacion',
            motivo_revocacion: motivo.trim(),
            id_cliente: id,
            id_consentimiento: idConsentimiento,
            pdf_numero: consent.pdf_numero || null
          }
        });
      }
    }

    return res.json({ message: 'Consentimiento revocado correctamente.' });
  } catch (error) {
    console.error('Error en revocarConsentimiento:', error);
    return res.status(500).json({ message: 'Error al revocar el consentimiento.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS (sin autenticación — token de un solo uso)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/public/consentimiento/:token
 * Valida el token y devuelve los datos necesarios para renderizar el formulario de firma.
 */
export async function obtenerFormularioPublico(req, res) {
  const { token } = req.params;

  // Validar formato UUID básico para evitar inyección
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return res.status(400).json({ message: 'Token inválido' });
  }

  try {
    const result = await query(
      `SELECT c.id_consentimiento, c.estado, c.token_expires_at,
          c.id_tenant,
              cl.id_cliente AS id_cliente, cl.nombre AS cliente_nombre, cl.cedula,
              v.titulo, v.texto_legal, v.id_version,
              emp.nombre_empresa, emp.nit, emp.direccion, emp.email AS email_empresa, emp.logo_url
       FROM clinical.consentimientos c
        JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente AND cl.id_tenant = c.id_tenant
        JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version AND v.id_tenant = c.id_tenant
       LEFT JOIN system.configuracion_empresa emp ON emp.activa = true AND emp.id_tenant = c.id_tenant
       WHERE c.token = $1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'El enlace no es válido o ya fue utilizado' });
    }

    const row = result.rows[0];

    if (row.estado !== 'pendiente') {
      return res.status(410).json({
        message: row.estado === 'firmado'
          ? 'Este consentimiento ya fue firmado'
          : 'Este enlace ha expirado',
        estado: row.estado
      });
    }

    if (new Date(row.token_expires_at) < new Date()) {
      await query(
        `UPDATE clinical.consentimientos SET estado = 'expirado' WHERE token = $1`,
        [token]
      );
      return res.status(410).json({ message: 'Este enlace ha expirado', estado: 'expirado' });
    }

    // Aplicar los mismos placeholders que se usan al generar el PDF,
    // para que el propietario lea exactamente el texto que quedará en el documento firmado
    const textoResuelto = resolveConsentText(row.texto_legal, {
      nombre: row.nombre_empresa,
      nit: row.nit,
      direccion: row.direccion,
      email: row.email_empresa
    });

    return res.json({
      idConsentimiento: row.id_consentimiento,
      cliente: {
        nombre: row.cliente_nombre,
        cedula: row.cedula
      },
      version: {
        id: row.id_version,
        titulo: row.titulo,
        textoLegal: textoResuelto
      },
      empresa: {
        nombre: row.nombre_empresa,
        logoUrl: toAbsoluteAssetUrl(req, row.logo_url)
      },
      expiresAt: row.token_expires_at,
      tokenDurationHours: TOKEN_DURATION_HOURS
    });
  } catch (error) {
    console.error('Error en obtenerFormularioPublico:', error);
    return res.status(500).json({ message: 'Error al cargar el formulario' });
  }
}

/**
 * POST /api/public/consentimiento/:token/firmar
 * Recibe la firma canvas en base64, genera el PDF y marca el consentimiento como firmado.
 * Body: { firmaBase64: "data:image/png;base64,..." }
 */
export async function firmarConsentimiento(req, res) {
  const { token } = req.params;
  const { firmaBase64 } = req.body;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return res.status(400).json({ message: 'Token inválido' });
  }

  if (!firmaBase64 || typeof firmaBase64 !== 'string') {
    return res.status(400).json({ message: 'Se requiere la firma' });
  }

  // Validar que sea una imagen base64 válida (png o jpeg)
  if (!/^data:image\/(png|jpeg|jpg);base64,/.test(firmaBase64)) {
    return res.status(400).json({ message: 'Formato de firma inválido' });
  }

  // Límite de tamaño: ~500KB como base64
  if (firmaBase64.length > 700000) {
    return res.status(400).json({ message: 'La imagen de firma es demasiado grande' });
  }

  try {
    // Cargar consentimiento con datos del cliente y versión
    const consentResult = await query(
        `SELECT c.id_consentimiento, c.estado, c.token_expires_at, c.id_cliente, c.id_version,
          c.id_tenant,
              cl.nombre AS cliente_nombre, cl.cedula, cl.email, cl.telefono,
              v.texto_legal, v.id_version AS ver_id
       FROM clinical.consentimientos c
        JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente AND cl.id_tenant = c.id_tenant
        JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version AND v.id_tenant = c.id_tenant
       WHERE c.token = $1`,
      [token]
    );

    if (!consentResult.rows.length) {
      return res.status(404).json({ message: 'El enlace no es válido' });
    }

    const row = consentResult.rows[0];

    if (row.estado !== 'pendiente') {
      return res.status(410).json({
        message: row.estado === 'firmado'
          ? 'Este consentimiento ya fue firmado'
          : 'Este enlace ha expirado',
        estado: row.estado
      });
    }

    if (new Date(row.token_expires_at) < new Date()) {
      await query(
        `UPDATE clinical.consentimientos SET estado = 'expirado' WHERE token = $1`,
        [token]
      );
      return res.status(410).json({ message: 'Este enlace ha expirado', estado: 'expirado' });
    }

    // IP y device del firmante
    const ipFirmante = req.ip || req.connection?.remoteAddress || null;
    const deviceInfo = req.headers['user-agent'] || null;

    // Guardar firma en DB primero (necesaria para el PDF)
    await query(
      `UPDATE clinical.consentimientos
       SET firma_imagen = $1, ip_firmante = $2, device_info = $3
       WHERE id_consentimiento = $4`,
      [firmaBase64, ipFirmante, deviceInfo, row.id_consentimiento]
    );

    // Generar número de documento
    const pdfNumero = await generarNumeroPDF();

    // Generar PDF
    const pdfPath = await generarPDFConsentimiento({
      consentimiento: {
        ...row,
        id: row.id_consentimiento,
        firma_imagen: firmaBase64,
        firmado_en: new Date().toISOString(),
        ip_firmante: ipFirmante,
        device_info: deviceInfo
      },
      cliente: {
        nombre: row.cliente_nombre,
        cedula: row.cedula,
        email: row.email,
        telefono: row.telefono
      },
      textoLegal: row.texto_legal,
      pdfNumero,
      tenantId: row.id_tenant
    });

    // Marcar consentimiento como firmado y guardar PDF
    await query(
      `UPDATE clinical.consentimientos
       SET estado = 'firmado',
           firmado_en = NOW(),
           pdf_path = $1,
           pdf_numero = $2
       WHERE id_consentimiento = $3`,
      [pdfPath, pdfNumero, row.id_consentimiento]
    );

    // Actualizar cliente: consentimiento_firmado = true
    await query(
      `UPDATE clinical.clientes
       SET consentimiento_firmado = true,
           id_consentimiento_vigente = $1
       WHERE id_cliente = $2`,
      [row.id_consentimiento, row.id_cliente]
    );

    // El flujo de firma se ejecuta por ruta pública; invalidamos caché clínica para
    // que estado/listados reflejen "firmado" inmediatamente sin reiniciar PM2.
    invalidateConsentRelatedCache();

    if (row.email) {
      const absolutePath = path.join(__dirname, '../../', pdfPath);
      const pdfBuffer = await fs.readFile(absolutePath);
      const fileName = `consentimiento-${pdfNumero || row.id_consentimiento}.pdf`;
      const subject = 'Consentimiento firmado - copia del documento';
      const textBody =
        `Hola ${row.cliente_nombre || 'propietario'},\n\n` +
        `Adjuntamos la copia de tu consentimiento firmado en formato PDF.\n` +
        `Número de documento: ${pdfNumero}.`;
      const htmlBody =
        `<p>Hola ${row.cliente_nombre || 'propietario'},</p>` +
        `<p>Adjuntamos la copia de tu consentimiento firmado en formato PDF.</p>` +
        `<p><strong>Número de documento:</strong> ${pdfNumero}</p>`;

      try {
        const sendResult = await sendEmail({
          tenantId: row.id_tenant,
          to: row.email,
          subject,
          text: textBody,
          html: htmlBody,
          attachments: [
            {
              filename: fileName,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });

        await query(
          `UPDATE clinical.consentimientos
           SET email_enviado = true
           WHERE id_consentimiento = $1`,
          [row.id_consentimiento]
        );

        await logConsentEmailDelivery({
          tenantId: row.id_tenant,
          userId: null,
          tipoDocumento: 'consentimiento_pdf',
          idCliente: row.id_cliente,
          idConsentimiento: row.id_consentimiento,
          destinatarioEmail: row.email,
          asunto: subject,
          estado: 'enviado',
          providerMessageId: sendResult?.messageId || null,
          metadata: {
            mode: 'firma_automatica',
            pdf_numero: pdfNumero,
            email_snapshot: sendResult?.emailSnapshot || null,
            id_cliente: row.id_cliente,
            id_consentimiento: row.id_consentimiento
          }
        });
      } catch (mailError) {
        console.error('No se pudo enviar correo automático de consentimiento firmado:', mailError);
        await logConsentEmailDelivery({
          tenantId: row.id_tenant,
          userId: null,
          tipoDocumento: 'consentimiento_pdf',
          idCliente: row.id_cliente,
          idConsentimiento: row.id_consentimiento,
          destinatarioEmail: row.email,
          asunto: subject,
          estado: 'fallido',
          detalleError: mailError?.message || 'Error enviando consentimiento firmado',
          metadata: {
            mode: 'firma_automatica',
            pdf_numero: pdfNumero,
            id_cliente: row.id_cliente,
            id_consentimiento: row.id_consentimiento
          }
        });
      }
    }

    return res.json({
      message: 'Consentimiento firmado exitosamente. Gracias.',
      pdfNumero
    });
  } catch (error) {
    console.error('Error en firmarConsentimiento:', error);
    return res.status(500).json({ message: 'Error al procesar la firma' });
  }
}
