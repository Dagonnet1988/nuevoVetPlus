import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verificar y limpiar fotos de mascotas que no existen físicamente
 */
export async function cleanOrphanedPhotos() {
  try {
    console.log('🧹 Iniciando limpieza de fotos huérfanas...');
    
    // Obtener todas las mascotas con foto_url
    const result = await query(`
      SELECT id_mascota, foto_url, nombre 
      FROM clinical.mascotas 
      WHERE foto_url IS NOT NULL AND foto_url != ''
    `);

    const uploadsPath = path.join(__dirname, '../../uploads/pacientes');
    let cleanedCount = 0;
    let checkedCount = 0;

    for (const mascota of result.rows) {
      checkedCount++;
      const { id_mascota, foto_url, nombre } = mascota;
      
      // Omitir imágenes por defecto y URLs externas
      if (foto_url.includes('/default/') || foto_url.startsWith('http')) {
        continue;
      }

      // Construir ruta completa del archivo
      const fileName = path.basename(foto_url);
      const fullPath = path.join(uploadsPath, fileName);

      // Verificar si el archivo existe
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Archivo no encontrado para ${nombre}: ${fileName}`);
        
        // Limpiar la referencia en la base de datos
        await query(`
          UPDATE clinical.mascotas 
          SET foto_url = NULL 
          WHERE id_mascota = $1
        `, [id_mascota]);
        
        cleanedCount++;
        console.log(`✅ Limpiado registro para ${nombre}`);
      }
    }

    console.log(`🧹 Limpieza completada:`);
    console.log(`   📊 Registros verificados: ${checkedCount}`);
    console.log(`   🗑️  Referencias limpiadas: ${cleanedCount}`);

    return {
      success: true,
      checked: checkedCount,
      cleaned: cleanedCount
    };

  } catch (error) {
    console.error('❌ Error en limpieza de fotos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener estadísticas de fotos
 */
export async function getPhotoStats() {
  try {
    // Contar mascotas con foto
    const withPhotoResult = await query(`
      SELECT COUNT(*) as total 
      FROM clinical.mascotas 
      WHERE foto_url IS NOT NULL AND foto_url != ''
    `);

    // Contar mascotas sin foto
    const withoutPhotoResult = await query(`
      SELECT COUNT(*) as total 
      FROM clinical.mascotas 
      WHERE foto_url IS NULL OR foto_url = ''
    `);

    // Contar archivos físicos
    const uploadsPath = path.join(__dirname, '../../uploads/pacientes');
    let physicalFiles = 0;
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      physicalFiles = files.filter(file => 
        file.match(/\.(jpg|jpeg|png|gif|webp)$/i) && 
        !file.startsWith('.') &&
        file !== 'default'
      ).length;
    }

    return {
      withPhoto: parseInt(withPhotoResult.rows[0].total),
      withoutPhoto: parseInt(withoutPhotoResult.rows[0].total),
      physicalFiles
    };

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de fotos:', error);
    throw error;
  }
}
