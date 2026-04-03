import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { generarPDFConsentimiento, generarNumeroPDF } from '../services/consentimientoPDFService.js';

// URL base del frontend (donde se servirá la página pública de firma)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

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
       WHERE activa = true
       LIMIT 1`
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
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

    const insertResult = await query(
      `INSERT INTO clinical.consentimientos
         (id_cliente, id_version, estado, token, token_expires_at, created_by, id_tenant)
       VALUES ($1, $2, 'pendiente', $3, $4, $5, $6)
       RETURNING id_consentimiento, token`,
      [id, version.id_version, token, expiresAt, userId, tenantId]
    );
    const consentimiento = insertResult.rows[0];

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

  try {
    const result = await query(
      `SELECT c.id_consentimiento, c.estado, c.token, c.token_expires_at, c.firmado_en,
              c.pdf_path, c.pdf_numero, c.whatsapp_enviado, c.email_enviado,
              v.titulo AS version_titulo, v.id_version
       FROM clinical.consentimientos c
       JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version
       WHERE c.id_cliente = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [id]
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
      `SELECT id_version, titulo FROM clinical.versiones_consentimiento WHERE activa = true LIMIT 1`
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
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const insertResult = await query(
      `INSERT INTO clinical.consentimientos
         (id_cliente, id_version, estado, token, token_expires_at, created_by, id_tenant)
       VALUES ($1, $2, 'pendiente', $3, $4, $5, $6)
       RETURNING id_consentimiento, token`,
      [id, versionResult.rows[0].id_version, token, expiresAt, userId, tenantId]
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

  try {
    const result = await query(
      `SELECT c.pdf_path, c.pdf_numero, c.estado
       FROM clinical.consentimientos c
       WHERE c.id_cliente = $1 AND c.estado = 'firmado'
       ORDER BY c.firmado_en DESC
       LIMIT 1`,
      [id]
    );

    if (!result.rows.length || !result.rows[0].pdf_path) {
      return res.status(404).json({ message: 'No hay PDF disponible para este cliente' });
    }

    const { pdf_path, pdf_numero } = result.rows[0];

    // pdf_path es relativo a la raíz del backend
    const absolutePath = new URL(`../../${pdf_path}`, import.meta.url).pathname;

    return res.download(absolutePath, `consentimiento-${pdf_numero}.pdf`, (err) => {
      if (err && !res.headersSent) {
        console.error('Error al enviar PDF:', err);
        res.status(500).json({ message: 'Error al descargar el PDF' });
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
  try {
    const result = await query(
      `SELECT id_version, titulo, texto_legal, activa, created_at
       FROM clinical.versiones_consentimiento
       WHERE activa = true
       LIMIT 1`
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
 * Body: { titulo: string, textoLegal: string }
 */
export async function updateTextoConsentimiento(req, res) {
  const { titulo, textoLegal } = req.body;
  const userId = req.user?.id;

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
    return res.status(400).json({ message: 'El título es requerido (mínimo 3 caracteres)' });
  }
  if (!textoLegal || typeof textoLegal !== 'string' || textoLegal.trim().length < 20) {
    return res.status(400).json({ message: 'El texto legal es requerido (mínimo 20 caracteres)' });
  }

  try {
    // Obtener el id_version máximo actual
    const maxResult = await query(
      `SELECT COALESCE(MAX(id_version), 0) AS max_id FROM clinical.versiones_consentimiento`
    );
    const newId = maxResult.rows[0].max_id + 1;

    // Desactivar versión actual
    await query(
      `UPDATE clinical.versiones_consentimiento SET activa = false WHERE activa = true`
    );

    // Insertar nueva versión activa
    const insertResult = await query(
      `INSERT INTO clinical.versiones_consentimiento (id_version, titulo, texto_legal, activa, created_by)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id_version, titulo, texto_legal, activa, created_at`,
      [newId, titulo.trim(), textoLegal.trim(), userId]
    );

    return res.json({
      message: 'Texto del consentimiento actualizado correctamente',
      version: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error en updateTextoConsentimiento:', error);
    return res.status(500).json({ message: 'Error al actualizar el texto del consentimiento' });
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
              cl.id_cliente AS id_cliente, cl.nombre AS cliente_nombre, cl.cedula,
              v.titulo, v.texto_legal, v.id_version,
              emp.nombre_empresa, emp.logo_url
       FROM clinical.consentimientos c
       JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente
       JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version
       LEFT JOIN system.configuracion_empresa emp ON emp.activa = true
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

    return res.json({
      idConsentimiento: row.id_consentimiento,
      cliente: {
        nombre: row.cliente_nombre,
        cedula: row.cedula
      },
      version: {
        id: row.id_version,
        titulo: row.titulo,
        textoLegal: row.texto_legal
      },
      empresa: {
        nombre: row.nombre_empresa,
        logoUrl: row.logo_url
      },
      expiresAt: row.token_expires_at
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
              cl.nombre AS cliente_nombre, cl.cedula, cl.email, cl.telefono,
              v.texto_legal, v.id_version AS ver_id
       FROM clinical.consentimientos c
       JOIN clinical.clientes cl ON cl.id_cliente = c.id_cliente
       JOIN clinical.versiones_consentimiento v ON v.id_version = c.id_version
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

    // Obtener mascota activa del cliente (para el PDF)
    const mascotaResult = await query(
      `SELECT m.nombre, m.especie, m.raza
       FROM clinical.mascotas m
       WHERE m.id_cliente = $1 AND m.activo = true
       ORDER BY m.created_at ASC
       LIMIT 1`,
      [row.id_cliente]
    );

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
      mascota: mascotaResult.rows[0] || null,
      textoLegal: row.texto_legal,
      pdfNumero
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

    return res.json({
      message: 'Consentimiento firmado exitosamente. Gracias.',
      pdfNumero
    });
  } catch (error) {
    console.error('Error en firmarConsentimiento:', error);
    return res.status(500).json({ message: 'Error al procesar la firma' });
  }
}
