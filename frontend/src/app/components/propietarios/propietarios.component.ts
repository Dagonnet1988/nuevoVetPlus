import { Component, OnInit, signal } from '@angular/core';
import { extractError } from '../../utils/error.utils';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { inject } from '@angular/core';

import { ClientesService, Cliente } from '../../services/clientes.service';
import { PacientesService } from '../../services/pacientes.service';
import { Mascota } from '../../models/paciente.interface';
import { ConsentimientoStatusComponent } from '../consentimiento-status/consentimiento-status.component';
import { environment } from '../../../environments/environment';

// ── Dialog de edición ──────────────────────────────────────────────────────
@Component({
  selector: 'app-editar-propietario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">person_edit</mat-icon>
      Editar Propietario
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre completo *</mat-label>
          <input matInput formControlName="nombre" />
          @if (form.get('nombre')?.hasError('required') && form.get('nombre')?.touched) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cédula / Documento</mat-label>
          <input matInput formControlName="cedula" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" type="tel" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo electrónico</mat-label>
          <input matInput formControlName="email" type="email" />
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Ingrese un correo válido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="direccion" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="guardar()">
        @if (saving()) {
          <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;margin-right:6px"></mat-spinner>
        }
        @if (!saving()) {
          <mat-icon>save</mat-icon>
        }
        Guardar
      </button>
    </mat-dialog-actions>

    <style>
      .edit-form { display:flex; flex-direction:column; gap:4px; padding:8px 0; min-width:340px; }
      .full-width { width:100%; }
    </style>
  `
})
export class EditarPropietarioDialogComponent {
  private clientesService = inject(ClientesService);
  private dialogRef = inject(MatDialogRef<EditarPropietarioDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data: Cliente = inject(MAT_DIALOG_DATA);

  saving = signal(false);

  form: FormGroup = inject(FormBuilder).group({
    nombre:   [this.data.nombre,    Validators.required],
    cedula:   [this.data.cedula ?? this.data.documento ?? ''],
    telefono: [this.data.telefono  ?? ''],
    email:    [this.data.email     ?? '', Validators.email],
    direccion:[this.data.direccion ?? '']
  });

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    const raw = this.form.value;
    const normalize = (value: any) => {
      const val = String(value ?? '').trim();
      return val.length ? val : null;
    };

    const payload: any = {
      nombre: String(raw.nombre || '').trim(),
      telefono: normalize(raw.telefono),
      email: normalize(raw.email),
      direccion: normalize(raw.direccion),
      cedula: normalize(raw.cedula)
    };

    this.clientesService.updateCliente(this.data.id_cliente, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.snackBar.open('Propietario actualizado', 'OK', { duration: 3000 });
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al actualizar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }
}

// ── Dialog de mascotas ────────────────────────────────────────────────────
@Component({
  selector: 'app-mascotas-propietario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title style="margin:0">
        <mat-icon style="vertical-align:middle;margin-right:8px">pets</mat-icon>
        Mascotas de {{ data.nombre }}
      </h2>
    </div>

    <mat-dialog-content style="min-width:360px;max-width:520px;padding:16px 24px">
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:32px">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (mascotas().length === 0) {
        <div style="text-align:center;padding:32px;color:#888">
          <mat-icon style="font-size:48px;width:48px;height:48px;color:#ccc">pets</mat-icon>
          <p>Este propietario no tiene mascotas registradas</p>
        </div>
      } @else {
        <div class="mascotas-list">
          @for (m of mascotas(); track m.id_mascota) {
            <div class="mascota-item">
              <div class="mascota-avatar">
                @if (m.foto_url && m.foto_url.trim() !== '') {
                  <img [src]="getImageUrl(m.foto_url)" [alt]="m.nombre" class="mascota-foto" (error)="onImgError($event)" />
                } @else {
                  <mat-icon class="mascota-icon-placeholder">pets</mat-icon>
                }
              </div>
              <div class="mascota-info">
                <div class="mascota-nombre">{{ m.nombre }}</div>
                <div class="mascota-detalle">
                  {{ m.especie }}
                  @if (m.raza) { · {{ m.raza }} }
                  @if (m.sexo) { · {{ m.sexo === 'M' ? 'Macho' : 'Hembra' }} }
                </div>
                @if (m.peso) {
                  <div class="mascota-detalle">{{ m.peso }} kg</div>
                }
              </div>
              <div class="mascota-estado">
                @if (m.activo === false) {
                  <mat-chip style="font-size:11px">Inactivo</mat-chip>
                }
              </div>
            </div>
            <mat-divider></mat-divider>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>

    <style>
      .dialog-header { padding: 16px 24px 0; }
      .mascotas-list { display: flex; flex-direction: column; gap: 0; }
      .mascota-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
      .mascota-avatar { width: 48px; height: 48px; border-radius: 50%; background: #f0f4ff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
      .mascota-foto { width: 100%; height: 100%; object-fit: cover; }
      .mascota-icon-placeholder { color: #3f51b5; font-size: 28px; width: 28px; height: 28px; }
      .mascota-info { flex: 1; }
      .mascota-nombre { font-weight: 600; font-size: 15px; }
      .mascota-detalle { font-size: 12px; color: #666; margin-top: 2px; }
      .mascota-estado { flex-shrink: 0; }
    </style>
  `
})
export class MascotasPropietarioDialogComponent implements OnInit {
  private pacientesService = inject(PacientesService);
  data: Cliente = inject(MAT_DIALOG_DATA);

  loading = signal(true);
  mascotas = signal<Mascota[]>([]);

  ngOnInit(): void {
    this.pacientesService.getMascotasByCliente(this.data.id_cliente).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data ?? []);
        this.mascotas.set(lista);
        this.loading.set(false);
      },
      error: (_err) => {
        this.mascotas.set([]);
        this.loading.set(false);
      }
    });
  }

  getImageUrl(fotoUrl: string): string {
    if (!fotoUrl || fotoUrl.trim() === '') return '';
    if (fotoUrl.startsWith('http')) return fotoUrl;
    return `${environment.backendUrl}${fotoUrl}`;
  }

  onImgError(event: any): void {
    event.target.style.display = 'none';
  }
}

// ── Dialog de consentimiento ──────────────────────────────────────────────
@Component({
  selector: 'app-consentimiento-propietario-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    ConsentimientoStatusComponent
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">assignment</mat-icon>
      Consentimiento — {{ data.nombre }}
    </h2>
    <mat-dialog-content style="min-width:360px;max-width:500px;padding:16px 24px">
      <app-consentimiento-status
        [idCliente]="data.id_cliente"
        [clienteNombre]="data.nombre"
        [clienteTelefono]="data.telefono || null">
      </app-consentimiento-status>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
})
export class ConsentimientoPropietarioDialogComponent {
  data: Cliente = inject(MAT_DIALOG_DATA);
}

// ── Componente principal ───────────────────────────────────────────────────
@Component({
  selector: 'app-propietarios',
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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './propietarios.component.html',
  styleUrl: './propietarios.component.css'
})
export class PropietariosComponent implements OnInit {
  loading = signal(false);
  propietarios = signal<Cliente[]>([]);
  totalPropietarios = signal(0);
  currentPage = signal(1);
  readonly pageSize = 20;

  searchForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private clientesService: ClientesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.searchForm = this.fb.group({
      search: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    const initialSearch = String(this.route.snapshot.queryParamMap.get('search') || '').trim();
    if (initialSearch) {
      this.searchForm.patchValue({ search: initialSearch }, { emitEvent: false });
    }

    this.cargarPropietarios();

    // Búsqueda con debounce manual
    let debounce: any;
    this.searchForm.get('search')!.valueChanges.subscribe(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.currentPage.set(1);
        this.cargarPropietarios();
      }, 350);
    });

    this.searchForm.get('activo')!.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.cargarPropietarios();
    });
  }

  cargarPropietarios(): void {
    this.loading.set(true);
    const search = this.searchForm.get('search')!.value?.trim() || undefined;
    const activo = this.searchForm.get('activo')!.value;

    this.clientesService.getClientes(this.currentPage(), this.pageSize, search, activo).subscribe({
      next: (res) => {
        this.propietarios.set(res.data);
        this.totalPropietarios.set(res.pagination?.total ?? res.data.length);
        this.loading.set(false);
      },
      error: (err) => {
        this.snackBar.open(extractError(err, 'Error cargando propietarios'), 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  abrirEditar(propietario: Cliente): void {
    const ref = this.dialog.open(EditarPropietarioDialogComponent, {
      data: propietario,
      width: '440px'
    });

    ref.afterClosed().subscribe((updated: Cliente | null) => {
      if (updated) {
        this.propietarios.update(list =>
          list.map(p => p.id_cliente === updated.id_cliente ? { ...p, ...updated } : p)
        );
      }
    });
  }

  verPacientes(propietario: Cliente): void {
    this.dialog.open(MascotasPropietarioDialogComponent, {
      data: propietario,
      width: '540px',
      maxHeight: '80vh'
    });
  }

  gestionarConsentimiento(propietario: Cliente): void {
    const ref = this.dialog.open(ConsentimientoPropietarioDialogComponent, {
      data: propietario,
      width: '460px'
    });

    ref.afterClosed().subscribe(() => {
      this.cargarPropietarios();
    });
  }

  pagina(delta: number): void {
    const nueva = this.currentPage() + delta;
    if (nueva < 1) return;
    const totalPages = Math.ceil(this.totalPropietarios() / this.pageSize);
    if (nueva > totalPages) return;
    this.currentPage.set(nueva);
    this.cargarPropietarios();
  }

  totalPages(): number {
    return Math.ceil(this.totalPropietarios() / this.pageSize);
  }

  limpiarBusqueda(): void {
    this.searchForm.get('search')!.setValue('');
  }

  cambiarEstadoPropietario(propietario: Cliente): void {
    if (propietario.activo) {
      const confirmar = window.confirm(
        `¿Deseas desactivar/eliminar a "${propietario.nombre}"?\n\n` +
        'Si tiene mascotas asociadas se desactivará.\n' +
        'Si no tiene mascotas asociadas se eliminará definitivamente.'
      );

      if (!confirmar) return;

      this.clientesService.deleteCliente(propietario.id_cliente).subscribe({
        next: (res) => {
          this.snackBar.open(res?.message || 'Propietario actualizado', 'Cerrar', { duration: 3500 });
          this.cargarPropietarios();
        },
        error: (err) => {
          this.snackBar.open(extractError(err, 'Error desactivando/eliminando propietario'), 'Cerrar', { duration: 4000 });
        }
      });
      return;
    }

    const confirmar = window.confirm(`¿Deseas reactivar a "${propietario.nombre}"?`);
    if (!confirmar) return;

    this.clientesService.restoreCliente(propietario.id_cliente).subscribe({
      next: (res) => {
        this.snackBar.open(res?.message || 'Propietario reactivado', 'Cerrar', { duration: 3000 });
        this.cargarPropietarios();
      },
      error: (err) => {
        this.snackBar.open(extractError(err, 'Error reactivando propietario'), 'Cerrar', { duration: 4000 });
      }
    });
  }

  getMascotaPreviewUrl(fotoUrl?: string): string {
    if (!fotoUrl || fotoUrl.trim() === '') return '';
    if (fotoUrl.startsWith('http')) return fotoUrl;
    return `${environment.backendUrl}${fotoUrl}`;
  }
}
