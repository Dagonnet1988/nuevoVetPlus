import { Component, Inject, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService, BulkCancelPreviewCita, BulkCancelPreview } from '../../services/citas.service';
import { PacientesService } from '../../services/pacientes.service';
import { TIPOS_CITA } from '../../models/cita.interface';

export interface CancelacionMasivaData {
  /** Modo paciente precargado (desde el detalle de una cita). */
  id_mascota?: string;
  mascota_nombre?: string;
  /** Modo serie: cancela esta serie desde la fecha indicada. */
  id_serie?: string;
  desde?: string; // YYYY-MM-DD
}

interface PacienteOpcion { id: string; nombre: string; propietario: string; especie: string; }

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

@Component({
  selector: 'app-cancelacion-masiva-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatCheckboxModule, MatAutocompleteModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>event_busy</mat-icon>
      Cancelar citas en lote
    </h2>

    <mat-dialog-content>
      @if (resultado()) {
        <div class="resultado">
          <p><strong>{{ resultado()!.canceladas }}</strong> cita(s) cancelada(s) — lote {{ resultado()!.lote }}.</p>
          @if (resultado()!.google_en_proceso > 0) {
            <p class="muted">Se están quitando {{ resultado()!.google_en_proceso }} evento(s) de Google Calendar en segundo plano.
              El detalle queda en Auditoría → Sincronización.</p>
          }
          @if (resultado()!.omitidas.length > 0) {
            <p>{{ resultado()!.omitidas.length }} omitida(s) porque cambiaron mientras tanto:</p>
            <ul>
              @for (o of resultado()!.omitidas; track o.id_cita) {
                <li>{{ o.codigo_cita || o.id_cita }}: {{ o.motivo }}</li>
              }
            </ul>
          }
        </div>
      } @else {
        @if (data.id_serie) {
          <p class="hint">Se buscarán las citas de esta <strong>serie</strong> desde {{ desde }}.</p>
        } @else {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Paciente</mat-label>
            <input matInput [(ngModel)]="busqueda" (ngModelChange)="onBuscar($event)"
                   [matAutocomplete]="auto" placeholder="Escribe el nombre del paciente">
            <mat-autocomplete #auto="matAutocomplete" [displayWith]="mostrarPaciente" (optionSelected)="elegirPaciente($event.option.value)">
              @for (p of opciones(); track p.id) {
                <mat-option [value]="p">
                  {{ p.nombre }} <span class="muted">· {{ p.especie }} · {{ p.propietario }}</span>
                </mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>
        }

        <div class="fields">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput type="date" [(ngModel)]="desde" (ngModelChange)="invalidarVista()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" [(ngModel)]="hasta" (ngModelChange)="invalidarVista()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tipo (opcional)</mat-label>
            <mat-select [(ngModel)]="tipo" (ngModelChange)="invalidarVista()">
              <mat-option [value]="''">Todos</mat-option>
              @for (t of tiposCita; track t.value) {
                <mat-option [value]="t.value">{{ t.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <button mat-stroked-button color="primary" (click)="buscar()" [disabled]="cargando()">
          <mat-icon>search</mat-icon> Buscar citas
        </button>

        @if (cargando()) {
          <div class="loading"><mat-spinner diameter="28"></mat-spinner></div>
        }

        @if (vista(); as v) {
          <div class="resumen">
            {{ v.resumen.encontradas }} encontradas · {{ v.resumen.cancelables }} se pueden cancelar
            @if (v.resumen.excluidas) { · {{ v.resumen.excluidas }} no se pueden }
            @if (v.resumen.ya_canceladas) { · {{ v.resumen.ya_canceladas }} ya estaban canceladas }
            @if (v.resumen.truncado) { <br><span class="warn">Se muestran solo las primeras 500: acota el rango.</span> }
          </div>

          @if (v.citas.length > 0) {
            <div class="seleccion-acciones">
              <button mat-button (click)="seleccionarTodas(true)">Seleccionar todas</button>
              <button mat-button (click)="seleccionarTodas(false)">Ninguna</button>
              <span class="muted">{{ seleccionadas().size }} seleccionada(s)</span>
            </div>

            <div class="lista">
              @for (c of v.citas; track c.id_cita) {
                <div class="fila" [class.excluida]="!c.cancelable">
                  <mat-checkbox [checked]="seleccionadas().has(c.id_cita)" [disabled]="!c.cancelable"
                                (change)="toggle(c.id_cita, $event.checked)"></mat-checkbox>
                  <div class="fila-info">
                    <div><strong>{{ formatFecha(c.fecha_inicio) }}</strong> · {{ c.mascota_nombre }} · {{ etiquetaTipo(c.tipo) }}</div>
                    <div class="muted">{{ c.codigo_cita }} · {{ c.veterinario_nombre || 'Sin veterinario' }}
                      @if (c.en_google) { · en Google }
                    </div>
                    @if (!c.cancelable) {
                      <div class="warn">No se cancela: {{ c.motivo_exclusion }}</div>
                    }
                  </div>
                </div>
              }
            </div>

            <mat-form-field appearance="outline" class="full motivo">
              <mat-label>Motivo de la cancelación</mat-label>
              <textarea matInput rows="2" [(ngModel)]="motivo" maxlength="500" required></textarea>
              <mat-hint>Queda registrado en cada cita y en Auditoría</mat-hint>
            </mat-form-field>
          }
        }

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (resultado()) {
        <button mat-raised-button color="primary" (click)="dialogRef.close(true)">Listo</button>
      } @else {
        <button mat-button (click)="dialogRef.close(false)" [disabled]="cancelando()">Cerrar</button>
        <button mat-raised-button color="warn" (click)="confirmar()"
                [disabled]="cancelando() || seleccionadas().size === 0 || motivo.trim().length < 5">
          {{ cancelando() ? 'Cancelando...' : 'Cancelar ' + seleccionadas().size + ' cita(s)' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; }
    mat-dialog-content { min-width: min(640px, 86vw); }
    .full { width: 100%; }
    .fields { display: flex; gap: 12px; flex-wrap: wrap; }
    .fields mat-form-field { flex: 1 1 160px; }
    .hint { margin: 0 0 12px; color: #455a64; }
    .muted { color: #78909c; font-size: 12px; }
    .warn { color: #e65100; font-size: 12px; }
    .error { color: #d32f2f; font-size: 13px; }
    .loading { display: flex; justify-content: center; padding: 16px; }
    .resumen { margin: 16px 0 8px; font-size: 14px; }
    .seleccion-acciones { display: flex; align-items: center; gap: 8px; }
    .lista { max-height: 320px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; margin: 8px 0 16px; }
    .fila { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .fila:last-child { border-bottom: none; }
    .fila.excluida { opacity: 0.6; }
    .fila-info { flex: 1; font-size: 13px; line-height: 1.4; }
    .resultado ul { margin: 4px 0 0; padding-left: 20px; font-size: 13px; }
    @media (max-width: 640px) { .fields mat-form-field { flex: 1 1 100%; } }
  `]
})
export class CancelacionMasivaDialogComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<CancelacionMasivaDialogComponent, boolean>);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);
  private snackBar = inject(MatSnackBar);

  tiposCita = TIPOS_CITA;

  busqueda = '';
  idMascota: string | null = null;
  desde = toYmd(new Date());
  hasta = toYmd(new Date(Date.now() + 60 * 86400000));
  tipo = '';
  motivo = '';

  opciones = signal<PacienteOpcion[]>([]);
  vista = signal<BulkCancelPreview | null>(null);
  seleccionadas = signal<Set<string>>(new Set());
  cargando = signal(false);
  cancelando = signal(false);
  error = signal('');
  resultado = signal<{ lote: string; canceladas: number; omitidas: any[]; google_en_proceso: number } | null>(null);

  private busqueda$ = new Subject<string>();
  private sub?: Subscription;

  constructor(@Inject(MAT_DIALOG_DATA) public data: CancelacionMasivaData) {}

  ngOnInit(): void {
    if (this.data.id_mascota) {
      this.idMascota = this.data.id_mascota;
      this.busqueda = this.data.mascota_nombre || '';
    }
    if (this.data.id_serie) {
      this.desde = this.data.desde || this.desde;
      this.hasta = toYmd(new Date(new Date(`${this.desde}T00:00:00`).getTime() + 365 * 86400000));
    }

    this.sub = this.busqueda$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => texto.trim().length < 2
        ? of([])
        : this.pacientesService.getMascotas(1, 15, { search: texto.trim() }).pipe(catchError(() => of(null))))
    ).subscribe((res: any) => {
      const lista = res?.data?.pacientes ?? res?.pacientes ?? (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      this.opciones.set(lista.map((p: any) => ({
        id: p.id_mascota || p.id,
        nombre: p.nombre || 'Sin nombre',
        especie: p.especie || '',
        propietario: p.cliente?.nombre || p.cliente_nombre || p.nombre_cliente || p.propietario || ''
      })).filter((p: PacienteOpcion) => Boolean(p.id)));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onBuscar(texto: string | PacienteOpcion): void {
    if (typeof texto !== 'string') return;
    // Escribir de nuevo invalida el paciente elegido.
    this.idMascota = null;
    this.invalidarVista();
    this.busqueda$.next(texto);
  }

  mostrarPaciente = (p: PacienteOpcion | string | null): string =>
    typeof p === 'string' ? p : (p?.nombre ?? '');

  elegirPaciente(p: PacienteOpcion): void {
    this.idMascota = p.id;
    this.busqueda = p.nombre;
    this.invalidarVista();
  }

  invalidarVista(): void {
    this.vista.set(null);
    this.seleccionadas.set(new Set());
    this.error.set('');
  }

  buscar(): void {
    this.error.set('');
    if (!this.data.id_serie && !this.idMascota) {
      this.error.set('Elige un paciente de la lista.');
      return;
    }
    if (!this.desde || !this.hasta || this.hasta < this.desde) {
      this.error.set('Revisa el rango de fechas.');
      return;
    }

    this.cargando.set(true);
    this.citasService.previewBulkCancel({
      id_mascota: this.data.id_serie ? undefined : this.idMascota!,
      id_serie: this.data.id_serie,
      fecha_inicio: this.desde,
      fecha_fin: this.hasta,
      tipo: this.tipo || undefined
    }).subscribe({
      next: (v) => {
        this.cargando.set(false);
        this.vista.set(v);
        this.seleccionadas.set(new Set(v.citas.filter(c => c.cancelable).map(c => c.id_cita)));
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar la vista previa.');
      }
    });
  }

  toggle(id: string, checked: boolean): void {
    const next = new Set(this.seleccionadas());
    if (checked) next.add(id); else next.delete(id);
    this.seleccionadas.set(next);
  }

  seleccionarTodas(todas: boolean): void {
    const v = this.vista();
    this.seleccionadas.set(new Set(todas && v ? v.citas.filter(c => c.cancelable).map(c => c.id_cita) : []));
  }

  confirmar(): void {
    const ids = [...this.seleccionadas()];
    if (ids.length === 0 || this.motivo.trim().length < 5) return;
    if (!confirm(`¿Cancelar ${ids.length} cita(s)? Se quitarán también de Google Calendar.`)) return;

    this.cancelando.set(true);
    this.error.set('');
    this.citasService.bulkCancel(ids, this.motivo.trim()).subscribe({
      next: (res) => {
        this.cancelando.set(false);
        this.resultado.set(res?.data);
        this.snackBar.open(res?.message || 'Citas canceladas', 'Cerrar', { duration: 4000 });
      },
      error: (err) => {
        this.cancelando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cancelar las citas.');
      }
    });
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  etiquetaTipo(tipo: string): string {
    return this.tiposCita.find(t => t.value === String(tipo || '').toLowerCase())?.label || tipo;
  }
}
