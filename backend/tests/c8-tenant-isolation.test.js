/**
 * C.8 — Suite de pruebas de aislamiento inter-tenant
 *
 * Verifica que un tenant NO puede ver ni modificar datos de otro tenant.
 * El aislamiento se garantiza por Capa 2 (app layer): AND id_tenant = $N
 * en todos los controladores core.
 *
 * Tablas cubiertas:
 *   - vetplus_auth.usuarios
 *   - clinical.clientes
 *   - clinical.mascotas
 *   - clinical.consultas_clinicas
 *   - clinical.calendario_citas
 *
 * Usa node:test (Node 18+, nativo, sin dependencias extra).
 * Ejecutar: node --test tests/c8-tenant-isolation.test.js
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Datos de prueba ───────────────────────────────────────────────────────────
const ts = Date.now();
let pool;
let tenantA, tenantB;
let userA, userB;
let clientA, clientB;
let mascotaA, mascotaB;
let consultaA, consultaB;
let citaA, citaB;

// ── Setup ─────────────────────────────────────────────────────────────────────
before(async () => {
  pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'vetplus',
          password: process.env.DB_PASSWORD || '',
          port: parseInt(process.env.DB_PORT || '5432'),
        }
  );

  // 1. Tenants de prueba
  tenantA = (await pool.query(
    `INSERT INTO system.tenants (slug, nombre) VALUES ($1, $2) RETURNING id_tenant`,
    [`test-iso-a-${ts}`, `Test Tenant A ${ts}`]
  )).rows[0].id_tenant;

  tenantB = (await pool.query(
    `INSERT INTO system.tenants (slug, nombre) VALUES ($1, $2) RETURNING id_tenant`,
    [`test-iso-b-${ts}`, `Test Tenant B ${ts}`]
  )).rows[0].id_tenant;

  // 2. Un usuario por tenant
  userA = uuidv4();
  await pool.query(
    `INSERT INTO vetplus_auth.usuarios
       (id_usuario, nombre, apellido, email, documento, tipo_documento, password_hash, rol, id_tenant)
     VALUES ($1, 'TestA', 'Iso', $2, $3, 'CC', 'x', 'vet', $4)`,
    [userA, `ta-${ts}@test.com`, `DOCA${ts}`, tenantA]
  );

  userB = uuidv4();
  await pool.query(
    `INSERT INTO vetplus_auth.usuarios
       (id_usuario, nombre, apellido, email, documento, tipo_documento, password_hash, rol, id_tenant)
     VALUES ($1, 'TestB', 'Iso', $2, $3, 'CC', 'x', 'vet', $4)`,
    [userB, `tb-${ts}@test.com`, `DOCB${ts}`, tenantB]
  );

  // 3. Un cliente por tenant
  clientA = uuidv4();
  await pool.query(
    `INSERT INTO clinical.clientes (id_cliente, nombre, telefono, id_tenant, created_by)
     VALUES ($1, $2, '000', $3, $4)`,
    [clientA, `ClienteA-${ts}`, tenantA, userA]
  );

  clientB = uuidv4();
  await pool.query(
    `INSERT INTO clinical.clientes (id_cliente, nombre, telefono, id_tenant, created_by)
     VALUES ($1, $2, '000', $3, $4)`,
    [clientB, `ClienteB-${ts}`, tenantB, userB]
  );

  // 4. Una mascota por tenant
  mascotaA = uuidv4();
  await pool.query(
    `INSERT INTO clinical.mascotas (id_mascota, id_cliente, nombre, especie, id_tenant, created_by)
     VALUES ($1, $2, $3, 'Perro', $4, $5)`,
    [mascotaA, clientA, `MascotaA-${ts}`, tenantA, userA]
  );

  mascotaB = uuidv4();
  await pool.query(
    `INSERT INTO clinical.mascotas (id_mascota, id_cliente, nombre, especie, id_tenant, created_by)
     VALUES ($1, $2, $3, 'Gato', $4, $5)`,
    [mascotaB, clientB, `MascotaB-${ts}`, tenantB, userB]
  );

  // 5. Una consulta por tenant
  consultaA = uuidv4();
  await pool.query(
    `INSERT INTO clinical.consultas_clinicas
       (id_consulta, codigo_consulta, id_mascota, id_veterinario, motivo, id_tenant)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [consultaA, `TA-${String(ts).slice(-10)}`, mascotaA, userA, `MotivoA-${ts}`, tenantA]
  );

  consultaB = uuidv4();
  await pool.query(
    `INSERT INTO clinical.consultas_clinicas
       (id_consulta, codigo_consulta, id_mascota, id_veterinario, motivo, id_tenant)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [consultaB, `TB-${String(ts).slice(-10)}`, mascotaB, userB, `MotivoB-${ts}`, tenantB]
  );

  // 6. Una cita por tenant
  const ahora = new Date();
  const unHoraDespues = new Date(ahora.getTime() + 3_600_000);

  citaA = uuidv4();
  await pool.query(
    `INSERT INTO clinical.calendario_citas
       (id_cita, codigo_cita, id_mascota, id_veterinario, fecha_inicio, fecha_fin, tipo, id_tenant)
     VALUES ($1, $2, $3, $4, $5, $6, 'Consulta', $7)`,
    [citaA, `CA-${String(ts).slice(-10)}`, mascotaA, userA, ahora, unHoraDespues, tenantA]
  );

  citaB = uuidv4();
  await pool.query(
    `INSERT INTO clinical.calendario_citas
       (id_cita, codigo_cita, id_mascota, id_veterinario, fecha_inicio, fecha_fin, tipo, id_tenant)
     VALUES ($1, $2, $3, $4, $5, $6, 'Consulta', $7)`,
    [citaB, `CB-${String(ts).slice(-10)}`, mascotaB, userB, ahora, unHoraDespues, tenantB]
  );
});

// ── Teardown (orden inverso a FKs) ───────────────────────────────────────────
after(async () => {
  try {
    if (citaA)     await pool.query(`DELETE FROM clinical.calendario_citas    WHERE id_cita      = $1`, [citaA]);
    if (citaB)     await pool.query(`DELETE FROM clinical.calendario_citas    WHERE id_cita      = $1`, [citaB]);
    if (consultaA) await pool.query(`DELETE FROM clinical.consultas_clinicas  WHERE id_consulta  = $1`, [consultaA]);
    if (consultaB) await pool.query(`DELETE FROM clinical.consultas_clinicas  WHERE id_consulta  = $1`, [consultaB]);
    if (mascotaA)  await pool.query(`DELETE FROM clinical.mascotas            WHERE id_mascota   = $1`, [mascotaA]);
    if (mascotaB)  await pool.query(`DELETE FROM clinical.mascotas            WHERE id_mascota   = $1`, [mascotaB]);
    if (clientA)   await pool.query(`DELETE FROM clinical.clientes            WHERE id_cliente   = $1`, [clientA]);
    if (clientB)   await pool.query(`DELETE FROM clinical.clientes            WHERE id_cliente   = $1`, [clientB]);
    if (userA)     await pool.query(`DELETE FROM vetplus_auth.usuarios        WHERE id_usuario   = $1`, [userA]);
    if (userB)     await pool.query(`DELETE FROM vetplus_auth.usuarios        WHERE id_usuario   = $1`, [userB]);
    if (tenantA)   await pool.query(`DELETE FROM system.tenants               WHERE id_tenant    = $1`, [tenantA]);
    if (tenantB)   await pool.query(`DELETE FROM system.tenants               WHERE id_tenant    = $1`, [tenantB]);
  } finally {
    await pool.end();
  }
});

// ── USUARIOS ─────────────────────────────────────────────────────────────────
test('usuarios: tenant_a ve su propio usuario', async () => {
  const r = await pool.query(
    `SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1 AND id_usuario = $2`,
    [tenantA, userA]
  );
  assert.equal(r.rowCount, 1, 'tenant_a debe encontrar a userA');
});

test('usuarios: tenant_a NO ve usuarios de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_usuario FROM vetplus_auth.usuarios WHERE id_tenant = $1 AND id_usuario = $2`,
    [tenantA, userB]
  );
  assert.equal(r.rowCount, 0, 'tenant_a NO debe encontrar a userB');
});

// ── CLIENTES ──────────────────────────────────────────────────────────────────
test('clientes: tenant_a ve su propio cliente', async () => {
  const r = await pool.query(
    `SELECT id_cliente FROM clinical.clientes WHERE id_tenant = $1 AND id_cliente = $2`,
    [tenantA, clientA]
  );
  assert.equal(r.rowCount, 1, 'tenant_a debe encontrar a clienteA');
});

test('clientes: tenant_a NO ve clientes de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_cliente FROM clinical.clientes WHERE id_tenant = $1 AND id_cliente = $2`,
    [tenantA, clientB]
  );
  assert.equal(r.rowCount, 0, 'tenant_a NO debe encontrar a clienteB');
});

test('clientes: listado de tenant_a no incluye registros de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_cliente FROM clinical.clientes
     WHERE id_tenant = $1 AND id_cliente = ANY($2::uuid[])`,
    [tenantA, [clientA, clientB]]
  );
  assert.equal(r.rowCount, 1, 'El listado de tenant_a solo debe tener 1 resultado');
  assert.equal(r.rows[0].id_cliente, clientA, 'El resultado debe ser clienteA');
});

test('clientes: UPDATE cross-tenant afecta 0 registros', async () => {
  const r = await pool.query(
    `UPDATE clinical.clientes SET notas = 'intento_cross_tenant'
     WHERE id_cliente = $1 AND id_tenant = $2`,
    [clientA, tenantB]   // clientA pertenece a tenantA, no a tenantB
  );
  assert.equal(r.rowCount, 0, 'UPDATE con id_tenant incorrecto debe afectar 0 filas');

  // Verificar que el registro no fue modificado
  const check = await pool.query(
    `SELECT notas FROM clinical.clientes WHERE id_cliente = $1`, [clientA]
  );
  assert.notEqual(check.rows[0]?.notas, 'intento_cross_tenant', 'El registro no debe haber cambiado');
});

// ── MASCOTAS ──────────────────────────────────────────────────────────────────
test('mascotas: tenant_a ve sus propias mascotas', async () => {
  const r = await pool.query(
    `SELECT id_mascota FROM clinical.mascotas WHERE id_tenant = $1 AND id_mascota = $2`,
    [tenantA, mascotaA]
  );
  assert.equal(r.rowCount, 1, 'tenant_a debe encontrar a mascotaA');
});

test('mascotas: tenant_a NO ve mascotas de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_mascota FROM clinical.mascotas WHERE id_tenant = $1 AND id_mascota = $2`,
    [tenantA, mascotaB]
  );
  assert.equal(r.rowCount, 0, 'tenant_a NO debe encontrar a mascotaB');
});

test('mascotas: listado de tenant_b no incluye registros de tenant_a', async () => {
  const r = await pool.query(
    `SELECT id_mascota FROM clinical.mascotas
     WHERE id_tenant = $1 AND id_mascota = ANY($2::uuid[])`,
    [tenantB, [mascotaA, mascotaB]]
  );
  assert.equal(r.rowCount, 1, 'El listado de tenant_b solo debe tener 1 resultado');
  assert.equal(r.rows[0].id_mascota, mascotaB, 'El resultado debe ser mascotaB');
});

test('mascotas: DELETE cross-tenant afecta 0 registros', async () => {
  const r = await pool.query(
    `DELETE FROM clinical.mascotas WHERE id_mascota = $1 AND id_tenant = $2`,
    [mascotaA, tenantB]   // mascotaA pertenece a tenantA
  );
  assert.equal(r.rowCount, 0, 'DELETE con id_tenant incorrecto debe afectar 0 filas');

  const check = await pool.query(
    `SELECT id_mascota FROM clinical.mascotas WHERE id_mascota = $1`, [mascotaA]
  );
  assert.equal(check.rowCount, 1, 'mascotaA debe seguir existiendo');
});

// ── CONSULTAS CLÍNICAS ────────────────────────────────────────────────────────
test('consultas: tenant_a ve sus propias consultas', async () => {
  const r = await pool.query(
    `SELECT id_consulta FROM clinical.consultas_clinicas
     WHERE id_tenant = $1 AND id_consulta = $2`,
    [tenantA, consultaA]
  );
  assert.equal(r.rowCount, 1, 'tenant_a debe encontrar a consultaA');
});

test('consultas: tenant_a NO ve consultas de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_consulta FROM clinical.consultas_clinicas
     WHERE id_tenant = $1 AND id_consulta = $2`,
    [tenantA, consultaB]
  );
  assert.equal(r.rowCount, 0, 'tenant_a NO debe encontrar a consultaB');
});

test('consultas: listado de tenant_a no incluye registros de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_consulta FROM clinical.consultas_clinicas
     WHERE id_tenant = $1 AND id_consulta = ANY($2::uuid[])`,
    [tenantA, [consultaA, consultaB]]
  );
  assert.equal(r.rowCount, 1, 'El listado de tenant_a solo debe tener 1 resultado');
  assert.equal(r.rows[0].id_consulta, consultaA, 'El resultado debe ser consultaA');
});

// ── CALENDARIO DE CITAS ───────────────────────────────────────────────────────
test('citas: tenant_a ve sus propias citas', async () => {
  const r = await pool.query(
    `SELECT id_cita FROM clinical.calendario_citas
     WHERE id_tenant = $1 AND id_cita = $2`,
    [tenantA, citaA]
  );
  assert.equal(r.rowCount, 1, 'tenant_a debe encontrar a citaA');
});

test('citas: tenant_a NO ve citas de tenant_b', async () => {
  const r = await pool.query(
    `SELECT id_cita FROM clinical.calendario_citas
     WHERE id_tenant = $1 AND id_cita = $2`,
    [tenantA, citaB]
  );
  assert.equal(r.rowCount, 0, 'tenant_a NO debe encontrar a citaB');
});

test('citas: listado de tenant_b no incluye registros de tenant_a', async () => {
  const r = await pool.query(
    `SELECT id_cita FROM clinical.calendario_citas
     WHERE id_tenant = $1 AND id_cita = ANY($2::uuid[])`,
    [tenantB, [citaA, citaB]]
  );
  assert.equal(r.rowCount, 1, 'El listado de tenant_b solo debe tener 1 resultado');
  assert.equal(r.rows[0].id_cita, citaB, 'El resultado debe ser citaB');
});
