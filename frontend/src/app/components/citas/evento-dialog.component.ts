import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CitasService } from '../../services/citas.service';
import { EventoCalendario, UsuarioCompartible } from '../../models/evento-calendario.interface';

export interface EventoDialogData {
  evento?: EventoCalendario;
  inicio?: Date;
  fin?: Date;
}

/** 'saved' | 'deleted' cuando hubo cambios; null si se cerró sin cambios. */
export type EventoDialogResult = 'saved' | 'deleted' | null;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DDTHH:mm' (hora local) para <input type="datetime-local">. */
const toLocalInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

@Component({
  selector: 'app-evento-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>push_pin</mat-icon>
      {{ soloLectura ? 'Evento compartido' : (data.evento ? 'Editar evento' : 'Nuevo evento') }}
    </h2>
    <mat-dialog-content>
      <p class="hint">
        @if (soloLectura) {
          Creado por {{ data.evento?.creador_nombre }}. Solo quien lo creó puede modificarlo.
        } @else {
          Recordatorio propio: no es una cita. Se muestra en el calendario y se publica en Google Calendar.
        }
      </p>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Título</mat-label>
        <input matInput [(ngModel)]="titulo" maxlength="200" [disabled]="soloLectura" required>
      </mat-form-field>

      <div class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Inicio</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="inicio" [disabled]="soloLectura" required>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fin</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="fin" [disabled]="soloLectura" required>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Descripción (opcional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="descripcion" maxlength="2000" [disabled]="soloLectura"></textarea>
      </mat-form-field>

      @if (!soloLectura) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Compartir con</mat-label>
          <mat-select multiple [(ngModel)]="compartidoCon">
            @for (u of usuarios(); track u.id_usuario) {
              <mat-option [value]="u.id_usuario">{{ u.nombre }}</mat-option>
            }
          </mat-select>
          <mat-hint>Podrán verlo en su calendario, pero no modificarlo</mat-hint>
        </mat-form-field>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.evento && !soloLectura) {
        <button mat-button color="warn" class="delete" (click)="eliminar()" [disabled]="guardando()">Eliminar</button>
      }
      <button mat-button (click)="dialogRef.close(null)">{{ soloLectura ? 'Cerrar' : 'Cancelar' }}</button>
      @if (!soloLectura) {
        <button mat-raised-button color="primary" (click)="guardar()" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Guardar' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; }
    .hint { margin: 0 0 16px; color: #607d8b; font-size: 13px; }
    .full { width: 100%; }
    .fields { display: flex; gap: 12px; }
    .fields mat-form-field { flex: 1; }
    .error { color: #d32f2f; font-size: 13px; margin: 0; }
    .delete { margin-right: auto; }
    mat-dialog-content { min-width: min(480px, 80vw); }
  `]
})
export class EventoDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<EventoDialogComponent, EventoDialogResult>);
  private citasService = inject(CitasService);
  private snackBar = inject(MatSnackBar);

  titulo = '';
  descripcion = '';
  inicio = '';
  fin = '';
  compartidoCon: string[] = [];

  usuarios = signal<UsuarioCompartible[]>([]);
  error = signal('');
  guardando = signal(false);
  soloLectura = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EventoDialogData) {}

  ngOnInit(): void {
    const ev = this.data.evento;
    if (ev) {
      this.titulo = ev.titulo;
      this.descripcion = ev.descripcion || '';
      this.inicio = ev.fecha_inicio.slice(0, 16);
      this.fin = ev.fecha_fin.slice(0, 16);
      this.compartidoCon = [...(ev.compartido_con || [])];
      this.soloLectura = !ev.es_propio;
    } else {
      const inicio = this.data.inicio ?? new Date();
      const fin = this.data.fin ?? new Date(inicio.getTime() + 60 * 60 * 1000);
      this.inicio = toLocalInput(inicio);
      this.fin = toLocalInput(fin);
    }

    if (!this.soloLectura) {
      this.citasService.getUsuariosParaCompartir().subscribe(list => this.usuarios.set(list));
    }
  }

  guardar(): void {
    this.error.set('');
    if (!this.titulo.trim()) {
      this.error.set('El título es obligatorio.');
      return;
    }
    if (!this.inicio || !this.fin) {
      this.error.set('Elige fecha y hora de inicio y de fin.');
      return;
    }
    if (this.fin <= this.inicio) {
      this.error.set('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    const payload = {
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim() || undefined,
      fecha_inicio: this.inicio,
      fecha_fin: this.fin,
      compartido_con: this.compartidoCon
    };

    this.guardando.set(true);
    const request$ = this.data.evento
      ? this.citasService.updateEventoCalendario(this.data.evento.id_evento, payload)
      : this.citasService.createEventoCalendario(payload);

    request$.subscribe({
      next: (response) => {
        this.guardando.set(false);
        const sync = response?.google_sync;
        if (sync?.status === 'failed') {
          this.snackBar.open('Evento guardado, pero no se pudo publicar en Google Calendar.', 'Cerrar', { duration: 6000 });
        } else {
          this.snackBar.open('Evento guardado', 'Cerrar', { duration: 3000 });
        }
        this.dialogRef.close('saved');
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudo guardar el evento.');
      }
    });
  }

  eliminar(): void {
    if (!this.data.evento) return;
    if (!confirm('¿Eliminar este evento? También se quitará de Google Calendar.')) return;

    this.guardando.set(true);
    this.citasService.deleteEventoCalendario(this.data.evento.id_evento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Evento eliminado', 'Cerrar', { duration: 3000 });
        this.dialogRef.close('deleted');
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message || 'No se pudo eliminar el evento.');
      }
    });
  }
}
