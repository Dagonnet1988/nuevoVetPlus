import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { AuthService } from '../../services/auth.service';
import { DashboardService, DashboardStats, RecentActivity } from '../../services/dashboard.service';
import { StatsWidgetComponent, StatItem } from './components/stats-widget.component';
import { RecentActivityComponent } from './components/recent-activity.component';
import { QuickActionsComponent } from './components/quick-actions.component';
import { AppointmentsCalendarComponent, AppointmentSummary } from './components/appointments-calendar.component';
import { LineChartComponent } from '../../shared/components/charts/line-chart.component';
import { DoughnutChartComponent } from '../../shared/components/charts/doughnut-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    StatsWidgetComponent,
    RecentActivityComponent,
    QuickActionsComponent,
    AppointmentsCalendarComponent,
    LineChartComponent,
    DoughnutChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  statsWidgets: StatItem[] = [];
  recentActivities: RecentActivity[] = [];
  todayAppointments: AppointmentSummary[] = [];

  // Datos para gráficos
  ventasMensualesData: any;
  citasPorEstadoData: any;
  pacientesPorEspecieData: any;

  constructor(
    public authService: AuthService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    // Cargar estadísticas
    this.loadStats();

    // Cargar datos de gráficos
    this.loadChartData();

    // Cargar actividad reciente
    this.dashboardService.getRecentActivity().subscribe((activities) => {
      this.recentActivities = activities;
    });

    // Cargar citas de hoy (mock data)
    this.loadTodayAppointments();
  }

  private loadStats() {
    this.dashboardService.getDashboardStats().subscribe((stats) => {
      this.statsWidgets = [
        // Estadísticas de citas y pacientes
        {
          title: 'Total Pacientes',
          value: stats.pacientes.total,
          subtitle: `${stats.pacientes.nuevos_mes} nuevos este mes`,
          icon: 'pets',
          color: 'primary',
          trend: { value: 12, isPositive: true },
          route: '/pacientes',
          category: 'citas-pacientes'
        },
        {
          title: 'Citas de Hoy',
          value: stats.citas.hoy,
          subtitle: `${stats.citas.pendientes} pendientes`,
          icon: 'schedule',
          color: 'accent',
          trend: { value: 5, isPositive: true },
          route: '/citas',
          category: 'citas-pacientes'
        },
        {
          title: 'Citas Esta Semana',
          value: stats.citas.semana,
          subtitle: '2 canceladas esta semana',
          icon: 'event',
          color: 'warn',
          trend: { value: 8, isPositive: false },
          route: '/citas',
          category: 'citas-pacientes'
        },

        // Estadísticas financieras
        {
          title: 'Ventas del Mes',
          value: this.formatCurrency(stats.ventas.mes),
          subtitle: 'vs mes anterior',
          icon: 'attach_money',
          color: 'warning',
          trend: { value: 15, isPositive: true },
          route: '/facturacion',
          category: 'finanzas'
        },
        {
          title: 'Ingresos Hoy',
          value: this.formatCurrency(stats.ventas.dia),
          subtitle: 'Ingresos de hoy',
          icon: 'payments',
          color: 'success',
          trend: { value: 8, isPositive: true },
          route: '/facturacion',
          category: 'finanzas'
        },
        {
          title: 'Stock Bajo',
          value: stats.inventario.productos_bajo_stock,
          subtitle: `de ${stats.inventario.total_productos} productos`,
          icon: 'inventory',
          color: 'error',
          route: '/inventario',
          category: 'finanzas'
        },
        {
          title: 'Total Productos',
          value: stats.inventario.total_productos,
          subtitle: `${stats.inventario.productos_bajo_stock} con stock bajo`,
          icon: 'inventory_2',
          color: 'primary',
          trend: { value: 3, isPositive: true },
          route: '/inventario',
          category: 'finanzas'
        }
      ];

      // Filtrar widgets según rol
      if (!this.authService.hasAnyRole(['admin', 'aux_admin'])) {
        this.statsWidgets = this.statsWidgets.filter(widget =>
          !['Ventas del Mes', 'Stock Bajo'].includes(widget.title)
        );
      }
    });
  }

  private loadChartData() {
    this.ventasMensualesData = this.dashboardService.getVentasMensuales();
    this.citasPorEstadoData = this.dashboardService.getCitasPorEstado();
    this.pacientesPorEspecieData = this.dashboardService.getPacientesPorEspecie();
  }

  private loadTodayAppointments() {
    // Cargar próximas citas desde el backend
    this.dashboardService.getProximasCitas(10).subscribe((citas) => {
      this.todayAppointments = citas.map(cita => ({
        id: cita.id,
        paciente_nombre: cita.mascota_nombre || 'Mascota',
        cliente_nombre: cita.cliente_nombre || 'Cliente',
        hora: this.formatTime(cita.fecha_inicio),
        tipo: cita.tipo_cita || 'Consulta',
        estado: cita.estado || 'pendiente',
        veterinario: cita.veterinario_nombre || 'Veterinario'
      }));
    });
  }

  private formatTime(dateTime: string): string {
    if (!dateTime) return '--:--';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  shouldShowChart(chartType: string): boolean {
    switch (chartType) {
      case 'ventas':
        return this.authService.hasAnyRole(['admin', 'aux_admin']);
      case 'citas':
        return this.authService.hasAnyRole(['admin', 'vet', 'aux_admin', 'aux_vet']);
      case 'pacientes':
        return this.authService.hasAnyRole(['admin', 'vet']);
      default:
        return true;
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  }

  getStatsByCategory(category: string): StatItem[] {
    return this.statsWidgets.filter(stat => (stat as any).category === category);
  }
}
