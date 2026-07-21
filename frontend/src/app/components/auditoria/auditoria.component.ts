import { extractError } from '../../utils/error.utils';
import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  AuditoriaService,
  ActivityLog,
  SessionLog,
  AuditStats,
  ActivityFilters,
  SessionFilters
} from '../../services/auditoria.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss'
})
export class AuditoriaComponent implements OnInit {
  private auditoriaService = inject(AuditoriaService);
  private snackBar = inject(MatSnackBar);

  // ── Estado de carga ──────────────────────────────────
  loadingActivities = signal(false);
  loadingSessions   = signal(false);
  loadingStats      = signal(false);

  // ── Datos ─────────────────────────────────────────────
  activities = signal<ActivityLog[]>([]);
  sessions   = signal<SessionLog[]>([]);
  stats      = signal<AuditStats | null>(null);

  // ── Paginación actividades ────────────────────────────
  totalActivities = signal(0);
  pageSize        = signal(25);
  pageIndex       = signal(0);

  // ── Paginación sesiones ───────────────────────────────
  totalSessions   = signal(0);
  pageSizeSessions = signal(25);
  pageIndexSessions = signal(0);

  // ── Filtros actividades ───────────────────────────────
  filtroTipo          = signal('');
  filtroResultado     = signal('');
  filtroUsuario       = signal('');
  filtroFechaIni      = signal('');
  filtroFechaFin      = signal('');

  // ── Filtros sesiones ─────────────────────────────────────────────
  filtroEvento         = signal('');
  filtroSesionExito    = signal('');
  filtroSesionFechaIni = signal('');
  filtroSesionFechaFin = signal('');

  // ── Tab activo ─────────────────────────────────────────────────
  selectedTab = signal(0);

  private usuarioDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Columnas de tablas ────────────────────────────────
  activityColumns = ['timestamp', 'usuario', 'tipo', 'descripcion', 'metodo', 'status', 'duracion'];
  sessionColumns  = ['timestamp', 'usuario', 'evento', 'resultado', 'ip', 'agente'];

  // ── Computed ──────────────────────────────────────────
  statsCards = computed(() => {
    const s   = this.stats();
    if (!s) return [];
    const tab   = this.selectedTab();
    const resul = this.filtroResultado();
    const evt   = this.filtroEvento();
    const exito = this.filtroSesionExito();
    return [
      { label: 'Usuarios activos',  value: s.usuarios_activos        ?? '—', icon: 'people',        color: '#1976d2',
        active: false,                                         tooltip: 'Ver todas las actividades',        clickAction: 'all'     },
      { label: 'Total acciones',    value: s.total_activities        ?? '—', icon: 'bolt',          color: '#388e3c',
        active: tab === 0 && resul === '',                     tooltip: 'Mostrar todas las acciones',       clickAction: 'all'     },
      { label: 'Exitosas',          value: s.successful_activities   ?? '—', icon: 'check_circle',  color: '#00796b',
        active: tab === 0 && resul === 'SUCCESS',              tooltip: 'Filtrar solo acciones exitosas',   clickAction: 'success' },
      { label: 'Errores',           value: s.failed_activities       ?? '—', icon: 'error_outline', color: '#d32f2f',
        active: tab === 0 && resul === 'ERROR',                tooltip: 'Filtrar solo errores (4xx/5xx)',   clickAction: 'error'   },
      { label: 'IPs únicas',         value: s.ips_unicas              ?? '—', icon: 'router',        color: '#f57c00',
        active: tab === 1 && evt === '' && exito === '',       tooltip: 'Ver sesiones y sus IPs de acceso', clickAction: 'ips'     },
      { label: 'Logins exitosos',   value: s.successful_logins       ?? '—', icon: 'login',         color: '#5c6bc0',
        active: tab === 1 && evt === 'LOGIN' && exito === 'true', tooltip: 'Filtrar solo logins exitosos', clickAction: 'logins'  },
    ];
  });

  readonly tiposActividad = [
    { value: '', label: 'Todos' },
    { value: 'LOGIN',             label: 'Login' },
    { value: 'LOGOUT',            label: 'Logout' },
    { value: 'CREATE',            label: 'Creación' },
    { value: 'UPDATE',            label: 'Actualización' },
    { value: 'DELETE',            label: 'Eliminación' },
    { value: 'READ',              label: 'Consulta' },
    { value: 'MEDICAL_ACCESS',    label: 'Historia clínica' },
    { value: 'HISTORIA_CLINICA',  label: 'Historia clínica' },
    { value: 'CLIENT_MANAGEMENT', label: 'Propietarios' },
    { value: 'PROPIETARIOS',      label: 'Propietarios' },
    { value: 'PET_MANAGEMENT',    label: 'Mascotas' },
    { value: 'MASCOTAS',          label: 'Mascotas' },
    { value: 'CITAS',             label: 'Citas' },
    { value: 'PASSWORD_RESET',    label: 'Reset contraseña' },
  ];

  ngOnInit(): void {
    this.loadActivities();
    this.loadSessions();
    this.loadStats();
  }

  // ── Carga de datos ────────────────────────────────────

  loadActivities(): void {
    this.loadingActivities.set(true);
    const filters: ActivityFilters = {
      limit:  this.pageSize(),
      offset: this.pageIndex() * this.pageSize(),
    };
    if (this.filtroTipo())       filters.tipo_actividad = this.filtroTipo();
    if (this.filtroResultado())  filters.resultado      = this.filtroResultado();
    if (this.filtroUsuario())    filters.usuario_email  = this.filtroUsuario();
    if (this.filtroFechaIni())   filters.fecha_inicio   = this.filtroFechaIni();
    if (this.filtroFechaFin())   filters.fecha_fin      = this.filtroFechaFin();

    this.auditoriaService.getActivities(filters).subscribe({
      next: (res) => {
        this.activities.set(res.data ?? []);
        this.totalActivities.set(res.pagination?.total ?? res.data?.length ?? 0);
        this.loadingActivities.set(false);
      },
      error: (err) => {
        this.snackBar.open(extractError(err, 'Error cargando actividades'), 'Cerrar', { duration: 3000 });
        this.loadingActivities.set(false);
      }
    });
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    const filters: SessionFilters = {
      limit:  this.pageSizeSessions(),
      offset: this.pageIndexSessions() * this.pageSizeSessions(),
    };
    if (this.filtroEvento())          filters.tipo_evento  = this.filtroEvento();
    if (this.filtroSesionExito())     filters.exito        = this.filtroSesionExito();
    if (this.filtroSesionFechaIni())  filters.fecha_inicio = this.filtroSesionFechaIni();
    if (this.filtroSesionFechaFin())  filters.fecha_fin    = this.filtroSesionFechaFin();

    this.auditoriaService.getSessions(filters).subscribe({
      next: (res) => {
        this.sessions.set(res.data ?? []);
        this.totalSessions.set(res.pagination?.total ?? res.data?.length ?? 0);
        this.loadingSessions.set(false);
      },
      error: (err) => {
        this.snackBar.open(extractError(err, 'Error cargando sesiones'), 'Cerrar', { duration: 3000 });
        this.loadingSessions.set(false);
      }
    });
  }

  loadStats(): void {
    this.loadingStats.set(true);
    // Últimos 30 días por defecto
    const end   = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    this.auditoriaService.getStats(start, end).subscribe({
      next: (res) => {
        // El backend devuelve { data: { resumen: {...}, top_usuarios: [], actividad_diaria: [] } }
        const resumen = (res.data as any)?.resumen ?? res.data;
        this.stats.set(resumen ?? null);
        this.loadingStats.set(false);
      },
      error: (_err) => {
        this.loadingStats.set(false);
      }
    });
  }

  // ── Eventos UI ────────────────────────────────────────

  onPageActivities(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadActivities();
  }

  onPageSessions(event: PageEvent): void {
    this.pageIndexSessions.set(event.pageIndex);
    this.pageSizeSessions.set(event.pageSize);
    this.loadSessions();
  }

  limpiarFiltros(): void {
    this.filtroTipo.set('');
    this.filtroResultado.set('');
    this.filtroUsuario.set('');
    this.filtroFechaIni.set('');
    this.filtroFechaFin.set('');
    this.pageIndex.set(0);
    this.loadActivities();
  }

  limpiarFiltrosSesiones(): void {
    this.filtroEvento.set('');
    this.filtroSesionExito.set('');
    this.filtroSesionFechaIni.set('');
    this.filtroSesionFechaFin.set('');
    this.pageIndexSessions.set(0);
    this.loadSessions();
  }

  onActivityFilterChange(): void {
    this.pageIndex.set(0);
    this.loadActivities();
  }

  onSessionFilterChange(): void {
    this.pageIndexSessions.set(0);
    this.loadSessions();
  }

  onUsuarioInput(value: string): void {
    this.filtroUsuario.set(value);
    if (this.usuarioDebounce) clearTimeout(this.usuarioDebounce);
    this.usuarioDebounce = setTimeout(() => this.onActivityFilterChange(), 400);
  }

  onStatCardClick(action: string): void {
    switch (action) {
      case 'all':
        this.filtroResultado.set('');
        this.selectedTab.set(0);
        this.onActivityFilterChange();
        break;
      case 'success':
        this.filtroResultado.set('SUCCESS');
        this.selectedTab.set(0);
        this.onActivityFilterChange();
        break;
      case 'error':
        this.filtroResultado.set('ERROR');
        this.selectedTab.set(0);
        this.onActivityFilterChange();
        break;
      case 'ips':
        this.filtroEvento.set('');
        this.filtroSesionExito.set('');
        this.selectedTab.set(1);
        this.onSessionFilterChange();
        break;
      case 'logins':
        this.filtroEvento.set('LOGIN');
        this.filtroSesionExito.set('true');
        this.selectedTab.set(1);
        this.onSessionFilterChange();
        break;
    }
  }

  refrescar(): void {
    this.loadActivities();
    this.loadSessions();
    this.loadStats();
  }

  // ── Helpers de presentación ───────────────────────────

  getStatusColor(status: number): string {
    if (status >= 500) return '#d32f2f';
    if (status >= 400) return '#f57c00';
    if (status >= 300) return '#1976d2';
    return '#388e3c';
  }

  getMetodoColor(metodo: string): string {
    const colores: Record<string, string> = {
      GET: '#1976d2', POST: '#388e3c', PUT: '#f57c00',
      PATCH: '#7b1fa2', DELETE: '#d32f2f'
    };
    return colores[metodo] ?? '#607d8b';
  }

  getTipoIcon(tipo: string): string {
    const iconos: Record<string, string> = {
      LOGIN: 'login', LOGOUT: 'logout', CREATE: 'add_circle',
      UPDATE: 'edit', DELETE: 'delete', READ: 'visibility',
      MEDICAL_ACCESS: 'medical_services', HISTORIA_CLINICA: 'medical_services',
      CLIENT_MANAGEMENT: 'person', PROPIETARIOS: 'person',
      PET_MANAGEMENT: 'pets', MASCOTAS: 'pets',
      CITAS: 'event', PASSWORD_RESET: 'lock_reset'
    };
    return iconos[tipo] ?? 'info';
  }

  getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      LOGIN: 'Inicio de sesión',
      LOGOUT: 'Cierre de sesión',
      CREATE: 'Creación',
      UPDATE: 'Actualización',
      DELETE: 'Eliminación',
      READ: 'Consulta',
      MEDICAL_ACCESS: 'Historia clínica',
      HISTORIA_CLINICA: 'Historia clínica',
      CLIENT_MANAGEMENT: 'Propietarios',
      PROPIETARIOS: 'Propietarios',
      PET_MANAGEMENT: 'Mascotas',
      MASCOTAS: 'Mascotas',
      CITAS: 'Citas',
      PASSWORD_RESET: 'Cambio de contraseña'
    };

    return labels[tipo] ?? tipo;
  }

  formatDuration(ms: number): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  formatUserAgent(ua: string): string {
    if (!ua) return '—';
    if (ua.includes('Chrome'))  return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari'))  return 'Safari';
    if (ua.includes('Edge'))    return 'Edge';
    return ua.substring(0, 30) + '…';
  }
}
