import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

export interface AnularDialogData {
  codigo: string;
}

export interface AnularDialogResult {
  motivo: string;
  detalle?: string;
}

export const MOTIVOS_ANULACION = [
  'Error de asignación (paciente o propietario incorrecto)',
  'Documento duplicado',
  'Tipo de documento incorrecto',
  'Cita cancelada — consulta no realizada',
  'Datos incorrectos irrecuperables',
  'Solicitud del propietario',
  'Otro',
];

@Component({
  selector: 'app-anular-historia-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule,
  ],
  template: `
    <div class="anular-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="warn-icon">do_not_disturb_on</mat-icon>
        Anular documento
      </h2>

      <mat-dialog-content>
        <p class="codigo-info">
          Documento: <strong>{{ data.codigo }}</strong>
        </p>
        <p class="advertencia">
          El documento quedará anulado. <strong>No se elimina</strong> — permanece en el
          historial por trazabilidad médica, pero ya no aparece en la vista normal.
        </p>

        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motivo de anulación *</mat-label>
            <mat-select formControlName="motivo">
              @for (m of motivos; track m) {
                <mat-option [value]="m">{{ m }}</mat-option>
              }
            </mat-select>
            <mat-error>Selecciona un motivo</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Detalle adicional (opcional)</mat-label>
            <textarea matInput formControlName="detalle" rows="3"
                      placeholder="Describe el motivo con más detalle si lo requiere..."></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-raised-button color="warn"
                [disabled]="form.invalid"
                (click)="confirmar()">
          <mat-icon>do_not_disturb_on</mat-icon>
          Anular documento
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .anular-dialog { min-width: 420px; max-width: 540px; }
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; color: #c62828; }
    .warn-icon { color: #c62828; }
    .codigo-info { margin: 0 0 8px; font-size: 14px; }
    .advertencia {
      background: #fff3e0; border-left: 4px solid #ff9800;
      padding: 10px 14px; border-radius: 4px;
      font-size: 13px; color: #5d4037; margin-bottom: 16px;
    }
    .full-width { width: 100%; }
  `],
})
export class AnularHistoriaDialogComponent {
  form: FormGroup;
  motivos = MOTIVOS_ANULACION;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AnularHistoriaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AnularDialogData,
  ) {
    this.form = this.fb.group({
      motivo:  ['', Validators.required],
      detalle: [''],
    });
  }

  confirmar(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const resultado: AnularDialogResult = {
      motivo:  v.detalle ? `${v.motivo} — ${v.detalle}` : v.motivo,
      detalle: v.detalle,
    };
    this.dialogRef.close(resultado);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
