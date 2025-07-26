#!/usr/bin/env node
import DatabaseMigrator from '../src/database/migrator.js';

const command = process.argv[2];
const migrator = new DatabaseMigrator();

async function runCommand() {
  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigrations();
        break;
      case 'status':
        const status = await migrator.getMigrationStatus();
        console.table(status);
        break;
      case 'create':
        await migrator.createDatabase();
        break;
      default:
        console.log(`
🗄️  VetPlus Database CLI

Comandos disponibles:
  npm run db:migrate  - Ejecutar migraciones pendientes
  npm run db:status   - Ver estado de migraciones
  npm run db:create   - Crear base de datos completa
  npm run db:seed     - Insertar datos iniciales
  npm run db:test     - Probar conexión
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runCommand();
