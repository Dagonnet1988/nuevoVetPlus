import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

import { ProductosService, Producto, CategoriaProducto } from '../../../services/productos.service';

@Component({
  selector: 'app-producto-form',
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
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule
  ],
  template: `
    <div class="producto-form-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1 class="form-title">
              <mat-icon class="title-icon">{{ isEdit() ? 'edit' : 'add_circle' }}</mat-icon>
              {{ isEdit() ? 'Editar Producto' : 'Nuevo Producto' }}
            </h1>
            <p class="form-subtitle">{{ isEdit() ? 'Modificar información del producto' : 'Registrar nuevo producto en el inventario' }}</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button 
                    type="button"
                    (click)="resetForm()"
                    [disabled]="loading()">
              <mat-icon>refresh</mat-icon>
              Limpiar
            </button>
            <button mat-raised-button 
                    color="primary"
                    (click)="saveProducto()"
                    [disabled]="productoForm.invalid || loading()">
              <mat-icon>save</mat-icon>
              {{ isEdit() ? 'Actualizar' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Formulario -->
      <form [formGroup]="productoForm" class="producto-form">
        
        <!-- Información básica -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Información Básica
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline" class="codigo-field">
                <mat-label>Código del Producto *</mat-label>
                <input matInput 
                       formControlName="codigo_producto"
                       placeholder="PRD-001"
                       required>
                <mat-hint>Formato: XXX-000 (ej: MED-001)</mat-hint>
                <mat-error *ngIf="productoForm.get('codigo_producto')?.hasError('required')">
                  El código es obligatorio
                </mat-error>
                <mat-error *ngIf="productoForm.get('codigo_producto')?.hasError('pattern')">
                  Formato inválido (XXX-000)
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="nombre-field">
                <mat-label>Nombre del Producto *</mat-label>
                <input matInput 
                       formControlName="nombre"
                       placeholder="Nombre completo del producto"
                       required>
                <mat-error *ngIf="productoForm.get('nombre')?.hasError('required')">
                  El nombre es obligatorio
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="categoria-field">
                <mat-label>Categoría *</mat-label>
                <mat-select formControlName="categoria" required>
                  <mat-option value="">Seleccionar categoría...</mat-option>
                  @for (categoria of categorias(); track categoria.id_categoria) {
                    <mat-option [value]="categoria.nombre">{{ categoria.nombre }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="productoForm.get('categoria')?.hasError('required')">
                  La categoría es obligatoria
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="subcategoria-field">
                <mat-label>Subcategoría</mat-label>
                <input matInput formControlName="subcategoria" placeholder="Subcategoría del producto">
              </mat-form-field>

              <mat-form-field appearance="outline" class="tipo-field">
                <mat-label>Tipo de Producto *</mat-label>
                <mat-select formControlName="tipo_producto" required>
                  @for (tipo of tiposProducto; track tipo.value) {
                    <mat-option [value]="tipo.value">{{ tipo.label }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="productoForm.get('tipo_producto')?.hasError('required')">
                  El tipo es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="marca-field">
                <mat-label>Marca</mat-label>
                <input matInput formControlName="marca" placeholder="Marca del producto">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput 
                          formControlName="descripcion"
                          rows="3"
                          placeholder="Descripción detallada del producto..."></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Precios y Stock -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>attach_money</mat-icon>
              Precios y Inventario
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline" class="precio-field">
                <mat-label>Precio de Compra *</mat-label>
                <input matInput 
                       type="number"
                       formControlName="precio_compra"
                       placeholder="0.00"
                       step="0.01"
                       min="0"
                       required>
                <span matTextPrefix>$&nbsp;</span>
                <mat-error *ngIf="productoForm.get('precio_compra')?.hasError('required')">
                  El precio de compra es obligatorio
                </mat-error>
                <mat-error *ngIf="productoForm.get('precio_compra')?.hasError('min')">
                  El precio debe ser mayor a 0
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="precio-field">
                <mat-label>Precio de Venta *</mat-label>
                <input matInput 
                       type="number"
                       formControlName="precio_venta"
                       placeholder="0.00"
                       step="0.01"
                       min="0"
                       required>
                <span matTextPrefix>$&nbsp;</span>
                <mat-hint>Margen: {{ calcularMargen() }}%</mat-hint>
                <mat-error *ngIf="productoForm.get('precio_venta')?.hasError('required')">
                  El precio de venta es obligatorio
                </mat-error>
                <mat-error *ngIf="productoForm.get('precio_venta')?.hasError('min')">
                  El precio debe ser mayor a 0
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="iva-field">
                <mat-label>IVA (%)</mat-label>
                <input matInput 
                       type="number"
                       formControlName="iva_aplicable"
                       placeholder="16"
                       step="0.01"
                       min="0"
                       max="100">
                <span matTextSuffix>%</span>
              </mat-form-field>
            </div>

            <mat-divider></mat-divider>

            <div class="form-row">
              <mat-form-field appearance="outline" class="stock-field">
                <mat-label>Stock Actual *</mat-label>
                <input matInput 
                       type="number"
                       formControlName="stock_actual"
                       placeholder="0"
                       min="0"
                       required>
                <mat-error *ngIf="productoForm.get('stock_actual')?.hasError('required')">
                  El stock actual es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="stock-field">
                <mat-label>Stock Mínimo *</mat-label>
                <input matInput 
                       type="number"
                       formControlName="stock_minimo"
                       placeholder="5"
                       min="0"
                       required>
                <mat-error *ngIf="productoForm.get('stock_minimo')?.hasError('required')">
                  El stock mínimo es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="stock-field">
                <mat-label>Stock Máximo</mat-label>
                <input matInput 
                       type="number"
                       formControlName="stock_maximo"
                       placeholder="100"
                       min="0">
              </mat-form-field>

              <mat-form-field appearance="outline" class="unidad-field">
                <mat-label>Unidad de Medida *</mat-label>
                <mat-select formControlName="unidad_medida" required>
                  @for (unidad of unidadesMedida; track unidad.value) {
                    <mat-option [value]="unidad.value">{{ unidad.label }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="productoForm.get('unidad_medida')?.hasError('required')">
                  La unidad de medida es obligatoria
                </mat-error>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Información adicional -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>more_horiz</mat-icon>
              Información Adicional
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline" class="lote-field">
                <mat-label>Número de Lote</mat-label>
                <input matInput formControlName="lote" placeholder="LOT-001">
              </mat-form-field>

              <mat-form-field appearance="outline" class="vencimiento-field">
                <mat-label>Fecha de Vencimiento</mat-label>
                <input matInput [matDatepicker]="vencimientoPicker" formControlName="fecha_vencimiento">
                <mat-datepicker-toggle matIconSuffix [for]="vencimientoPicker"></mat-datepicker-toggle>
                <mat-datepicker #vencimientoPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ubicacion-field">
                <mat-label>Ubicación</mat-label>
                <input matInput formControlName="ubicacion" placeholder="Estante A-1">
              </mat-form-field>
            </div>

            <div class="checkbox-row">
              <mat-checkbox formControlName="activo">
                Producto activo
              </mat-checkbox>
              <mat-checkbox formControlName="requiere_receta">
                Requiere receta médica
              </mat-checkbox>
            </div>
          </mat-card-content>
        </mat-card>
      </form>

      <!-- Loading overlay -->
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="50"></mat-spinner>
          <p>{{ isEdit() ? 'Actualizando' : 'Guardando' }} producto...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .producto-form-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }

    /* Header */
    .form-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      background: rgba(25, 118, 210, 0.1);
      color: #1976d2;
    }

    .title-section {
      flex: 1;
    }

    .form-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 500;
      color: #1976d2;
    }

    .title-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .form-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .actions-section {
      display: flex;
      gap: 12px;
    }

    /* Form sections */
    .form-section {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section .mat-mdc-card-header {
      padding-bottom: 8px;
    }

    .form-section .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      font-size: 18px;
      font-weight: 500;
    }

    /* Form layout */
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .full-width {
      width: 100%;
    }

    .codigo-field { 
      flex: 1; 
      min-width: 200px; 
    }

    .nombre-field { 
      flex: 2; 
      min-width: 300px; 
    }

    .categoria-field { 
      flex: 1; 
      min-width: 180px; 
    }

    .subcategoria-field { 
      flex: 1; 
      min-width: 180px; 
    }

    .tipo-field { 
      flex: 1; 
      min-width: 180px; 
    }

    .marca-field { 
      flex: 1; 
      min-width: 150px; 
    }

    .precio-field { 
      flex: 1; 
      min-width: 150px; 
    }

    .iva-field { 
      flex: 0.5; 
      min-width: 100px; 
    }

    .stock-field { 
      flex: 1; 
      min-width: 120px; 
    }

    .unidad-field { 
      flex: 1; 
      min-width: 150px; 
    }

    .lote-field { 
      flex: 1; 
      min-width: 150px; 
    }

    .vencimiento-field { 
      flex: 1; 
      min-width: 180px; 
    }

    .ubicacion-field { 
      flex: 1; 
      min-width: 150px; 
    }

    /* Checkboxes */
    .checkbox-row {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 1000;
    }

    .loading-overlay p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .producto-form-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .form-title {
        font-size: 24px;
      }

      .form-row {
        flex-direction: column;
      }

      .form-row > * {
        flex: none !important;
        min-width: auto !important;
        width: 100%;
      }

      .checkbox-row {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private productosService = inject(ProductosService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  isEdit = signal(false);
  producto = signal<Producto | null>(null);
  categorias = signal<CategoriaProducto[]>([]);

  // Form
  productoForm: FormGroup;

  // Opciones
  tiposProducto = [
    { value: 'Producto', label: 'Producto' },
    { value: 'Servicio', label: 'Servicio' },
    { value: 'Terapia Individual', label: 'Terapia Individual' },
    { value: 'Terapia Paquete', label: 'Terapia Paquete' }
  ];

  unidadesMedida = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo' },
    { value: 'g', label: 'Gramo' },
    { value: 'l', label: 'Litro' },
    { value: 'ml', label: 'Mililitro' },
    { value: 'caja', label: 'Caja' },
    { value: 'sobre', label: 'Sobre' },
    { value: 'frasco', label: 'Frasco' },
    { value: 'm', label: 'Metro' },
    { value: 'cm', label: 'Centímetro' }
  ];

  constructor() {
    this.productoForm = this.fb.group({
      codigo_producto: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{3,}$/)]],
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      subcategoria: [''],
      marca: [''],
      tipo_producto: ['', Validators.required],
      precio_compra: [0, [Validators.required, Validators.min(0.01)]],
      precio_venta: [0, [Validators.required, Validators.min(0.01)]],
      stock_actual: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [0, [Validators.required, Validators.min(0)]],
      stock_maximo: [0, Validators.min(0)],
      unidad_medida: ['', Validators.required],
      lote: [''],
      fecha_vencimiento: [''],
      ubicacion: [''],
      activo: [true],
      requiere_receta: [false],
      iva_aplicable: [16]
    });
  }

  ngOnInit(): void {
    const productoId = this.route.snapshot.paramMap.get('id');
    
    if (productoId) {
      this.isEdit.set(true);
      this.loadProducto(productoId);
    }

    this.loadCategorias();
  }

  private loadProducto(id: string): void {
    this.loading.set(true);
    this.productosService.getProducto(id).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.populateForm(producto);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando producto:', error);
        this.snackBar.open('Error cargando producto', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private populateForm(producto: Producto): void {
    this.productoForm.patchValue({
      codigo_producto: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      subcategoria: producto.subcategoria || '',
      marca: producto.marca,
      tipo_producto: producto.tipo,
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      stock_maximo: producto.stock_maximo || 0,
      unidad_medida: producto.unidad_medida || 'unidad',
      lote: producto.lote || '',
      fecha_vencimiento: producto.fecha_vencimiento ? new Date(producto.fecha_vencimiento) : null,
      ubicacion: producto.ubicacion || '',
      activo: producto.activo,
      requiere_receta: producto.requiere_receta || false,
      iva_aplicable: producto.iva_aplicable || 16
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

  calcularMargen(): number {
    const precioCompra = this.productoForm.get('precio_compra')?.value || 0;
    const precioVenta = this.productoForm.get('precio_venta')?.value || 0;
    
    if (precioCompra === 0) return 0;
    
    return Math.round(((precioVenta - precioCompra) / precioCompra) * 100);
  }

  saveProducto(): void {
    if (this.productoForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos obligatorios', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const formValue = this.productoForm.value;

    // Mapear campos del formulario a los campos esperados por el backend
    const formData = {
      codigo: formValue.codigo_producto,
      codigo_barras: formValue.codigo_barras,
      nombre: formValue.nombre,
      descripcion: formValue.descripcion,
      tipo: formValue.tipo_producto,
      categoria: formValue.categoria,
      subcategoria: formValue.subcategoria,
      marca: formValue.marca,
      precio_compra: formValue.precio_compra,
      precio_venta: formValue.precio_venta,
      stock_actual: formValue.stock_actual,
      stock_minimo: formValue.stock_minimo,
      stock_maximo: formValue.stock_maximo,
      unidad_medida: formValue.unidad_medida,
      lote: formValue.lote,
      fecha_vencimiento: formValue.fecha_vencimiento ? formValue.fecha_vencimiento.toISOString().split('T')[0] : null,
      ubicacion: formValue.ubicacion,
      inventariable: true, // Por defecto true para productos
      activo: formValue.activo,
      requiere_receta: formValue.requiere_receta,
      iva_aplicable: formValue.iva_aplicable,
      sesiones_incluidas: formValue.sesiones_incluidas,
      duracion_sesion: formValue.duracion_sesion
    };

    const operation = this.isEdit() 
      ? this.productosService.updateProducto(this.producto()!.id_producto, formData)
      : this.productosService.createProducto(formData);

    operation.subscribe({
      next: (result) => {
        this.snackBar.open(
          this.isEdit() ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading.set(false);
        this.router.navigate(['/inventario']);
      },
      error: (error) => {
        console.error('Error guardando producto:', error);
        this.snackBar.open('Error guardando producto', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  resetForm(): void {
    if (this.isEdit()) {
      this.populateForm(this.producto()!);
    } else {
      this.productoForm.reset({
        activo: true,
        requiere_receta: false,
        iva_aplicable: 16,
        stock_actual: 0,
        stock_minimo: 0,
        stock_maximo: 0,
        precio_compra: 0,
        precio_venta: 0
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/inventario']);
  }
}