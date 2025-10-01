#!/usr/bin/env node

/**
 * Script para ejecutar la migración de configuración WhatsApp
 */

import pkg from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    let client;
    try {
        // Configuración de base de datos
        let config;
        if (process.env.DATABASE_URL) {
            const url = new URL(process.env.DATABASE_URL);
            config = {
                host: url.hostname,
                port: parseInt(url.port) || 5432,
                user: url.username,
                password: url.password,
                database: url.pathname.slice(1),
                ssl: { rejectUnauthorized: false }
            };
        } else {
            config = {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'vetplus'
            };
        }

        console.log('🔄 Conectando a la base de datos...');
        client = new Client(config);
        await client.connect();
        console.log('✅ Conectado exitosamente');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'migrations', 'add_whatsapp_config_columns.sql');
        console.log('📖 Leyendo migración:', migrationPath);
        
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        console.log('🚀 Ejecutando migración...');
        await client.query(migrationSQL);
        console.log('✅ Migración ejecutada exitosamente');
        
        // Verificar que las columnas fueron agregadas
        console.log('🔍 Verificando columnas agregadas...');
        const checkResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'system' 
            AND table_name = 'configuracion_empresa' 
            AND column_name LIKE 'whatsapp_%'
            ORDER BY column_name;
        `);
        
        console.log('📋 Columnas WhatsApp encontradas:');
        checkResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}`);
        });
        
        console.log('🎉 Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar migración
runMigration();