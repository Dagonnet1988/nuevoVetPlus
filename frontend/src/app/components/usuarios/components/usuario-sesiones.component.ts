import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { ViewChild } from '@angular/core';

import {
  UsuariosService,
  Usuario,
  SesionActiva,
  FiltroSesiones
} from '../../../services/usuarios.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-usuario-sesiones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './usuario-sesiones.component.html',
  styleUrl: './usuario-sesiones.component.css'
})
export class UsuarioSesionesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  usuario = signal<Usuario | null>(null);
  usuariosFiltro = signal<Usuario[]>([]);
  sesiones = signal<SesionActiva[]>([]);
  sesionesActivas = signal<SesionActiva[]>([]);
  totalSesiones = 0;
  pageSize = 25;
  estadoFiltro = signal<'activas' | 'cerradas' | 'todas'>('activas');
  usuarioFiltroId = signal('');
  textoFiltro = signal('');

  // Table configuration
  displayedColumns = [
    'dispositivo',
    'navegador',
    'ubicacion',
    'ip_address',
    'fecha_inicio',
    'ultima_actividad',
    'estado',
    'acciones'
  ];

  // Computed
  private explicitUsuarioId = computed(() => {
    const fromParam = this.route.snapshot.paramMap.get('id');
    const fromQuery = this.route.snapshot.queryParamMap.get('id');
    return fromParam || fromQuery || '';
  });

  usuarioId = computed(() => {
    const explicit = this.explicitUsuarioId();
    if (explicit) return explicit;
    if (this.authService.hasRole('admin')) return '';
    return this.authService.currentUser()?.id_usuario || '';
  });

  isGlobalView = computed(() => this.authService.hasRole('admin') && !this.explicitUsuarioId());
  canManageSessions = computed(() => this.authService.hasRole('admin'));
  sesionesActivasCount = computed(() => this.sesionesActivas().length);

  ngOnInit(): void {
    if (!this.isGlobalView()) {
      this.loadUsuario();
    }
    if (this.canManageSessions()) {
      this.loadUsuariosFiltro();
    }
    this.loadSesiones();
  }

  private loadUsuariosFiltro(): void {
    this.usuariosService.getUsuarios(1, 200).subscribe({
      next: (usuarios) => {
        const list = Array.isArray(usuarios) ? usuarios : [];
        this.usuariosFiltro.set(
          list
            .filter((u: Usuario) => u.rol !== 'admin')
            .sort((a: Usuario, b: Usuario) => (`${a.nombre} ${a.apellido}`).localeCompare(`${b.nombre} ${b.apellido}`))
        );
      },
      error: () => {
        this.usuariosFiltro.set([]);
      }
    });
  }

  private loadUsuario(): void {
    const id = this.usuarioId();
    if (!id) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.usuariosService.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.snackBar.open('Error cargando información del usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadSesiones(): void {
    const id = this.usuarioId();

    this.loading.set(true);

    const filtros: FiltroSesiones = {
      estado: this.estadoFiltro(),
      exclude_admins: true
    };

    if (id) {
      filtros.id_usuario = id;
    } else if (this.usuarioFiltroId()) {
      filtros.id_usuario = this.usuarioFiltroId();
    }

    if (this.textoFiltro().trim()) {
      filtros.search = this.textoFiltro().trim();
    }

    this.usuariosService.getSesionesActivas(filtros).subscribe({
      next: (sesionesResponse) => {
        const accesos = Array.isArray(sesionesResponse) ? sesionesResponse : [];
        this.sesionesActivas.set(accesos.filter(s => s.activa));
        this.sesiones.set(accesos);
        this.totalSesiones = accesos.length;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando sesiones:', error);
        this.sesiones.set([]);
        this.sesionesActivas.set([]);
        this.totalSesiones = 0;
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los accesos del usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  aplicarFiltros(): void {
    this.loadSesiones();
  }

  limpiarFiltros(): void {
    this.estadoFiltro.set('activas');
    this.usuarioFiltroId.set('');
    this.textoFiltro.set('');
    this.loadSesiones();
  }

  // Acciones
  cerrarSesion(sesion: SesionActiva): void {
    if (!sesion.activa) {
      this.snackBar.open('Esta sesión ya está cerrada', 'Cerrar', { duration: 2000 });
      return;
    }

    if (confirm(`¿Cerrar la sesión desde ${sesion.dispositivo}?`)) {
      this.usuariosService.cerrarSesion(sesion.id_sesion).subscribe({
        next: () => {
          this.snackBar.open('Sesión cerrada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadSesiones(); // Recargar datos
        },
        error: (error) => {
          console.error('Error cerrando sesión:', error);
          this.snackBar.open('Error cerrando sesión', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  cerrarTodasLasSesiones(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    const sesionesActivas = this.sesionesActivas();
    if (sesionesActivas.length === 0) {
      this.snackBar.open('No hay sesiones activas para cerrar', 'Cerrar', { duration: 2000 });
      return;
    }

    if (confirm(`¿Cerrar todas las ${sesionesActivas.length} sesiones activas de ${usuario.nombre} ${usuario.apellido}?`)) {
      this.usuariosService.cerrarTodasLasSesiones(usuario.id_usuario).subscribe({
        next: () => {
          this.snackBar.open('Todas las sesiones han sido cerradas', 'Cerrar', { duration: 3000 });
          this.loadSesiones(); // Recargar datos
        },
        error: (error) => {
          console.error('Error cerrando sesiones:', error);
          this.snackBar.open('Error cerrando sesiones', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  volverAlPerfil(): void {
    if (this.isGlobalView()) {
      this.router.navigate(['/usuarios']);
      return;
    }

    if (this.authService.hasRole('admin')) {
      const id = this.usuarioId();
      if (id) {
        this.router.navigate(['/usuarios', id]);
        return;
      }
    }
    this.router.navigate(['/perfil']);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    // En una implementación real, aquí se haría una nueva consulta al servidor
    // Por ahora, la paginación es manejada por Angular Material
  }

  // Utility methods
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaRelativa(fecha: string): string {
    const now = new Date();
    const date = new Date(fecha);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    if (diffInHours < 48) return 'Hace 1 día';

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;

    return this.formatearFecha(fecha);
  }

  calcularDuracionSesion(fechaInicio: string, fechaFin?: string): string {
    const inicio = new Date(fechaInicio);
    const fin = fechaFin ? new Date(fechaFin) : new Date();
    const diffInMinutes = Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes} min`;

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  formatearDuracionSesion(sesion: SesionActiva): string {
    if (typeof sesion.duracion_segundos === 'number') {
      const totalMinutes = Math.max(0, Math.floor(sesion.duracion_segundos / 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes} min`;
    }

    return this.calcularDuracionSesion(sesion.fecha_inicio, sesion.fecha_logout || undefined);
  }

  getDeviceType(dispositivo: string): string {
    if (dispositivo.includes('iPhone') || dispositivo.includes('Android')) return 'Móvil';
    if (dispositivo.includes('iPad') || dispositivo.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  getDeviceIcon(dispositivo: string): string {
    const tipo = this.getDeviceType(dispositivo);
    switch (tipo) {
      case 'Móvil': return 'smartphone';
      case 'Tablet': return 'tablet';
      default: return 'computer';
    }
  }

  getBrowserIcon(navegador: string): string {
    const browser = navegador.toLowerCase();
    if (browser.includes('chrome')) return 'web';
    if (browser.includes('firefox')) return 'web';
    if (browser.includes('safari')) return 'web';
    if (browser.includes('edge')) return 'web';
    return 'language';
  }

  getLocationFlag(ubicacion: string): string {
    if (!ubicacion) return '🌍';
    if (ubicacion.includes('Colombia')) return '🇨🇴';
    if (ubicacion.includes('México')) return '🇲🇽';
    if (ubicacion.includes('España')) return '🇪🇸';
    if (ubicacion.includes('Argentina')) return '🇦🇷';
    return '🌍';
  }

  private calcularDuracionEnMinutos(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60));
  }

}
