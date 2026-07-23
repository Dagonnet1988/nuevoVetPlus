import express from 'express';
import { publicRateLimit } from '../middleware/rateLimiter.js';
import {
  obtenerFormularioPublico,
  firmarConsentimiento
} from '../controllers/consentimientoController.js';
import { listPublicTenants } from '../controllers/publicController.js';

const router = express.Router();

/**
 * GET /api/public/tenants
 * Directorio público de clínicas activas para acceso por subdominio.
 */
router.get('/tenants', publicRateLimit, listPublicTenants);

/**
 * GET /api/public/consentimiento/:token
 * Página pública: valida el token y devuelve datos para renderizar el formulario de firma.
 * Sin autenticación requerida.
 */
router.get('/consentimiento/:token', publicRateLimit, obtenerFormularioPublico);

/**
 * POST /api/public/consentimiento/:token/firmar
 * Recibe la firma canvas en base64 y procesa la firma del consentimiento.
 * Sin autenticación requerida.
 */
router.post('/consentimiento/:token/firmar', publicRateLimit, firmarConsentimiento);

export default router;
