import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

// FullCalendar imports
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

import { CitasService } from '../../services/citas.service';
import { ExportService, ExportOptions } from '../../services/export.service';
import { AuthService } from '../../services/auth.service';
import { ConfiguracionService, DiaEspecial } from '../../services/configuracion.service';
import { ExportDialogComponent } from './export-dialog.component';
import {
  Cita,
  CitaFilter,
  CitaStats,
  TIPOS_CITA,
  ESTADOS_CITA,
  CalendarView
} from '../../models/cita.interface';

@Component({
  selector: 'app-citas',
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
    MatTabsModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonToggleModule,
    FullCalendarModule
  ],
  templateUrl: './citas.component.html',
  styleUrl: './citas.component.css'
})
export class CitasComponent implements OnInit, OnDestroy, AfterViewInit {
  // ViewChild para acceder al calendario
  @ViewChild('calendar') calendarComponent: any;
  @ViewChild('dayCalendar') dayCalendarComponent: any;
  private resizeObserver?: ResizeObserver;

  // Signals para estado reactivo
  loading = signal(false);
  syncing = signal(false);
  stats = signal<CitaStats | null>(null);
  citas = signal<Cita[]>([]);
  veterinarios = signal<any[]>([]);
  currentView = signal<string>('timeGridFiveDay');
  currentCalendarDate = signal<Date>(new Date());

  // Signal para controlar si mostrar el botón de sincronización manual
  showManualSyncButton = signal(true);
  diasEspeciales = signal<DiaEspecial[]>([]);

  // Signal para controlar el modo de vista (plana vs calendario)
  viewMode = signal<'plana' | 'calendario'>('plana');
  selectedDate = signal<Date>(new Date());
  showCompletedToday = signal(false);

  // Timestamp de cuando se carga la vista
  private viewLoadTime: number = 0;  // Formulario de filtros
  private dashboardStartDate: string | null = null;
  private dashboardEndDate: string | null = null;
  private dashboardFocus: 'dia' | 'semana' | null = null;

  filterForm: FormGroup;

  // Constantes
  tiposCita = TIPOS_CITA;
  estadosCita = ESTADOS_CITA;

  // Opciones del calendario
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridFiveDay',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridFiveDay,timeGridDay'
    },
    views: {
      timeGridFiveDay: {
        type: 'timeGrid',
        duration: { days: 5 },
        buttonText: 'Semana',
        dayHeaderFormat: { weekday: 'short', day: 'numeric' }
      },
      timeGridDay: {
        dayHeaders: false
      }
    },
    // Semana inicia en lunes para evitar encabezados desalineados por día actual.
    firstDay: 1,
    height: 'auto', // Cambiar a auto para que se ajuste automáticamente
    contentHeight: 'auto',
    aspectRatio: 1.35, // Ratio más amplio para mejor visualización
    editable: true,
    selectable: true,
    selectMirror: true,
    dateClick: this.handleDateClick.bind(this),
    dayMaxEvents: false, // Mostrar todos los eventos sin scroll
    weekends: true,
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      startTime: '07:00',
      endTime: '18:00'
    },
    slotMinTime: '07:00:00', // Rango base: 7 AM
    slotMaxTime: '18:00:00', // Rango base: 6 PM
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00', // Mostrar etiquetas cada hora
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit',
      omitZeroMinute: false,
      hour12: true,
      meridiem: 'short'
    },
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    nowIndicator: true,
    now: new Date(),
    scrollTime: '07:00:00', // Scroll automático a las 7 AM al cargar
    allDaySlot: false, // Ocultar slot de "todo el día" para ahorrar espacio
    expandRows: true, // Expandir filas para usar todo el espacio
    stickyHeaderDates: true, // Mantener fechas fijas al hacer scroll
    navLinks: true,
    navLinkDayClick: this.handleDayHeaderClick.bind(this),
    validRange: {
      start: '2020-01-01',
      end: '2030-12-31'
    },
    selectAllow: this.isCalendarSlotSelectable.bind(this),
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    dayCellClassNames: this.getDayCellClassNames.bind(this),
    dayHeaderClassNames: this.getDayHeaderClassNames.bind(this),
    dayCellDidMount: this.onDayCellDidMount.bind(this),
    dayHeaderDidMount: this.onDayHeaderDidMount.bind(this),
    datesSet: this.onCalendarDatesSet.bind(this),
    events: [],
    eventContent: this.renderEventContent.bind(this),
    // Configuraciones específicas para timeGrid
    dayHeaderFormat: { weekday: 'short' },
    slotEventOverlap: true, // Permitir visualizar eventos solapados
    eventMaxStack: 4,
    eventMinHeight: 20,
    eventShortHeight: 16
  };

  dayCalendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridDay',
    initialDate: new Date(),
    locale: esLocale,
    headerToolbar: false,
    height: 'auto',
    contentHeight: 'auto',
    allDaySlot: false,
    dayHeaders: false,
    nowIndicator: true,
    editable: false,
    selectable: false,
    dateClick: this.handleDateClick.bind(this),
    slotMinTime: '07:00:00',
    slotMaxTime: '18:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    slotEventOverlap: true,
    eventMaxStack: 4,
    eventMinHeight: 20,
    eventShortHeight: 16,
    events: [],
    dayCellClassNames: this.getDayCellClassNames.bind(this),
    dayHeaderClassNames: this.getDayHeaderClassNames.bind(this),
    dayCellDidMount: this.onDayCellDidMount.bind(this),
    dayHeaderDidMount: this.onDayHeaderDidMount.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventContent: this.renderEventContent.bind(this)
  };

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private fb: FormBuilder,
    private citasService: CitasService,
    private exportService: ExportService,
    private authService: AuthService,
    private configuracionService: ConfiguracionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.filterForm = this.fb.group({
      id_veterinario: [''],
      estado: [''],
      tipo: ['']
    });
  }

  ngOnInit(): void {
    this.viewLoadTime = Date.now();

    const query = this.route.snapshot.queryParamMap;

    this.dashboardStartDate = query.get('fecha_inicio');
    this.dashboardEndDate = query.get('fecha_fin');
    const foco = query.get('foco');
    this.dashboardFocus = foco === 'dia' || foco === 'semana' ? foco : null;
    const estado = query.get('estado');

    if (estado) {
      this.filterForm.patchValue({ estado });
    }

    // Verificar si se solicita vista de calendario desde URL
    if (query.get('view') === 'calendario') {
      this.viewMode.set('calendario');

      if (this.dashboardFocus === 'dia') {
        this.currentView.set('timeGridDay');
        this.calendarOptions = {
          ...this.calendarOptions,
          initialView: 'timeGridDay'
        };
      } else if (this.dashboardFocus === 'semana') {
        this.currentView.set('timeGridFiveDay');
        this.calendarOptions = {
          ...this.calendarOptions,
          initialView: 'timeGridFiveDay'
        };
      }

      // Aplicar clase al body para ocultar sidebar cuando estamos en modo calendario
      document.body.classList.add('fullscreen-calendar-mode');
    }

    // Defer initial load to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadInitialData();
      this.loadDiasEspeciales();
      this.loadCalendarEvents();
      this.loadStats();
      this.setupFilters();

      // Check if we need to refresh due to query param
      this.checkForRefreshParam();
    });

    // Listen for browser navigation events to refresh calendar
    window.addEventListener('focus', () => {
      // Refresh calendar when window regains focus (user comes back from details)
      this.refreshCalendar();
    });
  }

  ngAfterViewInit(): void {
    this.setupCalendarAutoResize();
  }

  private checkForRefreshParam(): void {
    // Check if refresh query param is present
    const refresh = this.router.url.includes('refresh=true');
    if (refresh) {
      this.refreshCalendar();
      // Clean up the URL
      this.router.navigate(['/citas'], { replaceUrl: true });
    }
  }

  private loadInitialData(): void {
    this.loadVeterinarios();
  }

  private loadDiasEspeciales(): void {
    this.configuracionService.getDiasEspeciales().subscribe({
      next: (dias) => {
        this.diasEspeciales.set((dias || []).filter((d) => d?.activo !== false));
        this.refreshCalendarDecorators();
        this.updateToolbarSpecialBadge();
      },
      error: (error) => {
        console.warn('No fue posible cargar días especiales para calendario:', error);
        this.diasEspeciales.set([]);
        this.refreshCalendarDecorators();
        this.updateToolbarSpecialBadge();
      }
    });
  }

  private refreshCalendarDecorators(): void {
    this.calendarOptions = {
      ...this.calendarOptions,
      dayCellClassNames: this.getDayCellClassNames.bind(this),
      dayHeaderClassNames: this.getDayHeaderClassNames.bind(this),
      dayCellDidMount: this.onDayCellDidMount.bind(this),
      dayHeaderDidMount: this.onDayHeaderDidMount.bind(this)
    };

    this.dayCalendarOptions = {
      ...this.dayCalendarOptions,
      dayCellClassNames: this.getDayCellClassNames.bind(this),
      dayHeaderClassNames: this.getDayHeaderClassNames.bind(this),
      dayCellDidMount: this.onDayCellDidMount.bind(this),
      dayHeaderDidMount: this.onDayHeaderDidMount.bind(this)
    };

    this.applyCalendarEventLayers();
    this.queueCalendarResize();
  }

  private onCalendarDatesSet(arg: any): void {
    if (arg?.view?.type) {
      this.currentView.set(arg.view.type);
    }
    if (arg?.view?.currentStart instanceof Date) {
      this.currentCalendarDate.set(new Date(arg.view.currentStart));
    }

    this.updateToolbarSpecialBadge();
  }

  private updateToolbarSpecialBadge(): void {
    setTimeout(() => {
      const calendarApi = this.calendarComponent?.getApi?.();
      const root = calendarApi?.el as HTMLElement | undefined;
      if (!root) return;

      const titleEl = root.querySelector('.fc-toolbar-title');
      if (!titleEl) return;

      titleEl.querySelectorAll('.calendar-toolbar-special').forEach((el) => el.remove());

      const dia = this.getCurrentCalendarSpecial();
      if (!dia) return;

      const badge = document.createElement('span');
      badge.className = 'calendar-toolbar-special';
      badge.textContent = this.getCurrentCalendarSpecialLabel();
      titleEl.appendChild(badge);
    }, 0);
  }

  private getDateYmd(value: Date): string {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private normalizeDiaEspecialDate(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      const ymdMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
      return ymdMatch ? ymdMatch[1] : null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this.getDateYmd(value);
    }

    return null;
  }

  private getSpecialDaysForDate(date: Date): DiaEspecial[] {
    const ymd = this.getDateYmd(date);
    const items = this.diasEspeciales();
    if (!items || items.length === 0) return [];

    const priority: Record<string, number> = {
      no_laborable: 0,
      horario_especial: 1,
      ausencia: 2,
      cumpleanos: 3,
      festivo: 4
    };

    return items
      .filter((d) => this.normalizeDiaEspecialDate(d.fecha) === ymd)
      .sort((a, b) => (priority[a.tipo] ?? 99) - (priority[b.tipo] ?? 99));
  }

  private getSpecialDayForDate(date: Date): DiaEspecial | null {
    return this.getSpecialDaysForDate(date)[0] || null;
  }

  private parseHmToMinutes(value: string): number | null {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private timeToMinutes(value: Date): number {
    return value.getHours() * 60 + value.getMinutes();
  }

  private getHorarioEspecialForDate(date: Date): DiaEspecial | null {
    return this.getSpecialDaysForDate(date).find((d) => d.tipo === 'horario_especial') || null;
  }

  private buildNotAllowedRangeOverlays(startDate: Date, endDate: Date): EventInput[] {
    const overlays: EventInput[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const endBoundary = new Date(endDate);
    endBoundary.setHours(23, 59, 59, 999);

    while (cursor <= endBoundary) {
      const current = new Date(cursor);
      const ymd = this.getDateYmd(current);
      const dias = this.getSpecialDaysForDate(current);

      const noLaborable = dias.find((d) => d.tipo === 'no_laborable');
      if (noLaborable) {
        overlays.push({
          id: `overlay-no-laborable-${ymd}`,
          start: `${ymd}T00:00:00`,
          end: `${ymd}T23:59:59`,
          display: 'background',
          classNames: ['overlay-not-allowed', 'overlay-no-laborable'],
          extendedProps: { overlayType: 'no_laborable' }
        });

        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const horario = dias.find((d) => d.tipo === 'horario_especial');
      if (horario) {
        const allowedStart = this.parseHmToMinutes(horario.horario_especial?.hora_inicio || '');
        const allowedEnd = this.parseHmToMinutes(horario.horario_especial?.hora_fin || '');

        if (allowedStart !== null && allowedEnd !== null) {
          const startHour = String(Math.floor(allowedStart / 60)).padStart(2, '0');
          const startMinute = String(allowedStart % 60).padStart(2, '0');
          const endHour = String(Math.floor(allowedEnd / 60)).padStart(2, '0');
          const endMinute = String(allowedEnd % 60).padStart(2, '0');

          overlays.push({
            id: `overlay-horario-early-${ymd}`,
            start: `${ymd}T00:00:00`,
            end: `${ymd}T${startHour}:${startMinute}:00`,
            display: 'background',
            classNames: ['overlay-not-allowed', 'overlay-horario-especial'],
            extendedProps: { overlayType: 'horario_especial' }
          });

          overlays.push({
            id: `overlay-horario-late-${ymd}`,
            start: `${ymd}T${endHour}:${endMinute}:00`,
            end: `${ymd}T23:59:59`,
            display: 'background',
            classNames: ['overlay-not-allowed', 'overlay-horario-especial'],
            extendedProps: { overlayType: 'horario_especial' }
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return overlays;
  }

  private getDateTimeBlockReason(start: Date, end?: Date): string | null {
    const ymd = this.getDateYmd(start);
    const dias = this.getSpecialDaysForDate(start);

    const noLaborable = dias.find((d) => d.tipo === 'no_laborable');
    if (noLaborable) {
      return `No se puede agendar en ${ymd} (día no laborable).`;
    }

    const horario = dias.find((d) => d.tipo === 'horario_especial');
    if (!horario) {
      return null;
    }

    const allowedStart = this.parseHmToMinutes(horario.horario_especial?.hora_inicio || '');
    const allowedEnd = this.parseHmToMinutes(horario.horario_especial?.hora_fin || '');
    if (allowedStart === null || allowedEnd === null) {
      return `No se puede agendar en ${ymd} por configuración de horario reducido.`;
    }

    const slotStart = this.timeToMinutes(start);
    const slotEnd = end ? this.timeToMinutes(end) : (slotStart + 60);
    if (slotStart < allowedStart || slotEnd > allowedEnd) {
      return `No se puede agendar fuera del horario permitido (${horario.horario_especial?.hora_inicio}-${horario.horario_especial?.hora_fin}) en ${ymd}.`;
    }

    return null;
  }

  private isCalendarSlotSelectable(selectInfo: any): boolean {
    const start = selectInfo?.start instanceof Date ? selectInfo.start : null;
    const end = selectInfo?.end instanceof Date ? selectInfo.end : null;
    if (!start) return false;
    return !this.getDateTimeBlockReason(start, end || undefined);
  }

  private getDayCellClassNames(arg: any): string[] {
    const dias = this.getSpecialDaysForDate(arg?.date);
    if (dias.length === 0) return [];
    return dias.map((d) => `dia-${d.tipo}`);
  }

  private getDayHeaderClassNames(arg: any): string[] {
    const dias = this.getSpecialDaysForDate(arg?.date);
    if (dias.length === 0) return [];
    return dias.map((d) => `dia-${d.tipo}`);
  }

  private getSpecialDayBadgeLabel(dia: DiaEspecial): string {
    if (dia.tipo === 'no_laborable') return 'NO LABORABLE';
    if (dia.tipo === 'horario_especial') return 'HORARIO REDUCIDO';
    if (dia.tipo === 'ausencia') return 'AUSENCIA';
    if (dia.tipo === 'cumpleanos') return 'CUMPLEAÑOS';
    return 'FESTIVO';
  }

  private getSpecialDayBadgeLabels(dias: DiaEspecial[]): string {
    return dias.map((d) => this.getSpecialDayBadgeLabel(d)).join(' | ');
  }

  private onDayCellDidMount(arg: any): void {
    const dias = this.getSpecialDaysForDate(arg?.date);
    if (dias.length === 0) return;

    dias.forEach((dia) => arg.el.classList.add(`dia-${dia.tipo}`));

    // Etiqueta de festivo en vista mes sobre el número del día (1, 18, etc.).
    if (arg?.view?.type === 'dayGridMonth') {
      const dayTop = arg.el.querySelector('.fc-daygrid-day-top');
      if (dayTop && !dayTop.querySelector('.day-special-dot')) {
        const dot = document.createElement('span');
        dot.className = 'day-special-dot';
        dot.textContent = this.getSpecialDayBadgeLabels(dias);
        dayTop.appendChild(dot);
      }
    }
  }

  private onDayHeaderDidMount(arg: any): void {
    const dias = this.getSpecialDaysForDate(arg?.date);
    if (dias.length === 0) return;

    dias.forEach((dia) => arg.el.classList.add(`dia-${dia.tipo}`));

    if (arg.el.querySelector('.day-special-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'day-special-badge';
    badge.textContent = this.getSpecialDayBadgeLabels(dias);

    const inner = arg.el.querySelector('.fc-col-header-cell-cushion');
    if (inner) {
      inner.appendChild(badge);
    }
  }

  getSelectedDaySpecial(): DiaEspecial | null {
    return this.getSpecialDayForDate(this.selectedDate());
  }

  getSelectedDaySpecials(): DiaEspecial[] {
    return this.getSpecialDaysForDate(this.selectedDate());
  }

  getSelectedDaySpecialLabel(): string {
    const dias = this.getSelectedDaySpecials();
    if (dias.length === 0) return '';
    return dias
      .map((dia) => {
        const base = this.getSpecialDayBadgeLabel(dia);
        return dia.descripcion ? `${base}: ${dia.descripcion}` : base;
      })
      .join(' | ');
  }

  getCurrentCalendarSpecial(): DiaEspecial | null {
    if (this.currentView() !== 'timeGridDay') return null;
    return this.getSpecialDayForDate(this.currentCalendarDate());
  }

  getCurrentCalendarSpecials(): DiaEspecial[] {
    if (this.currentView() !== 'timeGridDay') return [];
    return this.getSpecialDaysForDate(this.currentCalendarDate());
  }

  getCurrentCalendarSpecialLabel(): string {
    const dias = this.getCurrentCalendarSpecials();
    if (dias.length === 0) return '';
    return dias
      .map((dia) => {
        const base = this.getSpecialDayBadgeLabel(dia);
        return dia.descripcion ? `${base}: ${dia.descripcion}` : base;
      })
      .join(' | ');
  }

  calendarDateClass = (date: Date): string[] => {
    const dias = this.getSpecialDaysForDate(date);
    if (dias.length === 0) return [];
    return dias.map((d) => `dia-${d.tipo}-mini`);
  }

  private loadVeterinarios(): void {
    this.citasService.getVeterinarios().subscribe({
      next: (response) => {
        const data = response?.data;
        if (Array.isArray(data)) {
          this.veterinarios.set(data);
          // Configurar filtros DESPUÉS de cargar veterinarios
          this.setupFiltersAfterDataLoad();
        } else {
          console.warn('Error cargando veterinarios:', response?.message || 'Formato de respuesta inválido');
          this.veterinarios.set([]);
        }
      },
      error: (error) => {
        console.error('Error cargando veterinarios:', error);
        this.veterinarios.set([]);
      }
    });
  }

  private loadCalendarEvents(): void {
    this.loading.set(true);
    const { startDate, endDate } = this.getCalendarFetchRange();

    const filters: CitaFilter = {
      id_veterinario: this.filterForm.value.id_veterinario || undefined,
      estado: this.filterForm.value.estado || undefined,
      tipo: this.filterForm.value.tipo || undefined,
      fecha_inicio: startDate.toISOString().split('T')[0],
      fecha_fin: endDate.toISOString().split('T')[0]
    };

    this.citasService.getCitas(1, 500, filters).subscribe({
      next: (response) => {
        const data = response?.data;
        const citasArray = Array.isArray(data) ? data : [];
        this.citas.set(citasArray);
        this.applyCalendarEventLayers();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando eventos del calendario:', error);

        // Si es error 401, mostrar mensaje específico
        if (error.status === 401) {
          this.snackBar.open('Por favor inicia sesión para ver las citas', 'Ir a Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/login']);
          });
        } else {
          this.snackBar.open('Error cargando calendario', 'Cerrar', { duration: 3000 });
        }

        this.citas.set([]);
        this.applyCalendarEventLayers();
        this.loading.set(false);
      }
    });
  }

  private getCalendarFetchRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = this.dashboardStartDate
      ? new Date(`${this.dashboardStartDate}T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = this.dashboardEndDate
      ? new Date(`${this.dashboardEndDate}T23:59:59`)
      : new Date(now.getFullYear(), now.getMonth() + 4, 0);

    return { startDate, endDate };
  }

  private applyCalendarEventLayers(): void {
    const citasArray = this.citas();
    const { startDate, endDate } = this.getCalendarFetchRange();
    const citaEvents = this.transformCitasToEvents(citasArray);
    const overlayEvents = this.buildNotAllowedRangeOverlays(startDate, endDate);

    // Calcular rango horario dinámico (base 07:00-18:00, ampliar si hay citas fuera)
    const { slotMinTime, slotMaxTime } = this.calcularRangoHorario(citasArray);
    const forceDayRange = this.currentView() === 'timeGridDay';

    this.calendarOptions = {
      ...this.calendarOptions,
      events: [...overlayEvents, ...citaEvents],
      slotMinTime: forceDayRange ? '07:00:00' : slotMinTime,
      slotMaxTime: forceDayRange ? '18:00:00' : slotMaxTime
    };

    this.updateDayCalendar();
  }



  private loadStats(): void {
    this.citasService.getCitaStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        // Si es error 401, no hacer nada porque el interceptor ya manejó la sesión
        if (error.status !== 401) {
          console.warn('Error no relacionado con autenticación en estadísticas');
        }
        // Establecer estadísticas vacías para evitar errores en el template
        this.stats.set({
          total_citas: 0,
          citas_hoy: 0,
          citas_pendientes: 0,
          citas_completadas: 0,
          tasa_ocupacion: 0
        });
      }
    });
  }

  private setupFilters(): void {
    // Escuchar cambios en los filtros
    this.filterForm.valueChanges.subscribe(() => {
      this.loadCalendarEvents();
    });
  }

  private setupFiltersAfterDataLoad(): void {
    // Configurar filtro automático para veterinarios DESPUÉS de cargar los datos
    const currentUser = this.authService.currentUser();
    if (currentUser && currentUser.rol === 'vet') {
      // Buscar veterinario por id (que corresponde al id_usuario del currentUser)
      const veterinarioEncontrado = this.veterinarios().find(v => v.id === currentUser.id_usuario);

      if (veterinarioEncontrado) {
        this.filterForm.patchValue({
          id_veterinario: currentUser.id_usuario
        });
      }
    }
  }  private transformCitasToEvents(citas: Cita[]): EventInput[] {
    return citas.map(cita => {
      // Manejar tanto la estructura antigua (objetos anidados) como la nueva (campos planos)
      const mascotaNombre = cita.mascota?.nombre || cita.mascota_nombre || 'Sin nombre';
      const clienteNombre = cita.mascota?.cliente?.nombre || cita.cliente_nombre || '';
      const veterinarioNombre = cita.veterinario?.nombre || cita.veterinario_nombre || '';
      const tipoToken = this.getTipoToken(cita.tipo);
      const estadoNormalizado = this.normalizeEstado(cita.estado);


      return {
        id: cita.id_cita,
        title: `${mascotaNombre}`,
        start: this.parseLocalDate(cita.fecha_inicio),
        end: this.parseLocalDate(cita.fecha_fin),
        backgroundColor: this.citasService.obtenerColorPorTipo(cita.tipo),
        borderColor: this.citasService.obtenerColorBordePorTipo(cita.tipo),
        textColor: '#1f2937',
        borderWidth: 1,
        classNames: ['cita-evento', `cita-estado-${estadoNormalizado}`, `cita-tipo-${tipoToken}`],
        extendedProps: {
          cita: cita,
          tipo: cita.tipo,
          tipoToken,
          estado: estadoNormalizado,
          mascotaNombre,
          clienteNombre,
          veterinarioNombre,
          veterinarioId: cita.id_veterinario
        }
      };
    });
  }

  private parseLocalDate(fechaStr: string): Date {
    const fecha = new Date(fechaStr);
    return fecha;
  }

  /** Calcula slotMinTime/slotMaxTime: fijo 07:00-18:00, se amplía si hay citas fuera */
  private calcularRangoHorario(citas: Cita[]): { slotMinTime: string; slotMaxTime: string } {
    const BASE_MIN = 7;   // 7:00 AM
    const BASE_MAX = 18;  // 6:00 PM

    let minHour = BASE_MIN;
    let maxHour = BASE_MAX;

    for (const cita of citas) {
      const inicio = new Date(cita.fecha_inicio);
      const fin = new Date(cita.fecha_fin);
      const hInicio = inicio.getHours();
      const hFin = fin.getHours() + (fin.getMinutes() > 0 ? 1 : 0); // redondear hacia arriba

      if (hInicio < minHour) minHour = Math.max(0, hInicio);
      if (hFin > maxHour) maxHour = Math.min(24, hFin);
    }

    const pad = (h: number) => `${String(h).padStart(2, '0')}:00:00`;
    return { slotMinTime: pad(minHour), slotMaxTime: pad(maxHour) };
  }

  private formatLocalDateForBackend(date: Date): string {
    // Formatear fecha local para el backend sin conversión a UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private getVistaFromCalendarView(calendarView: string): 'mes' | 'semana' | 'dia' {
    switch (calendarView) {
      case 'dayGridMonth': return 'mes';
      case 'timeGridFiveDay': return 'semana';
      case 'timeGridWeek': return 'semana';
      case 'timeGridDay': return 'dia';
      default: return 'semana';
    }
  }

  handleDayHeaderClick(date: Date): void {
    this.selectedDate.set(new Date(date));
    this.setViewMode('plana');
  }

  // Event Handlers del Calendario
  handleDateSelect(selectInfo: any): void {
    const reason = this.getDateTimeBlockReason(selectInfo.start, selectInfo.end);
    if (reason) {
      this.snackBar.open(reason, 'Cerrar', { duration: 4500 });
      return;
    }

    // Abrir diálogo para crear nueva cita
    this.openCreateDialog(selectInfo.start, selectInfo.end);
  }

  handleDateClick(clickInfo: any): void {
    const start = clickInfo?.date instanceof Date ? new Date(clickInfo.date) : new Date();

    // En vista mes (all-day), precargar una hora razonable para creación rápida.
    if (clickInfo?.allDay || clickInfo?.view?.type === 'dayGridMonth') {
      const horario = this.getHorarioEspecialForDate(start);
      const firstAllowed = this.parseHmToMinutes(horario?.horario_especial?.hora_inicio || '08:00');
      const minutes = firstAllowed ?? (8 * 60);
      start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const reason = this.getDateTimeBlockReason(start, end);
    if (reason) {
      this.snackBar.open(reason, 'Cerrar', { duration: 4500 });
      return;
    }
    this.openCreateDialog(start, end);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const cita = clickInfo.event.extendedProps['cita'] as Cita;

    this.router.navigate(['/citas', cita.id_cita], {
      queryParams: { from: 'calendario' }
    });
  }


  handleEventDrop(eventInfo: any): void {
    // Actualizar cita cuando se arrastra
    const cita = eventInfo.event.extendedProps['cita'] as Cita;
    const nuevaFechaInicio = this.formatLocalDateForBackend(eventInfo.event.start);
    const nuevaFechaFin = eventInfo.event.end ? this.formatLocalDateForBackend(eventInfo.event.end) : nuevaFechaInicio;

    this.citasService.updateCita(cita.id_cita, {
      fecha_inicio: nuevaFechaInicio,
      fecha_fin: nuevaFechaFin
    }).subscribe({
      next: () => {
        this.snackBar.open('Cita reagendada exitosamente', 'Cerrar', { duration: 3000 });
        this.loadCalendarEvents(); // Recargar para sincronizar
      },
      error: (error) => {
        console.error('Error reagendando cita:', error);
        eventInfo.revert(); // Revertir cambio visual
        this.snackBar.open('Error al reagendar cita', 'Cerrar', { duration: 3000 });
      }
    });
  }

  handleEventResize(eventInfo: any): void {
    // Actualizar duración de la cita
    const cita = eventInfo.event.extendedProps['cita'] as Cita;
    const nuevaFechaFin = eventInfo.event.end ? this.formatLocalDateForBackend(eventInfo.event.end) : this.formatLocalDateForBackend(eventInfo.event.start);

    this.citasService.updateCita(cita.id_cita, {
      fecha_fin: nuevaFechaFin
    }).subscribe({
      next: () => {
        this.snackBar.open('Duración de cita actualizada', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error actualizando duración:', error);
        eventInfo.revert();
        this.snackBar.open('Error al actualizar duración', 'Cerrar', { duration: 3000 });
      }
    });
  }

  renderEventContent(eventInfo: any): any {
    if (eventInfo?.event?.extendedProps?.overlayType) {
      return { html: '' };
    }

    const cita = eventInfo.event.extendedProps['cita'] as Cita;
    const estado = eventInfo.event.extendedProps['estado'] || 'confirmada';
    const tipoToken = eventInfo.event.extendedProps['tipoToken'] || this.getTipoToken(cita?.tipo || '');

    // Validar que cita existe
    if (!cita) {
      const fallbackHour = this.formatearHoraEvento(eventInfo.event.start ?? new Date());
      const dot = this.getEstadoDot('confirmada');
      return {
        html: `
          <div class="event-simple event-type-general event-state-confirmada">
            <div class="event-header-simple">
              <span class="event-time">${dot}&nbsp;${fallbackHour}</span>
            <div class="event-patient">${eventInfo.event.title || ''}</div>
          </div>
        `
      };
    }

    const estadoNormalizado = this.normalizeEstado(estado);
    const nombreMascota = this.sanitizeInlineText(cita.mascota_nombre || 'Mascota');
    const horaInicio = this.formatearHoraEvento(cita.fecha_inicio);
    const dot = this.getEstadoDot(estadoNormalizado);

    return {
      html: `
        <div class="event-simple event-type-${tipoToken} event-state-${estadoNormalizado}">
          <div class="event-header-simple">
            <span class="event-time">${dot}&nbsp;${horaInicio}</span>
          <div class="event-patient">${nombreMascota}</div>
        </div>
      `
    };
  }


  private getEstadoDot(estado: 'confirmada' | 'en_curso' | 'completada' | 'no_asistio'): string {
    const dots: Record<'confirmada' | 'en_curso' | 'completada' | 'no_asistio', string> = {
      confirmada: '🔵',
      en_curso: '🟣',
      completada: '🟢',
      no_asistio: '🔴'
    };

    return dots[estado] || '⚪';
  }

  private extraerHoraInicio(timeText: string): string {
    // Si el formato es "8:00 - 8:30", extraer solo "8:00"
    if (timeText.includes(' - ')) {
      return timeText.split(' - ')[0];
    }
    // Si no tiene rango, devolver tal como está
    return timeText;
  }

  private formatearHoraEvento(fecha: string | Date): string {
    const d = new Date(fecha);
    const raw = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();

    // Evita salto entre hora y am/pm dentro del cuadro.
    return raw.replace(' ', '&nbsp;');
  }

  private sanitizeInlineText(value: string): string {
    return String(value || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Método público para refrescar el calendario (llamado desde otros componentes)
  refreshCalendar(): void {
    this.loadCalendarEvents();
    this.loadStats();
  }

  // Acciones
  openCreateDialog(fechaInicio?: Date, fechaFin?: Date): void {
    // TODO: Implementar diálogo de creación
    this.router.navigate(['/citas/nueva'], {
      queryParams: {
        fecha_inicio: fechaInicio ? this.formatLocalDateForBackend(fechaInicio) : undefined,
        fecha_fin: fechaFin ? this.formatLocalDateForBackend(fechaFin) : undefined
      }
    });
  }

  changeView(event: any): void {
    const newView = event.value;
    this.currentView.set(newView);
    // Update calendar options to force view change
    const dayViewRange = newView === 'timeGridDay'
      ? { slotMinTime: '07:00:00', slotMaxTime: '18:00:00' }
      : {};

    this.calendarOptions = {
      ...this.calendarOptions,
      initialView: newView as any,
      ...dayViewRange
    };
  }

  onFilterChange(): void {
    this.loadCalendarEvents();
  }  clearFilters(): void {
    this.filterForm.reset();
    this.loadCalendarEvents();
  }

  syncWithGoogle(): void {
    this.syncing.set(true);

    // Paso 1: Sincronizar cambios locales pendientes hacia Google
    this.citasService.forceSyncAllPending().subscribe({
      next: (result) => {
        const syncedLocal = result?.data?.synced ?? 0;
        const failedLocal = result?.data?.failed ?? 0;

        // Paso 2: Escuchar cambios desde Google Calendar (listener manual)
        this.checkGoogleCalendarChanges(syncedLocal, failedLocal);
      },
      error: (error) => {
        this.handleSyncError('Error sincronizando cambios locales', error);
      }
    });
  }

  private checkGoogleCalendarChanges(syncedLocal: number, failedLocal: number): void {
    // Detectar cambios en los últimos 10 minutos
    this.citasService.syncChangesFromGoogle().subscribe({
      next: (result) => {
        this.syncing.set(false);
        const changesDetected = result?.data?.processed || 0;

        if (changesDetected > 0) {
          this.snackBar.open(
            `Sincronización completada: ${syncedLocal} pendientes enviados, ${changesDetected} cambios recibidos de Google${failedLocal > 0 ? `, ${failedLocal} con error` : ''}`,
            'Cerrar',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `Sincronización completada: ${syncedLocal} pendientes enviados y sin cambios nuevos desde Google${failedLocal > 0 ? ` (${failedLocal} con error)` : ''}`,
            'Cerrar',
            { duration: 3000 }
          );
        }

        // Siempre recargar calendario y estadísticas después de sincronizar
        this.loadCalendarEvents();
        this.loadStats();
      },
      error: (error) => {
        this.handleSyncError('Error detectando cambios desde Google Calendar', error);
      }
    });
  }

  private handleSyncError(message: string, error: any): void {
    this.syncing.set(false);
    console.error(message + ':', error);

    let userMessage = message;
    const backendCode = error?.error?.code;
    const backendError = String(error?.error?.error || '').toLowerCase();
    const requiresReauth = error?.error?.requires_reauth === true
      || backendCode === 'GOOGLE_REAUTH_REQUIRED'
      || backendError.includes('invalid_grant');

    if (requiresReauth) {
      userMessage = 'La autorización de Google Calendar expiró o fue revocada. Reautoriza la integración en Configuración > Google Calendar.';
    } else if (error.status === 404) {
      userMessage = 'Servicio de sincronización no disponible';
    } else if (error.status === 403) {
      userMessage = 'No tienes permisos para sincronizar';
    } else if (error.status === 401) {
      userMessage = 'Sesión no autorizada. Inicia sesión nuevamente.';
    } else if (error.status === 500) {
      userMessage = 'Error interno del servidor';
    } else if (error.status === 0) {
      userMessage = 'No se puede conectar con el servidor';
    }

    this.snackBar.open(userMessage, 'Cerrar', { duration: 5000 });
  }  openExportDialog(): void {
    const dialogRef = this.dialog.open(ExportDialogComponent, {
      width: '600px',
      data: {
        veterinarios: this.veterinarios(),
        currentFilters: this.filterForm.value
      }
    });

    dialogRef.afterClosed().subscribe((exportOptions: ExportOptions) => {
      if (exportOptions) {
        this.exportAgenda(exportOptions);
      }
    });
  }

  private exportAgenda(options: ExportOptions): void {
    const loadingSnackBar = this.snackBar.open('Generando exportacion...', undefined, {
      duration: 0,
      horizontalPosition: 'center'
    });

    this.exportService.exportAgenda(options).subscribe({
      next: (blob) => {
        loadingSnackBar.dismiss();
        const filename = this.exportService.generateFilename(options);
        this.exportService.downloadFile(blob, filename);

        const tipoTexto = options.formato === 'individual' ? 'individual' : 'consolidada';
        this.snackBar.open(`Agenda ${tipoTexto} exportada exitosamente`, 'Cerrar', {
          duration: 3000
        });
      },
      error: (error) => {
        loadingSnackBar.dismiss();
        console.error('Error exportando agenda:', error);
        this.snackBar.open('Error al exportar la agenda', 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  // ===========================================
  // NUEVAS FUNCIONES PARA VISTA PLANA
  // ===========================================

  // Abrir calendario en nueva pestaña (legacy — ahora usamos toggle inline)
  abrirCalendarioNuevaPestana(): void {
    this.setViewMode('calendario');
  }

  setViewMode(mode: 'plana' | 'calendario'): void {
    this.viewMode.set(mode);
    if (mode === 'calendario') {
      // Re-render el calendario luego de que el DOM aparezca
      setTimeout(() => {
        if (this.calendarComponent?.getApi) {
          this.calendarComponent.getApi().updateSize();
          this.updateToolbarSpecialBadge();
        }
      }, 150);
      return;
    }

    setTimeout(() => {
      this.updateDayCalendar();
    }, 100);
  }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.updateDayCalendar();
  }

  goToToday(): void {
    this.selectedDate.set(new Date());
    this.showCompletedToday.set(false);
    this.updateDayCalendar();
  }

  shiftSelectedDate(days: number): void {
    const base = new Date(this.selectedDate());
    base.setDate(base.getDate() + days);
    this.selectedDate.set(base);
    this.updateDayCalendar();
  }

  citasDelDiaSeleccionado(): any[] {
    const target = this.getLocalDateString(this.selectedDate());
    return this.citas()
      .filter((cita) => this.getLocalDateString(new Date(cita.fecha_inicio)) === target)
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());
  }

  citasVisiblesDelDiaSeleccionado(): any[] {
    const citas = this.citasDelDiaSeleccionado();
    if (!this.isSelectedDayToday() || this.showCompletedToday()) {
      return citas;
    }
    return citas.filter((cita) => !this.esCitaGestionada(cita.estado));
  }

  citasAgrupadasPorHoraSeleccionada(): { hora: number; etiqueta: string; citas: any[] }[] {
    const grupos = new Map<number, any[]>();

    for (const cita of this.citasVisiblesDelDiaSeleccionado()) {
      const hora = this.getHoraBloque(cita.fecha_inicio);
      if (!grupos.has(hora)) {
        grupos.set(hora, []);
      }
      grupos.get(hora)?.push(cita);
    }

    return Array.from(grupos.entries())
      .sort(([a], [b]) => a - b)
      .map(([hora, citas]) => ({
        hora,
        etiqueta: this.formatearHoraLateral(hora),
        citas
      }));
  }

  completadasOcultasCount(): number {
    if (!this.isSelectedDayToday() || this.showCompletedToday()) {
      return 0;
    }
    return this.citasDelDiaSeleccionado().filter((cita) => this.esCitaGestionada(cita.estado)).length;
  }

  private esCitaGestionada(estado: string): boolean {
    const normalized = this.normalizeEstado(estado);
    return normalized === 'completada' || normalized === 'no_asistio';
  }

  isSelectedDayToday(): boolean {
    const selected = this.getLocalDateString(this.selectedDate());
    const today = this.getLocalDateString(new Date());
    return selected === today;
  }

  toggleCompletedTodayVisibility(): void {
    this.showCompletedToday.set(!this.showCompletedToday());
    this.updateDayCalendar();
  }

  private updateDayCalendar(): void {
    const selected = new Date(this.selectedDate());
    const citasVisibles = this.citasVisiblesDelDiaSeleccionado();
    const citaEvents = this.transformCitasToEvents(citasVisibles as Cita[]);
    const overlayEvents = this.buildNotAllowedRangeOverlays(selected, selected);
    const events = [...overlayEvents, ...citaEvents];
    const { slotMinTime, slotMaxTime } = this.calcularRangoHorarioVistaDia(citasVisibles as Cita[]);

    this.dayCalendarOptions = {
      ...this.dayCalendarOptions,
      initialDate: selected,
      events,
      slotMinTime,
      slotMaxTime
    };

    const api = this.dayCalendarComponent?.getApi?.();
    if (api) {
      api.gotoDate(selected);
    }

    this.queueCalendarResize();
  }

  private setupCalendarAutoResize(): void {
    const host = this.elementRef.nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', this.boundWindowResize);
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.queueCalendarResize();
    });

    this.resizeObserver.observe(host);

    const mainContent = host.closest('.main-content');
    if (mainContent instanceof HTMLElement) {
      this.resizeObserver.observe(mainContent);
    }
  }

  private readonly boundWindowResize = () => {
    this.queueCalendarResize();
  };

  private queueCalendarResize(): void {
    requestAnimationFrame(() => {
      this.calendarComponent?.getApi?.()?.updateSize();
      this.dayCalendarComponent?.getApi?.()?.updateSize();
    });

    // Reintentos para capturar la transición de ancho del sidebar (250ms)
    setTimeout(() => {
      this.calendarComponent?.getApi?.()?.updateSize();
      this.dayCalendarComponent?.getApi?.()?.updateSize();
    }, 180);

    setTimeout(() => {
      this.calendarComponent?.getApi?.()?.updateSize();
      this.dayCalendarComponent?.getApi?.()?.updateSize();
    }, 320);
  }

  /**
   * Rango horario para la vista día embebida:
   * - Si es hoy y se ocultan completadas, recorta horas pasadas.
   * - Si hay citas NO completadas en horas anteriores, esas horas se mantienen visibles.
   * - Si son >= :45 y no hay pendientes en la hora actual, inicia en la hora siguiente.
   */
  private calcularRangoHorarioVistaDia(citasVisibles: Cita[]): { slotMinTime: string; slotMaxTime: string } {
    const { slotMinTime: baseMin, slotMaxTime: baseMax } = this.calcularRangoHorario(citasVisibles);

    if (!this.isSelectedDayToday() || this.showCompletedToday()) {
      return { slotMinTime: baseMin, slotMaxTime: baseMax };
    }

    const now = new Date();
    let inicioSugerido = now.getHours();

    if (now.getMinutes() >= 45) {
      inicioSugerido = Math.min(23, inicioSugerido + 1);
    }

    const horasInicioVisibles = citasVisibles
      .map((cita) => new Date(cita.fecha_inicio).getHours())
      .filter((h) => Number.isFinite(h));

    const hayPendienteEnHoraActual = citasVisibles.some((cita) => {
      const inicio = new Date(cita.fecha_inicio);
      return inicio.getHours() === now.getHours();
    });

    if (hayPendienteEnHoraActual) {
      inicioSugerido = now.getHours();
    }

    const horaMasTempranaVisible = horasInicioVisibles.length > 0
      ? Math.min(...horasInicioVisibles)
      : inicioSugerido;

    const slotMinHour = Math.max(0, Math.min(inicioSugerido, horaMasTempranaVisible));

    return {
      slotMinTime: `${String(slotMinHour).padStart(2, '0')}:00:00`,
      slotMaxTime: baseMax
    };
  }

  tituloDiaSeleccionado(): string {
    const date = this.selectedDate();
    const hoy = new Date();
    const dateKey = this.getLocalDateString(date);
    const hoyKey = this.getLocalDateString(hoy);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const mananaKey = this.getLocalDateString(manana);

    if (dateKey === hoyKey) return 'Hoy';
    if (dateKey === mananaKey) return 'Mañana';
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Obtener citas agrupadas por día
  citasPorDia() {
    const citas = this.citas();
    const citasAgrupadas = new Map<string, any>();
    // Usar hora LOCAL, no UTC — evita el bug de zona horaria a partir de las 7pm
    const hoy = this.getLocalDateString(new Date());

    // Primero agregar el día actual si no tiene citas
    if (!citasAgrupadas.has(hoy)) {
      citasAgrupadas.set(hoy, {
        fecha: hoy,
        fechaFormateada: this.formatearFecha(hoy),
        citas: [],
        estadisticas: {
          total: 0,
          completadas: 0,
          canceladas: 0,
          pendientes: 0
        }
      });
    }

    citas.forEach(cita => {
      // Usar hora local para agrupar por día correcto
      const fecha = this.getLocalDateString(new Date(cita.fecha_inicio));

      if (!citasAgrupadas.has(fecha)) {
        citasAgrupadas.set(fecha, {
          fecha,
          fechaFormateada: this.formatearFecha(fecha),
          citas: [],
          estadisticas: {
            total: 0,
            completadas: 0,
            canceladas: 0,
            pendientes: 0
          }
        });
      }

      const grupo = citasAgrupadas.get(fecha);
      grupo.citas.push(cita);
      grupo.estadisticas.total++;

      // Contar por estado
      switch (this.normalizeEstado(cita.estado)) {
        case 'completada':
          grupo.estadisticas.completadas++;
          break;
        case 'no_asistio':
          grupo.estadisticas.canceladas++;
          break;
        default:
          grupo.estadisticas.pendientes++;
          break;
      }
    });

    // Ordenar citas dentro de cada día por hora
    Array.from(citasAgrupadas.values()).forEach(grupo => {
      grupo.citas.sort((a: any, b: any) =>
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      );
    });

    // Convertir a array y ordenar por fecha (solo fechas futuras o hoy)
    // Comparar strings YYYY-MM-DD directamente — funciona correctamente con hora local
    return Array.from(citasAgrupadas.values())
      .filter(grupo => grupo.fecha >= hoy)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  /** Devuelve la fecha local como string YYYY-MM-DD sin conversión a UTC */
  private getLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatearFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr + 'T00:00:00');
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const fechaSolo = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoySolo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const mananaSolo = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate());
    const ayerSolo = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate());

    if (fechaSolo.getTime() === hoySolo.getTime()) {
      return 'Hoy';
    } else if (fechaSolo.getTime() === mananaSolo.getTime()) {
      return 'Mañana';
    } else if (fechaSolo.getTime() === ayerSolo.getTime()) {
      return 'Ayer';
    } else {
      return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  private getHoraBloque(fecha: string): number {
    const date = new Date(fecha);
    return date.getHours();
  }

  private formatearHoraLateral(hora: number): string {
    const d = new Date();
    d.setHours(hora, 0, 0, 0);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  }

  // Funciones para estilos y clases
  /**
   * Normaliza estados legados para mantener solo el modelo operativo de 4 estados.
   */
  private normalizeEstado(estado: string): 'confirmada' | 'en_curso' | 'completada' | 'no_asistio' {
    const value = String(estado || '').trim().toLowerCase();
    const map: Record<string, 'confirmada' | 'en_curso' | 'completada' | 'no_asistio'> = {
      pendiente: 'confirmada',
      confirmada: 'confirmada',
      en_curso: 'en_curso',
      en_progreso: 'en_curso',
      completada: 'completada',
      cancelada: 'no_asistio',
      no_asistio: 'no_asistio'
    };

    return map[value] ?? 'confirmada';
  }

  getCitaCardClasses(cita: any): string {
    return `cita-card-estado-${this.normalizeEstado(cita?.estado)} cita-card-tipo-${this.getTipoToken(cita.tipo)}`;
  }

  private getTipoToken(tipo: string): string {
    return this.getTipoClass(tipo).replace('tipo-', '');
  }

  getEstadoClass(estado: string): string {
    const normalized = this.normalizeEstado(estado);
    const clases: { [key: string]: string } = {
      'confirmada': 'estado-confirmada',
      'en_curso':   'estado-en-progreso',
      'completada': 'estado-completada',
      'no_asistio': 'estado-no-asistio'
    };
    return clases[normalized] || 'estado-desconocido';
  }

  getEstadoTexto(estado: string): string {
    const normalized = this.normalizeEstado(estado);
    const textos: { [key: string]: string } = {
      'confirmada': 'Confirmada',
      'en_curso':   'En curso',
      'completada': 'Completa',
      'no_asistio': 'No asistió'
    };
    return textos[normalized] || 'Desconocido';
  }

  getTipoClass(tipo: string): string {
    const normalizedTipo = String(tipo || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    const clases: { [key: string]: string } = {
      'valoracion': 'tipo-valoracion',
      'hidroterapia': 'tipo-hidroterapia',
      'terapia': 'tipo-terapia',
      'fisio': 'tipo-terapia',
      'fisioterapia': 'tipo-terapia',
      'domicilio': 'tipo-domicilio',
      'sin_clasificar': 'tipo-general',
      'control': 'tipo-control',
      // Legacy fallbacks
      'consulta': 'tipo-domicilio',
      'consulta_general': 'tipo-domicilio',
      'vacunacion': 'tipo-domicilio',
      'cirugia': 'tipo-hidroterapia',
      'emergencia': 'tipo-emergencia'
    };
    return clases[normalizedTipo] || 'tipo-general';
  }

  getTipoTexto(tipo: string): string {
    const normalizedTipo = String(tipo || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    const textos: { [key: string]: string } = {
      'domicilio': 'Domicilio',
      'sin_clasificar': 'Sin Clasificar',
      'valoracion': 'Valoración',
      'hidroterapia': 'Hidroterapia',
      'terapia': 'Terapia',
      'control': 'Control',
      // Legacy fallbacks
      'consulta': 'Domicilio',
      'consulta_general': 'Domicilio',
      'vacunacion': 'Domicilio',
      'cirugia': 'Hidroterapia',
      'fisio': 'Terapia',
      'fisioterapia': 'Terapia',
      'general': 'Domicilio',
      'emergencia': 'Emergencia'
    };
    return textos[normalizedTipo] || 'Sin Clasificar';
  }

  // Funciones de acciones
  abrirDetalleCita(cita: any): void {
    this.router.navigate(['/citas', cita.id_cita], {
      queryParams: {
        from: this.viewMode() === 'calendario' ? 'calendario' : 'plana'
      }
    });
  }

  editarCita(cita: any): void {
    const id = cita?.id_cita;
    if (!id) {
      this.snackBar.open('No se pudo abrir la edición de la cita', 'Cerrar', { duration: 3000 });
      return;
    }
    this.router.navigate(['/citas', id, 'editar']);
  }

  // Mapa de transiciones válidas entre estados de cita
  private readonly TRANSICIONES_VALIDAS: Record<string, string[]> = {
    confirmada: ['en_curso', 'no_asistio'],
    en_curso:   ['completada', 'no_asistio'],
    completada: [],
    no_asistio: []
  };

  puedeTransicionar(estadoActual: string, estadoDestino: string): boolean {
    const actual = this.normalizeEstado(estadoActual);
    const destino = this.normalizeEstado(estadoDestino);
    return this.TRANSICIONES_VALIDAS[actual]?.includes(destino) ?? false;
  }

  cambiarEstadoCita(cita: any, nuevoEstado: string): void {
    const estadoDestino = this.normalizeEstado(nuevoEstado);

    this.citasService.updateEstadoCita(cita.id_cita, estadoDestino).subscribe({
      next: () => {
        const etiquetas: Record<string, string> = {
          confirmada: 'Confirmada',
          en_curso: 'En curso',
          completada: 'Completa',
          no_asistio: 'No asistió'
        };
        this.snackBar.open(`Estado actualizado: ${etiquetas[estadoDestino] ?? estadoDestino}`, 'Cerrar', { duration: 3000 });
        this.loadCalendarEvents(); // Recargar para reflejar el cambio
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        this.snackBar.open(err.error?.message ?? 'Error al cambiar estado', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // Volver a vista plana desde calendario
  volverVistaPlana(): void {
    this.viewMode.set('plana');
    // Limpiar parámetro de URL
    this.router.navigate(['/citas'], { replaceUrl: true });
    // Remover clase del body
    document.body.classList.remove('fullscreen-calendar-mode');
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.boundWindowResize);
    console.log('🚪 Saliendo de la vista de citas');
  }
}
