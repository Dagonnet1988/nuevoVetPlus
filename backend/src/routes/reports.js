import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getDashboardStats,
    getSalesReports,
    getPurchaseReports,
    getInventoryReports,
    getPatientStats,
    getProfitabilityAnalysis,
    getAlertsAndKPIs
} from '../controllers/reportsController.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/reports/dashboard
 * @desc Obtener estadísticas del dashboard gerencial
 * @access Admin, Vet
 * @query { fecha_inicio?, fecha_fin? }
 */
router.get('/dashboard', getDashboardStats);

/**
 * @route GET /api/reports/sales
 * @desc Obtener reportes de ventas por período
 * @access Admin, Vet
 * @query { fecha_inicio?, fecha_fin?, grupo_por?, id_veterinario?, tipo_servicio? }
 */
router.get('/sales', getSalesReports);

/**
 * @route GET /api/reports/purchases
 * @desc Obtener análisis de compras y proveedores
 * @access Admin
 * @query { fecha_inicio?, fecha_fin?, id_proveedor? }
 */
router.get('/purchases', getPurchaseReports);

/**
 * @route GET /api/reports/inventory
 * @desc Obtener reportes de inventario y stock
 * @access Admin
 * @query { categoria?, critico_only? }
 */
router.get('/inventory', getInventoryReports);

/**
 * @route GET /api/reports/patients
 * @desc Obtener estadísticas de pacientes y citas
 * @access Admin, Vet
 * @query { fecha_inicio?, fecha_fin?, id_veterinario? }
 */
router.get('/patients', getPatientStats);

/**
 * @route GET /api/reports/profitability
 * @desc Obtener análisis de rentabilidad
 * @access Admin
 * @query { fecha_inicio?, fecha_fin? }
 */
router.get('/profitability', getProfitabilityAnalysis);

/**
 * @route GET /api/reports/alerts-kpis
 * @desc Obtener sistema de alertas y KPIs
 * @access Admin, Vet
 */
router.get('/alerts-kpis', getAlertsAndKPIs);

export default router;