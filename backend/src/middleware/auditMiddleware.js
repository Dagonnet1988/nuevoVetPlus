import { query } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { isAuditExcluded } from '../utils/activityLog.js';

/**
 * Middleware global de auditoría para interceptar todas las requests
 * y registrar actividades de usuarios
 */

// Lista de rutas que NO requieren auditoría (para evitar spam de logs)
const EXCLUDED_ROUTES = [
  '/api/auth/me',           // Consulta info usuario actual (muy frecuente)
  '/api/clinical/test',     // Rutas de prueba
  '/favicon.ico',           // Requests del browser
  '/health',                // Health checks
];

// Lista de métodos que SÍ requieren auditoría
const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Lista de rutas de alta sensibilidad (siempre auditar, incluso GET)
// Solo estas rutas guardan response_data en BD
const HIGH_SENSITIVITY_ROUTES = [
  '/api/auth/admin/reset-password',
  '/api/auth/admin/generate-temp-password',
];

/**
 * Middleware para establecer contexto de usuario en la base de datos
 */
export const setAuditContext = async (req, res, next) => {
  try {
    // Solo establecer contexto si hay usuario autenticado
    if (req.user && req.user.id) {
      await query("SELECT set_config('app.current_user_id', $1, true)", [req.user.id]);
      
      // También establecer IP y User Agent si están disponibles
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      await query("SELECT set_config('app.client_ip', $1, true)", [clientIP]);
      await query("SELECT set_config('app.user_agent', $1, true)", [userAgent]);
    }
  } catch (error) {
    console.error('Error setting audit context:', error.message);
    // No fallar la request por error de auditoría
  }
  
  next();
};

/**
 * Middleware principal de auditoría de actividades
 */
export const auditActivity = async (req, res, next) => {
  const startTime = Date.now();
  const originalUrl = req.originalUrl;
  const method = req.method;
  
  // Verificar si la ruta debe ser auditada
  const shouldAudit = shouldAuditRequest(originalUrl, method);
  
  if (!shouldAudit) {
    return next();
  }
  
  // Datos básicos de la request (userId y tenantId se capturan al responder,
  // cuando authenticateToken ya los habrá poblado en req)
  const requestData = {
    url: originalUrl,
    method: method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userName: req.user?.nombre || null,
    userEmail: req.user?.email || null,
    entityId: extractEntityIdFromUrl(originalUrl),
    timestamp: new Date(),
    body: sanitizeRequestBody(req.body),
    query: req.query
  };

  // Capturar un snapshot previo cuando aplica para poder mostrar "antes y despues"
  requestData.entityContext = await captureEntityContext(req, requestData);
  
  // Interceptar la respuesta para capturar el resultado
  const originalSend = res.send;
  let responseData = null;
  let statusCode = null;
  
  res.send = function(data) {
    statusCode = res.statusCode;

    // Capturar userId y tenantId aquí: authenticateToken ya los pobló en req.
    // /auth/login es la excepción: en esa ruta req.user nunca existe (todavía
    // no hay sesión), así que sin esto todo login (éxito o falla) quedaba
    // con id_usuario NULL en activity_log — visible en la lista de acciones
    // pero sin usuario asociado. authController.login() deja resuelto
    // req.attemptedUserId apenas encuentra el documento, incluso si falla
    // después (contraseña incorrecta, usuario bloqueado, etc.).
    requestData.userId   = req.user ? req.user.id : (req.attemptedUserId || null);
    requestData.tenantId = req.tenantId || null;
    
    // Capturar respuesta para rutas auditables. En rutas no críticas se guarda resumen compacto.
    if (AUDITABLE_METHODS.includes(method) || isHighSensitivityRoute(originalUrl)) {
      try {
        const parsedResponse = typeof data === 'string' ? JSON.parse(data) : data;
        // Sanitizar respuesta (remover datos sensibles)
        responseData = sanitizeResponseData(parsedResponse);

        if (!isHighSensitivityRoute(originalUrl)) {
          responseData = summarizeResponseForAudit(responseData);
        }
      } catch (e) {
        responseData = { type: 'response_data_unparseable' };
      }
    }
    
    // Llamar al send original
    originalSend.call(this, data);
    
    // Registrar auditoría DESPUÉS de enviar la respuesta (no bloquea al cliente)
    setImmediate(() => {
      logActivity(requestData, statusCode, responseData, Date.now() - startTime);
    });
  };
  
  next();
};

/**
 * Extraer el UUID de la entidad afectada desde la URL
 * Ej: /api/clinical/pacientes/a1556b25-32b1-4040-9bcc-65a3fe7e82c6 → a1556b25-...
 */
function extractEntityIdFromUrl(url) {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = url.match(uuidRegex);
  return match ? match[0] : null;
}

/**
 * Determinar si una request debe ser auditada
 */
function shouldAuditRequest(url, method) {
  // Excluir rutas específicas
  if (EXCLUDED_ROUTES.some(route => url.includes(route))) {
    return false;
  }
  
  // Siempre auditar rutas de alta sensibilidad
  if (HIGH_SENSITIVITY_ROUTES.some(route => url.includes(route))) {
    return true;
  }
  
  // Auditar métodos que modifican datos
  if (AUDITABLE_METHODS.includes(method)) {
    return true;
  }
  
  // Auditar GET en rutas específicas (consultas médicas, administración)
  if (method === 'GET' && (
    url.includes('/api/clinical/consultas') ||
    url.includes('/api/auth/admin')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Verificar si es ruta de alta sensibilidad
 */
function isHighSensitivityRoute(url) {
  return HIGH_SENSITIVITY_ROUTES.some(route => url.includes(route));
}

/**
 * Sanitizar datos del request body (remover contraseñas y datos sensibles)
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remover campos sensibles
  const sensitiveFields = [
    'password', 'contraseña', 'password_hash', 
    'token', 'refresh_token', 'jwt',
    'tarjeta', 'card_number', 'cvv'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Sanitizar datos de respuesta
 */
function sanitizeResponseData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Remover tokens y datos sensibles de respuesta
  if (sanitized.token) {
    sanitized.token = '[REDACTED]';
  }
  
  if (sanitized.data && sanitized.data.password) {
    sanitized.data = { ...sanitized.data, password: '[REDACTED]' };
  }

  if (sanitized.data && sanitized.data.firma_imagen) {
    sanitized.data = { ...sanitized.data, firma_imagen: '[REDACTED]' };
  }
  
  return sanitized;
}

function summarizeResponseForAudit(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const summary = {
    success: data.success,
    message: data.message
  };

  const payload = data.data;
  if (payload && typeof payload === 'object') {
    const candidate = payload.cliente || payload.mascota || payload.user || payload;
    if (candidate && typeof candidate === 'object') {
      summary.data = {
        id_cliente: candidate.id_cliente,
        id_mascota: candidate.id_mascota,
        id_cita: candidate.id_cita,
        nombre: candidate.nombre,
        codigo_cita: candidate.codigo_cita,
        activo: candidate.activo
      };
    }
  }

  return summary;
}

/**
 * Registrar actividad en la base de datos
 */
async function logActivity(requestData, statusCode, responseData, duration) {
  if (isAuditExcluded(requestData.userId)) return;

  try {
    const activityType = determineActivityType(requestData.url, requestData.method, statusCode);
    const description = generateActivityDescription(requestData, statusCode);
    
    await query(`
      INSERT INTO system.activity_log (
        id_log,
        id_usuario,
        tipo_actividad,
        descripcion,
        url,
        metodo_http,
        status_code,
        duracion_ms,
        ip_address,
        user_agent,
        request_data,
        response_data,
        id_tenant,
        id_entidad_afectada
      ) VALUES (
        uuid_generate_v4(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
    `, [
      requestData.userId,
      activityType,
      description,
      requestData.url,
      requestData.method,
      statusCode,
      duration,
      requestData.ip,
      requestData.userAgent,
      JSON.stringify({
        body: requestData.body,
        query: requestData.query,
        entity_context: requestData.entityContext || null
      }),
      responseData ? JSON.stringify(responseData) : null,
      requestData.tenantId,
      requestData.entityId
    ]);
    
  } catch (error) {
    console.error('Error logging activity:', error.message);
    // No fallar la aplicación por errores de auditoría
  }
}

/**
 * Determinar tipo de actividad
 */
function determineActivityType(url, method, statusCode) {
  if (url.includes('/auth/login')) return 'LOGIN';
  if (url.includes('/auth/logout')) return 'LOGOUT';
  if (url.includes('/auth/admin/reset-password')) return 'PASSWORD_RESET';
  if (url.includes('/api/clinical/consultas') || url.includes('/api/clinical/historias')) return 'MEDICAL_ACCESS';
  if (url.includes('/api/clinical/clientes')) return 'CLIENT_MANAGEMENT';
  if (url.includes('/api/clinical/mascotas')) return 'PET_MANAGEMENT';
  if (url.includes('/api/clinical/citas') || url.includes('/api/clinical/appointments')) return 'CITAS';
  
  // Tipos genéricos por método
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET') return 'READ';
  
  return 'OTHER';
}

/**
 * Generar descripción legible de la actividad (en español)
 */
function generateActivityDescription(requestData, statusCode) {
  const { url, method, body, ip, userName, userEmail, entityId, entityContext } = requestData;
  const ok = statusCode < 400;
  const estado = ok ? 'Exitoso' : 'Fallido';
  const actor = userName || userEmail || 'Usuario';
  const sourceIp = ip || 'IP desconocida';

  const accionByMethod = {
    POST: 'creó',
    PUT: 'actualizó',
    PATCH: 'actualizó',
    DELETE: 'eliminó',
    GET: 'consultó'
  };
  const accion = accionByMethod[method] ?? 'ejecutó';

  const extractName = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  };

  const formatEstadoCita = (estado) => {
    if (!estado || typeof estado !== 'string') return null;
    return estado.replace(/_/g, ' ').trim();
  };

  // Auth
  if (url.includes('/auth/login'))                   return `${estado}: ${actor} inició sesión desde ${sourceIp}`;
  if (url.includes('/auth/logout'))                  return `${estado}: ${actor} cerró sesión desde ${sourceIp}`;
  if (url.includes('/auth/admin/reset-password'))    return `${estado}: ${actor} restableció una contraseña desde ${sourceIp}`;
  if (url.includes('/auth/admin/generate-temp'))     return `${estado}: ${actor} generó contraseña temporal desde ${sourceIp}`;
  if (url.includes('/auth/change-password'))         return `${estado}: ${actor} cambió su contraseña desde ${sourceIp}`;

  // Recursos clínicos con detalle humano
  if (url.includes('/clinical/clientes')) {
    const ownerName = extractName(body?.nombre, entityContext?.name);
    if (url.includes('/restore')) {
      return `${estado}: ${actor} reactivó propietario${ownerName ? ` "${ownerName}"` : ''}${entityId ? ` (id: ${entityId})` : ''} desde ${sourceIp}`;
    }
    return `${estado}: ${actor} ${accion} propietario${ownerName ? ` "${ownerName}"` : ''}${entityId ? ` (id: ${entityId})` : ''}${buildChangesSuffix(entityContext, body)} desde ${sourceIp}`;
  }

  if (url.includes('/clinical/mascotas') || url.includes('/clinical/pacientes/mascota')) {
    const petName = extractName(body?.nombre, body?.nombre_mascota, entityContext?.name);
    return `${estado}: ${actor} ${accion} mascota${petName ? ` "${petName}"` : ''}${entityId ? ` (id: ${entityId})` : ''}${buildChangesSuffix(entityContext, body)} desde ${sourceIp}`;
  }

  if (url.includes('/clinical/citas') || url.includes('/clinical/appointments')) {
    const code = entityContext?.meta?.codigo_cita;

    if (url.includes('/status') && method === 'PATCH') {
      const estadoAnterior = formatEstadoCita(entityContext?.before?.estado);
      const estadoNuevo = formatEstadoCita(body?.estado);
      return `${estado}: ${actor} cambió estado de cita${code ? ` ${code}` : ''}${entityId ? ` (id: ${entityId})` : ''}${estadoAnterior || estadoNuevo ? ` de "${truncateAuditValue(estadoAnterior || 'vacio')}" a "${truncateAuditValue(estadoNuevo || 'vacio')}"` : ''} desde ${sourceIp}`;
    }

    return `${estado}: ${actor} ${accion} cita${code ? ` ${code}` : ''}${entityId ? ` (id: ${entityId})` : ''}${buildChangesSuffix(entityContext, body)} desde ${sourceIp}`;
  }

  if (url.includes('/clinical/consultas') || url.includes('/clinical/historias')) {
    const petName = extractName(body?.mascota_nombre, entityContext?.meta?.mascota_nombre);
    const tipoDoc = extractName(body?.tipo_documento, entityContext?.meta?.tipo_documento);
    return `${estado}: ${actor} ${accion} documento de historia clínica${tipoDoc ? ` (${tipoDoc})` : ''}${petName ? ` de "${petName}"` : ''}${entityId ? ` (id: ${entityId})` : ''}${buildChangesSuffix(entityContext, body)} desde ${sourceIp}`;
  }
  if (url.includes('/clinical/pacientes'))    return `${estado}: ${actor} ${accion} paciente${entityId ? ` (id: ${entityId})` : ''}${buildChangesSuffix(entityContext, body)} desde ${sourceIp}`;
  if (url.includes('/clinical/consentim'))    return `${estado}: ${actor} ${accion} consentimiento${entityId ? ` (id: ${entityId})` : ''} desde ${sourceIp}`;
  if (url.includes('/clinical/archivos'))     return `${estado}: ${actor} ${accion} archivo adjunto${entityId ? ` (id: ${entityId})` : ''} desde ${sourceIp}`;

  // Administración
  if (url.includes('/auth/users'))            return `${estado}: ${actor} ${accion} usuario del sistema${entityId ? ` (id: ${entityId})` : ''} desde ${sourceIp}`;
  if (url.includes('/empresa'))               return `${estado}: ${actor} ${accion} configuración de empresa desde ${sourceIp}`;
  if (url.includes('/audit'))                 return `${estado}: ${actor} consultó auditoría desde ${sourceIp}`;

  return `${estado}: ${actor} ${accion} ${url.split('?')[0]}${entityId ? ` (id: ${entityId})` : ''} desde ${sourceIp}`;
}

function buildChangesSuffix(entityContext, body) {
  if (!entityContext?.before || !body || typeof body !== 'object') return '';

  const before = entityContext.before;
  const changed = [];

  for (const [key, newValueRaw] of Object.entries(body)) {
    if (!(key in before)) continue;
    const oldValueRaw = before[key];
    const oldValue = normalizeAuditValue(oldValueRaw);
    const newValue = normalizeAuditValue(newValueRaw);
    if (oldValue === newValue) continue;

    changed.push(`${translateFieldName(key)}: "${truncateAuditValue(oldValue)}" -> "${truncateAuditValue(newValue)}"`);
    if (changed.length >= 3) break;
  }

  if (changed.length === 0) return '';
  return ` | Cambios: ${changed.join('; ')}`;
}

function normalizeAuditValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function truncateAuditValue(value) {
  if (!value) return 'vacio';
  return value.length > 45 ? `${value.slice(0, 42)}...` : value;
}

function translateFieldName(field) {
  const map = {
    nombre: 'nombre',
    telefono: 'telefono',
    email: 'correo',
    direccion: 'direccion',
    estado: 'estado',
    motivo: 'motivo',
    notas: 'notas',
    tipo_documento: 'tipo de documento',
    diagnostico: 'diagnostico',
    tratamiento: 'tratamiento'
  };
  return map[field] || field;
}

async function captureEntityContext(req, requestData) {
  try {
    const { method } = requestData;
    if (!['PUT', 'PATCH', 'DELETE'].includes(method)) return null;
    if (!requestData.entityId) return null;
    const tenantId = req.tenantId;
    if (!tenantId) return null;

    if (requestData.url.includes('/clinical/clientes')) {
      const result = await query(
        `SELECT id_cliente, nombre, telefono, email, direccion, activo
         FROM clinical.clientes
         WHERE id_cliente = $1 AND id_tenant = $2`,
        [requestData.entityId, tenantId]
      );
      if (!result.rows.length) return null;
      return {
        entity: 'propietario',
        name: result.rows[0].nombre,
        before: result.rows[0],
        meta: {}
      };
    }

    if (requestData.url.includes('/clinical/mascotas')) {
      const result = await query(
        `SELECT m.id_mascota, m.nombre, m.especie, m.raza, m.peso, m.activo
         FROM clinical.mascotas m
         WHERE m.id_mascota = $1 AND m.id_tenant = $2`,
        [requestData.entityId, tenantId]
      );
      if (!result.rows.length) return null;
      return {
        entity: 'mascota',
        name: result.rows[0].nombre,
        before: result.rows[0],
        meta: {}
      };
    }

    if (requestData.url.includes('/clinical/historias')) {
      const result = await query(
        `SELECT h.id_historia, h.estado, h.tipo_documento, h.diagnostico, h.tratamiento,
                m.nombre AS mascota_nombre
         FROM clinical.historias_clinicas h
         JOIN clinical.mascotas m ON m.id_mascota = h.id_mascota
         WHERE h.id_historia = $1 AND h.id_tenant = $2`,
        [requestData.entityId, tenantId]
      );
      if (!result.rows.length) return null;
      return {
        entity: 'historia_clinica',
        name: result.rows[0].mascota_nombre,
        before: result.rows[0],
        meta: {
          mascota_nombre: result.rows[0].mascota_nombre,
          tipo_documento: result.rows[0].tipo_documento
        }
      };
    }

    if (requestData.url.includes('/clinical/citas') || requestData.url.includes('/clinical/appointments')) {
      const result = await query(
        `SELECT id_cita, codigo_cita, estado, tipo, motivo
         FROM clinical.calendario_citas
         WHERE id_cita = $1 AND id_tenant = $2`,
        [requestData.entityId, tenantId]
      );
      if (!result.rows.length) return null;
      return {
        entity: 'cita',
        name: result.rows[0].codigo_cita,
        before: result.rows[0],
        meta: {
          codigo_cita: result.rows[0].codigo_cita
        }
      };
    }
  } catch (error) {
    console.warn('No se pudo capturar snapshot previo de auditoria:', error.message);
  }

  return null;
}

/**
 * Middleware para auditar login/logout específicamente
 */
export const auditAuthActivity = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    originalSend.call(this, data);
    
    // Log específico de autenticación (asíncrono, no bloquea respuesta)
    if (req.originalUrl.includes('/auth/login')) {
      setImmediate(() => logAuthActivity('LOGIN', req, res.statusCode, data));
    } else if (req.originalUrl.includes('/auth/logout')) {
      setImmediate(() => logAuthActivity('LOGOUT', req, res.statusCode, data));
    }
  };
  
  next();
};

/**
 * Registrar actividad específica de autenticación
 */
async function logAuthActivity(type, req, statusCode, responseData) {
  try {
    const success = statusCode < 400;
    let userId = null;
    let sessionKey = req.authToken?.jti || null;
    let tokenExp = req.authToken?.exp || null;

    // Para login exitoso, extraer user ID de la respuesta
    if (type === 'LOGIN' && success && responseData) {
      try {
        const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        // Estructura esperada del login: { data: { user: { id } } }
        userId = parsed?.data?.user?.id || parsed?.user?.id || parsed?.data?.id || null;

        const accessToken = parsed?.data?.token || parsed?.token;
        if (accessToken) {
          const decoded = jwt.decode(accessToken);
          sessionKey = decoded?.jti || sessionKey;
          tokenExp = decoded?.exp || tokenExp;
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    // Login fallido (contraseña incorrecta, usuario bloqueado, etc.): el
    // controller de login ya resolvió a qué usuario correspondía el intento
    // y lo dejó en req.attemptedUserId — sin esto, todo intento fallido
    // quedaba con id_usuario NULL y era invisible para los filtros por tenant.
    let failureReason = null;
    let failureMessage = null;
    if (type === 'LOGIN' && !success) {
      if (req.attemptedUserId) userId = req.attemptedUserId;

      try {
        const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        failureReason = parsed?.error || null;
        failureMessage = parsed?.message || null;
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    // Para logout, usar el usuario del request
    if (type === 'LOGOUT' && req.user) {
      userId = req.user.id;
    }

    if (isAuditExcluded(userId)) return;

    // Tenant: lo deja el controller en req.tenantId (resuelto por subdominio
    // o por el usuario encontrado), incluso en intentos fallidos.
    const tenantId = req.tenantId || null;

    await query(`
      INSERT INTO system.session_audit (
        id_session,
        id_usuario,
        id_tenant,
        tipo_evento,
        exito,
        ip_address,
        user_agent,
        detalles
      ) VALUES (
        uuid_generate_v4(),
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      userId,
      tenantId,
      type,
      success,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent'),
      JSON.stringify({
        statusCode,
        timestamp: new Date(),
        url: req.originalUrl,
        session_key: sessionKey,
        token_exp: tokenExp,
        documento_intentado: req.attemptedDocumento || undefined,
        motivo: failureReason || undefined,
        motivo_detalle: failureMessage || undefined
      })
    ]);

  } catch (error) {
    console.error('Error logging auth activity:', error.message);
  }
}