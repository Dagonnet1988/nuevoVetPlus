import {
  listEmailTemplates,
  getEmailTemplateByKey,
  updateEmailTemplateByKey,
  resetEmailTemplateToDefault
} from '../services/emailTemplateService.js';

export async function getEmailTemplates(req, res) {
  try {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id || null;
    const templates = await listEmailTemplates(tenantId, userId);

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error obteniendo plantillas de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function getEmailTemplate(req, res) {
  try {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id || null;
    const key = String(req.params.key || '').trim();

    if (!key) {
      return res.status(400).json({ success: false, message: 'La clave de plantilla es obligatoria' });
    }

    const template = await getEmailTemplateByKey(tenantId, key, userId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error obteniendo plantilla de correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function updateEmailTemplate(req, res) {
  try {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id || null;
    const key = String(req.params.key || '').trim();

    if (!key) {
      return res.status(400).json({ success: false, message: 'La clave de plantilla es obligatoria' });
    }

    const updated = await updateEmailTemplateByKey({
      tenantId,
      key,
      payload: req.body || {},
      userId
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });
    }

    return res.json({
      success: true,
      message: 'Plantilla actualizada correctamente',
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando plantilla de correo:', error);
    return res.status(400).json({ success: false, message: error.message || 'No se pudo actualizar la plantilla' });
  }
}

export async function resetEmailTemplate(req, res) {
  try {
    const tenantId = req.tenantId ?? req.user?.tenant_id;
    const userId = req.user?.id_usuario || req.user?.id || null;
    const key = String(req.params.key || '').trim();

    if (!key) {
      return res.status(400).json({ success: false, message: 'La clave de plantilla es obligatoria' });
    }

    const restored = await resetEmailTemplateToDefault(tenantId, key, userId);

    return res.json({
      success: true,
      message: 'Plantilla restaurada al valor predeterminado',
      data: restored
    });
  } catch (error) {
    console.error('Error restaurando plantilla de correo:', error);
    return res.status(400).json({ success: false, message: error.message || 'No se pudo restaurar la plantilla' });
  }
}
