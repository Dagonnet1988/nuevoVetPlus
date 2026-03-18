Soluciones Detalladas para VetPlus
1. Implementar Rate Limiting en Login
Archivo: backend/src/routes/auth.js

Cambio propuesto:


import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 intentos por IP
  message: 'Demasiados intentos de login desde esta IP',
  skipSuccessfulRequests: true
});

// Aplicar al endpoint de login
router.post('/login', loginLimiter, validateLogin, authController.login);
2. Unificar Formato de Fecha
Archivos afectados:

Backend: backend/src/controllers/pacientesController.js
Frontend: frontend/src/app/services/pacientes.service.ts
Solución: Usar ISO 8601 (YYYY-MM-DD) en toda la aplicación

3. Corrección de Endpoints Frontend
Archivo: frontend/src/app/services/citas.service.ts

Endpoints a corregir:

Cambiar /api/cita → /api/citas
Cambiar /api/paciente → /api/pacientes
4. Optimización Queries N+1
Archivo: backend/src/services/appointmentService.js

Solución propuesta:


// En lugar de:
const citas = await getCitas();
for (const cita of citas) {
  cita.paciente = await getPaciente(cita.pacienteId);
}

// Usar:
const citas = await getCitasWithPatients(); // JOIN en SQL
5. Implementar Paginación
Archivo: backend/src/controllers/pacientesController.js

Implementación propuesta:


router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  const pacientes = await db.query(
    `SELECT * FROM pacientes LIMIT $1 OFFSET $2`, 
    [limit, offset]
  );
  
  res.json(pacientes);
});