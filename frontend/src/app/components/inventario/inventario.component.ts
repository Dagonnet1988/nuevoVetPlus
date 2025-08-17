import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { ProductosService, Producto, ProductoFilter, InventarioResumen, CategoriaProducto } from '../../services/productos.service';

@Component({
  selector: 'app-inventario',
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="inventario-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">inventory</mat-icon>
              Inventario y Productos
            </h1>
            <p class="page-subtitle">Gestión completa de productos, stock y movimientos</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button (click)="exportarInventario()">
              <mat-icon>file_download</mat-icon>
              Exportar
            </button>
            <button mat-stroked-button (click)="importarProductos()">
              <mat-icon>file_upload</mat-icon>
              Importar
            </button>
            <button mat-raised-button color="primary" (click)="crearProducto()">
              <mat-icon>add</mat-icon>
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">inventory</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ resumen().total_productos }}</span>
                <span class="stat-label">Total Productos</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon success-color">attach_money</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ formatearPrecio(resumen().valor_total_inventario) }}</span>
                <span class="stat-label">Valor Total</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card alert-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon warn-color">warning</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ resumen().productos_stock_bajo }}</span>
                <span class="stat-label">Stock Bajo</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card alert-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon error-color">schedule</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ resumen().productos_vencimiento_proximo }}</span>
                <span class="stat-label">Por Vencer</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Alertas importantes -->
      @if (resumen().productos_stock_bajo > 0 || resumen().productos_vencimiento_proximo > 0) {
        <mat-card class="alerts-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>notification_important</mat-icon>
              Alertas del Inventario
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="alerts-grid">
              @if (resumen().productos_stock_bajo > 0) {
                <div class="alert-item stock-bajo">
                  <mat-icon>inventory_2</mat-icon>
                  <span>{{ resumen().productos_stock_bajo }} productos con stock bajo</span>
                  <button mat-button color="warn" (click)="verStockBajo()">Ver</button>
                </div>
              }
              @if (resumen().productos_vencimiento_proximo > 0) {
                <div class="alert-item vencimiento">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ resumen().productos_vencimiento_proximo }} productos próximos a vencer</span>
                  <button mat-button color="warn" (click)="verVencimientos()">Ver</button>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Selector de vista -->
      <mat-card class="view-selector-card">
        <mat-card-content>
          <mat-button-toggle-group 
            [value]="currentView()" 
            (change)="changeView($event.value)"
            class="view-toggle">
            <mat-button-toggle value="productos">
              <mat-icon>inventory</mat-icon>
              Productos
            </mat-button-toggle>
            <mat-button-toggle value="movimientos">
              <mat-icon>swap_horiz</mat-icon>
              Movimientos
            </mat-button-toggle>
            <mat-button-toggle value="categorias">
              <mat-icon>category</mat-icon>
              Categorías
            </mat-button-toggle>
            <mat-button-toggle value="proveedores">
              <mat-icon>business</mat-icon>
              Proveedores
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
                <mat-label>Buscar producto</mat-label>
                <input matInput formControlName="search" placeholder="Nombre, código...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="categoria-field">
                <mat-label>Categoría</mat-label>
                <mat-select formControlName="categoria">
                  <mat-option value="">Todas las categorías</mat-option>
                  @for (categoria of categorias(); track categoria.id_categoria) {
                    <mat-option [value]="categoria.id_categoria">{{ categoria.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="tipo-field">
                <mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo_producto">
                  <mat-option value="">Todos los tipos</mat-option>
                  @for (tipo of tiposProducto; track tipo.value) {
                    <mat-option [value]="tipo.value">{{ tipo.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="estado-field">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="activo">
                  <mat-option value="">Todos</mat-option>
                  <mat-option [value]="true">Activos</mat-option>
                  <mat-option [value]="false">Inactivos</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-icon-button 
                      (click)="toggleFiltrosAvanzados()"
                      [class.active]="mostrarFiltrosAvanzados()">
                <mat-icon>tune</mat-icon>
              </button>

              <button mat-stroked-button 
                      type="button"
                      (click)="clearFilters()">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>
            </div>

            @if (mostrarFiltrosAvanzados()) {
              <div class="filter-row advanced-filters">
                <mat-form-field appearance="outline">
                  <mat-label>Stock mínimo</mat-label>
                  <input matInput type="number" formControlName="stock_minimo">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Stock máximo</mat-label>
                  <input matInput type="number" formControlName="stock_maximo">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Precio desde</mat-label>
                  <input matInput type="number" formControlName="precio_desde" step="0.01">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Precio hasta</mat-label>
                  <input matInput type="number" formControlName="precio_hasta" step="0.01">
                </mat-form-field>
              </div>

              <div class="filter-checkboxes">
                <mat-chip-listbox formControlName="filtros_especiales" multiple>
                  <mat-chip-option value="stock_bajo">Solo stock bajo</mat-chip-option>
                  <mat-chip-option value="vencimiento_proximo">Próximos a vencer</mat-chip-option>
                  <mat-chip-option value="requiere_receta">Requiere receta</mat-chip-option>
                </mat-chip-listbox>
              </div>
            }
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Contenido principal según vista -->
      @switch (currentView()) {
        @case ('productos') {
          <!-- Vista de Productos -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>inventory</mat-icon>
                Productos ({{ totalProductos() }})
              </mat-card-title>
              <div class="table-actions">
                <button mat-icon-button [matMenuTriggerFor]="viewMenu" matTooltip="Opciones de vista">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #viewMenu="matMenu">
                  <button mat-menu-item (click)="exportarProductos()">
                    <mat-icon>file_download</mat-icon>
                    Exportar productos
                  </button>
                  <button mat-menu-item (click)="descargarPlantilla()">
                    <mat-icon>description</mat-icon>
                    Plantilla importación
                  </button>
                </mat-menu>
              </div>
            </mat-card-header>

            <mat-card-content>
              @if (loading()) {
                <div class="loading-container">
                  <mat-spinner diameter="50"></mat-spinner>
                  <p>Cargando productos...</p>
                </div>
              } @else {
                <div class="table-container">
                  <table mat-table [dataSource]="productos()" matSort class="productos-table">
                    
                    <!-- Columna Código -->
                    <ng-container matColumnDef="codigo">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Código</th>
                      <td mat-cell *matCellDef="let producto">
                        <span class="codigo-producto">{{ producto.codigo_producto }}</span>
                      </td>
                    </ng-container>

                    <!-- Columna Producto -->
                    <ng-container matColumnDef="producto">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Producto</th>
                      <td mat-cell *matCellDef="let producto">
                        <div class="producto-info">
                          <span class="producto-nombre">{{ producto.nombre }}</span>
                          <span class="producto-marca">{{ producto.marca }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Columna Categoría -->
                    <ng-container matColumnDef="categoria">
                      <th mat-header-cell *matHeaderCellDef>Categoría</th>
                      <td mat-cell *matCellDef="let producto">
                        <mat-chip class="categoria-chip">{{ producto.categoria }}</mat-chip>
                      </td>
                    </ng-container>

                    <!-- Columna Stock -->
                    <ng-container matColumnDef="stock">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Stock</th>
                      <td mat-cell *matCellDef="let producto">
                        <div class="stock-info">
                          <span class="stock-actual" 
                                [class.stock-bajo]="estaEnStockBajo(producto)"
                                [class.stock-critico]="producto.stock_actual === 0">
                            {{ producto.stock_actual }}
                          </span>
                          <span class="stock-unidad">{{ producto.unidad_medida }}</span>
                          @if (estaEnStockBajo(producto)) {
                            <mat-icon class="warning-icon" matTooltip="Stock bajo">warning</mat-icon>
                          }
                        </div>
                      </td>
                    </ng-container>

                    <!-- Columna Precio -->
                    <ng-container matColumnDef="precio">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Precio</th>
                      <td mat-cell *matCellDef="let producto">
                        <div class="precio-info">
                          <span class="precio-venta">{{ formatearPrecio(producto.precio_venta) }}</span>
                          <span class="precio-compra">C: {{ formatearPrecio(producto.precio_compra) }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Columna Vencimiento -->
                    <ng-container matColumnDef="vencimiento">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Vencimiento</th>
                      <td mat-cell *matCellDef="let producto">
                        @if (producto.fecha_vencimiento) {
                          <span class="fecha-vencimiento"
                                [class.vencimiento-proximo]="diasParaVencer(producto.fecha_vencimiento) <= 30"
                                [class.vencimiento-critico]="diasParaVencer(producto.fecha_vencimiento) <= 7">
                            {{ formatearFecha(producto.fecha_vencimiento) }}
                          </span>
                        } @else {
                          <span class="no-vencimiento">No aplica</span>
                        }
                      </td>
                    </ng-container>

                    <!-- Columna Estado -->
                    <ng-container matColumnDef="estado">
                      <th mat-header-cell *matHeaderCellDef>Estado</th>
                      <td mat-cell *matCellDef="let producto">
                        <mat-chip [style.background-color]="producto.activo ? '#4caf50' : '#f44336'"
                                  [style.color]="'white'">
                          {{ producto.activo ? 'Activo' : 'Inactivo' }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <!-- Columna Acciones -->
                    <ng-container matColumnDef="acciones">
                      <th mat-header-cell *matHeaderCellDef>Acciones</th>
                      <td mat-cell *matCellDef="let producto">
                        <button mat-icon-button [matMenuTriggerFor]="productoMenu" (click)="$event.stopPropagation()">
                          <mat-icon>more_vert</mat-icon>
                        </button>
                        <mat-menu #productoMenu="matMenu">
                          <button mat-menu-item (click)="$event.stopPropagation(); verProducto(producto)">
                            <mat-icon>visibility</mat-icon>
                            Ver Detalles
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); editarProducto(producto)">
                            <mat-icon>edit</mat-icon>
                            Editar
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); verMovimientos(producto)">
                            <mat-icon>swap_horiz</mat-icon>
                            Movimientos
                          </button>
                          <mat-divider></mat-divider>
                          <button mat-menu-item (click)="$event.stopPropagation(); ajustarStock(producto)">
                            <mat-icon>tune</mat-icon>
                            Ajustar Stock
                          </button>
                          <button mat-menu-item (click)="$event.stopPropagation(); generarCodigoBarras(producto)">
                            <mat-icon>qr_code</mat-icon>
                            Código de Barras
                          </button>
                          <mat-divider></mat-divider>
                          <button mat-menu-item (click)="$event.stopPropagation(); eliminarProducto(producto)" class="delete-item">
                            <mat-icon>block</mat-icon>
                            Desactivar
                          </button>
                        </mat-menu>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                        (click)="verProducto(row)" 
                        class="clickable-row"></tr>
                  </table>

                  @if (productos().length === 0) {
                    <div class="no-data">
                      <mat-icon>inventory</mat-icon>
                      <h3>No hay productos</h3>
                      <p>No se encontraron productos con los filtros aplicados</p>
                      <button mat-raised-button color="primary" (click)="crearProducto()">
                        <mat-icon>add</mat-icon>
                        Crear primer producto
                      </button>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        @case ('movimientos') {
          <!-- Vista de Movimientos -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>swap_horiz</mat-icon>
                Movimientos de Inventario
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="view-redirect">
                <mat-icon>swap_horiz</mat-icon>
                <h3>Movimientos de Inventario</h3>
                <p>Gestiona los movimientos de entrada, salida y ajustes de stock</p>
                <button mat-raised-button color="primary" (click)="navegarAMovimientos()">
                  <mat-icon>open_in_new</mat-icon>
                  Ver Movimientos
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @case ('categorias') {
          <!-- Vista de Categorías -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>category</mat-icon>
                Categorías de Productos
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="view-redirect">
                <mat-icon>category</mat-icon>
                <h3>Categorías de Productos</h3>
                <p>Organiza tus productos en categorías para una mejor gestión</p>
                <button mat-raised-button color="primary" (click)="navegarACategorias()">
                  <mat-icon>open_in_new</mat-icon>
                  Gestionar Categorías
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @case ('proveedores') {
          <!-- Vista de Proveedores -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>business</mat-icon>
                Proveedores
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="view-redirect">
                <mat-icon>business</mat-icon>
                <h3>Gestión de Proveedores</h3>
                <p>Administra la información de tus proveedores y sus productos</p>
                <button mat-raised-button color="primary" (click)="navegarAProveedores()">
                  <mat-icon>open_in_new</mat-icon>
                  Ver Proveedores
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals para estado reactivo
  loading = signal(false);
  productos = signal<Producto[]>([]);
  categorias = signal<CategoriaProducto[]>([]);
  resumen = signal<InventarioResumen>({
    total_productos: 0,
    valor_total_inventario: 0,
    productos_stock_bajo: 0,
    productos_vencimiento_proximo: 0,
    categorias_activas: 0,
    movimientos_hoy: 0
  });
  totalProductos = signal(0);
  currentView = signal<'productos' | 'movimientos' | 'categorias' | 'proveedores'>('productos');
  mostrarFiltrosAvanzados = signal(false);

  // Formulario de filtros
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = [
    'codigo',
    'producto',
    'categoria',
    'stock',
    'precio',
    'vencimiento',
    'estado',
    'acciones'
  ];

  // Tipos de producto
  tiposProducto = [
    { value: 'Producto', label: 'Producto' },
    { value: 'Servicio', label: 'Servicio' },
    { value: 'Terapia Individual', label: 'Terapia Individual' },
    { value: 'Terapia Paquete', label: 'Terapia Paquete' }
  ];

  constructor(
    private fb: FormBuilder,
    private productosService: ProductosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      categoria: [''],
      tipo_producto: [''],
      activo: [''],
      stock_minimo: [''],
      stock_maximo: [''],
      precio_desde: [''],
      precio_hasta: [''],
      filtros_especiales: [[]]
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.loadInitialData();
      this.setupFilters();
    });
  }

  private loadInitialData(): void {
    this.loadProductos();
    this.loadCategorias();
    this.loadResumen();
  }

  private loadProductos(): void {
    this.loading.set(true);
    
    const filters: ProductoFilter = {};
    
    if (this.filterForm.value.search) {
      filters.search = this.filterForm.value.search;
    }
    
    if (this.filterForm.value.categoria) {
      filters.categoria = this.filterForm.value.categoria;
    }
    
    if (this.filterForm.value.tipo_producto) {
      filters.tipo = this.filterForm.value.tipo_producto;
    }
    
    if (this.filterForm.value.activo !== null && this.filterForm.value.activo !== '') {
      filters.activo = this.filterForm.value.activo === 'true' || this.filterForm.value.activo === true;
    }

    // Aplicar filtros especiales
    const filtrosEspeciales = this.filterForm.value.filtros_especiales || [];
    if (filtrosEspeciales.includes('stock_bajo')) {
      filters.stock_bajo = true;
    }
    if (filtrosEspeciales.includes('vencimiento_proximo')) {
      filters.vencimiento_proximo = true;
    }

    this.productosService.getProductos(1, 100, filters).subscribe({
      next: (response) => {
        const data = response?.data;
        const productosArray = Array.isArray(data?.products) ? data.products : [];
        this.productos.set(productosArray);
        this.totalProductos.set(data?.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.productos.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando productos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadCategorias(): void {
    this.productosService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias.set(Array.isArray(categorias) ? categorias : []);
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.categorias.set([]);
      }
    });
  }

  private loadResumen(): void {
    this.productosService.getResumenInventario().subscribe({
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
      this.loadProductos();
    });
  }

  // Cambiar vista
  changeView(view: 'productos' | 'movimientos' | 'categorias' | 'proveedores'): void {
    this.currentView.set(view);
  }

  toggleFiltrosAvanzados(): void {
    this.mostrarFiltrosAvanzados.set(!this.mostrarFiltrosAvanzados());
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadProductos();
  }

  // Acciones de productos
  crearProducto(): void {
    this.router.navigate(['/inventario/productos/nuevo']);
  }

  verProducto(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id_producto]);
  }

  editarProducto(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id_producto, 'editar']);
  }

  eliminarProducto(producto: Producto): void {
    if (confirm(`¿Estás seguro de desactivar el producto ${producto.nombre}?`)) {
      this.productosService.deleteProducto(producto.id_producto).subscribe({
        next: () => {
          this.snackBar.open('Producto desactivado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadProductos();
          this.loadResumen();
        },
        error: (error) => {
          console.error('Error eliminando producto:', error);
          this.snackBar.open('Error eliminando producto', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  verMovimientos(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id_producto, 'movimientos']);
  }

  ajustarStock(producto: Producto): void {
    // Implementar diálogo de ajuste de stock
    this.snackBar.open('Función de ajuste de stock en desarrollo', 'Cerrar', { duration: 3000 });
  }

  generarCodigoBarras(producto: Producto): void {
    this.productosService.generarCodigoBarras(producto.id_producto).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-barras-${producto.codigo}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generando código de barras:', error);
        this.snackBar.open('Error generando código de barras', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Acciones de alertas
  verStockBajo(): void {
    this.filterForm.patchValue({ filtros_especiales: ['stock_bajo'] });
  }

  verVencimientos(): void {
    this.filterForm.patchValue({ filtros_especiales: ['vencimiento_proximo'] });
  }

  // Exportación e importación
  exportarInventario(): void {
    this.productosService.exportarInventario('excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando inventario:', error);
        this.snackBar.open('Error exportando inventario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  exportarProductos(): void {
    this.exportarInventario();
  }

  importarProductos(): void {
    // Implementar diálogo de importación
    this.snackBar.open('Función de importación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  descargarPlantilla(): void {
    this.productosService.descargarPlantillaImportacion().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-productos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando plantilla:', error);
        this.snackBar.open('Error descargando plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Utilidades
  formatearPrecio(precio: number): string {
    return this.productosService.formatearPrecio(precio);
  }

  estaEnStockBajo(producto: Producto): boolean {
    return this.productosService.estaEnStockBajo(producto);
  }

  diasParaVencer(fechaVencimiento: string): number {
    return this.productosService.diasParaVencer(fechaVencimiento);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Navegación a vistas específicas
  navegarAMovimientos(): void {
    this.router.navigate(['/inventario/movimientos']);
  }

  navegarACategorias(): void {
    this.router.navigate(['/inventario/categorias']);
  }

  navegarAProveedores(): void {
    this.router.navigate(['/inventario/proveedores']);
  }
}