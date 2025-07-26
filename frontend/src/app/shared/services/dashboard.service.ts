import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    this.loadMockNotifications();
  }

  // Estadísticas generales del dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.API_URL}/dashboard/stats`);
  }

  // Datos para gráfico de ventas mensuales
  getVentasMensuales(): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.API_URL}/dashboard/ventas-mensuales`);
  }

  // Datos para gráfico de citas por estado
  getCitasPorEstado(): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.API_URL}/dashboard/citas-estado`);
  }

  // Datos para gráfico de pacientes por especie
  getPacientesPorEspecie(): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.API_URL}/dashboard/pacientes-especie`);
  }

  // Actividad reciente
  getRecentActivity(limit: number = 10): Observable<RecentActivity[]> {
    return this.http.get<RecentActivity[]>(`${this.API_URL}/dashboard/actividad-reciente?limit=${limit}`);
  }

  // Próximas citas
  getProximasCitas(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/dashboard/proximas-citas?limit=${limit}`);
  }

  // Alertas de inventario
  getAlertasInventario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/dashboard/alertas-inventario`);
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

  // Mock data para desarrollo (remover cuando el backend esté listo)
  private loadMockNotifications(): void {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        tipo: 'warning',
        titulo: 'Stock Bajo',
        mensaje: 'El producto "Vacuna Antirrábica" tiene solo 3 unidades disponibles',
        fecha: new Date().toISOString(),
        leida: false
      },
      {
        id: '2',
        tipo: 'info',
        titulo: 'Nueva Cita',
        mensaje: 'Se agendó una nueva cita para mañana a las 10:00 AM',
        fecha: new Date(Date.now() - 3600000).toISOString(),
        leida: false
      },
      {
        id: '3',
        tipo: 'success',
        titulo: 'Factura Pagada',
        mensaje: 'Se registró el pago de la factura #001234',
        fecha: new Date(Date.now() - 7200000).toISOString(),
        leida: true
      }
    ];

    this.notificationsSubject.next(mockNotifications);
  }

  // Mock data para estadísticas (remover cuando el backend esté listo)
  getMockDashboardStats(): DashboardStats {
    return {
      pacientes: {
        total: 1247,
        nuevos_mes: 34,
        activos: 892
      },
      citas: {
        hoy: 12,
        semana: 87,
        pendientes: 23
      },
      ventas: {
        dia: 2850000,
        mes: 45600000,
        año: 387500000
      },
      inventario: {
        productos_bajo_stock: 8,
        productos_vencidos: 2,
        total_productos: 156
      }
    };
  }

  getMockVentasMensuales(): ChartData {
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [{
        label: 'Ventas (COP)',
        data: [12000000, 19000000, 15000000, 25000000, 22000000, 18000000],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4
      }]
    };
  }

  getMockCitasPorEstado(): ChartData {
    return {
      labels: ['Confirmadas', 'Pendientes', 'Canceladas', 'Completadas'],
      datasets: [{
        data: [45, 23, 8, 67],
        backgroundColor: [
          '#4CAF50',
          '#FF9800',
          '#F44336',
          '#2e7d32'
        ]
      }]
    };
  }

  getMockPacientesPorEspecie(): ChartData {
    return {
      labels: ['Perros', 'Gatos', 'Aves', 'Otros'],
      datasets: [{
        data: [65, 28, 4, 3],
        backgroundColor: [
          '#2e7d32',
          '#4CAF50',
          '#8BC34A',
          '#C8E6C9'
        ]
      }]
    };
  }

  getMockRecentActivity(): RecentActivity[] {
    return [
      {
        id: '1',
        tipo: 'cita',
        descripcion: 'Nueva cita agendada para Max (Golden Retriever)',
        fecha: new Date().toISOString(),
        usuario: 'Dr. María García',
        icono: 'event',
        color: '#2e7d32'
      },
      {
        id: '2',
        tipo: 'venta',
        descripcion: 'Factura #001235 generada por $125,000',
        fecha: new Date(Date.now() - 1800000).toISOString(),
        usuario: 'Ana Auxiliar',
        icono: 'receipt',
        color: '#ff9800'
      },
      {
        id: '3',
        tipo: 'paciente',
        descripcion: 'Nuevo paciente registrado: Luna (Gato Persa)',
        fecha: new Date(Date.now() - 3600000).toISOString(),
        usuario: 'Dr. Carlos Pérez',
        icono: 'pets',
        color: '#4caf50'
      }
    ];
  }
}