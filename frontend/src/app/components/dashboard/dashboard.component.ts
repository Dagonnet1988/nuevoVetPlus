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
import { AppointmentsCalendarComponent, AppointmentSummary } from './components/appointments-calendar.component';
import { DoughnutChartComponent } from '../../shared/components/charts/doughnut-chart.component';

interface EstadoResumenItem {
  label: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

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
  weekRangeLabel = '';
  private pacientesStats: DashboardStats['pacientes'] = { total: 0, nuevos_mes: 0, activos: 0 };
  private citasStats: DashboardStats['citas'] = { hoy: 0, semana: 0, pendientes: 0, canceladas_semana: 0 };

  // Datos para gráficos
  citasPorEstadoData: any;
  citasPorEstadoResumen: EstadoResumenItem[] = [];

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
    this.renderStatsWidgets();

    this.dashboardService.getPacientesDashboardStats().subscribe((pacientes) => {
      this.pacientesStats = pacientes;
      this.renderStatsWidgets();
    });

    this.dashboardService.getCitasDashboardStats().subscribe((citas) => {
      this.citasStats = citas;
      this.renderStatsWidgets();
    });
  }

  private renderStatsWidgets(): void {
    const today = this.formatDateOnly(new Date());
    const { monday, sunday } = this.getCurrentWeekRange();
    this.weekRangeLabel = `${this.formatDateForLabel(monday)} - ${this.formatDateForLabel(sunday)}`;

    this.statsWidgets = [
      {
        title: 'Total Pacientes',
        value: this.pacientesStats.total,
        subtitle: `${this.pacientesStats.nuevos_mes} nuevos este mes`,
        icon: 'pets',
        color: 'primary',
        route: '/pacientes',
        category: 'citas-pacientes'
      },
      {
        title: 'Citas de Hoy',
        value: this.citasStats.hoy,
        subtitle: `${this.citasStats.pendientes} pendientes`,
        icon: 'schedule',
        color: 'info',
        route: '/citas',
        queryParams: {
          view: 'calendario',
          foco: 'dia',
          fecha_inicio: today,
          fecha_fin: today
        },
        category: 'citas-pacientes'
      },
      {
        title: 'Citas Esta Semana',
        value: this.citasStats.semana,
        subtitle: `Lun-Dom (${this.weekRangeLabel}) · ${this.citasStats.canceladas_semana} no asistio`,
        icon: 'event',
        color: 'warning',
        route: '/citas',
        queryParams: {
          view: 'calendario',
          foco: 'semana',
          fecha_inicio: monday,
          fecha_fin: sunday
        },
        category: 'citas-pacientes'
      }
    ];
  }

  private loadChartData() {
    this.dashboardService.getCitasPorEstado().subscribe((data) => {
      this.citasPorEstadoData = data;
      this.citasPorEstadoResumen = this.buildEstadoResumen(data);
    });
  }

  private loadTodayAppointments() {
    // Cargar próximas citas desde el backend
    this.dashboardService.getProximasCitas(12).subscribe((citas) => {
      this.todayAppointments = citas.map(cita => ({
        id: cita.id_cita || cita.id,
        fecha_inicio: cita.fecha_inicio,
        paciente_nombre: cita.mascota_nombre || 'Mascota',
        cliente_nombre: cita.cliente_nombre || 'Cliente',
        hora: this.formatTime(cita.fecha_inicio),
        tipo: cita.tipo || cita.tipo_cita || 'Consulta',
        estado: cita.estado || 'confirmada',
        veterinario: cita.veterinario_nombre || 'Veterinario'
      }));
    });
  }

  private buildEstadoResumen(chartData: any): EstadoResumenItem[] {
    const labels = Array.isArray(chartData?.labels) ? chartData.labels : [];
    const values = Array.isArray(chartData?.datasets?.[0]?.data) ? chartData.datasets[0].data : [];
    const colors = Array.isArray(chartData?.datasets?.[0]?.backgroundColor)
      ? chartData.datasets[0].backgroundColor
      : [];

    const rows: Array<{ label: string; cantidad: number; color: string }> = labels.map((label: string, index: number) => ({
      label,
      cantidad: Number(values[index] || 0),
      color: colors[index] || '#9E9E9E'
    }));

    const total = rows.reduce((acc: number, item: { label: string; cantidad: number; color: string }) => acc + item.cantidad, 0);

    return rows.map((item) => ({
      ...item,
      porcentaje: total > 0 ? Number(((item.cantidad / total) * 100).toFixed(1)) : 0
    }));
  }

  private formatTime(dateTime: string): string {
    if (!dateTime) return '--:--';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentWeekRange(): { monday: string; sunday: string } {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() + mondayOffset);

    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);

    return {
      monday: this.formatDateOnly(mondayDate),
      sunday: this.formatDateOnly(sundayDate)
    };
  }

  private formatDateForLabel(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit'
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
