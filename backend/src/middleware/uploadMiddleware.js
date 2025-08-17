import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de almacenamiento para fotos de pacientes
const pacienteStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/pacientes');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: mascota-{id}-{timestamp}.{ext}
    const ext = path.extname(file.originalname);
    const name = `mascota-${req.params.id || 'new'}-${Date.now()}${ext}`;
    cb(null, name);
  }
});

// Filtro de archivos - solo imágenes
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Middleware para upload de foto de mascota
export const uploadPacienteFoto = multer({
  storage: pacienteStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: imageFilter
}).single('foto');

// Middleware para manejar errores de multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.'
      });
    }
  }
  
  if (error.message.includes('Solo se permiten archivos de imagen')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Función para eliminar archivo de foto anterior
export const eliminarFotoAnterior = (fotoUrl) => {
  if (!fotoUrl || fotoUrl.includes('/default/')) {
    return; // No eliminar imágenes por defecto
  }
  
  try {
    // Extraer el nombre del archivo de la URL
    const filename = path.basename(fotoUrl);
    const filePath = path.join(__dirname, '../../uploads/pacientes', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Foto anterior eliminada: ${filename}`);
    }
  } catch (error) {
    console.error('Error eliminando foto anterior:', error);
  }
};

// Función para obtener URL de imagen por defecto según especie
export const getFotoDefaultPorEspecie = (especie) => {
  const especieNormalizada = especie.toLowerCase();
  const especiesIconos = {
    'perro': 'dog',
    'gato': 'cat', 
    'ave': 'bird',
    'hamster': 'hamster',
    'conejo': 'rabbit',
    'reptil': 'reptile',
    'pez': 'fish',
    'otro': 'pet'
  };
  
  const icono = especiesIconos[especieNormalizada] || 'pet';
  return `/uploads/pacientes/default/${icono}.svg`;
};