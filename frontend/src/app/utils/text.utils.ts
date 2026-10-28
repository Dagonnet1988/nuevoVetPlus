/** Texto en minúsculas y sin tildes, para filtrar sin distinguir "marin" de "Marín". */
export const sinTildes = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
