import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Observable, map, startWith, debounceTime, switchMap } from 'rxjs';

import { 
  FacturacionService, 
  Factura, 
  LineaFactura,
  Caja 
} from '../../../services/facturacion.service';

@Component({
  selector: 'app-factura-form',
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatTabsModule,
    MatCheckboxModule
  ],
  template: `
    <div class="factura-form-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1 class="form-title">
              <mat-icon class="title-icon">{{ isEdit() ? 'edit' : 'receipt' }}</mat-icon>
              {{ isEdit() ? 'Editar Factura' : 'Nueva Factura' }}
            </h1>
            <p class="form-subtitle">{{ isEdit() ? 'Modificar información de la factura' : 'Crear nueva factura de venta' }}</p>
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
                    (click)="saveFactura()"
                    [disabled]="facturaForm.invalid || loading() || lineasFactura().length === 0">
              <mat-icon>save</mat-icon>
              {{ isEdit() ? 'Actualizar' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>

      <form [formGroup]="facturaForm" class="factura-form">
        <div class="form-layout">
          
          <!-- Información del Cliente -->
          <mat-card class="form-section client-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>person</mat-icon>
                Información del Cliente
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="cliente-field">
                  <mat-label>Cliente</mat-label>
                  <input matInput 
                         formControlName="cliente_nombre"
                         placeholder="Nombre del cliente"
                         [matAutocomplete]="clienteAuto">
                  <mat-autocomplete #clienteAuto="matAutocomplete" 
                                    (optionSelected)="onClienteSelected($event)">
                    @for (cliente of clientesFiltrados$ | async; track cliente.id_cliente) {
                      <mat-option [value]="cliente">{{ cliente.nombre }}</mat-option>
                    }
                  </mat-autocomplete>
                  <mat-hint>Busque un cliente existente o ingrese uno nuevo</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="documento-field">
                  <mat-label>Documento</mat-label>
                  <input matInput formControlName="cliente_documento" placeholder="CC/NIT">
                </mat-form-field>

                <mat-form-field appearance="outline" class="telefono-field">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="cliente_telefono" placeholder="Teléfono">
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Dirección</mat-label>
                  <input matInput formControlName="cliente_direccion" placeholder="Dirección del cliente">
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Información de la Factura -->
          <mat-card class="form-section invoice-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>receipt</mat-icon>
                Información de la Factura
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="codigo-field">
                  <mat-label>Código de Factura</mat-label>
                  <input matInput 
                         formControlName="codigo_factura"
                         placeholder="Se genera automáticamente"
                         readonly>
                  <mat-hint>Código generado automáticamente</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="fecha-field">
                  <mat-label>Fecha</mat-label>
                  <input matInput [matDatepicker]="fechaPicker" formControlName="fecha" required>
                  <mat-datepicker-toggle matIconSuffix [for]="fechaPicker"></mat-datepicker-toggle>
                  <mat-datepicker #fechaPicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline" class="metodo-field">
                  <mat-label>Método de Pago *</mat-label>
                  <mat-select formControlName="metodo_pago" required>
                    @for (metodo of metodosPago; track metodo.value) {
                      <mat-option [value]="metodo.value">
                        <mat-icon>{{ metodo.icon }}</mat-icon>
                        {{ metodo.label }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="caja-field">
                  <mat-label>Caja *</mat-label>
                  <mat-select formControlName="id_caja" required>
                    @for (caja of cajas(); track caja.id_caja) {
                      <mat-option [value]="caja.id_caja">{{ caja.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Notas</mat-label>
                  <textarea matInput 
                            formControlName="notas"
                            rows="2"
                            placeholder="Notas adicionales sobre la factura..."></textarea>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Productos/Servicios -->
          <mat-card class="form-section products-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>shopping_cart</mat-icon>
                Productos y Servicios
              </mat-card-title>
              <div class="card-actions">
                <button mat-icon-button 
                        type="button"
                        (click)="abrirBuscadorProductos()"
                        matTooltip="Buscar productos">
                  <mat-icon>add_shopping_cart</mat-icon>
                </button>
              </div>
            </mat-card-header>
            <mat-card-content>
              
              <!-- Buscador de productos -->
              <div class="product-search-section">
                <mat-form-field appearance="outline" class="search-product-field">
                  <mat-label>Buscar producto</mat-label>
                  <input matInput 
                         #productSearch
                         placeholder="Nombre, código o código de barras"
                         (keyup.enter)="buscarProducto(productSearch.value)">
                  <button matSuffix 
                          mat-icon-button 
                          (click)="buscarProducto(productSearch.value)"
                          [disabled]="!productSearch.value">
                    <mat-icon>search</mat-icon>
                  </button>
                </mat-form-field>
              </div>

              <!-- Tabla de productos -->
              <div class="products-table-container">
                @if (lineasFactura().length > 0) {
                  <table mat-table [dataSource]="lineasFactura()" class="products-table">
                    
                    <ng-container matColumnDef="producto">
                      <th mat-header-cell *matHeaderCellDef>Producto</th>
                      <td mat-cell *matCellDef="let linea; let i = index">
                        <div class="product-info">
                          <span class="product-name">{{ linea.producto?.nombre }}</span>
                          <span class="product-code">{{ linea.producto?.codigo }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="cantidad">
                      <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                      <td mat-cell *matCellDef="let linea; let i = index">
                        <mat-form-field appearance="outline" class="cantidad-field">
                          <input matInput 
                                 type="number"
                                 [value]="linea.cantidad"
                                 (input)="updateCantidad(i, $event)"
                                 min="1"
                                 step="1">
                        </mat-form-field>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="precio">
                      <th mat-header-cell *matHeaderCellDef>Precio Unit.</th>
                      <td mat-cell *matCellDef="let linea; let i = index">
                        <mat-form-field appearance="outline" class="precio-field">
                          <input matInput 
                                 type="number"
                                 [value]="linea.precio_unitario"
                                 (input)="updatePrecio(i, $event)"
                                 min="0"
                                 step="0.01">
                          <span matTextPrefix>$</span>
                        </mat-form-field>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="descuento">
                      <th mat-header-cell *matHeaderCellDef>Desc. %</th>
                      <td mat-cell *matCellDef="let linea; let i = index">
                        <mat-form-field appearance="outline" class="descuento-field">
                          <input matInput 
                                 type="number"
                                 [value]="linea.descuento"
                                 (input)="updateDescuento(i, $event)"
                                 min="0"
                                 max="100"
                                 step="0.1">
                          <span matTextSuffix>%</span>
                        </mat-form-field>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="subtotal">
                      <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                      <td mat-cell *matCellDef="let linea">
                        <span class="subtotal-value">{{ formatearMoneda(linea.subtotal) }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="acciones">
                      <th mat-header-cell *matHeaderCellDef>Acciones</th>
                      <td mat-cell *matCellDef="let linea; let i = index">
                        <button mat-icon-button 
                                color="warn"
                                (click)="removerLinea(i)"
                                matTooltip="Eliminar">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                  </table>
                } @else {
                  <div class="no-products">
                    <mat-icon>shopping_cart</mat-icon>
                    <h3>No hay productos agregados</h3>
                    <p>Use el buscador para agregar productos a la factura</p>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Totales -->
          <mat-card class="form-section totals-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>calculate</mat-icon>
                Totales de la Factura
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="totals-grid">
                <div class="total-row">
                  <span class="total-label">Subtotal:</span>
                  <span class="total-value">{{ formatearMoneda(subtotal()) }}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Descuento:</span>
                  <span class="total-value discount">{{ formatearMoneda(descuentoTotal()) }}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">IVA:</span>
                  <span class="total-value">{{ formatearMoneda(impuestosTotal()) }}</span>
                </div>
                <mat-divider></mat-divider>
                <div class="total-row final-total">
                  <span class="total-label">TOTAL:</span>
                  <span class="total-value">{{ formatearMoneda(totalFactura()) }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </form>

      <!-- Loading overlay -->
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="50"></mat-spinner>
          <p>{{ isEdit() ? 'Actualizando' : 'Guardando' }} factura...</p>
        </div>
      }
    </div>
  `,
  styleUrl: './factura-form.component.css'
})
export class FacturaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  isEdit = signal(false);
  factura = signal<Factura | null>(null);
  cajas = signal<Caja[]>([]);
  lineasFactura = signal<LineaFactura[]>([]);

  // Form
  facturaForm: FormGroup;

  // Computed values
  subtotal = computed(() => {
    return this.lineasFactura().reduce((sum, linea) => sum + (linea.cantidad * linea.precio_unitario), 0);
  });

  descuentoTotal = computed(() => {
    return this.lineasFactura().reduce((sum, linea) => {
      const subtotalLinea = linea.cantidad * linea.precio_unitario;
      return sum + (subtotalLinea * linea.descuento / 100);
    }, 0);
  });

  impuestosTotal = computed(() => {
    return this.lineasFactura().reduce((sum, linea) => {
      const subtotalLinea = linea.cantidad * linea.precio_unitario;
      const descuentoLinea = subtotalLinea * linea.descuento / 100;
      const baseGravable = subtotalLinea - descuentoLinea;
      const iva = linea.producto?.iva_aplicable || 0;
      return sum + (baseGravable * iva / 100);
    }, 0);
  });

  totalFactura = computed(() => {
    return this.subtotal() - this.descuentoTotal() + this.impuestosTotal();
  });

  // Autocomplete
  clientesFiltrados$: Observable<any[]>;

  // Table
  displayedColumns = ['producto', 'cantidad', 'precio', 'descuento', 'subtotal', 'acciones'];

  // Opciones
  metodosPago = [
    { value: 'Efectivo', label: 'Efectivo', icon: 'paid' },
    { value: 'Tarjeta', label: 'Tarjeta', icon: 'credit_card' },
    { value: 'Transferencia', label: 'Transferencia', icon: 'account_balance' },
    { value: 'Cheque', label: 'Cheque', icon: 'payment' }
  ];

  constructor() {
    this.facturaForm = this.fb.group({
      codigo_factura: [this.facturacionService.generarCodigoFactura()],
      fecha: [new Date(), Validators.required],
      cliente_nombre: [''],
      cliente_documento: [''],
      cliente_telefono: [''],
      cliente_direccion: [''],
      metodo_pago: ['', Validators.required],
      id_caja: ['', Validators.required],
      notas: ['']
    });

    // Setup autocomplete
    this.clientesFiltrados$ = this.facturaForm.get('cliente_nombre')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.buscarClientes(value);
        }
        return [];
      })
    );
  }

  ngOnInit(): void {
    const facturaId = this.route.snapshot.paramMap.get('id');
    
    if (facturaId) {
      this.isEdit.set(true);
      this.loadFactura(facturaId);
    }

    this.loadCajas();
  }

  private loadFactura(id: string): void {
    this.loading.set(true);
    this.facturacionService.getFactura(id).subscribe({
      next: (factura) => {
        this.factura.set(factura);
        this.populateForm(factura);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando factura:', error);
        this.snackBar.open('Error cargando factura', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private populateForm(factura: Factura): void {
    this.facturaForm.patchValue({
      codigo_factura: factura.codigo_factura,
      fecha: new Date(factura.fecha),
      cliente_nombre: factura.cliente?.nombre || '',
      cliente_documento: factura.cliente?.documento || '',
      cliente_telefono: factura.cliente?.telefono || '',
      cliente_direccion: factura.cliente?.direccion || '',
      metodo_pago: factura.metodo_pago,
      id_caja: factura.id_caja,
      notas: factura.notas || ''
    });

    this.lineasFactura.set(factura.lineas || []);
  }

  private loadCajas(): void {
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => {
        this.cajas.set(cajas.filter(caja => caja.activa));
      },
      error: (error) => {
        console.error('Error cargando cajas:', error);
      }
    });
  }

  private buscarClientes(query: string): Observable<any[]> {
    // Aquí se integraría con el servicio de clientes
    // Por ahora retorna un observable vacío
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  onClienteSelected(event: any): void {
    const cliente = event.option.value;
    this.facturaForm.patchValue({
      cliente_nombre: cliente.nombre,
      cliente_documento: cliente.documento,
      cliente_telefono: cliente.telefono,
      cliente_direccion: cliente.direccion
    });
  }

  abrirBuscadorProductos(): void {
    // Implementar modal de búsqueda de productos
    this.snackBar.open('Función de búsqueda en desarrollo', 'Cerrar', { duration: 2000 });
  }

  buscarProducto(query: string): void {
    if (!query.trim()) return;

    this.facturacionService.buscarProductosPorTexto(query).subscribe({
      next: (productos) => {
        if (productos.length > 0) {
          this.agregarProducto(productos[0]);
        } else {
          this.snackBar.open('Producto no encontrado', 'Cerrar', { duration: 2000 });
        }
      },
      error: (error) => {
        console.error('Error buscando producto:', error);
        this.snackBar.open('Error buscando producto', 'Cerrar', { duration: 2000 });
      }
    });
  }

  private agregarProducto(producto: any): void {
    const nuevaLinea: LineaFactura = {
      id_linea: this.generateLineId(),
      id_producto: producto.id_producto,
      producto: {
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        tipo: producto.tipo,
        categoria: producto.categoria,
        marca: producto.marca,
        unidad_medida: producto.unidad_medida,
        iva_aplicable: producto.iva_aplicable || 0
      },
      cantidad: 1,
      precio_unitario: producto.precio_venta || 0,
      descuento: 0,
      subtotal: producto.precio_venta || 0
    };

    const lineasActuales = this.lineasFactura();
    this.lineasFactura.set([...lineasActuales, nuevaLinea]);
  }

  private generateLineId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  updateCantidad(index: number, event: any): void {
    const cantidad = parseFloat(event.target.value) || 1;
    const lineas = [...this.lineasFactura()];
    lineas[index].cantidad = cantidad;
    lineas[index].subtotal = cantidad * lineas[index].precio_unitario;
    this.lineasFactura.set(lineas);
  }

  updatePrecio(index: number, event: any): void {
    const precio = parseFloat(event.target.value) || 0;
    const lineas = [...this.lineasFactura()];
    lineas[index].precio_unitario = precio;
    lineas[index].subtotal = lineas[index].cantidad * precio;
    this.lineasFactura.set(lineas);
  }

  updateDescuento(index: number, event: any): void {
    const descuento = parseFloat(event.target.value) || 0;
    const lineas = [...this.lineasFactura()];
    lineas[index].descuento = Math.min(100, Math.max(0, descuento));
    this.lineasFactura.set(lineas);
  }

  removerLinea(index: number): void {
    const lineas = [...this.lineasFactura()];
    lineas.splice(index, 1);
    this.lineasFactura.set(lineas);
  }

  saveFactura(): void {
    if (this.facturaForm.invalid || this.lineasFactura().length === 0) {
      this.snackBar.open('Por favor complete todos los campos obligatorios y agregue al menos un producto', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const formValue = this.facturaForm.value;

    const facturaData: Omit<Factura, 'id_factura' | 'created_at' | 'created_by'> = {
      codigo_factura: formValue.codigo_factura,
      cliente: formValue.cliente_nombre ? {
        nombre: formValue.cliente_nombre,
        documento: formValue.cliente_documento,
        telefono: formValue.cliente_telefono,
        direccion: formValue.cliente_direccion
      } : undefined,
      fecha: formValue.fecha.toISOString(),
      subtotal: this.subtotal(),
      impuestos: this.impuestosTotal(),
      descuento: this.descuentoTotal(),
      total: this.totalFactura(),
      metodo_pago: formValue.metodo_pago,
      estado: 'Pendiente',
      id_caja: formValue.id_caja,
      notas: formValue.notas,
      lineas: this.lineasFactura()
    };

    const operation = this.isEdit() 
      ? this.facturacionService.updateFactura(this.factura()!.id_factura, facturaData)
      : this.facturacionService.createFactura(facturaData);

    operation.subscribe({
      next: (result) => {
        this.snackBar.open(
          this.isEdit() ? 'Factura actualizada exitosamente' : 'Factura creada exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading.set(false);
        this.router.navigate(['/facturacion']);
      },
      error: (error) => {
        console.error('Error guardando factura:', error);
        this.snackBar.open('Error guardando factura', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  resetForm(): void {
    if (this.isEdit()) {
      this.populateForm(this.factura()!);
    } else {
      this.facturaForm.reset({
        codigo_factura: this.facturacionService.generarCodigoFactura(),
        fecha: new Date()
      });
      this.lineasFactura.set([]);
    }
  }

  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  goBack(): void {
    this.router.navigate(['/facturacion']);
  }
}