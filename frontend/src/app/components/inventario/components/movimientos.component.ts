import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { ProductosService, MovimientoInventario, Producto } from '../../../services/productos.service';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="movimientos-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">swap_horiz</mat-icon>
              Movimientos de Inventario
            </h1>
            <p class="page-subtitle">Control completo de entradas, salidas y ajustes de stock</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button (click)="exportarMovimientos()">
              <mat-icon>file_download</mat-icon>
              Exportar
            </button>
            <button mat-raised-button color="primary" (click)="nuevoMovimiento()">
              <mat-icon>add</mat-icon>
              Nuevo Movimiento
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon success-color">trending_up</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalEntradas() }}</span>
                <span class="stat-label">Entradas Hoy</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon error-color">trending_down</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalSalidas() }}</span>
                <span class="stat-label">Salidas Hoy</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon warn-color">tune</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalAjustes() }}</span>
                <span class="stat-label">Ajustes Hoy</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">inventory</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ productosAfectados() }}</span>
                <span class="stat-label">Productos Afectados</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <div class="filter-row">
              <mat-form-field appearance="outline" class="producto-field">
                <mat-label>Producto</mat-label>
                <mat-select formControlName="producto">
                  <mat-option value="">Todos los productos</mat-option>
                  @for (producto of productos(); track producto.id_producto) {
                    <mat-option [value]="producto.id_producto">
                      {{ producto.nombre }} ({{ producto.codigo }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="tipo-field">
                <mat-label>Tipo de Movimiento</mat-label>
                <mat-select formControlName="tipo_movimiento">
                  <mat-option value="">Todos los tipos</mat-option>
                  @for (tipo of tiposMovimiento; track tipo.value) {
                    <mat-option [value]="tipo.value">{{ tipo.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="fecha-field">
                <mat-label>Fecha desde</mat-label>
                <input matInput [matDatepicker]="fechaInicioPicker" formControlName="fecha_inicio">
                <mat-datepicker-toggle matIconSuffix [for]="fechaInicioPicker"></mat-datepicker-toggle>
                <mat-datepicker #fechaInicioPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" class="fecha-field">
                <mat-label>Fecha hasta</mat-label>
                <input matInput [matDatepicker]="fechaFinPicker" formControlName="fecha_fin">
                <mat-datepicker-toggle matIconSuffix [for]="fechaFinPicker"></mat-datepicker-toggle>
                <mat-datepicker #fechaFinPicker></mat-datepicker>
              </mat-form-field>

              <button mat-stroked-button 
                      type="button"
                      (click)="clearFilters()">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de movimientos -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>swap_horiz</mat-icon>
            Historial de Movimientos ({{ totalMovimientos() }})
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Cargando movimientos...</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="movimientos()" matSort class="movimientos-table">
                
                <!-- Columna Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <div class="fecha-info">
                      <span class="fecha-date">{{ formatearFecha(movimiento.fecha_movimiento) }}</span>
                      <span class="fecha-time">{{ formatearHora(movimiento.fecha_movimiento) }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Producto -->
                <ng-container matColumnDef="producto">
                  <th mat-header-cell *matHeaderCellDef>Producto</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <div class="producto-info">
                      <span class="producto-nombre">{{ getProductoNombre(movimiento.id_producto) }}</span>
                      <span class="producto-codigo">{{ getProductoCodigo(movimiento.id_producto) }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Tipo -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <mat-chip [style.background-color]="getTipoColor(movimiento.tipo_movimiento)"
                              [style.color]="'white'"
                              class="tipo-chip">
                      <mat-icon class="chip-icon">{{ getTipoIcon(movimiento.tipo_movimiento) }}</mat-icon>
                      {{ getTipoLabel(movimiento.tipo_movimiento) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Columna Cantidad -->
                <ng-container matColumnDef="cantidad">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Cantidad</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <div class="cantidad-info">
                      <span class="cantidad-valor" 
                            [class.positivo]="isEntrada(movimiento.tipo_movimiento)"
                            [class.negativo]="isSalida(movimiento.tipo_movimiento)">
                        {{ isEntrada(movimiento.tipo_movimiento) ? '+' : '-' }}{{ movimiento.cantidad }}
                      </span>
                      <span class="cantidad-unidad">{{ getProductoUnidad(movimiento.id_producto) }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Stock -->
                <ng-container matColumnDef="stock">
                  <th mat-header-cell *matHeaderCellDef>Stock</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <div class="stock-change">
                      <span class="stock-anterior">{{ movimiento.stock_anterior }}</span>
                      <mat-icon class="stock-arrow">arrow_forward</mat-icon>
                      <span class="stock-nuevo">{{ movimiento.stock_nuevo }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Precio -->
                <ng-container matColumnDef="precio">
                  <th mat-header-cell *matHeaderCellDef>Precio Unit.</th>
                  <td mat-cell *matCellDef="let movimiento">
                    @if (movimiento.precio_unitario) {
                      <span class="precio-unitario">{{ formatearPrecio(movimiento.precio_unitario) }}</span>
                    } @else {
                      <span class="precio-na">N/A</span>
                    }
                  </td>
                </ng-container>

                <!-- Columna Motivo -->
                <ng-container matColumnDef="motivo">
                  <th mat-header-cell *matHeaderCellDef>Motivo</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <span class="motivo-text" [matTooltip]="movimiento.motivo">
                      {{ truncateText(movimiento.motivo, 30) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Columna Usuario -->
                <ng-container matColumnDef="usuario">
                  <th mat-header-cell *matHeaderCellDef>Usuario</th>
                  <td mat-cell *matCellDef="let movimiento">
                    <span class="usuario-nombre">{{ movimiento.usuario_responsable }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              @if (movimientos().length === 0) {
                <div class="no-data">
                  <mat-icon>swap_horiz</mat-icon>
                  <h3>No hay movimientos</h3>
                  <p>No se encontraron movimientos con los filtros aplicados</p>
                  <button mat-raised-button color="primary" (click)="nuevoMovimiento()">
                    <mat-icon>add</mat-icon>
                    Registrar primer movimiento
                  </button>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './movimientos.component.css'
})
export class MovimientosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals
  loading = signal(false);
  movimientos = signal<MovimientoInventario[]>([]);
  productos = signal<Producto[]>([]);
  totalMovimientos = signal(0);

  // Form
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = [
    'fecha',
    'producto', 
    'tipo',
    'cantidad',
    'stock',
    'precio',
    'motivo',
    'usuario'
  ];

  // Tipos de movimiento
  tiposMovimiento = [
    { value: 'entrada', label: 'Entrada', icon: 'trending_up', color: '#4caf50' },
    { value: 'salida', label: 'Salida', icon: 'trending_down', color: '#f44336' },
    { value: 'ajuste', label: 'Ajuste', icon: 'tune', color: '#ff9800' },
    { value: 'venta', label: 'Venta', icon: 'sell', color: '#2196f3' },
    { value: 'devolucion', label: 'Devolución', icon: 'undo', color: '#9c27b0' }
  ];

  constructor(
    private fb: FormBuilder,
    private productosService: ProductosService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      producto: [''],
      tipo_movimiento: [''],
      fecha_inicio: [''],
      fecha_fin: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  private loadInitialData(): void {
    this.loadMovimientos();
    this.loadProductos();
  }

  private loadMovimientos(): void {
    this.loading.set(true);
    
    const filtros = {
      producto: this.filterForm.value.producto || undefined,
      tipo_movimiento: this.filterForm.value.tipo_movimiento || undefined,
      fecha_inicio: this.filterForm.value.fecha_inicio ? 
        this.filterForm.value.fecha_inicio.toISOString().split('T')[0] : undefined,
      fecha_fin: this.filterForm.value.fecha_fin ? 
        this.filterForm.value.fecha_fin.toISOString().split('T')[0] : undefined
    };

    this.productosService.getMovimientos(1, 100, filtros).subscribe({
      next: (response) => {
        const data = response?.data;
        const movimientosArray = Array.isArray(data) ? data : [];
        this.movimientos.set(movimientosArray);
        this.totalMovimientos.set(response?.total || 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        this.movimientos.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando movimientos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadProductos(): void {
    this.productosService.getProductos(1, 1000).subscribe({
      next: (response) => {
        const data = response?.data;
        this.productos.set(Array.isArray(data) ? data : []);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.productos.set([]);
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadMovimientos();
    });
  }

  // Computed properties para estadísticas
  totalEntradas(): number {
    return this.movimientos().filter(m => 
      this.isEntrada(m.tipo_movimiento) && this.esDeHoy(m.fecha_movimiento)
    ).length;
  }

  totalSalidas(): number {
    return this.movimientos().filter(m => 
      this.isSalida(m.tipo_movimiento) && this.esDeHoy(m.fecha_movimiento)
    ).length;
  }

  totalAjustes(): number {
    return this.movimientos().filter(m => 
      m.tipo_movimiento === 'ajuste' && this.esDeHoy(m.fecha_movimiento)
    ).length;
  }

  productosAfectados(): number {
    const productosUnicos = new Set(
      this.movimientos()
        .filter(m => this.esDeHoy(m.fecha_movimiento))
        .map(m => m.id_producto)
    );
    return productosUnicos.size;
  }

  // Utilidades
  getProductoNombre(idProducto: string): string {
    const producto = this.productos().find(p => p.id_producto === idProducto);
    return producto?.nombre || 'Producto no encontrado';
  }

  getProductoCodigo(idProducto: string): string {
    const producto = this.productos().find(p => p.id_producto === idProducto);
    return producto?.codigo || '';
  }

  getProductoUnidad(idProducto: string): string {
    const producto = this.productos().find(p => p.id_producto === idProducto);
    return producto?.unidad_medida || '';
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposMovimiento.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  }

  getTipoIcon(tipo: string): string {
    const tipoObj = this.tiposMovimiento.find(t => t.value === tipo);
    return tipoObj?.icon || 'swap_horiz';
  }

  getTipoColor(tipo: string): string {
    const tipoObj = this.tiposMovimiento.find(t => t.value === tipo);
    return tipoObj?.color || '#666';
  }

  isEntrada(tipo: string): boolean {
    return tipo === 'entrada' || tipo === 'devolucion';
  }

  isSalida(tipo: string): boolean {
    return tipo === 'salida' || tipo === 'venta';
  }

  esDeHoy(fecha: string): boolean {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaMovimiento = new Date(fecha).toISOString().split('T')[0];
    return hoy === fechaMovimiento;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPrecio(precio: number): string {
    return this.productosService.formatearPrecio(precio);
  }

  truncateText(text: string, length: number = 50): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  // Acciones
  nuevoMovimiento(): void {
    // Implementar diálogo de nuevo movimiento
    this.snackBar.open('Función de nuevo movimiento en desarrollo', 'Cerrar', { duration: 3000 });
  }

  exportarMovimientos(): void {
    this.productosService.getReporteMovimientos(
      this.filterForm.value.fecha_inicio?.toISOString().split('T')[0] || '',
      this.filterForm.value.fecha_fin?.toISOString().split('T')[0] || ''
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movimientos-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando movimientos:', error);
        this.snackBar.open('Error exportando movimientos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadMovimientos();
  }
}