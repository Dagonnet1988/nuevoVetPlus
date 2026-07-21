import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ConfiguracionService, DiaEspecial, EmpresaConfig, HorarioAtencion } from '../../../services/configuracion.service';

const DDMMYYYY_REGEX = /^\d{2}-\d{2}-\d{4}$/;
const CURRENT_YEAR = String(new Date().getFullYear());

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
    MatProgressSpinnerModule,
  ],
  templateUrl: './empresa-config.component.html',
  styleUrl: './empresa-config.component.css'
})
export class EmpresaConfigComponent implements OnInit {
  loading = signal(false);
  empresaConfig = computed(() => this.configuracionService.empresaConfig());
  horarios = signal<HorarioAtencion[]>([]);
  diasEspeciales = signal<DiaEspecial[]>([]);
  savingDiaEspecial = signal(false);
  editingDiaEspecialId = signal<string | null>(null);
  showDiasEspecialesModal = signal(false);
  yearFilter = signal<string>(CURRENT_YEAR);
  origenFilter = signal<'todos' | 'tenant' | 'global'>('todos');
  tipoFilter = signal<'todos' | 'festivo' | 'no_laborable' | 'horario_especial' | 'cumpleanos' | 'ausencia'>('todos');
  searchFilter = signal('');
  private currentConfig = signal<EmpresaConfig | null>(null);
  private pendingLogoUrl = signal<string>('');

  availableYears = computed(() => {
    const years = new Set<string>();
    for (const dia of this.diasEspeciales()) {
      const ymd = this.toYmdString(dia.fecha);
      if (ymd) years.add(ymd.slice(0, 4));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  });

  filteredDiasEspeciales = computed(() => {
    const year = this.yearFilter();
    const origen = this.origenFilter();
    const tipo = this.tipoFilter();
    const text = this.searchFilter().trim().toLowerCase();

    return this.diasEspeciales().filter((dia) => {
      const ymd = this.toYmdString(dia.fecha) || '';
      const byYear = year === 'todos' || ymd.startsWith(`${year}-`);
      const byOrigen = origen === 'todos' || dia.origen === origen;
      const byTipo = tipo === 'todos' || dia.tipo === tipo;
      const byText =
        !text ||
        dia.descripcion.toLowerCase().includes(text) ||
        this.formatYmdToDdMmYyyy(dia.fecha).toLowerCase().includes(text);

      return byYear && byOrigen && byTipo && byText;
    });
  });

  empresaForm: FormGroup;
  diaEspecialForm: FormGroup;

  readonly tiposDiaEspecial = [
    { value: 'festivo', label: 'Festivo' },
    { value: 'no_laborable', label: 'No laborable' },
    { value: 'horario_especial', label: 'Horario reducido' },
    { value: 'cumpleanos', label: 'Cumpleaños' },
    { value: 'ausencia', label: 'Ausencia' }
  ];

  constructor(
    private fb: FormBuilder,
    public configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private router: Router,
    private location: Location
  ) {
    this.empresaForm = this.createEmpresaForm();
    this.diaEspecialForm = this.createDiaEspecialForm();
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadDiasEspeciales();
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

  private createDiaEspecialForm(): FormGroup {
    return this.fb.group({
      fecha: ['', [Validators.required, Validators.pattern(DDMMYYYY_REGEX)]],
      descripcion: ['', [Validators.required, Validators.minLength(3)]],
      tipo: ['festivo', Validators.required],
      hora_inicio: ['08:00'],
      hora_fin: ['13:00'],
      activo: [true]
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

  private loadDiasEspeciales(): void {
    this.configuracionService.getDiasEspeciales().subscribe({
      next: (dias) => {
        const ordered = [...(dias || [])]
          .map((dia) => this.normalizeIncomingDiaEspecial(dia))
          .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
        this.diasEspeciales.set(ordered);
        const years = this.availableYears();
        if (!years.includes(this.yearFilter())) {
          this.yearFilter.set(years.includes(CURRENT_YEAR) ? CURRENT_YEAR : (years[0] || 'todos'));
        }
      },
      error: (error) => {
        console.error('Error cargando días especiales:', error);
        this.diasEspeciales.set([]);
        this.yearFilter.set(CURRENT_YEAR);
      }
    });
  }

  isHorarioEspecial(): boolean {
    return this.diaEspecialForm.get('tipo')?.value === 'horario_especial';
  }

  saveDiaEspecial(): void {
    if (this.diaEspecialForm.invalid || this.savingDiaEspecial()) {
      this.diaEspecialForm.markAllAsTouched();
      return;
    }

    const formValue = this.diaEspecialForm.value;
    const fechaYmd = this.parseDdMmYyyyToYmd(formValue.fecha);
    if (!fechaYmd) {
      this.snackBar.open('La fecha debe tener formato DD-MM-YYYY', 'Cerrar', { duration: 3500 });
      return;
    }

    const payload: DiaEspecial = {
      fecha: fechaYmd,
      descripcion: formValue.descripcion,
      tipo: formValue.tipo,
      activo: Boolean(formValue.activo)
    };

    if (formValue.tipo === 'horario_especial') {
      payload.horario_especial = {
        hora_inicio: formValue.hora_inicio,
        hora_fin: formValue.hora_fin
      };
    }

    const editingId = this.editingDiaEspecialId();
    this.savingDiaEspecial.set(true);

    const request$ = editingId
      ? this.configuracionService.updateDiaEspecial(editingId, payload)
      : this.configuracionService.addDiaEspecial(payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          editingId ? 'Día especial actualizado exitosamente' : 'Día especial agregado exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.resetDiaEspecialForm();
        this.loadDiasEspeciales();
        this.savingDiaEspecial.set(false);
      },
      error: (error) => {
        console.error('Error guardando día especial:', error);
        const msg = error?.error?.message || 'Error guardando día especial';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.savingDiaEspecial.set(false);
      }
    });
  }

  editDiaEspecial(dia: DiaEspecial): void {
    this.editingDiaEspecialId.set(dia.id ? String(dia.id) : null);
    this.diaEspecialForm.patchValue({
      fecha: this.formatYmdToDdMmYyyy(dia.fecha),
      descripcion: dia.descripcion,
      tipo: dia.tipo,
      hora_inicio: dia.horario_especial?.hora_inicio || '08:00',
      hora_fin: dia.horario_especial?.hora_fin || '13:00',
      activo: dia.activo !== false
    });
  }

  removeDiaEspecial(dia: DiaEspecial): void {
    if (!dia.id || this.savingDiaEspecial()) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar el día especial "${dia.descripcion}" (${this.formatYmdToDdMmYyyy(dia.fecha)})?`);
    if (!confirmed) return;

    this.savingDiaEspecial.set(true);
    this.configuracionService.deleteDiaEspecial(String(dia.id)).subscribe({
      next: () => {
        this.snackBar.open('Día especial eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadDiasEspeciales();
        if (this.editingDiaEspecialId() === dia.id) {
          this.resetDiaEspecialForm();
        }
        this.savingDiaEspecial.set(false);
      },
      error: (error) => {
        console.error('Error eliminando día especial:', error);
        const msg = error?.error?.message || 'Error eliminando día especial';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.savingDiaEspecial.set(false);
      }
    });
  }

  cancelDiaEspecialEdit(): void {
    this.resetDiaEspecialForm();
  }

  getTipoDiaEspecialLabel(tipo: DiaEspecial['tipo']): string {
    return this.tiposDiaEspecial.find((t) => t.value === tipo)?.label || tipo;
  }

  getTipoDiaEspecialClass(tipo: DiaEspecial['tipo']): string {
    return `tipo-${tipo}`;
  }

  formatDiaEspecialFecha(fecha: string): string {
    return this.formatYmdToDdMmYyyy(fecha);
  }

  openDiasEspecialesModal(): void {
    this.showDiasEspecialesModal.set(true);
  }

  closeDiasEspecialesModal(): void {
    this.showDiasEspecialesModal.set(false);
    this.cancelDiaEspecialEdit();
  }

  setYearFilter(value: string): void {
    this.yearFilter.set(value || 'todos');
  }

  setOrigenFilter(value: string): void {
    if (value === 'tenant' || value === 'global') {
      this.origenFilter.set(value);
      return;
    }
    this.origenFilter.set('todos');
  }

  setTipoFilter(value: string): void {
    if (value === 'festivo' || value === 'no_laborable' || value === 'horario_especial' || value === 'cumpleanos' || value === 'ausencia') {
      this.tipoFilter.set(value);
      return;
    }
    this.tipoFilter.set('todos');
  }

  setSearchFilter(value: string): void {
    this.searchFilter.set(String(value || ''));
  }

  onDatePicked(ymd: string): void {
    const ddmmyyyy = this.formatYmdToDdMmYyyy(ymd || '');
    if (!ddmmyyyy) return;
    this.diaEspecialForm.patchValue({ fecha: ddmmyyyy });
    this.diaEspecialForm.get('fecha')?.markAsDirty();
    this.diaEspecialForm.get('fecha')?.markAsTouched();
  }

  getDiasEspecialesStats(): { total: number; tenant: number; nacional: number } {
    const list = this.diasEspeciales();
    const tenant = list.filter((d) => d.origen === 'tenant').length;
    const nacional = list.filter((d) => d.origen === 'global').length;
    return {
      total: list.length,
      tenant,
      nacional
    };
  }

  private resetDiaEspecialForm(): void {
    this.editingDiaEspecialId.set(null);
    this.diaEspecialForm.reset({
      fecha: '',
      descripcion: '',
      tipo: 'festivo',
      hora_inicio: '08:00',
      hora_fin: '13:00',
      activo: true
    });
  }

  private parseDdMmYyyyToYmd(value: string): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Compatibilidad si el navegador/autocompletado inyecta YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    if (!DDMMYYYY_REGEX.test(raw)) {
      return null;
    }

    const [dd, mm, yyyy] = raw.split('-');
    const candidate = `${yyyy}-${mm}-${dd}`;
    const date = new Date(`${candidate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const normalized = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return normalized === candidate ? candidate : null;
  }

  private toYmdString(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      const raw = value.trim();
      const ymd = raw.match(/^\d{4}-\d{2}-\d{2}/);
      if (ymd) return ymd[0];
      if (DDMMYYYY_REGEX.test(raw)) {
        const [dd, mm, yyyy] = raw.split('-');
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return null;
  }

  private formatYmdToDdMmYyyy(value: string): string {
    const ymd = this.toYmdString(value);
    if (!ymd) return String(value || '').trim();
    const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return ymd;
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  private normalizeIncomingDiaEspecial(input: DiaEspecial): DiaEspecial {
    const ymd = this.toYmdString(input.fecha) || String(input.fecha || '').trim();
    return {
      ...input,
      id: input.id ? String(input.id) : undefined,
      id_tenant: input.id_tenant ?? null,
      fecha: ymd,
      origen: input.id_tenant ? 'tenant' : 'global',
      activo: input.activo !== false
    };
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
        formato_fecha: 'DD-MM-YY',
        formato_hora: 'h:mm A'
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
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/configuracion']);
  }
}
