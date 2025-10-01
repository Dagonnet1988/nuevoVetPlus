import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, map, startWith } from 'rxjs';

import { ClientesService } from '../../../services/clientes.service';
import { PacientesService } from '../../../services/pacientes.service';
import { FacturacionService } from '../../../services/facturacion.service';
import { ClienteSelectorComponent } from './cliente-selector.component';
import { LineasFacturaComponent } from './lineas-factura.component';


interface Paciente {
  id_paciente: string;
  nombre: string;
  especie: string;
  raza: string;
  cliente?: Cliente;
}

interface Producto {
  id_producto: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  inventariable: boolean;
}

interface Cliente {
  id_cliente: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

@Component({
  selector: 'app-factura-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
    MatDividerModule,
    MatStepperModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatExpansionModule,
    ClienteSelectorComponent,
    LineasFacturaComponent
  ],
  templateUrl: './factura-form.component.html',
  styleUrls: ['./factura-form.component.css']
})
export class FacturaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private facturacionService = inject(FacturacionService);
  private pacientesService = inject(PacientesService);
  private clientesService = inject(ClientesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals para estado reactivo
  loading = signal(false);
  guardando = signal(false);
  pacientes = signal<Paciente[]>([]);
  productos = signal<Producto[]>([]);
  cajas = signal<any[]>([]);
  totalFactura = signal(0);

  // Formularios
  pacienteForm!: FormGroup;
  clienteForm!: FormGroup;
  pacienteNuevoForm!: FormGroup;
  facturaForm!: FormGroup;

  // Estado del tipo de factura
  tipoFactura: 'con_paciente' | 'sin_paciente' = 'sin_paciente'; // Default sin paciente

  // Estado del cliente (OBLIGATORIO)
  clienteSeleccionado = signal<Cliente | null>(null);

  // Estados
  pacienteSeleccionado = signal<Paciente | null>(null);
  mostrarFormularioCliente = signal(false);
  filteredPacientes$!: Observable<Paciente[]>;
  editing = signal(false);

  // Estados de UI para secciones colapsables
  seccionClienteExpandida = signal(true);
  seccionProductosExpandida = signal(true);

  // Computed para detectar si hay terapias en las líneas
  tieneTerapias = computed(() => {
    const lineas = this.facturaForm.get('lineas') as FormArray;
    return lineas.controls.some(linea =>
      (linea.get('descripcion')?.value || '').toLowerCase().includes('terapia') ||
      (linea.get('descripcion')?.value || '').toLowerCase().includes('fisioterapia')
    );
  });

  ngOnInit(): void {
    this.initializeForms();
    this.loadInitialData();
    this.setupPacienteAutocomplete();
    this.checkForCitaData();
  }

  private initializeForms(): void {
    // Formulario de búsqueda de paciente
    this.pacienteForm = this.fb.group({
      pacienteSearch: ['']
    });

    // Formulario de cliente
    this.clienteForm = this.fb.group({
      nombre: ['', Validators.required],
      documento: ['', Validators.required],
      telefono: [''],
      email: ['', [Validators.email]],
      direccion: ['']
    });

    // Formulario de paciente nuevo
    this.pacienteNuevoForm = this.fb.group({
      nombre: [''],
      especie: [''],
      raza: [''],
      edad: ['']
    });

    // Formulario principal de factura
    this.facturaForm = this.fb.group({
      id_paciente: [''], // Opcional
      id_cliente: [''], // Se llena automáticamente
      metodo_pago: ['Efectivo', Validators.required],
      notas: [''],
      lineas: this.fb.array([], Validators.minLength(1))
    });
  }

  private loadInitialData(): void {
    this.loading.set(true);

    // Cargar pacientes (mascotas)
    this.pacientesService.getMascotas(1, 1000).subscribe({
      next: (response: any) => {
        // Adaptar la estructura de mascotas al formato esperado
        const pacientesData = (response.data?.pacientes || response.data || []).map((mascota: any) => ({
          id_paciente: mascota.id_mascota,
          nombre: mascota.nombre,
          especie: mascota.especie,
          raza: mascota.raza,
          cliente: mascota.cliente || mascota.propietario
        }));
        this.pacientes.set(pacientesData);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error cargando pacientes:', error);
        this.pacientes.set([]);
        this.loading.set(false);
      }
    });

    // Cargar cajas activas
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => {
        this.cajas.set(cajas.filter(c => c.activa));
      },
      error: (error) => {
        console.error('Error cargando cajas:', error);
        this.cajas.set([]);
      }
    });
  }

  private setupPacienteAutocomplete(): void {
    this.filteredPacientes$ = this.pacienteForm.get('pacienteSearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterPacientes(value || ''))
    );
  }

  private filterPacientes(value: string): Paciente[] {
    if (!value || typeof value !== 'string') {
      return this.pacientes();
    }

    const filterValue = value.toLowerCase();
    return this.pacientes().filter(paciente =>
      paciente.nombre?.toLowerCase().includes(filterValue) ||
      paciente.especie?.toLowerCase().includes(filterValue) ||
      paciente.raza?.toLowerCase().includes(filterValue)
    );
  }

  private checkForCitaData(): void {
    // Verificar si hay datos de cita en los queryParams
    const queryParams = this.route.snapshot.queryParams;

    if (queryParams['citaId']) {
      console.log('🎯 Datos de cita detectados:', queryParams);

      // Precargar datos del cliente
      if (queryParams['clienteNombre'] || queryParams['clienteDocumento']) {
        this.clienteForm.patchValue({
          nombre: queryParams['clienteNombre'] || '',
          documento: queryParams['clienteDocumento'] || '',
          telefono: queryParams['clienteTelefono'] || '',
          email: queryParams['clienteEmail'] || '',
          direccion: queryParams['clienteDireccion'] || ''
        });

        // Si hay documento, buscar cliente existente
        if (queryParams['clienteDocumento']) {
          this.buscarClienteExistente(queryParams['clienteDocumento']);
        }
      }

      // Precargar datos del paciente si viene
      if (queryParams['mascotaNombre']) {
        this.pacienteForm.patchValue({
          pacienteSearch: queryParams['mascotaNombre']
        });

        // Buscar paciente por nombre
        this.buscarPacientePorNombre(queryParams['mascotaNombre']);
      }

      this.snackBar.open('Datos precargados desde la cita', 'Cerrar', { duration: 3000 });
    }
  }

  private buscarClienteExistente(documento: string): void {
    // Aquí podrías implementar búsqueda de cliente existente por documento
    // Por ahora, solo marcamos que tenemos datos del cliente
    console.log('🔍 Buscando cliente existente con documento:', documento);
  }

  private buscarPacientePorNombre(nombre: string): void {
    // Buscar paciente en la lista cargada
    const pacienteEncontrado = this.pacientes().find(p =>
      p.nombre.toLowerCase().includes(nombre.toLowerCase())
    );

    if (pacienteEncontrado) {
      this.seleccionarPaciente(pacienteEncontrado);
    } else {
      console.log('⚠️ Paciente no encontrado en la lista:', nombre);
    }
  }

  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado.set(paciente);
    this.pacienteForm.patchValue({
      pacienteSearch: `${paciente.nombre} - ${paciente.especie} (${paciente.raza})`
    });

    // Si el paciente tiene cliente asociado, autocompletar
    if (paciente.cliente) {
      this.facturaForm.patchValue({
        id_cliente: paciente.cliente.id_cliente
      });
      this.clienteForm.patchValue({
        nombre: paciente.cliente.nombre,
        documento: paciente.cliente.documento,
        telefono: paciente.cliente.telefono,
        email: paciente.cliente.email,
        direccion: paciente.cliente.direccion
      });
      this.mostrarFormularioCliente.set(false);
    } else {
      // Si no tiene cliente, mostrar formulario para crear uno
      this.mostrarFormularioCliente.set(true);
      this.clienteForm.reset();
    }

    // Relacionar paciente con factura
    this.facturaForm.patchValue({
      id_paciente: paciente.id_paciente
    });
  }

  crearCliente(): void {
    if (this.clienteForm.invalid) {
      this.snackBar.open('Complete todos los campos requeridos del cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    const clienteData = this.clienteForm.value;

    this.clientesService.createCliente(clienteData).subscribe({
      next: (cliente: any) => {
        this.facturaForm.patchValue({
          id_cliente: cliente.id_cliente
        });
        this.mostrarFormularioCliente.set(false);
        this.snackBar.open('Cliente creado exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (error: any) => {
        console.error('Error creando cliente:', error);
        this.snackBar.open('Error creando cliente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Método para crear cliente (versión síncrona para usar en guardarFactura)
  private crearClienteSync(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.clienteForm.invalid) {
        reject(new Error('Formulario de cliente inválido'));
        return;
      }

      const clienteData = this.clienteForm.value;

      this.clientesService.createCliente(clienteData).subscribe({
        next: (cliente: any) => {
          this.facturaForm.patchValue({
            id_cliente: cliente.id_cliente
          });
          resolve(cliente);
        },
        error: (error: any) => {
          console.error('Error creando cliente:', error);
          reject(error);
        }
      });
    });
  }

  agregarLineaFactura(): void {
    const lineas = this.facturaForm.get('lineas') as FormArray;
    lineas.push(this.fb.group({
      id_producto: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      descuento: [0, [Validators.min(0), Validators.max(100)]]
    }));
  }

  removerLineaFactura(index: number): void {
    const lineas = this.facturaForm.get('lineas') as FormArray;
    lineas.removeAt(index);
  }

  buscarProducto(index: number): void {
    const linea = (this.facturaForm.get('lineas') as FormArray).at(index);
    const codigo = linea.get('id_producto')?.value;

    if (codigo) {
      this.facturacionService.buscarProductoPorCodigo(codigo).subscribe({
        next: (producto) => {
          linea.patchValue({
            precio_unitario: producto.precio_venta,
            descripcion: producto.nombre
          });
        },
        error: (error) => {
          console.error('Producto no encontrado:', error);
          this.snackBar.open('Producto no encontrado', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  calcularTotalLinea(index: number): number {
    const linea = (this.facturaForm.get('lineas') as FormArray).at(index);
    const cantidad = linea.get('cantidad')?.value || 0;
    const precioUnitario = linea.get('precio_unitario')?.value || 0;
    const descuento = linea.get('descuento')?.value || 0;

    const subtotal = cantidad * precioUnitario;
    const montoDescuento = (subtotal * descuento) / 100;

    return subtotal - montoDescuento;
  }

  calcularTotalFactura(): number {
    const lineas = this.facturaForm.get('lineas') as FormArray;
    let total = 0;

    for (let i = 0; i < lineas.length; i++) {
      total += this.calcularTotalLinea(i);
    }

    return total;
  }

  async guardarFactura(): Promise<void> {
    // Validar cliente obligatorio
    if (!this.clienteSeleccionado()) {
      this.snackBar.open('Debe seleccionar un cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar formulario de factura
    if (this.facturaForm.invalid) {
      this.snackBar.open('Complete todos los campos requeridos de la factura', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar que haya al menos una línea
    const lineas = this.facturaForm.get('lineas') as FormArray;
    if (lineas.length === 0) {
      this.snackBar.open('Agregue al menos un producto a la factura', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validación especial para terapias: requerir paciente
    if (this.tieneTerapias() && !this.pacienteSeleccionado()) {
      this.snackBar.open('Para productos de terapia, debe seleccionar un paciente', 'Cerrar', { duration: 4000 });
      return;
    }

    // Confirmación antes de guardar
    const clienteNombre = this.clienteSeleccionado()?.nombre;
    const totalFormateado = this.facturacionService.formatearMoneda(this.totalFactura());
    const confirmado = confirm(
      `¿Está seguro de crear la factura?\n\n` +
      `Cliente: ${clienteNombre}\n` +
      `Total: ${totalFormateado}\n` +
      `Productos: ${lineas.length}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }

    this.guardando.set(true);

    try {
      // Preparar datos de la factura
      const facturaData = {
        ...this.facturaForm.value,
        id_cliente: this.clienteSeleccionado()!.id_cliente,
        id_paciente: this.pacienteSeleccionado()?.id_paciente || '',
        items: lineas.value.map((linea: any) => ({
          codigo: linea.id_producto,
          cantidad: linea.cantidad,
          precio_unitario: linea.precio_unitario,
          descripcion: linea.descripcion,
          descuento: linea.descuento || 0
        }))
      };

      // Crear la factura
      this.facturacionService.createFactura(facturaData).subscribe({
        next: (response: any) => {
          this.guardando.set(false);
          this.snackBar.open('Factura creada exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/facturacion']);
        },
        error: (error: any) => {
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

  onTotalChanged(total: number): void {
    this.totalFactura.set(total);
  }

  cancelar(): void {
    this.router.navigate(['/facturacion']);
  }

  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  get lineasFactura(): FormArray {
    return this.facturaForm.get('lineas') as FormArray;
  }

  // Método para mostrar el paciente en el autocomplete
  displayPaciente(paciente: Paciente): string {
    return paciente ? `${paciente.nombre} - ${paciente.especie} (${paciente.raza})` : '';
  }

  // Método para cambiar el tipo de factura
  onTipoFacturaChange(tipo: 'con_paciente' | 'sin_paciente'): void {
    this.tipoFactura = tipo;

    // Limpiar selecciones cuando se cambia el tipo
    if (tipo === 'sin_paciente') {
      this.pacienteSeleccionado.set(null);
      this.pacienteForm.reset();
      this.facturaForm.patchValue({ id_paciente: '' });
      this.clienteSeleccionado.set(null);
    } else {
      // Para "con paciente", limpiar selección de cliente
      this.clienteSeleccionado.set(null);
    }
  }

  // Método para buscar cliente por nombre - ELIMINADO
  // Ahora se maneja en ClienteSelectorComponent

  // Método para seleccionar cliente del ClienteSelectorComponent
  onClienteSeleccionado(cliente: Cliente | null): void {
    this.clienteSeleccionado.set(cliente);
    if (cliente) {
      this.facturaForm.patchValue({
        id_cliente: cliente.id_cliente
      });
      this.snackBar.open('Cliente seleccionado', 'Cerrar', { duration: 2000 });
    } else {
      this.facturaForm.patchValue({
        id_cliente: ''
      });
      this.snackBar.open('Cliente removido', 'Cerrar', { duration: 2000 });
    }
  }

  // Método para manejar creación de nuevo cliente
  onNuevoClienteClick(): void {
    this.mostrarFormularioCliente.set(true);
  }

  // Método auxiliar para buscar cliente por documento
  private async buscarClientePorDocumento(documento: string): Promise<any> {
    return new Promise((resolve) => {
      // Aquí iría la lógica para buscar cliente por documento
      // Por ahora, resolvemos con null (no encontrado)
      resolve(null);
    });
  }

  // Método auxiliar para crear cliente de forma asíncrona
  private async crearClienteAsync(): Promise<any> {
    return new Promise((resolve, reject) => {
      const clienteData = this.clienteForm.value;

      this.clientesService.createCliente(clienteData).subscribe({
        next: (cliente: any) => {
          this.snackBar.open('Cliente creado exitosamente', 'Cerrar', { duration: 3000 });
          resolve(cliente);
        },
        error: (error: any) => {
          console.error('Error creando cliente:', error);
          this.snackBar.open('Error creando cliente', 'Cerrar', { duration: 3000 });
          reject(error);
        }
      });
    });
  }

  // Método auxiliar para crear paciente de forma asíncrona - ELIMINADO
  // Los pacientes nuevos deben crearse desde el módulo de Pacientes

  // ===========================================
  // MÉTODOS DE UI Y UX
  // ===========================================

  toggleSeccionCliente(): void {
    this.seccionClienteExpandida.set(!this.seccionClienteExpandida());
  }

  toggleSeccionProductos(): void {
    this.seccionProductosExpandida.set(!this.seccionProductosExpandida());
  }

  // Método para manejar errores de red y reconexión
  private handleNetworkError(error: any, operation: string): void {
    console.error(`Error en ${operation}:`, error);

    let mensaje = 'Error de conexión. ';

    if (error.status === 0) {
      mensaje += 'Verifique su conexión a internet.';
    } else if (error.status === 500) {
      mensaje += 'Error interno del servidor. Intente nuevamente.';
    } else if (error.status === 404) {
      mensaje += 'Recurso no encontrado.';
    } else {
      mensaje += 'Intente nuevamente en unos momentos.';
    }

    this.snackBar.open(mensaje, 'Reintentar', {
      duration: 5000
    }).onAction().subscribe(() => {
      // Reintentar la operación
      this.retryLastOperation();
    });
  }

  private retryLastOperation(): void {
    // Lógica para reintentar la última operación fallida
    this.snackBar.open('Reintentando operación...', 'Cerrar', { duration: 2000 });
    // Aquí iría la lógica específica de reintento
  }

  // Método para validar conectividad antes de operaciones críticas
  private async checkConnectivity(): Promise<boolean> {
    try {
      // Verificar conectividad con un endpoint ligero
      await this.facturacionService.getCajas().toPromise();
      return true;
    } catch (error) {
      this.handleNetworkError(error, 'verificación de conectividad');
      return false;
    }
  }
}
