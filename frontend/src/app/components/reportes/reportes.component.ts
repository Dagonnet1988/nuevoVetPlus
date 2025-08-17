import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { 
  ReportesService,
  DashboardEjecutivo,
  KPIPrincipal,
  FiltroFechas,
  AlertaCritica,
  MetricaOperativa
} from '../../services/reportes.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatMenuModule
  ],
  template: `
    <div class="reportes-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">analytics</mat-icon>
              Reportes y Analytics
            </h1>
            <p class="page-subtitle">Dashboard ejecutivo y análisis de datos</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button 
                    [matMenuTriggerFor]="exportMenu"
                    class="export-button">
              <mat-icon>download</mat-icon>
              Exportar
            </button>
            <mat-menu #exportMenu="matMenu">
              <button mat-menu-item (click)="exportarDashboard('pdf')">
                <mat-icon>picture_as_pdf</mat-icon>
                Exportar a PDF
              </button>
              <button mat-menu-item (click)="exportarDashboard('excel')">
                <mat-icon>table_chart</mat-icon>
                Exportar a Excel
              </button>
            </mat-menu>
            <button mat-raised-button 
                    color="primary"
                    (click)="actualizarDatos()"
                    [disabled]="loading()"
                    class="refresh-button">
              <mat-icon>refresh</mat-icon>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Filtros de período -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filtrosForm" class="filters-form">
            <div class="period-selector">
              <mat-button-toggle-group 
                [value]="periodoSeleccionado()" 
                (change)="cambiarPeriodo($event.value)"
                class="period-toggle">
                <mat-button-toggle value="dia">Hoy</mat-button-toggle>
                <mat-button-toggle value="semana">Esta Semana</mat-button-toggle>
                <mat-button-toggle value="mes">Este Mes</mat-button-toggle>
                <mat-button-toggle value="año">Este Año</mat-button-toggle>
                <mat-button-toggle value="personalizado">Personalizado</mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            @if (periodoSeleccionado() === 'personalizado') {
              <div class="custom-date-range">
                <mat-form-field appearance="outline" class="date-field">
                  <mat-label>Fecha inicio</mat-label>
                  <input matInput [matDatepicker]="startPicker" formControlName="fecha_inicio">
                  <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline" class="date-field">
                  <mat-label>Fecha fin</mat-label>
                  <input matInput [matDatepicker]="endPicker" formControlName="fecha_fin">
                  <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>
              </div>
            }
          </form>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando datos del dashboard...</p>
        </div>
      } @else {
        <!-- KPIs Principales -->
        <div class="kpis-section">
          <div class="section-header">
            <h2>
              <mat-icon>trending_up</mat-icon>
              Indicadores Clave de Rendimiento
            </h2>
            <span class="period-label">{{ getPeriodoLabel() }}</span>
          </div>
          
          <div class="kpis-grid">
            @for (kpi of kpis(); track kpi.nombre) {
              <mat-card class="kpi-card" [class]="'kpi-' + kpi.tendencia">
                <mat-card-content>
                  <div class="kpi-content">
                    <div class="kpi-icon">
                      <mat-icon [style.color]="kpi.color">{{ kpi.icono }}</mat-icon>
                    </div>
                    <div class="kpi-info">
                      <div class="kpi-value">
                        {{ formatearValor(kpi.valor_actual, kpi.tipo, kpi.unidad) }}
                      </div>
                      <div class="kpi-label">{{ kpi.nombre }}</div>
                      <div class="kpi-change" [class]="'change-' + kpi.tendencia">
                        <mat-icon class="change-icon">
                          {{ getTendenciaIcon(kpi.tendencia) }}
                        </mat-icon>
                        <span>{{ formatearPorcentaje(kpi.variacion_porcentual) }}</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>

        <!-- Alertas Críticas -->
        @if (alertasCriticas().length > 0) {
          <div class="alerts-section">
            <div class="section-header">
              <h2>
                <mat-icon>warning</mat-icon>
                Alertas Críticas
              </h2>
              <mat-chip class="alert-count">{{ alertasCriticas().length }}</mat-chip>
            </div>
            
            <div class="alerts-grid">
              @for (alerta of alertasCriticas(); track alerta.id) {
                <mat-card class="alert-card" [class]="'alert-' + alerta.gravedad">
                  <mat-card-content>
                    <div class="alert-content">
                      <div class="alert-header">
                        <mat-icon class="alert-icon">
                          {{ getAlertaIcon(alerta.tipo) }}
                        </mat-icon>
                        <div class="alert-info">
                          <h3 class="alert-title">{{ alerta.titulo }}</h3>
                          <p class="alert-description">{{ alerta.descripcion }}</p>
                        </div>
                        <mat-chip class="severity-chip" [class]="'severity-' + alerta.gravedad">
                          {{ alerta.gravedad.toUpperCase() }}
                        </mat-chip>
                      </div>
                      <div class="alert-action">
                        <span class="action-text">{{ alerta.accion_sugerida }}</span>
                        <button mat-button color="primary" class="action-button">
                          Revisar
                        </button>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </div>
        }

        <!-- Métricas Operativas -->
        <div class="metrics-section">
          <div class="section-header">
            <h2>
              <mat-icon>speed</mat-icon>
              Métricas Operativas
            </h2>
          </div>
          
          <div class="metrics-grid">
            @for (metrica of metricasOperativas(); track metrica.nombre) {
              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-content">
                    <div class="metric-header">
                      <h3 class="metric-name">{{ metrica.nombre }}</h3>
                      <mat-chip class="metric-status" [class]="'status-' + metrica.estado">
                        {{ getEstadoLabel(metrica.estado) }}
                      </mat-chip>
                    </div>
                    
                    <div class="metric-values">
                      <div class="metric-current">
                        <span class="value-label">Actual:</span>
                        <span class="value-number">{{ formatearNumero(metrica.valor) }}</span>
                      </div>
                      <div class="metric-target">
                        <span class="value-label">Objetivo:</span>
                        <span class="value-number">{{ formatearNumero(metrica.objetivo) }}</span>
                      </div>
                    </div>
                    
                    <div class="metric-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" 
                             [style.width.%]="metrica.porcentaje_cumplimiento"
                             [class]="'progress-' + metrica.estado">
                        </div>
                      </div>
                      <span class="progress-text">
                        {{ formatearPorcentaje(metrica.porcentaje_cumplimiento) }}
                      </span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>

        <!-- Navegación a Reportes Específicos -->
        <div class="reports-navigation">
          <div class="section-header">
            <h2>
              <mat-icon>assessment</mat-icon>
              Reportes Detallados
            </h2>
          </div>
          
          <div class="reports-grid">
            <mat-card class="report-card" (click)="navegarAReporte('ventas')">
              <mat-card-content>
                <div class="report-content">
                  <mat-icon class="report-icon">attach_money</mat-icon>
                  <h3 class="report-title">Reportes de Ventas</h3>
                  <p class="report-description">Análisis detallado de ventas, facturación y rendimiento financiero</p>
                  <div class="report-stats">
                    <span class="stat-item">Ventas del mes: {{ formatearMoneda(statsVentas.ventas_mes) }}</span>
                    <span class="stat-item">Facturas: {{ statsVentas.total_facturas }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="report-card" (click)="navegarAReporte('pacientes')">
              <mat-card-content>
                <div class="report-content">
                  <mat-icon class="report-icon">pets</mat-icon>
                  <h3 class="report-title">Estadísticas de Pacientes</h3>
                  <p class="report-description">Demografía, tendencias y análisis de la base de pacientes</p>
                  <div class="report-stats">
                    <span class="stat-item">Total pacientes: {{ statsVentas.total_pacientes }}</span>
                    <span class="stat-item">Nuevos este mes: {{ statsVentas.pacientes_nuevos }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="report-card" (click)="navegarAReporte('inventario')">
              <mat-card-content>
                <div class="report-content">
                  <mat-icon class="report-icon">inventory</mat-icon>
                  <h3 class="report-title">Análisis de Inventario</h3>
                  <p class="report-description">Rotación, valorización y optimización del inventario</p>
                  <div class="report-stats">
                    <span class="stat-item">Valor inventario: {{ formatearMoneda(statsVentas.valor_inventario) }}</span>
                    <span class="stat-item">Productos activos: {{ statsVentas.productos_activos }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="report-card" (click)="navegarAReporte('operaciones')">
              <mat-card-content>
                <div class="report-content">
                  <mat-icon class="report-icon">event</mat-icon>
                  <h3 class="report-title">Reportes Operacionales</h3>
                  <p class="report-description">Citas, consultas y eficiencia operativa</p>
                  <div class="report-stats">
                    <span class="stat-item">Citas del mes: {{ statsVentas.citas_mes }}</span>
                    <span class="stat-item">Tasa cumplimiento: {{ formatearPorcentaje(statsVentas.tasa_cumplimiento) }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  periodoSeleccionado = signal<'dia' | 'semana' | 'mes' | 'año' | 'personalizado'>('mes');
  dashboardData = signal<DashboardEjecutivo | null>(null);
  
  kpis = computed(() => this.dashboardData()?.kpis_principales || []);
  alertasCriticas = computed(() => this.dashboardData()?.alertas_criticas || []);
  metricasOperativas = computed(() => this.dashboardData()?.metricas_operativas || []);

  // Form
  filtrosForm: FormGroup;

  // Stats para cards de navegación
  statsVentas = {
    ventas_mes: 15450000,
    total_facturas: 256,
    total_pacientes: 1450,
    pacientes_nuevos: 85,
    valor_inventario: 8750000,
    productos_activos: 342,
    citas_mes: 178,
    tasa_cumplimiento: 87.5
  };

  constructor() {
    this.filtrosForm = this.fb.group({
      fecha_inicio: [null],
      fecha_fin: [null]
    });
  }

  ngOnInit(): void {
    this.initializeDates();
    this.loadDashboardData();
    this.setupFilterSubscription();
  }

  private initializeDates(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo !== 'personalizado') {
      const periodos = this.reportesService.generarPeriodosComparacion(periodo);
      this.filtrosForm.patchValue({
        fecha_inicio: new Date(periodos.actual.fecha_inicio),
        fecha_fin: new Date(periodos.actual.fecha_fin)
      });
    }
  }

  private setupFilterSubscription(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      if (this.periodoSeleccionado() === 'personalizado') {
        this.loadDashboardData();
      }
    });
  }

  cambiarPeriodo(periodo: 'dia' | 'semana' | 'mes' | 'año' | 'personalizado'): void {
    this.periodoSeleccionado.set(periodo);
    
    if (periodo !== 'personalizado') {
      this.initializeDates();
      this.loadDashboardData();
    }
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    
    const filtros: FiltroFechas = {
      fecha_inicio: this.filtrosForm.value.fecha_inicio?.toISOString().split('T')[0] || '',
      fecha_fin: this.filtrosForm.value.fecha_fin?.toISOString().split('T')[0] || '',
      periodo: this.periodoSeleccionado()
    };

    this.reportesService.getDashboardEjecutivo(filtros).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error cargando dashboard:', error);
        this.dashboardData.set(this.getMockDashboardData());
        this.loading.set(false);
        this.snackBar.open('Usando datos de demostración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  actualizarDatos(): void {
    this.loadDashboardData();
  }

  // FUNCIONALIDAD DE EXPORTACIÓN REMOVIDA - No disponible en backend
  exportarDashboard(formato: 'pdf' | 'excel'): void {
    this.snackBar.open('Funcionalidad de exportación no disponible', 'Cerrar', { duration: 3000 });
  }

  navegarAReporte(tipo: string): void {
    this.router.navigate(['/reportes', tipo]);
  }

  // Utility methods
  getPeriodoLabel(): string {
    const labels = {
      dia: 'Hoy',
      semana: 'Esta Semana',
      mes: 'Este Mes',
      año: 'Este Año',
      personalizado: 'Período Personalizado'
    };
    return labels[this.periodoSeleccionado()];
  }

  formatearValor(valor: number, tipo: 'moneda' | 'numero' | 'porcentaje', unidad: string): string {
    switch (tipo) {
      case 'moneda':
        return this.reportesService.formatearMoneda(valor);
      case 'porcentaje':
        return this.reportesService.formatearPorcentaje(valor);
      default:
        return this.reportesService.formatearNumero(valor) + (unidad ? ` ${unidad}` : '');
    }
  }

  formatearMoneda(valor: number): string {
    return this.reportesService.formatearMoneda(valor);
  }

  formatearPorcentaje(valor: number): string {
    return this.reportesService.formatearPorcentaje(valor);
  }

  formatearNumero(valor: number): string {
    return this.reportesService.formatearNumero(valor);
  }

  getTendenciaIcon(tendencia: string): string {
    switch (tendencia) {
      case 'subida': return 'trending_up';
      case 'bajada': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getAlertaIcon(tipo: string): string {
    switch (tipo) {
      case 'financiera': return 'account_balance_wallet';
      case 'operativa': return 'settings';
      case 'inventario': return 'inventory';
      case 'sistema': return 'computer';
      default: return 'warning';
    }
  }

  getEstadoLabel(estado: string): string {
    const labels = {
      excelente: 'Excelente',
      bueno: 'Bueno',
      regular: 'Regular',
      malo: 'Malo'
    };
    return labels[estado as keyof typeof labels] || estado;
  }

  private getMockDashboardData(): DashboardEjecutivo {
    return {
      kpis_principales: [
        {
          nombre: 'Ingresos Totales',
          valor_actual: 15450000,
          valor_anterior: 13200000,
          unidad: 'COP',
          tipo: 'moneda',
          tendencia: 'subida',
          variacion_porcentual: 17.05,
          icono: 'attach_money',
          color: '#4caf50'
        },
        {
          nombre: 'Pacientes Nuevos',
          valor_actual: 85,
          valor_anterior: 72,
          unidad: '',
          tipo: 'numero',
          tendencia: 'subida',
          variacion_porcentual: 18.06,
          icono: 'pets',
          color: '#2196f3'
        },
        {
          nombre: 'Consultas Realizadas',
          valor_actual: 178,
          valor_anterior: 165,
          unidad: '',
          tipo: 'numero',
          tendencia: 'subida',
          variacion_porcentual: 7.88,
          icono: 'medical_services',
          color: '#ff9800'
        },
        {
          nombre: 'Tasa de Cumplimiento',
          valor_actual: 87.5,
          valor_anterior: 85.2,
          unidad: '%',
          tipo: 'porcentaje',
          tendencia: 'subida',
          variacion_porcentual: 2.70,
          icono: 'check_circle',
          color: '#9c27b0'
        }
      ],
      comparaciones_periodo: [],
      alertas_criticas: [
        {
          id: '1',
          tipo: 'inventario',
          titulo: 'Stock Bajo Crítico',
          descripcion: '15 productos por debajo del stock mínimo',
          gravedad: 'alta',
          fecha: new Date().toISOString(),
          accion_sugerida: 'Revisar y reabastecer inventario crítico'
        },
        {
          id: '2',
          tipo: 'financiera',
          titulo: 'Facturas Vencidas',
          descripcion: '8 facturas con más de 30 días de vencimiento',
          gravedad: 'media',
          fecha: new Date().toISOString(),
          accion_sugerida: 'Contactar clientes para cobro'
        }
      ],
      resumen_financiero: {
        ingresos_mes: 15450000,
        gastos_mes: 8750000,
        ganancia_neta: 6700000,
        margen_ganancia: 43.4,
        flujo_caja_proyectado: 22150000
      },
      metricas_operativas: [
        {
          nombre: 'Ocupación de Agenda',
          valor: 87,
          objetivo: 90,
          porcentaje_cumplimiento: 96.7,
          estado: 'bueno'
        },
        {
          nombre: 'Satisfacción del Cliente',
          valor: 92,
          objetivo: 95,
          porcentaje_cumplimiento: 96.8,
          estado: 'bueno'
        },
        {
          nombre: 'Tiempo Promedio de Consulta',
          valor: 28,
          objetivo: 30,
          porcentaje_cumplimiento: 107.1,
          estado: 'excelente'
        }
      ],
      tendencias: []
    };
  }
}