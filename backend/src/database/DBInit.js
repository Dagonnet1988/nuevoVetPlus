import pkg from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const { Client } = pkg;
const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DBInit {
  constructor() {
    // Detectar usuario por defecto según el sistema
    const defaultUser = process.platform === 'win32' ? 'postgres' : (process.env.USER || 'postgres');
    
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || defaultUser,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vetplus'
    };
    
    // Configuración para conexión inicial (sin especificar BD)
    this.adminConfig = {
      ...this.config,
      database: 'postgres' // BD por defecto para operaciones administrativas
    };

    this.schemasPath = path.join(__dirname, 'schemas');
    this.seedsPath = path.join(__dirname, 'seeds');
  }

  /**
   * Verifica si PostgreSQL está disponible
   */
  async checkPostgreSQL() {
    try {
      console.log('🔍 Verificando conexión a PostgreSQL...');
      const client = new Client(this.adminConfig);
      await client.connect();
      
      const result = await client.query('SELECT version()');
      console.log(`✅ PostgreSQL conectado: ${result.rows[0].version.split(' ')[1]}`);
      
      await client.end();
      return true;
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error.message);
      console.log('💡 Verifica que PostgreSQL esté ejecutándose');
      return false;
    }
  }

  /**
   * Verifica si existe la base de datos
   */
  async checkDatabase() {
    try {
      console.log(`🔍 Verificando base de datos '${this.config.database}'...`);
      const client = new Client(this.adminConfig);
      await client.connect();
      
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.database]
      );
      
      await client.end();
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error verificando base de datos:', error.message);
      return false;
    }
  }

  /**
   * Crea la base de datos si no existe
   */
  async createDatabase() {
    try {
      console.log(`🏗️  Creando base de datos '${this.config.database}'...`);
      const client = new Client(this.adminConfig);
      await client.connect();
      
      await client.query(`CREATE DATABASE "${this.config.database}"`);
      console.log(`✅ Base de datos '${this.config.database}' creada`);
      
      await client.end();
      return true;
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`⚠️  Base de datos '${this.config.database}' ya existe`);
        return true;
      }
      console.error('❌ Error creando base de datos:', error.message);
      return false;
    }
  }

  /**
   * Verifica si una tabla existe
   */
  async tableExists(tableName, schema = 'public') {
    try {
      const client = new Client(this.config);
      await client.connect();
      
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )
      `, [schema, tableName]);
      
      await client.end();
      return result.rows[0].exists;
    } catch (error) {
      console.error(`❌ Error verificando tabla ${tableName}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica si un esquema existe
   */
  async schemaExists(schemaName) {
    try {
      const client = new Client(this.config);
      await client.connect();
      
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.schemata 
          WHERE schema_name = $1
        )
      `, [schemaName]);
      
      await client.end();
      return result.rows[0].exists;
    } catch (error) {
      console.error(`❌ Error verificando esquema ${schemaName}:`, error.message);
      return false;
    }
  }

  /**
   * Ejecuta un archivo SQL usando psql (más robusto para funciones complejas)
   */
  async executeSQL(filePath, description = '') {
    try {
      console.log(`📄 Ejecutando: ${description || path.basename(filePath)}`);
      
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      // Construir comando psql
      const { host, port, user, password, database } = this.config;
      const env = { ...process.env };
      
      if (password) {
        env.PGPASSWORD = password;
      }
      
      const psqlCommand = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${filePath}" -q`;
      
      // Ejecutar comando
      const { stdout, stderr } = await execPromise(psqlCommand, { env });
      
      if (stderr && !stderr.includes('NOTICE:') && !stderr.includes('already exists')) {
        console.warn(`⚠️  Warnings: ${stderr}`);
      }
      
      console.log(`✅ ${description || path.basename(filePath)} ejecutado`);
      return true;
    } catch (error) {
      // Si psql no está disponible, intentar con cliente Node.js
      if (error.message.includes('psql') || error.code === 'ENOENT') {
        console.log(`⚠️  psql no disponible, usando cliente Node.js...`);
        return await this.executeSQLWithNodeClient(filePath, description);
      }
      
      console.error(`❌ Error ejecutando ${path.basename(filePath)}:`, error.message);
      return false;
    }
  }

  /**
   * Fallback: ejecutar SQL con cliente Node.js
   */
  async executeSQLWithNodeClient(filePath, description = '') {
    try {
      const sqlContent = await fs.readFile(filePath, 'utf8');
      const client = new Client(this.config);
      await client.connect();
      
      // Ejecutar todo el contenido como un bloque
      await client.query(sqlContent);
      await client.end();
      
      console.log(`✅ ${description || path.basename(filePath)} ejecutado (Node.js)`);
      return true;
    } catch (error) {
      console.error(`❌ Error con Node.js ${path.basename(filePath)}:`, error.message);
      return false;
    }
  }

  /**
   * Obtiene todas las tablas del sistema
   */
  async getAllTables() {
    try {
      const client = new Client(this.config);
      await client.connect();
      
      const result = await client.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname IN ('public', 'auth', 'clinical', 'financial', 'system')
        ORDER BY schemaname, tablename
      `);
      
      await client.end();
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo tablas:', error.message);
      return [];
    }
  }

  /**
   * Verifica el estado completo del sistema
   */
  async checkSystemStatus() {
    console.log('\n📊 ESTADO DEL SISTEMA VETPLUS');
    console.log('='.repeat(50));
    
    // Verificar esquemas
    const schemas = ['auth', 'clinical', 'financial', 'system'];
    for (const schema of schemas) {
      const exists = await this.schemaExists(schema);
      console.log(`${exists ? '✅' : '❌'} Esquema ${schema}`);
    }
    
    // Verificar tablas principales
    const tables = [
      { name: 'usuarios', schema: 'auth' },
      { name: 'clientes', schema: 'clinical' },
      { name: 'mascotas', schema: 'clinical' },
      { name: 'cajas', schema: 'financial' },
      { name: 'productos', schema: 'financial' },
      { name: 'migrations', schema: 'system' }
    ];
    
    for (const table of tables) {
      const exists = await this.tableExists(table.name, table.schema);
      console.log(`${exists ? '✅' : '❌'} Tabla ${table.schema}.${table.name}`);
    }
    
    console.log('='.repeat(50));
  }

  /**
   * Inicialización completa del sistema
   */
  async initialize() {
    try {
      console.log('🚀 INICIALIZANDO SISTEMA VETPLUS');
      console.log('='.repeat(50));
      
      // 1. Verificar PostgreSQL
      const pgOk = await this.checkPostgreSQL();
      if (!pgOk) {
        throw new Error('PostgreSQL no está disponible');
      }
      
      // 2. Verificar/Crear base de datos
      const dbExists = await this.checkDatabase();
      if (!dbExists) {
        const created = await this.createDatabase();
        if (!created) {
          throw new Error('No se pudo crear la base de datos');
        }
      } else {
        console.log(`✅ Base de datos '${this.config.database}' existe`);
      }
      
      // 3. Ejecutar esquemas si no existen
      const schemaFiles = [
        { file: '01_create_database.sql', desc: 'Extensiones y funciones base' },
        { file: '02_auth_tables.sql', desc: 'Módulo de autenticación' },
        { file: '03_clinical_tables.sql', desc: 'Módulo clínico' },
        { file: '04_financial_tables.sql', desc: 'Módulo financiero' },
        { file: '05_constraints_triggers.sql', desc: 'Constraints y triggers' },
        { file: '06_audit_expansion.sql', desc: 'Expansión sistema auditoría' },
        { file: '07_audit_tables.sql', desc: 'Tablas adicionales auditoría' },
        { file: '08_empresa_config.sql', desc: 'Configuración de empresa' }
      ];
      
      for (const { file, desc } of schemaFiles) {
        const filePath = path.join(this.schemasPath, file);
        try {
          await fs.access(filePath);
          await this.executeSQL(filePath, desc);
        } catch (error) {
          console.log(`⚠️  Archivo ${file} no encontrado, saltando...`);
        }
      }
      
      // 4. Verificar si necesita datos iniciales
      const hasUsers = await this.tableExists('usuarios', 'auth');
      if (hasUsers) {
        const client = new Client(this.config);
        await client.connect();
        const result = await client.query('SELECT COUNT(*) FROM auth.usuarios');
        await client.end();
        
        if (result.rows[0].count === '0') {
          console.log('📦 Insertando datos iniciales...');
          const seedFile = path.join(this.seedsPath, '01_initial_data.sql');
          try {
            await fs.access(seedFile);
            await this.executeSQL(seedFile, 'Datos iniciales');
          } catch (error) {
            console.log('⚠️  Archivo de seeds no encontrado');
          }
        } else {
          console.log('✅ Datos iniciales ya existen');
        }
      }
      
      // 5. Mostrar estado final
      await this.checkSystemStatus();
      
      console.log('\n🎉 SISTEMA VETPLUS INICIALIZADO CORRECTAMENTE');
      console.log('✅ Base de datos lista para usar');
      console.log(`🌐 Servidor: ${this.config.host}:${this.config.port}`);
      console.log(`🗄️  Base de datos: ${this.config.database}`);
      
      return true;
    } catch (error) {
      console.error('\n❌ ERROR EN INICIALIZACIÓN:', error.message);
      return false;
    }
  }

  /**
   * Comando de verificación rápida
   */
  async quickCheck() {
    console.log('🔍 VERIFICACIÓN RÁPIDA VETPLUS');
    console.log('='.repeat(30));
    
    const pgOk = await this.checkPostgreSQL();
    const dbExists = await this.checkDatabase();
    const authSchema = await this.schemaExists('auth');
    const usersTable = await this.tableExists('usuarios', 'auth');
    
    console.log(`PostgreSQL: ${pgOk ? '✅' : '❌'}`);
    console.log(`Base de datos: ${dbExists ? '✅' : '❌'}`);
    console.log(`Esquema auth: ${authSchema ? '✅' : '❌'}`);
    console.log(`Tabla usuarios: ${usersTable ? '✅' : '❌'}`);
    
    if (pgOk && dbExists && authSchema && usersTable) {
      console.log('\n🎯 Sistema listo para usar');
      return true;
    } else {
      console.log('\n⚠️  Sistema necesita inicialización');
      console.log('💡 Ejecuta: npm run db:init');
      return false;
    }
  }
}

export default DBInit;
