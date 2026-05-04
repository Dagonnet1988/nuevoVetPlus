import { Component, OnInit, Input, Output, EventEmitter, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { of } from 'rxjs';
import { map, debounceTime, catchError } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { Router, ActivatedRoute } from '@angular/router';

import {
  UsuariosService,
  Usuario,
  CreateUsuarioRequest,
  UpdateUsuarioRequest
} from '../../../services/usuarios.service';

@Component({
  selector: 'app-usuario-form',
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
    MatCheckboxModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatStepperModule
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.css'
})
export class UsuarioFormComponent implements OnInit {
  @Input() usuarioId?: string;
  @Output() usuarioGuardado = new EventEmitter<Usuario>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('stepper') stepper!: MatStepper;

  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals
  loading = signal(false);
  saving = signal(false);
  usuario = signal<Usuario | null>(null);
  currentStep = signal(0);
  isEditMode = computed(() => !!this.usuarioId);
  isNewUser = computed(() => !this.usuarioId);

  // Forms
  personalForm: FormGroup;
  configuracionForm: FormGroup;
  seguridadForm: FormGroup;

  // Opciones
  tiposDocumento = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PP', label: 'Pasaporte' }
  ];

  roles = [
    { value: 'admin', label: 'Administrador', icon: 'admin_panel_settings', color: '#f44336' },
    { value: 'vet', label: 'Veterinario', icon: 'medical_services', color: '#2196f3' },
    { value: 'aux', label: 'Auxiliar', icon: 'support_agent', color: '#4caf50' }
  ];

  constructor() {
    this.personalForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email], [this.emailAsyncValidator.bind(this)]],
      telefono: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/)]],
      direccion: ['', [Validators.maxLength(200)]],
      documento: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)], [this.documentoAsyncValidator.bind(this)]],
      tipo_documento: ['CC', [Validators.required]]
    });

    this.configuracionForm = this.fb.group({
      rol: ['vet', [Validators.required]],
      especialidad: [''],
      numero_licencia: [''],
      activo: [true]
    });

    this.seguridadForm = this.fb.group({
      password_temporal: [''],
      enviar_credenciales: [true],
      forzar_cambio_password: [true]
    });

    // Validaciones condicionales
    this.setupConditionalValidators();
  }

  ngOnInit(): void {
    // Obtener ID de la ruta si no se pasó como input
    if (!this.usuarioId) {
      this.usuarioId = this.route.snapshot.paramMap.get('id') || undefined;
    }

    if (this.isEditMode()) {
      this.loadUsuario();
    } else {
      this.generateTemporalPassword();
    }
  }

  private setupConditionalValidators(): void {
    // Validar especialidad si es veterinario
    this.configuracionForm.get('rol')?.valueChanges.subscribe(rol => {
      const especialidadControl = this.configuracionForm.get('especialidad');
      const numeroLicenciaControl = this.configuracionForm.get('numero_licencia');

      if (rol === 'vet') {
        especialidadControl?.setValidators([Validators.required]);
        numeroLicenciaControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(20)]);
      } else {
        especialidadControl?.clearValidators();
        numeroLicenciaControl?.clearValidators();
        especialidadControl?.setValue('');
        numeroLicenciaControl?.setValue('');
      }

      especialidadControl?.updateValueAndValidity();
      numeroLicenciaControl?.updateValueAndValidity();
    });

    // Generar password temporal si es nuevo usuario
    this.seguridadForm.get('enviar_credenciales')?.valueChanges.subscribe(enviar => {
      if (enviar && this.isNewUser()) {
        this.generateTemporalPassword();
      }
    });
  }

  onStepChange(event: any): void {
    this.currentStep.set(event.selectedIndex);
  }

  private loadUsuario(): void {
    if (!this.usuarioId) return;

    this.loading.set(true);
    this.usuariosService.getUsuario(this.usuarioId).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.populateForm(usuario);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.snackBar.open('Error cargando usuario', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/usuarios']);
      }
    });
  }

  private populateForm(usuario: Usuario): void {
    // Datos personales
    this.personalForm.patchValue({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || '',
      documento: usuario.documento,
      tipo_documento: usuario.tipo_documento
    });

    // Configuración
    this.configuracionForm.patchValue({
      rol: usuario.rol,
      especialidad: usuario.especialidad || '',
      numero_licencia: usuario.numero_licencia || '',
      activo: usuario.activo
    });

    // Limpiar validadores async para edición
    this.personalForm.get('email')?.clearAsyncValidators();
    this.personalForm.get('documento')?.clearAsyncValidators();
    this.personalForm.get('email')?.updateValueAndValidity();
    this.personalForm.get('documento')?.updateValueAndValidity();
  }

  generateTemporalPassword(): void {
    const password = this.usuariosService.generarPasswordString();
    this.seguridadForm.patchValue({ password_temporal: password });
  }

  // Validadores async
  private emailAsyncValidator(control: AbstractControl) {
    if (!control.value || this.isEditMode()) {
          return of(null);
    }

    return this.usuariosService.validarEmail(control.value, this.usuarioId).pipe(
      debounceTime(500), // Esperar 500ms antes de hacer la petición
      map(disponible => disponible ? null : { emailTaken: true }),
      catchError(() => of(null)) // Si hay error, no bloquear el formulario
    );
  }

  private documentoAsyncValidator(control: AbstractControl) {
    if (!control.value || this.isEditMode()) {
          return of(null);
    }

    return this.usuariosService.validarDocumento(control.value, this.usuarioId).pipe(
      debounceTime(500), // Esperar 500ms antes de hacer la petición
      map(disponible => disponible ? null : { documentoTaken: true }),
      catchError(() => of(null)) // Si hay error, no bloquear el formulario
    );
  }

  // Acciones del formulario
  onSubmit(): void {
    if (this.isFormValid()) {
      this.saving.set(true);

      if (this.isEditMode()) {
        this.updateUsuario();
      } else {
        this.createUsuario();
      }
    } else {
      this.markAllFieldsAsTouched();
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
    }
  }

  private createUsuario(): void {
    const request: CreateUsuarioRequest = {
      ...this.personalForm.value,
      ...this.configuracionForm.value,
      ...this.seguridadForm.value
    };

    this.usuariosService.createUsuario(request).subscribe({
      next: (usuario) => {
        this.snackBar.open('Usuario creado exitosamente', 'Cerrar', { duration: 3000 });
        this.usuarioGuardado.emit(usuario);
        this.router.navigate(['/usuarios', usuario.id_usuario]);
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error creando usuario:', error);
        this.snackBar.open('Error creando usuario', 'Cerrar', { duration: 3000 });
        this.saving.set(false);
      }
    });
  }

  private updateUsuario(): void {
    if (!this.usuarioId) return;

    const request: UpdateUsuarioRequest = {
      ...this.personalForm.value,
      ...this.configuracionForm.value
    };

    this.usuariosService.updateUsuario(this.usuarioId, request).subscribe({
      next: (usuario) => {
        this.snackBar.open('Usuario actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.usuarioGuardado.emit(usuario);
        this.router.navigate(['/usuarios', usuario.id_usuario]);
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error actualizando usuario:', error);
        this.snackBar.open('Error actualizando usuario', 'Cerrar', { duration: 3000 });
        this.saving.set(false);
      }
    });
  }

  onCancelar(): void {
    if (this.hasUnsavedChanges()) {
      if (confirm('¿Estás seguro de que quieres cancelar? Se perderán los cambios no guardados.')) {
        this.cancelar.emit();
        this.router.navigate(['/usuarios']);
      }
    } else {
      this.cancelar.emit();
      this.router.navigate(['/usuarios']);
    }
  }

  // Validaciones y utilidades
  isFormValid(): boolean {
    const formsValid = this.personalForm.valid &&
                      this.configuracionForm.valid &&
                      (this.isEditMode() || this.seguridadForm.valid);

    // Para crear usuarios, debe estar en el paso 3 (índice 2) y todos los forms válidos
    if (this.isNewUser()) {
      return formsValid && this.currentStep() === 2;
    }

    // Para editar, solo necesita que los forms sean válidos
    return formsValid;
  }

  isCreateButtonEnabled(): boolean {
    return this.isFormValid() && !this.saving() && !this.loading();
  }

  private markAllFieldsAsTouched(): void {
    this.personalForm.markAllAsTouched();
    this.configuracionForm.markAllAsTouched();
    if (this.isNewUser()) {
      this.seguridadForm.markAllAsTouched();
    }
  }

  private hasUnsavedChanges(): boolean {
    return this.personalForm.dirty ||
           this.configuracionForm.dirty ||
           this.seguridadForm.dirty;
  }

  // Getters para errores
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    const errors = field.errors;

    if (errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
    if (errors['email']) return 'Email inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) return `${this.getFieldLabel(fieldName)} inválido`;
    if (errors['emailTaken']) return 'Este email ya está en uso';
    if (errors['documentoTaken']) return 'Este documento ya está registrado';

    return 'Campo inválido';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      nombre: 'Nombre',
      apellido: 'Apellido',
      email: 'Email',
      telefono: 'Teléfono',
      direccion: 'Dirección',
      documento: 'Documento',
      tipo_documento: 'Tipo de documento',
      rol: 'Rol',
      especialidad: 'Especialidad',
      numero_licencia: 'Número de licencia',
      password_temporal: 'Contraseña temporal'
    };
    return labels[fieldName] || fieldName;
  }

  // Getters para el template
  get isVeterinario(): boolean {
    return this.configuracionForm.get('rol')?.value === 'vet';
  }

  get rolSeleccionado() {
    const rolValue = this.configuracionForm.get('rol')?.value;
    return this.roles.find(rol => rol.value === rolValue);
  }
}
