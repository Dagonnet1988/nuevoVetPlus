import { Component, OnInit, AfterViewInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { Observable, map, startWith, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { FacturacionService, CreateFacturaData } from '../../services/facturacion.service';
import { ClientesService } from '../../services/clientes.service';
import { PacientesService } from '../../services/pacientes.service';

// Interfaces simplificadas para evitar conflictos
interface Cliente {
  id_cliente: string;
  nombre: string;
  cedula?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface Mascota {
  id_mascota: string;
  nombre: string;
  especie: string;
  raza: string;
  cliente?: Cliente;
}

@Component({
  selector: 'app-nueva-factura',
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
    MatAutocompleteModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './nueva-factura.component.html',
  styleUrl: './nueva-factura.component.css'
})
export class NuevaFacturaComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private facturacionService = inject(FacturacionService);
  private clientesService = inject(ClientesService);
  private pacientesService = inject(PacientesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Estado
  guardando = signal(false);
  clientesFiltrados$!: Observable<Cliente[]>;
  productosFiltrados$ = signal<any[]>([]);
  clienteSeleccionado = signal<Cliente | null>(null);
  mascotaSeleccionada = signal<any>(null);
  mascotasCliente = signal<any[]>([]);
  cajas = signal<any[]>([]);
  buscandoProductos = signal(false);
  clienteBuscado = signal<string>('');

  // ViewChild references
  @ViewChild('clienteSearchInput') clienteSearchInput!: ElementRef;
  @ViewChild('productoSearchInput') productoSearchInput!: ElementRef;

  // Formularios
  clienteForm!: FormGroup;
  facturaForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForms();
    this.loadCajasActivas();
  }

  ngAfterViewInit(): void {
    // ✅ Setup autocomplete con delay para asegurar que todo esté inicializado
    setTimeout(() => {
      if (this.clienteForm) {
        this.setupClienteAutocomplete();
        this.setupProductoAutocomplete();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private initializeForms(): void {
    this.clienteForm = this.fb.group({
      nombre: ['', Validators.required],
      cedula: [''],
      telefono: [''],
      email: ['', Validators.email],
      direccion: [''],
      id_mascota: [''] // Campo opcional para paciente
    });

    this.facturaForm = this.fb.group({
      metodo_pago: ['Efectivo', Validators.required],
      id_caja: [''],
      notas: [''],
      lineas: this.fb.array([], Validators.minLength(1))
    });

    // Validación condicional para caja
    this.facturaForm.get('metodo_pago')?.valueChanges.subscribe(metodo => {
      const cajaControl = this.facturaForm.get('id_caja');
      if (metodo === 'Crédito') {
        cajaControl?.clearValidators();
        cajaControl?.setValue('');
      } else {
        cajaControl?.setValidators(Validators.required);
        // Seleccionar primera caja activa si no hay selección
        if (!cajaControl?.value && this.cajas().length > 0) {
          cajaControl?.setValue(this.cajas()[0].id_caja);
        }
      }
      cajaControl?.updateValueAndValidity();
    });
  }

  private setupClienteAutocomplete(): void {
    // El autocomplete se maneja directamente desde el template con (input)
    // No necesitamos configurar un observable aquí
  }

  private setupProductoAutocomplete(): void {
    // Se configura por línea individualmente en el template
  }

  private buscarClientes(termino: string): Observable<Cliente[]> {
    return this.clientesService.getClientes(1, 20, termino).pipe(
      map((response: { data: Cliente[], pagination: any }) => response.data || [])
    );
  }

  private loadCajasActivas(): void {
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => {
        const cajasActivas = cajas.filter(c => c.activa);
        this.cajas.set(cajasActivas);

        // Seleccionar la primera caja activa por defecto
        if (cajasActivas.length > 0) {
          this.facturaForm.patchValue({
            id_caja: cajasActivas[0].id_caja
          });
        }
      },
      error: (error) => {
        console.error('Error cargando cajas:', error);
        this.cajas.set([]);
      }
    });
  }

  // Método para verificar si mostrar el campo de caja
  mostrarCampoCaja(): boolean {
    const metodoPago = this.facturaForm.get('metodo_pago')?.value;
    return metodoPago !== 'Crédito';
  }

  onClienteSearchInput(termino: string): void {
    this.clienteBuscado.set(termino);
    // Actualizar el observable de clientes filtrados
    if (termino && termino.length >= 3) {
      this.clientesFiltrados$ = this.buscarClientes(termino);
    } else {
      this.clientesFiltrados$ = of([]);
    }
  }

  onClienteSeleccionado(event: MatAutocompleteSelectedEvent): void {
    const cliente = event.option.value;
    this.clienteSeleccionado.set(cliente);
    this.clienteForm.patchValue({
      nombre: cliente.nombre,
      cedula: cliente.cedula,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      id_mascota: '' // Reset mascota selection
    });

    // Limpiar selección anterior de mascota
    this.mascotaSeleccionada.set(null);

    // Cargar mascotas del cliente
    this.cargarMascotasCliente(cliente.id_cliente);

    // Limpiar el input de búsqueda
    if (this.clienteSearchInput) {
      this.clienteSearchInput.nativeElement.value = '';
    }

    this.snackBar.open('Cliente cargado automáticamente', 'Cerrar', { duration: 2000 });
  }

  private cargarMascotasCliente(idCliente: string): void {
    console.log('🔍 Cargando mascotas para cliente:', idCliente);
    this.pacientesService.getMascotasByCliente(idCliente).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta del backend:', response);
        // ✅ El backend devuelve { success: true, data: [...], total: N }
        const mascotas = response.data || [];
        console.log('✅ Mascotas extraídas:', mascotas);

        const mascotasConCliente = mascotas.map((mascota: any) => ({
          ...mascota,
          cliente: this.clienteSeleccionado()
        }));
        this.mascotasCliente.set(mascotasConCliente);
        console.log('📋 Signal mascotasCliente actualizado:', this.mascotasCliente());
      },
      error: (error: any) => {
        console.error('❌ Error cargando mascotas del cliente:', error);
        this.mascotasCliente.set([]);
      }
    });
  }

  onMascotaSeleccionada(mascota: any): void {
    this.mascotaSeleccionada.set(mascota);
    this.clienteForm.patchValue({
      id_mascota: mascota.id_mascota
    });
    this.snackBar.open(`Mascota "${mascota.nombre}" seleccionada`, 'Cerrar', { duration: 2000 });
  }

  displayMascota(mascota: any): string {
    return mascota ? `${mascota.nombre} - ${mascota.especie} (${mascota.raza})` : '';
  }

  onProductoSeleccionado(event: MatAutocompleteSelectedEvent): void {
    const producto = event.option.value;
    this.agregarProducto(producto);

    // ✅ Limpiar el input de búsqueda y resetear el autocomplete
    if (this.productoSearchInput) {
      this.productoSearchInput.nativeElement.value = '';
    }

    // ✅ Limpiar la lista de productos filtrados para evitar mostrar resultados antiguos
    this.productosFiltrados$.set([]);

    this.snackBar.open(`Producto "${producto.nombre}" agregado a la factura`, 'Cerrar', { duration: 2000 });
  }

  buscarProductos(termino: string): void {
    if (!termino || termino.length < 2) {
      this.productosFiltrados$.set([]);
      return;
    }

    if (this.buscandoProductos()) {
      return; // Evitar búsquedas simultáneas
    }

    this.buscandoProductos.set(true);

    this.facturacionService.buscarProductosPorTexto(termino).subscribe({
      next: (productos) => {
        // ✅ Filtrar solo productos activos con stock >= 1
        const productosFiltrados = (productos || []).filter((producto: any) =>
          producto.activo === true &&
          (!producto.inventariable || producto.stock_actual >= 1)
        );
        this.productosFiltrados$.set(productosFiltrados);
        this.buscandoProductos.set(false);
      },
      error: (error) => {
        console.error('Error buscando productos:', error);
        this.productosFiltrados$.set([]);
        this.buscandoProductos.set(false);
      }
    });
  }

  onProductoInput(termino: string): void {
    // Limpiar búsqueda anterior
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Si el término está vacío, limpiar resultados
    if (!termino || termino.trim() === '') {
      this.productosFiltrados$.set([]);
      return;
    }

    // Establecer nuevo timeout para búsqueda con debounce
    this.timeoutId = setTimeout(() => {
      this.buscarProductos(termino);
    }, 300); // 300ms de debounce
  }

  onProductoFocus(): void {
    // ✅ Limpiar resultados anteriores cuando el usuario hace focus
    this.productosFiltrados$.set([]);
  }

  private timeoutId: any;

  agregarProducto(producto?: any): void {
    const lineaForm = this.fb.group({
      id_producto: [producto?.id_producto || ''],
      codigo: [producto?.codigo || ''],
      descripcion: [producto?.nombre || '', Validators.required],
      presentacion: [producto?.unidad_medida || 'unidad'], // ✅ Viene del inventario, no editable
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      precio_unitario: [producto?.precio_venta || 0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      stock_disponible: [producto?.inventariable ? producto.stock_actual : null]
    });

    this.lineasArray.push(lineaForm);
  }

  validarStock(index: number): void {
    const linea = this.lineasArray.at(index);
    const cantidad = linea.get('cantidad')?.value || 0;
    const stockDisponible = linea.get('stock_disponible')?.value;

    if (stockDisponible !== null && cantidad > stockDisponible) {
      this.snackBar.open(`Stock insuficiente. Disponible: ${stockDisponible}`, 'Cerrar', { duration: 3000 });
      linea.get('cantidad')?.setValue(stockDisponible);
    }
  }

  removerProducto(index: number): void {
    if (this.lineasArray.length > 1) {
      this.lineasArray.removeAt(index);
    } else {
      this.snackBar.open('Debe mantener al menos un producto', 'Cerrar', { duration: 3000 });
    }
  }

  calcularSubtotalLinea(index: number): number {
    const linea = this.lineasArray.at(index);
    const cantidad = linea.get('cantidad')?.value || 0;
    const precio = linea.get('precio_unitario')?.value || 0;
    const descuento = linea.get('descuento')?.value || 0;

    return cantidad * precio * (1 - descuento / 100);
  }

  calcularTotal(): number {
    let total = 0;
    for (let i = 0; i < this.lineasArray.length; i++) {
      total += this.calcularSubtotalLinea(i);
    }
    return total;
  }

  async guardarFactura(): Promise<void> {
    if (this.clienteForm.invalid) {
      this.snackBar.open('Complete los datos del cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.facturaForm.invalid) {
      this.snackBar.open('Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const confirmacion = confirm(
      `¿Crear factura por $${this.calcularTotal().toLocaleString('es-CO')}?`
    );

    if (!confirmacion) return;

    this.guardando.set(true);

    try {
      let idCliente = '';

      // 1. Usar cliente seleccionado o crear uno nuevo
      if (this.clienteSeleccionado()) {
        idCliente = this.clienteSeleccionado()!.id_cliente;
      } else {
        // Crear cliente nuevo
        const clienteData = this.clienteForm.value;
        const nuevoCliente = await this.crearCliente(clienteData);
        idCliente = nuevoCliente.id_cliente;
      }

      // 2. Preparar datos de la factura
      const metodoPago = this.facturaForm.get('metodo_pago')?.value;
      const idCaja = metodoPago === 'Crédito' ? null : this.facturaForm.get('id_caja')?.value;

      // Validar caja si no es crédito
      if (metodoPago !== 'Crédito' && !idCaja) {
        this.snackBar.open('Debe seleccionar una caja', 'Cerrar', { duration: 3000 });
        this.guardando.set(false);
        return;
      }

      // ✅ Mapear a formato que espera el backend (items en lugar de lineas)
      const items = this.lineasArray.value.map((linea: any) => ({
        // ✅ Usar código o código de barras según corresponda
        codigo: linea.codigo || '',
        // ✅ Asegurar que precio_unitario sea número
        precio_unitario: parseFloat(linea.precio_unitario) || 0,
        cantidad: linea.cantidad,
        descripcion: linea.descripcion,
        descuento: linea.descuento || 0
      }));

      const total = this.calcularTotal();

      const facturaData = {
        id_cliente: idCliente,
        id_consulta: null, // Por ahora no asociamos a consulta específica desde facturación
        descuento: 0,
        notas: this.facturaForm.get('notas')?.value || '',
        tipo_pago: metodoPago,
        items: items // ✅ Enviar items en lugar de lineas
      };

      // 3. Crear factura
      this.facturacionService.createFactura(facturaData).subscribe({
        next: (response: any) => {
          this.guardando.set(false);
          this.snackBar.open('Factura creada exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/facturacion']);
        },
        error: (error) => {
          this.guardando.set(false);
          console.error('Error creando factura:', error);
          this.snackBar.open('Error creando factura', 'Cerrar', { duration: 3000 });
        }
      });

    } catch (error) {
      this.guardando.set(false);
      console.error('Error en el proceso:', error);
      this.snackBar.open('Error en el proceso de creación', 'Cerrar', { duration: 3000 });
    }
  }

  private async crearCliente(clienteData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.clientesService.createCliente(clienteData).subscribe({
        next: (cliente) => resolve(cliente),
        error: (error) => reject(error)
      });
    });
  }

  cancelar(): void {
    this.router.navigate(['/facturacion']);
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? `${cliente.nombre} - ${cliente.cedula || 'Sin cédula'}` : '';
  }

  displayProducto(producto: any): string {
    return producto ? `${producto.nombre} (${producto.codigo || 'N/A'})` : '';
  }

  get lineasArray(): FormArray {
    return this.facturaForm.get('lineas') as FormArray;
  }
}
