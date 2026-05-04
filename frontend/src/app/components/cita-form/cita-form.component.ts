import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CitasService } from '../../services/citas.service';
import { PacientesService } from '../../services/pacientes.service';
import {
  Cita,
  CitaFormData,
  TIPOS_CITA,
  ESTADOS_CITA,
  SugerenciaHorario
} from '../../models/cita.interface';

const APPOINTMENT_DURATION_MINUTES = 60;

@Component({
  selector: 'app-cita-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './cita-form.component.html',
  styleUrl: './cita-form.component.css'
})
export class CitaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<CitaFormComponent>, { optional: true });
  private data = inject(MAT_DIALOG_DATA, { optional: true });

  // Signals
  loading = signal(false);
  saving = signal(false);
  isEditing = signal(false);
  horaFin = signal<string>('');
  sugerenciasHorario = signal<SugerenciaHorario[]>([]);
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  veterinarios = signal<any[]>([]);
  pacienteSeleccionado = signal<any | null>(null);

  // Form
  citaForm: FormGroup;

  // Constants
  tiposCita = TIPOS_CITA;
  estadosCita = ESTADOS_CITA;
  minDate = new Date();

  // Current cita for editing
  currentCita: Cita | null = null;

  constructor() {
    this.citaForm = this.fb.group({
      mascota_search: [''],
      id_mascota: ['', Validators.required],
      id_veterinario: ['', Validators.required],
      fecha: ['', Validators.required],
      hora_inicio: ['', Validators.required],
      duracion: [APPOINTMENT_DURATION_MINUTES],
      tipo: ['', Validators.required],
      estado: ['confirmada'],
      motivo: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    // Defer initial load to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadInitialData();
      this.checkIfEditing();
      this.setupFormChanges();
    });
  }

  private loadInitialData(): void {
    this.loading.set(true);

    Promise.all([
      this.loadPacientes(),
      this.loadVeterinarios()
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  private async loadPacientes(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.pacientesService.getMascotas(1, 1000));
      console.log('Respuesta pacientes en form:', response);

      // La respuesta puede tener diferentes estructuras
      let data: any[] = [];

      if (response?.data?.pacientes) {
        // Estructura: { success: true, data: { pacientes: [...], pagination: {...} } }
        data = response.data.pacientes;
      } else if (response?.pacientes) {
        // Estructura: { pacientes: [...], pagination: {...} }
        data = response.pacientes;
      } else if (Array.isArray(response?.data)) {
        // Estructura: { data: [...] }
        data = response.data;
      } else if (Array.isArray(response)) {
        // Estructura: [...]
        data = response;
      }

      // Verificar que data sea un array antes de asignarlo
      if (Array.isArray(data)) {
        const normalizados = data.map((p: any) => ({
          id: p.id_mascota || p.id,
          nombre: p.nombre || p.nombre_mascota || 'Sin nombre',
          especie: p.especie || 'Sin especie',
          raza: p.raza || 'Sin raza',
          propietario: p.cliente?.nombre || p.cliente_nombre || p.nombre_cliente || p.propietario || 'Sin propietario'
        })).filter((p: any) => Boolean(p.id));
        this.pacientes.set(normalizados);
        this.pacientesFiltrados.set(normalizados);
        this.syncPacienteSelectionFromForm();
      } else {
        console.warn('Respuesta de pacientes no es un array:', response);
        this.pacientes.set([]);
        this.pacientesFiltrados.set([]);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      this.pacientes.set([]); // Asegurar que siempre sea un array
      this.pacientesFiltrados.set([]);
      this.snackBar.open('Error cargando pacientes', 'Cerrar', { duration: 3000 });
    }
  }

  private async loadVeterinarios(): Promise<void> {
    try {
      const response = await firstValueFrom(this.citasService.getVeterinarios());
      console.log('Respuesta veterinarios en form:', response);
      const data = response?.data;
      if (Array.isArray(data)) {
        const normalizados = data
          .map((v: any) => ({
            id: v.id || v.id_usuario,
            nombre: v.nombre || 'Sin nombre',
            especialidad: v.especialidad || 'Sin especialidad'
          }))
          .filter((v: any) => Boolean(v.id));
        this.veterinarios.set(normalizados);
      } else {
        console.warn('Respuesta de veterinarios no es un array:', data);
        this.veterinarios.set([]);
      }
    } catch (error) {
      console.error('Error cargando veterinarios:', error);
      this.veterinarios.set([]); // Asegurar que siempre sea un array
      this.snackBar.open('Error cargando veterinarios', 'Cerrar', { duration: 3000 });
    }
  }

  private checkIfEditing(): void {
    const citaId = this.route.snapshot.paramMap.get('id');
    if (citaId && citaId !== 'nueva') {
      this.isEditing.set(true);
      this.loadCitaForEditing(citaId);
    } else {
      // Pre-fill with query params if provided
      const queryParams = this.route.snapshot.queryParams;
      if (queryParams['fecha_inicio']) {
        const fecha = new Date(queryParams['fecha_inicio']);
        this.citaForm.patchValue({
          fecha: fecha,
          hora_inicio: this.formatTimeFromDateTime(fecha)
        });
        this.calculateEndTime();
      }
    }
  }

  private async loadCitaForEditing(citaId: string): Promise<void> {
    try {
      this.loading.set(true);
      const response = await this.citasService.getCitaById(citaId).toPromise();

      if (response?.success && response.data) {
        this.currentCita = response.data;
        this.populateFormWithCita(response.data);
      }
    } catch (error) {
      console.error('Error cargando cita:', error);
      this.snackBar.open('Error cargando cita', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/citas']);
    } finally {
      this.loading.set(false);
    }
  }

  private populateFormWithCita(cita: Cita): void {
    // Parsear fechas usando la lógica correcta de timezone para mostrar en hora local de Colombia
    const fechaInicio = this.parseLocalDateForForm(cita.fecha_inicio);
    const fechaFin = this.parseLocalDateForForm(cita.fecha_fin);
    console.log('🔧 populateFormWithCita:', {
      fecha_inicio_raw: cita.fecha_inicio,
      fecha_fin_raw: cita.fecha_fin,
      fechaInicio_parsed: fechaInicio,
      fechaFin_parsed: fechaFin,
      duracion: APPOINTMENT_DURATION_MINUTES,
      hora_inicio_formatted: this.formatTimeFromDateTime(fechaInicio)
    });

    this.citaForm.patchValue({
      mascota_search: '',
      id_mascota: cita.id_mascota,
      id_veterinario: cita.id_veterinario,
      fecha: fechaInicio,
      hora_inicio: this.formatTimeFromDateTime(fechaInicio),
      duracion: APPOINTMENT_DURATION_MINUTES,
      tipo: cita.tipo,
      estado: cita.estado,
      motivo: cita.motivo || '',
      observaciones: cita.observaciones || ''
    });

    this.syncPacienteSelectionFromForm();
    this.calculateEndTime();
  }

  private setupFormChanges(): void {
    this.citaForm.patchValue({ duracion: APPOINTMENT_DURATION_MINUTES }, { emitEvent: false });
    this.calculateEndTime();

    this.citaForm.get('mascota_search')?.valueChanges.subscribe((value) => {
      this.filterPacientes(String(value || ''));
    });
  }

  onVeterinarioChange(): void {
    this.checkAvailabilityAndSuggest();
  }

  onFechaChange(): void {
    this.checkAvailabilityAndSuggest();
  }

  onHoraChange(): void {
    this.calculateEndTime();
    this.checkAvailabilityAndSuggest();
  }

  onTipoChange(): void {
    this.calculateEndTime();
  }

  onPacienteChange(): void {
    this.syncPacienteSelectionFromForm();
  }

  onMascotaSelected(event: any): void {
    const paciente = event?.option?.value;
    if (!paciente?.id) return;

    this.citaForm.patchValue({
      id_mascota: paciente.id,
      mascota_search: this.getPacienteDisplayText(paciente)
    }, { emitEvent: false });

    this.pacienteSeleccionado.set(paciente);
    this.pacientesFiltrados.set(this.pacientes());
  }

  onMascotaInputBlur(): void {
    const selected = this.pacienteSeleccionado();
    if (selected) {
      this.citaForm.patchValue({
        mascota_search: this.getPacienteDisplayText(selected)
      }, { emitEvent: false });
    }
  }

  displayMascota = (paciente: any): string => {
    if (!paciente) return '';
    if (typeof paciente === 'string') return paciente;
    return this.getPacienteDisplayText(paciente);
  };

  getTipoColor(tipo: string): string {
    const normalized = String(tipo || '').trim().toLowerCase();
    const tipoMatch = this.tiposCita.find(t => t.value === normalized);
    if (tipoMatch) return tipoMatch.color;

    const fallback: Record<string, string> = {
      control: '#e09a5f',
      consulta: '#51b749',
      general: '#51b749'
    };

    return fallback[normalized] || '#607d8b';
  }

  getTipoLabel(tipo: string): string {
    const normalized = String(tipo || '').trim().toLowerCase();
    const tipoMatch = this.tiposCita.find(t => t.value === normalized);
    if (tipoMatch) return tipoMatch.label;
    if (normalized === 'control') return 'Control';
    if (normalized === 'consulta' || normalized === 'general') return 'Domicilio';
    return 'Tipo de cita';
  }

  private filterPacientes(searchTerm: string): void {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.pacientesFiltrados.set(this.pacientes());
      return;
    }

    const filtered = this.pacientes().filter((paciente) => {
      const base = `${paciente.nombre} ${paciente.propietario} ${paciente.especie} ${paciente.raza}`.toLowerCase();
      return base.includes(term);
    });

    this.pacientesFiltrados.set(filtered);
  }

  private syncPacienteSelectionFromForm(): void {
    const pacienteId = this.citaForm.get('id_mascota')?.value;
    const paciente = this.pacientes().find((p: any) => p.id === pacienteId) || null;
    this.pacienteSeleccionado.set(paciente);

    if (paciente) {
      this.citaForm.patchValue({
        mascota_search: this.getPacienteDisplayText(paciente)
      }, { emitEvent: false });
    }
  }

  private getPacienteDisplayText(paciente: any): string {
    if (!paciente) return '';
    if (typeof paciente === 'string') return paciente;

    const nombre = paciente.nombre || paciente.nombre_mascota || 'Sin nombre';
    const propietario = paciente.propietario || paciente.cliente_nombre || paciente.nombre_cliente || paciente.cliente?.nombre || 'Sin propietario';
    return `${nombre} · ${propietario}`;
  }

  calculateEndTime(): void {
    const fecha = this.citaForm.get('fecha')?.value;
    const horaInicio = this.citaForm.get('hora_inicio')?.value;
    const duracion = APPOINTMENT_DURATION_MINUTES;

    if (fecha && horaInicio && duracion) {
      const [hours, minutes] = horaInicio.split(':').map(Number);
      const startTime = new Date(fecha);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime.getTime() + (duracion * 60 * 1000));
      this.horaFin.set(this.formatTime(endTime));
    } else {
      this.horaFin.set('');
    }
  }

  private async checkAvailabilityAndSuggest(): Promise<void> {
    const veterinarioId = this.citaForm.get('id_veterinario')?.value;
    const fecha = this.citaForm.get('fecha')?.value;
    const duracion = APPOINTMENT_DURATION_MINUTES;

    if (veterinarioId && fecha && duracion) {
      try {
        const fechaStr = this.citasService.formatearFechaParaBackend(fecha);
        const response = await this.citasService.getSugerenciasHorario(
          veterinarioId,
          fechaStr,
          duracion
        ).toPromise();

        this.sugerenciasHorario.set(response || []);
      } catch (error) {
        console.error('Error obteniendo sugerencias:', error);
        this.sugerenciasHorario.set([]);
      }
    }
  }

  selectSugerencia(sugerencia: SugerenciaHorario): void {
    const fechaInicio = new Date(sugerencia.fecha_inicio);

    this.citaForm.patchValue({
      fecha: fechaInicio,
      hora_inicio: this.formatTimeFromDateTime(fechaInicio)
    });

    this.calculateEndTime();
  }

  formatSugerencia(sugerencia: SugerenciaHorario): string {
    const fecha = new Date(sugerencia.fecha_inicio);
    const fechaStr = fecha.toLocaleDateString('es-ES');
    const horaStr = this.formatTimeFromDateTime(fecha);
    return `${fechaStr} ${horaStr}`;
  }

  async onSubmit(): Promise<void> {
    if (this.citaForm.invalid || this.saving()) return;

    this.saving.set(true);

    try {
      const formData = this.buildFormData();

      let response;
      if (this.isEditing() && this.currentCita) {
        response = await this.citasService.updateCita(this.currentCita.id_cita, formData).toPromise();
      } else {
        response = await this.citasService.createCita(formData).toPromise();
      }

      if (response?.success) {
        const message = this.isEditing() ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });

        if (this.dialogRef) {
          this.dialogRef.close(response.data);
        } else {
          // Agregar flag para indicar que se necesita refrescar el calendario
          this.router.navigate(['/citas'], {
            queryParams: { refresh: 'true' }
          });
        }
      } else {
        throw new Error(response?.message || 'Error en la operación');
      }
    } catch (error: any) {
      console.error('Error guardando cita:', error);

      // Mostrar errores de validación detallados si están disponibles
      if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
        console.log('🔴 Errores de validación detectados:');
        error.error.errors.forEach((validationError: any, index: number) => {
          console.log(`❌ Error ${index + 1}:`, {
            campo: validationError.field,
            mensaje: validationError.message,
            valor: validationError.value,
            ubicacion: validationError.location
          });
        });
      }

      let message = 'Error guardando cita';
      if (error.status === 400 && error.error?.errors?.length > 0) {
        // Mostrar el primer error de validación
        const firstError = error.error.errors[0];
        message = `Error de validación: ${firstError.message}`;
      } else if (error.status === 409) {
        message = 'Conflicto de horarios. ' + (error.error?.message || '');
      } else if (error.error?.message) {
        message = error.error.message;
      }

      this.snackBar.open(message, 'Cerrar', { duration: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  private buildFormData(): CitaFormData {
    const formValue = this.citaForm.value;
    // console.log('🔍 Valores del formulario RAW:', formValue);

    const fecha = formValue.fecha;
    const [hours, minutes] = formValue.hora_inicio.split(':').map(Number);

    // Crear fecha en zona horaria local de Colombia
    const fechaInicio = new Date(fecha);
    // Establecer la hora en zona local (no UTC)
    fechaInicio.setHours(hours, minutes, 0, 0);

    console.log('🕐 Fecha/hora local construida:', {
      fechaOriginal: fecha,
      horaSeleccionada: formValue.hora_inicio,
      fechaInicioLocal: fechaInicio,
      fechaInicioISO: fechaInicio.toISOString(),
      zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fechaParaBackend: this.citasService.formatearFechaParaBackend(fechaInicio)
    });

    const fechaFin = new Date(fechaInicio.getTime() + (APPOINTMENT_DURATION_MINUTES * 60 * 1000));

    const data: CitaFormData = {
      id_mascota: formValue.id_mascota,
      id_veterinario: formValue.id_veterinario,
      fecha_inicio: this.citasService.formatearFechaParaBackend(fechaInicio),
      fecha_fin: this.citasService.formatearFechaParaBackend(fechaFin),
      tipo: formValue.tipo,
      estado: formValue.estado, // Incluir estado para actualizaciones
      motivo: formValue.motivo || undefined,
      observaciones: formValue.observaciones || undefined
    };

    // console.log('📤 Datos procesados para enviar:', data);
    return data;
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/citas']);
    }
  }

  private formatTimeFromDateTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private parseLocalDateForForm(fechaStr: string): Date {
    // SOLUCIÓN SIMPLE: El navegador YA hace la conversión correctamente
    // UTC 14:00Z -> 9:00 AM Colombia (automático del navegador)
    // Solo necesitamos usar new Date() sin modificaciones adicionales

    // console.log('📥 parseLocalDateForForm INPUT:', {
    //   fechaStr,
    //   includes_Z: fechaStr.includes('Z')
    // });

    // Simplemente usar la conversión automática del navegador
    const fecha = new Date(fechaStr);

    // console.log('📤 parseLocalDateForForm OUTPUT:', {
    //   original: fechaStr,
    //   converted: fecha,
    //   hours: fecha.getHours(),
    //   minutes: fecha.getMinutes(),
    //   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    //   conversion: `${fechaStr} -> ${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`
    // });

    return fecha;
  }
}
