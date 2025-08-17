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
import { Router } from '@angular/router';

import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { 
  ReportesService,
  ReportePacientes,
  FiltroReporte,
  EspecieDistribucion,
  EdadDistribucion,
  PacienteVeterinario,
  ConsultaFrecuente,
  TendenciaRegistro
} from '../../../services/reportes.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-reporte-pacientes',
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
    MatTabsModule
  ],
  templateUrl: './reporte-pacientes.component.html',
  styleUrl: './reporte-pacientes.component.css'
})
export class ReportePacientesComponent implements OnInit, AfterViewInit {
  @ViewChild('especiesChart') especiesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('edadesChart') edadesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tendenciaChart') tendenciaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('veterinariosChart') veterinariosCanvas!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  reporteData = signal<ReportePacientes | null>(null);
  
  // Forms
  filtrosForm: FormGroup;
  
  // Charts
  private especiesChart?: Chart;
  private edadesChart?: Chart;
  private tendenciaChart?: Chart;
  private veterinariosChart?: Chart;

  // Computed
  resumenPacientes = computed(() => {
    const data = this.reporteData();
    if (!data) return null;

    return {
      total_pacientes: data.total_pacientes,
      pacientes_nuevos: data.pacientes_nuevos,
      pacientes_activos: data.pacientes_activos,
      tasa_crecimiento: ((data.pacientes_nuevos / data.total_pacientes) * 100)
    };
  });

  especiesTop = computed(() => {
    const data = this.reporteData();
    if (!data) return [];
    return data.distribucion_especies.slice(0, 5);
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      fecha_inicio: [new Date(new Date().getFullYear(), new Date().getMonth(), 1)],
      fecha_fin: [new Date()],
      veterinario_id: [''],
      especie: [''],
      tipo_reporte: ['mensual']
    });
  }

  ngOnInit(): void {
    this.loadReportePacientes();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  private loadReportePacientes(): void {
    this.loading.set(true);
    const filtros = this.buildFiltros();

    this.reportesService.getReportePacientes(filtros).subscribe({
      next: (data) => {
        this.reporteData.set(data);
        this.loading.set(false);
        
        // Crear gráficos después de cargar los datos
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error cargando reporte de pacientes:', error);
        this.reporteData.set(this.getMockReportePacientes());
        this.loading.set(false);
        setTimeout(() => this.createCharts(), 100);
        this.snackBar.open('Usando datos de demostración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilterSubscription(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.loadReportePacientes();
    });
  }

  private buildFiltros(): FiltroReporte {
    const formValue = this.filtrosForm.value;
    return {
      fecha_inicio: formValue.fecha_inicio?.toISOString().split('T')[0] || '',
      fecha_fin: formValue.fecha_fin?.toISOString().split('T')[0] || '',
      veterinario_id: formValue.veterinario_id || undefined,
      tipo: formValue.especie || undefined,
      tipo_reporte: formValue.tipo_reporte || 'mensual'
    };
  }

  private createCharts(): void {
    const data = this.reporteData();
    if (!data) return;

    this.createEspeciesChart(data.distribucion_especies);
    this.createEdadesChart(data.distribucion_edades);
    this.createTendenciaChart(data.tendencia_registros);
    this.createVeterinariosChart(data.pacientes_por_veterinario);
  }

  private createEspeciesChart(data: EspecieDistribucion[]): void {
    if (!this.especiesCanvas) return;

    // Destruir gráfico anterior si existe
    if (this.especiesChart) {
      this.especiesChart.destroy();
    }

    const ctx = this.especiesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.especie),
        datasets: [{
          data: data.map(d => d.cantidad),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderWidth: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Especies',
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
                const percentage = ((context.parsed / data.reduce((a, b) => a + b.cantidad, 0)) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.especiesChart = new Chart(ctx, config);
  }

  private createEdadesChart(data: EdadDistribucion[]): void {
    if (!this.edadesCanvas) return;

    if (this.edadesChart) {
      this.edadesChart.destroy();
    }

    const ctx = this.edadesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.rango_edad),
        datasets: [{
          label: 'Cantidad de Pacientes',
          data: data.map(d => d.cantidad),
          backgroundColor: 'rgba(69, 183, 209, 0.8)',
          borderColor: '#45B7D1',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Edades',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = ((context.parsed.y / data.reduce((a, b) => a + b.cantidad, 0)) * 100).toFixed(1);
                return `${context.parsed.y} pacientes (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de Pacientes'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            title: {
              display: true,
              text: 'Rango de Edad'
            }
          }
        }
      }
    };

    this.edadesChart = new Chart(ctx, config);
  }

  private createTendenciaChart(data: TendenciaRegistro[]): void {
    if (!this.tendenciaCanvas) return;

    if (this.tendenciaChart) {
      this.tendenciaChart.destroy();
    }

    const ctx = this.tendenciaCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.fecha),
        datasets: [{
          label: 'Pacientes Nuevos',
          data: data.map(d => d.pacientes_nuevos),
          borderColor: '#4ECDC4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4ECDC4',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6
        }, {
          label: 'Consultas Realizadas',
          data: data.map(d => d.consultas_realizadas),
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#FF6B6B',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Tendencia de Registros y Consultas',
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
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Pacientes Nuevos'
            },
            beginAtZero: true
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Consultas'
            },
            beginAtZero: true,
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    this.tendenciaChart = new Chart(ctx, config);
  }

  private createVeterinariosChart(data: PacienteVeterinario[]): void {
    if (!this.veterinariosCanvas) return;

    if (this.veterinariosChart) {
      this.veterinariosChart.destroy();
    }

    const ctx = this.veterinariosCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.veterinario_nombre),
        datasets: [{
          label: 'Total Pacientes',
          data: data.map(d => d.total_pacientes),
          backgroundColor: 'rgba(152, 216, 200, 0.8)',
          borderColor: '#98D8C8',
          borderWidth: 2
        }, {
          label: 'Pacientes Activos',
          data: data.map(d => d.pacientes_activos),
          backgroundColor: 'rgba(69, 183, 209, 0.8)',
          borderColor: '#45B7D1',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Pacientes por Veterinario',
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
              text: 'Número de Pacientes'
            }
          }
        }
      }
    };

    this.veterinariosChart = new Chart(ctx, config);
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

  // Mock data para desarrollo
  private getMockReportePacientes(): ReportePacientes {
    return {
      total_pacientes: 1247,
      pacientes_nuevos: 89,
      pacientes_activos: 1098,
      distribucion_especies: [
        { especie: 'Caninos', cantidad: 789, porcentaje: 63.3 },
        { especie: 'Felinos', cantidad: 312, porcentaje: 25.0 },
        { especie: 'Aves', cantidad: 78, porcentaje: 6.3 },
        { especie: 'Roedores', cantidad: 45, porcentaje: 3.6 },
        { especie: 'Reptiles', cantidad: 23, porcentaje: 1.8 }
      ],
      distribucion_edades: [
        { rango_edad: '0-1 años', cantidad: 234, porcentaje: 18.8 },
        { rango_edad: '1-3 años', cantidad: 387, porcentaje: 31.0 },
        { rango_edad: '3-7 años', cantidad: 423, porcentaje: 33.9 },
        { rango_edad: '7-12 años', cantidad: 156, porcentaje: 12.5 },
        { rango_edad: '12+ años', cantidad: 47, porcentaje: 3.8 }
      ],
      pacientes_por_veterinario: [
        {
          veterinario_nombre: 'Dr. Carlos Rodríguez',
          total_pacientes: 342,
          pacientes_activos: 298,
          consultas_realizadas: 156
        },
        {
          veterinario_nombre: 'Dra. Ana García',
          total_pacientes: 298,
          pacientes_activos: 267,
          consultas_realizadas: 142
        },
        {
          veterinario_nombre: 'Dr. Luis Martínez',
          total_pacientes: 267,
          pacientes_activos: 234,
          consultas_realizadas: 128
        },
        {
          veterinario_nombre: 'Dra. María López',
          total_pacientes: 340,
          pacientes_activos: 299,
          consultas_realizadas: 167
        }
      ],
      consultas_frecuentes: [
        { motivo: 'Consulta General', cantidad: 234, porcentaje: 35.2 },
        { motivo: 'Vacunación', cantidad: 156, porcentaje: 23.4 },
        { motivo: 'Control Preventivo', cantidad: 98, porcentaje: 14.7 },
        { motivo: 'Urgencias', cantidad: 67, porcentaje: 10.1 },
        { motivo: 'Cirugía', cantidad: 45, porcentaje: 6.8 },
        { motivo: 'Odontología', cantidad: 34, porcentaje: 5.1 },
        { motivo: 'Dermatología', cantidad: 31, porcentaje: 4.7 }
      ],
      tendencia_registros: [
        { fecha: 'Ene 2025', pacientes_nuevos: 67, consultas_realizadas: 187 },
        { fecha: 'Feb 2025', pacientes_nuevos: 72, consultas_realizadas: 201 },
        { fecha: 'Mar 2025', pacientes_nuevos: 84, consultas_realizadas: 234 },
        { fecha: 'Abr 2025', pacientes_nuevos: 78, consultas_realizadas: 218 },
        { fecha: 'May 2025', pacientes_nuevos: 91, consultas_realizadas: 256 },
        { fecha: 'Jun 2025', pacientes_nuevos: 89, consultas_realizadas: 247 }
      ]
    };
  }

  ngOnDestroy(): void {
    // Limpiar gráficos al destruir el componente
    if (this.especiesChart) {
      this.especiesChart.destroy();
    }
    if (this.edadesChart) {
      this.edadesChart.destroy();
    }
    if (this.tendenciaChart) {
      this.tendenciaChart.destroy();
    }
    if (this.veterinariosChart) {
      this.veterinariosChart.destroy();
    }
  }
}