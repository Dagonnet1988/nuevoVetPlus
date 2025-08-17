import { Component, OnInit, signal, ViewChild } from '@angular/core';
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
export class CitasComponent implements OnInit {
  // Signals para estado reactivo
  loading = signal(false);
  syncing = signal(false);
  stats = signal<CitaStats | null>(null);
  citas = signal<Cita[]>([]);
  veterinarios = signal<any[]>([]);
  currentView = signal<string>('timeGridWeek');

  // Formulario de filtros
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
    height: 'auto',
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      startTime: '08:00',
      endTime: '18:00'
    },
    slotMinTime: '07:00',
    slotMaxTime: '20:00',
    slotDuration: '00:30:00',
    nowIndicator: true, // Mostrar línea de "ahora"
    now: new Date(), // Fecha/hora actual para la línea
    validRange: {
      start: '2020-01-01', // Permitir navegar desde 2020
      end: '2030-12-31'   // hasta 2030
    },
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    events: [],
    eventContent: this.renderEventContent.bind(this)
  };

  constructor(
    private fb: FormBuilder,
    private citasService: CitasService,
    private exportService: ExportService,
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
    // Defer initial load to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadInitialData();
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
        // Verificar que data sea un array antes de asignarlo
        if (Array.isArray(data)) {
          this.veterinarios.set(data);
        } else {
          console.warn('Respuesta de veterinarios no es un array:', data);
          this.veterinarios.set([]);
        }
      },
      error: (error) => {
        console.error('Error cargando veterinarios:', error);
        this.veterinarios.set([]); // Asegurar que siempre sea un array
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

    console.log('📅 Cargando citas para rango amplio:', {
      inicio: filters.fecha_inicio,
      fin: filters.fecha_fin,
      filtros: filters
    });
    
    console.log('🔍 Parámetros exactos de la petición:', {
      page: 1,
      limit: 500,
      ...filters
    });

    this.citasService.getCitas(1, 500, filters).subscribe({
      next: (response) => {
        console.log('📅 Respuesta del calendario:', response);
        const data = response?.data;
        const citasArray = Array.isArray(data) ? data : [];
        console.log('📋 Citas recibidas:', citasArray.length);
        
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
        console.error('Status:', error.status);
        console.error('Error details:', error.error);
        
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
    this.filterForm.valueChanges.subscribe(() => {
      this.loadCalendarEvents();
    });
  }

  private transformCitasToEvents(citas: Cita[]): EventInput[] {
    return citas.map(cita => {
      // Manejar tanto la estructura antigua (objetos anidados) como la nueva (campos planos)
      const mascotaNombre = cita.mascota?.nombre || cita.mascota_nombre || 'Sin nombre';
      const clienteNombre = cita.mascota?.cliente?.nombre || cita.cliente_nombre || '';
      const veterinarioNombre = cita.veterinario?.nombre || cita.veterinario_nombre || '';

      // console.log('🏷️ Transformando cita:', {
      //   id: cita.id_cita,
      //   mascotaNombre,
      //   clienteNombre,
      //   veterinarioNombre,
      //   tipo: cita.tipo,
      //   fecha_inicio: cita.fecha_inicio,
      //   fecha_fin: cita.fecha_fin
      // });

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
    // USAR LA MISMA LÓGICA QUE EL FORM: conversión automática del navegador
    // UTC 14:00Z -> 9:00 AM Colombia (automático del navegador)
    // Para consistencia con el formulario de edición

    // console.log('📅 Calendar parseLocalDate INPUT:', {
    //   fechaStr,
    //   includes_Z: fechaStr.includes('Z')
    // });

    // Simplemente usar la conversión automática del navegador (igual que en el form)
    const fecha = new Date(fechaStr);

    // console.log('📅 Calendar parseLocalDate OUTPUT:', {
    //   original: fechaStr,
    //   converted: fecha,
    //   hours: fecha.getHours(),
    //   minutes: fecha.getMinutes(),
    //   conversion: `${fechaStr} -> ${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`
    // });

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
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadCalendarEvents();
  }

  syncWithGoogle(): void {
    this.syncing.set(true);
    this.citasService.forceSyncAllPending().subscribe({
      next: () => {
        this.syncing.set(false);
        this.snackBar.open('Sincronización con Google Calendar completada', 'Cerrar', { duration: 3000 });
        this.loadCalendarEvents(); // Recargar eventos
      },
      error: (error) => {
        this.syncing.set(false);
        console.error('Error sincronizando:', error);
        this.snackBar.open('Error en la sincronización', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openExportDialog(): void {
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
}
