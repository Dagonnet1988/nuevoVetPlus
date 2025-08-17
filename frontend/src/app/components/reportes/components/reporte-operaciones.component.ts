import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { 
  ReportesService,
  ReporteCitas,
  FiltroReporte,
  CitaDiaria,
  CitaVeterinario,
  TipoConsulta,
  HorarioPopular
} from '../../../services/reportes.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

// Interfaces específicas para operaciones
interface MetricaOperacional {
  nombre: string;
  valor_actual: number;
  objetivo: number;
  porcentaje_cumplimiento: number;
  tendencia: 'subida' | 'bajada' | 'estable';
  color: string;
  icono: string;
}

interface RendimientoDiario {
  fecha: string;
  citas_programadas: number;
  citas_completadas: number;
  citas_canceladas: number;
  tiempo_promedio_consulta: number;
  ingresos_dia: number;
}

@Component({
  selector: 'app-reporte-operaciones',
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
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTableModule
  ],
  templateUrl: './reporte-operaciones.component.html',
  styleUrl: './reporte-operaciones.component.css'
})
export class ReporteOperacionesComponent implements OnInit, AfterViewInit {
  @ViewChild('citasChart') citasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('horariosChart') horariosCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rendimientoChart') rendimientoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tiposConsultaChart') tiposConsultaCanvas!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  reporteData = signal<ReporteCitas | null>(null);
  
  // Forms
  filtrosForm: FormGroup;
  
  // Charts
  private citasChart?: Chart;
  private horariosChart?: Chart;
  private rendimientoChart?: Chart;
  private tiposConsultaChart?: Chart;

  // Table columns
  displayedColumnsVeterinarios = ['veterinario', 'citas', 'completadas', 'canceladas', 'duracion', 'eficiencia'];

  // Computed
  resumenOperacional = computed(() => {
    const data = this.reporteData();
    if (!data) return null;

    return {
      total_citas: data.total_citas,
      citas_completadas: data.citas_completadas,
      citas_canceladas: data.citas_canceladas,
      tasa_cumplimiento: data.tasa_cumplimiento,
      tasa_cancelacion: ((data.citas_canceladas / data.total_citas) * 100)
    };
  });

  metricasOperacionales = computed<MetricaOperacional[]>(() => {
    const resumen = this.resumenOperacional();
    if (!resumen) return [];

    return [
      {
        nombre: 'Tasa de Cumplimiento',
        valor_actual: resumen.tasa_cumplimiento,
        objetivo: 90,
        porcentaje_cumplimiento: (resumen.tasa_cumplimiento / 90) * 100,
        tendencia: resumen.tasa_cumplimiento > 85 ? 'subida' : 'bajada',
        color: '#4caf50',
        icono: 'check_circle'
      },
      {
        nombre: 'Ocupación de Agenda',
        valor_actual: 87.5,
        objetivo: 85,
        porcentaje_cumplimiento: (87.5 / 85) * 100,
        tendencia: 'subida',
        color: '#2196f3',
        icono: 'event'
      },
      {
        nombre: 'Tiempo Promedio Consulta',
        valor_actual: 28,
        objetivo: 30,
        porcentaje_cumplimiento: (30 / 28) * 100,
        tendencia: 'estable',
        color: '#ff9800',
        icono: 'schedule'
      },
      {
        nombre: 'Satisfacción del Cliente',
        valor_actual: 92,
        objetivo: 95,
        porcentaje_cumplimiento: (92 / 95) * 100,
        tendencia: 'subida',
        color: '#9c27b0',
        icono: 'sentiment_satisfied'
      }
    ];
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      fecha_inicio: [new Date(new Date().getFullYear(), new Date().getMonth(), 1)],
      fecha_fin: [new Date()],
      veterinario_id: [''],
      tipo_consulta: [''],
      incluir_canceladas: [true]
    });
  }

  ngOnInit(): void {
    this.loadReporteOperaciones();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  private loadReporteOperaciones(): void {
    this.loading.set(true);
    const filtros = this.buildFiltros();

    this.reportesService.getReporteCitas(filtros).subscribe({
      next: (data: any) => {
        this.reporteData.set(data);
        this.loading.set(false);
        
        // Crear gráficos después de cargar los datos
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error cargando reporte de operaciones:', error);
        this.reporteData.set(this.getMockReporteOperaciones());
        this.loading.set(false);
        setTimeout(() => this.createCharts(), 100);
        this.snackBar.open('Usando datos de demostración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilterSubscription(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.loadReporteOperaciones();
    });
  }

  private buildFiltros(): FiltroReporte {
    const formValue = this.filtrosForm.value;
    return {
      fecha_inicio: formValue.fecha_inicio?.toISOString().split('T')[0] || '',
      fecha_fin: formValue.fecha_fin?.toISOString().split('T')[0] || '',
      veterinario_id: formValue.veterinario_id || undefined,
      tipo: formValue.tipo_consulta || undefined
    };
  }

  private createCharts(): void {
    const data = this.reporteData();
    if (!data) return;

    this.createCitasChart(data.citas_por_dia);
    this.createHorariosChart(data.horarios_populares);
    this.createRendimientoChart();
    this.createTiposConsultaChart(data.tipos_consulta);
  }

  private createCitasChart(data: CitaDiaria[]): void {
    if (!this.citasCanvas) return;

    if (this.citasChart) {
      this.citasChart.destroy();
    }

    const ctx = this.citasCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.fecha),
        datasets: [{
          label: 'Citas Programadas',
          data: data.map(d => d.total_citas),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Citas Completadas',
          data: data.map(d => d.completadas),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Citas Canceladas',
          data: data.map(d => d.canceladas),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Evolución Diaria de Citas',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de Citas'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          }
        }
      }
    };

    this.citasChart = new Chart(ctx, config);
  }

  private createHorariosChart(data: HorarioPopular[]): void {
    if (!this.horariosCanvas) return;

    if (this.horariosChart) {
      this.horariosChart.destroy();
    }

    const ctx = this.horariosCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.hora),
        datasets: [{
          label: 'Citas por Horario',
          data: data.map(d => d.cantidad_citas),
          backgroundColor: data.map((_, index) => {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
            return colors[index % colors.length];
          }),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Citas por Horario',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Citas'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Horario'
            }
          }
        }
      }
    };

    this.horariosChart = new Chart(ctx, config);
  }

  private createRendimientoChart(): void {
    if (!this.rendimientoCanvas) return;

    if (this.rendimientoChart) {
      this.rendimientoChart.destroy();
    }

    const ctx = this.rendimientoCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Datos de ejemplo para rendimiento diario
    const rendimientoDatos: RendimientoDiario[] = this.getMockRendimientoDiario();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: rendimientoDatos.map(d => d.fecha),
        datasets: [{
          label: 'Tiempo Promedio (min)',
          data: rendimientoDatos.map(d => d.tiempo_promedio_consulta),
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }, {
          label: 'Ingresos del Día ($)',
          data: rendimientoDatos.map(d => d.ingresos_dia),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Rendimiento Operacional Diario',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Ingresos ($)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Tiempo (min)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    this.rendimientoChart = new Chart(ctx, config);
  }

  private createTiposConsultaChart(data: TipoConsulta[]): void {
    if (!this.tiposConsultaCanvas) return;

    if (this.tiposConsultaChart) {
      this.tiposConsultaChart.destroy();
    }

    const ctx = this.tiposConsultaCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.tipo),
        datasets: [{
          data: data.map(d => d.cantidad),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Tipos de Consulta Más Frecuentes',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = ((context.parsed / data.reduce((a, b) => a + b.cantidad, 0)) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.tiposConsultaChart = new Chart(ctx, config);
  }

  // FUNCIONALIDAD DE EXPORTACIÓN REMOVIDA - No disponible en backend

  volverAReportes(): void {
    this.router.navigate(['/reportes']);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
  }

  formatearPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  getTendenciaIcon(tendencia: string): string {
    switch (tendencia) {
      case 'subida': return 'trending_up';
      case 'bajada': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getTendenciaColor(tendencia: string): string {
    switch (tendencia) {
      case 'subida': return '#4caf50';
      case 'bajada': return '#f44336';
      default: return '#ff9800';
    }
  }

  getEficienciaColor(porcentaje: number): string {
    if (porcentaje >= 90) return '#4caf50';
    if (porcentaje >= 75) return '#ff9800';
    return '#f44336';
  }

  getMinValue(value1: number, value2: number): number {
    return Math.min(value1, value2);
  }

  // Mock data para desarrollo
  private getMockReporteOperaciones(): ReporteCitas {
    return {
      total_citas: 287,
      citas_completadas: 251,
      citas_canceladas: 28,
      tasa_cumplimiento: 87.5,
      citas_por_dia: [
        { fecha: '2025-01-20', total_citas: 18, completadas: 16, canceladas: 2, no_asistio: 0 },
        { fecha: '2025-01-21', total_citas: 22, completadas: 20, canceladas: 1, no_asistio: 1 },
        { fecha: '2025-01-22', total_citas: 19, completadas: 17, canceladas: 2, no_asistio: 0 },
        { fecha: '2025-01-23', total_citas: 25, completadas: 22, canceladas: 2, no_asistio: 1 },
        { fecha: '2025-01-24', total_citas: 21, completadas: 19, canceladas: 1, no_asistio: 1 }
      ],
      citas_por_veterinario: [
        {
          veterinario_nombre: 'Dr. Carlos Rodríguez',
          total_citas: 78,
          completadas: 72,
          canceladas: 6,
          duracion_promedio: 28
        },
        {
          veterinario_nombre: 'Dra. Ana García',
          total_citas: 69,
          completadas: 61,
          canceladas: 8,
          duracion_promedio: 32
        },
        {
          veterinario_nombre: 'Dr. Luis Martínez',
          total_citas: 71,
          completadas: 65,
          canceladas: 6,
          duracion_promedio: 25
        },
        {
          veterinario_nombre: 'Dra. María López',
          total_citas: 69,
          completadas: 53,
          canceladas: 8,
          duracion_promedio: 30
        }
      ],
      tipos_consulta: [
        { tipo: 'Consulta General', cantidad: 98, porcentaje: 34.1, duracion_promedio: 25 },
        { tipo: 'Vacunación', cantidad: 67, porcentaje: 23.3, duracion_promedio: 15 },
        { tipo: 'Control Preventivo', cantidad: 45, porcentaje: 15.7, duracion_promedio: 20 },
        { tipo: 'Urgencias', cantidad: 32, porcentaje: 11.1, duracion_promedio: 45 },
        { tipo: 'Cirugía Menor', cantidad: 28, porcentaje: 9.8, duracion_promedio: 60 },
        { tipo: 'Odontología', cantidad: 17, porcentaje: 5.9, duracion_promedio: 40 }
      ],
      horarios_populares: [
        { hora: '08:00', cantidad_citas: 15, porcentaje: 5.2 },
        { hora: '09:00', cantidad_citas: 28, porcentaje: 9.8 },
        { hora: '10:00', cantidad_citas: 35, porcentaje: 12.2 },
        { hora: '11:00', cantidad_citas: 32, porcentaje: 11.1 },
        { hora: '14:00', cantidad_citas: 29, porcentaje: 10.1 },
        { hora: '15:00', cantidad_citas: 38, porcentaje: 13.2 },
        { hora: '16:00', cantidad_citas: 42, porcentaje: 14.6 },
        { hora: '17:00', cantidad_citas: 34, porcentaje: 11.8 }
      ]
    };
  }

  private getMockRendimientoDiario(): RendimientoDiario[] {
    return [
      { fecha: '2025-01-20', citas_programadas: 18, citas_completadas: 16, citas_canceladas: 2, tiempo_promedio_consulta: 28, ingresos_dia: 1450000 },
      { fecha: '2025-01-21', citas_programadas: 22, citas_completadas: 20, citas_canceladas: 1, tiempo_promedio_consulta: 26, ingresos_dia: 1780000 },
      { fecha: '2025-01-22', citas_programadas: 19, citas_completadas: 17, citas_canceladas: 2, tiempo_promedio_consulta: 30, ingresos_dia: 1620000 },
      { fecha: '2025-01-23', citas_programadas: 25, citas_completadas: 22, citas_canceladas: 2, tiempo_promedio_consulta: 29, ingresos_dia: 2100000 },
      { fecha: '2025-01-24', citas_programadas: 21, citas_completadas: 19, citas_canceladas: 1, tiempo_promedio_consulta: 27, ingresos_dia: 1890000 }
    ];
  }

  ngOnDestroy(): void {
    // Limpiar gráficos al destruir el componente
    if (this.citasChart) {
      this.citasChart.destroy();
    }
    if (this.horariosChart) {
      this.horariosChart.destroy();
    }
    if (this.rendimientoChart) {
      this.rendimientoChart.destroy();
    }
    if (this.tiposConsultaChart) {
      this.tiposConsultaChart.destroy();
    }
  }
}