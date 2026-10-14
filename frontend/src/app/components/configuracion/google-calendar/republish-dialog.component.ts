import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface RepublishRange {
  fecha_inicio: string;
  fecha_fin: string;
}

const toYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

@Component({
  selector: 'app-republish-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit_calendar</mat-icon>
      Reescribir eventos en Google Calendar
    </h2>
    <mat-dialog-content>
      <p class="hint">
        Actualiza en Google los eventos de las citas del rango elegido según lo que hay en Ramelo:
        título (nombre de la mascota), hora y color. Puede incluir fechas pasadas y futuras.
        Las citas canceladas no se incluyen y no se envían correos a los invitados.
      </p>
      <div class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Desde</mat-label>
          <input matInput type="date" [(ngModel)]="desde" required>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hasta</mat-label>
          <input matInput type="date" [(ngModel)]="hasta" required>
        </mat-form-field>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">Reescribir</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; }
    .hint { margin: 0 0 16px; color: #607d8b; font-size: 13px; }
    .fields { display: flex; gap: 12px; }
    .fields mat-form-field { flex: 1; }
    .error { color: #d32f2f; font-size: 13px; margin: 0; }
  `]
})
export class RepublishDialogComponent {
  dialogRef = inject(MatDialogRef<RepublishDialogComponent>);

  desde = toYmd(new Date());
  hasta = toYmd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  error = signal('');

  confirmar(): void {
    if (!this.desde || !this.hasta) {
      this.error.set('Elige las dos fechas.');
      return;
    }
    if (this.desde > this.hasta) {
      this.error.set('La fecha de inicio no puede ser posterior a la de fin.');
      return;
    }
    const dias = (new Date(this.hasta).getTime() - new Date(this.desde).getTime()) / 86400000;
    if (dias > 400) {
      this.error.set('El rango máximo es de 400 días.');
      return;
    }
    this.dialogRef.close({ fecha_inicio: this.desde, fecha_fin: this.hasta } as RepublishRange);
  }
}
