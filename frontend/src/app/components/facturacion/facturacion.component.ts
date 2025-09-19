import { Component, OnInit, signal, ViewChild, inject } from '@angular/core';
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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import {
  FacturacionService,
  Factura,
  Cotizacion,
  FacturaFilter,
  ResumenFacturacion,
  Caja
} from '../../services/facturacion.service';

// Configuración centralizada
import {
  FACTURACION_CONFIG,
  FacturacionUtils,
  ViewType,
  EstadoFactura,
  MetodoPago
} from './shared/facturacion.config';

@Component({
  selector: 'app-facturacion',
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatDividerModule
  ],
  templateUrl: './facturacion.component.html',
  styleUrl: './facturacion.component.css'
})
export class FacturacionComponent implements OnInit {
  // ===========================================
  // INYECCIÓN DE DEPENDENCIAS
  // ===========================================

  private readonly fb = inject(FormBuilder);
  private readonly facturacionService = inject(FacturacionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  // ===========================================
  // VIEWCHILD REFERENCES
  // ===========================================

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // ===========================================
  // ESTADO REACTIVO (SIGNALS)
  // ===========================================

  readonly loading = signal(false);
  readonly facturas = signal<Factura[]>([]);
  readonly cotizaciones = signal<Cotizacion[]>([]);
  readonly cajas = signal<Caja[]>([]);
  readonly resumen = signal<ResumenFacturacion>({
    total_facturas: 0,
    total_ventas_dia: 0,
    total_ventas_mes: 0,
    facturas_pendientes: 0,
    productos_mas_vendidos: [],
    ventas_por_metodo_pago: [],
    facturas_recientes: []
  });
  readonly currentView = signal<ViewType>('facturas');

  // ===========================================
  // FORMULARIOS Y CONFIGURACIÓN
  // ===========================================

  readonly filterForm: FormGroup;

  readonly displayedColumnsFacturas = [
    'codigo',
    'fecha',
    'cliente',
    'total',
    'metodo_pago',
    'estado',
    'acciones'
  ] as const;

  // ===========================================
  // CONSTANTES Y CONFIGURACIÓN
  // ===========================================

  private readonly PAGE_SIZE = FACTURACION_CONFIG.PAGINACION.DEFAULT_PAGE_SIZE;
  private readonly SNACKBAR_DURATION = FACTURACION_CONFIG.TIEMPOS.SNACKBAR_DURATION;

  // ===========================================
  // CONSTRUCTOR Y CICLO DE VIDA
  // ===========================================

  constructor() {
    this.filterForm = this.initializeFilterForm();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  // ===========================================
  // MÉTODOS DE INICIALIZACIÓN
  // ===========================================

  private initializeFilterForm(): FormGroup {
    return this.fb.group({
      search: [''],
      metodo_pago: [''],
      estado: [''],
      caja: [''],
      fecha_inicio: [''],
      fecha_fin: ['']
    });
  }

  private initializeComponent(): void {
    setTimeout(() => {
      this.loadInitialData();
      this.setupFiltersSubscription();
    });
  }

  // ===========================================
  // MÉTODOS DE CARGA DE DATOS
  // ===========================================

  private loadInitialData(): void {
    this.loadFacturas();
    this.loadCajas();
    this.loadResumen();
  }

  private loadFacturas(): void {
    this.loading.set(true);

    const filters = this.buildFacturaFilters();

    this.facturacionService.getFacturas(1, this.PAGE_SIZE, filters).subscribe({
      next: (response) => this.handleFacturasResponse(response),
      error: (error) => this.handleFacturasError(error)
    });
  }

  private loadCajas(): void {
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => this.cajas.set(Array.isArray(cajas) ? cajas : []),
      error: (error) => {
        console.error('Error cargando cajas:', error);
        this.cajas.set([]);
      }
    });
  }

  private loadResumen(): void {
    this.facturacionService.getResumenFacturacion().subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: (error) => console.error('Error cargando resumen:', error)
    });
  }

  // ===========================================
  // MANEJO DE RESPUESTAS Y ERRORES
  // ===========================================

  private handleFacturasResponse(response: any): void {
    const facturasArray = Array.isArray(response) ? response : [];
    this.facturas.set(facturasArray);
    this.loading.set(false);
  }

  private handleFacturasError(error: any): void {
    console.error('Error cargando facturas:', error);
    this.facturas.set([]);
    this.loading.set(false);
    this.showSnackbar('Error cargando facturas');
  }

  // ===========================================
  // UTILIDADES DE FORMULARIOS Y FILTROS
  // ===========================================

  private buildFacturaFilters(): FacturaFilter {
    const formValue = this.filterForm.value;
    const filters: FacturaFilter = {};

    if (formValue.search) filters.search = formValue.search;
    if (formValue.metodo_pago) filters.metodo_pago = formValue.metodo_pago;
    if (formValue.estado) filters.estado = formValue.estado;
    if (formValue.caja) filters.caja = formValue.caja;

    if (formValue.fecha_inicio) {
      filters.fecha_inicio = formValue.fecha_inicio.toISOString().split('T')[0];
    }

    if (formValue.fecha_fin) {
      filters.fecha_fin = formValue.fecha_fin.toISOString().split('T')[0];
    }

    return filters;
  }

  private setupFiltersSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      if (this.currentView() === 'facturas') {
        this.loadFacturas();
      }
    });
  }

  // ===========================================
  // ACCIONES DE LA VISTA
  // ===========================================

  changeView(view: ViewType): void {
    this.currentView.set(view);
    this.clearFilters();
  }

  clearFilters(): void {
    this.filterForm.reset();
    if (this.currentView() === 'facturas') {
      this.loadFacturas();
    }
  }

  // ===========================================
  // ACCIONES DE FACTURAS
  // ===========================================

  nuevaFactura(): void {
    this.router.navigate(['/facturacion/nueva']);
  }

  nuevaCotizacion(): void {
    this.router.navigate(['/facturacion/cotizacion/nueva']);
  }

  verFactura(factura: Factura): void {
    this.router.navigate(['/facturacion', factura.id_factura]);
  }

  editarFactura(factura: Factura): void {
    this.router.navigate(['/facturacion', factura.id_factura, 'editar']);
  }

  cancelarFactura(factura: Factura): void {
    const confirmed = confirm(`¿Estás seguro de cancelar la factura ${factura.codigo_factura}?`);

    if (confirmed) {
      this.facturacionService.cancelarFactura(factura.id_factura).subscribe({
        next: () => {
          this.showSnackbar('Factura cancelada exitosamente');
          this.refreshDataAfterAction();
        },
        error: (error) => {
          console.error('Error cancelando factura:', error);
          this.showSnackbar('Error cancelando factura');
        }
      });
    }
  }

  exportarFactura(factura: Factura): void {
    this.facturacionService.exportarFactura(factura.id_factura, 'pdf').subscribe({
      next: (blob) => this.downloadBlob(blob, `factura-${factura.codigo_factura}.pdf`),
      error: (error) => {
        console.error('Error exportando factura:', error);
        this.showSnackbar('Error exportando factura');
      }
    });
  }

  enviarWhatsApp(factura: Factura): void {
    const telefono = factura.cliente?.telefono;

    if (!telefono) {
      this.showSnackbar('El cliente no tiene teléfono registrado');
      return;
    }

    this.facturacionService.enviarFacturaPorWhatsApp(factura.id_factura, telefono).subscribe({
      next: () => this.showSnackbar('Factura enviada por WhatsApp'),
      error: (error) => {
        console.error('Error enviando por WhatsApp:', error);
        this.showSnackbar('Error enviando por WhatsApp');
      }
    });
  }

  // ===========================================
  // ACCIONES DE CAJAS
  // ===========================================

  verMovimientosCaja(caja: Caja): void {
    this.router.navigate(['/facturacion/cajas', caja.id_caja, 'movimientos']);
  }

  // ===========================================
  // UTILIDADES DE FORMATO Y UI
  // ===========================================

  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  formatearFecha(fecha: string): string {
    return FacturacionUtils.formatearFecha(fecha);
  }

  getEstadoColor(estado: string): string {
    return FacturacionUtils.getEstadoColor(estado as EstadoFactura);
  }

  getMetodoColor(metodo: string): string {
    return FacturacionUtils.getMetodoPagoColor(metodo as MetodoPago);
  }

  getCajaIcon(tipo: string): string {
    return FacturacionUtils.getCajaIcon(tipo as any);
  }

  // ===========================================
  // UTILIDADES PRIVADAS
  // ===========================================

  private refreshDataAfterAction(): void {
    this.loadFacturas();
    this.loadResumen();
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private showSnackbar(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: this.SNACKBAR_DURATION });
  }
}
