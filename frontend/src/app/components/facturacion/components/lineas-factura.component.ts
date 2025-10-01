import { Component, EventEmitter, Output, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, map, startWith, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { FacturacionService } from '../../../services/facturacion.service';

interface Producto {
  id_producto: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  inventariable: boolean;
}

@Component({
  selector: 'app-lineas-factura',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './lineas-factura.component.html',
  styleUrl: './lineas-factura.component.css'
})
export class LineasFacturaComponent {
  @Input() lineasArray!: FormArray;
  @Output() totalChanged = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);

  productosFiltrados$!: Observable<Producto[]>;
  searchTerms = signal<string[]>([]);

  constructor() {
    // Setup will be done in ngOnInit
  }

  ngOnInit() {
    this.setupProductoAutocomplete();
  }

  agregarLinea(): void {
    const lineaForm = this.fb.group({
      id_producto: ['', Validators.required],
      descripcion: [''],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      producto: [null]
    });

    this.lineasArray.push(lineaForm);
    this.calcularTotalGeneral();
  }

  removerLinea(index: number): void {
    if (this.lineasArray.length > 1) {
      this.lineasArray.removeAt(index);
      this.calcularTotalGeneral();
    } else {
      this.snackBar.open('Debe mantener al menos una línea en la factura', 'Cerrar', { duration: 3000 });
    }
  }

  onProductoSeleccionado(event: any, index: number): void {
    const producto = event.option.value;
    const linea = this.lineasArray.at(index);

    linea.patchValue({
      id_producto: producto.codigo,
      descripcion: producto.nombre,
      precio_unitario: producto.precio_venta,
      producto: producto
    });

    this.calcularSubtotal(index);
  }

  onProductoBlur(index: number): void {
    const linea = this.lineasArray.at(index);
    const productoId = linea.get('id_producto')?.value;

    if (productoId && !linea.get('producto')?.value) {
      this.updateSearchTerm(index, productoId);
    }
  }

  private updateSearchTerm(index: number, term: string): void {
    const currentTerms = this.searchTerms();
    currentTerms[index] = term;
    this.searchTerms.set([...currentTerms]);
  }

  searchTerm(index: number): string {
    return this.searchTerms()[index] || '';
  }

  calcularSubtotal(index: number): void {
    const linea = this.lineasArray.at(index);
    const cantidad = linea.get('cantidad')?.value || 0;
    const precioUnitario = linea.get('precio_unitario')?.value || 0;
    const descuento = linea.get('descuento')?.value || 0;

    const subtotal = cantidad * precioUnitario;
    const montoDescuento = (subtotal * descuento) / 100;
    const totalLinea = subtotal - montoDescuento;

    linea.patchValue({ subtotal: totalLinea }, { emitEvent: false });
    this.calcularTotalGeneral();
  }

  calcularSubtotalLinea(index: number): number {
    const linea = this.lineasArray.at(index);
    const cantidad = linea.get('cantidad')?.value || 0;
    const precioUnitario = linea.get('precio_unitario')?.value || 0;
    const descuento = linea.get('descuento')?.value || 0;

    const subtotal = cantidad * precioUnitario;
    const montoDescuento = (subtotal * descuento) / 100;

    return subtotal - montoDescuento;
  }

  calcularTotalGeneral(): number {
    let total = 0;
    for (let i = 0; i < this.lineasArray.length; i++) {
      total += this.calcularSubtotalLinea(i);
    }

    this.totalChanged.emit(total);
    return total;
  }

  displayProducto(producto: Producto): string {
    return producto ? `${producto.nombre} (${producto.codigo})` : '';
  }

  private setupProductoAutocomplete(): void {
    // Configurar autocomplete para cada línea
    // Esto se maneja individualmente en cada línea del template
  }

  // Método para obtener productos filtrados (simulado)
  getProductosFiltrados(term: string): Observable<Producto[]> {
    // Aquí iría la lógica real para buscar productos
    return of([
      {
        id_producto: '1',
        codigo: 'MED001',
        nombre: 'Vacuna Rabia',
        precio_venta: 50000,
        stock_actual: 10,
        inventariable: true
      },
      {
        id_producto: '2',
        codigo: 'MED002',
        nombre: 'Desparasitante',
        precio_venta: 30000,
        stock_actual: 5,
        inventariable: true
      }
    ].filter(producto =>
      producto.nombre.toLowerCase().includes(term.toLowerCase()) ||
      producto.codigo.toLowerCase().includes(term.toLowerCase())
    ));
  }
}
