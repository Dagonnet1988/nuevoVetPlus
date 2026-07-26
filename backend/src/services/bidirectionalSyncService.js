import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import googleCalendarService from './googleCalendar.js';

class BidirectionalSyncService {
    constructor() {
        this.contextTenantId = null;
    }

    getBogotaDateString(date = new Date()) {
        return new Date(date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    }

    toBogotaDateOnly(value) {
        if (!value) return null;

        // Formato all-day de Google Calendar: YYYY-MM-DD
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            return value.trim();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return this.getBogotaDateString(date);
    }

    toBogotaDateTime(value, fallbackTime = '00:00:00') {
        if (!value) return null;

        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            return `${value.trim()} ${fallbackTime}`;
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;

        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date);

        const get = (type) => parts.find((p) => p.type === type)?.value || '00';
        return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
    }

    isWithinDateRange(fechaInicio, startDate, endDate) {
        const eventDate = this.toBogotaDateOnly(fechaInicio);
        if (!eventDate) return false;
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        return true;
    }

    sanitizeRichTextToPlain(value) {
        if (!value) return '';

        return String(value)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&#160;/gi, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    normalizeText(value) {
        return String(value || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&#160;/gi, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    toTitleCase(value) {
        return String(value || '')
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .slice(0, 100);
    }

    isValidAutoCreateName(value) {
        const normalized = this.normalizeText(value);
        if (!normalized) return false;
        if (normalized.length < 2 || normalized.length > 80) return false;

        const forbidden = ['cliente:', 'mascota:', 'veterinario:', 'tipo:', 'motivo:', 'codigo de cita'];
        return !forbidden.some(fragment => normalized.includes(fragment));
    }

    async createMissingClientAndPet(eventData, matchedData = {}) {
        const tenantId = matchedData?.tenant_id || await this.resolveActiveTenantId();
        const veterinarioId = matchedData?.veterinario_id
            || await this.resolveFallbackVeterinarioId(tenantId, eventData?.veterinario_nombre);

        let clienteId = matchedData?.cliente_id || null;
        let mascotaId = matchedData?.mascota_id || null;

        const safePetName = this.isValidAutoCreateName(eventData?.mascota_nombre)
            ? this.toTitleCase(eventData.mascota_nombre).slice(0, 50)
            : null;

        const safeClientNameFromEvent = this.isValidAutoCreateName(eventData?.cliente_nombre)
            ? this.toTitleCase(eventData.cliente_nombre)
            : null;

        // Caso mínimo soportado: solo llega la mascota.
        // Se crea un cliente placeholder para poder registrar la cita y completar datos después en UI.
        const placeholderClientName = safePetName ? `Propietario de ${safePetName}` : null;

        if (!clienteId && (safeClientNameFromEvent || placeholderClientName)) {
            const newClientId = uuidv4();
            const createdClient = await query(
                `INSERT INTO clinical.clientes (id_cliente, nombre, email, notas, id_tenant, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id_cliente`,
                [
                    newClientId,
                    safeClientNameFromEvent || placeholderClientName,
                    eventData?.cliente_email || null,
                    safeClientNameFromEvent
                        ? 'Creado automaticamente desde sincronizacion Google Calendar'
                        : 'Cliente placeholder creado automaticamente desde Google Calendar (solo se recibio mascota).',
                    tenantId,
                    veterinarioId
                ]
            );
            clienteId = createdClient.rows[0]?.id_cliente || null;
        }

        if (!mascotaId && clienteId && safePetName) {
            const newPetId = uuidv4();
            const createdPet = await query(
                `INSERT INTO clinical.mascotas (id_mascota, id_cliente, nombre, especie, notas, id_tenant, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id_mascota`,
                [
                    newPetId,
                    clienteId,
                    safePetName,
                    'Perro',
                    'Creado automaticamente desde sincronizacion Google Calendar (especie por defecto: Perro).',
                    tenantId,
                    veterinarioId
                ]
            );
            mascotaId = createdPet.rows[0]?.id_mascota || null;
        }

        return {
            ...matchedData,
            tenant_id: tenantId,
            cliente_id: clienteId,
            mascota_id: mascotaId,
            veterinario_id: matchedData?.veterinario_id || veterinarioId || null
        };
    }

    async resolveActiveTenantId() {
        if (this.contextTenantId) {
            return this.contextTenantId;
        }

        if (googleCalendarService?.config?.configured_by) {
            const tenantByConfig = await query(
                `SELECT id_tenant
                 FROM vetplus_auth.usuarios
                 WHERE id_usuario = $1
                 LIMIT 1`,
                [googleCalendarService.config.configured_by]
            );

            if (tenantByConfig.rows.length > 0) {
                return tenantByConfig.rows[0].id_tenant;
            }
        }

        const fallback = await query(
            `SELECT id_tenant
             FROM vetplus_auth.usuarios
             WHERE rol IN ('admin', 'vet') AND activo = true
             ORDER BY created_at ASC
             LIMIT 1`
        );

        return fallback.rows[0]?.id_tenant || null;
    }

    async resolveFallbackVeterinarioId(tenantId, veterinarioNombre = null) {
        if (!tenantId) return null;

        const usuariosResult = await query(
            `SELECT id_usuario, nombre, apellido, rol
             FROM vetplus_auth.usuarios
             WHERE id_tenant = $1
               AND activo = true
             ORDER BY
               CASE
                 WHEN rol = 'vet' THEN 1
                 WHEN rol = 'admin' THEN 2
                 WHEN rol = 'aux' THEN 3
                 ELSE 4
               END,
               nombre,
               apellido`,
            [tenantId]
        );

        if (usuariosResult.rows.length === 0) return null;

        if (veterinarioNombre) {
            const targetVet = this.normalizeText(veterinarioNombre);
            const targetTokens = targetVet.split(/\s+/).filter(token => token.length >= 3);

            const matchedUser = usuariosResult.rows.find((user) => {
                const fullName = this.normalizeText(`${user.nombre || ''} ${user.apellido || ''}`);
                if (fullName === targetVet) return true;
                if (targetTokens.length === 0) return fullName.includes(targetVet) || targetVet.includes(fullName);
                return targetTokens.every(token => fullName.includes(token));
            });

            if (matchedUser) {
                return matchedUser.id_usuario;
            }
        }

        return usuariosResult.rows[0].id_usuario;
    }

    normalizeAppointmentType(rawType) {
        const source = String(rawType || '').trim();
        if (!source) return 'control';

        const normalized = source.toLowerCase();
        const mapped = {
            sin_clasificar: 'sin_clasificar',
            'sin clasificar': 'sin_clasificar',
            valoracion: 'valoracion',
            'valoración': 'valoracion',
            'valoracion inicial': 'valoracion',
            'valoración inicial': 'valoracion',
            domicilio: 'domicilio',
            fisio: 'terapia',
            fisioterapia: 'terapia',
            hidroterapia: 'hidroterapia',
            terapia: 'terapia',
            control: 'control',
            consulta: 'domicilio',
            'consulta general': 'domicilio',
            general: 'domicilio',
            cita: 'domicilio',
            'cita veterinaria': 'domicilio'
        }[normalized];

        const safeType = mapped || normalized;
        return safeType.length > 30 ? safeType.slice(0, 30) : safeType;
    }

    normalizeAppointmentStatus(rawStatus) {
        const source = String(rawStatus || '').trim().toLowerCase();
        const allowed = new Set(['confirmada', 'en_curso', 'completada', 'no_asistio']);

        if (allowed.has(source)) return source;

        const mapped = {
            confirmed: 'confirmada',
            tentative: 'confirmada',
            cancelled: 'no_asistio',
            canceled: 'no_asistio',
            pendiente: 'confirmada',
            cancelada: 'no_asistio',
            done: 'completada'
        }[source];

        return mapped && allowed.has(mapped) ? mapped : 'confirmada';
    }
    
    /**
     * Importar eventos desde Google Calendar y crear citas en VetPlus
     */
    async importFromGoogle(startDate, endDate, options = {}) {
        const previousContextTenant = this.contextTenantId;
        try {
            const {
                autoMatch = true,      // Intentar matching automático de clientes/mascotas
                createMissingData = true, // Crear clientes/mascotas si no existen
                dryRun = false,       // Solo simular, no crear realmente
                tenantId = null
            } = options;
            this.contextTenantId = tenantId || this.contextTenantId;
            const resolvedTenantId = await this.resolveActiveTenantId();

            // Obtener eventos desde Google Calendar
            const importResult = await googleCalendarService.importEventsFromGoogle(startDate, endDate);
            
            if (!importResult.success) {
                return importResult;
            }

            const results = {
                total_google_events: importResult.total_events,
                vet_events_found: importResult.vet_events_found,
                not_appointment_events: Math.max(0, Number(importResult.total_events || 0) - Number(importResult.vet_events_found || 0)),
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: [],
                created_appointments: [],
                matched_data: [],
                event_logs: [],
                event_reason_counts: {},
                classification_stats: importResult.classification_stats || {},
                expected_color_ids: importResult.expected_color_ids || [],
                no_color_match_sample: importResult.no_color_match_sample || []
            };

            // Procesar cada evento importado
            for (const eventData of importResult.imported_events) {
                try {
                    results.processed++;
                    const eventLog = {
                        index: results.processed,
                        google_event_id: eventData.google_event_id,
                        titulo: eventData.titulo || '(sin titulo)',
                        tipo_detectado: eventData.tipo || 'sin_clasificar',
                        fecha_inicio: eventData.fecha_inicio,
                        action: 'pending',
                        reason: '',
                        details: {}
                    };
                    
                    // Verificar si ya existe una cita con este google_event_id
                    const existingResult = await query(`
                        SELECT id_cita, codigo_cita, google_sync_status 
                        FROM clinical.calendario_citas 
                                                WHERE google_event_id = $1
                                                    AND id_tenant = $2
                                        `, [eventData.google_event_id, resolvedTenantId]);

                    if (existingResult.rows.length > 0) {
                        // Ya existe, verificar si necesita actualización
                        const existing = existingResult.rows[0];
                        const needsUpdate = await this.needsUpdate(existing.id_cita, eventData);
                        eventLog.details = {
                            existing_id_cita: existing.id_cita,
                            existing_codigo_cita: existing.codigo_cita,
                            needs_update: needsUpdate
                        };
                        
                        if (needsUpdate && !dryRun) {
                            await this.updateAppointmentFromGoogle(existing.id_cita, eventData);
                            results.updated++;
                            eventLog.action = 'updated';
                            eventLog.reason = 'existing_needs_update';
                        } else {
                            results.skipped++;
                            eventLog.action = 'skipped';
                            eventLog.reason = needsUpdate && dryRun ? 'dry_run_would_update_existing' : 'existing_no_changes';
                        }
                        results.event_logs.push(eventLog);
                        continue;
                    }

                    // Intentar matching de cliente y mascota
                    let matchedData = null;
                    if (autoMatch) {
                        matchedData = await this.matchClientAndPet(eventData);
                        results.matched_data.push(matchedData);
                        eventLog.details = {
                            ...eventLog.details,
                            match_score: matchedData?.match_score ?? 0,
                            cliente_id: matchedData?.cliente_id || null,
                            mascota_id: matchedData?.mascota_id || null,
                            veterinario_id: matchedData?.veterinario_id || null
                        };
                    }

                    if (createMissingData && (!matchedData?.cliente_id || !matchedData?.mascota_id)) {
                        const beforeCreate = {
                            cliente_id: matchedData?.cliente_id || null,
                            mascota_id: matchedData?.mascota_id || null
                        };
                        matchedData = await this.createMissingClientAndPet(eventData, matchedData || {});
                        eventLog.details = {
                            ...eventLog.details,
                            create_missing_data_applied: true,
                            before_create_missing: beforeCreate,
                            after_create_missing: {
                                cliente_id: matchedData?.cliente_id || null,
                                mascota_id: matchedData?.mascota_id || null
                            }
                        };
                    }

                    // Si no se pudo hacer matching y no se permite crear datos faltantes, saltar
                    if (!matchedData?.cliente_id && !createMissingData) {
                        results.skipped++;
                        results.errors.push({
                            google_event_id: eventData.google_event_id,
                            error: 'No se pudo hacer matching de cliente/mascota'
                        });
                        eventLog.action = 'skipped';
                        eventLog.reason = 'no_client_match_create_missing_disabled';
                        results.event_logs.push(eventLog);
                        continue;
                    }

                    // Crear la cita si no es dry run
                    if (!dryRun) {
                        const newAppointment = await this.createAppointmentFromGoogle(eventData, matchedData);
                        if (newAppointment.success) {
                            results.created++;
                            results.created_appointments.push(newAppointment.data);
                            eventLog.action = 'created';
                            eventLog.reason = 'created_successfully';
                            eventLog.details = {
                                ...eventLog.details,
                                id_cita: newAppointment?.data?.id_cita || null,
                                codigo_cita: newAppointment?.data?.codigo_cita || null
                            };
                        } else {
                            results.errors.push({
                                google_event_id: eventData.google_event_id,
                                error: newAppointment.error
                            });
                            eventLog.action = 'error';
                            eventLog.reason = 'create_failed';
                            eventLog.details = {
                                ...eventLog.details,
                                error: newAppointment.error
                            };
                        }
                    } else {
                        results.created++;
                        eventLog.action = 'created';
                        eventLog.reason = 'dry_run_would_create';
                    }

                    results.event_logs.push(eventLog);

                } catch (error) {
                    results.errors.push({
                        google_event_id: eventData.google_event_id,
                        error: error.message
                    });
                    results.event_logs.push({
                        index: results.processed,
                        google_event_id: eventData.google_event_id,
                        titulo: eventData.titulo || '(sin titulo)',
                        tipo_detectado: eventData.tipo || 'sin_clasificar',
                        fecha_inicio: eventData.fecha_inicio,
                        action: 'error',
                        reason: 'unexpected_exception',
                        details: { error: error.message }
                    });
                }
            }

            // Resumen de razones para diagnóstico rápido (sin leer todo event_logs)
            for (const log of results.event_logs) {
                const reason = String(log?.reason || 'unknown');
                results.event_reason_counts[reason] = (results.event_reason_counts[reason] || 0) + 1;
            }

            // Actualizar última sincronización
            if (!dryRun) {
                await this.updateLastSyncTime('import_from_google');
            }

            return {
                success: true,
                results,
                dry_run: dryRun
            };

        } catch (error) {
            console.error('Error importando desde Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.contextTenantId = previousContextTenant;
        }
    }

    /**
     * Detectar y procesar cambios desde Google Calendar
     */
    async syncChangesFromGoogle(options = {}) {
        const previousContextTenant = this.contextTenantId;
        try {
            const {
                onlyToday = false,
                startDate = null,
                endDate = null,
                tenantId = null
            } = options;

            this.contextTenantId = tenantId || this.contextTenantId;

            const todayBogota = this.getBogotaDateString();
            const rangeStart = startDate || (onlyToday ? todayBogota : null);
            const rangeEnd = endDate || (onlyToday ? todayBogota : null);
            const tenantIdResolved = await this.resolveActiveTenantId();

            // Obtener última sincronización
            const lastSyncResult = await query(`
                SELECT 
                    COALESCE(MAX(last_google_sync), CURRENT_TIMESTAMP - INTERVAL '1 day') as last_sync
                FROM clinical.calendario_citas
                WHERE google_event_id IS NOT NULL
                  AND id_tenant = $1
            `, [tenantIdResolved]);

            const rawLastSyncTime = lastSyncResult.rows[0]?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000);
            // Ventana de solape para evitar perder cambios por desfases/reintentos.
            const syncOverlapMs = 2 * 60 * 60 * 1000;
            const lastSyncTime = new Date(new Date(rawLastSyncTime).getTime() - syncOverlapMs);

            // Detectar cambios en Google Calendar
            const changesResult = await googleCalendarService.detectChangesFromGoogle(lastSyncTime.toISOString());
            
            if (!changesResult.success) {
                return changesResult;
            }

                const filteredChanges = changesResult.changes.filter(change => {
                    // Los eventos eliminados pueden llegar sin fecha en el payload incremental de Google.
                    // Deben procesarse igual para reflejar la cancelación en VetPlus.
                    if (change?.change_type === 'deleted') {
                        return true;
                    }

                    return this.isWithinDateRange(change?.parsed_data?.fecha_inicio, rangeStart, rangeEnd);
                });

            let fallbackImport = null;

            // Además del incremental, ejecutar importación por rango para cobertura completa.
            // Esto es crítico en primeras sincronizaciones o cuando Google no retorna cambios recientes.
            if (rangeStart && rangeEnd) {
                if (onlyToday) {
                    if (filteredChanges.length === 0) {
                        console.log(`ℹ️ Sync incremental sin cambios para hoy (${rangeStart}). Ejecutando import por rango diario...`);
                    } else {
                        console.log(`ℹ️ Sync incremental detectó ${filteredChanges.length} cambios para hoy (${rangeStart}). Ejecutando import por rango diario para completar eventos no modificados recientemente...`);
                    }
                } else if (filteredChanges.length === 0) {
                    console.log(`ℹ️ Sync incremental sin cambios para rango ${rangeStart} -> ${rangeEnd}. Ejecutando import de reconciliación por rango...`);
                } else {
                    console.log(`ℹ️ Sync incremental detectó ${filteredChanges.length} cambios en rango ${rangeStart} -> ${rangeEnd}. Ejecutando import de reconciliación por rango...`);
                }

                fallbackImport = await this.importFromGoogle(rangeStart, rangeEnd, {
                    autoMatch: true,
                    createMissingData: true,
                    dryRun: false,
                    tenantId: tenantIdResolved
                });

                if (fallbackImport?.success) {
                    console.log(
                        `✅ Fallback import completado: created=${fallbackImport?.results?.created || 0}, ` +
                        `updated=${fallbackImport?.results?.updated || 0}, skipped=${fallbackImport?.results?.skipped || 0}`
                    );
                } else {
                    console.warn(`⚠️ Fallback import falló: ${fallbackImport?.error || 'sin detalle'}`);
                }
            }

            const results = {
                last_sync_time: lastSyncTime,
                total_changes_detected: changesResult.total_changes,
                total_changes: filteredChanges.length,
                applied_date_range: {
                    start_date: rangeStart,
                    end_date: rangeEnd,
                    only_today: onlyToday
                },
                processed: 0,
                updated: 0,
                deleted: 0,
                created: 0,
                errors: [],
                change_logs: [],
                fallback_import: fallbackImport ? {
                    success: fallbackImport.success,
                    created: fallbackImport?.results?.created || 0,
                    updated: fallbackImport?.results?.updated || 0,
                    skipped: fallbackImport?.results?.skipped || 0,
                    errors: fallbackImport?.results?.errors || [],
                    event_logs: fallbackImport?.results?.event_logs || []
                } : null
            };

            // Procesar cada cambio
            for (const change of filteredChanges) {
                try {
                    results.processed++;
                    
                    switch (change.change_type) {
                        case 'created':
                            const createResult = await this.handleGoogleEventCreated(change, { createMissingData: true });
                            if (createResult.success) results.created++;
                            else results.errors.push(createResult.error);
                            results.change_logs.push({
                                google_event_id: change?.parsed_data?.google_event_id,
                                titulo: change?.parsed_data?.titulo || '(sin titulo)',
                                change_type: change.change_type,
                                action: createResult.success ? 'created' : 'error',
                                reason: createResult.success ? 'created_from_incremental' : 'create_failed',
                                details: createResult.success ? createResult.data : createResult.error
                            });
                            break;

                        case 'updated':
                            const updateResult = await this.handleGoogleEventUpdated(change);
                            if (updateResult.success) results.updated++;
                            else results.errors.push(updateResult.error);
                            results.change_logs.push({
                                google_event_id: change?.parsed_data?.google_event_id,
                                titulo: change?.parsed_data?.titulo || '(sin titulo)',
                                change_type: change.change_type,
                                action: updateResult.success ? 'updated' : 'error',
                                reason: updateResult.success ? 'updated_from_incremental' : 'update_failed',
                                details: updateResult.success ? updateResult.data : updateResult.error
                            });
                            break;

                        case 'attendee_response':
                            const attendeeResult = await this.handleAttendeeResponse(change);
                            if (attendeeResult.success) results.updated++;
                            else results.errors.push(attendeeResult.error);
                            results.change_logs.push({
                                google_event_id: change?.parsed_data?.google_event_id,
                                titulo: change?.parsed_data?.titulo || '(sin titulo)',
                                change_type: change.change_type,
                                action: attendeeResult.success ? 'updated' : 'error',
                                reason: attendeeResult.success ? 'attendee_response_applied' : 'attendee_response_failed',
                                details: attendeeResult.success ? attendeeResult.data : attendeeResult.error
                            });
                            break;

                        case 'deleted':
                            const deleteResult = await this.handleGoogleEventDeleted(change);
                            if (deleteResult.success) results.deleted++;
                            else results.errors.push(deleteResult.error);
                            results.change_logs.push({
                                google_event_id: change?.parsed_data?.google_event_id,
                                titulo: change?.parsed_data?.titulo || '(sin titulo)',
                                change_type: change.change_type,
                                action: deleteResult.success ? 'deleted' : 'error',
                                reason: deleteResult.success ? 'deleted_from_incremental' : 'delete_failed',
                                details: deleteResult.success ? deleteResult.data : deleteResult.error
                            });
                            break;
                    }

                } catch (error) {
                    results.errors.push({
                        google_event_id: change.parsed_data?.google_event_id,
                        error: error.message
                    });
                    results.change_logs.push({
                        google_event_id: change?.parsed_data?.google_event_id,
                        titulo: change?.parsed_data?.titulo || '(sin titulo)',
                        change_type: change?.change_type || 'unknown',
                        action: 'error',
                        reason: 'unexpected_exception',
                        details: { error: error.message }
                    });
                }
            }

            // Actualizar marca de tiempo de sincronización
            await this.updateLastSyncTime('sync_changes_from_google');

            if (fallbackImport && fallbackImport.success) {
                results.created += fallbackImport?.results?.created || 0;
                results.updated += fallbackImport?.results?.updated || 0;
                results.processed += fallbackImport?.results?.processed || 0;
                if (Array.isArray(fallbackImport?.results?.errors) && fallbackImport.results.errors.length > 0) {
                    results.errors.push(...fallbackImport.results.errors);
                }
            }

            if (results.errors.length > 0) {
                console.warn('⚠️ Errores de sync (primeros 5):', results.errors.slice(0, 5));
            }

            console.log(
                `📊 Sync resumen tenant=${tenantIdResolved}: incremental_detected=${results.total_changes_detected}, ` +
                `incremental_in_range=${results.total_changes}, processed=${results.processed}, ` +
                `created=${results.created}, updated=${results.updated}, deleted=${results.deleted}, errors=${results.errors.length}`
            );

            return {
                success: true,
                results
            };

        } catch (error) {
            console.error('Error sincronizando cambios desde Google Calendar:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.contextTenantId = previousContextTenant;
        }
    }

    /**
     * Intentar hacer matching de cliente y mascota basado en los nombres
     */
    async matchClientAndPet(eventData) {
        try {
            const { cliente_nombre, mascota_nombre, cliente_email, veterinario_nombre } = eventData;
            const tenantId = await this.resolveActiveTenantId();
            
            let cliente_id = null;
            let mascota_id = null;
            let veterinario_id = null;

            // Buscar cliente por nombre (coincidencia parcial)
            if (cliente_nombre) {
                const clienteResult = await query(`
                    SELECT id_cliente, nombre, telefono 
                    FROM clinical.clientes 
                    WHERE LOWER(nombre) LIKE LOWER($1) 
                    AND id_tenant = $2
                    AND activo = true
                    ORDER BY 
                        CASE WHEN LOWER(nombre) = LOWER($3) THEN 1 ELSE 2 END,
                        nombre
                    LIMIT 1
                `, [`%${cliente_nombre}%`, tenantId, cliente_nombre]);

                if (clienteResult.rows.length > 0) {
                    cliente_id = clienteResult.rows[0].id_cliente;
                }
            }

            // Fallback por email si existe
            if (!cliente_id && cliente_email) {
                const clienteByEmail = await query(`
                    SELECT id_cliente
                    FROM clinical.clientes
                    WHERE id_tenant = $1
                    AND activo = true
                    AND LOWER(email) = LOWER($2)
                    LIMIT 1
                `, [tenantId, cliente_email]);

                if (clienteByEmail.rows.length > 0) {
                    cliente_id = clienteByEmail.rows[0].id_cliente;
                }
            }

            // Fallback flexible por tokens de nombre (nombres compuestos)
            if (!cliente_id && cliente_nombre) {
                const candidateClients = await query(`
                    SELECT id_cliente, nombre
                    FROM clinical.clientes
                    WHERE id_tenant = $1
                    AND activo = true
                    LIMIT 500
                `, [tenantId]);

                const targetName = this.normalizeText(cliente_nombre);
                const targetTokens = targetName.split(/\s+/).filter(token => token.length >= 3);

                const bestClient = candidateClients.rows.find(row => {
                    const candidateName = this.normalizeText(row.nombre);
                    if (candidateName === targetName) return true;
                    if (targetTokens.length === 0) return candidateName.includes(targetName) || targetName.includes(candidateName);
                    return targetTokens.every(token => candidateName.includes(token));
                });

                if (bestClient) {
                    cliente_id = bestClient.id_cliente;
                }
            }

            // Buscar mascota por nombre y cliente
            if (mascota_nombre && cliente_id) {
                const mascotaResult = await query(`
                    SELECT id_mascota, nombre, especie 
                    FROM clinical.mascotas 
                    WHERE id_cliente = $1 
                    AND id_tenant = $2
                    AND LOWER(nombre) LIKE LOWER($3)
                    AND activo = true
                    ORDER BY 
                        CASE WHEN LOWER(nombre) = LOWER($4) THEN 1 ELSE 2 END,
                        nombre
                    LIMIT 1
                `, [cliente_id, tenantId, `%${mascota_nombre}%`, mascota_nombre]);

                if (mascotaResult.rows.length > 0) {
                    mascota_id = mascotaResult.rows[0].id_mascota;
                }
            }

            // Si no hay cliente pero sí nombre de mascota, intentar resolver mascota global por tenant
            // y derivar el cliente a partir de esa mascota.
            if (!cliente_id && !mascota_id && mascota_nombre) {
                const mascotaGlobalResult = await query(`
                    SELECT m.id_mascota, m.id_cliente
                    FROM clinical.mascotas m
                    WHERE m.id_tenant = $1
                      AND m.activo = true
                      AND LOWER(m.nombre) LIKE LOWER($2)
                    ORDER BY CASE WHEN LOWER(m.nombre) = LOWER($3) THEN 1 ELSE 2 END, m.nombre
                    LIMIT 1
                `, [tenantId, `%${mascota_nombre}%`, mascota_nombre]);

                if (mascotaGlobalResult.rows.length > 0) {
                    mascota_id = mascotaGlobalResult.rows[0].id_mascota;
                    cliente_id = mascotaGlobalResult.rows[0].id_cliente;
                }
            }

            // Fallback flexible de mascota por nombre normalizado
            if (!mascota_id && mascota_nombre && cliente_id) {
                const candidatePets = await query(`
                    SELECT id_mascota, nombre
                    FROM clinical.mascotas
                    WHERE id_cliente = $1
                    AND id_tenant = $2
                    AND activo = true
                    LIMIT 200
                `, [cliente_id, tenantId]);

                const targetPet = this.normalizeText(mascota_nombre);
                const bestPet = candidatePets.rows.find(row => {
                    const candidatePet = this.normalizeText(row.nombre);
                    return candidatePet === targetPet || candidatePet.includes(targetPet) || targetPet.includes(candidatePet);
                });

                if (bestPet) {
                    mascota_id = bestPet.id_mascota;
                }
            }

            // Si el cliente ya está identificado y no vino nombre de mascota o no hubo match,
            // usar la única mascota activa del cliente como fallback seguro.
            if (!mascota_id && cliente_id) {
                const singlePetResult = await query(`
                    SELECT id_mascota
                    FROM clinical.mascotas
                    WHERE id_cliente = $1
                      AND id_tenant = $2
                      AND activo = true
                    ORDER BY created_at ASC
                    LIMIT 2
                `, [cliente_id, tenantId]);

                if (singlePetResult.rows.length === 1) {
                    mascota_id = singlePetResult.rows[0].id_mascota;
                }
            }

            if (!veterinario_id) {
                // Fallback tolerante: prioriza vet/admin, pero permite aux para no perder citas sin veterinario explícito.
                veterinario_id = await this.resolveFallbackVeterinarioId(tenantId, veterinario_nombre);
            }

            return {
                tenant_id: tenantId,
                cliente_id,
                mascota_id,
                veterinario_id,
                cliente_nombre,
                mascota_nombre,
                match_score: this.calculateMatchScore(cliente_id, mascota_id, veterinario_id),
                needs_manual_review: !cliente_id || !mascota_id || !veterinario_id
            };

        } catch (error) {
            console.error('Error haciendo matching:', error);
            return {
                cliente_id: null,
                mascota_id: null,
                veterinario_id: null,
                error: error.message,
                needs_manual_review: true
            };
        }
    }

    /**
     * Calcular puntuación de matching
     */
    calculateMatchScore(cliente_id, mascota_id, veterinario_id) {
        let score = 0;
        if (cliente_id) score += 40;
        if (mascota_id) score += 40;
        if (veterinario_id) score += 20;
        return score;
    }

    /**
     * Crear cita desde evento de Google
     */
    async createAppointmentFromGoogle(eventData, matchedData) {
        try {
            const tenantId = matchedData?.tenant_id || await this.resolveActiveTenantId();
            const resolvedVeterinarioId = matchedData?.veterinario_id
                || await this.resolveFallbackVeterinarioId(tenantId, eventData?.veterinario_nombre);

            if (!resolvedVeterinarioId) {
                return {
                    success: false,
                    error: 'No se pudo asignar veterinario (no hay usuarios activos en el tenant)'
                };
            }

            if (!matchedData?.mascota_id) {
                return {
                    success: false,
                    error: `No se pudo asignar mascota para el evento '${eventData?.titulo || eventData?.google_event_id || 'sin título'}'`
                };
            }

            const safeTipo = this.normalizeAppointmentType(eventData?.tipo);
            const safeEstado = this.normalizeAppointmentStatus(eventData?.estado_vetplus);
            const safeMotivo = this.sanitizeRichTextToPlain(eventData?.motivo || 'Importado desde Google Calendar');
            const safeDescripcion = this.sanitizeRichTextToPlain(eventData?.descripcion || '');

            const notesPrefix = 'Importado desde Google Calendar.';
            const safeNotas = safeDescripcion ? `${notesPrefix} ${safeDescripcion}` : notesPrefix;

            const id_cita = uuidv4();
            const codigo_cita = `GCL-${Date.now().toString().slice(-8)}`;
            const fechaInicioBogota = this.toBogotaDateTime(eventData.fecha_inicio, '08:00:00');
            const fechaFinBogota = this.toBogotaDateTime(eventData.fecha_fin, '09:00:00');

            if (!fechaInicioBogota || !fechaFinBogota) {
                return {
                    success: false,
                    error: 'No se pudo normalizar la fecha/hora del evento de Google'
                };
            }

            const insertQuery = `
                INSERT INTO clinical.calendario_citas (
                    id_cita, codigo_cita, id_mascota, id_veterinario,
                    fecha_inicio, fecha_fin, tipo, estado, motivo, notas,
                    google_event_id, google_sync_status, created_by, id_tenant
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'synced', $12, $13)
                RETURNING *
            `;

            const result = await query(insertQuery, [
                id_cita,
                codigo_cita,
                matchedData.mascota_id,
                resolvedVeterinarioId,
                fechaInicioBogota,
                fechaFinBogota,
                safeTipo,
                safeEstado,
                safeMotivo,
                safeNotas,
                eventData.google_event_id,
                resolvedVeterinarioId,
                tenantId
            ]);

            return {
                success: true,
                data: result.rows[0]
            };

        } catch (error) {
            console.error('Error creando cita desde Google:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar evento creado en Google
     */
    async handleGoogleEventCreated(change, options = {}) {
        try {
            const { createMissingData = false } = options;

            const existing = await query(
                `SELECT id_cita FROM clinical.calendario_citas WHERE google_event_id = $1 AND id_tenant = $2 LIMIT 1`,
                [change.parsed_data.google_event_id, await this.resolveActiveTenantId()]
            );

            if (existing.rows.length > 0) {
                await this.updateAppointmentFromGoogle(existing.rows[0].id_cita, change.parsed_data);
                return {
                    success: true,
                    data: {
                        id_cita: existing.rows[0].id_cita,
                        mode: 'updated_existing'
                    }
                };
            }

            let matchedData = await this.matchClientAndPet(change.parsed_data);

            if (createMissingData && (!matchedData?.cliente_id || !matchedData?.mascota_id)) {
                matchedData = await this.createMissingClientAndPet(change.parsed_data, matchedData);
            }
            
            // El fallback de veterinario se resuelve dentro de createAppointmentFromGoogle.

            const result = await this.createAppointmentFromGoogle(change.parsed_data, matchedData);
            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar evento actualizado en Google
     */
    async handleGoogleEventUpdated(change) {
        try {
            // Buscar la cita existente
            const existingResult = await query(`
                SELECT 
                    cc.id_cita, 
                    cc.estado, 
                    cl.email as cliente_email 
                FROM clinical.calendario_citas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                WHERE cc.google_event_id = $1
                  AND cc.id_tenant = $2
            `, [change.parsed_data.google_event_id, await this.resolveActiveTenantId()]);

            if (existingResult.rows.length === 0) {
                // No existe, crear nueva
                return await this.handleGoogleEventCreated(change, { createMissingData: true });
            }

            const appointment = existingResult.rows[0];
            
            // Si hay cambios en asistentes, procesarlos primero
            if (change.attendee_changes && change.attendee_changes.length > 0) {
                await this.processAttendeeResponses(appointment.id_cita, change.attendee_changes, appointment.cliente_email);
            }

            // Actualizar cita existente con datos del evento
            const result = await this.updateAppointmentFromGoogle(
                appointment.id_cita, 
                change.parsed_data
            );

            return { 
                success: true, 
                data: result,
                change_type: change.change_type,
                attendee_changes_processed: change.attendee_changes?.length || 0
            };

        } catch (error) {
            console.error('Error manejando evento actualizado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manejar respuesta de asistente en Google
     */
    async handleAttendeeResponse(change) {
        try {
            console.log(`👥 Manejando respuesta de asistente para evento: ${change.parsed_data.google_event_id}`);
            
            // Buscar la cita existente
            const existingResult = await query(`
                SELECT 
                    cc.id_cita, 
                    cc.estado, 
                    cl.email as cliente_email 
                FROM clinical.calendario_citas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
                WHERE cc.google_event_id = $1
                  AND cc.id_tenant = $2
            `, [change.parsed_data.google_event_id, await this.resolveActiveTenantId()]);

            if (existingResult.rows.length === 0) {
                console.log(`⚠️ No se encontró cita con google_event_id: ${change.parsed_data.google_event_id}`);
                return { success: false, error: 'Cita no encontrada' };
            }

            const appointment = existingResult.rows[0];
            console.log(`📋 Cita encontrada: ${appointment.id_cita}, cliente: ${appointment.cliente_email}`);
            
            // Procesar las respuestas de asistentes
            if (change.attendee_changes && change.attendee_changes.length > 0) {
                await this.processAttendeeResponses(appointment.id_cita, change.attendee_changes, appointment.cliente_email);
            }

            return { 
                success: true, 
                data: appointment,
                change_type: change.change_type,
                attendee_changes_processed: change.attendee_changes?.length || 0
            };

        } catch (error) {
            console.error('Error manejando respuesta de asistente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Procesar respuestas de asistentes para actualizar estado de cita
     */
    async processAttendeeResponses(id_cita, attendeeChanges, clienteEmail) {
        try {
            console.log(`👥 Procesando respuestas de asistentes para cita ${id_cita}`);
            console.log(`📧 Email del cliente: ${clienteEmail}`);
            console.log(`👥 Cambios de asistentes recibidos:`, JSON.stringify(attendeeChanges, null, 2));
            
            // Obtener datos actuales de la cita
            const appointmentResult = await query(`
                SELECT estado FROM clinical.calendario_citas WHERE id_cita = $1
            `, [id_cita]);

            if (appointmentResult.rows.length === 0) {
                console.log(`❌ No se encontró la cita ${id_cita}`);
                return;
            }

            const appointment = appointmentResult.rows[0];
            console.log(`📋 Estado actual de la cita: ${appointment.estado}`);
            
            // Buscar respuesta del cliente (si corresponde)
            const clienteResponse = attendeeChanges.find(attendee => 
                attendee.email === clienteEmail && !attendee.is_organizer
            );

            if (clienteResponse) {
                console.log(`📧 Respuesta del cliente ${clienteEmail}: ${clienteResponse.response_status}`);
                
                // Mapear respuesta a estado de VetPlus
                let nuevoEstado = null;
                let notas = '';
                
                switch (clienteResponse.response_status) {
                    case 'accepted':
                        // Lógica simplificada: Una vez cancelada, debe contactar para reactivar
                        if (['cancelada', 'no_asistio'].includes(appointment.estado)) {
                            console.log(`🚫 Cita ${id_cita} cancelada - cliente debe contactar para reactivar`);
                            notas = 'Cliente intentó reactivar cita cancelada desde Google Calendar. Debe contactar directamente para reagendar.';
                            
                            // 🎯 NOTIFICAR AL CLIENTE - Forzar declined + agregar comentario
                            await this.notifyClientAboutReactivationDenied(
                                change.parsed_data.google_event_id, 
                                clienteEmail
                            );
                            
                            // No cambiamos el estado - sigue cancelada
                        } else {
                            nuevoEstado = 'confirmada';
                            notas = 'Cliente confirmó asistencia desde Google Calendar';
                        }
                        break;
                    case 'declined':
                        nuevoEstado = 'no_asistio';
                        notas = 'Cliente canceló desde Google Calendar';
                        break;
                    case 'tentative':
                        // Cliente marcó como tentativo - se mantiene confirmada
                        nuevoEstado = 'confirmada';
                        notas = 'Cliente marcó como tentativo desde Google Calendar';
                        break;
                }

                if (nuevoEstado) {
                    console.log(`🔄 Actualizando estado de cita ${id_cita} a: ${nuevoEstado}`);
                    
                    // Verificar si la nota ya existe para evitar duplicados
                    const currentNotesResult = await query(`
                        SELECT notas FROM clinical.calendario_citas WHERE id_cita = $1
                    `, [id_cita]);
                    
                    const currentNotes = currentNotesResult.rows[0]?.notas || '';
                    const shouldAddNote = !currentNotes.includes(notas);
                    
                    let updateQuery;
                    let updateParams;
                    
                    if (shouldAddNote && currentNotes.trim()) {
                        // Agregar nota solo si no existe y hay notas previas
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                notas = $2 || ' | ' || $3,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $4
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, currentNotes, notas, id_cita];
                    } else if (shouldAddNote) {
                        // Primera nota o reemplazar nota vacía
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                notas = $2,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $3
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, notas, id_cita];
                    } else {
                        // Solo actualizar estado sin cambiar notas
                        updateQuery = `
                            UPDATE clinical.calendario_citas 
                            SET 
                                estado = $1,
                                google_sync_status = 'synced',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_cita = $2
                            RETURNING id_cita, estado, notas
                        `;
                        updateParams = [nuevoEstado, id_cita];
                    }
                    
                    const updateResult = await query(updateQuery, updateParams);
                    console.log(`✅ Estado actualizado exitosamente:`, updateResult.rows[0]);
                } else {
                    console.log(`⚠️ Estado no reconocido: ${clienteResponse.response_status}`);
                }
            } else {
                console.log(`⚠️ No se encontró respuesta del cliente ${clienteEmail} en los cambios de asistentes`);
                console.log(`👥 Asistentes disponibles:`, attendeeChanges.map(a => `${a.email} (organizer: ${a.is_organizer})`));
            }

            // Log de todas las respuestas para auditoría
            for (const attendee of attendeeChanges) {
                await query(`
                    INSERT INTO clinical.google_calendar_audit_log 
                    (appointment_id, action_type, details, created_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                `, [
                    id_cita,
                    'attendee_response',
                    JSON.stringify({
                        email: attendee.email,
                        response: attendee.response_status,
                        display_name: attendee.display_name,
                        is_organizer: attendee.is_organizer
                    })
                ]);
            }

        } catch (error) {
            console.error('Error procesando respuestas de asistentes:', error);
            throw error;
        }
    }

    /**
     * Manejar evento eliminado en Google
     */
    async handleGoogleEventDeleted(change) {
        try {
            const tenantId = await this.resolveActiveTenantId();
            const result = await query(`
                UPDATE clinical.calendario_citas 
                SET 
                    estado = 'no_asistio',
                    google_sync_status = 'synced',
                    notas = COALESCE(notas, '') || ' | Cancelada desde Google Calendar',
                    updated_at = CURRENT_TIMESTAMP
                WHERE google_event_id = $1
                  AND id_tenant = $2
                RETURNING id_cita, codigo_cita
            `, [change.parsed_data.google_event_id, tenantId]);

            return {
                success: true,
                data: result.rows[0] || null
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualizar cita desde Google
     */
    async updateAppointmentFromGoogle(id_cita, eventData) {
        const safeTipo = this.normalizeAppointmentType(eventData?.tipo);
        const safeMotivo = this.sanitizeRichTextToPlain(eventData?.motivo || 'Importado desde Google Calendar');
        const fechaInicioBogota = this.toBogotaDateTime(eventData?.fecha_inicio, '08:00:00');
        const fechaFinBogota = this.toBogotaDateTime(eventData?.fecha_fin, '09:00:00');

        if (!fechaInicioBogota || !fechaFinBogota) {
            throw new Error('No se pudo normalizar fecha/hora para actualizar cita desde Google');
        }
        const updateQuery = `
            UPDATE clinical.calendario_citas 
            SET 
                fecha_inicio = $1,
                fecha_fin = $2,
                tipo = $3,
                motivo = $4,
                google_sync_status = 'synced',
                last_google_sync = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_cita = $5
            RETURNING *
        `;

        const result = await query(updateQuery, [
            fechaInicioBogota,
            fechaFinBogota,
            safeTipo,
            safeMotivo,
            id_cita
        ]);

        return result.rows[0];
    }

    /**
     * Verificar si una cita necesita actualización
     */
    async needsUpdate(id_cita, eventData) {
        const currentResult = await query(`
            SELECT fecha_inicio, fecha_fin, tipo, motivo 
            FROM clinical.calendario_citas 
            WHERE id_cita = $1
        `, [id_cita]);

        if (currentResult.rows.length === 0) return false;

        const current = currentResult.rows[0];
        const fechaInicioBogota = this.toBogotaDateTime(eventData?.fecha_inicio, '08:00:00');
        const fechaFinBogota = this.toBogotaDateTime(eventData?.fecha_fin, '09:00:00');
        const currentInicioBogota = this.toBogotaDateTime(current?.fecha_inicio, '08:00:00');
        const currentFinBogota = this.toBogotaDateTime(current?.fecha_fin, '09:00:00');
        const safeTipo = this.normalizeAppointmentType(eventData?.tipo);
        const safeMotivo = this.sanitizeRichTextToPlain(eventData?.motivo || 'Importado desde Google Calendar');
        
        return (
            currentInicioBogota !== fechaInicioBogota ||
            currentFinBogota !== fechaFinBogota ||
            current.tipo !== safeTipo ||
            current.motivo !== safeMotivo
        );
    }

    /**
     * Actualizar marca de tiempo de última sincronización
     */
    async updateLastSyncTime(syncType) {
        await query(`
            UPDATE vetplus_auth.google_calendar_config 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE is_active = true
        `);
    }

    /**
     * Notificar al cliente que no puede reactivar una cita cancelada
     */
    async notifyClientAboutReactivationDenied(googleEventId, clienteEmail) {
        try {
            console.log(`📞 Notificando al cliente ${clienteEmail} que no puede reactivar la cita`);
            
            // Obtener información de contacto de la clínica
            const clinicInfo = await query(`
                SELECT telefono, direccion, nombre_empresa 
                FROM system.configuracion_empresa 
                WHERE activa = true 
                LIMIT 1
            `);
            
            const telefono = clinicInfo.rows[0]?.telefono || 'contacte la clínica';
            const nombreClinica = clinicInfo.rows[0]?.nombre_empresa || 'VetPlus';
            
            // Mensaje para agregar al evento
            const mensaje = `CITA CANCELADA PREVIAMENTE\n\n` +
                          `Esta cita fue cancelada y no puede reactivarse automáticamente.\n\n` +
                          `Para reagendar, contacte directamente:\n` +
                          `📞 ${telefono}\n` +
                          `🏥 ${nombreClinica}\n\n` +
                          `Gracias por su comprensión.`;

            // 1. Forzar estado "declined" para el cliente
            const statusResult = await googleCalendarService.updateAttendeeStatus(
                googleEventId, 
                clienteEmail, 
                'declined'
            );

            if (statusResult.success) {
                console.log(`✅ Estado de asistente forzado a 'declined' para ${clienteEmail}`);
            } else {
                console.log(`⚠️ No se pudo actualizar estado de asistente: ${statusResult.error}`);
            }

            // 2. Agregar comentario explicativo al evento
            const commentResult = await googleCalendarService.addCommentToEvent(
                googleEventId,
                mensaje
            );

            if (commentResult.success) {
                console.log(`✅ Comentario explicativo agregado al evento ${googleEventId}`);
            } else {
                console.log(`⚠️ No se pudo agregar comentario: ${commentResult.error}`);
            }

            return {
                success: true,
                message: 'Cliente notificado sobre restricción de reactivación'
            };

        } catch (error) {
            console.error('Error notificando al cliente sobre reactivación denegada:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new BidirectionalSyncService();