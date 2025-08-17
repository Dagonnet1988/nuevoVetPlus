import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-consulta-form',
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
    <div class="consulta-form-container">
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
            <p class="form-subtitle">{{ isEdit() ? 'Modificar información de la consulta' : 'Registrar nueva consulta médica' }}</p>
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
                    (click)="saveConsulta()"
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
                <mat-select formControlName="id_mascota" required>
                  <mat-option value="">Seleccionar paciente...</mat-option>
                  @for (paciente of pacientes(); track paciente.id_mascota) {
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
                <mat-select formControlName="id_veterinario" required>
                  <mat-option value="">Seleccionar veterinario...</mat-option>
                  @for (vet of veterinarios(); track vet.id) {
                    <mat-option [value]="vet.id">{{ vet.nombre }}</mat-option>
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
  `]
})
export class ConsultaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private consultasService = inject(ConsultasService);
  private pacientesService = inject(PacientesService);
  private citasService = inject(CitasService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  isEdit = signal(false);
  consulta = signal<ConsultaClinica | null>(null);
  pacientes = signal<any[]>([]);
  veterinarios = signal<any[]>([]);

  // Form
  consultaForm: FormGroup;

  // Estados disponibles
  estadosConsulta = [
    { value: 'En progreso', label: 'En Progreso' },
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
      estado: ['En progreso'],
      proxima_cita: [''],
      notas: [''],
      enviar_recordatorio: [false],
      seguimiento_requerido: [false]
    });
  }

  ngOnInit(): void {
    const consultaId = this.route.snapshot.paramMap.get('id');
    
    if (consultaId) {
      this.isEdit.set(true);
      this.loadConsulta(consultaId);
    }

    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadPacientes();
    this.loadVeterinarios();
  }

  private loadConsulta(id: string): void {
    this.loading.set(true);
    this.consultasService.getConsulta(id).subscribe({
      next: (consulta) => {
        this.consulta.set(consulta);
        this.populateForm(consulta);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando consulta:', error);
        this.snackBar.open('Error cargando consulta', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private populateForm(consulta: ConsultaClinica): void {
    this.consultaForm.patchValue({
      id_mascota: consulta.id_mascota,
      id_veterinario: consulta.id_veterinario,
      fecha_consulta: new Date(consulta.fecha_consulta),
      motivo: consulta.motivo,
      temperatura: consulta.temperatura,
      peso: consulta.peso,
      frecuencia_cardiaca: consulta.frecuencia_cardiaca,
      frecuencia_respiratoria: consulta.frecuencia_respiratoria,
      observaciones_examen: consulta.observaciones_examen,
      diagnostico: consulta.diagnostico,
      tratamiento: consulta.tratamiento,
      estado: consulta.estado,
      proxima_cita: consulta.proxima_cita ? new Date(consulta.proxima_cita) : null,
      notas: consulta.notas,
      enviar_recordatorio: consulta.enviar_recordatorio || false,
      seguimiento_requerido: consulta.seguimiento_requerido || false
    });
  }

  private loadPacientes(): void {
    this.pacientesService.getClientes(1, 1000).subscribe({
      next: (response) => {
        const data = response?.data;
        this.pacientes.set(Array.isArray(data) ? data : []);
      },
      error: (error) => {
        console.error('Error cargando pacientes:', error);
        this.pacientes.set([]);
      }
    });
  }

  private loadVeterinarios(): void {
    this.citasService.getVeterinarios().subscribe({
      next: (vets) => {
        this.veterinarios.set(Array.isArray(vets) ? vets : []);
      },
      error: (error) => {
        console.error('Error cargando veterinarios:', error);
        this.veterinarios.set([]);
      }
    });
  }

  saveConsulta(): void {
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
          this.isEdit() ? 'Consulta actualizada exitosamente' : 'Consulta creada exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading.set(false);
        this.router.navigate(['/historia-clinica']);
      },
      error: (error) => {
        console.error('Error guardando consulta:', error);
        this.snackBar.open('Error guardando consulta', 'Cerrar', { duration: 3000 });
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
        estado: 'En progreso',
        enviar_recordatorio: false,
        seguimiento_requerido: false
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/historia-clinica']);
  }
}