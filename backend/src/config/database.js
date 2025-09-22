import pkg from 'pg';
const { Pool } = pkg;

// Configuración de PostgreSQL
const pool = new Pool({
  // Si existe DATABASE_URL (como en Neon), úsala directamente
  ...(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  } : {
    // Configuración tradicional
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'vetplus',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    ssl: (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
  }),
  max: 20, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo de espera antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // tiempo límite para obtener una conexión
});

// Evento de conexión exitosa
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
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
    console.log('🗄️  Base de datos conectada:', result.rows[0].now);
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
    console.log('📊 Query ejecutada:', { text: text.substring(0, 50), duration, rows: res.rowCount });
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

export {
  pool,
  query,
  getClient,
  testConnection
};
