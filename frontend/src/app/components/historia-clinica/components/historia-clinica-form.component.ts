import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ConsultasService, ConsultaClinica } from '../../../services/consultas.service';
import { PacientesService } from '../../../services/pacientes.service';
import { CitasService } from '../../../services/citas.service';
import { ProductosService, Producto } from '../../../services/productos.service';

@Component({
  selector: 'app-historia-clinica-form',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatExpansionModule,
    MatCheckboxModule
  ],
  template: `
    <div class="historia-clinica-form-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1 class="form-title">
              <mat-icon class="title-icon">assignment_add</mat-icon>
              {{ isEdit() ? 'Editar Consulta' : 'Nueva Consulta Clínica' }}
            </h1>
            <p class="form-subtitle">{{ isEdit() ? 'Modificar información de la historia clínica' : 'Registrar nueva historia clínica médica' }}</p>
          </div>
          <div class="actions-section">
            <button mat-stroked-button
                    type="button"
                    (click)="resetForm()"
                    [disabled]="loading()">
              <mat-icon>refresh</mat-icon>
              Limpiar
            </button>
            <button mat-raised-button
                    color="primary"
                    (click)="saveHistoriaClinica()"
                    [disabled]="consultaForm.invalid || loading()">
              <mat-icon>save</mat-icon>
              {{ isEdit() ? 'Actualizar' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Formulario -->
      <form [formGroup]="consultaForm" class="consulta-form">

        <!-- Información básica -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Información Básica
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline" class="mascota-field">
                <mat-label>Paciente *</mat-label>
                <mat-select formControlName="id_mascota"
                           required>
                  <mat-option value="">Seleccionar paciente...</mat-option>
                  @for (paciente of pacientes(); track paciente.id_mascota || paciente.id_cliente || $index) {
                    <mat-option [value]="paciente.id_mascota">
                      {{ paciente.nombre }} - {{ paciente.cliente?.nombre }}
                    </mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="consultaForm.get('id_mascota')?.hasError('required')">
                  El paciente es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="veterinario-field">
                <mat-label>Veterinario *</mat-label>
                <mat-select formControlName="id_veterinario"
                           required>
                  <mat-option value="">Seleccionar veterinario...</mat-option>
                  @for (vet of veterinarios(); track vet.id_usuario || vet.id || $index) {
                    <mat-option [value]="vet.id_usuario || vet.id">{{ vet.nombre }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="consultaForm.get('id_veterinario')?.hasError('required')">
                  El veterinario es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="fecha-field">
                <mat-label>Fecha y Hora *</mat-label>
                <input matInput
                       [matDatepicker]="picker"
                       formControlName="fecha_consulta"
                       required>
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                <mat-error *ngIf="consultaForm.get('fecha_consulta')?.hasError('required')">
                  La fecha es obligatoria
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Motivo de Consulta *</mat-label>
                <textarea matInput
                          formControlName="motivo"
                          rows="3"
                          placeholder="Describe el motivo principal de la consulta..."
                          required></textarea>
                <mat-error *ngIf="consultaForm.get('motivo')?.hasError('required')">
                  El motivo es obligatorio
                </mat-error>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Examen físico -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>medical_services</mat-icon>
              Examen Físico
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-tab-group>
              <mat-tab label="Signos Vitales">
                <div class="tab-content">
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Temperatura (°C)</mat-label>
                      <input matInput type="number" formControlName="temperatura" step="0.1">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Peso (kg)</mat-label>
                      <input matInput type="number" formControlName="peso" step="0.1">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Frecuencia Cardíaca</mat-label>
                      <input matInput type="number" formControlName="frecuencia_cardiaca">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Frecuencia Respiratoria</mat-label>
                      <input matInput type="number" formControlName="frecuencia_respiratoria">
                    </mat-form-field>
                  </div>
                </div>
              </mat-tab>

              <mat-tab label="Observaciones">
                <div class="tab-content">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Observaciones del Examen</mat-label>
                    <textarea matInput
                              formControlName="observaciones_examen"
                              rows="4"
                              placeholder="Describe los hallazgos del examen físico..."></textarea>
                  </mat-form-field>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>

        <!-- Diagnóstico y tratamiento -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>healing</mat-icon>
              Diagnóstico y Tratamiento
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Diagnóstico</mat-label>
                <textarea matInput
                          formControlName="diagnostico"
                          rows="3"
                          placeholder="Diagnóstico clínico..."></textarea>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Plan de Tratamiento</mat-label>
                <textarea matInput
                          formControlName="tratamiento"
                          rows="4"
                          placeholder="Describe el plan de tratamiento, medicamentos, dosis, etc..."></textarea>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="estado-field">
                <mat-label>Estado de la Consulta</mat-label>
                <mat-select formControlName="estado">
                  @for (estado of estadosConsulta; track estado.value) {
                    <mat-option [value]="estado.value">{{ estado.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="proxima-cita-field">
                <mat-label>Próxima Cita</mat-label>
                <input matInput [matDatepicker]="nextPicker" formControlName="proxima_cita">
                <mat-datepicker-toggle matIconSuffix [for]="nextPicker"></mat-datepicker-toggle>
                <mat-datepicker #nextPicker></mat-datepicker>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Medicamentos -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>medication</mat-icon>
              Medicamentos Prescritos
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div formArrayName="medicamentos">
              @for (medicamento of medicamentosArray.controls; track $index) {
                <div [formGroupName]="$index" class="medicamento-item">
                  <div class="medicamento-header">
                    <h4>Medicamento {{ $index + 1 }}</h4>
                    <button mat-icon-button
                            type="button"
                            color="warn"
                            (click)="removeMedicamento($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="nombre-medicamento-field">
                      <mat-label>Nombre del Medicamento</mat-label>
                      <input matInput
                             formControlName="nombre"
                             placeholder="Ej: Amoxicilina"
                             (input)="onMedicamentoInput($event, $index)"
                             [matAutocomplete]="autoMedicamentos">
                      <mat-autocomplete #autoMedicamentos="matAutocomplete"
                                       (optionSelected)="selectMedicamento($event.option.value, $index)">
                        @for (medicamento of medicamentosInventario(); track medicamento.id_producto) {
                          <mat-option [value]="medicamento">
                            <div class="medicamento-option">
                              <div class="medicamento-nombre">{{ medicamento.nombre }}</div>
                              <div class="medicamento-info">
                                <span class="stock">Stock: {{ medicamento.stock_actual }}</span>
                                <span class="precio">Precio: {{ medicamento.precio_venta }}</span>
                              </div>
                            </div>
                          </mat-option>
                        }
                      </mat-autocomplete>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="dosis-field">
                      <mat-label>Dosis</mat-label>
                      <input matInput
                             formControlName="dosis"
                             placeholder="Ej: 250mg">
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="frecuencia-field">
                      <mat-label>Frecuencia</mat-label>
                      <input matInput
                             formControlName="frecuencia"
                             placeholder="Ej: Cada 12 horas">
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="duracion-field">
                      <mat-label>Duración</mat-label>
                      <input matInput
                             formControlName="duracion"
                             placeholder="Ej: 7 días">
                    </mat-form-field>
                  </div>
                </div>
              } @empty {
                <div class="no-medicamentos">
                  <p>No hay medicamentos agregados</p>
                </div>
              }
            </div>

            <div class="add-medicamento-section">
              <button mat-stroked-button
                      type="button"
                      (click)="addMedicamento()"
                      color="primary">
                <mat-icon>add</mat-icon>
                Agregar Medicamento
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Notas adicionales -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>notes</mat-icon>
              Notas Adicionales
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notas</mat-label>
              <textarea matInput
                        formControlName="notas"
                        rows="3"
                        placeholder="Notas adicionales, observaciones especiales..."></textarea>
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="enviar_recordatorio">
                Enviar recordatorio al propietario
              </mat-checkbox>
              <mat-checkbox formControlName="seguimiento_requerido">
                Requiere seguimiento
              </mat-checkbox>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Archivos adjuntos -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>attach_file</mat-icon>
              Archivos Adjuntos
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="files-section">
              <div class="file-upload-area">
                <input type="file"
                       #fileInput
                       (change)="onFileSelected($event)"
                       multiple
                       accept="image/*,.pdf,.doc,.docx"
                       style="display: none;">
                <button mat-stroked-button
                        type="button"
                        (click)="fileInput.click()"
                        color="primary">
                  <mat-icon>cloud_upload</mat-icon>
                  Seleccionar Archivos
                </button>
                <p class="upload-hint">Formatos permitidos: PDF, DOC, DOCX, imágenes (JPG, PNG, GIF)</p>
              </div>

              @if (archivosSeleccionados().length > 0) {
                <div class="selected-files">
                  <h5>Archivos seleccionados:</h5>
                  <div class="files-list">
                    @for (archivo of archivosSeleccionados(); track archivo.name) {
                      <div class="file-item">
                        <mat-icon class="file-icon">{{ getFileIcon(archivo.type) }}</mat-icon>
                        <div class="file-info">
                          <span class="file-name">{{ archivo.name }}</span>
                          <span class="file-size">({{ formatFileSize(archivo.size) }})</span>
                        </div>
                        <button mat-icon-button
                                (click)="removeFile(archivo)"
                                color="warn">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </form>

      <!-- Loading overlay -->
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="50"></mat-spinner>
          <p>{{ isEdit() ? 'Actualizando' : 'Guardando' }} consulta...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .consulta-form-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }

    /* Header */
    .form-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      background: rgba(46, 125, 50, 0.1);
      color: #2e7d32;
    }

    .title-section {
      flex: 1;
    }

    .form-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 500;
      color: #2e7d32;
    }

    .title-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .form-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .actions-section {
      display: flex;
      gap: 12px;
    }

    /* Form sections */
    .form-section {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section .mat-mdc-card-header {
      padding-bottom: 8px;
    }

    .form-section .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #2e7d32;
      font-size: 18px;
      font-weight: 500;
    }

    /* Form layout */
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .full-width {
      width: 100%;
    }

    .mascota-field {
      flex: 2;
      min-width: 250px;
    }

    .veterinario-field {
      flex: 1.5;
      min-width: 200px;
    }

    .fecha-field {
      flex: 1;
      min-width: 180px;
    }

    .estado-field {
      flex: 1;
      min-width: 150px;
    }

    .proxima-cita-field {
      flex: 1;
      min-width: 180px;
    }

    /* Tabs */
    .tab-content {
      padding: 16px 0;
    }

    /* Checkboxes */
    .checkbox-row {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 1000;
    }

    .loading-overlay p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .consulta-form-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .form-title {
        font-size: 24px;
      }

      .form-row {
        flex-direction: column;
      }

      .form-row > * {
        flex: none !important;
        min-width: auto !important;
        width: 100%;
      }

      .checkbox-row {
        flex-direction: column;
        gap: 12px;
      }
    }

    /* Estilos para medicamentos */
    .medicamento-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background-color: #fafafa;
    }

    .medicamento-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .medicamento-header h4 {
      margin: 0;
      color: #1976d2;
      font-weight: 500;
    }

    .nombre-medicamento-field {
      flex: 2;
      margin-right: 16px;
    }

    .dosis-field {
      flex: 1;
    }

    .frecuencia-field {
      flex: 1;
      margin-right: 16px;
    }

    .duracion-field {
      flex: 1;
    }

    .no-medicamentos {
      text-align: center;
      padding: 32px;
      color: #666;
      font-style: italic;
    }

    .medicamento-option {
      padding: 8px 0;
    }

    .medicamento-nombre {
      font-weight: 500;
      color: #333;
    }

    .medicamento-info {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .stock {
      background-color: #e8f5e8;
      color: #2e7d32;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .precio {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .add-medicamento-section {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    /* Archivos */
    .files-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .file-upload-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      border: 2px dashed #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    .upload-hint {
      margin: 0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }

    .selected-files h5 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
    }

    .files-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .file-icon {
      color: #666;
      flex-shrink: 0;
    }

    .file-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-weight: 500;
      color: #333;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }

    @media (max-width: 768px) {
      .nombre-medicamento-field,
      .frecuencia-field {
        margin-right: 0;
        margin-bottom: 16px;
      }

      .file-upload-area {
        padding: 16px;
      }

      .file-item {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
    }
  `]
})
export class HistoriaClinicaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private consultasService = inject(ConsultasService);
  private pacientesService = inject(PacientesService);
  private citasService = inject(CitasService);
  private productosService = inject(ProductosService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  isEdit = signal(false);
  consulta = signal<ConsultaClinica | null>(null);
  pacientes = signal<any[]>([]);
  veterinarios = signal<any[]>([]);
  medicamentosInventario = signal<Producto[]>([]);
  citaId = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);

  // Form
  consultaForm: FormGroup;

  // Estados disponibles
  estadosConsulta = [
    { value: 'En Curso', label: 'En Curso' },
    { value: 'Completada', label: 'Completada' },
    { value: 'Cancelada', label: 'Cancelada' }
  ];

  constructor() {
    this.consultaForm = this.fb.group({
      id_mascota: ['', Validators.required],
      id_veterinario: ['', Validators.required],
      fecha_consulta: [new Date(), Validators.required],
      motivo: ['', Validators.required],
      temperatura: [''],
      peso: [''],
      frecuencia_cardiaca: [''],
      frecuencia_respiratoria: [''],
      observaciones_examen: [''],
      diagnostico: [''],
      tratamiento: [''],
      medicamentos: this.fb.array([]),
      estado: ['En Curso'],
      proxima_cita: [''],
      notas: [''],
      enviar_recordatorio: [false],
      seguimiento_requerido: [false]
    });
  }

  get medicamentosArray(): FormArray {
    return this.consultaForm.get('medicamentos') as FormArray;
  }

  createMedicamentoGroup(): FormGroup {
    return this.fb.group({
      nombre: ['', Validators.required],
      dosis: ['', Validators.required],
      frecuencia: ['', Validators.required],
      duracion: ['', Validators.required]
    });
  }

  addMedicamento(): void {
    this.medicamentosArray.push(this.createMedicamentoGroup());
  }

  removeMedicamento(index: number): void {
    this.medicamentosArray.removeAt(index);
  }

  searchMedicamentos(query: string): void {
    if (query.length < 2) {
      this.medicamentosInventario.set([]);
      return;
    }

    this.productosService.getProductos(1, 10, {
      search: query,
      activo: true,
      categoria: 'Medicamentos' // Filtrar solo medicamentos
    }).subscribe({
      next: (response) => {
        const medicamentos = response?.data?.products || response?.data || [];
        this.medicamentosInventario.set(Array.isArray(medicamentos) ? medicamentos : []);
      },
      error: (error) => {
        console.error('Error buscando medicamentos:', error);
        this.medicamentosInventario.set([]);
      }
    });
  }

  onMedicamentoInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    this.searchMedicamentos(input.value);
  }

  selectMedicamento(medicamento: Producto, index: number): void {
    const medicamentoGroup = this.medicamentosArray.at(index) as FormGroup;
    if (medicamentoGroup) {
      medicamentoGroup.patchValue({
        nombre: medicamento.nombre
      });
      this.medicamentosInventario.set([]);
    }
  }

  async ngOnInit(): Promise<void> {
    const consultaId = this.route.snapshot.paramMap.get('id');
    const citaId = this.route.snapshot.queryParamMap.get('citaId'); // Capturar ID de cita

    if (citaId) {
      this.citaId.set(citaId);
    }

    if (consultaId) {
      this.isEdit.set(true);
      this.loadHistoriaClinica(consultaId);
    } else {
      // Para historias clínicas nuevas, no agregar medicamento por defecto
      // Solo cargar datos para nuevas historias clínicas
      await this.loadInitialData();
    }
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.loadPacientes(),
      this.loadVeterinarios()
    ]);
  }

  private async loadHistoriaClinica(id: string): Promise<void> {
    this.loading.set(true);

    try {
      // Primero cargar datos iniciales
      await this.loadInitialData();

      // Luego cargar la historia clínica
      const response = await this.consultasService.getConsultaById(id).toPromise();

      if (response?.success && response.data) {
        this.consulta.set(response.data);
        this.populateForm(response.data);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Error cargando historia clínica:', error);
      this.snackBar.open('Error cargando historia clínica', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private populateForm(consulta: any): void {
    // Primero limpiar el array de medicamentos
    while (this.medicamentosArray.length !== 0) {
      this.medicamentosArray.removeAt(0);
    }

    // Agregar medicamentos si existen
    if (consulta.medicamentos && Array.isArray(consulta.medicamentos)) {
      consulta.medicamentos.forEach((med: any) => {
        const medicamentoGroup = this.createMedicamentoGroup();
        medicamentoGroup.patchValue({
          nombre: med.nombre || '',
          dosis: med.dosis || '',
          frecuencia: med.frecuencia || '',
          duracion: med.duracion || ''
        });
        this.medicamentosArray.push(medicamentoGroup);
      });
    }
    // Si no hay medicamentos, no agregar ninguno (ahora son opcionales)

    this.consultaForm.patchValue({
      id_mascota: consulta.id_mascota,
      id_veterinario: consulta.id_veterinario,
      fecha_consulta: consulta.fecha_consulta ? new Date(consulta.fecha_consulta) : new Date(),
      motivo: consulta.motivo || '',
      anamnesis: consulta.anamnesis || '',
      examen_fisico: consulta.examen_fisico || '',
      temperatura: consulta.temperatura || null,
      peso: consulta.peso || null,
      diagnostico: consulta.diagnostico || '',
      tratamiento: consulta.tratamiento || '',
      recomendaciones: consulta.recomendaciones || '',
            estado: consulta.estado || 'En Curso',
      costo: consulta.costo || null,
      proxima_cita: consulta.proxima_cita ? new Date(consulta.proxima_cita) : null,
      // Campos que no existen en la BD pero están en el formulario - usar valores por defecto
      frecuencia_cardiaca: null,
      frecuencia_respiratoria: null,
      observaciones_examen: '',
      notas: '',
      enviar_recordatorio: false,
      seguimiento_requerido: false
    });

    // Deshabilitar campos que no deben ser editables en modo edición
    if (this.isEdit()) {
      this.consultaForm.get('id_mascota')?.disable();
      this.consultaForm.get('id_veterinario')?.disable();
      this.consultaForm.get('fecha_consulta')?.disable();
    }
  }

  private async loadPacientes(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pacientesService.getMascotas(1, 1000).subscribe({
        next: (response) => {
          const data = response?.data;
          const pacientesArray = data?.pacientes || data || [];
          this.pacientes.set(Array.isArray(pacientesArray) ? pacientesArray : []);
          resolve();
        },
        error: (error) => {
          console.error('Error cargando mascotas:', error);
          this.pacientes.set([]);
          reject(error);
        }
      });
    });
  }

  private async loadVeterinarios(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.citasService.getVeterinarios().subscribe({
        next: (response) => {
          const veterinariosArray = response?.data || response;
          this.veterinarios.set(Array.isArray(veterinariosArray) ? veterinariosArray : []);
          resolve();
        },
        error: (error) => {
          console.error('Error cargando veterinarios:', error);
          this.veterinarios.set([]);
          reject(error);
        }
      });
    });
  }

  saveHistoriaClinica(): void {
    if (this.consultaForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos obligatorios', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const formData = this.consultaForm.value;

    // Formatear fechas
    if (formData.fecha_consulta) {
      formData.fecha_consulta = formData.fecha_consulta.toISOString();
    }
    if (formData.proxima_cita) {
      formData.proxima_cita = formData.proxima_cita.toISOString();
    }

    const operation = this.isEdit()
      ? this.consultasService.updateConsulta(this.consulta()!.id_consulta, formData)
      : this.consultasService.createConsulta(formData);

    operation.subscribe({
      next: (result) => {
        this.snackBar.open(
          this.isEdit() ? 'Historia clínica actualizada exitosamente' : 'Historia clínica creada exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading.set(false);

        // Redirigir a la cita si tenemos el ID, sino a historia clínica
        if (this.citaId()) {
          this.router.navigate(['/citas', this.citaId()]);
        } else {
          this.router.navigate(['/historia-clinica']);
        }
      },
      error: (error) => {
        console.error('Error guardando historia clínica:', error);
        this.snackBar.open('Error guardando historia clínica', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  resetForm(): void {
    if (this.isEdit()) {
      this.populateForm(this.consulta()!);
    } else {
      this.consultaForm.reset({
        fecha_consulta: new Date(),
        estado: 'En Curso',
        enviar_recordatorio: false,
        seguimiento_requerido: false
      });
    }
  }

  goBack(): void {
    // Redirigir a la cita si tenemos el ID, sino a historia clínica
    if (this.citaId()) {
      this.router.navigate(['/citas', this.citaId()]);
    } else {
      this.router.navigate(['/historia-clinica']);
    }
  }

  // Métodos para manejo de archivos
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const currentFiles = this.archivosSeleccionados();
      this.archivosSeleccionados.set([...currentFiles, ...files]);
    }
  }

  removeFile(file: File): void {
    const currentFiles = this.archivosSeleccionados();
    const filteredFiles = currentFiles.filter(f => f !== file);
    this.archivosSeleccionados.set(filteredFiles);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
    return 'attach_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
