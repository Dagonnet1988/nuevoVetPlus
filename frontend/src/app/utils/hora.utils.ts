export interface OpcionHora {
  value: string;
  label: string;
}

/** "14:30" -> "2:30 p. m." */
export function etiquetaHora(valor: string): string {
  const [h, m] = valor.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/**
 * Horas para elegir en una lista (HH:mm). Se usa en lugar de <input type="time">,
 * cuyo selector no se abre en Chrome de Android dentro de los campos de Material.
 * Si el valor actual no cae en la lista (ej. 10:10 de una cita importada), se agrega.
 */
export function opcionesHora(actual?: string | null, desde = '07:00', hasta = '20:00', pasoMin = 15): OpcionHora[] {
  const aMinutos = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const aTexto = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  const valores: string[] = [];
  for (let min = aMinutos(desde); min <= aMinutos(hasta); min += pasoMin) {
    valores.push(aTexto(min));
  }
  if (actual && /^\d{2}:\d{2}$/.test(actual) && !valores.includes(actual)) {
    valores.push(actual);
    valores.sort((a, b) => aMinutos(a) - aMinutos(b));
  }
  return valores.map(value => ({ value, label: etiquetaHora(value) }));
}
