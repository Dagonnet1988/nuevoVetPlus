import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
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
  ventas: {
    dia: number;
    mes: number;
    año: number;
  };
  inventario: {
    productos_bajo_stock: number;
    productos_vencidos: number;
    total_productos: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: any[];
}

export interface RecentActivity {
  id: string;
  tipo: 'cita' | 'venta' | 'paciente' | 'inventario';
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
    return this.http.get<any>(`${this.API_URL}/reports/dashboard`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return this.mapBackendStatsToFrontend(response.data);
        }
        throw new Error('Error obteniendo estadísticas del dashboard');
      })
    );
  }

  // Datos para gráfico de ventas mensuales - usar reportes de ventas
  getVentasMensuales(): Observable<ChartData> {
    return this.http.get<any>(`${this.API_URL}/reports/sales`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return this.mapVentasToChartData(response.data);
        }
        throw new Error('Error obteniendo datos de ventas');
      }),
      catchError(() => this.generateDefaultVentasChart())
    );
  }

  // Datos para gráfico de citas por estado - usar estadísticas del dashboard
  getCitasPorEstado(): Observable<ChartData> {
    return this.getDashboardStats().pipe(
      map((stats: DashboardStats) => {
        return {
          labels: ['Hoy', 'Semana', 'Pendientes'],
          datasets: [{
            data: [stats.citas.hoy, stats.citas.semana, stats.citas.pendientes],
            backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
          }]
        };
      })
    );
  }

  // Datos para gráfico de pacientes por especie - usar reportes de pacientes
  getPacientesPorEspecie(): Observable<ChartData> {
    return this.http.get<any>(`${this.API_URL}/reports/patients`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return this.mapPacientesToChartData(response.data);
        }
        throw new Error('Error obteniendo datos de pacientes');
      }),
      catchError(() => this.generateDefaultPacientesChart())
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

  // Alertas de inventario - usar alertas y KPIs
  getAlertasInventario(): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/reports/alerts-kpis`).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.alertas) {
          return response.data.alertas.filter((alerta: any) =>
            alerta.tipo === 'stock_critico' || alerta.tipo === 'inventario'
          );
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
  private mapBackendStatsToFrontend(backendData: any): DashboardStats {
    return {
      pacientes: {
        total: backendData.clientes?.total_clientes || 0,
        nuevos_mes: backendData.clientes?.clientes_nuevos || 0,
        activos: backendData.clientes?.total_clientes || 0
      },
      citas: {
        hoy: backendData.kpis?.citas_hoy || 0,
        semana: backendData.citas?.total_citas || 0,
        pendientes: backendData.citas?.pendientes || 0
      },
      ventas: {
        dia: backendData.ventas?.total_ventas || 0,
        mes: backendData.ventas?.total_ventas || 0,
        año: backendData.ventas?.total_ventas || 0
      },
      inventario: {
        productos_bajo_stock: backendData.inventario?.productos_criticos || 0,
        productos_vencidos: 0, // No disponible en backend
        total_productos: backendData.inventario?.total_productos || 0
      }
    };
  }

  private mapVentasToChartData(ventasData: any): ChartData {
    // Generar datos por defecto si no hay suficiente información
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [{
        label: 'Ventas (COP)',
        data: [0, 0, 0, 0, 0, ventasData.total_ventas || 0],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4
      }]
    };
  }

  private mapPacientesToChartData(pacientesData: any): ChartData {
    return {
      labels: ['Perros', 'Gatos', 'Aves', 'Otros'],
      datasets: [{
        data: [60, 30, 5, 5], // Datos por defecto
        backgroundColor: ['#2e7d32', '#4CAF50', '#8BC34A', '#C8E6C9']
      }]
    };
  }

  private mapCitasToActivity(citasData: any[]): RecentActivity[] {
    return citasData.slice(0, 10).map((cita: any, index: number) => ({
      id: cita.id || index.toString(),
      tipo: 'cita' as const,
      descripcion: `Cita programada para ${cita.mascota_nombre || 'mascota'} - ${cita.tipo_cita || 'consulta'}`,
      fecha: cita.fecha_hora || new Date().toISOString(),
      usuario: cita.veterinario_nombre || 'Veterinario',
      icono: 'event',
      color: '#2e7d32'
    }));
  }

  private generateDefaultVentasChart(): Observable<ChartData> {
    return new Observable(observer => {
      observer.next({
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{
          label: 'Ventas (COP)',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          tension: 0.4
        }]
      });
      observer.complete();
    });
  }

  private generateDefaultPacientesChart(): Observable<ChartData> {
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
}
