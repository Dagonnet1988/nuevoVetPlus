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
  citasPorEstadoData: any;

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
          route: '/pacientes',
          category: 'citas-pacientes'
        },
        {
          title: 'Citas de Hoy',
          value: stats.citas.hoy,
          subtitle: `${stats.citas.pendientes} pendientes`,
          icon: 'schedule',
          color: 'accent',
          route: '/citas',
          category: 'citas-pacientes'
        },
        {
          title: 'Citas Esta Semana',
          value: stats.citas.semana,
          subtitle: `${stats.citas.canceladas_semana} canceladas esta semana`,
          icon: 'event',
          color: 'warn',
          route: '/citas',
          category: 'citas-pacientes'
        }
      ];
    });
  }

  private loadChartData() {
    this.dashboardService.getCitasPorEstado().subscribe((data) => {
      this.citasPorEstadoData = data;
    });
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
      case 'citas':
        return this.authService.hasAnyRole(['admin', 'vet', 'aux']);
      default:
        return true;
    }
  }

  getStatsByCategory(category: string): StatItem[] {
    return this.statsWidgets.filter(stat => (stat as any).category === category);
  }
}
