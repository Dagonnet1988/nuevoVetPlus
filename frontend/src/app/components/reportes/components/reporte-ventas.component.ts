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
import { Router } from '@angular/router';

import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { 
  ReportesService,
  ReporteVentas,
  FiltroReporte,
  VentasPorPeriodo,
  VentasPorCategoria,
  VentasPorVeterinario
} from '../../../services/reportes.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-reporte-ventas',
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
    MatDividerModule
  ],
  templateUrl: './reporte-ventas.component.html',
  styleUrl: './reporte-ventas.component.css'
})
export class ReporteVentasComponent implements OnInit, AfterViewInit {
  @ViewChild('ventasPorPeriodoChart') ventasPorPeriodoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ventasPorCategoriaChart') ventasPorCategoriaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ventasPorVeterinarioChart') ventasPorVeterinarioCanvas!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  reporteData = signal<ReporteVentas | null>(null);
  
  // Forms
  filtrosForm: FormGroup;
  
  // Charts
  private ventasPeriodoChart?: Chart;
  private ventasCategoriaChart?: Chart;
  private ventasVeterinarioChart?: Chart;

  // Computed
  resumenVentas = computed(() => {
    const data = this.reporteData();
    if (!data) return null;

    return {
      total_ventas: data.resumen_general.total_ventas,
      total_facturas: data.resumen_general.total_facturas,
      promedio_venta: data.resumen_general.promedio_venta,
      crecimiento: data.comparacion_periodo_anterior?.porcentaje_cambio || 0
    };
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      fecha_inicio: [new Date(new Date().getFullYear(), new Date().getMonth(), 1)],
      fecha_fin: [new Date()],
      veterinario_id: [''],
      categoria_id: [''],
      tipo_reporte: ['mensual']
    });
  }

  ngOnInit(): void {
    this.loadReporteVentas();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  private loadReporteVentas(): void {
    this.loading.set(true);
    const filtros = this.buildFiltros();

    this.reportesService.getReporteVentas(filtros).subscribe({
      next: (data) => {
        this.reporteData.set(data);
        this.loading.set(false);
        
        // Crear gráficos después de cargar los datos
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error cargando reporte de ventas:', error);
        this.reporteData.set(this.getMockReporteVentas());
        this.loading.set(false);
        setTimeout(() => this.createCharts(), 100);
        this.snackBar.open('Usando datos de demostración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilterSubscription(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.loadReporteVentas();
    });
  }

  private buildFiltros(): FiltroReporte {
    const formValue = this.filtrosForm.value;
    return {
      fecha_inicio: formValue.fecha_inicio?.toISOString().split('T')[0] || '',
      fecha_fin: formValue.fecha_fin?.toISOString().split('T')[0] || '',
      veterinario_id: formValue.veterinario_id || undefined,
      categoria_id: formValue.categoria_id || undefined,
      tipo_reporte: formValue.tipo_reporte || 'mensual'
    };
  }

  private createCharts(): void {
    const data = this.reporteData();
    if (!data) return;

    this.createVentasPorPeriodoChart(data.ventas_por_periodo);
    this.createVentasPorCategoriaChart(data.ventas_por_categoria);
    this.createVentasPorVeterinarioChart(data.ventas_por_veterinario);
  }

  private createVentasPorPeriodoChart(data: VentasPorPeriodo[]): void {
    if (!this.ventasPorPeriodoCanvas) return;

    // Destruir gráfico anterior si existe
    if (this.ventasPeriodoChart) {
      this.ventasPeriodoChart.destroy();
    }

    const ctx = this.ventasPorPeriodoCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.periodo),
        datasets: [{
          label: 'Ventas ($)',
          data: data.map(d => d.total_ventas),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(49, 130, 206, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Cantidad de Facturas',
          data: data.map(d => d.cantidad_facturas),
          borderColor: '#38a169',
          backgroundColor: 'rgba(56, 161, 105, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Evolución de Ventas por Período'
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Ventas ($)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Cantidad'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    this.ventasPeriodoChart = new Chart(ctx, config);
  }

  private createVentasPorCategoriaChart(data: VentasPorCategoria[]): void {
    if (!this.ventasPorCategoriaCanvas) return;

    if (this.ventasCategoriaChart) {
      this.ventasCategoriaChart.destroy();
    }

    const ctx = this.ventasPorCategoriaCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = [
      '#3182ce', '#38a169', '#ed8936', '#805ad5', '#e53e3e',
      '#38b2ac', '#f56565', '#4299e1', '#48bb78', '#f6ad55'
    ];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [{
          data: data.map(d => d.total_ventas),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Ventas por Categoría'
          },
          legend: {
            position: 'right'
          }
        }
      }
    };

    this.ventasCategoriaChart = new Chart(ctx, config);
  }

  private createVentasPorVeterinarioChart(data: VentasPorVeterinario[]): void {
    if (!this.ventasPorVeterinarioCanvas) return;

    if (this.ventasVeterinarioChart) {
      this.ventasVeterinarioChart.destroy();
    }

    const ctx = this.ventasPorVeterinarioCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.veterinario_nombre),
        datasets: [{
          label: 'Ventas ($)',
          data: data.map(d => d.total_ventas),
          backgroundColor: 'rgba(49, 130, 206, 0.8)',
          borderColor: '#3182ce',
          borderWidth: 1
        }, {
          label: 'Cantidad de Consultas',
          data: data.map(d => d.cantidad_consultas),
          backgroundColor: 'rgba(56, 161, 105, 0.8)',
          borderColor: '#38a169',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Rendimiento por Veterinario'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Monto ($) / Cantidad'
            }
          }
        }
      }
    };

    this.ventasVeterinarioChart = new Chart(ctx, config);
  }

  // FUNCIONALIDAD DE EXPORTACIÓN REMOVIDA - No disponible en backend
  // Los datos pueden ser copiados manualmente desde las tablas y gráficos

  volverAReportes(): void {
    this.router.navigate(['/reportes']);
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
  }

  formatearPorcentaje(valor: number): string {
    return `${valor > 0 ? '+' : ''}${valor.toFixed(1)}%`;
  }

  getAbsoluteValue(valor: number): number {
    return Math.abs(valor);
  }

  // Mock data para desarrollo
  private getMockReporteVentas(): ReporteVentas {
    return {
      resumen_general: {
        total_ventas: 15750000,
        total_facturas: 324,
        promedio_venta: 48611,
        crecimiento_mensual: 12.5
      },
      comparacion_periodo_anterior: {
        periodo_anterior: 14025000,
        porcentaje_cambio: 12.3,
        diferencia_absoluta: 1725000
      },
      ventas_por_periodo: [
        { periodo: 'Ene 2025', total_ventas: 12500000, cantidad_facturas: 285 },
        { periodo: 'Feb 2025', total_ventas: 13200000, cantidad_facturas: 298 },
        { periodo: 'Mar 2025', total_ventas: 14100000, cantidad_facturas: 312 },
        { periodo: 'Abr 2025', total_ventas: 13800000, cantidad_facturas: 306 },
        { periodo: 'May 2025', total_ventas: 15200000, cantidad_facturas: 318 },
        { periodo: 'Jun 2025', total_ventas: 15750000, cantidad_facturas: 324 }
      ],
      ventas_por_categoria: [
        { categoria: 'Consultas', total_ventas: 6300000, porcentaje: 40.0 },
        { categoria: 'Medicamentos', total_ventas: 4725000, porcentaje: 30.0 },
        { categoria: 'Cirugías', total_ventas: 3150000, porcentaje: 20.0 },
        { categoria: 'Vacunas', total_ventas: 1050000, porcentaje: 6.7 },
        { categoria: 'Accesorios', total_ventas: 525000, porcentaje: 3.3 }
      ],
      ventas_por_veterinario: [
        { 
          veterinario_id: '1', 
          veterinario_nombre: 'Dr. Carlos Rodríguez', 
          total_ventas: 5512500, 
          cantidad_consultas: 142, 
          promedio_consulta: 38820 
        },
        { 
          veterinario_id: '2', 
          veterinario_nombre: 'Dra. Ana García', 
          total_ventas: 4725000, 
          cantidad_consultas: 126, 
          promedio_consulta: 37500 
        },
        { 
          veterinario_id: '3', 
          veterinario_nombre: 'Dr. Luis Martínez', 
          total_ventas: 3937500, 
          cantidad_consultas: 98, 
          promedio_consulta: 40178 
        },
        { 
          veterinario_id: '4', 
          veterinario_nombre: 'Dra. María López', 
          total_ventas: 1575000, 
          cantidad_consultas: 42, 
          promedio_consulta: 37500 
        }
      ],
      top_servicios: [
        { servicio: 'Consulta General', cantidad: 156, total_ventas: 3120000 },
        { servicio: 'Vacunación', cantidad: 89, total_ventas: 890000 },
        { servicio: 'Cirugía Menor', cantidad: 34, total_ventas: 1700000 },
        { servicio: 'Desparasitación', cantidad: 67, total_ventas: 335000 },
        { servicio: 'Control Odontológico', cantidad: 23, total_ventas: 460000 }
      ],
      tendencias: {
        mejor_dia_semana: 'Viernes',
        mejor_hora: '10:00 AM',
        estacionalidad: 'Crecimiento constante',
        prediccion_proximo_mes: 16800000
      }
    };
  }

  ngOnDestroy(): void {
    // Limpiar gráficos al destruir el componente
    if (this.ventasPeriodoChart) {
      this.ventasPeriodoChart.destroy();
    }
    if (this.ventasCategoriaChart) {
      this.ventasCategoriaChart.destroy();
    }
    if (this.ventasVeterinarioChart) {
      this.ventasVeterinarioChart.destroy();
    }
  }
}