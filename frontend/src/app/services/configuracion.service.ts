import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===============================
// INTERFACES DE CONFIGURACIÓN
// ===============================

export interface EmpresaConfig {
  id?: string;
  nombre_empresa: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  sitio_web?: string;
  logo_url?: string;
  eslogan?: string;

  // Horarios de atención
  horarios: HorarioAtencion[];

  // Configuración de numeración
  configuracion_numeracion: {
    cita_prefijo: string;
    cita_siguiente: number;
    cita_digitos: number;
  };

  // Configuración general
  configuracion_general: {
    moneda: string;
    zona_horaria: string;
    idioma: string;
    formato_fecha: string;
    formato_hora: string;
  };

  created_at?: string;
  updated_at?: string;
}

export interface HorarioAtencion {
  dia_semana: number; // 0 = Domingo, 1 = Lunes, etc.
  activo: boolean;
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  hora_almuerzo_inicio?: string;
  hora_almuerzo_fin?: string;
}

export interface DiaEspecial {
  id?: string;
  fecha: string;
  descripcion: string;
  tipo: 'festivo' | 'no_laborable' | 'horario_especial';
  horario_especial?: {
    hora_inicio: string;
    hora_fin: string;
  };
  activo: boolean;
}

// ===============================
// GOOGLE CALENDAR INTERFACES
// ===============================

export interface GoogleCalendarConfig {
  id?: string;
  activo: boolean;
  cliente_id: string;
  cliente_secret: string;
  calendar_id: string;
  sync_automatico: boolean;
  intervalo_sync: number; // minutos
  prefijo_eventos: string;
  mapeo_colores: {
    consulta: string;
    cirugia: string;
    vacunacion: string;
    control: string;
  };
  configuracion_eventos: {
    duracion_default: number; // minutos
    recordatorio_default: number; // minutos antes
    incluir_cliente: boolean;
    incluir_mascota: boolean;
    incluir_veterinario: boolean;
  };
  ultima_sincronizacion?: string;
  estado_oauth?: 'pendiente' | 'autorizado' | 'error';
}

export interface GoogleCalendarStatus {
  conectado: boolean;
  ultimo_sync: string;
  eventos_sincronizados: number;
  errores_recientes: string[];
  calendario_info: {
    nombre: string;
    descripcion: string;
    zona_horaria: string;
  };
}

export interface SyncStats {
  total_eventos: number;
  eventos_creados: number;
  eventos_actualizados: number;
  eventos_eliminados: number;
  conflictos_resueltos: number;
  errores: number;
  ultima_ejecucion: string;
  proxima_ejecucion: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private readonly API_URL = environment.apiUrl;

  // Signals para estado reactivo
  public empresaConfig = signal<EmpresaConfig | null>(null);
  public googleCalendarConfig = signal<GoogleCalendarConfig | null>(null);
  public loading = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadConfigurations();
  }

  // ===============================
  // CONFIGURACIÓN DE EMPRESA
  // ===============================

  getEmpresaConfig(): Observable<EmpresaConfig> {
    return this.http.get<any>(`${this.API_URL}/admin/empresa/config`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          this.empresaConfig.set(response.data);
          return response.data;
        }
        throw new Error('Error obteniendo configuración de empresa');
      })
    );
  }

  updateEmpresaConfig(config: EmpresaConfig): Observable<EmpresaConfig> {
    return this.http.put<any>(`${this.API_URL}/admin/empresa/config`, config).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          this.empresaConfig.set(response.data);
          return response.data;
        }
        throw new Error('Error actualizando configuración de empresa');
      })
    );
  }

  uploadLogo(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('logo', file);

    return this.http.post<any>(`${this.API_URL}/admin/empresa/logo`, formData).pipe(
      map((response: any) => {
        if (response.success && response.data?.logo_url) {
          // Actualizar la configuración local
          const currentConfig = this.empresaConfig();
          if (currentConfig) {
            this.empresaConfig.set({
              ...currentConfig,
              logo_url: response.data.logo_url
            });
          }
          return response.data.logo_url;
        }
        throw new Error(response.message || 'Error subiendo logo');
      })
    );
  }

  getDiasEspeciales(): Observable<DiaEspecial[]> {
    return this.http.get<any>(`${this.API_URL}/admin/empresa/dias-especiales`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  addDiaEspecial(dia: DiaEspecial): Observable<DiaEspecial> {
    return this.http.post<any>(`${this.API_URL}/admin/empresa/dias-especiales`, dia).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error agregando día especial');
      })
    );
  }

  // ===============================
  // GOOGLE CALENDAR
  // ===============================

  getGoogleCalendarConfig(): Observable<GoogleCalendarConfig> {
    return this.http.get<any>(`${this.API_URL}/google-calendar/simple/config`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Transformar respuesta del backend simple al formato del frontend
          const config: GoogleCalendarConfig = {
            id: response.data.id_config,
            activo: response.data.activo,
            cliente_id: response.data.cliente_id,
            cliente_secret: response.data.cliente_secret,
            calendar_id: response.data.calendar_id,
            sync_automatico: response.data.sync_automatico,
            intervalo_sync: 30, // valor por defecto
            prefijo_eventos: 'VetPlus', // valor por defecto
            mapeo_colores: {
              consulta: '#2196f3',
              cirugia: '#f44336',
              vacunacion: '#4caf50',
              control: '#ff9800'
            },
            configuracion_eventos: {
              duracion_default: 30,
              recordatorio_default: 30,
              incluir_cliente: true,
              incluir_mascota: true,
              incluir_veterinario: true
            }
          };
          this.googleCalendarConfig.set(config);
          return config;
        }
        // Si no hay configuración, devolver configuración por defecto
        const defaultConfig: GoogleCalendarConfig = {
          activo: false,
          cliente_id: '',
          cliente_secret: '',
          calendar_id: 'primary',
          sync_automatico: true,
          intervalo_sync: 30,
          prefijo_eventos: 'VetPlus',
          mapeo_colores: {
            consulta: '#2196f3',
            cirugia: '#f44336',
            vacunacion: '#4caf50',
            control: '#ff9800'
          },
          configuracion_eventos: {
            duracion_default: 30,
            recordatorio_default: 30,
            incluir_cliente: true,
            incluir_mascota: true,
            incluir_veterinario: true
          }
        };
        this.googleCalendarConfig.set(defaultConfig);
        return defaultConfig;
      }),
      catchError((error) => {
        console.warn('Error obteniendo configuración de Google Calendar, usando configuración por defecto:', error);
        // Si hay error, devolver configuración por defecto
        const defaultConfig: GoogleCalendarConfig = {
          activo: false,
          cliente_id: '',
          cliente_secret: '',
          calendar_id: 'primary',
          sync_automatico: true,
          intervalo_sync: 30,
          prefijo_eventos: 'VetPlus',
          mapeo_colores: {
            consulta: '#2196f3',
            cirugia: '#f44336',
            vacunacion: '#4caf50',
            control: '#ff9800'
          },
          configuracion_eventos: {
            duracion_default: 30,
            recordatorio_default: 30,
            incluir_cliente: true,
            incluir_mascota: true,
            incluir_veterinario: true
          }
        };
        this.googleCalendarConfig.set(defaultConfig);
        return of(defaultConfig);
      })
    );
  }

  updateGoogleCalendarConfig(config: GoogleCalendarConfig): Observable<GoogleCalendarConfig> {
    // Transformar los datos al formato que espera el backend simple
    const backendConfig = {
      activo: config.activo,
      cliente_id: config.cliente_id,
      cliente_secret: config.cliente_secret,
      calendar_id: config.calendar_id || 'primary',
      sync_automatico: config.sync_automatico,
      prefijo_eventos: config.prefijo_eventos || 'VetPlus'
    };

    return this.http.post<any>(`${this.API_URL}/google-calendar/simple/configure`, backendConfig).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Transformar respuesta del backend al formato del frontend
          const frontendConfig: GoogleCalendarConfig = {
            id: response.data.id_config,
            activo: response.data.activo,
            cliente_id: response.data.cliente_id,
            cliente_secret: response.data.cliente_secret,
            calendar_id: response.data.calendar_id,
            sync_automatico: response.data.sync_automatico,
            intervalo_sync: 30,
            prefijo_eventos: response.data.prefijo_eventos || 'VetPlus',
            mapeo_colores: {
              consulta: '#2196f3',
              cirugia: '#f44336',
              vacunacion: '#4caf50',
              control: '#ff9800'
            },
            configuracion_eventos: {
              duracion_default: 30,
              recordatorio_default: 30,
              incluir_cliente: true,
              incluir_mascota: true,
              incluir_veterinario: true
            }
          };
          this.googleCalendarConfig.set(frontendConfig);
          return frontendConfig;
        }
        throw new Error('Error actualizando configuración de Google Calendar');
      })
    );
  }

  getGoogleOAuthUrl(): Observable<string> {
    return this.http.get<any>(`${this.API_URL}/google-calendar/simple/auth-url`).pipe(
      map((response: any) => {
        if (response.success && response.authUrl) {
          return response.authUrl;
        }
        throw new Error('Error obteniendo URL de OAuth');
      })
    );
  }

  getGoogleCalendarStatus(): Observable<GoogleCalendarStatus> {
    return this.http.get<any>(`${this.API_URL}/google-calendar/simple/status`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Transformar respuesta del backend al formato esperado por el frontend
          const data = response.data;
          return {
            conectado: data.conectado,
            ultimo_sync: data.ultimo_sync,
            eventos_sincronizados: data.eventos_sincronizados || 0,
            errores_recientes: data.errores_recientes || [],
            calendario_info: data.calendario_info || {
              nombre: 'No configurado',
              descripcion: 'No hay configuración',
              zona_horaria: 'UTC'
            }
          };
        }
        throw new Error('Error obteniendo estado de Google Calendar');
      })
    );
  }

  saveGoogleCalendarConfig(config: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/google-calendar/configure`, config);
  }

  testGoogleCalendarConnection(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/google-calendar/simple/test-connection`, {});
  }

  disableGoogleCalendar(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/google-calendar/simple/disable`, {});
  }

  syncGoogleCalendar(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/google-calendar/sync-changes`, {});
  }

  toggleScheduler(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/google-calendar/scheduler/status`);
  }

  getSchedulerStats(): Observable<SyncStats> {
    return this.http.get<any>(`${this.API_URL}/google-calendar/scheduler/stats`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo estadísticas del scheduler');
      })
    );
  }

  // ===============================
  // ESTADO DEL SISTEMA
  // ===============================

  getSystemStatus(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/system/status`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo estado del sistema');
      })
    );
  }

  getConfigSummary(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/system/config-summary`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo resumen de configuraciones');
      })
    );
  }

  // ===============================
  // UTILIDADES
  // ===============================

  private loadConfigurations(): void {
    // Cargar configuraciones básicas al inicializar el servicio
    this.getEmpresaConfig().subscribe({
      next: () => {},
      error: (error) => console.warn('No se pudo cargar configuración de empresa:', error)
    });
  }

  // Validar configuración de empresa
  validateEmpresaConfig(config: EmpresaConfig): string[] {
    const errors: string[] = [];

    if (!config.nombre_empresa?.trim()) errors.push('El nombre de la empresa es requerido');
    if (!config.nit?.trim()) errors.push('El NIT es requerido');
    if (!config.direccion?.trim()) errors.push('La dirección es requerida');
    if (!config.telefono?.trim()) errors.push('El teléfono es requerido');
    if (!config.email?.trim()) errors.push('El email es requerido');

    if (config.email && !this.isValidEmail(config.email)) {
      errors.push('El email no tiene un formato válido');
    }

    return errors;
  }

  // Validar horarios de atención
  validateHorarios(horarios: HorarioAtencion[]): string[] {
    const errors: string[] = [];

    horarios.forEach((horario, index) => {
      if (horario.activo) {
        if (!horario.hora_inicio) {
          errors.push(`Día ${index + 1}: Hora de inicio es requerida`);
        }
        if (!horario.hora_fin) {
          errors.push(`Día ${index + 1}: Hora de fin es requerida`);
        }
        if (horario.hora_inicio >= horario.hora_fin) {
          errors.push(`Día ${index + 1}: La hora de fin debe ser posterior a la hora de inicio`);
        }
      }
    });

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generar horarios por defecto
  generateDefaultHorarios(): HorarioAtencion[] {
    return Array.from({ length: 7 }, (_, index) => ({
      dia_semana: index,
      activo: index >= 1 && index <= 5, // Lunes a Viernes activos por defecto
      hora_inicio: '08:00',
      hora_fin: '17:00',
      hora_almuerzo_inicio: '12:00',
      hora_almuerzo_fin: '13:00'
    }));
  }

  // Obtener nombre del día
  getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex] || '';
  }

  // ===============================
  // TEXTO DE CONSENTIMIENTO
  // ===============================

  getTextoConsentimiento(): Observable<{ version: { id_version: number; titulo: string; texto_legal: string; activa: boolean; created_at: string } }> {
    return this.http.get<any>(`${this.API_URL}/config/consentimiento/texto`);
  }

  updateTextoConsentimiento(titulo: string, textoLegal: string): Observable<{ message: string; version: any }> {
    return this.http.put<any>(`${this.API_URL}/config/consentimiento/texto`, { titulo, textoLegal });
  }
}
