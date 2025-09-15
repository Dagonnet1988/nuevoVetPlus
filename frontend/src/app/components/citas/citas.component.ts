import { Component, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';

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
export class CitasComponent implements OnInit, OnDestroy {
  // ViewChild para acceder al calendario
  @ViewChild('calendar') calendarComponent: any;

  // Signals para estado reactivo
  loading = signal(false);
  syncing = signal(false);
  stats = signal<CitaStats | null>(null);
  citas = signal<Cita[]>([]);
  veterinarios = signal<any[]>([]);
  currentView = signal<string>('timeGridWeek');

  // Signal para controlar si mostrar el botón de sincronización manual
  showManualSyncButton = signal(false);

  // Signal para controlar el modo de vista del calendario
  calendarViewMode = signal<'compact' | 'expanded'>('expanded');

  // Timestamp de cuando se carga la vista
  private viewLoadTime: number = 0;  // Formulario de filtros
  filterForm: FormGroup;

  // Constantes
  tiposCita = TIPOS_CITA;
  estadosCita = ESTADOS_CITA;

  // Opciones del calendario
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: 'auto', // Cambiar a auto para que se ajuste automáticamente
    contentHeight: 'auto',
    aspectRatio: 1.35, // Ratio más amplio para mejor visualización
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: false, // Mostrar todos los eventos sin scroll
    weekends: true,
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      startTime: '08:00',
      endTime: '18:00'
    },
    slotMinTime: '06:00', // Mostrar desde las 6 AM (día completo)
    slotMaxTime: '22:00', // Hasta las 10 PM (día completo)
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00', // Mostrar etiquetas cada hora
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      omitZeroMinute: false,
      meridiem: false
    },
    nowIndicator: true,
    now: new Date(),
    scrollTime: '08:00:00', // Scroll automático a las 8 AM al cargar
    allDaySlot: false, // Ocultar slot de "todo el día" para ahorrar espacio
    expandRows: true, // Expandir filas para usar todo el espacio
    stickyHeaderDates: true, // Mantener fechas fijas al hacer scroll
    validRange: {
      start: '2020-01-01',
      end: '2030-12-31'
    },
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    events: [],
    eventContent: this.renderEventContent.bind(this),
    // Configuraciones específicas para timeGrid
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    slotEventOverlap: false, // Evitar solapamiento de eventos
    eventMinHeight: 25, // Altura mínima de eventos para mejor legibilidad
    eventShortHeight: 20
  };

  constructor(
    private fb: FormBuilder,
    private citasService: CitasService,
    private exportService: ExportService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      id_veterinario: [''],
      estado: [''],
      tipo: ['']
    });
  }

  ngOnInit(): void {
    console.log('🚪 Entrando a la vista de citas');
    this.viewLoadTime = Date.now();

    // Defer initial load to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadInitialData();
      this.loadCalendarEvents();
      this.loadStats();
      this.setupFilters();

      // Check if we need to refresh due to query param
      this.checkForRefreshParam();

      // Verificar si necesitamos sincronizar automáticamente
      this.checkAutoSync();
    });

    // Listen for browser navigation events to refresh calendar
    window.addEventListener('focus', () => {
      // Refresh calendar when window regains focus (user comes back from details)
      this.refreshCalendar();
    });
  }

  private checkAutoSync(): void {
    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos en milliseconds
    const lastSync = localStorage.getItem('citas_last_sync');
    const lastSyncTime = lastSync ? parseInt(lastSync) : 0;
    const now = Date.now();

    // Verificar si ha pasado suficiente tiempo desde la última sincronización
    const shouldAutoSync = (now - lastSyncTime) > SYNC_INTERVAL;

    // SIEMPRE sincronizar al cargar la página por primera vez
    this.performAutoSync();
  }

  private performAutoSync(): void {
    this.syncing.set(true);

    // Paso 1: Sincronizar cambios locales pendientes hacia Google
    this.citasService.forceSyncAllPending().subscribe({
      next: (result) => {
        const processedChanges = result?.data?.processed || 0;

        // Paso 2: Escuchar cambios desde Google Calendar
        this.autoSyncFromGoogle();
      },
      error: (error) => {
        console.error('Error en sincronización automática:', error);
        this.syncing.set(false);
        // Mostrar botón manual si falla la auto sync
        this.showManualSyncButton.set(true);
      }
    });
  }

  private autoSyncFromGoogle(): void {
    this.citasService.syncChangesFromGoogle().subscribe({
      next: (result) => {
        this.syncing.set(false);
        const changesDetected = result?.data?.processed || 0;

        console.log(`✅ Sincronización automática completada: ${changesDetected} cambios detectados desde Google`);

        // Actualizar timestamp de última sincronización
        localStorage.setItem('citas_last_sync', Date.now().toString());

        if (changesDetected > 0) {
          // Recargar calendario y estadísticas para mostrar cambios
          this.loadCalendarEvents();
          this.loadStats();

          // Mostrar notificación discreta
          this.snackBar.open(
            `${changesDetected} cambios detectados desde Google Calendar`,
            'Cerrar',
            { duration: 3000 }
          );
        } else {
          // Aún si no hay cambios detectados, recargar para asegurar sincronización
          this.loadCalendarEvents();
        }

        // Mostrar botón de sincronización manual después de unos segundos
        setTimeout(() => {
          this.showManualSyncButton.set(true);
        }, 2000);
      },
      error: (error) => {
        console.error('Error en sincronización automática desde Google:', error);
        this.syncing.set(false);
        // Mostrar botón manual si falla
        this.showManualSyncButton.set(true);
      }
    });
  }

  private checkForRefreshParam(): void {
    // Check if refresh query param is present
    const refresh = this.router.url.includes('refresh=true');
    if (refresh) {
      console.log('🔄 Refrescando calendario por parámetro de consulta');
      this.refreshCalendar();
      // Clean up the URL
      this.router.navigate(['/citas'], { replaceUrl: true });
    }
  }

  private loadInitialData(): void {
    this.loadVeterinarios();
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

    // Usar un rango amplio que cubra varios meses para que FullCalendar maneje la navegación
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 2 meses atrás
    const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0);   // 4 meses adelante

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

        const events = this.transformCitasToEvents(citasArray);

        // Actualizar eventos
        this.calendarOptions = {
          ...this.calendarOptions,
          events: events
        };

        this.citas.set(citasArray);
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
        this.loading.set(false);
      }
    });
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


      return {
        id: cita.id_cita,
        title: `${mascotaNombre}`,
        start: this.parseLocalDate(cita.fecha_inicio),
        end: this.parseLocalDate(cita.fecha_fin),
        backgroundColor: this.citasService.obtenerColorPorVeterinario(cita.id_veterinario),
        borderColor: this.citasService.obtenerColorSecundarioPorVeterinario(cita.id_veterinario),
        textColor: '#ffffff',
        borderWidth: 2,
        classNames: ['cita-evento', `cita-estado-${cita.estado}`, `cita-tipo-${cita.tipo}`],
        extendedProps: {
          cita: cita,
          tipo: cita.tipo,
          estado: cita.estado,
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
      case 'timeGridWeek': return 'semana';
      case 'timeGridDay': return 'dia';
      default: return 'semana';
    }
  }

  // Event Handlers del Calendario
  handleDateSelect(selectInfo: any): void {
    // Abrir diálogo para crear nueva cita
    this.openCreateDialog(selectInfo.start, selectInfo.end);
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const cita = clickInfo.event.extendedProps['cita'] as Cita;
    this.router.navigate(['/citas', cita.id_cita]);
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
    const cita = eventInfo.event.extendedProps['cita'] as Cita;
    const estado = eventInfo.event.extendedProps['estado'] || '';

    // Validar que cita existe
    if (!cita) {
      return {
        html: `
          <div class="event-simple">
            <div class="event-time">${eventInfo.timeText}</div>
            <div class="event-patient">${eventInfo.event.title}</div>
          </div>
        `
      };
    }

    // Obtener información simplificada
    const indicadorEstado = this.obtenerIndicadorEstado(estado);
    const nombreMascota = cita.mascota_nombre || 'Mascota';

    // Extraer solo la hora de inicio del timeText
    const horaInicio = this.extraerHoraInicio(eventInfo.timeText);

    return {
      html: `
        <div class="event-simple">
          <div class="event-header-simple">
            <span class="event-time">${horaInicio}</span>
            <span class="event-status-circle">${indicadorEstado}</span>
          </div>
          <div class="event-patient">${nombreMascota}</div>
        </div>
      `
    };
  }


  private extraerHoraInicio(timeText: string): string {
    // Si el formato es "8:00 - 8:30", extraer solo "8:00"
    if (timeText.includes(' - ')) {
      return timeText.split(' - ')[0];
    }
    // Si no tiene rango, devolver tal como está
    return timeText;
  }

  private obtenerIndicadorEstado(estado: string): string {
    const indicadores: { [key: string]: string } = {
      'pendiente': '🟡',
      'confirmada': '🔵',
      'en_progreso': '🟣',
      'completada': '🟢',
      'cancelada': '⚫',
      'no_asistio': '🔴'
    };
    return indicadores[estado] || '⚪';
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
    this.calendarOptions = {
      ...this.calendarOptions,
      initialView: newView as any
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

    console.log('🔄 Iniciando sincronización manual...');

    // Paso 1: Sincronizar cambios locales pendientes hacia Google
    this.citasService.forceSyncAllPending().subscribe({
      next: (result) => {
        const processedChanges = result?.data?.processed || 0;
        console.log(`✅ Sincronización manual - Paso 1: ${processedChanges} cambios locales enviados a Google`);

        // Paso 2: Escuchar cambios desde Google Calendar (listener manual)
        this.checkGoogleCalendarChanges();
      },
      error: (error) => {
        this.handleSyncError('Error sincronizando cambios locales', error);
      }
    });
  }

  private checkGoogleCalendarChanges(): void {
    console.log('👂 Escuchando cambios desde Google Calendar...');

    // Detectar cambios en los últimos 10 minutos
    this.citasService.syncChangesFromGoogle().subscribe({
      next: (result) => {
        this.syncing.set(false);
        const changesDetected = result?.data?.processed || 0;

        console.log(`✅ Sincronización manual completada: ${changesDetected} cambios detectados desde Google`);

        // Actualizar timestamp de última sincronización
        localStorage.setItem('citas_last_sync', Date.now().toString());

        if (changesDetected > 0) {
          this.snackBar.open(
            `Sincronización completada: ${changesDetected} cambios detectados desde Google Calendar`,
            'Cerrar',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            'Sincronización completada: No hay cambios nuevos desde Google Calendar',
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
    if (error.status === 404) {
      userMessage = 'Servicio de sincronización no disponible';
    } else if (error.status === 401) {
      userMessage = 'No tienes permisos para sincronizar';
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
    const loadingSnackBar = this.snackBar.open('Generando reporte...', undefined, {
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

  toggleCalendarViewMode(): void {
    const currentMode = this.calendarViewMode();
    const newMode = currentMode === 'compact' ? 'expanded' : 'compact';
    this.calendarViewMode.set(newMode);

    console.log(`📱 Modo de calendario cambiado a: ${newMode}`);

    // Actualizar configuraciones del calendario según el modo
    if (this.calendarComponent && this.calendarComponent.getApi) {
      const calendarApi = this.calendarComponent.getApi();

      if (newMode === 'compact') {
        // Modo compacto: horario laboral (8AM-7PM)
        calendarApi.setOption('slotMinTime', '08:00');
        calendarApi.setOption('slotMaxTime', '19:00');
        calendarApi.setOption('height', 'auto'); // Cambiar a auto para que se ajuste
        calendarApi.setOption('scrollTime', '08:00');
        this.snackBar.open('Vista compacta: horario laboral (8AM-7PM)', 'Cerrar', { duration: 3000 });
      } else {
        // Modo expandido: día completo (6AM-10PM)
        calendarApi.setOption('slotMinTime', '06:00');
        calendarApi.setOption('slotMaxTime', '22:00');
        calendarApi.setOption('height', 'auto'); // Cambiar a auto para que se ajuste
        calendarApi.setOption('scrollTime', '08:00');
        this.snackBar.open('Vista expandida: día completo (6AM-10PM)', 'Cerrar', { duration: 3000 });
      }

      // Recargar eventos para ajustar layout
      calendarApi.refetchEvents();
    } else {
      console.warn('🚫 No se pudo acceder al API del calendario');
    }
  }  ngOnDestroy(): void {
    // Cleanup si es necesario
    console.log('🚪 Saliendo de la vista de citas');
  }
}
