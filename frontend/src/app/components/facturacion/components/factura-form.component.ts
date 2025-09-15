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
import { Observable, map, startWith, debounceTime, switchMap, of } from 'rxjs';

import {
  FacturacionService,
  Factura,
  LineaFactura,
  Caja
} from '../../../services/facturacion.service';
import { PacientesService } from '../../../services/pacientes.service';

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
                         formControlName="productoSearch"
                         placeholder="Nombre, código o código de barras"
                         [matAutocomplete]="productAuto">
                  <mat-autocomplete #productAuto="matAutocomplete"
                                    (optionSelected)="onProductoSelected($event)">
                    @for (producto of productosFiltrados$ | async; track producto.id_producto) {
                      <mat-option [value]="producto">
                        <div class="product-option">
                          <span class="product-name">{{ producto.nombre }}</span>
                          <span class="product-code">{{ producto.codigo }}</span>
                          <span class="product-price">$ {{ producto.precio_venta }}</span>
                        </div>
                      </mat-option>
                    }
                  </mat-autocomplete>
                  <mat-hint>Busque productos activos en el inventario</mat-hint>
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
                        <span class="precio-unitario-value">$ {{ formatearMoneda(linea.precio_unitario) }}</span>
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
  private pacientesService = inject(PacientesService);
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
  productosFiltrados$: Observable<any[]>;

  // Paquetes de terapias
  paquetesActivos = signal<any[]>([]);

  // Table
  displayedColumns = ['producto', 'cantidad', 'precio', 'descuento', 'subtotal', 'acciones'];

  // Opciones
  metodosPago = [
    { value: 'Efectivo', label: 'Efectivo', icon: 'paid' },
    { value: 'Tarjeta', label: 'Tarjeta', icon: 'credit_card' },
    { value: 'Transferencia', label: 'Transferencia', icon: 'account_balance' },
    { value: 'Cheque', label: 'Cheque', icon: 'payment' },
    { value: 'Crédito', label: 'Crédito', icon: 'schedule' }
  ];

  constructor() {
    this.facturaForm = this.fb.group({
      codigo_factura: [this.facturacionService.generarCodigoFactura()],
      fecha: [new Date(), Validators.required],
      cliente_nombre: [''],
      cliente_documento: [''],
      cliente_telefono: [''],
      cliente_direccion: [''],
      id_mascota: [''],
      productoSearch: [''],
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
        return of([]);
      })
    );

    this.productosFiltrados$ = this.facturaForm.get('productoSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.facturacionService.buscarProductosPorTexto(value);
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
    } else {
      // Verificar si hay query parameters de una cita completada
      this.loadDataFromQueryParams();
    }

    this.loadCajas();
  }

  private loadDataFromQueryParams(): void {
    const queryParams = this.route.snapshot.queryParams;

    if (queryParams['citaId']) {
      // Pre-llenar formulario con datos de la cita
      this.facturaForm.patchValue({
        cliente_nombre: queryParams['clienteNombre'] || '',
        cliente_documento: queryParams['clienteDocumento'] || '',
        cliente_telefono: queryParams['clienteTelefono'] || '',
        cliente_direccion: queryParams['clienteDireccion'] || '',
        id_mascota: queryParams['mascotaId'] || '',
        notas: `Factura para cita: ${queryParams['citaId']} - Paciente: ${queryParams['mascotaNombre'] || 'N/A'}`
      });

      // Cargar paquetes activos si hay una mascota seleccionada
      if (queryParams['mascotaId']) {
        this.cargarPaquetesActivos(queryParams['mascotaId']);
      }

      this.snackBar.open(
        `Datos cargados de la cita para ${queryParams['mascotaNombre'] || 'paciente'}`,
        'Cerrar',
        { duration: 4000 }
      );
    }
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
    return this.pacientesService.getClientes(1, 10, query).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.clients) {
          return response.data.clients;
        }
        return [];
      })
    );
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

  onProductoSelected(event: any): void {
    const producto = event.option.value;

    // Verificar paquetes activos solo para sesiones individuales de fisioterapia
    if (producto.tipo === 'Terapia Individual' &&
        producto.nombre?.toLowerCase().includes('fisioterapia') &&
        this.facturaForm.value.id_mascota) {
      this.verificarPaquetesActivos(producto);
    }

    this.agregarProducto(producto);
    // Clear the search field
    this.facturaForm.get('productoSearch')!.setValue('');
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
    // Determinar el precio basado en el tipo de producto y paquetes activos
    let precioUnitario = producto.precio_venta || 0;

    // Para sesiones individuales de fisioterapia, verificar si hay paquete activo
    if (producto.tipo === 'Terapia Individual' && producto.nombre?.toLowerCase().includes('fisioterapia') && this.facturaForm.value.id_mascota) {
      const paquetesActivos = this.paquetesActivos().filter(
        paquete => paquete.activo === true
      );

      if (paquetesActivos.length > 0) {
        // Si hay paquete activo, la sesión es gratuita
        precioUnitario = 0;
      } else {
        // Si no hay paquete activo, usar precio normal
        precioUnitario = producto.precio_venta || 0;
      }
    }

    // Para paquetes, siempre usar precio normal (se cobra completo)
    if (producto.tipo === 'Terapia Paquete') {
      precioUnitario = producto.precio_venta || 0;
    }

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
      precio_unitario: precioUnitario,
      descuento: 0,
      subtotal: precioUnitario * 1 // cantidad inicial es 1
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
    const linea = lineas[index];

    // Para sesiones de fisioterapia con paquete activo, no permitir cambiar precio
    if (linea.producto?.tipo === 'Terapia Individual' &&
        linea.producto.nombre?.toLowerCase().includes('fisioterapia') &&
        this.facturaForm.value.id_mascota) {

      const paquetesActivos = this.paquetesActivos().filter(
        paquete => paquete.activo === true
      );

      if (paquetesActivos.length > 0) {
        // Restaurar precio a 0 si se intenta cambiar
        linea.precio_unitario = 0;
        this.snackBar.open('No se puede modificar el precio de sesiones con paquete activo', 'Cerrar', { duration: 3000 });
        linea.subtotal = linea.cantidad * linea.precio_unitario;
        this.lineasFactura.set(lineas);
        return;
      }
    }

    // Para paquetes, permitir cambiar precio normalmente
    if (linea.producto?.tipo === 'Terapia Paquete') {
      linea.precio_unitario = precio;
    } else {
      // Para otros productos, permitir cambiar precio normalmente
      linea.precio_unitario = precio;
    }

    linea.subtotal = linea.cantidad * linea.precio_unitario;
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

    // Validar sesiones de terapia disponibles antes de guardar
    const lineasSesion = this.lineasFactura().filter(linea =>
      linea.producto?.tipo === 'Terapia Individual' &&
      linea.producto.nombre?.toLowerCase().includes('fisioterapia')
    );

    if (lineasSesion.length > 0) {
      // Solo validar si NO hay paquetes en la misma factura
      const lineasPaquete = this.lineasFactura().filter(linea =>
        linea.producto?.tipo === 'Terapia Paquete'
      );

      if (lineasPaquete.length === 0) {
        // Si solo hay sesiones, verificar paquetes activos
        const paquetesActivos = this.paquetesActivos().filter(p => p.activo === true);
        const sesionesTotales = lineasSesion.reduce((total, linea) => total + linea.cantidad, 0);

        if (paquetesActivos.length === 0) {
          this.snackBar.open(
            'No hay paquetes activos para descontar sesiones',
            'Cerrar',
            { duration: 5000 }
          );
          return;
        }

        const paquete = paquetesActivos[0];
        if (paquete.sesiones_restantes < sesionesTotales) {
          this.snackBar.open(
            `No hay suficientes sesiones disponibles. Disponibles: ${paquete.sesiones_restantes}`,
            'Cerrar',
            { duration: 5000 }
          );
          return;
        }
      }
      // Si hay paquetes en la factura, no validar sesiones (se crearán los paquetes primero)
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
        // Procesar descuentos de sesiones de terapia si existen
        this.procesarDescuentosTerapia(result.id_factura);

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

  // ===============================
  // PAQUETES DE TERAPIAS
  // ===============================

  private cargarPaquetesActivos(idMascota: string): void {
    this.facturacionService.verificarPaquetesActivos(idMascota).subscribe({
      next: (paquetes) => {
        this.paquetesActivos.set(paquetes);
        if (paquetes.length > 0) {
          this.snackBar.open(
            `Paciente tiene ${paquetes.length} paquete(s) de terapia activo(s)`,
            'Ver detalles',
            { duration: 5000 }
          ).onAction().subscribe(() => {
            this.mostrarDetallesPaquetes();
          });
        }
      },
      error: (error) => {
        console.error('Error cargando paquetes activos:', error);
      }
    });
  }

  private verificarPaquetesActivos(producto: any): void {
    // Solo mostrar información para sesiones individuales de fisioterapia
    if (producto.tipo === 'Terapia Individual' && producto.nombre?.toLowerCase().includes('fisioterapia')) {
      const paquetesActivos = this.paquetesActivos().filter(
        paquete => paquete.activo === true
      );

      if (paquetesActivos.length > 0) {
        const paquete = paquetesActivos[0];
        this.snackBar.open(
          `Paquete activo encontrado: ${paquete.sesiones_restantes} sesiones restantes`,
          'Ver detalles',
          { duration: 6000 }
        ).onAction().subscribe(() => {
          this.mostrarDetallesPaquete(paquete);
        });
      } else {
        this.snackBar.open(
          'No hay paquete activo - se cobrará precio normal',
          'Cerrar',
          { duration: 3000 }
        );
      }
    }
  }

  private mostrarDetallesPaquetes(): void {
    const paquetes = this.paquetesActivos();
    let mensaje = 'Paquetes activos:\n';
    paquetes.forEach((paquete, index) => {
      mensaje += `${index + 1}. ${paquete.producto_nombre}: ${paquete.sesiones_restantes}/${paquete.sesiones_total} sesiones\n`;
    });

    // Aquí podrías abrir un dialog más sofisticado
    alert(mensaje);
  }

  private mostrarDetallesPaquete(paquete: any): void {
    const mensaje = `Paquete: ${paquete.producto_nombre}\n` +
                   `Sesiones totales: ${paquete.sesiones_total}\n` +
                   `Sesiones usadas: ${paquete.sesiones_usadas}\n` +
                   `Sesiones restantes: ${paquete.sesiones_restantes}\n` +
                   `Fecha vencimiento: ${paquete.fecha_vencimiento || 'Sin vencimiento'}`;

    alert(mensaje);
  }

  private procesarDescuentosTerapia(idFactura: string): void {
    const lineasPaquete = this.lineasFactura().filter(linea =>
      linea.producto?.tipo === 'Terapia Paquete'
    );

    const lineasSesion = this.lineasFactura().filter(linea =>
      linea.producto?.tipo === 'Terapia Individual' &&
      linea.producto.nombre?.toLowerCase().includes('fisioterapia')
    );

    // Si no hay productos de terapia, salir
    if (lineasPaquete.length === 0 && lineasSesion.length === 0) return;

    // 1. Procesar paquetes (crear registros ACTIVOS en control_terapias)
    if (lineasPaquete.length > 0) {
      lineasPaquete.forEach(linea => {
        this.crearPaqueteTerapia(linea, idFactura);
      });
    }

    // 2. Procesar sesiones (descontar de paquetes activos)
    if (lineasSesion.length > 0) {
      // Si también hay paquetes en esta factura, esperar a que se creen primero
      if (lineasPaquete.length > 0) {
        setTimeout(() => {
          this.procesarSesionesTerapia(lineasSesion, idFactura);
        }, 1000); // Esperar 1 segundo para que se creen los paquetes
      } else {
        this.procesarSesionesTerapia(lineasSesion, idFactura);
      }
    }
  }

  private crearPaqueteTerapia(linea: LineaFactura, idFactura: string): void {
    if (!this.facturaForm.value.id_mascota) {
      console.error('No hay mascota seleccionada para crear paquete');
      return;
    }

    // Determinar sesiones totales basado en el nombre del producto
    let sesionesTotal = 10; // default
    const nombre = linea.producto?.nombre?.toLowerCase() || '';
    if (nombre.includes('10')) sesionesTotal = 10;
    else if (nombre.includes('5')) sesionesTotal = 5;
    else if (nombre.includes('20')) sesionesTotal = 20;

    this.facturacionService.crearPaqueteTerapia({
      id_mascota: this.facturaForm.value.id_mascota,
      id_producto: linea.id_producto,
      sesiones_total: sesionesTotal,
      precio_pagado: linea.precio_unitario * linea.cantidad
    }).subscribe({
      next: (result: any) => {
        this.snackBar.open(
          `Paquete de ${sesionesTotal} sesiones registrado y activado exitosamente`,
          'Cerrar',
          { duration: 3000 }
        );

        // Recargar paquetes activos para reflejar el nuevo paquete
        this.cargarPaquetesActivos(this.facturaForm.value.id_mascota);
      },
      error: (error: any) => {
        console.error('Error creando paquete:', error);
        this.snackBar.open('Error al registrar paquete de terapia', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private procesarSesionesTerapia(lineasSesion: LineaFactura[], idFactura: string): void {
    if (!this.facturaForm.value.id_mascota) {
      console.error('No hay mascota seleccionada para procesar sesiones');
      return;
    }

    // Recargar paquetes activos para tener la información más actualizada
    this.facturacionService.verificarPaquetesActivos(this.facturaForm.value.id_mascota).subscribe({
      next: (paquetes) => {
        const paquetesActivos = paquetes.filter(p => p.activo === true);

        if (paquetesActivos.length === 0) {
          this.snackBar.open(
            'No hay paquetes activos para descontar sesiones',
            'Cerrar',
            { duration: 3000 }
          );
          return;
        }

        // Procesar cada sesión
        lineasSesion.forEach(linea => {
          const sesionesUsadas = linea.cantidad;

          // Usar el primer paquete activo disponible
          const paquete = paquetesActivos[0];

          if (paquete.sesiones_restantes >= sesionesUsadas) {
            this.facturacionService.registrarUsoTerapia(paquete.id_control, sesionesUsadas).subscribe({
              next: (result: any) => {
                this.snackBar.open(
                  `Se descontaron ${sesionesUsadas} sesiones. Restantes: ${result.data.sesiones_restantes}`,
                  'Cerrar',
                  { duration: 5000 }
                );
              },
              error: (error: any) => {
                console.error('Error descontando sesiones:', error);
                this.snackBar.open('Error al descontar sesiones de terapia', 'Cerrar', { duration: 3000 });
              }
            });
          } else {
            this.snackBar.open(
              `No hay suficientes sesiones disponibles en el paquete`,
              'Cerrar',
              { duration: 5000 }
            );
          }
        });
      },
      error: (error) => {
        console.error('Error cargando paquetes activos:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/facturacion']);
  }
}
