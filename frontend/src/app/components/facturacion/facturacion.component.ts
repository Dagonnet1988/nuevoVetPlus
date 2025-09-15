import { Component, OnInit, signal, ViewChild } from '@angular/core';
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
  template: `
    <div class="facturacion-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">receipt</mat-icon>
              Sistema de Facturación
            </h1>
            <p class="page-subtitle">Gestión de facturas, cotizaciones y control de cajas</p>
          </div>
          <div class="actions-section">
            <button mat-raised-button
                    color="primary"
                    (click)="nuevaFactura()"
                    class="create-button">
              <mat-icon>add</mat-icon>
              Nueva Factura
            </button>
            <button mat-stroked-button
                    (click)="nuevaCotizacion()"
                    class="quote-button">
              <mat-icon>description</mat-icon>
              Nueva Cotización
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">receipt_long</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ resumen().total_facturas }}</span>
                <span class="stat-label">Total Facturas</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon success-color">today</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ formatearMoneda(resumen().total_ventas_dia) }}</span>
                <span class="stat-label">Ventas Hoy</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon accent-color">calendar_month</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ formatearMoneda(resumen().total_ventas_mes) }}</span>
                <span class="stat-label">Ventas del Mes</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon warn-color">pending</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ resumen().facturas_pendientes }}</span>
                <span class="stat-label">Pendientes</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Selector de vista -->
      <mat-card class="view-selector-card">
        <mat-card-content>
          <mat-button-toggle-group
            [value]="currentView()"
            (change)="changeView($event.value)"
            class="view-toggle">
            <mat-button-toggle value="facturas">
              <mat-icon>receipt</mat-icon>
              Facturas
            </mat-button-toggle>
            <mat-button-toggle value="cotizaciones">
              <mat-icon>description</mat-icon>
              Cotizaciones
            </mat-button-toggle>
            <mat-button-toggle value="cajas">
              <mat-icon>account_balance_wallet</mat-icon>
              Cajas
            </mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <div class="filter-row">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar</mat-label>
                <input matInput formControlName="search" placeholder="Código, cliente...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              @if (currentView() === 'facturas') {
                <mat-form-field appearance="outline" class="metodo-field">
                  <mat-label>Método de Pago</mat-label>
                  <mat-select formControlName="metodo_pago">
                    <mat-option value="">Todos</mat-option>
                    <mat-option value="Efectivo">Efectivo</mat-option>
                    <mat-option value="Tarjeta">Tarjeta</mat-option>
                    <mat-option value="Transferencia">Transferencia</mat-option>
                    <mat-option value="Cheque">Cheque</mat-option>
                    <mat-option value="Crédito">Crédito</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="caja-field">
                  <mat-label>Caja</mat-label>
                  <mat-select formControlName="caja">
                    <mat-option value="">Todas las cajas</mat-option>
                    @for (caja of cajas(); track caja.id_caja) {
                      <mat-option [value]="caja.id_caja">{{ caja.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <mat-form-field appearance="outline" class="estado-field">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="">Todos</mat-option>
                  @if (currentView() === 'facturas') {
                    <mat-option value="Pendiente">Pendiente</mat-option>
                    <mat-option value="Pagada">Pagada</mat-option>
                    <mat-option value="Cancelada">Cancelada</mat-option>
                  } @else if (currentView() === 'cotizaciones') {
                    <mat-option value="Vigente">Vigente</mat-option>
                    <mat-option value="Vencida">Vencida</mat-option>
                    <mat-option value="Convertida">Convertida</mat-option>
                    <mat-option value="Cancelada">Cancelada</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <button mat-stroked-button
                      type="button"
                      (click)="clearFilters()"
                      class="clear-filters-btn">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>
            </div>

            <div class="filter-row">
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
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Contenido principal según vista -->
      @switch (currentView()) {
        @case ('facturas') {
          <!-- Vista de Facturas -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>receipt</mat-icon>
                Facturas de Venta
              </mat-card-title>
            </mat-card-header>

            <mat-card-content>
              @if (loading()) {
                <div class="loading-container">
                  <mat-spinner diameter="50"></mat-spinner>
                  <p>Cargando facturas...</p>
                </div>
              } @else {
                <div class="table-container">
                  <table mat-table [dataSource]="facturas()" matSort class="facturas-table">

                    <!-- Columna Código -->
                    <ng-container matColumnDef="codigo">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Código</th>
                      <td mat-cell *matCellDef="let factura">
                        <span class="codigo-factura">{{ factura.codigo_factura }}</span>
                      </td>
                    </ng-container>

                    <!-- Columna Fecha -->
                    <ng-container matColumnDef="fecha">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
                      <td mat-cell *matCellDef="let factura">
                        {{ formatearFecha(factura.fecha) }}
                      </td>
                    </ng-container>

                    <!-- Columna Cliente -->
                    <ng-container matColumnDef="cliente">
                      <th mat-header-cell *matHeaderCellDef>Cliente</th>
                      <td mat-cell *matCellDef="let factura">
                        <div class="cliente-info">
                          <span class="cliente-nombre">{{ factura.cliente?.nombre || 'Cliente General' }}</span>
                          <span class="cliente-documento">{{ factura.cliente?.documento }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Columna Total -->
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th>
                      <td mat-cell *matCellDef="let factura">
                        <span class="total-factura">{{ formatearMoneda(factura.total) }}</span>
                      </td>
                    </ng-container>

                    <!-- Columna Método -->
                    <ng-container matColumnDef="metodo_pago">
                      <th mat-header-cell *matHeaderCellDef>Método</th>
                      <td mat-cell *matCellDef="let factura">
                        <mat-chip [style.background-color]="getMetodoColor(factura.metodo_pago)"
                                  [style.color]="'white'">
                          <mat-icon [ngSwitch]="factura.metodo_pago">
                            <span *ngSwitchCase="'Efectivo'">paid</span>
                            <span *ngSwitchCase="'Tarjeta'">credit_card</span>
                            <span *ngSwitchCase="'Transferencia'">account_balance</span>
                            <span *ngSwitchDefault>payment</span>
                          </mat-icon>
                          {{ factura.metodo_pago }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <!-- Columna Estado -->
                    <ng-container matColumnDef="estado">
                      <th mat-header-cell *matHeaderCellDef>Estado</th>
                      <td mat-cell *matCellDef="let factura">
                        <mat-chip [style.background-color]="getEstadoColor(factura.estado)"
                                  [style.color]="'white'">
                          {{ factura.estado }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <!-- Columna Acciones -->
                    <ng-container matColumnDef="acciones">
                      <th mat-header-cell *matHeaderCellDef>Acciones</th>
                      <td mat-cell *matCellDef="let factura">
                        <button mat-icon-button [matMenuTriggerFor]="facturaMenu" (click)="$event.stopPropagation()">
                          <mat-icon>more_vert</mat-icon>
                        </button>
                        <mat-menu #facturaMenu="matMenu">
                          <button mat-menu-item (click)="$event.stopPropagation(); verFactura(factura)">
                            <mat-icon>visibility</mat-icon>
                            Ver Detalles
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); editarFactura(factura)">
                            <mat-icon>edit</mat-icon>
                            Editar
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); exportarFactura(factura)">
                            <mat-icon>print</mat-icon>
                            Imprimir/PDF
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); enviarWhatsApp(factura)">
                            <mat-icon>send</mat-icon>
                            Enviar por WhatsApp
                          </button>
                          <mat-divider></mat-divider>
                          <button mat-menu-item (click)="$event.stopPropagation(); cancelarFactura(factura)"
                                  [disabled]="factura.estado === 'Cancelada'"
                                  class="delete-item">
                            <mat-icon>cancel</mat-icon>
                            Cancelar
                          </button>
                        </mat-menu>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumnsFacturas"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumnsFacturas;"
                        (click)="verFactura(row)"
                        class="clickable-row"></tr>
                  </table>

                  @if (facturas().length === 0) {
                    <div class="no-data">
                      <mat-icon>receipt</mat-icon>
                      <h3>No hay facturas</h3>
                      <p>No se encontraron facturas con los filtros aplicados</p>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        @case ('cotizaciones') {
          <!-- Vista de Cotizaciones -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>description</mat-icon>
                Cotizaciones
              </mat-card-title>
            </mat-card-header>

            <mat-card-content>
              <p>Vista de cotizaciones en desarrollo...</p>
            </mat-card-content>
          </mat-card>
        }

        @case ('cajas') {
          <!-- Vista de Cajas -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>account_balance_wallet</mat-icon>
                Control de Cajas
              </mat-card-title>
            </mat-card-header>

            <mat-card-content>
              <div class="cajas-grid">
                @for (caja of cajas(); track caja.id_caja) {
                  <mat-card class="caja-card" [class.inactive]="!caja.activa">
                    <mat-card-header>
                      <mat-card-title>
                        <mat-icon>{{ getCajaIcon(caja.tipo) }}</mat-icon>
                        {{ caja.nombre }}
                      </mat-card-title>
                      <mat-card-subtitle>{{ caja.tipo }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="caja-saldo">
                        <span class="saldo-label">Saldo Actual:</span>
                        <span class="saldo-valor">{{ formatearMoneda(caja.saldo_actual) }}</span>
                      </div>
                      @if (caja.descripcion) {
                        <p class="caja-descripcion">{{ caja.descripcion }}</p>
                      }
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button color="primary" (click)="verMovimientosCaja(caja)">
                        <mat-icon>history</mat-icon>
                        Ver Movimientos
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styleUrl: './facturacion.component.css'
})
export class FacturacionComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals para estado reactivo
  loading = signal(false);
  facturas = signal<Factura[]>([]);
  cotizaciones = signal<Cotizacion[]>([]);
  cajas = signal<Caja[]>([]);
  resumen = signal<ResumenFacturacion>({
    total_facturas: 0,
    total_ventas_dia: 0,
    total_ventas_mes: 0,
    facturas_pendientes: 0,
    productos_mas_vendidos: [],
    ventas_por_metodo_pago: [],
    facturas_recientes: []
  });
  currentView = signal<'facturas' | 'cotizaciones' | 'cajas'>('facturas');

  // Formulario de filtros
  filterForm: FormGroup;

  // Configuración de tablas
  displayedColumnsFacturas = [
    'codigo',
    'fecha',
    'cliente',
    'total',
    'metodo_pago',
    'estado',
    'acciones'
  ];

  constructor(
    private fb: FormBuilder,
    private facturacionService: FacturacionService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      metodo_pago: [''],
      estado: [''],
      caja: [''],
      fecha_inicio: [''],
      fecha_fin: ['']
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.loadInitialData();
      this.setupFilters();
    });
  }

  private loadInitialData(): void {
    this.loadFacturas();
    this.loadCajas();
    this.loadResumen();
  }

  private loadFacturas(): void {
    this.loading.set(true);

    const filters: FacturaFilter = {};

    if (this.filterForm.value.search) {
      filters.search = this.filterForm.value.search;
    }

    if (this.filterForm.value.metodo_pago) {
      filters.metodo_pago = this.filterForm.value.metodo_pago;
    }

    if (this.filterForm.value.estado) {
      filters.estado = this.filterForm.value.estado;
    }

    if (this.filterForm.value.caja) {
      filters.caja = this.filterForm.value.caja;
    }

    if (this.filterForm.value.fecha_inicio) {
      filters.fecha_inicio = this.filterForm.value.fecha_inicio.toISOString().split('T')[0];
    }

    if (this.filterForm.value.fecha_fin) {
      filters.fecha_fin = this.filterForm.value.fecha_fin.toISOString().split('T')[0];
    }

    this.facturacionService.getFacturas(1, 100, filters).subscribe({
      next: (response) => {
        // El servicio ya devuelve response.data directamente
        const facturasArray = Array.isArray(response) ? response : [];
        this.facturas.set(facturasArray);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando facturas:', error);
        this.facturas.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando facturas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadCajas(): void {
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => {
        this.cajas.set(Array.isArray(cajas) ? cajas : []);
      },
      error: (error) => {
        console.error('Error cargando cajas:', error);
        this.cajas.set([]);
      }
    });
  }

  private loadResumen(): void {
    this.facturacionService.getResumenFacturacion().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
      },
      error: (error) => {
        console.error('Error cargando resumen:', error);
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      if (this.currentView() === 'facturas') {
        this.loadFacturas();
      }
    });
  }

  // Cambiar vista
  changeView(view: 'facturas' | 'cotizaciones' | 'cajas'): void {
    this.currentView.set(view);
    this.clearFilters();
  }

  clearFilters(): void {
    this.filterForm.reset();
    if (this.currentView() === 'facturas') {
      this.loadFacturas();
    }
  }

  // Acciones de facturas
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
    if (confirm(`¿Estás seguro de cancelar la factura ${factura.codigo_factura}?`)) {
      this.facturacionService.cancelarFactura(factura.id_factura).subscribe({
        next: () => {
          this.snackBar.open('Factura cancelada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadFacturas();
          this.loadResumen();
        },
        error: (error) => {
          console.error('Error cancelando factura:', error);
          this.snackBar.open('Error cancelando factura', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  exportarFactura(factura: Factura): void {
    this.facturacionService.exportarFactura(factura.id_factura, 'pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${factura.codigo_factura}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando factura:', error);
        this.snackBar.open('Error exportando factura', 'Cerrar', { duration: 3000 });
      }
    });
  }

  enviarWhatsApp(factura: Factura): void {
    const telefono = factura.cliente?.telefono;
    if (!telefono) {
      this.snackBar.open('El cliente no tiene teléfono registrado', 'Cerrar', { duration: 3000 });
      return;
    }

    this.facturacionService.enviarFacturaPorWhatsApp(factura.id_factura, telefono).subscribe({
      next: () => {
        this.snackBar.open('Factura enviada por WhatsApp', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error enviando por WhatsApp:', error);
        this.snackBar.open('Error enviando por WhatsApp', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Acciones de cajas
  verMovimientosCaja(caja: Caja): void {
    this.router.navigate(['/facturacion/cajas', caja.id_caja, 'movimientos']);
  }

  // Utilidades para la vista
  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Pagada': return '#4caf50';
      case 'Pendiente': return '#ff9800';
      case 'Cancelada': return '#f44336';
      default: return '#666';
    }
  }

  getMetodoColor(metodo: string): string {
    switch (metodo) {
      case 'Efectivo': return '#4caf50';
      case 'Tarjeta': return '#2196f3';
      case 'Transferencia': return '#9c27b0';
      case 'Cheque': return '#ff9800';
      default: return '#666';
    }
  }

  getCajaIcon(tipo: string): string {
    switch (tipo) {
      case 'Caja Menor': return 'monetization_on';
      case 'Cuenta Bancaria': return 'account_balance';
      case 'Caja Fuerte': return 'security';
      default: return 'account_balance_wallet';
    }
  }
}
