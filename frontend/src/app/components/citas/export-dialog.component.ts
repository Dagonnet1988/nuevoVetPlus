import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule } from '@angular/material/core';

export interface ExportDialogData {
  veterinarios: any[];
  currentFilters: any;
}

export interface ExportOptions {
  formato: 'individual' | 'consolidada';
  tipo: 'pdf' | 'xlsx';
  veterinario_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
}

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="export-dialog">
      <h2 mat-dialog-title>
        <mat-icon>download</mat-icon>
        Exportar Agenda
      </h2>

      <mat-dialog-content>
        <form [formGroup]="exportForm" class="export-form">

          <!-- Tipo de exportación -->
          <mat-form-field appearance="outline">
            <mat-label>Formato de exportación</mat-label>
            <mat-select formControlName="formato" (selectionChange)="onFormatChange()">
              <mat-option value="individual">Agenda Individual</mat-option>
              <mat-option value="consolidada">Agenda Consolidada (Todos)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Veterinario (solo para agenda individual) -->
          <mat-form-field appearance="outline" *ngIf="exportForm.value.formato === 'individual'">
            <mat-label>Veterinario</mat-label>
            <mat-select formControlName="veterinario_id">
              <mat-option value="">Seleccionar veterinario</mat-option>
              <mat-option *ngFor="let vet of data.veterinarios" [value]="vet.id">
                {{ vet.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Tipo de archivo -->
          <mat-form-field appearance="outline">
            <mat-label>Tipo de archivo</mat-label>
            <mat-select formControlName="tipo">
              <mat-option value="pdf">
                <mat-icon>picture_as_pdf</mat-icon>
                PDF (Recomendado)
              </mat-option>
              <mat-option value="xlsx">
                <mat-icon>table_chart</mat-icon>
                Excel (Datos)
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Rango de fechas -->
          <div class="date-range">
            <mat-form-field appearance="outline">
              <mat-label>Fecha de inicio</mat-label>
              <input matInput
                     [matDatepicker]="startPicker"
                     formControlName="fecha_inicio"
                     readonly>
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha de fin</mat-label>
              <input matInput
                     [matDatepicker]="endPicker"
                     formControlName="fecha_fin"
                     readonly>
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Botones de rango rápido -->
          <div class="quick-ranges">
            <h4>Rangos rápidos:</h4>
            <div class="range-buttons">
              <button type="button" mat-stroked-button (click)="setQuickRange('today')">Hoy</button>
              <button type="button" mat-stroked-button (click)="setQuickRange('week')">Esta semana</button>
              <button type="button" mat-stroked-button (click)="setQuickRange('month')">Este mes</button>
              <button type="button" mat-stroked-button (click)="setQuickRange('nextWeek')">Próxima semana</button>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button mat-raised-button
                color="primary"
                (click)="onExport()"
                [disabled]="!exportForm.valid || exporting">
          <mat-spinner *ngIf="exporting" diameter="16" style="margin-right: 8px;"></mat-spinner>
          <mat-icon *ngIf="!exporting">download</mat-icon>
          {{ exporting ? 'Generando...' : 'Exportar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .export-dialog {
      width: 500px;
      max-width: 90vw;
    }

    .export-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 16px 0;
    }

    .date-range {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .quick-ranges h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    }

    .range-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .range-buttons button {
      font-size: 12px;
      padding: 4px 12px;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .export-dialog {
        width: 100%;
        max-width: 100vw;
      }

      .date-range {
        grid-template-columns: 1fr;
      }

      .range-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class ExportDialogComponent {
  exportForm: FormGroup;
  exporting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogData
  ) {
    // Configurar fechas por defecto (semana actual)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    this.exportForm = this.fb.group({
      formato: ['individual', Validators.required],
      tipo: ['pdf', Validators.required],
      veterinario_id: [''],
      fecha_inicio: [startOfWeek, Validators.required],
      fecha_fin: [endOfWeek, Validators.required]
    });

    // Si hay filtros aplicados, usar esos valores
    if (data.currentFilters?.id_veterinario) {
      this.exportForm.patchValue({
        veterinario_id: data.currentFilters.id_veterinario
      });
    }

    this.updateValidators();
  }

  onFormatChange() {
    this.updateValidators();
  }

  private updateValidators() {
    const veterinarioControl = this.exportForm.get('veterinario_id');
    if (this.exportForm.value.formato === 'individual') {
      veterinarioControl?.setValidators([Validators.required]);
    } else {
      veterinarioControl?.clearValidators();
    }
    veterinarioControl?.updateValueAndValidity();
  }

  setQuickRange(range: string) {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'nextWeek':
        startDate = new Date(today);
        startDate.setDate(today.getDate() + (7 - today.getDay()));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      default:
        return;
    }

    this.exportForm.patchValue({
      fecha_inicio: startDate,
      fecha_fin: endDate
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  async onExport() {
    if (!this.exportForm.valid) return;

    this.exporting = true;

    const formValue = this.exportForm.value;
    const exportOptions: ExportOptions = {
      formato: formValue.formato,
      tipo: formValue.tipo,
      fecha_inicio: this.formatDateForAPI(formValue.fecha_inicio),
      fecha_fin: this.formatDateForAPI(formValue.fecha_fin)
    };

    if (formValue.formato === 'individual') {
      exportOptions.veterinario_id = formValue.veterinario_id;
    }

    this.dialogRef.close(exportOptions);
  }

  private formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
