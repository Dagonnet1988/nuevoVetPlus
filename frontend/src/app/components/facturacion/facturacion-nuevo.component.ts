import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Observable, map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { FacturacionService, Factura, FacturaFilter } from '../../services/facturacion.service';
import { ClientesService } from '../../services/clientes.service';
import { ProductosService } from '../../services/productos.service';

interface Cliente {
  id_cliente: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface Producto {
  id_producto: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  inventariable: boolean;
  codigo?: string;
}

interface LineaFactura {
  id?: string;
  producto?: Producto;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

@Component({
  selector: 'app-facturacion-nuevo',
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
    MatDividerModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule
  ],
  templateUrl: './facturacion-nuevo.component.html',
  styleUrl: './facturacion-nuevo.component.css'
})
export class FacturacionNuevoComponent implements OnInit {
  // Inyección de dependencias
  private fb = inject(FormBuilder);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Estado reactivo
  loading = signal(false);
  facturas = signal<Factura[]>([]);

  // Formularios
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = ['codigo', 'fecha', 'cliente', 'total', 'estado', 'acciones'];

  constructor() {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    this.loadFacturas();
  }

  private createFilterForm(): FormGroup {
    return this.fb.group({
      search: [''],
      estado: [''],
      metodo_pago: ['']
    });
  }

  loadFacturas(): void {
    this.loading.set(true);

    const filters: FacturaFilter = {};
    if (this.filterForm.value.search) filters.search = this.filterForm.value.search;
    if (this.filterForm.value.estado) filters.estado = this.filterForm.value.estado;
    if (this.filterForm.value.metodo_pago) filters.metodo_pago = this.filterForm.value.metodo_pago;

    this.facturacionService.getFacturas(1, 50, filters).subscribe({
      next: (response) => {
        this.facturas.set(Array.isArray(response) ? response : []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando facturas:', error);
        this.facturas.set([]);
        this.loading.set(false);
        this.showSnackbar('Error cargando facturas');
      }
    });
  }

  aplicarFiltros(): void {
    this.loadFacturas();
  }

  nuevaFactura(): void {
    // Cambiar al tab de nueva factura
    // Esto se puede hacer con ViewChild o cambiando el estado
  }

  verFactura(factura: Factura): void {
    this.router.navigate(['/facturacion', factura.id_factura]);
  }

  editarFactura(factura: Factura): void {
    this.router.navigate(['/facturacion', factura.id_factura, 'editar']);
  }

  exportarPDF(factura: Factura): void {
    this.facturacionService.exportarFactura(factura.id_factura, 'pdf').subscribe({
      next: (blob) => this.downloadBlob(blob, `factura-${factura.codigo_factura}.pdf`),
      error: (error) => {
        console.error('Error exportando PDF:', error);
        this.showSnackbar('Error exportando PDF');
      }
    });
  }

  enviarWhatsApp(factura: Factura): void {
    const telefono = factura.cliente?.telefono;
    if (!telefono) {
      this.showSnackbar('El cliente no tiene teléfono registrado');
      return;
    }

    this.facturacionService.enviarFacturaPorWhatsApp(factura.id_factura, telefono).subscribe({
      next: () => this.showSnackbar('Factura enviada por WhatsApp'),
      error: (error) => {
        console.error('Error enviando WhatsApp:', error);
        this.showSnackbar('Error enviando WhatsApp');
      }
    });
  }

  cancelarFactura(factura: Factura): void {
    const confirmed = confirm(`¿Estás seguro de cancelar la factura ${factura.codigo_factura}?`);
    if (!confirmed) return;

    this.facturacionService.cancelarFactura(factura.id_factura).subscribe({
      next: () => {
        this.showSnackbar('Factura cancelada exitosamente');
        this.loadFacturas();
      },
      error: (error) => {
        console.error('Error cancelando factura:', error);
        this.showSnackbar('Error cancelando factura');
      }
    });
  }


  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private showSnackbar(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }
}
