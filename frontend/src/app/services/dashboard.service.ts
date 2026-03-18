import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  pacientes: {
    total: number;
    nuevos_mes: number;
    activos: number;
  };
  citas: {
    hoy: number;
    semana: number;
    pendientes: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: any[];
}

export interface RecentActivity {
  id: string;
  tipo: 'cita' | 'paciente';
  descripcion: string;
  fecha: string;
  usuario: string;
  icono: string;
  color: string;
}

export interface Notification {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly API_URL = environment.apiUrl;

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Las notificaciones ahora se cargan desde el backend cuando sea necesario
  }

  // Estadísticas generales del dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      pacientes: this.http.get<any>(`${this.API_URL}/clinical/pacientes/stats`),
      citas: this.http.get<any>(`${this.API_URL}/clinical/appointments/stats`)
    }).pipe(
      map(({ pacientes, citas }) => {
        if (pacientes.success && pacientes.data && citas.success && citas.data) {
          return this.mapBackendStatsToFrontend(pacientes.data, citas.data);
        }
        throw new Error('Error obteniendo estadísticas del dashboard');
      }),
      catchError(() => of(this.getDefaultStats()))
    );
  }

  // Datos para gráfico de citas por estado - obtener estados reales
  getCitasPorEstado(): Observable<ChartData> {
    return this.http.get<any>(`${this.API_URL}/clinical/appointments/stats`).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.estados) {
          const estados = response.data.estados;
          return {
            labels: estados.map((e: any) => this.formatEstadoCita(e.estado)),
            datasets: [{
              data: estados.map((e: any) => e.cantidad),
              backgroundColor: estados.map((e: any) => this.getColorEstado(e.estado))
            }]
          };
        }
        return {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e0e0e0']
          }]
        };
      }),
      catchError(() => new Observable<ChartData>(observer => {
        observer.next({
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e0e0e0']
          }]
        });
        observer.complete();
      }))
    );
  }


  // Actividad reciente - usar próximas citas como actividad
  getRecentActivity(limit: number = 10): Observable<RecentActivity[]> {
    return this.http.get<any>(`${this.API_URL}/clinical/appointments`, {
      params: { limit: limit.toString(), status: 'confirmada' }
    }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return this.mapCitasToActivity(response.data);
        }
        return [];
      }),
      catchError(() => new Observable<RecentActivity[]>(observer => {
        observer.next([]);
        observer.complete();
      }))
    );
  }

  // Próximas citas
  getProximasCitas(limit: number = 5): Observable<any[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<any>(`${this.API_URL}/clinical/appointments`, {
      params: {
        limit: limit.toString(),
        fecha_desde: today,
        status: 'confirmada'
      }
    }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(() => new Observable<any[]>(observer => {
        observer.next([]);
        observer.complete();
      }))
    );
  }


  // Gestión de notificaciones
  getNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  markNotificationAsRead(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.leida = true;
      this.notificationsSubject.next([...notifications]);
    }
  }

  addNotification(notification: Notification): void {
    const notifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...notifications]);
  }

  getUnreadNotificationsCount(): number {
    return this.notificationsSubject.value.filter(n => !n.leida).length;
  }

  // Funciones de mapeo para convertir datos del backend al formato del frontend
  private mapBackendStatsToFrontend(pacientesData: any, citasData: any): DashboardStats {
    return {
      pacientes: {
        total: pacientesData.totalPacientes || 0,
        nuevos_mes: pacientesData.nuevosUltimoMes || 0,
        activos: pacientesData.totalPacientes || 0
      },
      citas: {
        hoy: citasData.citas_hoy || 0,
        semana: citasData.total_citas || 0,
        pendientes: citasData.citas_pendientes || 0
      }
    };
  }

  private getDefaultStats(): DashboardStats {
    return {
      pacientes: {
        total: 0,
        nuevos_mes: 0,
        activos: 0
      },
      citas: {
        hoy: 0,
        semana: 0,
        pendientes: 0
      }
    };
  }


  private mapCitasToActivity(citasData: any[]): RecentActivity[] {
    return citasData.slice(0, 10).map((cita: any, index: number) => ({
      id: cita.id || index.toString(),
      tipo: 'cita' as const,
      descripcion: `Cita programada para ${cita.mascota_nombre || 'mascota'} - ${cita.tipo_cita || 'consulta'}`,
      fecha: cita.fecha_inicio || new Date().toISOString(),
      usuario: cita.veterinario_nombre || 'Veterinario',
      icono: 'event',
      color: '#2e7d32'
    }));
  }

  private generateDefaultCitasChart(): Observable<ChartData> {
    return new Observable(observer => {
      observer.next({
        labels: ['Sin datos'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0']
        }]
      });
      observer.complete();
    });
  }

  private formatEstadoCita(estado: string): string {
    const estados: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'en_progreso': 'En Progreso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return estados[estado] || estado;
  }

  private getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#FF9800',
      'confirmada': '#2196F3',
      'en_progreso': '#4CAF50',
      'completada': '#8BC34A',
      'cancelada': '#f44336'
    };
    return colores[estado] || '#9E9E9E';
  }
}
