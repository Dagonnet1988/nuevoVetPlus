import { Component, OnInit, signal, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { ProductosService, Proveedor } from '../../../services/productos.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
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
    MatSelectModule,
    MatTabsModule,
    MatDividerModule
  ],
  template: `
    <div class="proveedores-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">business</mat-icon>
              Proveedores
            </h1>
            <p class="page-subtitle">Gestiona tus proveedores y mantén actualizada su información de contacto</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button (click)="exportarProveedores()">
              <mat-icon>file_download</mat-icon>
              Exportar
            </button>
            <button mat-stroked-button (click)="importarProveedores()">
              <mat-icon>file_upload</mat-icon>
              Importar
            </button>
            <button mat-raised-button color="primary" (click)="nuevoProveedor()">
              <mat-icon>add</mat-icon>
              Nuevo Proveedor
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">business</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalProveedores() }}</span>
                <span class="stat-label">Total Proveedores</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon success-color">check_circle</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ proveedoresActivos() }}</span>
                <span class="stat-label">Activos</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon info-color">inventory</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalProductosProveedor() }}</span>
                <span class="stat-label">Productos Suministrados</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon accent-color">shopping_cart</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ comprasEsteMes() }}</span>
                <span class="stat-label">Compras Este Mes</span>
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
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar proveedor</mat-label>
                <input matInput formControlName="search" placeholder="Nombre, RUC, email...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="tipo-field">
                <mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo_proveedor">
                  <mat-option value="">Todos los tipos</mat-option>
                  @for (tipo of tiposProveedor; track tipo.value) {
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

      <!-- Tabla de proveedores -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>business</mat-icon>
            Listado de Proveedores ({{ totalProveedores() }})
          </mat-card-title>
          <div class="table-actions">
            <button mat-icon-button [matMenuTriggerFor]="viewMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #viewMenu="matMenu">
              <button mat-menu-item (click)="exportarProveedores()">
                <mat-icon>file_download</mat-icon>
                Exportar proveedores
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
              <p>Cargando proveedores...</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="proveedores()" matSort class="proveedores-table">
                
                <!-- Columna Proveedor -->
                <ng-container matColumnDef="proveedor">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Proveedor</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <div class="proveedor-info">
                      <span class="proveedor-nombre">{{ proveedor.nombre }}</span>
                      <span class="proveedor-ruc">RUC: {{ proveedor.ruc || 'No registrado' }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Tipo -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <mat-chip [style.background-color]="getTipoColor(proveedor.tipo_proveedor)"
                              [style.color]="'white'"
                              class="tipo-chip">
                      {{ getTipoLabel(proveedor.tipo_proveedor) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Columna Contacto -->
                <ng-container matColumnDef="contacto">
                  <th mat-header-cell *matHeaderCellDef>Contacto</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <div class="contacto-info">
                      @if (proveedor.telefono) {
                        <div class="contacto-item">
                          <mat-icon class="contacto-icon">phone</mat-icon>
                          <span>{{ proveedor.telefono }}</span>
                        </div>
                      }
                      @if (proveedor.email) {
                        <div class="contacto-item">
                          <mat-icon class="contacto-icon">email</mat-icon>
                          <span>{{ proveedor.email }}</span>
                        </div>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Dirección -->
                <ng-container matColumnDef="direccion">
                  <th mat-header-cell *matHeaderCellDef>Dirección</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <div class="direccion-info">
                      @if (proveedor.direccion) {
                        <span class="direccion-text">{{ truncateText(proveedor.direccion, 40) }}</span>
                        @if (proveedor.ciudad) {
                          <span class="ciudad-text">{{ proveedor.ciudad }}</span>
                        }
                      } @else {
                        <span class="no-direccion">No registrada</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Productos -->
                <ng-container matColumnDef="productos">
                  <th mat-header-cell *matHeaderCellDef>Productos</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <div class="productos-count">
                      <span class="count-number">{{ proveedor.total_productos || 0 }}</span>
                      <span class="count-label">productos</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Última Compra -->
                <ng-container matColumnDef="ultima_compra">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Última Compra</th>
                  <td mat-cell *matCellDef="let proveedor">
                    @if (proveedor.ultima_compra) {
                      <span class="fecha-compra">{{ formatearFecha(proveedor.ultima_compra) }}</span>
                    } @else {
                      <span class="no-compra">Sin compras</span>
                    }
                  </td>
                </ng-container>

                <!-- Columna Estado -->
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <mat-chip [style.background-color]="proveedor.activo ? '#4caf50' : '#f44336'"
                              [style.color]="'white'">
                      {{ proveedor.activo ? 'Activo' : 'Inactivo' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Columna Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let proveedor">
                    <button mat-icon-button [matMenuTriggerFor]="proveedorMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #proveedorMenu="matMenu">
                      <button mat-menu-item (click)="verProveedor(proveedor)">
                        <mat-icon>visibility</mat-icon>
                        Ver Detalles
                      </button>
                      <button mat-menu-item (click)="editarProveedor(proveedor)">
                        <mat-icon>edit</mat-icon>
                        Editar
                      </button>
                      <button mat-menu-item (click)="verProductosProveedor(proveedor)">
                        <mat-icon>inventory</mat-icon>
                        Ver Productos
                      </button>
                      <button mat-menu-item (click)="verComprasProveedor(proveedor)">
                        <mat-icon>shopping_cart</mat-icon>
                        Historial Compras
                      </button>
                      <mat-divider></mat-divider>
                      <button mat-menu-item (click)="toggleEstadoProveedor(proveedor)">
                        <mat-icon>{{ proveedor.activo ? 'visibility_off' : 'visibility' }}</mat-icon>
                        {{ proveedor.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                      <button mat-menu-item (click)="eliminarProveedor(proveedor)" class="delete-item">
                        <mat-icon>delete</mat-icon>
                        Eliminar
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              @if (proveedores().length === 0) {
                <div class="no-data">
                  <mat-icon>business</mat-icon>
                  <h3>No hay proveedores</h3>
                  <p>No se encontraron proveedores con los filtros aplicados</p>
                  <button mat-raised-button color="primary" (click)="nuevoProveedor()">
                    <mat-icon>add</mat-icon>
                    Registrar primer proveedor
                  </button>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './proveedores.component.css'
})
export class ProveedoresComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals
  loading = signal(false);
  proveedores = signal<Proveedor[]>([]);
  totalProveedores = signal(0);

  // Form
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = [
    'proveedor',
    'tipo',
    'contacto',
    'direccion',
    'productos',
    'ultima_compra',
    'estado',
    'acciones'
  ];

  // Tipos de proveedor
  tiposProveedor = [
    { value: 'medicamentos', label: 'Medicamentos', color: '#2196f3' },
    { value: 'alimentos', label: 'Alimentos', color: '#4caf50' },
    { value: 'equipos', label: 'Equipos', color: '#ff9800' },
    { value: 'suministros', label: 'Suministros', color: '#9c27b0' },
    { value: 'servicios', label: 'Servicios', color: '#607d8b' },
    { value: 'general', label: 'General', color: '#666' }
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
      tipo_proveedor: [''],
      activo: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  private loadInitialData(): void {
    this.loadProveedores();
  }

  private loadProveedores(): void {
    this.loading.set(true);
    
    const filtros = {
      search: this.filterForm.value.search || undefined,
      tipo_proveedor: this.filterForm.value.tipo_proveedor || undefined,
      activo: this.filterForm.value.activo !== '' ? this.filterForm.value.activo : undefined
    };

    this.productosService.getProveedores(1, 100, filtros).subscribe({
      next: (response) => {
        const data = response?.data;
        const proveedoresArray = Array.isArray(data) ? data : [];
        this.proveedores.set(proveedoresArray);
        this.totalProveedores.set(response?.total || 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.proveedores.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando proveedores', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadProveedores();
    });
  }

  // Computed properties
  proveedoresActivos(): number {
    return this.proveedores().filter(p => p.activo).length;
  }

  totalProductosProveedor(): number {
    return this.proveedores().reduce((total, proveedor) => total + (proveedor.total_productos || 0), 0);
  }

  comprasEsteMes(): number {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    return this.proveedores().filter(p => {
      if (!p.ultima_compra) return false;
      const fechaCompra = new Date(p.ultima_compra);
      return fechaCompra >= inicioMes;
    }).length;
  }

  // Utilidades
  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposProveedor.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  }

  getTipoColor(tipo: string): string {
    const tipoObj = this.tiposProveedor.find(t => t.value === tipo);
    return tipoObj?.color || '#666';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  truncateText(text: string, length: number = 50): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadProveedores();
  }

  // Acciones
  nuevoProveedor(): void {
    const dialogRef = this.dialog.open(ProveedorDialogComponent, {
      width: '800px',
      data: {
        proveedor: null,
        isEdit: false,
        tiposProveedor: this.tiposProveedor
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProveedores();
      }
    });
  }

  verProveedor(proveedor: Proveedor): void {
    // Implementar vista de detalles de proveedor
    this.snackBar.open('Vista de detalles en desarrollo', 'Cerrar', { duration: 3000 });
  }

  editarProveedor(proveedor: Proveedor): void {
    const dialogRef = this.dialog.open(ProveedorDialogComponent, {
      width: '800px',
      data: {
        proveedor: proveedor,
        isEdit: true,
        tiposProveedor: this.tiposProveedor
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProveedores();
      }
    });
  }

  verProductosProveedor(proveedor: Proveedor): void {
    // Navegar a productos filtrados por proveedor
    this.router.navigate(['/inventario'], {
      queryParams: { proveedor: proveedor.id_proveedor }
    });
  }

  verComprasProveedor(proveedor: Proveedor): void {
    // Implementar vista de historial de compras
    this.snackBar.open('Historial de compras en desarrollo', 'Cerrar', { duration: 3000 });
  }

  toggleEstadoProveedor(proveedor: Proveedor): void {
    const nuevoEstado = !proveedor.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (confirm(`¿Estás seguro de ${accion} el proveedor ${proveedor.nombre}?`)) {
      this.productosService.updateProveedor(proveedor.id_proveedor, { activo: nuevoEstado }).subscribe({
        next: () => {
          this.snackBar.open(`Proveedor ${accion}do exitosamente`, 'Cerrar', { duration: 3000 });
          this.loadProveedores();
        },
        error: (error) => {
          console.error(`Error ${accion}ndo proveedor:`, error);
          this.snackBar.open(`Error ${accion}ndo proveedor`, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  eliminarProveedor(proveedor: Proveedor): void {
    if (proveedor.total_productos && proveedor.total_productos > 0) {
      this.snackBar.open('No se puede eliminar un proveedor que tiene productos asociados', 'Cerrar', { duration: 3000 });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el proveedor ${proveedor.nombre}?`)) {
      this.productosService.deleteProveedor(proveedor.id_proveedor).subscribe({
        next: () => {
          this.snackBar.open('Proveedor eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadProveedores();
        },
        error: (error) => {
          console.error('Error eliminando proveedor:', error);
          this.snackBar.open('Error eliminando proveedor', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  exportarProveedores(): void {
    this.productosService.exportarProveedores().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proveedores-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando proveedores:', error);
        this.snackBar.open('Error exportando proveedores', 'Cerrar', { duration: 3000 });
      }
    });
  }

  importarProveedores(): void {
    // Implementar diálogo de importación
    this.snackBar.open('Función de importación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  descargarPlantilla(): void {
    this.productosService.descargarPlantillaProveedores().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-proveedores.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando plantilla:', error);
        this.snackBar.open('Error descargando plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }
}

// Componente de diálogo para crear/editar proveedores
@Component({
  selector: 'app-proveedor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTabsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isEdit ? 'edit' : 'add' }}</mat-icon>
      {{ data.isEdit ? 'Editar' : 'Nuevo' }} Proveedor
    </h2>

    <form [formGroup]="proveedorForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <mat-tab-group>
          <!-- Tab: Información General -->
          <mat-tab label="Información General">
            <div class="tab-content">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Nombre del proveedor</mat-label>
                  <input matInput formControlName="nombre" placeholder="Ej: Droguería Veterinaria S.A.">
                  <mat-error *ngIf="proveedorForm.get('nombre')?.hasError('required')">
                    El nombre es requerido
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>RUC/NIT</mat-label>
                  <input matInput formControlName="ruc" placeholder="Ej: 20123456789">
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Tipo de proveedor</mat-label>
                  <mat-select formControlName="tipo_proveedor">
                    @for (tipo of data.tiposProveedor; track tipo.value) {
                      <mat-option [value]="tipo.value">{{ tipo.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-error *ngIf="proveedorForm.get('tipo_proveedor')?.hasError('required')">
                    El tipo es requerido
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Persona de contacto</mat-label>
                  <input matInput formControlName="contacto_principal" placeholder="Ej: Juan Pérez">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput 
                          formControlName="descripcion" 
                          placeholder="Descripción del proveedor y servicios"
                          rows="3"></textarea>
              </mat-form-field>
            </div>
          </mat-tab>

          <!-- Tab: Contacto -->
          <mat-tab label="Contacto">
            <div class="tab-content">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" placeholder="Ej: +51 999 123 456">
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="contacto@proveedor.com">
                  <mat-error *ngIf="proveedorForm.get('email')?.hasError('email')">
                    Email inválido
                  </mat-error>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Dirección</mat-label>
                <textarea matInput 
                          formControlName="direccion" 
                          placeholder="Dirección completa"
                          rows="2"></textarea>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Ciudad</mat-label>
                  <input matInput formControlName="ciudad" placeholder="Ej: Lima">
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>País</mat-label>
                  <input matInput formControlName="pais" placeholder="Ej: Perú">
                </mat-form-field>
              </div>
            </div>
          </mat-tab>

          <!-- Tab: Información Comercial -->
          <mat-tab label="Información Comercial">
            <div class="tab-content">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Condiciones de pago</mat-label>
                  <input matInput formControlName="condiciones_pago" placeholder="Ej: 30 días">
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Descuento habitual (%)</mat-label>
                  <input matInput type="number" formControlName="descuento_habitual" min="0" max="100" step="0.1">
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Tiempo de entrega (días)</mat-label>
                  <input matInput type="number" formControlName="tiempo_entrega" min="0">
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Monto mínimo de compra</mat-label>
                  <input matInput type="number" formControlName="monto_minimo_compra" min="0" step="0.01">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notas comerciales</mat-label>
                <textarea matInput 
                          formControlName="notas_comerciales" 
                          placeholder="Notas adicionales sobre condiciones comerciales"
                          rows="3"></textarea>
              </mat-form-field>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button mat-raised-button 
                color="primary" 
                type="submit"
                [disabled]="proveedorForm.invalid || submitting">
          @if (submitting) {
            <mat-icon>hourglass_empty</mat-icon>
          } @else {
            <mat-icon>{{ data.isEdit ? 'save' : 'add' }}</mat-icon>
          }
          {{ data.isEdit ? 'Actualizar' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      min-width: 700px;
      padding: 20px 0;
    }

    .tab-content {
      padding: 20px 0;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .half-width {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class ProveedorDialogComponent {
  proveedorForm: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProveedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private productosService: ProductosService,
    private snackBar: MatSnackBar
  ) {
    this.proveedorForm = this.fb.group({
      nombre: [data.proveedor?.nombre || '', Validators.required],
      ruc: [data.proveedor?.ruc || ''],
      tipo_proveedor: [data.proveedor?.tipo_proveedor || '', Validators.required],
      contacto_principal: [data.proveedor?.contacto_principal || ''],
      telefono: [data.proveedor?.telefono || ''],
      email: [data.proveedor?.email || '', Validators.email],
      direccion: [data.proveedor?.direccion || ''],
      ciudad: [data.proveedor?.ciudad || ''],
      pais: [data.proveedor?.pais || ''],
      condiciones_pago: [data.proveedor?.condiciones_pago || ''],
      descuento_habitual: [data.proveedor?.descuento_habitual || 0],
      tiempo_entrega: [data.proveedor?.tiempo_entrega || 0],
      monto_minimo_compra: [data.proveedor?.monto_minimo_compra || 0],
      notas_comerciales: [data.proveedor?.notas_comerciales || ''],
      descripcion: [data.proveedor?.descripcion || '']
    });
  }

  onSubmit(): void {
    if (this.proveedorForm.valid) {
      this.submitting = true;
      const proveedorData = this.proveedorForm.value;

      const operation = this.data.isEdit 
        ? this.productosService.updateProveedor(this.data.proveedor.id_proveedor, proveedorData)
        : this.productosService.createProveedor(proveedorData);

      operation.subscribe({
        next: () => {
          const mensaje = this.data.isEdit ? 'actualizado' : 'creado';
          this.snackBar.open(`Proveedor ${mensaje} exitosamente`, 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error guardando proveedor:', error);
          const mensaje = this.data.isEdit ? 'actualizando' : 'creando';
          this.snackBar.open(`Error ${mensaje} proveedor`, 'Cerrar', { duration: 3000 });
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}