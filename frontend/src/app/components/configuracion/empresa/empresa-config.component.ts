import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ConfiguracionService, EmpresaConfig, HorarioAtencion } from '../../../services/configuracion.service';

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
    MatProgressSpinnerModule,
  ],
  templateUrl: './empresa-config.component.html',
  styleUrl: './empresa-config.component.css'
})
export class EmpresaConfigComponent implements OnInit {
  loading = signal(false);
  empresaConfig = computed(() => this.configuracionService.empresaConfig());
  horarios = signal<HorarioAtencion[]>([]);
  private currentConfig = signal<EmpresaConfig | null>(null);
  private pendingLogoUrl = signal<string>('');

  empresaForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.empresaForm = this.createEmpresaForm();
  }

  ngOnInit(): void {
    this.loadConfiguration();
  }

  private createEmpresaForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nit: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      ciudad: [''],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      sitio_web: [''],
      eslogan: ['']
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
    this.currentConfig.set(config);
    this.pendingLogoUrl.set('');

    // Llenar formulario de empresa
    this.empresaForm.patchValue({
      nombre: config.nombre_empresa,
      nit: config.nit,
      direccion: config.direccion,
      ciudad: config.ciudad || '',
      telefono: config.telefono,
      email: config.email,
      sitio_web: config.sitio_web || '',
      eslogan: config.eslogan || ''
    });

    // Cargar horarios - asegurar que sean válidos
    let horariosCargados = config.horarios;
    if (!horariosCargados || !Array.isArray(horariosCargados) || horariosCargados.length !== 7) {
      horariosCargados = this.configuracionService.generateDefaultHorarios();
    }

    // Verificar que todos los horarios tengan dia_semana único
    const diasUnicos = new Set(horariosCargados.map(h => h.dia_semana));
    if (diasUnicos.size !== 7) {
      console.warn('Horarios con días duplicados, generando por defecto');
      horariosCargados = this.configuracionService.generateDefaultHorarios();
    }

    this.horarios.set(horariosCargados);
  }

  private initializeDefaults(): void {
    this.horarios.set(this.configuracionService.generateDefaultHorarios());
  }

  saveConfiguration(): void {
    if (this.empresaForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);

    const empresaConfig: EmpresaConfig = {
      nombre_empresa: this.empresaForm.value.nombre,
      nit: this.empresaForm.value.nit,
      direccion: this.empresaForm.value.direccion,
      ciudad: this.empresaForm.value.ciudad,
      telefono: this.empresaForm.value.telefono,
      email: this.empresaForm.value.email,
      sitio_web: this.empresaForm.value.sitio_web,
      eslogan: this.empresaForm.value.eslogan,
      horarios: this.horarios(),
      configuracion_general: this.currentConfig()?.configuracion_general || {
        moneda: 'COP',
        zona_horaria: 'America/Bogota',
        idioma: 'es',
        formato_fecha: 'DD/MM/YYYY',
        formato_hora: 'HH:mm'
      },
      configuracion_numeracion: this.currentConfig()?.configuracion_numeracion || {
        cita_prefijo: 'CIT',
        cita_siguiente: 1,
        cita_digitos: 6
      },
      logo_url: this.pendingLogoUrl() || this.empresaConfig()?.logo_url
    };

    this.configuracionService.updateEmpresaConfig(empresaConfig).subscribe({
      next: (updatedConfig) => {
        this.currentConfig.set(updatedConfig);
        this.pendingLogoUrl.set('');
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
      const allowedTypes = ['image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Formato no permitido. El logo debe ser PNG o JPG/JPEG.', 'Cerrar', { duration: 4000 });
        event.target.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.snackBar.open('El archivo es muy grande. Máximo 2MB', 'Cerrar', { duration: 3000 });
        return;
      }

      this.loading.set(true);
      this.configuracionService.uploadLogo(file).subscribe({
        next: (logoUrl) => {
          this.pendingLogoUrl.set(logoUrl);
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

  getLogoPreviewUrl(): string {
    return this.configuracionService.getAbsoluteAssetUrl(
      this.pendingLogoUrl() || this.empresaConfig()?.logo_url
    );
  }

  removeLogo(): void {
    // Implementar eliminación de logo si el backend lo soporta
    this.snackBar.open('Funcionalidad pendiente de implementar', 'Cerrar', { duration: 3000 });
  }

  goBack(): void {
    this.router.navigate(['/configuracion']);
  }
}
