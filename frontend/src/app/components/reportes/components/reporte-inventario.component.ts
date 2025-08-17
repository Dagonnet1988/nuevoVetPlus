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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Router } from '@angular/router';

import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { 
  ReportesService,
  ReporteInventario,
  FiltroReporte,
  MovimientoInventario,
  ProductoRotacion,
  AnalisisABC,
  AlertaInventario
} from '../../../services/reportes.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-reporte-inventario',
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
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule
  ],
  templateUrl: './reporte-inventario.component.html',
  styleUrl: './reporte-inventario.component.css'
})
export class ReporteInventarioComponent implements OnInit, AfterViewInit {
  @ViewChild('valorInventarioChart') valorInventarioCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rotacionChart') rotacionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('movimientosChart') movimientosCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('abcChart') abcCanvas!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  reporteData = signal<ReporteInventario | null>(null);
  
  // Forms
  filtrosForm: FormGroup;
  
  // Charts
  private valorInventarioChart?: Chart;
  private rotacionChart?: Chart;
  private movimientosChart?: Chart;
  private abcChart?: Chart;

  // Table columns
  displayedColumnsABC = ['categoria', 'producto', 'valor', 'porcentaje', 'acumulado'];
  displayedColumnsRotacion = ['producto', 'categoria', 'rotacion', 'dias', 'stock'];
  displayedColumnsMovimientos = ['fecha', 'tipo', 'producto', 'cantidad', 'costo'];

  // Computed
  resumenInventario = computed(() => {
    const data = this.reporteData();
    if (!data) return null;

    return {
      valor_total: data.valor_total_inventario,
      productos_activos: data.productos_activos,
      productos_bajo_stock: data.productos_bajo_stock,
      productos_por_vencer: data.productos_por_vencer
    };
  });

  alertasCriticas = computed(() => {
    const data = this.reporteData();
    if (!data) return [];
    return data.alertas_inventario.filter(alerta => alerta.gravedad === 'alta');
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      fecha_inicio: [new Date(new Date().getFullYear(), new Date().getMonth(), 1)],
      fecha_fin: [new Date()],
      categoria_id: [''],
      tipo_analisis: ['abc'],
      incluir_vencidos: [false]
    });
  }

  ngOnInit(): void {
    this.loadReporteInventario();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  private loadReporteInventario(): void {
    this.loading.set(true);
    const filtros = this.buildFiltros();

    this.reportesService.getReporteInventario(filtros).subscribe({
      next: (data) => {
        this.reporteData.set(data);
        this.loading.set(false);
        
        // Crear gráficos después de cargar los datos
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error cargando reporte de inventario:', error);
        this.reporteData.set(this.getMockReporteInventario());
        this.loading.set(false);
        setTimeout(() => this.createCharts(), 100);
        this.snackBar.open('Usando datos de demostración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilterSubscription(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.loadReporteInventario();
    });
  }

  private buildFiltros(): FiltroReporte {
    const formValue = this.filtrosForm.value;
    return {
      fecha_inicio: formValue.fecha_inicio?.toISOString().split('T')[0] || '',
      fecha_fin: formValue.fecha_fin?.toISOString().split('T')[0] || '',
      categoria_id: formValue.categoria_id || undefined,
      tipo: formValue.tipo_analisis || 'abc'
    };
  }

  private createCharts(): void {
    const data = this.reporteData();
    if (!data) return;

    this.createValorInventarioChart();
    this.createRotacionChart(data.productos_mas_rotacion);
    this.createMovimientosChart(data.movimientos_periodo);
    this.createABCChart(data.analisis_abc);
  }

  private createValorInventarioChart(): void {
    if (!this.valorInventarioCanvas) return;

    if (this.valorInventarioChart) {
      this.valorInventarioChart.destroy();
    }

    const ctx = this.valorInventarioCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Datos de ejemplo para distribución de valor por categoría
    const categorias = ['Medicamentos', 'Suplementos', 'Accesorios', 'Instrumental', 'Consumibles'];
    const valores = [12500000, 8750000, 4200000, 6800000, 3400000];
    const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: categorias,
        datasets: [{
          data: valores,
          backgroundColor: colores,
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderWidth: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Valor de Inventario por Categoría',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = ((context.parsed / valores.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                return `${context.label}: ${this.formatearMoneda(context.parsed)} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.valorInventarioChart = new Chart(ctx, config);
  }

  private createRotacionChart(data: ProductoRotacion[]): void {
    if (!this.rotacionCanvas) return;

    if (this.rotacionChart) {
      this.rotacionChart.destroy();
    }

    const ctx = this.rotacionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const topProductos = data.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topProductos.map(p => p.nombre),
        datasets: [{
          label: 'Rotación (veces/año)',
          data: topProductos.map(p => p.rotacion),
          backgroundColor: 'rgba(69, 183, 209, 0.8)',
          borderColor: '#45B7D1',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Productos - Rotación de Inventario',
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
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Rotación (veces por año)'
            }
          },
          y: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        }
      }
    };

    this.rotacionChart = new Chart(ctx, config);
  }

  private createMovimientosChart(data: MovimientoInventario[]): void {
    if (!this.movimientosCanvas) return;

    if (this.movimientosChart) {
      this.movimientosChart.destroy();
    }

    const ctx = this.movimientosCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Agrupar movimientos por fecha y tipo
    const movimientosPorFecha = this.agruparMovimientosPorFecha(data);
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: Object.keys(movimientosPorFecha),
        datasets: [{
          label: 'Entradas',
          data: Object.values(movimientosPorFecha).map((d: any) => d.entradas),
          borderColor: '#4ECDC4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Salidas',
          data: Object.values(movimientosPorFecha).map((d: any) => d.salidas),
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
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
            text: 'Movimientos de Inventario por Período',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Movimientos'
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

    this.movimientosChart = new Chart(ctx, config);
  }

  private createABCChart(data: AnalisisABC[]): void {
    if (!this.abcCanvas) return;

    if (this.abcChart) {
      this.abcChart.destroy();
    }

    const ctx = this.abcCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Contar productos por categoría ABC
    const conteoABC = {
      A: data.filter(p => p.categoria_abc === 'A').length,
      B: data.filter(p => p.categoria_abc === 'B').length,
      C: data.filter(p => p.categoria_abc === 'C').length
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['Categoría A (Alto valor)', 'Categoría B (Valor medio)', 'Categoría C (Bajo valor)'],
        datasets: [{
          label: 'Cantidad de Productos',
          data: [conteoABC.A, conteoABC.B, conteoABC.C],
          backgroundColor: ['#FF6B6B', '#FFA07A', '#98D8C8'],
          borderColor: ['#FF6B6B', '#FFA07A', '#98D8C8'],
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Análisis ABC - Distribución de Productos',
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
              text: 'Número de Productos'
            }
          }
        }
      }
    };

    this.abcChart = new Chart(ctx, config);
  }

  private agruparMovimientosPorFecha(movimientos: MovimientoInventario[]): any {
    const agrupados: any = {};
    
    movimientos.forEach(mov => {
      const fecha = mov.fecha;
      if (!agrupados[fecha]) {
        agrupados[fecha] = { entradas: 0, salidas: 0 };
      }
      
      if (mov.tipo_movimiento === 'entrada') {
        agrupados[fecha].entradas++;
      } else if (mov.tipo_movimiento === 'salida') {
        agrupados[fecha].salidas++;
      }
    });
    
    return agrupados;
  }

  // FUNCIONALIDAD DE EXPORTACIÓN REMOVIDA - No disponible en backend

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
    return `${valor.toFixed(1)}%`;
  }

  getAlertaIcon(tipo: string): string {
    switch (tipo) {
      case 'stock_bajo': return 'inventory_2';
      case 'producto_vencido': return 'schedule';
      case 'sin_movimiento': return 'pause_circle';
      default: return 'warning';
    }
  }

  getAlertaColor(gravedad: string): string {
    switch (gravedad) {
      case 'alta': return 'warn';
      case 'media': return 'accent';
      default: return 'primary';
    }
  }

  getCategoriaABCColor(categoria: 'A' | 'B' | 'C'): string {
    switch (categoria) {
      case 'A': return '#FF6B6B';
      case 'B': return '#FFA07A';
      case 'C': return '#98D8C8';
      default: return '#ccc';
    }
  }

  // Mock data para desarrollo
  private getMockReporteInventario(): ReporteInventario {
    return {
      valor_total_inventario: 35650000,
      productos_activos: 342,
      productos_bajo_stock: 23,
      productos_por_vencer: 8,
      movimientos_periodo: [
        {
          fecha: '2025-01-15',
          tipo_movimiento: 'entrada',
          producto_nombre: 'Antibiótico Canino',
          cantidad: 50,
          costo_unitario: 45000,
          costo_total: 2250000,
          motivo: 'Compra proveedor'
        },
        {
          fecha: '2025-01-16',
          tipo_movimiento: 'salida',
          producto_nombre: 'Vacuna Triple',
          cantidad: 25,
          costo_unitario: 85000,
          costo_total: 2125000,
          motivo: 'Venta a cliente'
        }
      ],
      productos_mas_rotacion: [
        {
          id_producto: '1',
          nombre: 'Antibiótico Amoxicilina',
          categoria: 'Medicamentos',
          cantidad_vendida: 180,
          stock_promedio: 25,
          rotacion: 7.2,
          dias_inventario: 51
        },
        {
          id_producto: '2',
          nombre: 'Vacuna Triple Canina',
          categoria: 'Vacunas',
          cantidad_vendida: 145,
          stock_promedio: 30,
          rotacion: 4.8,
          dias_inventario: 76
        }
      ],
      analisis_abc: [
        {
          categoria_abc: 'A',
          producto_nombre: 'Antibiótico Premium',
          valor_inventario: 5600000,
          porcentaje_acumulado: 15.7
        },
        {
          categoria_abc: 'A',
          producto_nombre: 'Kit Cirugía Completo',
          valor_inventario: 4800000,
          porcentaje_acumulado: 29.2
        },
        {
          categoria_abc: 'B',
          producto_nombre: 'Suplemento Vitamínico',
          valor_inventario: 2400000,
          porcentaje_acumulado: 35.9
        }
      ],
      alertas_inventario: [
        {
          tipo: 'stock_bajo',
          producto_nombre: 'Antibiótico Canino Premium',
          descripcion: 'Solo quedan 3 unidades en stock',
          gravedad: 'alta',
          fecha_alerta: '2025-01-30'
        },
        {
          tipo: 'producto_vencido',
          producto_nombre: 'Suplemento Vitamínico',
          descripcion: 'Vence en 7 días',
          gravedad: 'media',
          fecha_alerta: '2025-01-30'
        }
      ]
    };
  }

  ngOnDestroy(): void {
    // Limpiar gráficos al destruir el componente
    if (this.valorInventarioChart) {
      this.valorInventarioChart.destroy();
    }
    if (this.rotacionChart) {
      this.rotacionChart.destroy();
    }
    if (this.movimientosChart) {
      this.movimientosChart.destroy();
    }
    if (this.abcChart) {
      this.abcChart.destroy();
    }
  }
}