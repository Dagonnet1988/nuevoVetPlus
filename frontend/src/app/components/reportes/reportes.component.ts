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
  templateUrl: './reportes.component.html',
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
  resumen = signal({ total_ventas_mes: 0, total_facturas: 0 });

  kpis = computed(() => this.dashboardData()?.kpis_principales || []);
  alertasCriticas = computed(() => this.dashboardData()?.alertas_criticas || []);
  metricasOperativas = computed(() => this.dashboardData()?.metricas_operativas || []);

  // Form
  filtrosForm: FormGroup;

  // Stats para cards de navegación - ahora se calculan dinámicamente
  get statsVentas() {
    const resumen = this.resumen;
    return {
      ventas_mes: resumen().total_ventas_mes || 0,
      total_facturas: resumen().total_facturas || 0,
      total_pacientes: 0, // Se obtendrá de otro endpoint
      pacientes_nuevos: 0, // Se obtendrá de otro endpoint
      valor_inventario: 0, // Se obtendrá de otro endpoint
      productos_activos: 0, // Se obtendrá de otro endpoint
      citas_mes: 0, // Se obtendrá de otro endpoint
      tasa_cumplimiento: 0 // Se obtendrá de otro endpoint
    };
  }

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
        // Actualizar resumen para las cards de navegación
        this.resumen.set({
          total_ventas_mes: data.resumen_financiero?.ingresos_mes || 0,
          total_facturas: data.kpis_principales?.find(k => k.nombre === 'Pacientes Nuevos')?.valor_actual || 0
        });
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error cargando dashboard:', error);
        this.dashboardData.set(null);
        this.resumen.set({ total_ventas_mes: 0, total_facturas: 0 });
        this.loading.set(false);
        this.snackBar.open('Error cargando datos del dashboard', 'Cerrar', { duration: 3000 });
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

}
