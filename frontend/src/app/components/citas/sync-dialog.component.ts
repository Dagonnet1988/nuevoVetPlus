import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';

@Component({
  selector: 'app-sync-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDividerModule,
    MatStepperModule
  ],
  template: `
    <div class="sync-dialog">
      <h2 mat-dialog-title>
        <mat-icon>sync</mat-icon>
        Sincronización con Google Calendar
      </h2>

      <mat-dialog-content>
        <form [formGroup]="syncForm" class="sync-form">

          <!-- Tipo de sincronización -->
          <div class="sync-type-section">
            <h3>Tipo de Sincronización</h3>

            <mat-checkbox formControlName="syncToGoogle" class="sync-option">
              <div class="option-content">
                <span class="option-title">📤 Enviar cambios a Google</span>
                <span class="option-desc">Sincronizar citas locales hacia Google Calendar</span>
              </div>
            </mat-checkbox>

            <mat-checkbox formControlName="importFromGoogle" class="sync-option">
              <div class="option-content">
                <span class="option-title">📥 Importar desde Google</span>
                <span class="option-desc">Traer eventos nuevos desde Google Calendar</span>
              </div>
            </mat-checkbox>

            <mat-checkbox formControlName="syncChanges" class="sync-option">
              <div class="option-content">
                <span class="option-title">🔄 Sincronizar cambios</span>
                <span class="option-desc">Detectar y aplicar cambios en eventos existentes</span>
              </div>
            </mat-checkbox>
          </div>

          <mat-divider></mat-divider>

          <!-- Opciones de importación (solo si está habilitada) -->
          <div class="import-options" *ngIf="syncForm.get('importFromGoogle')?.value">
            <h3>Opciones de Importación</h3>

            <!-- Rango de fechas -->
            <div class="date-range">
              <mat-form-field appearance="outline">
                <mat-label>Fecha inicio</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="fechaInicio">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Fecha fin</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="fechaFin">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
            </div>

            <!-- Opciones avanzadas -->
            <div class="advanced-options">
              <mat-checkbox formControlName="autoMatch">
                <div class="option-content">
                  <span class="option-title">🎯 Matching automático</span>
                  <span class="option-desc">Intentar asociar eventos con clientes/mascotas existentes</span>
                </div>
              </mat-checkbox>

              <mat-checkbox formControlName="createMissingData">
                <div class="option-content">
                  <span class="option-title">➕ Crear datos faltantes</span>
                  <span class="option-desc">Crear clientes/mascotas si no existen en el sistema</span>
                </div>
              </mat-checkbox>

              <mat-checkbox formControlName="dryRun">
                <div class="option-content">
                  <span class="option-title">🧪 Modo simulación</span>
                  <span class="option-desc">Solo mostrar qué se importaría, sin crear realmente</span>
                </div>
              </mat-checkbox>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button mat-raised-button
                color="primary"
                (click)="onSync()"
                [disabled]="!isValidConfiguration()">
          <mat-icon>sync</mat-icon>
          Sincronizar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .sync-dialog {
      min-width: min(500px, 90vw);
    }

    .sync-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 16px 0;
    }

    .sync-type-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sync-option {
      width: 100%;
      margin-bottom: 8px;
    }

    .option-content {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }

    .option-title {
      font-weight: 500;
      font-size: 14px;
    }

    .option-desc {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .import-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .date-range {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .date-range mat-form-field {
      flex: 1 1 180px;
    }

    @media (max-width: 480px) {
      .sync-dialog {
        min-width: 0;
        width: 100%;
      }

      .date-range {
        flex-direction: column;
        gap: 0;
      }
    }

    .advanced-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    mat-divider {
      margin: 16px 0;
    }
  `]
})
export class SyncDialogComponent {
  syncForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SyncDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.syncForm = this.fb.group({
      syncToGoogle: [true],
      importFromGoogle: [true],
      syncChanges: [false],
      fechaInicio: [startOfMonth, Validators.required],
      fechaFin: [endOfMonth, Validators.required],
      autoMatch: [true],
      createMissingData: [true],
      dryRun: [false]
    });
  }

  isValidConfiguration(): boolean {
    const formValue = this.syncForm.value;

    // Al menos una opción debe estar seleccionada
    const hasAnyOption = formValue.syncToGoogle || formValue.importFromGoogle || formValue.syncChanges;

    // Si se importa, las fechas son requeridas
    if (formValue.importFromGoogle) {
      return hasAnyOption && formValue.fechaInicio && formValue.fechaFin;
    }

    return hasAnyOption;
  }

  onSync(): void {
    if (this.isValidConfiguration()) {
      const formValue = this.syncForm.value;

      // Convertir fechas a string ISO
      const result = {
        ...formValue,
        fechaInicio: this.formatDateLocal(formValue.fechaInicio),
        fechaFin: this.formatDateLocal(formValue.fechaFin)
      };

      this.dialogRef.close(result);
    }
  }

  private formatDateLocal(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
