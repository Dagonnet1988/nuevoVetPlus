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
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { ProductosService, CategoriaProducto } from '../../../services/productos.service';

@Component({
  selector: 'app-categorias',
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
    MatDividerModule
  ],
  template: `
    <div class="categorias-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">category</mat-icon>
              Categorías de Productos
            </h1>
            <p class="page-subtitle">Organiza tus productos por categorías y facilita su gestión</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button (click)="exportarCategorias()">
              <mat-icon>file_download</mat-icon>
              Exportar
            </button>
            <button mat-raised-button color="primary" (click)="nuevaCategoria()">
              <mat-icon>add</mat-icon>
              Nueva Categoría
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">category</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalCategorias() }}</span>
                <span class="stat-label">Total Categorías</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon success-color">check_circle</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ categoriasActivas() }}</span>
                <span class="stat-label">Activas</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon info-color">inventory</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalProductosEnCategorias() }}</span>
                <span class="stat-label">Productos Asignados</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon accent-color">layers</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ subcategoriasTotal() }}</span>
                <span class="stat-label">Subcategorías</span>
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
                <mat-label>Buscar categoría</mat-label>
                <input matInput formControlName="search" placeholder="Nombre, descripción...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="parent-field">
                <mat-label>Categoría Padre</mat-label>
                <mat-select formControlName="categoria_padre">
                  <mat-option value="">Todas las categorías</mat-option>
                  <mat-option value="null">Solo categorías principales</mat-option>
                  @for (categoria of categoriasPadre(); track categoria.id_categoria) {
                    <mat-option [value]="categoria.id_categoria">{{ categoria.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="estado-field">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="activo">
                  <mat-option value="">Todas</mat-option>
                  <mat-option [value]="true">Activas</mat-option>
                  <mat-option [value]="false">Inactivas</mat-option>
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

      <!-- Tabla de categorías -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>category</mat-icon>
            Listado de Categorías ({{ totalCategorias() }})
          </mat-card-title>
          <div class="table-actions">
            <button mat-icon-button [matMenuTriggerFor]="viewMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #viewMenu="matMenu">
              <button mat-menu-item (click)="exportarCategorias()">
                <mat-icon>file_download</mat-icon>
                Exportar categorías
              </button>
              <button mat-menu-item (click)="reorganizarCategorias()">
                <mat-icon>sort</mat-icon>
                Reorganizar
              </button>
            </mat-menu>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Cargando categorías...</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="categorias()" matSort class="categorias-table">
                
                <!-- Columna Nombre -->
                <ng-container matColumnDef="nombre">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
                  <td mat-cell *matCellDef="let categoria">
                    <div class="categoria-info">
                      <span class="categoria-nombre">
                        @if (categoria.categoria_padre_id) {
                          <mat-icon class="subcategoria-icon">subdirectory_arrow_right</mat-icon>
                        }
                        {{ categoria.nombre }}
                      </span>
                      @if (categoria.descripcion) {
                        <span class="categoria-descripcion">{{ categoria.descripcion }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Código -->
                <ng-container matColumnDef="codigo">
                  <th mat-header-cell *matHeaderCellDef>Código</th>
                  <td mat-cell *matCellDef="let categoria">
                    <span class="categoria-codigo">{{ categoria.codigo || 'N/A' }}</span>
                  </td>
                </ng-container>

                <!-- Columna Categoría Padre -->
                <ng-container matColumnDef="padre">
                  <th mat-header-cell *matHeaderCellDef>Categoría Padre</th>
                  <td mat-cell *matCellDef="let categoria">
                    @if (categoria.categoria_padre_id) {
                      <mat-chip class="padre-chip">{{ getNombreCategoriaPadre(categoria.categoria_padre_id) }}</mat-chip>
                    } @else {
                      <span class="no-padre">Principal</span>
                    }
                  </td>
                </ng-container>

                <!-- Columna Productos -->
                <ng-container matColumnDef="productos">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Productos</th>
                  <td mat-cell *matCellDef="let categoria">
                    <div class="productos-count">
                      <span class="count-number">{{ categoria.total_productos || 0 }}</span>
                      <span class="count-label">productos</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Subcategorías -->
                <ng-container matColumnDef="subcategorias">
                  <th mat-header-cell *matHeaderCellDef>Subcategorías</th>
                  <td mat-cell *matCellDef="let categoria">
                    <div class="subcategorias-count">
                      <span class="count-number">{{ getSubcategoriasCount(categoria.id_categoria) }}</span>
                      <span class="count-label">subcategorías</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Estado -->
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let categoria">
                    <mat-chip [style.background-color]="categoria.activa ? '#4caf50' : '#f44336'"
                              [style.color]="'white'">
                      {{ categoria.activa ? 'Activa' : 'Inactiva' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Columna Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let categoria">
                    <button mat-icon-button [matMenuTriggerFor]="categoriaMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #categoriaMenu="matMenu">
                      <button mat-menu-item (click)="verCategoria(categoria)">
                        <mat-icon>visibility</mat-icon>
                        Ver Detalles
                      </button>
                      <button mat-menu-item (click)="editarCategoria(categoria)">
                        <mat-icon>edit</mat-icon>
                        Editar
                      </button>
                      <button mat-menu-item (click)="crearSubcategoria(categoria)">
                        <mat-icon>add_circle</mat-icon>
                        Crear Subcategoría
                      </button>
                      <mat-divider></mat-divider>
                      <button mat-menu-item (click)="toggleEstadoCategoria(categoria)">
                        <mat-icon>{{ categoria.activa ? 'visibility_off' : 'visibility' }}</mat-icon>
                        {{ categoria.activa ? 'Desactivar' : 'Activar' }}
                      </button>
                      <button mat-menu-item (click)="eliminarCategoria(categoria)" class="delete-item">
                        <mat-icon>delete</mat-icon>
                        Eliminar
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              @if (categorias().length === 0) {
                <div class="no-data">
                  <mat-icon>category</mat-icon>
                  <h3>No hay categorías</h3>
                  <p>No se encontraron categorías con los filtros aplicados</p>
                  <button mat-raised-button color="primary" (click)="nuevaCategoria()">
                    <mat-icon>add</mat-icon>
                    Crear primera categoría
                  </button>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals
  loading = signal(false);
  categorias = signal<CategoriaProducto[]>([]);
  categoriasPadre = signal<CategoriaProducto[]>([]);
  totalCategorias = signal(0);

  // Form
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = [
    'nombre',
    'codigo',
    'padre',
    'productos',
    'subcategorias',
    'estado',
    'acciones'
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
      categoria_padre: [''],
      activo: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  private loadInitialData(): void {
    this.loadCategorias();
  }

  private loadCategorias(): void {
    this.loading.set(true);
    
    const filtros = {
      search: this.filterForm.value.search || undefined,
      categoria_padre: this.filterForm.value.categoria_padre || undefined,
      activo: this.filterForm.value.activo !== '' ? this.filterForm.value.activo : undefined
    };

    this.productosService.getCategorias().subscribe({
      next: (categorias) => {
        const categoriasArray = Array.isArray(categorias) ? categorias : [];
        this.categorias.set(categoriasArray);
        this.totalCategorias.set(categoriasArray.length);
        
        // Filtrar categorías padre (sin padre) para el selector
        const padres = categoriasArray.filter(c => !c.categoria_padre_id);
        this.categoriasPadre.set(padres);
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.categorias.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando categorías', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadCategorias();
    });
  }

  // Computed properties
  categoriasActivas(): number {
    return this.categorias().filter(c => c.activa).length;
  }

  totalProductosEnCategorias(): number {
    return this.categorias().reduce((total, categoria) => total + (categoria.total_productos || 0), 0);
  }

  subcategoriasTotal(): number {
    return this.categorias().filter(c => c.categoria_padre_id).length;
  }

  // Utilidades
  getNombreCategoriaPadre(idPadre: string): string {
    const padre = this.categorias().find(c => c.id_categoria === idPadre);
    return padre?.nombre || 'Categoría no encontrada';
  }

  getSubcategoriasCount(idCategoria: string): number {
    return this.categorias().filter(c => c.categoria_padre_id === idCategoria).length;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadCategorias();
  }

  // Acciones
  nuevaCategoria(): void {
    const dialogRef = this.dialog.open(CategoriaDialogComponent, {
      width: '600px',
      data: {
        categoria: null,
        categoriasPadre: this.categoriasPadre(),
        isEdit: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCategorias();
      }
    });
  }

  verCategoria(categoria: CategoriaProducto): void {
    // Implementar vista de detalles de categoría
    this.snackBar.open('Vista de detalles en desarrollo', 'Cerrar', { duration: 3000 });
  }

  editarCategoria(categoria: CategoriaProducto): void {
    const dialogRef = this.dialog.open(CategoriaDialogComponent, {
      width: '600px',
      data: {
        categoria: categoria,
        categoriasPadre: this.categoriasPadre().filter(c => c.id_categoria !== categoria.id_categoria),
        isEdit: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCategorias();
      }
    });
  }

  crearSubcategoria(categoriaPadre: CategoriaProducto): void {
    const dialogRef = this.dialog.open(CategoriaDialogComponent, {
      width: '600px',
      data: {
        categoria: null,
        categoriasPadre: [categoriaPadre],
        isEdit: false,
        defaultPadre: categoriaPadre.id_categoria
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCategorias();
      }
    });
  }

  toggleEstadoCategoria(categoria: CategoriaProducto): void {
    const nuevoEstado = !categoria.activa;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (confirm(`¿Estás seguro de ${accion} la categoría ${categoria.nombre}?`)) {
      this.productosService.updateCategoria(categoria.id_categoria, { activa: nuevoEstado }).subscribe({
        next: () => {
          this.snackBar.open(`Categoría ${accion}da exitosamente`, 'Cerrar', { duration: 3000 });
          this.loadCategorias();
        },
        error: (error) => {
          console.error(`Error ${accion}ndo categoría:`, error);
          this.snackBar.open(`Error ${accion}ndo categoría`, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  eliminarCategoria(categoria: CategoriaProducto): void {
    if (categoria.total_productos && categoria.total_productos > 0) {
      this.snackBar.open('No se puede eliminar una categoría que tiene productos asignados', 'Cerrar', { duration: 3000 });
      return;
    }

    const subcategorias = this.getSubcategoriasCount(categoria.id_categoria);
    if (subcategorias > 0) {
      this.snackBar.open('No se puede eliminar una categoría que tiene subcategorías', 'Cerrar', { duration: 3000 });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar la categoría ${categoria.nombre}?`)) {
      this.productosService.deleteCategoria(categoria.id_categoria).subscribe({
        next: () => {
          this.snackBar.open('Categoría eliminada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadCategorias();
        },
        error: (error) => {
          console.error('Error eliminando categoría:', error);
          this.snackBar.open('Error eliminando categoría', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  exportarCategorias(): void {
    this.productosService.exportarCategorias().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `categorias-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando categorías:', error);
        this.snackBar.open('Error exportando categorías', 'Cerrar', { duration: 3000 });
      }
    });
  }

  reorganizarCategorias(): void {
    // Implementar funcionalidad de reorganización
    this.snackBar.open('Función de reorganización en desarrollo', 'Cerrar', { duration: 3000 });
  }
}

// Componente de diálogo para crear/editar categorías
@Component({
  selector: 'app-categoria-dialog',
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
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isEdit ? 'edit' : 'add' }}</mat-icon>
      {{ data.isEdit ? 'Editar' : 'Nueva' }} Categoría
    </h2>

    <form [formGroup]="categoriaForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-grid">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre de la categoría</mat-label>
            <input matInput formControlName="nombre" placeholder="Ej: Medicamentos">
            <mat-error *ngIf="categoriaForm.get('nombre')?.hasError('required')">
              El nombre es requerido
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Código (opcional)</mat-label>
            <input matInput formControlName="codigo" placeholder="Ej: MED">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Categoría padre</mat-label>
            <mat-select formControlName="categoria_padre_id">
              <mat-option value="">Sin categoría padre (Principal)</mat-option>
              @for (padre of data.categoriasPadre; track padre.id_categoria) {
                <mat-option [value]="padre.id_categoria">{{ padre.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripción</mat-label>
            <textarea matInput 
                      formControlName="descripcion" 
                      placeholder="Descripción de la categoría"
                      rows="3"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button mat-raised-button 
                color="primary" 
                type="submit"
                [disabled]="categoriaForm.invalid || submitting">
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
      min-width: 500px;
      padding: 20px 0;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class CategoriaDialogComponent {
  categoriaForm: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoriaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private productosService: ProductosService,
    private snackBar: MatSnackBar
  ) {
    this.categoriaForm = this.fb.group({
      nombre: [data.categoria?.nombre || '', Validators.required],
      codigo: [data.categoria?.codigo || ''],
      categoria_padre_id: [data.defaultPadre || data.categoria?.categoria_padre_id || ''],
      descripcion: [data.categoria?.descripcion || '']
    });
  }

  onSubmit(): void {
    if (this.categoriaForm.valid) {
      this.submitting = true;
      const categoriaData = this.categoriaForm.value;

      const operation = this.data.isEdit 
        ? this.productosService.updateCategoria(this.data.categoria.id_categoria, categoriaData)
        : this.productosService.createCategoria(categoriaData);

      operation.subscribe({
        next: () => {
          const mensaje = this.data.isEdit ? 'actualizada' : 'creada';
          this.snackBar.open(`Categoría ${mensaje} exitosamente`, 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error guardando categoría:', error);
          const mensaje = this.data.isEdit ? 'actualizando' : 'creando';
          this.snackBar.open(`Error ${mensaje} categoría`, 'Cerrar', { duration: 3000 });
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}