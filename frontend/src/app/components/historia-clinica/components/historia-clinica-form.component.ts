import { Component, OnInit, OnDestroy, HostListener, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { HistoriaClinicaService, TipoDocumento, TIPO_LABELS, TIPO_ICONS } from '../../../services/historia-clinica.service';
import { PacientesService } from '../../../services/pacientes.service';
import { CitasService } from '../../../services/citas.service';

type EjercicioCategoriaKey = 'calentamiento' | 'fortalecimiento' | 'hidroterapia' | 'pasivos' | 'agentes';

@Component({
  selector: 'app-historia-clinica-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatExpansionModule, MatDividerModule, MatTooltipModule,
    MatTabsModule, MatDialogModule, MatStepperModule, MatCheckboxModule, CdkTextareaAutosize
  ],
  templateUrl: './historia-clinica-form.component.html',
  styles: [`
    :host { display: block; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 12px;
    }
    .form-grid mat-form-field {
      min-width: 0;
      width: 100%;
      grid-column: span 3;
    }
    .form-grid .field-compact { grid-column: span 3; }
    .form-grid .field-medium  { grid-column: span 4; }
    .form-grid .field-third   { grid-column: span 4; }
    .form-grid .field-half    { grid-column: span 6; }
    .form-grid .field-full,
    .form-grid .full-width { grid-column: 1 / -1; }
    .form-grid .med-inline { grid-column: span 2; }
    .form-grid .med-main { grid-column: span 4; }

    .ejercicios-categorias {
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .ejercicios-categoria-bloque {
      margin-bottom: 10px;
    }

    .ejercicios-checklist {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
      margin-bottom: 10px;
    }

    .ejercicios-checklist-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .ejercicios-checklist-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 12px;
    }

    .ejercicios-agente-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 180px;
      gap: 10px;
      align-items: center;
      margin-bottom: 6px;
    }

    .ejercicios-agente-zona {
      width: 100%;
    }

    .upload-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      background: #fafafa;
    }

    .upload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .upload-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }

    .upload-hint {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }

    .upload-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .upload-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 6px 8px;
      background: #fff;
    }

    .upload-item-main {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .upload-item-name {
      font-size: 12px;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .upload-item-size {
      font-size: 11px;
      color: #6b7280;
    }

    .form-grid textarea[matInput],
    .field-full textarea[matInput] {
      width: 100%;
      min-width: 0;
    }

    .patient-summary-panel {
      margin-top: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fafafa;
    }

    .patient-summary-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .patient-summary-groups {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      gap: 12px;
    }

    .summary-group {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      padding: 10px;
    }

    .summary-group-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.25px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 12px;
    }

    .summary-grid-owner {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-item-full {
      grid-column: 1 / -1;
    }

    .summary-item {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 6px;
      min-width: 0;
    }

    .summary-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .summary-value {
      font-size: 12px;
      color: #111827;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .summary-value-wrap {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      line-height: 1.35;
    }

    @media (max-width: 1024px) {
      .form-grid mat-form-field { grid-column: span 6; }
      .form-grid .field-compact { grid-column: span 6; }
      .form-grid .field-medium  { grid-column: span 6; }
      .form-grid .field-third   { grid-column: span 6; }
      .form-grid .field-half    { grid-column: span 6; }
      .form-grid .med-inline,
      .form-grid .med-main { grid-column: span 6; }
      .patient-summary-groups { grid-template-columns: 1fr; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .summary-grid-owner { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 640px) {
      .form-grid mat-form-field { grid-column: 1 / -1; }
      .form-grid .field-compact,
      .form-grid .field-medium,
      .form-grid .field-third,
      .form-grid .field-half,
      .form-grid .med-inline,
      .form-grid .med-main { grid-column: 1 / -1; }
      .summary-grid,
      .summary-grid-owner { grid-template-columns: 1fr; }
      .summary-item { grid-template-columns: 84px 1fr; }
      .ejercicios-checklist-grid { grid-template-columns: 1fr; }
      .ejercicios-agente-row { grid-template-columns: 1fr; }
    }
  `]
})
export class HistoriaClinicaFormComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  /** Controla si ya se guardó (evita disparar el guard tras guardar exitosamente) */
  private savedSuccessfully = false;
  loading    = signal(false);
  saving     = signal(false);
  isEdit     = signal(false);
  historiaId = signal<string | null>(null);
  originalTipoDocumento = signal<TipoDocumento | null>(null);

  mascotas          = signal<any[]>([]);
  mascotasFiltradas = signal<any[]>([]);
  clientes          = signal<any[]>([]);
  veterinarios      = signal<any[]>([]);
  mascotaSeleccionada = signal<any>(null);
  expandDiagnostico   = signal(false);
  imagenesDiagnosticasFiles = signal<File[]>([]);
  medicamentosSugeridos = signal<string[]>([]);
  medicamentosFiltrados = signal<string[]>([]);
  pacienteSearchCtrl = new FormControl<any>('', { nonNullable: true });

  readonly ejerciciosChecklistConfig: Array<{ key: EjercicioCategoriaKey; label: string; ejercicios: string[] }> = [
    {
      key: 'calentamiento',
      label: 'Ejercicios de calentamiento y coordinacion',
      ejercicios: [
        'Caminata en banda caminadora',
        'Cavaletti recto',
        'Cavaletti circular',
        'Slalom',
        'Cavaletti Slalom',
        'Cavaletti con arrastres intercalados',
        'Arrastres circulares',
        'Arrastres en linea recta',
        'Entrenamiento motor',
      ],
    },
    {
      key: 'fortalecimiento',
      label: 'Ejercicios de fortalecimiento muscular',
      ejercicios: [
        'Pista de equilibrio',
        'Carga posterior en balon',
        'Carga posterior en 2 balones',
        'Carga delanteral en balon',
        'Carga delantera en 2 balones',
        'Tabla de equilibrio',
        'Carga posterior en rampa',
        'Carga delantera en rampa',
        'Isometrias y equilibrio sobre balon',
      ],
    },
    {
      key: 'hidroterapia',
      label: 'Ejercicios de hidroterapia',
      ejercicios: [
        'Caminata circular en la piscina',
        'Hemimarcha en piscina',
        'Caminata de frente y en reversa',
        'Caminata en zic zac',
        'Estimulacion de nado',
      ],
    },
    {
      key: 'pasivos',
      label: 'Ejercicios pasivos',
      ejercicios: [
        'Movilidad pasiva',
        'Movilidad pasiva con bandas',
        'Estiramientos',
        'Masaje Effleurage',
      ],
    },
    {
      key: 'agentes',
      label: 'Equipos y agentes fisicos',
      ejercicios: [
        'Electroestimulacion muscular TENS',
        'Electroestimulacion muscular EMS',
        'Magnetoterapia',
        'Fototerapia LED',
        'Fototerapia LASER',
        'Infrasonido terapeutico',
        'Ultrasonido terapeutico',
      ],
    },
  ];

  ejerciciosCategoriasActivas = signal<Record<EjercicioCategoriaKey, boolean>>({
    calentamiento: false,
    fortalecimiento: false,
    hidroterapia: false,
    pasivos: false,
    agentes: false,
  });

  ejerciciosSeleccionados = signal<Record<EjercicioCategoriaKey, string[]>>({
    calentamiento: [],
    fortalecimiento: [],
    hidroterapia: [],
    pasivos: [],
    agentes: [],
  });

  zonasAgentes = signal<Record<string, string>>({});
  tiposBloqueadosEnCita = signal<Partial<Record<TipoDocumento, string>>>({});

  form!: FormGroup;

  tiposDocumento: { value: TipoDocumento; label: string; icon: string }[] = [
    { value: 'valoracion_inicial', label: TIPO_LABELS.valoracion_inicial, icon: TIPO_ICONS.valoracion_inicial },
    { value: 'seguimiento',        label: TIPO_LABELS.seguimiento,        icon: TIPO_ICONS.seguimiento },
    { value: 'formula',            label: TIPO_LABELS.formula,            icon: TIPO_ICONS.formula },
    { value: 'remision',           label: TIPO_LABELS.remision,           icon: TIPO_ICONS.remision },
  ];

  // estados sólo visibles en modo edición
  estados: { value: string; label: string; icon: string }[] = [
    { value: 'Completado', label: 'Historia completada', icon: 'check_circle'  },
    { value: 'Cancelado',  label: 'Cancelado',           icon: 'cancel'        },
  ];

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService,
    private pacientesService: PacientesService,
    private citasService: CitasService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  /** Advertencia nativa del navegador al cerrar pestaña / F5 con formulario sucio */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.form?.dirty && !this.savedSuccessfully) {
      event.preventDefault();
    }
  }

  ngOnInit(): void {
    this.buildForm();
    // Sincronizar validators al tipo inicial antes de cargar datos
    this.syncGroupsToTipo(this.tipoActual);
    this.loadVeterinarios();
    this.loadMascotas();
    this.loadMedicamentosSugeridos();

    this.pacienteSearchCtrl.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.filtrarMascotas(value);
      } else {
        this.mascotasFiltradas.set(this.mascotas());
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.historiaId.set(id);
      // Motivo obligatorio en toda edición
      const ctrl = this.form.get('motivo_modificacion')!;
      ctrl.setValidators([Validators.required, Validators.minLength(10)]);
      ctrl.updateValueAndValidity();
      this.loadHistoria(id);
    } else {
      this.prefillFromQueryParams();
      this.lockPacienteVeterinarioIfFromCita();
      // Si el tipo llega por query params (p.ej. seguimiento desde una cita),
      // activar el grupo correcto para que no quede deshabilitado.
      this.syncGroupsToTipo(this.tipoActual);
    }

    // Watch tipo: sincronizar validators y limpiar campos
    this.gGeneral.get('tipo_documento')!.valueChanges.subscribe(async (tipo) => {
      this.syncGroupsToTipo(tipo);
      this.resetChildFields();

      // En creación desde cita: validar duplicado al cambiar tipo (no esperar al guardar).
      if (!this.isEdit()) {
        await this.handleTipoDocumentoDuplicadoEnCita(tipo as TipoDocumento);
      }
    });

    // Validar también el tipo inicial al entrar en creación desde cita.
    if (!this.isEdit()) {
      this.handleTipoDocumentoDuplicadoEnCita(this.tipoActual);
    }

    // Watch mascota to show patient info
    this.gGeneral.get('id_mascota')!.valueChanges.subscribe((id) => {
      const found = this.mascotas().find(m => m.id_mascota === id) ?? null;
      this.mascotaSeleccionada.set(found);
      if (found && this.pacienteSearchCtrl.value !== found) {
        this.pacienteSearchCtrl.setValue(found, { emitEvent: false });
      }
    });
  }

  private prefillFromQueryParams(): void {
    const qp = this.route.snapshot.queryParamMap;
    const idMascota = qp.get('id_mascota');
    const idVeterinario = qp.get('id_veterinario');
    const idCita = qp.get('id_cita');
    const tipoDocumento = qp.get('tipo_documento');

    const patchGeneral: any = {};

    if (idMascota) patchGeneral.id_mascota = idMascota;
    if (idVeterinario) patchGeneral.id_veterinario = idVeterinario;
    if (idCita) patchGeneral.id_cita = idCita;
    if (this.isTipoDocumento(tipoDocumento)) patchGeneral.tipo_documento = tipoDocumento;

    if (Object.keys(patchGeneral).length > 0) {
      this.gGeneral.patchValue(patchGeneral);
    }

    if (idMascota) {
      const found = this.mascotas().find(m => m.id_mascota === idMascota) ?? null;
      this.mascotaSeleccionada.set(found);
      if (found) {
        this.pacienteSearchCtrl.setValue(found, { emitEvent: false });
      }
    }
  }

  private isTipoDocumento(value: string | null): value is TipoDocumento {
    return value === 'valoracion_inicial' || value === 'seguimiento' || value === 'formula' || value === 'remision';
  }

  private lockPacienteVeterinarioIfFromCita(): void {
    const idCita = this.gGeneral.get('id_cita')?.value;
    if (!idCita) return;

    this.gGeneral.get('id_mascota')?.disable({ emitEvent: false });
    this.gGeneral.get('id_veterinario')?.disable({ emitEvent: false });
    this.pacienteSearchCtrl.disable({ emitEvent: false });
  }

  private async handleTipoDocumentoDuplicadoEnCita(tipo: TipoDocumento): Promise<void> {
    const idCita = this.gGeneral.get('id_cita')?.value;
    if (!idCita || !tipo) return;

    try {
      const res = await this.historiaService.getHistoriasByCitaId(idCita).toPromise();
      const docs = Array.isArray(res?.data) ? res.data : [];
      const existente = docs.find((d: any) => d.tipo_documento === tipo && d.estado !== 'Cancelado');

      const nextBloqueados = { ...this.tiposBloqueadosEnCita() };
      if (!existente?.id_historia) {
        if (nextBloqueados[tipo]) {
          delete nextBloqueados[tipo];
          this.tiposBloqueadosEnCita.set(nextBloqueados);
          this.syncGroupsToTipo(this.tipoActual);
        }
        return;
      }

      const shouldEdit = window.confirm(
        `Ya existe ${this.historiaService.getTipoLabel(tipo)} para esta cita (${existente.codigo_historia}).\n\n¿Deseas abrirlo en modo edición?`
      );

      if (shouldEdit) {
        this.form.markAsPristine();
        this.router.navigate(['/historia-clinica', existente.id_historia, 'editar'], {
          queryParams: { from: 'cita', id_cita: idCita }
        });
        return;
      }

      nextBloqueados[tipo] = existente.id_historia;
      this.tiposBloqueadosEnCita.set(nextBloqueados);
      await this.cargarDatosExistentesTipoBloqueado(existente.id_historia, tipo);
      this.syncGroupsToTipo(this.tipoActual);
      this.snackBar.open(
        `${this.historiaService.getTipoLabel(tipo)} bloqueado para esta cita. Cambia de tipo para crear un documento nuevo.`,
        'Ver existente',
        { duration: 7000 }
      ).onAction().subscribe(() => {
        this.router.navigate(['/historia-clinica', existente.id_historia], {
          queryParams: { from: 'cita', id_cita: idCita }
        });
      });
    } catch {
      // Si falla esta validación temprana, el backend vuelve a validar al guardar.
    }
  }

  isTipoBloqueado(tipo: TipoDocumento): boolean {
    return Boolean(this.tiposBloqueadosEnCita()[tipo]);
  }

  private async cargarDatosExistentesTipoBloqueado(idHistoria: string, tipo: TipoDocumento): Promise<void> {
    try {
      const res = await this.historiaService.getHistoriaById(idHistoria).toPromise();
      const d: any = res?.data?.datos ?? {};

      if (tipo === 'seguimiento') {
        this.gSeguimiento.patchValue({
          ...d,
          ejercicios_realizados: this.extraerOtrosEjerciciosSeguimiento(d?.ejercicios_realizados),
        });
        this.hidratarChecklistSeguimiento(d?.ejercicios_realizados);
        return;
      }

      if (tipo === 'formula') {
        this.gFormula.patchValue({
          plan_terapeutico: d?.plan_terapeutico ?? '',
        });
        this.medicamentosArray.clear();
        if (Array.isArray(d?.medicamentos)) {
          d.medicamentos.forEach((m: any) => {
            const med = this.newMedicamento();
            med.patchValue({
              medicamento: m?.medicamento ?? m?.nombre ?? '',
              dosis: m?.dosis ?? '',
              frecuencia: m?.frecuencia ?? '',
              duracion: m?.duracion ?? '',
              cantidad: m?.cantidad ?? '',
              instrucciones: m?.instrucciones ?? '',
            });
            this.medicamentosArray.push(med);
          });
        }
        return;
      }

      if (tipo === 'remision') {
        this.gRemision.patchValue(d);
        return;
      }

      if (tipo === 'valoracion_inicial') {
        this.gAnamnesis.patchValue(d);
        this.gValoracion.patchValue(d);
        this.gPerimetria.patchValue(d);
        this.gExploracion.patchValue(d);
        this.gDiagnostico.patchValue(d);
      }
    } catch {
      // Si falla la carga de solo lectura, se mantiene el bloqueo del tipo.
    }
  }

  ngOnDestroy(): void {
    // No subscriptions to manually clean up currently.
  }

  /** Llamado por el guard antes de navegar fuera */
  canDeactivate(): boolean | Observable<boolean> {
    if (this.savedSuccessfully || !this.form?.dirty) return true;
    return false; // el guard abrirá el diálogo
  }

  // ─── Build form ─────────────────────────────────────────────────────────────
  // El formulario usa un FormGroup padre con sub-grupos por paso del stepper.
  // Cada sub-grupo tiene al menos un campo requerido para que el paso se considere válido.

  buildForm(): void {
    this.form = this.fb.group({
      // ── Paso 0: Datos generales ────────────────────────────────────────────
      general: this.fb.group({
        tipo_documento:  ['valoracion_inicial', Validators.required],
        id_mascota:      ['', Validators.required],
        id_veterinario:  ['', Validators.required],
        estado:          ['Completado'],
        id_cita:         [''],
      }),


      // ── Pasos de Valoración inicial ───────────────────────────────────────
      anamnesis: this.fb.group({
        remitido_por:            [''],
        antiguedad_signos:       [''],
        medicacion_previa:       [''],
        enfermedades_anteriores: [''],
        actividad_fisica:        [''],
        anamnesis:               ['', Validators.required],  // campo pivot del paso
      }),

      valoracion: this.fb.group({
        valoracion_estatica:        ['', Validators.required],  // campo pivot
        valoracion_dinamica:        [''],
        hallazgos_musculares:       [''],
        hallazgos_osteoarticulares: [''],
      }),

      perimetria: this.fb.group({
        perimetria_mtd_1: [null],
        perimetria_mtd_2: [null],
        perimetria_mti_1: [null],
        perimetria_mti_2: [null],
        perimetria_mpd_1: [null],
        perimetria_mpd_2: [null],
        perimetria_mpi_1: [null],
        perimetria_mpi_2: [null],
      }),

      exploracion: this.fb.group({
        prueba_cajon:             [''],
        prueba_compresion_tibial: [''],
        prueba_ortolani:          [''],
        luxacion_patelar:         [''],
        sensibilidad:             [''],
        propiocepcion:            [''],
        equilibrio:               [''],
        paniculo:                 [''],
        // Reflejos torácicos (MTD / MTI)
        reflejo_tricipital_d:      [''],
        reflejo_tricipital_i:      [''],
        reflejo_flexor_tor_d:      [''],
        reflejo_flexor_tor_i:      [''],
        // Reflejos pélvicos (MPD / MPI)
        reflejo_patelar_d:         [''],
        reflejo_patelar_i:         [''],
        reflejo_tibial_craneal_d:  [''],
        reflejo_tibial_craneal_i:  [''],
        reflejo_ciatico_d:         [''],
        reflejo_ciatico_i:         [''],
        reflejo_flexor_pelv_d:     [''],
        reflejo_flexor_pelv_i:     [''],
        observaciones_palpacion:   [''],
      }),

      goniometria: this.fb.group({
        // Miembro torácico derecho
        gonio_hombro_flexion_d:    [null],
        gonio_hombro_extension_d:  [null],
        gonio_codo_flexion_d:      [null],
        gonio_codo_extension_d:    [null],
        gonio_carpo_flexion_d:     [null],
        gonio_carpo_extension_d:   [null],
        // Miembro torácico izquierdo
        gonio_hombro_flexion_i:    [null],
        gonio_hombro_extension_i:  [null],
        gonio_codo_flexion_i:      [null],
        gonio_codo_extension_i:    [null],
        gonio_carpo_flexion_i:     [null],
        gonio_carpo_extension_i:   [null],
        // Miembro pélvico derecho
        gonio_cadera_flexion_d:    [null],
        gonio_cadera_extension_d:  [null],
        gonio_rodilla_flexion_d:   [null],
        gonio_rodilla_extension_d: [null],
        gonio_tarso_flexion_d:     [null],
        gonio_tarso_extension_d:   [null],
        // Miembro pélvico izquierdo
        gonio_cadera_flexion_i:    [null],
        gonio_cadera_extension_i:  [null],
        gonio_rodilla_flexion_i:   [null],
        gonio_rodilla_extension_i: [null],
        gonio_tarso_flexion_i:     [null],
        gonio_tarso_extension_i:   [null],
      }),

      diagnostico: this.fb.group({
        imagenes_diagnosticas: [''],
        diagnostico:           ['', Validators.required],  // campo pivot
        tratamiento:           [''],
        recomendaciones:       [''],
        proxima_cita:          [''],
      }),

      // ── Seguimiento ───────────────────────────────────────────────────────
      seguimiento: this.fb.group({
        numero_sesion:         [null, Validators.required],
        observaciones_en_casa: [''],
        ejercicios_realizados: [''],
        recomendaciones_casa:  [''],
        notas_clinicas:        [''],
      }),

      // ── Remisión ──────────────────────────────────────────────────────────
      remision: this.fb.group({
        motivo:               ['', Validators.required],
        texto_remision:       [''],
        especialidad_destino: [''],
        profesional_destino:  [''],
        institucion_destino:  [''],
      }),

      // ── Fórmula ───────────────────────────────────────────────────────────
      formula: this.fb.group({
        plan_terapeutico: [''],
      }),
    });

    // FormArray de medicamentos (en el nivel raíz para acceso fácil)
    this.form.addControl('medicamentos', this.fb.array([]));
    // Motivo de modificación (solo requerido en edición; los validators se activan en ngOnInit)
    this.form.addControl('motivo_modificacion', this.fb.control(''));
  }

  // ── Getters de sub-grupos ──────────────────────────────────────────────────
  get gGeneral()    { return this.form.get('general')    as FormGroup; }
  get gAnamnesis()  { return this.form.get('anamnesis')  as FormGroup; }
  get gValoracion() { return this.form.get('valoracion') as FormGroup; }
  get gPerimetria() { return this.form.get('perimetria') as FormGroup; }
  get gExploracion(){ return this.form.get('exploracion')as FormGroup; }
  get gGoniometria(){ return this.form.get('goniometria') as FormGroup; }
  get gDiagnostico(){ return this.form.get('diagnostico')as FormGroup; }
  get gSeguimiento(){ return this.form.get('seguimiento')as FormGroup; }
  get gRemision()   { return this.form.get('remision')   as FormGroup; }
  get gFormula()    { return this.form.get('formula')    as FormGroup; }

  get tipoActual(): TipoDocumento {
    return this.gGeneral.get('tipo_documento')!.value;
  }

  // ── Unlock progresivo para valoración inicial ─────────────────────────────
  /** Paso 1: paciente seleccionado */
  get canAnamnesis(): boolean {
    return !!this.gGeneral.get('id_mascota')?.value;
  }
  /** Paso 2: anamnesis (descripción) completada */
  get canValoracion(): boolean {
    return this.canAnamnesis && !!this.gAnamnesis.get('anamnesis')?.value?.trim();
  }
  /** Paso 3: valoración estática completada */
  get canPerimetria(): boolean {
    return this.canValoracion && !!this.gValoracion.get('valoracion_estatica')?.value?.trim();
  }
  /** Paso 4: perimetría registrada (sin campo requerido, se habilita junto con paso 3) */
  get canExploracion(): boolean {
    return this.canPerimetria;
  }
  /** Paso 5: diagnóstico requiere haber pasado por exploración */
  get canDiagnostico(): boolean {
    return this.canExploracion;
  }

  get medicamentosArray(): FormArray {
    return this.form.get('medicamentos') as FormArray;
  }

  newMedicamento(): FormGroup {
    const group = this.fb.group({
      medicamento:   ['', Validators.required],
      dosis:         [''],
      frecuencia:    [''],
      duracion:      [''],
      cantidad:      [''],
      instrucciones: [''],
    });

    group.get('medicamento')?.valueChanges.subscribe((value) => {
      this.updateMedicamentosFiltrados(String(value || ''));
    });

    return group;
  }

  private loadMedicamentosSugeridos(): void {
    this.historiaService.getMedicamentosSugeridos().subscribe({
      next: (response) => {
        const medicamentos = Array.isArray(response?.data) ? response.data : [];
        this.medicamentosSugeridos.set(medicamentos);
        this.updateMedicamentosFiltrados('');
      },
      error: () => {
        this.medicamentosSugeridos.set([]);
        this.medicamentosFiltrados.set([]);
      }
    });
  }

  updateMedicamentosFiltrados(rawSearch: string): void {
    const search = String(rawSearch || '').trim().toLowerCase();
    const source = this.medicamentosSugeridos();

    if (!search) {
      this.medicamentosFiltrados.set(source);
      return;
    }

    this.medicamentosFiltrados.set(
      source.filter((medicamento) => String(medicamento || '').toLowerCase().includes(search))
    );
  }

  addMedicamento(): void {
    if (this.isTipoBloqueado(this.tipoActual)) return;
    this.medicamentosArray.push(this.newMedicamento());
  }

  removeMedicamento(i: number): void {
    if (this.isTipoBloqueado(this.tipoActual)) return;
    this.medicamentosArray.removeAt(i);
  }

  private parseFrecuenciaPorDia(text: string): number | null {
    const raw = String(text || '').toLowerCase().trim();
    if (!raw) return null;

    const cadaHoras = raw.match(/cada\s+(\d+(?:[.,]\d+)?)\s*(h|hs|hora|horas)/i);
    if (cadaHoras) {
      const v = Number(cadaHoras[1].replace(',', '.'));
      if (v > 0) return 24 / v;
    }

    const cadaDias = raw.match(/cada\s+(\d+(?:[.,]\d+)?)\s*(dia|dias|d[ií]a|d[ií]as)/i);
    if (cadaDias) {
      const v = Number(cadaDias[1].replace(',', '.'));
      if (v > 0) return 1 / v;
    }

    const vecesDia = raw.match(/(\d+(?:[.,]\d+)?)\s*veces?\s*(al\s*)?(dia|d[ií]a)/i);
    if (vecesDia) {
      const v = Number(vecesDia[1].replace(',', '.'));
      if (v > 0) return v;
    }

    if (/una\s+vez\s+(al\s*)?(dia|d[ií]a)/i.test(raw)) return 1;
    return null;
  }

  private parseDuracionDias(text: string): number | null {
    const raw = String(text || '').toLowerCase().trim();
    if (!raw) return null;

    const m = raw.match(/(\d+(?:[.,]\d+)?)\s*(hora|horas|h|hs|dia|dias|d[ií]a|d[ií]as|semana|semanas|mes|meses)/i);
    if (!m) return null;

    const value = Number(m[1].replace(',', '.'));
    if (!(value > 0)) return null;

    const unit = m[2];
    if (/hora|horas|h|hs/.test(unit)) return value / 24;
    if (/semana|semanas/.test(unit)) return value * 7;
    if (/mes|meses/.test(unit)) return value * 30;
    return value;
  }

  getCantidadSugerida(med: FormGroup): string {
    const frecuencia = String(med.get('frecuencia')?.value ?? '').trim();
    const duracion = String(med.get('duracion')?.value ?? '').trim();
    if (!frecuencia || !duracion) return '';

    const porDia = this.parseFrecuenciaPorDia(frecuencia);
    const dias = this.parseDuracionDias(duracion);
    if (!porDia || !dias) return '';

    const tomas = Math.ceil(porDia * dias);
    if (!(tomas > 0)) return '';
    return `Sugerido: ${tomas} tomas (puedes ajustar la cantidad total manualmente)`;
  }

  resetChildFields(): void {
    // No hace nada especial; la UI muestra/oculta secciones
  }

  /**
   * Habilita solo los FormGroups del tipo activo y deshabilita los demás.
   * Los grupos deshabilitados son ignorados por form.invalid (validators inactivos).
   */
  private syncGroupsToTipo(tipo: TipoDocumento): void {
    const byTipo: Record<string, string[]> = {
      valoracion_inicial: ['anamnesis','valoracion','perimetria','goniometria','exploracion','diagnostico'],
      seguimiento:        ['seguimiento'],
      formula:            ['formula'],
      remision:           ['remision'],
    };
    const active = new Set(byTipo[tipo] ?? []);
    const tipoBloqueado = this.isTipoBloqueado(tipo);
    ['anamnesis','valoracion','perimetria','goniometria','exploracion','diagnostico',
     'seguimiento','formula','remision'].forEach(g => {
      const ctrl = this.form.get(g);
      if (!ctrl) return;
      (active.has(g) && !tipoBloqueado)
        ? ctrl.enable({ emitEvent: false })
        : ctrl.disable({ emitEvent: false });
    });

    const puedeEditarMedicamentos = !tipoBloqueado && active.has('formula');
    puedeEditarMedicamentos
      ? this.medicamentosArray.enable({ emitEvent: false })
      : this.medicamentosArray.disable({ emitEvent: false });
  }

  // ─── Load data ──────────────────────────────────────────────────────────────

  loadMascotas(): void {
    this.pacientesService.getMascotas(1, 500).subscribe({
      next: (res) => {
        const lista = (res?.data?.pacientes ?? []).map((m: any) => ({
          id_mascota:        m.id_mascota,
          nombre:            m.nombre,
          especie:           m.especie,
          raza:              m.raza,
          sexo:              m.sexo,
          peso:              m.peso,
          fecha_nacimiento:  m.fecha_nacimiento,
          esterilizado:      m.esterilizado,
          color:             m.color,
          cliente_nombre:    m.cliente?.nombre ?? '',
          cliente_cedula:    m.cliente?.cedula ?? '',
          cliente_telefono:  m.cliente?.telefono ?? '',
          cliente_email:     m.cliente?.email ?? '',
          cliente_direccion: m.cliente?.direccion ?? '',
        }));
        this.mascotas.set(lista);
        this.mascotasFiltradas.set(lista);
        const selectedId = this.gGeneral.get('id_mascota')?.value;
        if (selectedId) {
          const found = lista.find((m: any) => m.id_mascota === selectedId);
          if (found) this.pacienteSearchCtrl.setValue(found, { emitEvent: false });
        }
      },
      error: () => {
        this.mascotas.set([]);
        this.mascotasFiltradas.set([]);
      }
    });
  }

  private filtrarMascotas(term: string): void {
    const query = String(term || '').trim().toLowerCase();
    const source = this.mascotas();
    if (!query) {
      this.mascotasFiltradas.set(source);
      return;
    }

    const filtered = source.filter((m) => {
      const mascota = String(m.nombre || '').toLowerCase();
      const especie = String(m.especie || '').toLowerCase();
      const propietario = String(m.cliente_nombre || '').toLowerCase();
      return mascota.includes(query) || especie.includes(query) || propietario.includes(query);
    });

    this.mascotasFiltradas.set(filtered);
  }

  displayMascota = (m: any): string => {
    if (!m || typeof m === 'string') return '';
    return `${m.nombre} (${m.especie}) — ${m.cliente_nombre}`;
  };

  onPacienteSelected(m: any): void {
    if (!m?.id_mascota) return;
    this.gGeneral.get('id_mascota')?.setValue(m.id_mascota);
  }

  calcularEdad(fechaNacimiento: string | null): string {
    if (!fechaNacimiento) return 'No disponible';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    const años = hoy.getFullYear() - nac.getFullYear();
    const meses = hoy.getMonth() - nac.getMonth() + años * 12;
    if (meses < 24) return `${meses} meses`;
    return `${Math.floor(meses / 12)} años`;
  }

  formatSexo(sexo: string | null | undefined): string {
    if (!sexo) return 'No disponible';
    const s = String(sexo).trim().toLowerCase();
    if (s === 'm' || s === 'macho') return 'Macho';
    if (s === 'h' || s === 'hembra') return 'Hembra';
    return sexo;
  }

  loadVeterinarios(): void {
    this.citasService.getVeterinarios().subscribe({
      next: (res) => this.veterinarios.set(res?.data ?? []),
      error: () => this.veterinarios.set([])
    });
  }

  loadHistoria(id: string): void {
    this.loading.set(true);
    this.historiaService.getHistoriaById(id).subscribe({
      next: (res) => {
        const h = res.data;
        const d = h.datos ?? {} as any;
        this.originalTipoDocumento.set(h.tipo_documento as TipoDocumento);
        // Parchar cada sub-grupo por separado
        this.gGeneral.patchValue({
          tipo_documento: h.tipo_documento,
          id_mascota:     h.id_mascota,
          id_veterinario: h.id_veterinario,
          estado:         h.estado,
          id_cita:        h.id_cita ?? '',
        });
        // Set mascota info panel (mascotas may not be loaded yet; retry after)
        const setMascota = () => {
          const found = this.mascotas().find(m => m.id_mascota === h.id_mascota) ?? null;
          this.mascotaSeleccionada.set(found);
        };
        if (this.mascotas().length > 0) {
          setMascota();
        } else {
          // Wait for mascotas to load
          const interval = setInterval(() => {
            if (this.mascotas().length > 0) { setMascota(); clearInterval(interval); }
          }, 200);
        }
        // Parchar los grupos de detalle según tipo
        if (h.tipo_documento === 'valoracion_inicial') {
          this.gAnamnesis.patchValue(d);
          this.gValoracion.patchValue(d);
          this.gPerimetria.patchValue(d);
          // Goniometría: el backend almacena como JSONB, remapear claves
          if (d.goniometria && typeof d.goniometria === 'object') {
            const g = d.goniometria as Record<string, any>;
            this.gGoniometria.patchValue({
              gonio_hombro_flexion_d:    g['hombro_flexion_d'],
              gonio_hombro_extension_d:  g['hombro_extension_d'],
              gonio_codo_flexion_d:      g['codo_flexion_d'],
              gonio_codo_extension_d:    g['codo_extension_d'],
              gonio_carpo_flexion_d:     g['carpo_flexion_d'],
              gonio_carpo_extension_d:   g['carpo_extension_d'],
              gonio_hombro_flexion_i:    g['hombro_flexion_i'],
              gonio_hombro_extension_i:  g['hombro_extension_i'],
              gonio_codo_flexion_i:      g['codo_flexion_i'],
              gonio_codo_extension_i:    g['codo_extension_i'],
              gonio_carpo_flexion_i:     g['carpo_flexion_i'],
              gonio_carpo_extension_i:   g['carpo_extension_i'],
              gonio_cadera_flexion_d:    g['cadera_flexion_d'],
              gonio_cadera_extension_d:  g['cadera_extension_d'],
              gonio_rodilla_flexion_d:   g['rodilla_flexion_d'],
              gonio_rodilla_extension_d: g['rodilla_extension_d'],
              gonio_tarso_flexion_d:     g['tarso_flexion_d'],
              gonio_tarso_extension_d:   g['tarso_extension_d'],
              gonio_cadera_flexion_i:    g['cadera_flexion_i'],
              gonio_cadera_extension_i:  g['cadera_extension_i'],
              gonio_rodilla_flexion_i:   g['rodilla_flexion_i'],
              gonio_rodilla_extension_i: g['rodilla_extension_i'],
              gonio_tarso_flexion_i:     g['tarso_flexion_i'],
              gonio_tarso_extension_i:   g['tarso_extension_i'],
            });
          }
          this.gExploracion.patchValue(d);
          // Reflejos (stored as JSONB, remap keys to form controls)
          if (d.reflejos && typeof d.reflejos === 'object') {
            const r = d.reflejos as Record<string, any>;
            this.gExploracion.patchValue({
              reflejo_tricipital_d:     r['tricipital_d'],
              reflejo_tricipital_i:     r['tricipital_i'],
              reflejo_flexor_tor_d:     r['flexor_tor_d'],
              reflejo_flexor_tor_i:     r['flexor_tor_i'],
              reflejo_patelar_d:        r['patelar_d'],
              reflejo_patelar_i:        r['patelar_i'],
              reflejo_tibial_craneal_d: r['tibial_craneal_d'],
              reflejo_tibial_craneal_i: r['tibial_craneal_i'],
              reflejo_ciatico_d:        r['ciatico_d'],
              reflejo_ciatico_i:        r['ciatico_i'],
              reflejo_flexor_pelv_d:    r['flexor_pelv_d'],
              reflejo_flexor_pelv_i:    r['flexor_pelv_i'],
              observaciones_palpacion:  r['observaciones_palpacion'],
            });
          }
          this.gDiagnostico.patchValue(d);
        } else if (h.tipo_documento === 'seguimiento') {
          this.gSeguimiento.patchValue({
            ...d,
            ejercicios_realizados: this.extraerOtrosEjerciciosSeguimiento(d?.ejercicios_realizados),
          });
          this.hidratarChecklistSeguimiento(d?.ejercicios_realizados);
        } else if (h.tipo_documento === 'formula') {
          this.gFormula.patchValue({});
          if (Array.isArray(d.medicamentos)) {
            d.medicamentos.forEach((m: any) => {
              const med = this.newMedicamento();
              med.patchValue({
                medicamento: m?.medicamento ?? m?.nombre ?? '',
                dosis: m?.dosis ?? '',
                frecuencia: m?.frecuencia ?? '',
                duracion: m?.duracion ?? '',
                cantidad: m?.cantidad ?? '',
                instrucciones: m?.instrucciones ?? '',
              });
              this.medicamentosArray.push(med);
            });
          }
        } else if (h.tipo_documento === 'remision') {
          this.gRemision.patchValue(d);
        }

        if (this.isEdit()) {
          // Evita transformar un documento de un tipo a otro al editar.
          this.gGeneral.get('tipo_documento')?.disable({ emitEvent: false });
        }

        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Error cargando historia', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  guardar(): void {
    if (!this.isEdit() && this.isTipoBloqueado(this.tipoActual)) {
      this.snackBar.open(
        `Este tipo de documento ya existe para la cita y está bloqueado. Usa otro tipo o abre el existente.`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Auto-expandir el panel Diagnóstico si tiene errores
      if (this.tipoActual === 'valoracion_inicial' && this.gDiagnostico.invalid) {
        this.expandDiagnostico.set(true);
      }
      this.snackBar.open('Completa todos los campos requeridos antes de guardar', 'Cerrar', { duration: 4000 });
      return;
    }
    // En creación el estado siempre es Completado
    if (!this.isEdit()) {
      this.gGeneral.patchValue({ estado: 'Completado' });
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const obs = this.isEdit()
      ? this.historiaService.updateHistoria(this.historiaId()!, payload)
      : this.historiaService.createHistoria(payload as any);

    obs.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.savedSuccessfully = true;  // marca para que canDeactivate deje pasar
        this.form.markAsPristine();     // resetea dirty por si acaso
        const historiaId = res.data.id_historia;
        const files = this.imagenesDiagnosticasFiles();

        if (files.length > 0) {
          this.historiaService.uploadHistoriaArchivos(historiaId, files).subscribe({
            next: () => {
              this.snackBar.open(
                this.isEdit() ? 'Historia actualizada y archivos cargados' : 'Historia creada y archivos cargados',
                'Cerrar', { duration: 3000 }
              );
              this.imagenesDiagnosticasFiles.set([]);
              this.router.navigate(['/historia-clinica', historiaId]);
            },
            error: () => {
              this.snackBar.open(
                'Historia guardada, pero falló la carga de algunos archivos diagnósticos',
                'Cerrar', { duration: 4500 }
              );
              this.router.navigate(['/historia-clinica', historiaId]);
            }
          });
          return;
        }

        this.snackBar.open(
          this.isEdit() ? 'Historia actualizada' : 'Historia creada correctamente',
          'Cerrar', { duration: 3000 }
        );
        this.router.navigate(['/historia-clinica', historiaId]);
      },
      error: (err) => {
        this.saving.set(false);
        const duplicateCode = err?.error?.code;
        const existingId = err?.error?.data?.existing?.id_historia;

        if (err?.status === 409 && duplicateCode === 'DUPLICATE_HISTORIA_BY_APPOINTMENT_TYPE' && existingId) {
          const goEdit = window.confirm(
            `${err?.error?.message ?? 'Ya existe un documento de este tipo para la cita.'}\n\n¿Deseas abrir el documento existente en modo edición?`
          );

          if (goEdit) {
            this.form.markAsPristine();
            this.router.navigate(['/historia-clinica', existingId, 'editar'], {
              queryParams: { from: 'cita', id_cita: this.gGeneral.get('id_cita')?.value || undefined }
            });
            return;
          }

          this.snackBar.open('No se creó un duplicado. Puedes cambiar el tipo de documento o editar el existente.', 'Cerrar', {
            duration: 5000
          });
          return;
        }

        this.snackBar.open(err?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  buildPayload(): any {
    const g  = this.gGeneral.getRawValue();
    const tipo: TipoDocumento = (this.isEdit()
      ? (this.originalTipoDocumento() ?? g.tipo_documento)
      : g.tipo_documento) as TipoDocumento;
    const base: any = {
      tipo_documento: tipo,
      id_mascota:     g.id_mascota,
      id_veterinario: g.id_veterinario,
      estado:         g.estado,
      id_cita:        g.id_cita || undefined,
    };

    // Motivo de modificación (edición)
    if (this.isEdit()) {
      base.motivo_modificacion = this.form.get('motivo_modificacion')?.value ?? null;
    }

    if (tipo === 'valoracion_inicial') {
      const a   = this.gAnamnesis.value;
      const val = this.gValoracion.value;
      const per = this.gPerimetria.value;
      const gon = this.gGoniometria.value;
      const exp = this.gExploracion.value;
      const dx  = this.gDiagnostico.value;
      Object.assign(base, { ...a, ...val, ...per, ...gon, ...exp, ...dx });
    } else if (tipo === 'seguimiento') {
      const seg = { ...this.gSeguimiento.value };
      seg.ejercicios_realizados = this.construirTextoEjerciciosSeguimiento(seg.ejercicios_realizados);
      Object.assign(base, seg);
    } else if (tipo === 'formula') {
      Object.assign(base, {
        medicamentos:     this.form.value.medicamentos,
      });
    } else if (tipo === 'remision') {
      Object.assign(base, this.gRemision.value);
    }
    return base;
  }

  onImagenesDiagnosticasSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const allowedExt = /\.(jpg|jpeg|png|gif|webp|pdf|txt|xls|xlsx)$/i;
    const valid = files.filter(f => allowedExt.test(f.name));

    if (valid.length !== files.length) {
      this.snackBar.open('Algunos archivos se omitieron por formato no permitido', 'Cerrar', { duration: 3000 });
    }

    const merged = [...this.imagenesDiagnosticasFiles(), ...valid];
    this.imagenesDiagnosticasFiles.set(merged.slice(0, 10));
    input.value = '';
  }

  removeImagenDiagnostica(index: number): void {
    const files = [...this.imagenesDiagnosticasFiles()];
    files.splice(index, 1);
    this.imagenesDiagnosticasFiles.set(files);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx++;
    }
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`;
  }

  cancelar(): void {
    // Marcamos el formulario como pristine para que el guard no intercepte
    // esta navegación intencional del usuario
    this.form.markAsPristine();

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    const idCitaFromQuery = this.route.snapshot.queryParamMap.get('id_cita');
    const idCitaFromForm = this.gGeneral.get('id_cita')?.value;
    const idCita = idCitaFromQuery || idCitaFromForm;

    // Si la historia se abrió desde una cita, volver al detalle de esa cita.
    if (idCita) {
      this.router.navigate(['/citas', idCita]);
      return;
    }

    if (this.isEdit() && this.historiaId()) {
      this.router.navigate(['/historia-clinica', this.historiaId()]);
    } else {
      this.router.navigate(['/historia-clinica']);
    }
  }

  onToggleCategoriaEjercicios(tipo: EjercicioCategoriaKey, checked: boolean): void {
    if (this.isTipoBloqueado(this.tipoActual)) return;

    const nextActivas = { ...this.ejerciciosCategoriasActivas(), [tipo]: checked };
    this.ejerciciosCategoriasActivas.set(nextActivas);

    if (!checked) {
      const nextSel = { ...this.ejerciciosSeleccionados(), [tipo]: [] };
      this.ejerciciosSeleccionados.set(nextSel);
      if (tipo === 'agentes') {
        this.zonasAgentes.set({});
      }
    }
  }

  onToggleEjercicio(tipo: EjercicioCategoriaKey, ejercicio: string, checked: boolean): void {
    if (this.isTipoBloqueado(this.tipoActual)) return;

    const source = this.ejerciciosSeleccionados()[tipo] ?? [];
    const nextByTipo = checked ? [...source, ejercicio] : source.filter((e) => e !== ejercicio);
    const next = { ...this.ejerciciosSeleccionados(), [tipo]: nextByTipo };
    this.ejerciciosSeleccionados.set(next);

    if (tipo === 'agentes' && !checked) {
      const zonas = { ...this.zonasAgentes() };
      delete zonas[ejercicio];
      this.zonasAgentes.set(zonas);
    }
  }

  isEjercicioSeleccionado(tipo: EjercicioCategoriaKey, ejercicio: string): boolean {
    return (this.ejerciciosSeleccionados()[tipo] ?? []).includes(ejercicio);
  }

  onZonaAgenteChange(ejercicio: string, value: string): void {
    if (this.isTipoBloqueado(this.tipoActual)) return;

    const zonas = { ...this.zonasAgentes(), [ejercicio]: String(value || '').trim() };
    this.zonasAgentes.set(zonas);
  }

  getZonaAgente(ejercicio: string): string {
    return this.zonasAgentes()[ejercicio] ?? '';
  }

  private construirTextoEjerciciosSeguimiento(otrosEjercicios: string): string {
    const bloques: string[] = [];

    this.ejerciciosChecklistConfig.forEach((cfg) => {
      const selected = this.ejerciciosSeleccionados()[cfg.key] ?? [];
      if (this.ejerciciosCategoriasActivas()[cfg.key] && selected.length) {
        if (cfg.key === 'agentes') {
          const conZona = selected.map((e) => {
            const zona = this.getZonaAgente(e);
            return zona ? `${e} (zona: ${zona})` : e;
          });
          bloques.push(`${cfg.label}: ${conZona.join(', ')}`);
        } else {
          bloques.push(`${cfg.label}: ${selected.join(', ')}`);
        }
      }
    });

    const otros = this.extraerOtrosEjerciciosSeguimiento(otrosEjercicios);
    if (otros) bloques.push(`Otros: ${otros}`);

    return bloques.join('\n');
  }

  private hidratarChecklistSeguimiento(rawEjercicios: string): void {
    const raw = String(rawEjercicios || '').toLowerCase();
    if (!raw) {
      this.ejerciciosCategoriasActivas.set({
        calentamiento: false,
        fortalecimiento: false,
        hidroterapia: false,
        pasivos: false,
        agentes: false,
      });
      this.ejerciciosSeleccionados.set({
        calentamiento: [],
        fortalecimiento: [],
        hidroterapia: [],
        pasivos: [],
        agentes: [],
      });
      return;
    }

    const nextActivas: Record<EjercicioCategoriaKey, boolean> = {
      calentamiento: false,
      fortalecimiento: false,
      hidroterapia: false,
      pasivos: false,
      agentes: false,
    };

    const nextSel: Record<EjercicioCategoriaKey, string[]> = {
      calentamiento: [],
      fortalecimiento: [],
      hidroterapia: [],
      pasivos: [],
      agentes: [],
    };

    const nextZonas: Record<string, string> = {};

    this.ejerciciosChecklistConfig.forEach((cfg) => {
      if (cfg.key !== 'agentes') {
        const selected = cfg.ejercicios.filter((e) => raw.includes(e.toLowerCase()));
        nextSel[cfg.key] = selected;
        nextActivas[cfg.key] = selected.length > 0;
        return;
      }

      const selectedAgentes: string[] = [];
      cfg.ejercicios.forEach((e) => {
        const escaped = e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`${escaped}(?:\\s*\\(zona:\\s*([^\\)]+)\\))?`, 'i');
        const match = raw.match(re);
        if (!match) return;
        selectedAgentes.push(e);
        if (match[1]) nextZonas[e] = match[1].trim();
      });

      nextSel[cfg.key] = selectedAgentes;
      nextActivas[cfg.key] = selectedAgentes.length > 0;
    });

    this.ejerciciosSeleccionados.set(nextSel);
    this.ejerciciosCategoriasActivas.set(nextActivas);
    this.zonasAgentes.set(nextZonas);
  }

  private extraerOtrosEjerciciosSeguimiento(rawValue: string): string {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const otrosParts: string[] = [];
    let leyendoOtros = false;

    for (const line of lines) {
      const otrosMatch = line.match(/^otros\s*:\s*(.*)$/i);
      if (otrosMatch) {
        leyendoOtros = true;
        const contenido = otrosMatch[1]?.trim();
        if (contenido) otrosParts.push(contenido);
        continue;
      }

      const esLineaConEtiqueta = /^[^:]{2,}:\s*/.test(line);
      if (leyendoOtros && !esLineaConEtiqueta) {
        otrosParts.push(line);
      }
    }

    if (otrosParts.length) return otrosParts.join('\n').trim();

    // Compatibilidad con registros antiguos que guardaban solo texto libre.
    const tieneLineasEtiquetadas = lines.some((line) => /^[^:]{2,}:\s*/.test(line));
    return tieneLineasEtiquetadas ? '' : raw;
  }
}
