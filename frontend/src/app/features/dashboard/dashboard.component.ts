import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, DashboardStats, RecentActivity } from '../../shared/services/dashboard.service';
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
  template: `
    <div class="dashboard-container">
      <!-- Header de bienvenida -->
      <div class="welcome-section">
        <h1 class="welcome-title">
          ¡Bienvenido{{ authService.getCurrentUserName() ? ', ' + authService.getCurrentUserName() : '' }}!
        </h1>
        <p class="welcome-subtitle">
          Sistema de Gestión Veterinaria - {{ authService.getCurrentUserRole() }}
        </p>
      </div>

      <!-- Widgets de estadísticas -->
      <div class="stats-section">
        <div class="stats-grid">
          @for (stat of statsWidgets; track stat.title) {
            <app-stats-widget [stat]="stat"></app-stats-widget>
          }
        </div>
      </div>

      <!-- Contenido principal del dashboard -->
      <div class="main-content">
        <div class="content-grid">
          <!-- Columna izquierda -->
          <div class="left-column">
            <!-- Gráfico de ventas mensuales -->
            @if (shouldShowChart('ventas')) {
              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>trending_up</mat-icon>
                    Ventas Mensuales
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <app-line-chart 
                    [data]="ventasMensualesData" 
                    [title]="'Tendencia de Ventas (COP)'">
                  </app-line-chart>
                </mat-card-content>
              </mat-card>
            }

            <!-- Gráficos de distribución -->
            <div class="charts-row">
              @if (shouldShowChart('citas')) {
                <mat-card class="chart-card small">
                  <mat-card-header>
                    <mat-card-title>Citas por Estado</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <app-doughnut-chart [data]="citasPorEstadoData"></app-doughnut-chart>
                  </mat-card-content>
                </mat-card>
              }

              @if (shouldShowChart('pacientes')) {
                <mat-card class="chart-card small">
                  <mat-card-header>
                    <mat-card-title>Pacientes por Especie</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <app-doughnut-chart [data]="pacientesPorEspecieData"></app-doughnut-chart>
                  </mat-card-content>
                </mat-card>
              }
            </div>

            <!-- Acciones rápidas -->
            <app-quick-actions></app-quick-actions>
          </div>

          <!-- Columna derecha -->
          <div class="right-column">
            <!-- Calendario de citas -->
            @if (authService.hasAnyRole(['admin', 'vet', 'aux'])) {
              <app-appointments-calendar [appointments]="todayAppointments"></app-appointments-calendar>
            }

            <!-- Actividad reciente -->
            <app-recent-activity [activities]="recentActivities"></app-recent-activity>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 24px;
      text-align: center;
    }

    .welcome-title {
      font-size: 28px;
      font-weight: 400;
      color: #2e7d32;
      margin: 0 0 8px 0;
    }

    .welcome-subtitle {
      font-size: 16px;
      color: #666;
      margin: 0;
    }

    .stats-section {
      margin-bottom: 32px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .main-content {
      width: 100%;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      align-items: start;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: sticky;
      top: 24px;
    }

    .chart-card {
      height: 100%;
    }

    .chart-card mat-card-header {
      padding-bottom: 8px;
    }

    .chart-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
      font-size: 18px;
    }

    .chart-card mat-card-content {
      padding: 16px 0 !important;
      height: 300px;
    }

    .chart-card.small mat-card-content {
      height: 250px;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    /* Dark theme */
    .dark-theme .welcome-title {
      color: #81c784;
    }

    .dark-theme .welcome-subtitle {
      color: #b3b3b3;
    }

    .dark-theme .chart-card mat-card-title {
      color: #fff;
    }

    /* Blue theme */
    .blue-theme .welcome-title {
      color: #1976d2;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .content-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .right-column {
        position: static;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }

      .welcome-title {
        font-size: 24px;
      }

      .welcome-subtitle {
        font-size: 14px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .charts-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .content-grid {
        gap: 16px;
      }

      .left-column,
      .right-column {
        gap: 16px;
      }

      .chart-card mat-card-content {
        height: 250px;
      }

      .chart-card.small mat-card-content {
        height: 200px;
      }
    }

    @media (max-width: 480px) {
      .dashboard-container {
        padding: 12px;
      }

      .welcome-section {
        margin-bottom: 16px;
      }

      .stats-section {
        margin-bottom: 20px;
      }

      .chart-card mat-card-content {
        height: 200px;
      }

      .chart-card.small mat-card-content {
        height: 180px;
      }
    }
  `]
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
    this.recentActivities = this.dashboardService.getMockRecentActivity();
    
    // Cargar citas de hoy (mock data)
    this.loadTodayAppointments();
  }

  private loadStats() {
    const mockStats = this.dashboardService.getMockDashboardStats();
    
    this.statsWidgets = [
      {
        title: 'Total Pacientes',
        value: mockStats.pacientes.total,
        subtitle: `${mockStats.pacientes.nuevos_mes} nuevos este mes`,
        icon: 'pets',
        color: 'primary',
        trend: { value: 12, isPositive: true },
        route: '/pacientes'
      },
      {
        title: 'Citas Hoy',
        value: mockStats.citas.hoy,
        subtitle: `${mockStats.citas.pendientes} pendientes`,
        icon: 'event',
        color: 'success',
        trend: { value: 8, isPositive: true },
        route: '/citas'
      },
      {
        title: 'Ventas del Mes',
        value: this.formatCurrency(mockStats.ventas.mes),
        subtitle: 'vs mes anterior',
        icon: 'attach_money',
        color: 'warning',
        trend: { value: 15, isPositive: true },
        route: '/facturacion'
      },
      {
        title: 'Stock Bajo',
        value: mockStats.inventario.productos_bajo_stock,
        subtitle: `de ${mockStats.inventario.total_productos} productos`,
        icon: 'inventory',
        color: 'error',
        route: '/inventario'
      }
    ];

    // Filtrar widgets según rol
    if (!this.authService.hasAnyRole(['admin', 'aux'])) {
      this.statsWidgets = this.statsWidgets.filter(widget => 
        !['Ventas del Mes', 'Stock Bajo'].includes(widget.title)
      );
    }
  }

  private loadChartData() {
    this.ventasMensualesData = this.dashboardService.getMockVentasMensuales();
    this.citasPorEstadoData = this.dashboardService.getMockCitasPorEstado();
    this.pacientesPorEspecieData = this.dashboardService.getMockPacientesPorEspecie();
  }

  private loadTodayAppointments() {
    // Mock data para citas de hoy
    this.todayAppointments = [
      {
        id: '1',
        paciente_nombre: 'Max',
        cliente_nombre: 'Carlos Rodríguez',
        hora: '09:00',
        tipo: 'Consulta General',
        estado: 'confirmada',
        veterinario: 'Dr. García'
      },
      {
        id: '2',
        paciente_nombre: 'Luna',
        cliente_nombre: 'María López',
        hora: '10:30',
        tipo: 'Vacunación',
        estado: 'confirmada',
        veterinario: 'Dr. Pérez'
      },
      {
        id: '3',
        paciente_nombre: 'Rocky',
        cliente_nombre: 'Ana Martínez',
        hora: '14:00',
        tipo: 'Control Post-operatorio',
        estado: 'pendiente',
        veterinario: 'Dr. García'
      },
      {
        id: '4',
        paciente_nombre: 'Michi',
        cliente_nombre: 'Pedro Silva',
        hora: '15:30',
        tipo: 'Consulta Dermatología',
        estado: 'confirmada',
        veterinario: 'Dr. Pérez'
      }
    ];
  }

  shouldShowChart(chartType: string): boolean {
    switch (chartType) {
      case 'ventas':
        return this.authService.hasAnyRole(['admin', 'aux']);
      case 'citas':
        return this.authService.hasAnyRole(['admin', 'vet', 'aux']);
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
}