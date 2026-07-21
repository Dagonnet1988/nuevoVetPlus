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
import { ConfiguracionService, DiaEspecial } from '../../services/configuracion.service';
import {
  Cita,
  CitaFormData,
  TipoCita,
  TIPOS_CITA,
  ESTADOS_CITA,
  RecurringAppointmentPayload,
  RecurringEditedOccurrence,
  RecurringPreviewItem,
  SugerenciaHorario
} from '../../models/cita.interface';

interface EditableRecurringOccurrence {
  indice: number;
  fecha: string;
  hora: string;
  tipo: TipoCita;
}

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
  private configuracionService = inject(ConfiguracionService);
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
  previsualizandoSerie = signal(false);
  ocurrenciasPreview = signal<RecurringPreviewItem[]>([]);
  ocurrenciasEditables = signal<EditableRecurringOccurrence[]>([]);
  diasEspeciales = signal<DiaEspecial[]>([]);
  private lastImmediateSpecialDayMessage = '';

  readonly diasSemanaOpciones = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' }
  ];

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
      observaciones: [''],
      es_periodica: [false],
      recurrencia_frecuencia: ['weekly'],
      recurrencia_intervalo: [1],
      recurrencia_total_ocurrencias: [8],
      recurrencia_fecha_hasta: [''],
      recurrencia_dias_semana: [[] as number[]]
    });
  }

  ngOnInit(): void {
    // Defer initial load to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadInitialData();
      this.loadDiasEspeciales();
      this.checkIfEditing();
      this.setupFormChanges();
    });
  }

  private loadDiasEspeciales(): void {
    this.configuracionService.getDiasEspeciales().subscribe({
      next: (dias) => this.diasEspeciales.set(dias || []),
      error: () => this.diasEspeciales.set([])
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

    this.citaForm.get('fecha')?.valueChanges.subscribe((value) => {
      if (value) {
        this.syncRecurringDaysWithDate(value);
      }
      this.clearRecurringPreview();
    });

    this.citaForm.get('hora_inicio')?.valueChanges.subscribe(() => {
      this.clearRecurringPreview();
    });

    this.citaForm.get('es_periodica')?.valueChanges.subscribe((isRecurring) => {
      this.applyRecurringValidators(Boolean(isRecurring));
      this.clearRecurringPreview();
    });

    this.citaForm.get('recurrencia_frecuencia')?.valueChanges.subscribe((frecuencia) => {
      this.applyRecurringValidators(Boolean(this.citaForm.get('es_periodica')?.value));

      if (frecuencia === 'weekly' && this.citaForm.get('fecha')?.value) {
        this.syncRecurringDaysWithDate(this.citaForm.get('fecha')?.value);
      }

      this.clearRecurringPreview();
    });

    this.citaForm.get('recurrencia_intervalo')?.valueChanges.subscribe(() => {
      this.clearRecurringPreview();
    });

    this.citaForm.get('recurrencia_total_ocurrencias')?.valueChanges.subscribe(() => {
      this.clearRecurringPreview();
    });

    this.citaForm.get('recurrencia_fecha_hasta')?.valueChanges.subscribe(() => {
      this.clearRecurringPreview();
    });

    this.applyRecurringValidators(false);
  }

  private applyRecurringValidators(isRecurring: boolean): void {
    const frecuenciaCtrl = this.citaForm.get('recurrencia_frecuencia');
    const intervaloCtrl = this.citaForm.get('recurrencia_intervalo');
    const totalCtrl = this.citaForm.get('recurrencia_total_ocurrencias');
    const diasCtrl = this.citaForm.get('recurrencia_dias_semana');

    if (!frecuenciaCtrl || !intervaloCtrl || !totalCtrl || !diasCtrl) return;

    if (isRecurring && !this.isEditing()) {
      frecuenciaCtrl.setValidators([Validators.required]);
      intervaloCtrl.setValidators([Validators.required, Validators.min(1), Validators.max(12)]);
      totalCtrl.setValidators([Validators.required, Validators.min(1), Validators.max(200)]);

      if (frecuenciaCtrl.value === 'weekly') {
        if (this.citaForm.get('fecha')?.value) {
          this.syncRecurringDaysWithDate(this.citaForm.get('fecha')?.value);
        }
        diasCtrl.setValidators([
          Validators.required,
          (control) => Array.isArray(control.value) && control.value.length > 0 ? null : { required: true }
        ]);
      } else {
        diasCtrl.clearValidators();
      }
    } else {
      frecuenciaCtrl.clearValidators();
      intervaloCtrl.clearValidators();
      totalCtrl.clearValidators();
      diasCtrl.clearValidators();
    }

    frecuenciaCtrl.updateValueAndValidity({ emitEvent: false });
    intervaloCtrl.updateValueAndValidity({ emitEvent: false });
    totalCtrl.updateValueAndValidity({ emitEvent: false });
    diasCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private clearRecurringPreview(): void {
    this.ocurrenciasPreview.set([]);
    this.ocurrenciasEditables.set([]);
  }

  isRecurringEnabled(): boolean {
    return Boolean(this.citaForm.get('es_periodica')?.value) && !this.isEditing();
  }

  isWeeklyRecurring(): boolean {
    return this.citaForm.get('recurrencia_frecuencia')?.value === 'weekly';
  }

  toggleDiaSemana(day: number): void {
    const control = this.citaForm.get('recurrencia_dias_semana');
    if (!control) return;

    const current = Array.isArray(control.value) ? [...control.value] : [];
    const exists = current.includes(day);
    const updated = exists ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b);
    control.setValue(updated);
    control.markAsTouched();
    this.clearRecurringPreview();
  }

  isDiaSeleccionado(day: number): boolean {
    const current = this.citaForm.get('recurrencia_dias_semana')?.value;
    return Array.isArray(current) && current.includes(day);
  }

  private syncRecurringDaysWithDate(value: any): void {
    if (!value || this.citaForm.get('recurrencia_frecuencia')?.value !== 'weekly') {
      return;
    }

    const fecha = value instanceof Date ? value : new Date(value);
    const day = fecha.getDay();
    const diasCtrl = this.citaForm.get('recurrencia_dias_semana');
    if (!diasCtrl) return;

    const current = Array.isArray(diasCtrl.value) ? diasCtrl.value : [];
    if (current.length === 0) {
      diasCtrl.setValue([day], { emitEvent: false });
    }
  }

  private buildRecurringPayload(): RecurringAppointmentPayload {
    const formValue = this.citaForm.value;
    const base = this.buildFormData();
    const fechaHasta = formValue.recurrencia_fecha_hasta
      ? this.formatDateOnly(formValue.recurrencia_fecha_hasta)
      : undefined;

    const payload: RecurringAppointmentPayload = {
      id_mascota: base.id_mascota,
      id_veterinario: base.id_veterinario,
      fecha_inicio: base.fecha_inicio,
      fecha_fin: base.fecha_fin,
      tipo: base.tipo,
      motivo: base.motivo,
      observaciones: base.observaciones,
      recurrencia: {
        frecuencia: formValue.recurrencia_frecuencia,
        intervalo: Number(formValue.recurrencia_intervalo || 1),
        total_ocurrencias: Number(formValue.recurrencia_total_ocurrencias || 8),
        fecha_hasta: fechaHasta,
        dias_semana: formValue.recurrencia_frecuencia === 'weekly'
          ? (Array.isArray(formValue.recurrencia_dias_semana) ? formValue.recurrencia_dias_semana : [])
          : undefined
      }
    };

    const editables = this.ocurrenciasEditables();
    if (editables.length > 0) {
      payload.ocurrencias_editadas = this.buildEditedOccurrencesForPayload(editables);
    }

    return payload;
  }

  private buildEditedOccurrencesForPayload(items: EditableRecurringOccurrence[]): RecurringEditedOccurrence[] {
    return items.map((item, idx) => {
      const [year, month, day] = item.fecha.split('-').map(Number);
      const [hours, minutes] = item.hora.split(':').map(Number);
      const start = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
      const end = new Date(start.getTime() + (APPOINTMENT_DURATION_MINUTES * 60 * 1000));

      return {
        indice: item.indice || (idx + 1),
        fecha_inicio: this.citasService.formatearFechaParaBackend(start),
        fecha_fin: this.citasService.formatearFechaParaBackend(end),
        tipo: item.tipo
      };
    });
  }

  private buildEditableRows(preview: RecurringPreviewItem[]): EditableRecurringOccurrence[] {
    const tipoBase = this.citaForm.get('tipo')?.value as TipoCita;

    return preview.map((item, idx) => {
      const start = this.parseLocalDateForForm(item.fecha_inicio);
      return {
        indice: item.indice || (idx + 1),
        fecha: this.formatDateOnly(start),
        hora: this.formatTime24FromDate(start),
        tipo: tipoBase
      };
    });
  }

  updateOccurrenceFecha(index: number, value: string): void {
    const rows = [...this.ocurrenciasEditables()];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], fecha: value };
    this.ocurrenciasEditables.set(rows);
    this.showImmediateSpecialDayFeedback();
  }

  updateOccurrenceHora(index: number, value: string): void {
    const rows = [...this.ocurrenciasEditables()];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], hora: value };
    this.ocurrenciasEditables.set(rows);
    this.showImmediateSpecialDayFeedback();
  }

  updateOccurrenceTipo(index: number, value: TipoCita): void {
    const rows = [...this.ocurrenciasEditables()];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], tipo: value };
    this.ocurrenciasEditables.set(rows);
  }

  async onPreviewRecurring(): Promise<void> {
    if (!this.isRecurringEnabled() || this.saving() || this.previsualizandoSerie()) return;

    this.applyRecurringValidators(true);
    if (this.citaForm.invalid) {
      this.citaForm.markAllAsTouched();
      return;
    }

    this.previsualizandoSerie.set(true);
    try {
      const payload = this.buildRecurringPayload();
      const preview = await firstValueFrom(this.citasService.previewCitasPeriodicas(payload));
      this.ocurrenciasPreview.set(preview || []);
      this.ocurrenciasEditables.set(this.buildEditableRows(preview || []));

      if (!preview || preview.length === 0) {
        this.snackBar.open('No se generaron ocurrencias con la configuración actual', 'Cerrar', { duration: 3500 });
      }
    } catch (error: any) {
      const message = error?.error?.message || 'No fue posible previsualizar las citas periódicas';
      this.snackBar.open(message, 'Cerrar', { duration: 4000 });
      this.ocurrenciasPreview.set([]);
    } finally {
      this.previsualizandoSerie.set(false);
    }
  }

  onVeterinarioChange(): void {
    this.checkAvailabilityAndSuggest();
  }

  getVeterinarioLabelById(id: string): string {
    const vet = this.veterinarios().find((v: any) => v.id === id);
    if (!vet) return 'Seleccionar veterinario';
    return `${vet.nombre} · ${vet.especialidad}`;
  }

  onFechaChange(): void {
    this.checkAvailabilityAndSuggest();
    this.showImmediateSpecialDayFeedback();
  }

  onHoraChange(): void {
    this.calculateEndTime();
    this.checkAvailabilityAndSuggest();
    this.showImmediateSpecialDayFeedback();
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
    this.showImmediateSpecialDayFeedback();
  }

  formatSugerencia(sugerencia: SugerenciaHorario): string {
    const fecha = new Date(sugerencia.fecha_inicio);
    const fechaStr = this.formatDateDisplay(fecha);
    const horaStr = this.formatTime(fecha);
    return `${fechaStr} ${horaStr}`;
  }

  async onSubmit(): Promise<void> {
    if (this.citaForm.invalid || this.saving()) return;

    const precheck = this.evaluateSpecialDayRulesBeforeSubmit();
    if (!precheck.canProceed) {
      this.snackBar.open(precheck.message || 'No se puede agendar en esta fecha', 'Cerrar', { duration: 4500 });
      return;
    }

    if (precheck.warningMessage) {
      const confirmedSpecialDay = window.confirm(`${precheck.warningMessage}\n\n¿Deseas continuar con el agendamiento?`);
      if (!confirmedSpecialDay) {
        return;
      }
    }

    const pastDateWarning = this.getPastDateCreationWarning();
    if (pastDateWarning) {
      const confirmedPastDate = window.confirm(`${pastDateWarning}\n\n¿Deseas continuar con el agendamiento?`);
      if (!confirmedPastDate) {
        return;
      }
    }

    this.saving.set(true);

    try {
      const formData = this.buildFormData();

      let response;
      if (this.isEditing() && this.currentCita) {
        response = await this.citasService.updateCita(this.currentCita.id_cita, formData).toPromise();
      } else if (this.isRecurringEnabled()) {
        const recurringPayload = this.buildRecurringPayload();
        response = await firstValueFrom(this.citasService.createCitasPeriodicas(recurringPayload));
      } else {
        response = await this.citasService.createCita(formData).toPromise();
      }

      if (response?.success) {
        const message = this.isEditing()
          ? 'Cita actualizada exitosamente'
          : this.isRecurringEnabled()
            ? 'Serie de citas periódicas creada exitosamente'
            : 'Cita creada exitosamente';
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

  private evaluateSpecialDayRulesBeforeSubmit(): { canProceed: boolean; message?: string; warningMessage?: string } {
    const dias = (this.diasEspeciales() || []).filter((d) => d?.activo !== false);

    const noLaborableByDate = new Map<string, DiaEspecial>();
    const horarioEspecialByDate = new Map<string, DiaEspecial>();
    const festivoByDate = new Map<string, DiaEspecial>();

    dias.forEach((dia) => {
      const dateKey = this.normalizeDateKey(dia?.fecha);
      if (!dateKey) return;
      if (dia.tipo === 'no_laborable') {
        noLaborableByDate.set(dateKey, dia);
      }
      if (dia.tipo === 'horario_especial') {
        horarioEspecialByDate.set(dateKey, dia);
      }
      if (dia.tipo === 'festivo') {
        festivoByDate.set(dateKey, dia);
      }
    });

    const slotsToCheck = this.getCandidateSlotsForValidation();

    for (const slot of slotsToCheck) {
      const slotDateKey = this.normalizeDateKey(slot.fecha);
      if (!slotDateKey) continue;

      const noLaborable = noLaborableByDate.get(slotDateKey);
      if (noLaborable) {
        const displayDate = this.toDisplayDate(slot.fecha);
        return {
          canProceed: false,
          message: `No se puede agendar en ${displayDate} (día no laborable).`
        };
      }

      const horario = horarioEspecialByDate.get(slotDateKey);
      if (!horario) continue;

      const allowedStart = this.parseTimeToMinutes(horario.horario_especial?.hora_inicio || '');
      const allowedEnd = this.parseTimeToMinutes(horario.horario_especial?.hora_fin || '');

      if (
        allowedStart === null ||
        allowedEnd === null ||
        slot.startMinutes < allowedStart ||
        slot.endMinutes > allowedEnd
      ) {
        const displayDate = this.toDisplayDate(slot.fecha);
        const hhmm = `${horario.horario_especial?.hora_inicio || '--:--'}-${horario.horario_especial?.hora_fin || '--:--'}`;
        return {
          canProceed: false,
          message: `No se puede agendar en ${displayDate} fuera del horario permitido (${hhmm}).`
        };
      }
    }

    for (const slot of slotsToCheck) {
      const day = this.toDateSafe(slot.fecha);
      const isSunday = day?.getDay() === 0;
      const slotDateKey = this.normalizeDateKey(slot.fecha);
      const festivo = slotDateKey ? festivoByDate.get(slotDateKey) : undefined;

      if (isSunday || festivo) {
        const suffix = festivo?.descripcion ? ` (${festivo.descripcion})` : '';
        const displayDate = this.toDisplayDate(slot.fecha);
        return {
          canProceed: true,
          warningMessage: `Aviso: ${displayDate} es ${isSunday ? 'domingo' : 'festivo'}${suffix}.`
        };
      }
    }

    return { canProceed: true };
  }

  private showImmediateSpecialDayFeedback(): void {
    if (this.saving()) return;

    const hasDate = Boolean(this.citaForm.get('fecha')?.value);
    const hasTime = Boolean(this.citaForm.get('hora_inicio')?.value);
    if (!hasDate || !hasTime) {
      this.lastImmediateSpecialDayMessage = '';
      return;
    }

    const precheck = this.evaluateSpecialDayRulesBeforeSubmit();
    const currentMessage = precheck.canProceed
      ? (precheck.warningMessage || '')
      : (precheck.message || 'No se puede agendar en esta fecha');

    if (!currentMessage) {
      this.lastImmediateSpecialDayMessage = '';
      return;
    }

    if (currentMessage === this.lastImmediateSpecialDayMessage) {
      return;
    }

    this.lastImmediateSpecialDayMessage = currentMessage;
    this.snackBar.open(currentMessage, 'Cerrar', {
      duration: precheck.canProceed ? 3500 : 4500
    });
  }

  private getCandidateDatesForValidation(): string[] {
    if (this.isRecurringEnabled()) {
      const editables = this.ocurrenciasEditables();
      if (Array.isArray(editables) && editables.length > 0) {
        return Array.from(new Set(editables.map((item) => item.fecha).filter(Boolean)));
      }
    }

    const baseDate = this.citaForm.get('fecha')?.value;
    const formatted = this.formatDateOnly(baseDate);
    return formatted ? [formatted] : [];
  }

  private getCandidateSlotsForValidation(): Array<{ fecha: string; startMinutes: number; endMinutes: number }> {
    const duration = APPOINTMENT_DURATION_MINUTES;

    if (this.isRecurringEnabled()) {
      const editables = this.ocurrenciasEditables();
      if (Array.isArray(editables) && editables.length > 0) {
        return editables
          .map((item) => {
            const start = this.parseTimeToMinutes(item.hora);
            if (!item.fecha || start === null) return null;
            return {
              fecha: item.fecha,
              startMinutes: start,
              endMinutes: start + duration
            };
          })
          .filter(Boolean) as Array<{ fecha: string; startMinutes: number; endMinutes: number }>;
      }
    }

    const baseDate = this.citaForm.get('fecha')?.value;
    const formatted = this.formatDateOnly(baseDate);
    const start = this.parseTimeToMinutes(this.citaForm.get('hora_inicio')?.value || '');
    if (!formatted || start === null) return [];

    return [{ fecha: formatted, startMinutes: start, endMinutes: start + duration }];
  }

  private getPastDateCreationWarning(): string | null {
    if (this.isEditing()) return null;

    const slots = this.getCandidateSlotsForValidation();
    if (!slots.length) return null;

    const now = new Date();
    const hasPastSlot = slots.some((slot) => {
      const day = this.toDateSafe(slot.fecha);
      if (!day) return false;

      const hours = Math.floor(slot.startMinutes / 60);
      const minutes = slot.startMinutes % 60;
      const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
      return slotStart < now;
    });

    if (!hasPastSlot) return null;
    return 'Aviso: estás creando una cita con fecha/hora anterior al momento actual.';
  }

  private normalizeDateKey(value: unknown): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Soporta tanto YYYY-MM-DD como ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  private parseTimeToMinutes(value: string): number | null {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private toDateSafe(value: string): Date | null {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    // Evita el desfase por zona horaria de new Date('YYYY-MM-DD') (se interpreta como UTC).
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const local = new Date(year, month, day, 0, 0, 0, 0);
      return Number.isNaN(local.getTime()) ? null : local;
    }

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toDisplayDate(value: string): string {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${match[3]}-${match[2]}-${match[1]}`;
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
      hour12: true
    });
  }

  private formatDateDisplay(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }

  private formatTime24FromDate(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
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

  private formatDateOnly(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
