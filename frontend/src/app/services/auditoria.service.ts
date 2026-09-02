import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ===============================
// INTERFACES
// ===============================

export interface ActivityLog {
  id_log: string;
  tipo_actividad: string;
  descripcion: string;
  url: string;
  metodo_http: string;
  status_code: number;
  duracion_ms: number;
  ip_address: string;
  timestamp: string;
  usuario_email: string;
  usuario_rol: string;
  usuario_nombre: string;
  resultado: 'SUCCESS' | 'ERROR' | 'REDIRECT' | 'UNKNOWN';
  id_entidad_afectada?: string;
  // Guardados por el middleware de auditoría; forma libre según la ruta.
  // request_data.entity_context.before es el snapshot previo al cambio
  // (solo para PUT/PATCH/DELETE en clientes/mascotas/historias/citas).
  request_data?: {
    body?: Record<string, any>;
    query?: Record<string, any>;
    entity_context?: {
      entity?: string;
      name?: string;
      before?: Record<string, any>;
      meta?: Record<string, any>;
    } | null;
  } | null;
  response_data?: Record<string, any> | null;
}

export interface SessionLog {
  id_session: string;
  id_usuario: string;
  tipo_evento: string;
  exito: boolean;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  usuario_email?: string;
  usuario_nombre?: string;
}

export interface AuditStats {
  // Campos de generate_audit_report
  total_activities: number;
  successful_activities: number;
  failed_activities: number;
  login_attempts: number;
  successful_logins: number;
  medical_accesses: number;
  // Campos de additionalStats
  usuarios_activos: number;
  ips_unicas: number;
  actividad_mas_frecuente: string;
  actividades_sospechosas: number;
}

export interface ActivityFilters {
  usuario_id?: string;
  tipo_actividad?: string;
  resultado?: string;       // SUCCESS | ERROR
  usuario_email?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  limit?: number;
  offset?: number;
}

export interface SessionFilters {
  usuario_id?: string;
  usuario_email?: string;
  tipo_evento?: string;   // LOGIN | LOGOUT
  exito?: string;         // 'true' | 'false'
  fecha_inicio?: string;
  fecha_fin?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    currentPage: number;
    limit: number;
    offset: number;
    total: number;
    pages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit`;

  getActivities(filters: ActivityFilters = {}): Observable<PaginatedResponse<ActivityLog>> {
    let params = new HttpParams();
    if (filters.usuario_id)     params = params.set('usuario_id', filters.usuario_id);
    if (filters.tipo_actividad) params = params.set('tipo_actividad', filters.tipo_actividad);
    if (filters.resultado)      params = params.set('resultado', filters.resultado);
    if (filters.usuario_email)  params = params.set('usuario_email', filters.usuario_email);
    if (filters.fecha_inicio)   params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin)      params = params.set('fecha_fin', filters.fecha_fin);
    if (filters.limit)          params = params.set('limit', filters.limit.toString());
    if (filters.offset !== undefined) params = params.set('offset', filters.offset.toString());
    return this.http.get<PaginatedResponse<ActivityLog>>(`${this.apiUrl}/activities`, { params });
  }

  getSessions(filters: SessionFilters = {}): Observable<PaginatedResponse<SessionLog>> {
    let params = new HttpParams();
    if (filters.usuario_id)    params = params.set('usuario_id', filters.usuario_id);
    if (filters.usuario_email) params = params.set('usuario_email', filters.usuario_email);
    if (filters.tipo_evento)   params = params.set('tipo_evento', filters.tipo_evento);
    if (filters.exito !== undefined && filters.exito !== '') params = params.set('exito', filters.exito);
    if (filters.fecha_inicio)  params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin)     params = params.set('fecha_fin', filters.fecha_fin);
    if (filters.limit)         params = params.set('limit', filters.limit.toString());
    if (filters.offset !== undefined) params = params.set('offset', filters.offset.toString());
    return this.http.get<PaginatedResponse<SessionLog>>(`${this.apiUrl}/sessions`, { params });
  }

  getStats(startDate?: string, endDate?: string): Observable<{ success: boolean; data: AuditStats }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate)   params = params.set('end_date', endDate);
    return this.http.get<{ success: boolean; data: AuditStats }>(`${this.apiUrl}/stats`, { params });
  }

  getSuspicious(limit = 100): Observable<{ success: boolean; data: ActivityLog[]; count: number }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{ success: boolean; data: ActivityLog[]; count: number }>(`${this.apiUrl}/suspicious`, { params });
  }
}
