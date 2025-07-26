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

import { PacientesService } from '../services/pacientes.service';
import { Cliente, Mascota, PacienteFormData } from '../models/paciente.interface';

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
                  @for (cliente of filteredClientes(); track cliente.id_cliente) {
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
                    @for (especie of especies(); track especie) {
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
                    @for (raza of razasDisponibles(); track raza) {
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

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notas adicionales</mat-label>
                <textarea matInput formControlName="notas" rows="3"></textarea>
              </mat-form-field>
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
    }
  `]
})
export class PacienteFormComponent implements OnInit {
  // Signals para estado reactivo
  loading = signal(false);
  isEditing = signal(false);
  clienteSeleccionado = signal<Cliente | null>(null);
  especies = signal<string[]>([]);
  razasDisponibles = signal<string[]>([]);
  filteredClientes = signal<Cliente[]>([]);

  // Formularios
  pacienteForm: FormGroup;
  clienteSearchControl: any;
  
  // Datos
  pacienteId?: string;
  mockClientes: Cliente[] = [
    {
      id_cliente: '1',
      nombre: 'Carlos Rodríguez',
      telefono: '+57 301 234 5678',
      email: 'carlos@email.com',
      direccion: 'Calle 123 #45-67',
      cedula: '12345678',
      activo: true
    },
    {
      id_cliente: '2',
      nombre: 'María García',
      telefono: '+57 312 987 6543',
      email: 'maria@email.com',
      direccion: 'Carrera 45 #12-34',
      cedula: '87654321',
      activo: true
    }
  ];

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
    // Cargar especies
    this.especies.set(this.pacientesService.getMockEspecies());
    
    // Cargar clientes para búsqueda
    this.filteredClientes.set(this.mockClientes);
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
    // TODO: Implementar carga real del backend
    console.log('Cargando paciente para editar:', id);
  }

  private searchClientes(searchTerm: string): void {
    if (!searchTerm || searchTerm.length < 2) {
      this.filteredClientes.set(this.mockClientes);
      return;
    }

    const filtered = this.mockClientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefono.includes(searchTerm) ||
      cliente.cedula?.includes(searchTerm) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    this.filteredClientes.set(filtered);
  }

  onEspecieChange(event: any): void {
    const especie = event.value;
    this.updateRazas(especie);
    // Limpiar raza seleccionada cuando cambia la especie
    this.pacienteForm.patchValue({ raza: '' });
  }

  private updateRazas(especie: string): void {
    const razas = this.pacientesService.getMockRazas(especie);
    this.razasDisponibles.set(razas);
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

      const formData: PacienteFormData = this.pacienteForm.value;
      
      // Simular guardado
      setTimeout(() => {
        this.loading.set(false);
        
        const mensaje = this.isEditing() 
          ? `${formData.nombre_mascota} ha sido actualizado correctamente`
          : `${formData.nombre_mascota} ha sido registrado correctamente`;
          
        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        this.router.navigate(['/pacientes']);
      }, 2000);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.pacienteForm.controls).forEach(key => {
      this.pacienteForm.get(key)?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/pacientes']);
  }
}