#!/usr/bin/env node
import { testConnection } from '../src/config/database.js';

async function test() {
  try {
    console.log('🔍 Probando conexión a PostgreSQL...');
    const connected = await testConnection();
    
    if (connected) {
      console.log('✅ Conexión exitosa a PostgreSQL');
      console.log('🎯 Base de datos lista para usar');
    } else {
      console.log('❌ Error de conexión a PostgreSQL');
      console.log('💡 Verifica:');
      console.log('   - PostgreSQL está ejecutándose');
      console.log('   - Variables de entorno en .env');
      console.log('   - Usuario y contraseña correctos');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
