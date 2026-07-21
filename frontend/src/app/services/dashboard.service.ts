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
    canceladas_semana: number;
  };
}

export interface DashboardNavigation {
  route: string;
  queryParams?: Record<string, string>;
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
      pacientes: this.getPacientesDashboardStats(),
      citas: this.getCitasDashboardStats()
    }).pipe(
      map(({ pacientes, citas }) => ({ pacientes, citas }))
    );
  }

  getPacientesDashboardStats(): Observable<DashboardStats['pacientes']> {
    return this.http.get<any>(`${this.API_URL}/clinical/pacientes/stats`).pipe(
      map((response: any) => this.mapPacientesStats(response?.success && response?.data ? response.data : null)),
      catchError((error) => {
        console.warn('No se pudieron cargar estadísticas de pacientes para el dashboard:', error);
        return of(this.getDefaultStats().pacientes);
      })
    );
  }

  getCitasDashboardStats(): Observable<DashboardStats['citas']> {
    return this.http.get<any>(`${this.API_URL}/clinical/appointments/stats`).pipe(
      map((response: any) => this.mapCitasStats(response?.success && response?.data ? response.data : null)),
      catchError((error) => {
        console.warn('No se pudieron cargar estadísticas de citas para el dashboard:', error);
        return of(this.getDefaultStats().citas);
      })
    );
  }

  // Datos para gráfico de citas por estado - obtener estados reales
  getCitasPorEstado(): Observable<ChartData> {
    return this.http.get<any>(`${this.API_URL}/clinical/appointments/stats`).pipe(
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data.estados) && response.data.estados.length > 0) {
          const acumulado = new Map<string, number>();

          response.data.estados.forEach((e: any) => {
            const estadoOriginal = String(e?.estado || '').trim();
            if (estadoOriginal === 'en_curso') {
              return;
            }

            const estado = estadoOriginal;
            const cantidad = Number(e?.cantidad || 0);
            acumulado.set(estado, (acumulado.get(estado) || 0) + cantidad);
          });

          const estados = Array.from(acumulado.entries()).map(([estado, cantidad]) => ({ estado, cantidad }));

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
    const today = this.toLocalDateString(new Date());
    return this.http.get<any>(`${this.API_URL}/clinical/appointments`, {
      params: {
        limit: '50',
        offset: '0',
        fecha_inicio: today,
        estado: 'confirmada'
      }
    }).pipe(
      map((response: any) => {
        if (response.success && Array.isArray(response.data)) {
          return this.mapCitasToActivity(response.data, limit);
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
    const today = this.toLocalDateString(new Date());
    return this.http.get<any>(`${this.API_URL}/clinical/appointments`, {
      params: {
        limit: '200',
        offset: '0',
        fecha_inicio: today
      }
    }).pipe(
      map((response: any) => {
        if (response.success && Array.isArray(response.data)) {
          return response.data
            .filter((cita: any) => ['confirmada', 'en_curso'].includes(cita.estado))
            .sort((a: any, b: any) => {
              const aTime = new Date(a.fecha_inicio).getTime();
              const bTime = new Date(b.fecha_inicio).getTime();
              return aTime - bTime;
            })
            .slice(0, limit);
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
      pacientes: this.mapPacientesStats(pacientesData),
      citas: this.mapCitasStats(citasData)
    };
  }

  private mapPacientesStats(pacientesData: any): DashboardStats['pacientes'] {
    const total = this.toNumber(pacientesData?.totalPacientes ?? pacientesData?.total_pacientes);
    return {
      total,
      nuevos_mes: this.toNumber(pacientesData?.nuevosUltimoMes ?? pacientesData?.nuevos_ultimo_mes),
      activos: total
    };
  }

  private mapCitasStats(citasData: any): DashboardStats['citas'] {
    return {
      hoy: this.toNumber(citasData?.citas_hoy),
      semana: this.toNumber(citasData?.total_citas),
      pendientes: this.toNumber(citasData?.citas_pendientes),
      canceladas_semana: this.toNumber(citasData?.citas_canceladas_semana)
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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
        pendientes: 0,
        canceladas_semana: 0
      }
    };
  }


  private mapCitasToActivity(citasData: any[], limit: number): RecentActivity[] {
    const onlyScheduled = citasData.filter((cita: any) => cita?.estado === 'confirmada');

    const sorted = [...onlyScheduled].sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.fecha_inicio).getTime();
      const dateB = new Date(b.created_at || b.fecha_inicio).getTime();
      return dateB - dateA;
    });

    return sorted.slice(0, limit).map((cita: any, index: number) => ({
      id: cita.id_cita || cita.id || index.toString(),
      tipo: 'cita' as const,
      descripcion: `Cita agendada para ${cita.mascota_nombre || 'mascota'} - ${cita.tipo || cita.tipo_cita || 'consulta'}`,
      fecha: cita.created_at || cita.fecha_inicio || new Date().toISOString(),
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
      'en_curso': 'En Curso',
      'completada': 'Completada',
      'no_asistio': 'No Asistio'
    };
    return estados[estado] || estado;
  }

  private getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#FF9800',
      'confirmada': '#2196F3',
      'en_curso': '#4CAF50',
      'completada': '#8BC34A',
      'no_asistio': '#f44336'
    };
    return colores[estado] || '#9E9E9E';
  }

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
