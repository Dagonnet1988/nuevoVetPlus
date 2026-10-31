const ZOOM_MAX = 4;

const limitar = (valor, min, max) => Math.min(Math.max(valor, min), max);
const redondear = (valor) => Math.round(valor * 100) / 100;

/**
 * Valida el encuadre de una foto: { x, y } en porcentaje (0-100) y zoom (1-4).
 * Acepta un objeto o un texto JSON (cuando llega en un formulario multipart).
 * Devuelve null si el valor no es válido.
 */
export const normalizarEncuadre = (valor) => {
    let datos = valor;
    if (typeof datos === 'string') {
        try {
            datos = JSON.parse(datos);
        } catch {
            return null;
        }
    }
    if (!datos || typeof datos !== 'object') return null;

    const x = Number(datos.x);
    const y = Number(datos.y);
    const zoom = Number(datos.zoom);
    if (![x, y, zoom].every(Number.isFinite)) return null;

    return {
        x: redondear(limitar(x, 0, 100)),
        y: redondear(limitar(y, 0, 100)),
        zoom: redondear(limitar(zoom, 1, ZOOM_MAX))
    };
};
