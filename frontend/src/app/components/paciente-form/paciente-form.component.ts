import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { PacientesService } from '../../services/pacientes.service';
import { Cliente, Mascota, PacienteFormData, CreatePacienteResponse } from '../../models/paciente.interface';
import { sexoDbToFrontend, sexoFrontendToDb, processBackendResponse } from '../../utils/paciente.utils';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="form-container">
      <!-- Header -->
      <div class="form-header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1 class="form-title">
            <mat-icon class="title-icon">{{ isEditing() ? 'edit' : 'add' }}</mat-icon>
            {{ isEditing() ? 'Editar Paciente' : 'Nuevo Paciente' }}
          </h1>
          <p class="form-subtitle">
            {{ isEditing() ? 'Modifica la información del paciente' : 'Registro completo de propietario y mascota' }}
          </p>
        </div>
      </div>

      <!-- Formulario principal -->
      <form [formGroup]="pacienteForm" (ngSubmit)="onSubmit()" class="main-form">
        <div class="form-content">
          <!-- Sección de Propietario -->
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon">person</mat-icon>
                Información del Propietario
              </mat-card-title>
              <mat-card-subtitle>
                Busca un propietario existente o registra uno nuevo
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <!-- Búsqueda de propietario existente -->
              <div class="search-section" *ngIf="!isEditing()">
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Buscar propietario existente</mat-label>
                  <input matInput
                         [formControl]="clienteSearchControl"
                         [matAutocomplete]="clienteAuto"
                         placeholder="Nombre, cédula o teléfono...">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>

                <mat-autocomplete #clienteAuto="matAutocomplete"
                                  [displayWith]="displayCliente.bind(this)"
                                  (optionSelected)="onClienteSelected($event)">
                  @for (cliente of (filteredClientes() || []); track cliente.id_cliente) {
                    <mat-option [value]="cliente">
                      <div class="cliente-option">
                        <div class="cliente-info">
                          <span class="cliente-name">{{ cliente.nombre }}</span>
                          <span class="cliente-details">{{ cliente.telefono }}</span>
                          @if (cliente.cedula) {
                            <span class="cliente-details">CC: {{ cliente.cedula }}</span>
                          }
                        </div>
                      </div>
                    </mat-option>
                  }
                </mat-autocomplete>

                @if (clienteSeleccionado()) {
                  <div class="selected-cliente">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Propietario seleccionado: <strong>{{ clienteSeleccionado()?.nombre }}</strong></span>
                    <button mat-icon-button (click)="clearSelectedCliente()" type="button">
                      <mat-icon>clear</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <!-- Formulario de propietario -->
              <div class="cliente-form" [class.disabled]="clienteSeleccionado() && !isEditing()">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex-1">
                    <mat-label>Nombre completo *</mat-label>
                    <input matInput formControlName="nombre_cliente">
                    @if (pacienteForm.get('nombre_cliente')?.invalid && pacienteForm.get('nombre_cliente')?.touched) {
                      <mat-error>El nombre es requerido</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="flex-1">
                    <mat-label>Cédula</mat-label>
                    <input matInput formControlName="cedula">
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex-1">
                    <mat-label>Teléfono *</mat-label>
                    <input matInput formControlName="telefono" type="tel">
                    @if (pacienteForm.get('telefono')?.invalid && pacienteForm.get('telefono')?.touched) {
                      <mat-error>El teléfono es requerido</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="flex-1">
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="email" type="email">
                    @if (pacienteForm.get('email')?.invalid && pacienteForm.get('email')?.touched) {
                      <mat-error>Email inválido</mat-error>
                    }
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Dirección</mat-label>
                  <textarea matInput formControlName="direccion" rows="2"></textarea>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Sección de Mascota -->
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon">pets</mat-icon>
                Información de la Mascota
              </mat-card-title>
              <mat-card-subtitle>
                Datos completos del paciente
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Nombre de la mascota *</mat-label>
                  <input matInput formControlName="nombre_mascota">
                  @if (pacienteForm.get('nombre_mascota')?.invalid && pacienteForm.get('nombre_mascota')?.touched) {
                    <mat-error>El nombre de la mascota es requerido</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Especie *</mat-label>
                  <mat-select formControlName="especie" (selectionChange)="onEspecieChange($event)">
                    @for (especie of (especies() || []); track especie) {
                      <mat-option [value]="especie">{{ especie }}</mat-option>
                    }
                  </mat-select>
                  @if (pacienteForm.get('especie')?.invalid && pacienteForm.get('especie')?.touched) {
                    <mat-error>La especie es requerida</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Raza</mat-label>
                  <mat-select formControlName="raza">
                    @for (raza of (razasDisponibles() || []); track raza) {
                      <mat-option [value]="raza">{{ raza }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Sexo *</mat-label>
                  <mat-select formControlName="sexo">
                    <mat-option value="M">Macho</mat-option>
                    <mat-option value="H">Hembra</mat-option>
                  </mat-select>
                  @if (pacienteForm.get('sexo')?.invalid && pacienteForm.get('sexo')?.touched) {
                    <mat-error>El sexo es requerido</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Fecha de nacimiento</mat-label>
                  <input matInput
                         [matDatepicker]="picker"
                         formControlName="fecha_nacimiento"
                         readonly>
                  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Peso (kg)</mat-label>
                  <input matInput formControlName="peso" type="number" step="0.1" min="0">
                  <span matSuffix>kg</span>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Color</mat-label>
                  <input matInput formControlName="color">
                </mat-form-field>

                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Microchip</mat-label>
                  <input matInput formControlName="microchip">
                </mat-form-field>
              </div>

              <div class="form-row">
                <div class="checkbox-field">
                  <mat-checkbox formControlName="esterilizado">
                    <mat-label>Esterilizado/Castrado</mat-label>
                  </mat-checkbox>
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notas adicionales</mat-label>
                <textarea matInput formControlName="notas" rows="3"></textarea>
              </mat-form-field>

              <!-- Sección de Foto -->
              <mat-divider class="photo-divider"></mat-divider>

              <div class="photo-section">
                <h3 class="photo-title">
                  <mat-icon>photo_camera</mat-icon>
                  Foto del Paciente
                </h3>

                <div class="photo-upload-container">
                  <div class="photo-preview">
                    @if (selectedPhoto()) {
                      <img [src]="selectedPhoto()!" [alt]="pacienteForm.value.nombre_mascota" class="preview-image">
                    } @else if (currentPhotoUrl()) {
                      <img [src]="getImageUrl(currentPhotoUrl()!)"
                           [alt]="pacienteForm.value.nombre_mascota"
                           class="preview-image"
                           (error)="onImageError($event)">
                    } @else {
                      <mat-icon class="default-pet-icon">pets</mat-icon>
                    }
                    <div class="photo-overlay">
                      <mat-icon class="camera-icon">photo_camera</mat-icon>
                    </div>
                  </div>

                  <div class="photo-actions">
                    <input type="file"
                           #fileInput
                           accept="image/*"
                           (change)="onFileSelected($event)"
                           style="display: none;">

                    <button mat-stroked-button
                            type="button"
                            (click)="fileInput.click()"
                            class="upload-button">
                      <mat-icon>upload</mat-icon>
                      Subir Foto
                    </button>

                    @if (selectedPhoto() || currentPhotoUrl()) {
                      <button mat-stroked-button
                              type="button"
                              (click)="removePhoto()"
                              class="remove-button">
                        <mat-icon>delete</mat-icon>
                        Quitar Foto
                      </button>
                    }
                  </div>
                </div>

                <p class="photo-help">
                  Sube una foto del paciente. Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB.
                </p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Acciones -->
        <div class="form-actions">
          <button mat-stroked-button
                  type="button"
                  (click)="goBack()"
                  class="cancel-button">
            <mat-icon>cancel</mat-icon>
            Cancelar
          </button>

          <button mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="pacienteForm.invalid || loading()"
                  class="submit-button">
            @if (loading()) {
              <mat-spinner diameter="20" class="button-spinner"></mat-spinner>
              {{ isEditing() ? 'Actualizando...' : 'Guardando...' }}
            } @else {
              <ng-container>
                <mat-icon>{{ isEditing() ? 'save' : 'add' }}</mat-icon>
                {{ isEditing() ? 'Actualizar Paciente' : 'Registrar Paciente' }}
              </ng-container>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .form-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }

    .back-button {
      margin-top: 8px;
    }

    .header-content {
      flex: 1;
    }

    .form-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 500;
      color: #2e7d32;
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .form-subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .main-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-icon {
      margin-right: 8px;
      color: #2e7d32;
    }

    .search-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .search-field {
      width: 100%;
      max-width: 400px;
    }

    .selected-cliente {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
    }

    .success-icon {
      color: #4caf50;
    }

    .cliente-option {
      width: 100%;
    }

    .cliente-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cliente-name {
      font-weight: 500;
      color: #333;
    }

    .cliente-details {
      font-size: 12px;
      color: #666;
    }

    .cliente-form {
      transition: opacity 0.3s ease;
    }

    .cliente-form.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .flex-1 {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding: 24px 0;
      border-top: 1px solid #e0e0e0;
    }

    .cancel-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .submit-button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 180px;
    }

    .button-spinner {
      margin-right: 8px;
    }

    /* Campo checkbox */
    .checkbox-field {
      display: flex;
      align-items: center;
      padding: 16px 0;
      margin-bottom: 16px;
    }

    .checkbox-field mat-checkbox {
      margin-bottom: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .form-container {
        padding: 16px;
      }

      .form-header {
        flex-direction: column;
        gap: 8px;
      }

      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .form-actions {
        flex-direction: column-reverse;
        gap: 12px;
      }

      .cancel-button,
      .submit-button {
        width: 100%;
        justify-content: center;
      }

      .checkbox-field {
        padding: 12px 0;
      }
    }

    /* Sección de foto */
    .photo-divider {
      margin: 24px 0;
    }

    .photo-section {
      margin-top: 24px;
    }

    .photo-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .photo-upload-container {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .photo-preview {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px dashed #e0e0e0;
      background: #f5f5f5;
      transition: border-color 0.3s ease;
    }

    .photo-preview:hover {
      border-color: #2e7d32;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-pet-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #2e7d32;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .photo-preview:hover .photo-overlay {
      opacity: 1;
    }

    .camera-icon {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .photo-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .upload-button,
    .remove-button {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 200px;
    }

    .remove-button {
      color: #d32f2f;
      border-color: #d32f2f;
    }

    .photo-help {
      margin: 16px 0 0 0;
      font-size: 12px;
      color: #666;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .photo-upload-container {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .photo-actions {
        align-items: center;
      }

      .upload-button,
      .remove-button {
        max-width: none;
        width: 100%;
      }
    }
  `]
})
export class PacienteFormComponent implements OnInit {
  // Signals para estado reactivo
  loading = signal(false);
  isEditing = signal(false);
  clienteSeleccionado = signal<Cliente | null>(null);
  especies = signal<string[]>(['Perro', 'Gato', 'Ave', 'Hamster', 'Conejo', 'Reptil', 'Pez', 'Otro']); // Inicializar con datos básicos
  razasDisponibles = signal<string[]>(['Mestizo', 'Otro']);
  filteredClientes = signal<Cliente[]>([]);

  // Signals para manejo de fotos
  selectedPhoto = signal<string | null>(null);
  currentPhotoUrl = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // Formularios
  pacienteForm: FormGroup;
  clienteSearchControl: any;

  // Datos
  pacienteId?: string;
  mockClientes: Cliente[] = [];

  constructor(
    private fb: FormBuilder,
    private pacientesService: PacientesService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.pacienteForm = this.createForm();
    this.clienteSearchControl = this.fb.control('');
    this.setupFormSubscriptions();
  }

  ngOnInit(): void {
    this.loadData();
    this.checkEditMode();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Datos del cliente
      nombre_cliente: ['', [Validators.required]],
      cedula: [''],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.email]],
      direccion: [''],

      // Datos de la mascota
      nombre_mascota: ['', [Validators.required]],
      especie: ['', [Validators.required]],
      raza: [''],
      sexo: ['', [Validators.required]],
      fecha_nacimiento: [''],
      peso: ['', [Validators.min(0)]],
      esterilizado: [false],
      color: [''],
      microchip: [''],
      notas: ['']
    });
  }

  private setupFormSubscriptions(): void {
    // Búsqueda de clientes
    this.clienteSearchControl.valueChanges.subscribe((value: any) => {
      if (typeof value === 'string') {
        this.searchClientes(value);
      }
    });

    // Actualizar razas cuando cambia la especie
    this.pacienteForm.get('especie')?.valueChanges.subscribe(especie => {
      if (especie) {
        this.updateRazas(especie);
      }
    });
  }

  private loadData(): void {
    // Cargar especies desde el backend
    this.pacientesService.getEspecies().subscribe({
      next: (response: any) => {
        // Verificar que la respuesta contenga un array válido
        let especiesArray: string[] = [];

        if (response && typeof response === 'object' && 'success' in response && Array.isArray(response.data)) {
          especiesArray = response.data;
        } else if (Array.isArray(response)) {
          especiesArray = response;
        }
        this.especies.set(especiesArray);
      },
      error: (error) => {
        console.error('Error cargando especies:', error);
        // Fallback a datos mock
      }
    });

    // Cargar clientes para búsqueda
    this.loadClientes();
  }

  private checkEditMode(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.pacienteId = params['id'];
        this.isEditing.set(true);
        if (this.pacienteId) {
          this.loadPacienteForEdit(this.pacienteId);
        }
      }
    });
  }

  private loadPacienteForEdit(id: string): void {
    this.loading.set(true);

    this.pacientesService.getMascotaById(id).subscribe({
      next: (response) => {
        const processed = processBackendResponse(response);
        if (!processed.success || !processed.data) {
          throw new Error(processed.message || 'No se pudieron cargar los datos del paciente');
        }

        const pacienteData: any = processed.data;

        // Extraer datos del cliente de forma robusta
        const clienteData = {
          nombre: pacienteData.nombre_cliente || pacienteData.cliente?.nombre || '',
          cedula: pacienteData.cedula || pacienteData.cliente?.cedula || '',
          telefono: pacienteData.telefono || pacienteData.cliente?.telefono || '',
          email: pacienteData.email || pacienteData.cliente?.email || '',
          direccion: pacienteData.direccion || pacienteData.cliente?.direccion || ''
        };

        // Cargar especies y razas de forma paralela, luego llenar el formulario
        Promise.all([
          this.loadEspeciesData(),
          pacienteData.especie ? this.loadRazasData(pacienteData.especie) : Promise.resolve()
        ]).then(() => {
          // Preparar datos del formulario
          const formData = {
            nombre_cliente: clienteData.nombre,
            cedula: clienteData.cedula,
            telefono: clienteData.telefono,
            email: clienteData.email,
            direccion: clienteData.direccion,

            nombre_mascota: pacienteData.nombre || '',
            especie: pacienteData.especie || '',
            raza: pacienteData.raza || '',
            sexo: sexoDbToFrontend(pacienteData.sexo),
            fecha_nacimiento: pacienteData.fecha_nacimiento ? new Date(pacienteData.fecha_nacimiento) : null,
            peso: pacienteData.peso || '',
            esterilizado: pacienteData.esterilizado || false,
            color: pacienteData.color || '',
            microchip: pacienteData.microchip || '',
            notas: pacienteData.notas || ''
          };

          // Cargar foto actual si existe
          if (pacienteData.foto_url) {
            this.currentPhotoUrl.set(pacienteData.foto_url);
          }

          // Datos preparados para el formulario

          // Resetear y aplicar valores
          this.pacienteForm.reset();
          this.pacienteForm.patchValue(formData);

          // Marcar campos como touched para labels de Material Design
          this.markAllFieldsAsTouched();

          this.loading.set(false);
        }).catch(error => {
          console.error('Error cargando datos para edición:', error);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error cargando paciente para editar:', error);
        this.loading.set(false);
        this.snackBar.open('Error al cargar los datos del paciente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadClientes(): void {
    this.pacientesService.getClientes(1, 50).subscribe({
      next: (response) => {
        this.filteredClientes.set(response.data.clients);
      },
      error: (error) => {
        console.error('Error cargando clientes:', error);
        // Fallback a datos mock
        this.filteredClientes.set(this.mockClientes);
      }
    });
  }

  private searchClientes(searchTerm: string): void {
    if (!searchTerm || searchTerm.length < 2) {
      this.loadClientes();
      return;
    }

    this.pacientesService.getClientes(1, 20, searchTerm).subscribe({
      next: (response) => {
        this.filteredClientes.set(response.data.clients);
      },
      error: (error) => {
        console.error('Error buscando clientes:', error);
      }
    });
  }

  onEspecieChange(event: any): void {
    const especie = event.value;
    this.updateRazas(especie);
    // Limpiar raza seleccionada cuando cambia la especie
    this.pacienteForm.patchValue({ raza: '' });
  }

  private updateRazas(especie: string): void {
    this.loadRazasData(especie);
  }

  private loadEspeciesData(): Promise<void> {
    return new Promise((resolve) => {
      this.pacientesService.getEspecies().subscribe({
        next: (response: any) => {
          const processed = processBackendResponse<string[]>(response);
          if (processed.success && Array.isArray(processed.data)) {
            this.especies.set(processed.data);
          } else {
            console.warn('No se pudieron cargar especies, usando valores por defecto');
          }
          resolve();
        },
        error: (error) => {
          console.error('Error cargando especies:', error);
          resolve();
        }
      });
    });
  }

  private loadRazasData(especie: string): Promise<void> {
    return new Promise((resolve) => {
      this.pacientesService.getRazasByEspecie(especie).subscribe({
        next: (response: any) => {
          const processed = processBackendResponse<string[]>(response);
          let razasArray: string[] = [];

          if (processed.success && Array.isArray(processed.data)) {
            razasArray = processed.data;
          }

          // Asegurar que siempre haya al menos una opción
          if (razasArray.length === 0) {
            razasArray = ['Mestizo', 'Otro'];
          }

          this.razasDisponibles.set(razasArray);
          resolve();
        },
        error: (error) => {
          console.error('Error cargando razas:', error);
          this.razasDisponibles.set(['Mestizo', 'Otro']);
          resolve();
        }
      });
    });
  }

  onClienteSelected(event: any): void {
    const cliente: Cliente = event.option.value;
    this.clienteSeleccionado.set(cliente);

    // Llenar formulario con datos del cliente
    this.pacienteForm.patchValue({
      nombre_cliente: cliente.nombre,
      cedula: cliente.cedula || '',
      telefono: cliente.telefono,
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });

    this.clienteSearchControl.setValue(cliente.nombre);
  }

  clearSelectedCliente(): void {
    this.clienteSeleccionado.set(null);
    this.clienteSearchControl.setValue('');

    // Limpiar campos del cliente
    this.pacienteForm.patchValue({
      nombre_cliente: '',
      cedula: '',
      telefono: '',
      email: '',
      direccion: ''
    });
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? cliente.nombre : '';
  }

  onSubmit(): void {
    if (this.pacienteForm.valid) {
      this.loading.set(true);

      let formData: PacienteFormData;

      // Si hay un cliente seleccionado, usar el ID del cliente existente
      if (this.clienteSeleccionado() && !this.isEditing()) {

        // Preparar datos de la mascota, filtrando campos vacíos
        const mascotaData: any = {
          id_cliente_existente: this.clienteSeleccionado()!.id_cliente,
          nombre_mascota: this.pacienteForm.value.nombre_mascota,
          especie: this.pacienteForm.value.especie,
          sexo: sexoFrontendToDb(this.pacienteForm.value.sexo)
        };

        // Solo agregar campos opcionales si tienen valores
        if (this.pacienteForm.value.raza && this.pacienteForm.value.raza.trim()) {
          mascotaData.raza = this.pacienteForm.value.raza;
        }

        if (this.pacienteForm.value.fecha_nacimiento) {
          mascotaData.fecha_nacimiento = this.pacienteForm.value.fecha_nacimiento;
        }

        if (this.pacienteForm.value.peso && this.pacienteForm.value.peso !== '') {
          mascotaData.peso = parseFloat(this.pacienteForm.value.peso);
        }

        // Campo esterilizado (siempre se incluye ya que es booleano)
        mascotaData.esterilizado = this.pacienteForm.value.esterilizado || false;

        if (this.pacienteForm.value.color && this.pacienteForm.value.color.trim()) {
          mascotaData.color = this.pacienteForm.value.color;
        }

        if (this.pacienteForm.value.microchip && this.pacienteForm.value.microchip.trim()) {
          mascotaData.microchip = this.pacienteForm.value.microchip;
        }

        if (this.pacienteForm.value.notas && this.pacienteForm.value.notas.trim()) {
          mascotaData.notas = this.pacienteForm.value.notas;
        }

        formData = mascotaData as PacienteFormData;
      } else {
        // Cliente nuevo, usar todos los datos del formulario pero filtrar campos vacíos
        const rawFormData = this.pacienteForm.value;

        formData = {
          // Datos del cliente (siempre requeridos para cliente nuevo)
          nombre_cliente: rawFormData.nombre_cliente,
          telefono: rawFormData.telefono,
          // Solo agregar campos opcionales del cliente si tienen valores
          ...(rawFormData.cedula && rawFormData.cedula.trim() && { cedula: rawFormData.cedula }),
          ...(rawFormData.email && rawFormData.email.trim() && { email: rawFormData.email }),
          ...(rawFormData.direccion && rawFormData.direccion.trim() && { direccion: rawFormData.direccion }),

          // Datos de la mascota (requeridos)
          nombre_mascota: rawFormData.nombre_mascota,
          especie: rawFormData.especie,
          sexo: sexoFrontendToDb(rawFormData.sexo),

          // Solo agregar campos opcionales de la mascota si tienen valores
          ...(rawFormData.raza && rawFormData.raza.trim() && { raza: rawFormData.raza }),
          ...(rawFormData.fecha_nacimiento && { fecha_nacimiento: rawFormData.fecha_nacimiento }),
          ...(rawFormData.peso && rawFormData.peso !== '' && { peso: parseFloat(rawFormData.peso) }),
          // Campo esterilizado (siempre se incluye ya que es booleano)
          esterilizado: rawFormData.esterilizado || false,
          ...(rawFormData.color && rawFormData.color.trim() && { color: rawFormData.color }),
          ...(rawFormData.microchip && rawFormData.microchip.trim() && { microchip: rawFormData.microchip }),
          ...(rawFormData.notas && rawFormData.notas.trim() && { notas: rawFormData.notas })
        };
      }

      if (this.isEditing()) {
        // Actualizar paciente existente
        this.pacientesService.updatePacienteCompleto(this.pacienteId!, formData).subscribe({
          next: async (response: CreatePacienteResponse) => {
            try {
              // Si hay una foto seleccionada, subirla
              if (this.selectedFile()) {
                await this.uploadPhotoIfSelected(this.pacienteId!);
              }

              this.loading.set(false);
              this.snackBar.open(
                `${formData.nombre_mascota} ha sido actualizado correctamente`,
                'Cerrar',
                { duration: 3000, panelClass: ['success-snackbar'] }
              );
              this.router.navigate(['/pacientes', this.pacienteId]);
            } catch (photoError) {
              this.loading.set(false);
              // El paciente se actualizó pero la foto falló
              this.snackBar.open(
                'Paciente actualizado, pero hubo un error al subir la foto',
                'Cerrar',
                { duration: 5000 }
              );
              this.router.navigate(['/pacientes', this.pacienteId]);
            }
          },
          error: (error) => {
            this.loading.set(false);
            console.error('Error actualizando paciente:', error);

            let mensaje = 'Error al actualizar el paciente';
            if (error.status === 404) {
              mensaje = 'El paciente no fue encontrado';
            } else if (error.status === 409) {
              mensaje = 'Ya existe un cliente con esa cédula';
            }

            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          }
        });
      } else {
        // Crear nuevo paciente
        this.pacientesService.createPacienteCompleto(formData).subscribe({
          next: async (response: CreatePacienteResponse) => {
            try {
              // Obtener el ID de la mascota creada
              const mascotaId = response.data?.mascota?.id_mascota;

              // Si hay una foto seleccionada y tenemos el ID, subirla
              if (this.selectedFile() && mascotaId) {
                await this.uploadPhotoIfSelected(mascotaId);
              }

              this.loading.set(false);
              this.snackBar.open(
                `${formData.nombre_mascota} ha sido registrado correctamente`,
                'Cerrar',
                { duration: 3000, panelClass: ['success-snackbar'] }
              );
              this.router.navigate(['/pacientes']);
            } catch (photoError) {
              this.loading.set(false);
              // El paciente se creó pero la foto falló
              this.snackBar.open(
                'Paciente registrado, pero hubo un error al subir la foto',
                'Cerrar',
                { duration: 5000 }
              );
              this.router.navigate(['/pacientes']);
            }
          },
          error: (error) => {
            this.loading.set(false);
            console.error('Error guardando paciente:', error);

            let mensaje = 'Error al registrar el paciente';
            if (error.status === 409) {
              mensaje = 'Ya existe un cliente con esa cédula';
            } else if (error.status === 400) {
              mensaje = 'Datos inválidos. Verifica que todos los campos requeridos estén completos.';
              if (error.error?.message) {
                mensaje = error.error.message;
              }
            }

            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          }
        });
      }
    } else {
      // Formulario inválido - marcar campos como tocados para mostrar errores
      this.markFormGroupTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
    }
  }

  private markFormGroupTouched(): void {
    this.markAllFieldsAsTouched();
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.pacienteForm.controls).forEach(key => {
      const control = this.pacienteForm.get(key);
      if (control) {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    });
    this.pacienteForm.updateValueAndValidity();
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.pacienteForm.controls).forEach(key => {
      const control = this.pacienteForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  goBack(): void {
    this.router.navigate(['/pacientes']);
  }

  // Funciones para manejo de fotos
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Solo se permiten archivos de imagen', 'Cerrar', { duration: 3000 });
        return;
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('El archivo es demasiado grande. Máximo 5MB permitido.', 'Cerrar', { duration: 3000 });
        return;
      }

      this.selectedFile.set(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhoto.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhoto.set(null);
    this.selectedFile.set(null);
    this.currentPhotoUrl.set(null);
  }

  // Funciones de utilidad para imágenes
  getImageUrl(fotoUrl: string): string {
    if (fotoUrl.startsWith('http')) {
      return fotoUrl;
    }
    // Para rutas de uploads, usar backendUrl en lugar de apiUrl
    return `${environment.backendUrl}${fotoUrl}`;
  }

  onImageError(event: any): void {
    // Ocultar la imagen rota y mostrar solo el ícono de respaldo
    event.target.style.display = 'none';
  }

  private uploadPhotoIfSelected(mascotaId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = this.selectedFile();
      if (!file) {
        resolve();
        return;
      }

      this.pacientesService.uploadFotoPaciente(mascotaId, file).subscribe({
        next: (response) => {
          console.log('Foto subida exitosamente:', response);
          this.currentPhotoUrl.set(response.data?.foto_url);
          this.selectedPhoto.set(null);
          this.selectedFile.set(null);
          resolve();
        },
        error: (error) => {
          console.error('Error subiendo foto:', error);
          this.snackBar.open('Error al subir la foto del paciente', 'Cerrar', { duration: 3000 });
          reject(error);
        }
      });
    });
  }
}
