import pkg from 'pg';
const { Pool } = pkg;
const LOG_DB_QUERIES = process.env.LOG_DB_QUERIES === 'true';
const LOG_DB_SLOW_MS = Number(process.env.LOG_DB_SLOW_MS || 800);
const LOG_DB_CONNECTIONS = process.env.LOG_DB_CONNECTIONS === 'true';
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 8);
const DB_POOL_MIN = Number(process.env.DB_POOL_MIN || 0);
const DB_SSL_ENABLED = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const shouldUseSsl = (host = '') => DB_SSL_ENABLED || String(host).includes('neon.tech');

// Configuración de PostgreSQL
const pool = new Pool({
  // Si existe DATABASE_URL (como en Neon), úsala directamente
  ...(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false
  } : {
    // Configuración tradicional
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'vetplus',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    ssl: shouldUseSsl(process.env.DB_HOST) ? { rejectUnauthorized: false } : false,
  }),
  max: DB_POOL_MAX, // máximo número de conexiones en el pool
  min: DB_POOL_MIN,
  idleTimeoutMillis: 60000, // tiempo de espera antes de cerrar conexiones inactivas (60s)
  connectionTimeoutMillis: 5000, // tiempo límite para obtener una conexión
});

// Evento de conexión exitosa
pool.on('connect', (client) => {
  // Fuerza la zona horaria de la sesión, independientemente de la config del
  // servidor de Postgres (ej. quedó en Europe/Berlin por defecto del hosting).
  // Sin esto, CURRENT_DATE/NOW() en cualquier query no coinciden con "hoy" en Bogotá.
  client.query("SET TIME ZONE 'America/Bogota'").catch((err) => {
    console.error('❌ No se pudo fijar timezone de sesión en Postgres:', err.message);
  });

  if (LOG_DB_CONNECTIONS) {
    console.log('✅ Conectado a PostgreSQL');
  }
});

// Evento de error
pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err.message);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    if (LOG_DB_CONNECTIONS) {
      console.log('🗄️  Base de datos conectada:', result.rows[0].now);
    }
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
};

// Función para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (LOG_DB_QUERIES || duration >= LOG_DB_SLOW_MS) {
      const level = duration >= LOG_DB_SLOW_MS ? '⚠️ Query lenta' : '📊 Query ejecutada';
      console.log(level, { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Error en query:', error.message);
    throw error;
  }
};

// Función para obtener un cliente del pool
const getClient = () => {
  return pool.connect();
};

/**
 * Ejecuta una query dentro de una transacción con contexto de tenant (MT3/RLS).
 * Setea `app.tenant_id` via SET LOCAL antes de la query, de forma que las
 * políticas RLS puedan leer el tenant activo con current_setting('app.tenant_id').
 *
 * Usar en todos los controllers autenticados en lugar de query() directa.
 *
 * @param {string} tenantId  - UUID del tenant (req.tenantId del middleware)
 * @param {string} text      - SQL a ejecutar
 * @param {Array}  params    - Parámetros de la query (opcional)
 */
const queryWithTenant = async (tenantId, text, params = []) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL aplica solo durante esta transacción — seguro con connection pooling
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error en queryWithTenant:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

export {
  pool,
  query,
  getClient,
  queryWithTenant,
  testConnection
};
