import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GoogleCalendarConfig {
  id_config?: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  calendar_id: string;
  timezone: string;
  notification_email: boolean;
  notification_popup: boolean;
  default_reminder_minutes: number;
  email_reminder_hours: number;
  is_active: boolean;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  calendar_name?: string;
  last_sync?: string;
  sync_status: 'success' | 'error' | 'pending' | 'never';
  error_message?: string;
  has_refresh_token: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private readonly API_URL = `${environment.apiUrl}/google-calendar`;

  constructor(private http: HttpClient) {}

  // Obtener configuración actual
  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/config`);
  }

  // Guardar configuración
  saveConfig(config: Partial<GoogleCalendarConfig>): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/config`, config);
  }

  // Obtener estado de la conexión
  getStatus(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/status`);
  }

  // Obtener URL de autorización
  getAuthUrl(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/auth-url`);
  }

  // Probar conexión
  testConnection(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/test`, {});
  }

  // Forzar sincronización
  forceSync(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/force-sync`, {});
  }

  // Desconectar/revocar acceso
  disconnect(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/disconnect`, {});
  }

  // Obtener lista de calendarios disponibles
  getCalendarList(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/calendars`);
  }
}