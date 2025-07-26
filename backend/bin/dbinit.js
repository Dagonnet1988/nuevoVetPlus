#!/usr/bin/env node
import DBInit from '../src/database/DBInit.js';

const command = process.argv[2];
const dbInit = new DBInit();

async function runCommand() {
  try {
    switch (command) {
      case 'init':
        await dbInit.initialize();
        break;
      case 'check':
        await dbInit.quickCheck();
        break;
      case 'status':
        await dbInit.checkSystemStatus();
        break;
      default:
        console.log(`
🗄️  VetPlus Database Initializer

Comandos disponibles:
  npm run db:init     - Inicializar sistema completo
  npm run db:check    - Verificación rápida
  npm run db:status   - Estado detallado del sistema
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runCommand();
