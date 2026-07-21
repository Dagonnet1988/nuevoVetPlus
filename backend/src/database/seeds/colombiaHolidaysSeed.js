const COLOMBIA_HOLIDAYS_2026_2030 = [
  ['2026-01-01', 'Año Nuevo'],
  ['2026-01-12', 'Día de los Reyes Magos'],
  ['2026-03-23', 'Día de San José'],
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajo'],
  ['2026-05-18', 'Ascensión del señor'],
  ['2026-06-08', 'Corpus Christi'],
  ['2026-06-15', 'Sagrado Corazón'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-20', 'Declaración de la Independencia de Colombia'],
  ['2026-08-07', 'Batalla de Boyacá'],
  ['2026-08-17', 'La Asunción'],
  ['2026-10-12', 'Día de la Raza'],
  ['2026-11-02', 'Día de los Santos'],
  ['2026-11-16', 'Independencia de Cartagena'],
  ['2026-12-08', 'La Inmaculada Concepción'],
  ['2026-12-25', 'Navidad'],
  ['2027-01-01', 'Año Nuevo'],
  ['2027-01-11', 'Día de los Reyes Magos'],
  ['2027-03-22', 'Día de San José'],
  ['2027-03-25', 'Jueves Santo'],
  ['2027-03-26', 'Viernes Santo'],
  ['2027-05-01', 'Día del Trabajo'],
  ['2027-05-10', 'Ascensión del señor'],
  ['2027-05-31', 'Corpus Christi'],
  ['2027-06-07', 'Sagrado Corazón'],
  ['2027-07-05', 'San Pedro y San Pablo'],
  ['2027-07-20', 'Declaración de la Independencia de Colombia'],
  ['2027-08-07', 'Batalla de Boyacá'],
  ['2027-08-16', 'La Asunción'],
  ['2027-10-18', 'Día de la Raza'],
  ['2027-11-01', 'Día de los Santos'],
  ['2027-11-15', 'Independencia de Cartagena'],
  ['2027-12-08', 'La Inmaculada Concepción'],
  ['2027-12-25', 'Navidad'],
  ['2028-01-01', 'Año Nuevo'],
  ['2028-01-10', 'Día de los Reyes Magos'],
  ['2028-03-20', 'Día de San José'],
  ['2028-04-13', 'Jueves Santo'],
  ['2028-04-14', 'Viernes Santo'],
  ['2028-05-01', 'Día del Trabajo'],
  ['2028-05-29', 'Ascensión del señor'],
  ['2028-06-19', 'Corpus Christi'],
  ['2028-06-26', 'Sagrado Corazón'],
  ['2028-07-03', 'San Pedro y San Pablo'],
  ['2028-07-20', 'Declaración de la Independencia de Colombia'],
  ['2028-08-07', 'Batalla de Boyacá'],
  ['2028-08-21', 'La Asunción'],
  ['2028-10-16', 'Día de la Raza'],
  ['2028-11-06', 'Día de los Santos'],
  ['2028-11-13', 'Independencia de Cartagena'],
  ['2028-12-08', 'La Inmaculada Concepción'],
  ['2028-12-25', 'Navidad'],
  ['2029-01-01', 'Año Nuevo'],
  ['2029-01-08', 'Día de los Reyes Magos'],
  ['2029-03-19', 'Día de San José'],
  ['2029-03-29', 'Jueves Santo'],
  ['2029-03-30', 'Viernes Santo'],
  ['2029-05-01', 'Día del Trabajo'],
  ['2029-05-14', 'Ascensión del señor'],
  ['2029-06-04', 'Corpus Christi'],
  ['2029-06-11', 'Sagrado Corazón'],
  ['2029-07-02', 'San Pedro y San Pablo'],
  ['2029-07-20', 'Declaración de la Independencia de Colombia'],
  ['2029-08-07', 'Batalla de Boyacá'],
  ['2029-08-20', 'La Asunción'],
  ['2029-10-15', 'Día de la Raza'],
  ['2029-11-05', 'Día de los Santos'],
  ['2029-11-12', 'Independencia de Cartagena'],
  ['2029-12-08', 'La Inmaculada Concepción'],
  ['2029-12-25', 'Navidad'],
  ['2030-01-01', 'Año Nuevo'],
  ['2030-01-07', 'Día de los Reyes Magos'],
  ['2030-03-25', 'Día de San José'],
  ['2030-04-18', 'Jueves Santo'],
  ['2030-04-19', 'Viernes Santo'],
  ['2030-05-01', 'Día del Trabajo'],
  ['2030-06-03', 'Ascensión del señor'],
  ['2030-06-24', 'Corpus Christi'],
  ['2030-07-01', 'San Pedro y San Pablo'],
  ['2030-07-01', 'Sagrado Corazón'],
  ['2030-07-20', 'Declaración de la Independencia de Colombia'],
  ['2030-08-07', 'Batalla de Boyacá'],
  ['2030-08-19', 'La Asunción'],
  ['2030-10-14', 'Día de la Raza'],
  ['2030-11-04', 'Día de los Santos'],
  ['2030-11-11', 'Independencia de Cartagena'],
  ['2030-12-08', 'La Inmaculada Concepción'],
  ['2030-12-25', 'Navidad']
];

export async function applyColombiaHolidaysSeed(client) {
  let inserted = 0;
  let updated = 0;

  for (const [fecha, nombre] of COLOMBIA_HOLIDAYS_2026_2030) {
    const result = await client.query(
      `INSERT INTO system.dias_especiales (id_tenant, fecha, descripcion, tipo, activo, metadata)
       VALUES (NULL, $1::date, $2, 'festivo', true, '{"scope":"global_seed","source":"co_2026_2030"}'::jsonb)
       ON CONFLICT (
         COALESCE(id_tenant, '00000000-0000-0000-0000-000000000000'::uuid),
         fecha,
         tipo,
         descripcion
       )
       DO UPDATE SET
         activo = EXCLUDED.activo,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [fecha, nombre]
    );

    if (result.rows[0]?.inserted) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}
