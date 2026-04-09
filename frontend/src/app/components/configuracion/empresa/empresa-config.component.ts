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
  templateUrl: './empresa-config.component.html',
  styleUrl: './empresa-config.component.css'
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
      formato_hora: ['HH:mm', Validators.required]
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
    console.log('Configuración recibida:', config);

    // Llenar formulario de empresa
    this.empresaForm.patchValue({
      nombre: config.nombre_empresa,
      nit: config.nit,
      direccion: config.direccion,
      telefono: config.telefono,
      email: config.email,
      sitio_web: config.sitio_web || '',
      eslogan: config.eslogan || ''
    });

    // Llenar configuración general
    if (config.configuracion_general) {
      const configGeneral = typeof config.configuracion_general === 'string'
        ? JSON.parse(config.configuracion_general)
        : config.configuracion_general;
      this.configForm.patchValue(configGeneral);
    }

    // Llenar numeración
    if (config.configuracion_numeracion) {
      const configNumeracion = typeof config.configuracion_numeracion === 'string'
        ? JSON.parse(config.configuracion_numeracion)
        : config.configuracion_numeracion;
      this.configForm.patchValue(configNumeracion);
    }

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
    console.log('Horarios cargados:', horariosCargados);
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
      nombre_empresa: this.empresaForm.value.nombre,
      nit: this.empresaForm.value.nit,
      direccion: this.empresaForm.value.direccion,
      telefono: this.empresaForm.value.telefono,
      email: this.empresaForm.value.email,
      sitio_web: this.empresaForm.value.sitio_web,
      eslogan: this.empresaForm.value.eslogan,
      horarios: this.horarios(),
      configuracion_general: {
        moneda: this.configForm.value.moneda,
        zona_horaria: this.configForm.value.zona_horaria,
        idioma: this.configForm.value.idioma,
        formato_fecha: this.configForm.value.formato_fecha,
        formato_hora: this.configForm.value.formato_hora
      },
      configuracion_numeracion: {
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
      // Crear un nuevo array con el horario actualizado
      const nuevosHorarios = [...horarios];
      nuevosHorarios[index] = { ...horario };
      this.horarios.set(nuevosHorarios);
    }
  }

  getDayName(dayIndex: number): string {
    return this.configuracionService.getDayName(dayIndex);
  }

  goBack(): void {
    this.router.navigate(['/configuracion']);
  }
}
