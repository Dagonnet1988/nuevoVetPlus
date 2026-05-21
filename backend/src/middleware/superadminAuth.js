import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const _jwtSecret = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] JWT_SECRET no configurada.');
  }
  return 'vetplus_dev_only_secret_do_not_use_in_prod';
})();

const SA_JWT_CONFIG = {
  secret: _jwtSecret,
  expiresIn: '8h',
  issuer: 'VetPlus-Platform',
  audience: 'vetplus-superadmin'
};

/**
 * Genera un JWT exclusivo para superadmins.
 * El claim `rol: 'superadmin'` NO existe en los JWTs clínicos.
 */
export function generateSuperadminToken(sa) {
  return jwt.sign(
    { id: sa.id_superadmin, email: sa.email, documento: sa.documento, nombre: sa.nombre, rol: 'superadmin' },
    SA_JWT_CONFIG.secret,
    { expiresIn: SA_JWT_CONFIG.expiresIn, issuer: SA_JWT_CONFIG.issuer, audience: SA_JWT_CONFIG.audience }
  );
}

/**
 * Middleware: verifica que la petición viene con un JWT de superadmin válido.
 * Se usa en todas las rutas /api/superadmin/*.
 */
export async function authenticateSuperadmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de superadmin requerido.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SA_JWT_CONFIG.secret, {
      issuer: SA_JWT_CONFIG.issuer,
      audience: SA_JWT_CONFIG.audience
    });

    if (payload.rol !== 'superadmin') {
      return res.status(403).json({ message: 'Acceso exclusivo para superadmins.' });
    }

    // Verificar que el superadmin sigue activo en BD
    const result = await query(
      'SELECT id_superadmin, email, documento, nombre, activo FROM system.superadmins WHERE id_superadmin = $1',
      [payload.id]
    );

    if (!result.rows.length || !result.rows[0].activo) {
      return res.status(403).json({ message: 'Superadmin inactivo o no encontrado.' });
    }

    req.superadmin = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Token de superadmin inválido o expirado.' });
  }
}
