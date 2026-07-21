import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae el mensaje de error más descriptivo disponible de una respuesta HTTP fallida.
 * Orden de prioridad:
 *  1. error.error.message  — mensaje enviado por el backend (más específico)
 *  2. error.error.errors[] — array de errores de validación
 *  3. error.message        — mensaje genérico del objeto Error de JS
 *  4. fallback             — texto por defecto proporcionado por el componente
 */
export function extractError(
  err: unknown,
  fallback = 'Ha ocurrido un error inesperado'
): string {
  if (!err) return fallback;

  // Respuesta HTTP de Angular (err.error es el body del backend)
  if (err instanceof HttpErrorResponse) {
    const body = err.error;

    // Body es un string (raro, pero posible)
    if (typeof body === 'string' && body.length > 0 && body.length < 300) {
      return body;
    }

    // Body es un objeto con message
    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message.trim();
      }
      // Array de errores de validación Express-Validator
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        const first = body.errors[0];
        return typeof first === 'string' ? first : (first?.msg ?? fallback);
      }
    }

    // Errores HTTP estándar sin body útil
    if (err.status === 0)   return 'No se puede conectar con el servidor. Verifica tu conexión.';
    if (err.status === 401) return 'No autorizado. Por favor, inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
    if (err.status === 404) return 'El recurso solicitado no existe.';
    if (err.status === 422) return body?.message ?? 'Datos inválidos para esta operación.';
    if (err.status >= 500)  return 'Error interno del servidor. Intenta de nuevo en un momento.';

    return fallback;
  }

  // Error genérico de JavaScript
  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}
