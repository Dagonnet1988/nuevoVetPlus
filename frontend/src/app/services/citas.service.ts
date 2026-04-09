import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Cita,
  CitaFormData,
  CitaFilter,
  CitaStats,
  VeterinarioDisponibilidad,
  SugerenciaHorario,
  CalendarView
} from '../models/cita.interface';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private readonly API_URL = `${environment.apiUrl}/clinical`;

  constructor(private http: HttpClient) {}

  // ===============================
  // OPERACIONES BÁSICAS DE CITAS
  // ===============================

  getCitas(page: number = 1, limit: number = 10, filters?: CitaFilter): Observable<any> {
    const offset = (page - 1) * limit;
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (filters) {
      if (filters.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
      if (filters.id_veterinario) params = params.set('id_veterinario', filters.id_veterinario);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.tipo) params = params.set('tipo', filters.tipo);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<any>(`${this.API_URL}/appointments`, { params });
  }

  getCitaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/appointments/${id}`);
  }

  createCita(cita: CitaFormData): Observable<any> {
    // Transformar los datos para que sean compatibles con el backend
    const citaTransformada = this.transformarCitaParaBackend(cita);
    return this.http.post<any>(`${this.API_URL}/appointments`, citaTransformada);
  }

  updateCita(id: string, cita: Partial<CitaFormData>): Observable<any> {
    // Transformar los datos para que sean compatibles con el backend
    const citaTransformada = this.transformarCitaParaBackend(cita);
    return this.http.put<any>(`${this.API_URL}/appointments/${id}`, citaTransformada);
  }

  updateEstadoCita(id: string, estado: string, observaciones?: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/appointments/${id}/status`, {
      estado,
      observaciones
    });
  }

  cancelCita(id: string, motivo?: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/appointments/${id}`, {
      body: { motivo_cancelacion: motivo }
    });
  }

  // ===============================
  // VISTA DE CALENDARIO
  // ===============================

  getCalendarView(vista: CalendarView, filters?: CitaFilter): Observable<any> {
    let params = new HttpParams()
      .set('vista', vista.vista)
      .set('fecha', vista.fecha);

    console.log('🔍 [CALENDAR SERVICE] Vista:', vista, 'Filtros:', filters);

    // Agregar filtros si se proporcionan
    if (filters) {
      if (filters.id_veterinario) {
        console.log('🔍 [CALENDAR SERVICE] Agregando filtro veterinario:', filters.id_veterinario);
        params = params.set('id_veterinario', filters.id_veterinario);
      }
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.tipo) params = params.set('tipo', filters.tipo);
      if (filters.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
      if (filters.search) params = params.set('search', filters.search);
    }

    console.log('🔍 [CALENDAR SERVICE] URL final:', `${this.API_URL}/appointments/calendar?${params.toString()}`);

    return this.http.get<any>(`${this.API_URL}/appointments/calendar`, { params });
  }

  getCitasByVeterinario(vetId: string, fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams().set('id_veterinario', vetId);

    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);

    return this.http.get<any>(`${this.API_URL}/appointments/vet/${vetId}`, { params });
  }

  getCitasByPaciente(petId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/appointments/pet/${petId}`);
  }

  // ===============================
  // DISPONIBILIDAD Y HORARIOS
  // ===============================

  getVeterinarioDisponibilidad(vetId: string, fecha: string): Observable<VeterinarioDisponibilidad> {
    const params = new HttpParams()
      .set('fecha', fecha);

    return this.http.get<VeterinarioDisponibilidad>(
      `${this.API_URL}/appointments/vet/${vetId}/availability`,
      { params }
    );
  }

  getSugerenciasHorario(
    id_veterinario: string,
    fecha_preferida: string,
    duracion_minutos: number = 30
  ): Observable<SugerenciaHorario[]> {
    const params = new HttpParams()
      .set('fecha_base', fecha_preferida)
      .set('duracion', duracion_minutos.toString());

    return this.http.get<SugerenciaHorario[]>(
      `${this.API_URL}/appointments/vet/${id_veterinario}/suggest-slots`,
      { params }
    );
  }

  // ===============================
  // GOOGLE CALENDAR SYNC
  // ===============================

  syncWithGoogleCalendar(citaId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/appointments/${citaId}/sync-google`, {});
  }

  forceSyncAllPending(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/appointments/force-sync-google`, {});
  }

  // ===============================
  // SINCRONIZACIÓN BIDIRECCIONAL
  // ===============================

  importFromGoogleCalendar(fechaInicio: string, fechaFin: string, options: {
    autoMatch?: boolean;
    createMissingData?: boolean;
    dryRun?: boolean;
  } = {}): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/google-calendar/import`, {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      auto_match: options.autoMatch ?? true,
      create_missing_data: options.createMissingData ?? false,
      dry_run: options.dryRun ?? false
    });
  }

  syncChangesFromGoogle(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/google-calendar/sync-changes`, {});
  }

  getSyncStatus(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/google-calendar/sync-status`);
  }

  // ===============================
  // ESTADÍSTICAS
  // ===============================

  getCitaStats(fechaInicio?: string, fechaFin?: string): Observable<CitaStats> {
    let params = new HttpParams();

    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);

    return this.http.get<any>(`${this.API_URL}/appointments/stats`, { params }).pipe(
      map(response => response.data || response)
    );
  }

  // ===============================
  // UTILIDADES
  // ===============================

  getVeterinarios(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/veterinarians`).pipe(
      map((response: any) => {
        if (response && response.success && response.data) {
          return response;
        }
        return { success: false, data: [], message: 'No se pudieron cargar los veterinarios' };
      }),
      catchError((error) => {
        console.error('Error obteniendo veterinarios:', error);
        return of({ success: false, data: [], message: 'Error conectando con el servidor' });
      })
    );
  }

  // Funciones helper para el calendario
  formatearFechaParaBackend(fecha: Date): string {
    // NUEVA ESTRATEGIA: Enviar fechas como hora local de Colombia (sin zona horaria)
    // El backend las interpretará directamente como Colombia

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    const seconds = String(fecha.getSeconds()).padStart(2, '0');

    // Formato simple: YYYY-MM-DDTHH:MM:SS (sin zona horaria)
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  calcularDuracionCita(tipo: string): number {
    const duraciones: { [key: string]: number } = {
      'consulta_general': 30,
      'vacunacion': 15,
      'cirugia': 120,
      'control': 20,
      'emergencia': 45,
      'revision': 25,
      'desparasitacion': 15,
      'estetica': 60,
      'otro': 30
    };

    return duraciones[tipo] || 30;
  }

  obtenerColorPorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'consulta_general': '#2196f3',
      'vacunacion': '#4caf50',
      'cirugia': '#f44336',
      'control': '#ff9800',
      'emergencia': '#e91e63',
      'revision': '#9c27b0',
      'desparasitacion': '#00bcd4',
      'estetica': '#cddc39',
      'otro': '#607d8b'
    };

    return colores[tipo] || '#607d8b';
  }

  obtenerColorPorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#ff9800',
      'confirmada': '#2196f3',
      'en_curso': '#9c27b0',
      'completada': '#4caf50',
      'cancelada': '#607d8b',
      'no_asistio': '#f44336'
    };

    return colores[estado] || '#607d8b';
  }

  obtenerColorPorVeterinario(veterinarioId: string): string {
    // Paleta de colores distintiva para veterinarios
    const colores = [
      '#1976d2', // Azul médico
      '#388e3c', // Verde salud
      '#7b1fa2', // Púrpura profesional
      '#e64a19', // Naranja vibrante
      '#5d4037', // Marrón tierra
      '#00796b', // Verde azulado
      '#303f9f', // Azul índigo
      '#c2185b', // Rosa médico
      '#f57c00', // Ámbar
      '#455a64'  // Azul gris
    ];

    // Generar índice basado en el ID del veterinario
    let hash = 0;
    for (let i = 0; i < veterinarioId.length; i++) {
      hash = veterinarioId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colores[Math.abs(hash) % colores.length];
  }

  obtenerColorSecundarioPorVeterinario(veterinarioId: string): string {
    // Color más claro para el borde o acentos
    const colorPrimario = this.obtenerColorPorVeterinario(veterinarioId);

    // Crear versión más clara del color
    const colorMasPalido: { [key: string]: string } = {
      '#1976d2': '#42a5f5',
      '#388e3c': '#66bb6a',
      '#7b1fa2': '#ab47bc',
      '#e64a19': '#ff7043',
      '#5d4037': '#8d6e63',
      '#00796b': '#4db6ac',
      '#303f9f': '#5c6bc0',
      '#c2185b': '#e91e63',
      '#f57c00': '#ffb74d',
      '#455a64': '#78909c'
    };

    return colorMasPalido[colorPrimario] || '#90a4ae';
  }

  // ===============================
  // TRANSFORMACIONES
  // ===============================

  private transformarCitaParaBackend(cita: Partial<CitaFormData> & { estado?: string }): any {
    const citaTransformada: any = { ...cita };

    // Mapear tipos del frontend a tipos del backend
    const mapeoTipos: { [key: string]: string } = {
      'consulta_general': 'consulta_general',  // Mantener igual por compatibilidad
      'vacunacion': 'vacunacion',
      'cirugia': 'cirugia',
      'control': 'control',
      'emergencia': 'emergencia',
      'revision': 'revision',
      'desparasitacion': 'desparasitacion',
      'estetica': 'estetica',
      'otro': 'otro'
    };

    // Mapear estados del frontend a estados del backend
    const mapeoEstados: { [key: string]: string } = {
      'pendiente': 'pendiente',
      'confirmada': 'confirmada',
      'en_curso': 'en_curso',
      'en_progreso': 'en_curso',   // alias incorrecto anterior → corregido
      'completada': 'completada',
      'cancelada': 'cancelada',
      'no_asistio': 'no_asistio'
    };

    if (cita.tipo) {
      citaTransformada.tipo = mapeoTipos[cita.tipo] || cita.tipo;
    }

    // Para crear citas, agregar estado por defecto si no viene
    if ('estado' in cita && cita.estado) {
      citaTransformada.estado = mapeoEstados[cita.estado] || cita.estado;
    }

    // Transformar fechas a formato ISO 8601 que espera el backend
    if (cita.fecha_inicio) {
      citaTransformada.fecha_inicio = this.convertirAISO8601(cita.fecha_inicio);
    }

    if (cita.fecha_fin) {
      citaTransformada.fecha_fin = this.convertirAISO8601(cita.fecha_fin);
    }

    return citaTransformada;
  }

  private convertirAISO8601(fecha: string): string {
    // NUEVA ESTRATEGIA: No agregar zona horaria, mantener como Colombia local

    // Si ya está en formato ISO, remover zona horaria para mantener como local
    if (fecha.includes('T') && (fecha.includes('Z') || fecha.includes('+') || fecha.includes('-'))) {
      return fecha.split('T')[0] + 'T' + fecha.split('T')[1].split(/[Z\+\-]/)[0];
    }

    // Si ya tiene T, devolverla tal como está
    if (fecha.includes('T')) {
      return fecha;
    }

    // Convertir formato con espacio a formato ISO (sin zona horaria)
    if (fecha.includes(' ')) {
      // "2025-08-12 17:00:00" -> "2025-08-12T17:00:00"
      return fecha.replace(' ', 'T');
    } else {
      // "2025-08-12" -> "2025-08-12T00:00:00"
      return fecha + 'T00:00:00';
    }
  }
}
