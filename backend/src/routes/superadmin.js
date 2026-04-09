import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateSuperadmin } from '../middleware/superadminAuth.js';
import {
  superadminLogin,
  listTenants,
  createTenant,
  getTenant,
  updateTenant,
  getSuperadminProfile
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

// ── Tenants / Clínicas ─────────────────────────────────────────────────────────
router.get('/tenants',       authenticateSuperadmin, listTenants);
router.post('/tenants',      authenticateSuperadmin, createTenant);
router.get('/tenants/:id',   authenticateSuperadmin, getTenant);
router.patch('/tenants/:id', authenticateSuperadmin, updateTenant);

export default router;

