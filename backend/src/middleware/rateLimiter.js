import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate Limiting — activo en producción, deshabilitado en desarrollo/test.
 * Para deshabilitar en desarrollo local, asegúrate de que NODE_ENV=development en .env
 */
const isProd = process.env.NODE_ENV === 'production';

// Helper: crea el limiter real solo en producción
const createLimiter = (options) => isProd
  ? rateLimit({
      standardHeaders: true,
      legacyHeaders: false,
      ...options
    })
  : (req, res, next) => next();

// Helper: crea el slow-down real solo en producción
const createSlowDown = (options) => isProd
  ? slowDown(options)
  : (req, res, next) => next();

// ─── Límites ─────────────────────────────────────────────────────────────────

/** Login, refresh, registro — 10 intentos / 15 min por IP */
export const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de autenticación. Intente en 15 minutos.' }
});

/** Admin y reportes — 60 req / min */
export const adminRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: 'Límite de solicitudes de administración alcanzado.' }
});

/** Reportes pesados — 30 req / min */
export const reportsRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: 'Límite de solicitudes de reportes alcanzado.' }
});

/** Rutas públicas (firma de consentimiento) — 20 req / min por IP */
export const publicRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'Demasiadas solicitudes. Intente en un momento.' }
});

/** General API — 200 req / min por IP */
export const generalRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: { message: 'Límite de solicitudes alcanzado.' }
});

/** Búsquedas — 60 req / min */
export const searchRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: 'Demasiadas búsquedas. Intente en un momento.' }
});

/** Writes (POST/PUT/PATCH/DELETE) — slow down progresivo en prod */
export const writeSlowDown = createSlowDown({
  windowMs: 60 * 1000,
  delayAfter: 30,
  // Forma explícita requerida desde express-slow-down v2 para conservar el
  // comportamiento anterior (delay creciente: 500ms por cada request sobre el límite).
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }
});

/** Rate limit por rol configurable */
export const roleBasedRateLimit = (limits = {}) => {
  const defaultMax = limits.default || 100;
  const limiter = createLimiter({
    windowMs: 60 * 1000,
    max: (req) => {
      const rol = req.user?.rol;
      return limits[rol] || defaultMax;
    },
    message: { message: 'Límite de solicitudes por rol alcanzado.' }
  });
  return limiter;
};

/** Headers informativos de rate limit (no bloquea) */
export const rateLimitStats = (req, res, next) => {
  res.set({
    'X-RateLimit-Policy': isProd ? 'active' : 'disabled-development',
    'X-RateLimit-Contact': 'admin@vetplus.com'
  });
  next();
};
