import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { ConfiguracionService, EmpresaConfig, HorarioAtencion, DiaEspecial } from '../../../services/configuracion.service';

@Component({
  selector: 'app-empresa-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    FormsModule
  ],
  template: `
    <div class="empresa-config-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="page-title">
                <mat-icon class="page-icon">business</mat-icon>
                Configuración de Empresa
              </h1>
              <p class="page-subtitle">Información general de la clínica veterinaria</p>
            </div>
          </div>
          
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="saveConfiguration()" [disabled]="loading() || empresaForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>save</mat-icon>
              }
              Guardar
            </button>
          </div>
        </div>
      </div>

      <!-- Formulario en tabs -->
      <mat-card class="config-card">
        <mat-tab-group>
          <!-- Tab 1: Información General -->
          <mat-tab label="Información General">
            <div class="tab-content">
              <form [formGroup]="empresaForm" class="empresa-form">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Nombre de la Empresa</mat-label>
                    <input matInput formControlName="nombre" placeholder="Clínica Veterinaria...">
                    <mat-icon matSuffix>business</mat-icon>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>NIT</mat-label>
                    <input matInput formControlName="nit" placeholder="123456789-1">
                    <mat-icon matSuffix>receipt_long</mat-icon>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="form-field-full">
                  <mat-label>Dirección</mat-label>
                  <input matInput formControlName="direccion" placeholder="Calle 123 # 45-67, Ciudad">
                  <mat-icon matSuffix>location_on</mat-icon>
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="telefono" placeholder="+57 300 123 4567">
                    <mat-icon matSuffix>phone</mat-icon>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="email" type="email" placeholder="contacto@clinica.com">
                    <mat-icon matSuffix>email</mat-icon>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Sitio Web</mat-label>
                    <input matInput formControlName="sitio_web" placeholder="https://www.clinica.com">
                    <mat-icon matSuffix>language</mat-icon>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Eslogan</mat-label>
                    <input matInput formControlName="eslogan" placeholder="Cuidamos a tu mascota">
                    <mat-icon matSuffix>format_quote</mat-icon>
                  </mat-form-field>
                </div>

                <!-- Logo -->
                <div class="logo-section">
                  <h3>Logo de la Empresa</h3>
                  @if (empresaConfig()?.logo_url) {
                    <div class="current-logo">
                      <img [src]="empresaConfig()?.logo_url" alt="Logo actual" class="logo-preview">
                      <button mat-button color="warn" (click)="removeLogo()">
                        <mat-icon>delete</mat-icon>
                        Eliminar Logo
                      </button>
                    </div>
                  }
                  
                  <div class="logo-upload">
                    <input type="file" #fileInput (change)="onLogoSelected($event)" accept="image/*" style="display: none;">
                    <button mat-raised-button color="accent" (click)="fileInput.click()">
                      <mat-icon>cloud_upload</mat-icon>
                      {{ empresaConfig()?.logo_url ? 'Cambiar Logo' : 'Subir Logo' }}
                    </button>
                    <p class="help-text">Formatos: JPG, PNG. Tamaño máximo: 2MB</p>
                  </div>
                </div>
              </form>
            </div>
          </mat-tab>

          <!-- Tab 2: Horarios de Atención -->
          <mat-tab label="Horarios">
            <div class="tab-content">
              <h3>Horarios de Atención</h3>
              <div class="horarios-section">
                @for (horario of horarios(); track horario.dia_semana) {
                  <div class="horario-row">
                    <div class="dia-info">
                      <mat-checkbox 
                        [(ngModel)]="horario.activo" 
                        (change)="updateHorario(horario.dia_semana, horario)">
                        {{ getDayName(horario.dia_semana) }}
                      </mat-checkbox>
                    </div>
                    
                    @if (horario.activo) {
                      <div class="horario-inputs">
                        <mat-form-field appearance="outline" class="time-field">
                          <mat-label>Apertura</mat-label>
                          <input matInput type="time" [(ngModel)]="horario.hora_inicio" 
                                 (change)="updateHorario(horario.dia_semana, horario)">
                        </mat-form-field>
                        
                        <mat-form-field appearance="outline" class="time-field">
                          <mat-label>Cierre</mat-label>
                          <input matInput type="time" [(ngModel)]="horario.hora_fin"
                                 (change)="updateHorario(horario.dia_semana, horario)">
                        </mat-form-field>
                        
                        <mat-form-field appearance="outline" class="time-field">
                          <mat-label>Almuerzo Inicio</mat-label>
                          <input matInput type="time" [(ngModel)]="horario.hora_almuerzo_inicio"
                                 (change)="updateHorario(horario.dia_semana, horario)">
                        </mat-form-field>
                        
                        <mat-form-field appearance="outline" class="time-field">
                          <mat-label>Almuerzo Fin</mat-label>
                          <input matInput type="time" [(ngModel)]="horario.hora_almuerzo_fin"
                                 (change)="updateHorario(horario.dia_semana, horario)">
                        </mat-form-field>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </mat-tab>

          <!-- Tab 3: Configuración General -->
          <mat-tab label="Configuración">
            <div class="tab-content">
              <form [formGroup]="configForm" class="config-form">
                <h3>Configuración Regional</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Moneda</mat-label>
                    <mat-select formControlName="moneda">
                      <mat-option value="COP">Peso Colombiano (COP)</mat-option>
                      <mat-option value="USD">Dólar Americano (USD)</mat-option>
                      <mat-option value="EUR">Euro (EUR)</mat-option>
                    </mat-select>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Zona Horaria</mat-label>
                    <mat-select formControlName="zona_horaria">
                      <mat-option value="America/Bogota">América/Bogotá</mat-option>
                      <mat-option value="America/New_York">América/Nueva York</mat-option>
                      <mat-option value="Europe/Madrid">Europa/Madrid</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Idioma</mat-label>
                    <mat-select formControlName="idioma">
                      <mat-option value="es">Español</mat-option>
                      <mat-option value="en">Inglés</mat-option>
                      <mat-option value="fr">Francés</mat-option>
                    </mat-select>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Formato de Fecha</mat-label>
                    <mat-select formControlName="formato_fecha">
                      <mat-option value="DD/MM/YYYY">DD/MM/YYYY</mat-option>
                      <mat-option value="MM/DD/YYYY">MM/DD/YYYY</mat-option>
                      <mat-option value="YYYY-MM-DD">YYYY-MM-DD</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <h3>Numeración de Documentos</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Prefijo Facturas</mat-label>
                    <input matInput formControlName="factura_prefijo" placeholder="FAC">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Siguiente Número</mat-label>
                    <input matInput type="number" formControlName="factura_siguiente" placeholder="1">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Dígitos</mat-label>
                    <input matInput type="number" formControlName="factura_digitos" placeholder="6">
                  </mat-form-field>
                </div>
              </form>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .empresa-config-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 500;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .back-button {
      margin-right: 8px;
    }

    .config-card {
      margin-bottom: 24px;
    }

    .tab-content {
      padding: 24px;
    }

    .empresa-form, .config-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-field {
      flex: 1;
      min-width: 250px;
    }

    .form-field-full {
      width: 100%;
    }

    .logo-section {
      margin-top: 24px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .current-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .logo-preview {
      max-width: 100px;
      max-height: 100px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }

    .logo-upload {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .help-text {
      font-size: 12px;
      color: #666;
      margin: 0;
    }

    .horarios-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .horario-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .dia-info {
      min-width: 120px;
    }

    .horario-inputs {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      flex: 1;
    }

    .time-field {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }
      
      .horario-inputs {
        flex-direction: column;
        width: 100%;
      }
      
      .time-field {
        min-width: unset;
      }
    }
  `]
})
export class EmpresaConfigComponent implements OnInit {
  loading = signal(false);
  empresaConfig = signal<any>(null);
  horarios = signal<HorarioAtencion[]>([]);

  empresaForm: FormGroup;
  configForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.empresaForm = this.createEmpresaForm();
    this.configForm = this.createConfigForm();
  }

  ngOnInit(): void {
    this.empresaConfig.set(this.configuracionService.empresaConfig());
    this.loadConfiguration();
  }

  private createEmpresaForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nit: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      sitio_web: [''],
      eslogan: ['']
    });
  }

  private createConfigForm(): FormGroup {
    return this.fb.group({
      moneda: ['COP', Validators.required],
      zona_horaria: ['America/Bogota', Validators.required],
      idioma: ['es', Validators.required],
      formato_fecha: ['DD/MM/YYYY', Validators.required],
      formato_hora: ['HH:mm', Validators.required],
      factura_prefijo: ['FAC', Validators.required],
      factura_siguiente: [1, [Validators.required, Validators.min(1)]],
      factura_digitos: [6, [Validators.required, Validators.min(3)]]
    });
  }

  private loadConfiguration(): void {
    this.loading.set(true);
    
    this.configuracionService.getEmpresaConfig().subscribe({
      next: (config) => {
        this.populateForm(config);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
        this.initializeDefaults();
        this.loading.set(false);
      }
    });
  }

  private populateForm(config: EmpresaConfig): void {
    // Llenar formulario de empresa
    this.empresaForm.patchValue({
      nombre: config.nombre,
      nit: config.nit,
      direccion: config.direccion,
      telefono: config.telefono,
      email: config.email,
      sitio_web: config.sitio_web,
      eslogan: config.eslogan
    });

    // Llenar configuración general
    if (config.configuracion_general) {
      this.configForm.patchValue(config.configuracion_general);
    }

    // Llenar numeración
    if (config.configuracion_numeracion) {
      this.configForm.patchValue(config.configuracion_numeracion);
    }

    // Cargar horarios
    this.horarios.set(config.horarios || this.configuracionService.generateDefaultHorarios());
  }

  private initializeDefaults(): void {
    this.horarios.set(this.configuracionService.generateDefaultHorarios());
  }

  saveConfiguration(): void {
    if (this.empresaForm.invalid || this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);

    const empresaConfig: EmpresaConfig = {
      ...this.empresaForm.value,
      horarios: this.horarios(),
      configuracion_general: {
        moneda: this.configForm.value.moneda,
        zona_horaria: this.configForm.value.zona_horaria,
        idioma: this.configForm.value.idioma,
        formato_fecha: this.configForm.value.formato_fecha,
        formato_hora: this.configForm.value.formato_hora
      },
      configuracion_numeracion: {
        factura_prefijo: this.configForm.value.factura_prefijo,
        factura_siguiente: this.configForm.value.factura_siguiente,
        factura_digitos: this.configForm.value.factura_digitos,
        cita_prefijo: 'CIT',
        cita_siguiente: 1,
        cita_digitos: 6
      }
    };

    this.configuracionService.updateEmpresaConfig(empresaConfig).subscribe({
      next: () => {
        this.snackBar.open('Configuración guardada exitosamente', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error guardando configuración:', error);
        this.snackBar.open('Error guardando configuración', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.snackBar.open('El archivo es muy grande. Máximo 2MB', 'Cerrar', { duration: 3000 });
        return;
      }

      this.loading.set(true);
      this.configuracionService.uploadLogo(file).subscribe({
        next: (logoUrl) => {
          this.snackBar.open('Logo subido exitosamente', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error subiendo logo:', error);
          this.snackBar.open('Error subiendo logo', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
        }
      });
    }
  }

  removeLogo(): void {
    // Implementar eliminación de logo si el backend lo soporta
    this.snackBar.open('Funcionalidad pendiente de implementar', 'Cerrar', { duration: 3000 });
  }

  updateHorario(dia: number, horario: HorarioAtencion): void {
    const horarios = this.horarios();
    const index = horarios.findIndex(h => h.dia_semana === dia);
    if (index >= 0) {
      horarios[index] = { ...horario };
      this.horarios.set([...horarios]);
    }
  }

  getDayName(dayIndex: number): string {
    return this.configuracionService.getDayName(dayIndex);
  }

  goBack(): void {
    this.router.navigate(['/configuracion']);
  }
}