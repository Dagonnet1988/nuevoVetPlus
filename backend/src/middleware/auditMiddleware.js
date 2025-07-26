import { query } from '../config/database.js';

/**
 * Middleware global de auditoría para interceptar todas las requests
 * y registrar actividades de usuarios
 */

// Lista de rutas que NO requieren auditoría (para evitar spam de logs)
const EXCLUDED_ROUTES = [
  '/api/auth/me',           // Consulta info usuario actual (muy frecuente)
  '/api/financial/test',    // Rutas de prueba
  '/api/clinical/test',     // Rutas de prueba
  '/favicon.ico',           // Requests del browser
  '/health',                // Health checks
];

// Lista de métodos que SÍ requieren auditoría
const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Lista de rutas de alta sensibilidad (siempre auditar, incluso GET)
const HIGH_SENSITIVITY_ROUTES = [
  '/api/auth/admin/reset-password',
  '/api/auth/admin/generate-temp-password',
  '/api/auth/users',
  '/api/financial/reportes',
  '/api/clinical/consultas',
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
  
  // Datos básicos de la request
  const requestData = {
    url: originalUrl,
    method: method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user ? req.user.id : null,
    timestamp: new Date(),
    body: sanitizeRequestBody(req.body),
    query: req.query
  };
  
  // Interceptar la respuesta para capturar el resultado
  const originalSend = res.send;
  let responseData = null;
  let statusCode = null;
  
  res.send = function(data) {
    statusCode = res.statusCode;
    
    // Solo capturar respuesta para requests críticas
    if (isHighSensitivityRoute(originalUrl)) {
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
        // Sanitizar respuesta (remover datos sensibles)
        responseData = sanitizeResponseData(responseData);
      } catch (e) {
        responseData = { type: 'response_data_unparseable' };
      }
    }
    
    // Llamar al send original
    originalSend.call(this, data);
    
    // Registrar auditoría después de la respuesta
    logActivity(requestData, statusCode, responseData, Date.now() - startTime);
  };
  
  next();
};

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
  
  // Auditar GET en rutas específicas (consultas médicas, reportes)
  if (method === 'GET' && (
    url.includes('/api/clinical/consultas') ||
    url.includes('/api/financial/reportes') ||
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
  
  if (sanitized.data && sensitiveData.password) {
    sanitized.data.password = '[REDACTED]';
  }
  
  return sanitized;
}

/**
 * Registrar actividad en la base de datos
 */
async function logActivity(requestData, statusCode, responseData, duration) {
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
        response_data
      ) VALUES (
        uuid_generate_v4(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
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
      JSON.stringify(requestData.body),
      responseData ? JSON.stringify(responseData) : null
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
  if (url.includes('/api/clinical/consultas')) return 'MEDICAL_ACCESS';
  if (url.includes('/api/financial/reportes')) return 'REPORT_ACCESS';
  if (url.includes('/api/financial/cajas')) return 'CASH_MANAGEMENT';
  if (url.includes('/api/financial/facturas')) return 'BILLING';
  if (url.includes('/api/financial/productos')) return 'INVENTORY';
  if (url.includes('/api/clinical/clientes')) return 'CLIENT_MANAGEMENT';
  if (url.includes('/api/clinical/mascotas')) return 'PET_MANAGEMENT';
  
  // Tipos genéricos por método
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET') return 'READ';
  
  return 'OTHER';
}

/**
 * Generar descripción de actividad
 */
function generateActivityDescription(requestData, statusCode) {
  const { url, method } = requestData;
  const status = statusCode >= 400 ? 'FAILED' : 'SUCCESS';
  
  let action = 'Accessed';
  if (method === 'POST') action = 'Created';
  if (method === 'PUT' || method === 'PATCH') action = 'Updated';
  if (method === 'DELETE') action = 'Deleted';
  
  // Descripciones específicas por ruta
  if (url.includes('/auth/login')) return `${status}: User login attempt`;
  if (url.includes('/auth/logout')) return `${status}: User logout`;
  if (url.includes('/api/clinical/consultas')) return `${status}: ${action} medical consultation`;
  if (url.includes('/api/financial/reportes')) return `${status}: ${action} financial report`;
  if (url.includes('/api/financial/cajas')) return `${status}: ${action} cash register`;
  if (url.includes('/api/clinical/clientes')) return `${status}: ${action} client record`;
  if (url.includes('/api/clinical/mascotas')) return `${status}: ${action} pet record`;
  
  return `${status}: ${action} ${url}`;
}

/**
 * Middleware para auditar login/logout específicamente
 */
export const auditAuthActivity = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    originalSend.call(this, data);
    
    // Log específico de autenticación
    if (req.originalUrl.includes('/auth/login')) {
      logAuthActivity('LOGIN', req, res.statusCode, data);
    } else if (req.originalUrl.includes('/auth/logout')) {
      logAuthActivity('LOGOUT', req, res.statusCode, data);
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
    
    // Para login exitoso, extraer user ID de la respuesta
    if (type === 'LOGIN' && success && responseData) {
      try {
        const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        userId = parsed.user?.id || parsed.data?.id;
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    
    // Para logout, usar el usuario del request
    if (type === 'LOGOUT' && req.user) {
      userId = req.user.id;
    }
    
    await query(`
      INSERT INTO system.session_audit (
        id_session,
        id_usuario,
        tipo_evento,
        exito,
        ip_address,
        user_agent,
        detalles
      ) VALUES (
        uuid_generate_v4(),
        $1, $2, $3, $4, $5, $6
      )
    `, [
      userId,
      type,
      success,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent'),
      JSON.stringify({
        statusCode,
        timestamp: new Date(),
        url: req.originalUrl
      })
    ]);
    
  } catch (error) {
    console.error('Error logging auth activity:', error.message);
  }
}