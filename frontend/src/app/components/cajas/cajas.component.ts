import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';

import {
  CajasService,
  Caja,
  MovimientoCaja,
  TransferenciaCaja,
  ResumenCaja
} from './cajas.service';

@Component({
  selector: 'app-cajas',
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatDialogModule,
    MatTabsModule,
    MatCheckboxModule
  ],
  templateUrl: './cajas.component.html',
  styleUrl: './cajas.component.css'
})
export class CajasComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals para estado reactivo
  loading = signal(false);
  loadingMovimientos = signal(false);
  loadingTransferencias = signal(false);
  cajas = signal<Caja[]>([]);
  movimientos = signal<MovimientoCaja[]>([]);
  transferencias = signal<TransferenciaCaja[]>([]);
  resumenCajaActiva = signal<ResumenCaja | null>(null);
  selectedTab = signal(0);

  // Propiedades para el diálogo de caja
  mostrarDialogoCaja = signal(false);
  cajaEditando = signal<Caja | null>(null);
  guardandoCaja = signal(false);
  cajaForm!: FormGroup;

  // Configuración de tablas
  displayedColumnsMovimientos = ['fecha', 'tipo', 'concepto', 'monto', 'metodo_pago', 'referencia'];
  displayedColumnsTransferencias = ['codigo', 'fecha', 'origen', 'destino', 'monto', 'estado'];

  constructor(
    private cajasService: CajasService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadCajas();
    this.loadResumenCajaActiva();
  }

  private initializeForm(): void {
    this.cajaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tipo: ['Caja Menor', Validators.required],
      descripcion: [''],
      saldo_inicial: [0, [Validators.required, Validators.min(0)]],
      activa: [true]
    });
  }

  private loadCajas(): void {
    this.loading.set(true);
    this.cajasService.getCajas().subscribe({
      next: (cajas) => {
        this.cajas.set(cajas);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando cajas:', error);
        this.cajas.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando cajas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadResumenCajaActiva(): void {
    this.cajasService.getResumenCajaActiva().subscribe({
      next: (resumen) => {
        this.resumenCajaActiva.set(resumen);
      },
      error: (error) => {
        console.error('Error cargando resumen de caja activa:', error);
        this.resumenCajaActiva.set(null);
      }
    });
  }

  changeTab(index: number): void {
    this.selectedTab.set(index);

    if (index === 1 && this.movimientos().length === 0) {
      this.loadMovimientos();
    } else if (index === 2 && this.transferencias().length === 0) {
      this.loadTransferencias();
    }
  }

  private loadMovimientos(): void {
    this.loadingMovimientos.set(true);
    // Cargar movimientos de la caja activa
    const cajaActiva = this.cajas().find(c => c.activa);
    if (cajaActiva) {
      this.cajasService.getMovimientosCaja(cajaActiva.id_caja).subscribe({
        next: (response) => {
          this.movimientos.set(response.movimientos);
          this.loadingMovimientos.set(false);
        },
        error: (error) => {
          console.error('Error cargando movimientos:', error);
          this.movimientos.set([]);
          this.loadingMovimientos.set(false);
          this.snackBar.open('Error cargando movimientos', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      this.loadingMovimientos.set(false);
    }
  }

  private loadTransferencias(): void {
    this.loadingTransferencias.set(true);
    this.cajasService.getTransferencias().subscribe({
      next: (response) => {
        this.transferencias.set(response.transferencias);
        this.loadingTransferencias.set(false);
      },
      error: (error) => {
        console.error('Error cargando transferencias:', error);
        this.transferencias.set([]);
        this.loadingTransferencias.set(false);
        this.snackBar.open('Error cargando transferencias', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Acciones de cajas
  abrirDialogoCaja(caja?: Caja): void {
    if (caja) {
      // Modo edición
      this.cajaEditando.set(caja);
      this.cajaForm.patchValue({
        nombre: caja.nombre,
        tipo: caja.tipo,
        descripcion: caja.descripcion || '',
        saldo_inicial: caja.saldo_inicial,
        activa: caja.activa
      });
    } else {
      // Modo creación
      this.cajaEditando.set(null);
      this.cajaForm.reset({
        nombre: '',
        tipo: 'Caja Menor',
        descripcion: '',
        saldo_inicial: 0,
        activa: true
      });
    }
    this.mostrarDialogoCaja.set(true);
  }

  cerrarDialogoCaja(): void {
    this.mostrarDialogoCaja.set(false);
    this.cajaEditando.set(null);
    this.cajaForm.reset();
  }

  guardarCaja(): void {
    if (this.cajaForm.invalid) {
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.guardandoCaja.set(true);
    const formData = this.cajaForm.value;

    const cajaData = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      descripcion: formData.descripcion,
      saldo_inicial: formData.saldo_inicial,
      activa: formData.activa
    };

    const operacion = this.cajaEditando()
      ? this.cajasService.updateCaja(this.cajaEditando()!.id_caja, cajaData)
      : this.cajasService.createCaja(cajaData);

    operacion.subscribe({
      next: (response) => {
        this.guardandoCaja.set(false);
        this.cerrarDialogoCaja();
        this.loadCajas();
        this.loadResumenCajaActiva();
        const mensaje = this.cajaEditando() ? 'Caja actualizada exitosamente' : 'Caja creada exitosamente';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        this.guardandoCaja.set(false);
        console.error('Error guardando caja:', error);
        this.snackBar.open('Error guardando caja', 'Cerrar', { duration: 3000 });
      }
    });
  }

  nuevaCaja(): void {
    this.abrirDialogoCaja();
  }

  editarCaja(caja: Caja): void {
    this.abrirDialogoCaja(caja);
  }

  cerrarCaja(caja: Caja): void {
    if (confirm(`¿Estás seguro de cerrar la caja "${caja.nombre}"?`)) {
      this.cajasService.cerrarCaja(caja.id_caja).subscribe({
        next: () => {
          this.snackBar.open('Caja cerrada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadCajas();
          this.loadResumenCajaActiva();
        },
        error: (error) => {
          console.error('Error cerrando caja:', error);
          this.snackBar.open('Error cerrando caja', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  verMovimientos(caja: Caja): void {
    this.selectedTab.set(1);
    this.loadMovimientos();
  }

  nuevaTransferencia(): void {
    // TODO: Implementar modal/formulario para nueva transferencia
    this.snackBar.open('Funcionalidad en desarrollo', 'Cerrar', { duration: 3000 });
  }

  // Utilidades
  formatearMoneda(valor: number): string {
    return this.cajasService.formatearMoneda(valor);
  }

  formatearFecha(fecha: string): string {
    return this.cajasService.formatearFecha(fecha);
  }

  getTipoCajaIcon(tipo: string): string {
    return this.cajasService.getTipoCajaIcon(tipo);
  }

  getTipoCajaColor(tipo: string): string {
    return this.cajasService.getTipoCajaColor(tipo);
  }

  getMontoAbsoluto(monto: number): number {
    return Math.abs(monto);
  }
}
