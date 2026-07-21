import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateSuperadmin } from '../middleware/superadminAuth.js';
import {
  superadminLogin,
  listTenants,
  createTenant,
  getTenant,
  updateTenant,
  provisionSuperadminAsTenantAdmin,
  getSuperadminProfile,
  changePassword
} from '../controllers/superadminController.js';

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// ── Auth ───────────────────────────────────────────────────────────────────────
router.post('/auth/login',
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  validate,
  superadminLogin
);

// ── Perfil propio ──────────────────────────────────────────────────────────────
router.get('/me', authenticateSuperadmin, getSuperadminProfile);
router.put('/me/password',
  authenticateSuperadmin,
  body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
  body('password_nuevo').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
  validate,
  changePassword
);

// ── Tenants / Clínicas ─────────────────────────────────────────────────────────
router.get('/tenants',       authenticateSuperadmin, listTenants);
router.post('/tenants',      authenticateSuperadmin, createTenant);
router.get('/tenants/:id',   authenticateSuperadmin, getTenant);
router.patch('/tenants/:id', authenticateSuperadmin, updateTenant);
router.post('/tenants/:id/provision-superadmin-admin', authenticateSuperadmin, provisionSuperadminAsTenantAdmin);

export default router;

