/**
 * Búsqueda de texto sin distinguir mayúsculas ni tildes ("marin" encuentra "Marín").
 * Misma tabla de equivalencias que la búsqueda de pacientes (incluye ñ -> n).
 */
const CON_TILDE = 'áéíóúüñàèìòùâêîôû';
const SIN_TILDE = 'aeiouunaeiouaeiou';

/** Expresión SQL de `expr` en minúsculas y sin tildes. */
export const sinTildesSql = (expr) => `translate(LOWER(${expr}), '${CON_TILDE}', '${SIN_TILDE}')`;

/** Condición SQL: la columna contiene el parámetro, ignorando mayúsculas y tildes. */
export const contieneSinTildes = (columna, param) => `${sinTildesSql(columna)} LIKE ${sinTildesSql(param)}`;
