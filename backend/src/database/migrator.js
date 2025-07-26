import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, getClient } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'schemas');
    this.migrationFiles = [
      '01_create_database.sql',
      '02_auth_tables.sql', 
      '03_clinical_tables.sql',
      '04_financial_tables.sql',
      '05_constraints_triggers.sql'
    ];
  }

  /**
   * Verifica si la tabla de migraciones existe y la crea si no
   */
  async ensureMigrationTable() {
    try {
      await query(`
        CREATE SCHEMA IF NOT EXISTS system;
        CREATE TABLE IF NOT EXISTS system.migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT true,
          error_message TEXT
        );
      `);
      console.log('✅ Tabla de migraciones verificada');
    } catch (error) {
      console.error('❌ Error creando tabla de migraciones:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene las migraciones ya ejecutadas
   */
  async getExecutedMigrations() {
    try {
      const result = await query(
        'SELECT migration_name FROM system.migrations WHERE success = true ORDER BY executed_at'
      );
      return result.rows.map(row => row.migration_name);
    } catch (error) {
      console.error('❌ Error obteniendo migraciones ejecutadas:', error.message);
      return [];
    }
  }

  /**
   * Ejecuta una migración específica usando transacciones
   */
  async executeMigration(migrationFile) {
    const startTime = Date.now();
    const client = await getClient();
    
    try {
      console.log(`🔄 Ejecutando migración: ${migrationFile}`);
      
      const filePath = path.join(this.migrationsPath, migrationFile);
      const sqlContent = await fs.readFile(filePath, 'utf8');
      
      // Iniciar transacción
      await client.query('BEGIN');
      
      // Dividir en statements y ejecutar cada uno
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }

      const executionTime = Date.now() - startTime;

      // Registrar la migración como exitosa
      await client.query(
        `INSERT INTO system.migrations (migration_name, execution_time_ms, success) 
         VALUES ($1, $2, true)`,
        [migrationFile, executionTime]
      );

      // Confirmar transacción
      await client.query('COMMIT');

      console.log(`✅ Migración ${migrationFile} ejecutada exitosamente (${executionTime}ms)`);
      return true;
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      
      const executionTime = Date.now() - startTime;
      
      // Registrar el error (en transacción separada)
      try {
        await query(
          `INSERT INTO system.migrations (migration_name, execution_time_ms, success, error_message) 
           VALUES ($1, $2, false, $3)`,
          [migrationFile, executionTime, error.message]
        );
      } catch (logError) {
        console.error('❌ Error registrando fallo de migración:', logError.message);
      }

      console.error(`❌ Error en migración ${migrationFile}:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ejecuta todas las migraciones pendientes
   */
  async runMigrations() {
    try {
      console.log('🚀 Iniciando sistema de migraciones VetPlus...');
      
      // Verificar conexión
      const connected = await testConnection();
      if (!connected) {
        throw new Error('No se pudo conectar a la base de datos PostgreSQL');
      }

      // Asegurar tabla de migraciones
      await this.ensureMigrationTable();

      // Obtener migraciones ejecutadas
      const executed = await this.getExecutedMigrations();
      console.log(`📋 Migraciones ya ejecutadas: ${executed.length}`);

      // Ejecutar migraciones pendientes
      let migrationsRun = 0;
      for (const migrationFile of this.migrationFiles) {
        if (!executed.includes(migrationFile)) {
          await this.executeMigration(migrationFile);
          migrationsRun++;
        } else {
          console.log(`⏭️  Migración ${migrationFile} ya ejecutada`);
        }
      }

      if (migrationsRun === 0) {
        console.log('✅ Todas las migraciones están actualizadas');
      } else {
        console.log(`✅ ${migrationsRun} migraciones ejecutadas exitosamente`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el estado de las migraciones
   */
  async getMigrationStatus() {
    try {
      await this.ensureMigrationTable();
      const executed = await this.getExecutedMigrations();
      
      const status = this.migrationFiles.map(file => ({
        migration: file,
        executed: executed.includes(file) ? '✅' : '❌',
        status: executed.includes(file) ? 'Ejecutada' : 'Pendiente'
      }));

      return status;
    } catch (error) {
      console.error('❌ Error obteniendo estado de migraciones:', error.message);
      throw error;
    }
  }

  /**
   * Crea la base de datos completa desde cero
   */
  async createDatabase() {
    try {
      console.log('🏗️  Creando base de datos VetPlus...');
      await this.runMigrations();
      console.log('🎉 Base de datos VetPlus creada exitosamente');
      console.log('📚 Para insertar datos iniciales ejecuta: npm run db:seed');
      return true;
    } catch (error) {
      console.error('❌ Error creando base de datos:', error.message);
      throw error;
    }
  }
}

export default DatabaseMigrator;
