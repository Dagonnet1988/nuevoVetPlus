/**
 * Utilidades para el manejo de datos de pacientes
 */

export enum SexoFrontend {
  MACHO = 'M',
  HEMBRA = 'H'
}

export enum SexoBackend {
  MACHO = 'Macho',
  HEMBRA = 'Hembra'
}

/**
 * Convierte el sexo de base de datos (Macho/Hembra) a formato frontend (M/H)
 */
export function sexoDbToFrontend(sexoDb: string): 'M' | 'H' | '' {
  if (!sexoDb) return '';

  const sexoNormalized = sexoDb.toLowerCase().trim();

  switch (sexoNormalized) {
    case 'macho':
      return SexoFrontend.MACHO;
    case 'hembra':
      return SexoFrontend.HEMBRA;
    default:
      console.warn(`Valor de sexo no reconocido: ${sexoDb}`);
      return '';
  }
}

/**
 * Convierte el sexo de frontend (M/H) a formato de base de datos (Macho/Hembra)
 */
export function sexoFrontendToDb(sexoFrontend: string): string {
  if (!sexoFrontend) return '';

  const sexoNormalized = sexoFrontend.toUpperCase().trim();

  switch (sexoNormalized) {
    case SexoFrontend.MACHO:
      return SexoBackend.MACHO;
    case SexoFrontend.HEMBRA:
      return SexoBackend.HEMBRA;
    default:
      console.warn(`Valor de sexo frontend no reconocido: ${sexoFrontend}`);
      return '';
  }
}

/**
 * Obtiene el texto completo del sexo para mostrar al usuario
 */
export function getSexoDisplayText(sexo: string): string {
  const normalizedSexo = sexo?.toUpperCase().trim();

  switch (normalizedSexo) {
    case SexoFrontend.MACHO:
    case 'MACHO':
      return 'Macho';
    case SexoFrontend.HEMBRA:
    case 'HEMBRA':
      return 'Hembra';
    default:
      return sexo || 'No especificado';
  }
}

/**
 * Valida que el sexo sea un valor válido
 */
export function isValidSexo(sexo: string): boolean {
  if (!sexo) return false;

  const normalizedSexo = sexo.toUpperCase().trim();
  return normalizedSexo === SexoFrontend.MACHO ||
         normalizedSexo === SexoFrontend.HEMBRA ||
         normalizedSexo === 'MACHO' ||
         normalizedSexo === 'HEMBRA';
}

/**
 * Procesa los datos de respuesta del backend de forma robusta
 */
export function processBackendResponse<T>(response: any): {
  data: T | null;
  success: boolean;
  message?: string;
} {
  // Si la respuesta tiene estructura de API estándar
  if (response && typeof response === 'object' && 'success' in response) {
    return {
      data: response.data || null,
      success: response.success,
      message: response.message
    };
  }

  // Si la respuesta tiene solo data
  if (response && typeof response === 'object' && 'data' in response) {
    return {
      data: response.data,
      success: true
    };
  }

  // Si la respuesta es directamente los datos
  if (response) {
    return {
      data: response,
      success: true
    };
  }

  return {
    data: null,
    success: false,
    message: 'Respuesta vacía del servidor'
  };
}
