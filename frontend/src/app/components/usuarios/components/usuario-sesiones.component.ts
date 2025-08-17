import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
  SesionActiva
} from '../../../services/usuarios.service';

@Component({
  selector: 'app-usuario-sesiones',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
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
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  usuario = signal<Usuario | null>(null);
  sesiones = signal<SesionActiva[]>([]);
  sesionesActivas = signal<SesionActiva[]>([]);
  totalSesiones = 0;
  pageSize = 25;

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
  usuarioId = computed(() => this.route.snapshot.paramMap.get('id') || '');
  sesionesActivasCount = computed(() => this.sesionesActivas().length);
  
  estadisticasSesiones = computed(() => {
    const todas = this.sesiones();
    const activas = this.sesionesActivas();
    
    const dispositivos = new Set(todas.map(s => this.getDeviceType(s.dispositivo)));
    const navegadores = new Set(todas.map(s => s.navegador.split(' ')[0]));
    const ubicaciones = new Set(todas.map(s => s.ubicacion).filter(Boolean));
    
    return {
      total_sesiones: todas.length,
      sesiones_activas: activas.length,
      dispositivos_unicos: dispositivos.size,
      navegadores_unicos: navegadores.size,
      ubicaciones_unicas: ubicaciones.size,
      sesion_mas_larga: this.getSesionMasLarga(todas)
    };
  });

  ngOnInit(): void {
    this.loadUsuario();
    this.loadSesiones();
  }

  private loadUsuario(): void {
    const id = this.usuarioId();
    if (!id) {
      this.router.navigate(['/usuarios']);
      return;
    }

    this.usuariosService.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.snackBar.open('Error cargando información del usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/usuarios']);
      }
    });
  }

  private loadSesiones(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.loading.set(true);
    
    // Cargar sesiones activas
    this.usuariosService.getSesionesActivas(id).subscribe({
      next: (sesionesActivas) => {
        this.sesionesActivas.set(sesionesActivas || []);
        
        // Para el historial completo, usar mock data por ahora
        const todasLasSesiones = [
          ...sesionesActivas || [],
          ...this.getMockHistorialSesiones()
        ];
        
        this.sesiones.set(todasLasSesiones);
        this.totalSesiones = todasLasSesiones.length;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando sesiones:', error);
        const mockSesiones = this.getMockSesiones();
        this.sesiones.set(mockSesiones);
        this.sesionesActivas.set(mockSesiones.filter(s => s.activa));
        this.totalSesiones = mockSesiones.length;
        this.loading.set(false);
      }
    });
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
    const id = this.usuarioId();
    if (id) {
      this.router.navigate(['/usuarios', id]);
    }
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

  private getSesionMasLarga(sesiones: SesionActiva[]): string {
    if (sesiones.length === 0) return '0 min';
    
    let maxDuration = 0;
    sesiones.forEach(sesion => {
      const duracion = this.calcularDuracionEnMinutos(sesion.fecha_inicio, sesion.ultima_actividad);
      if (duracion > maxDuration) {
        maxDuration = duracion;
      }
    });
    
    if (maxDuration < 60) return `${maxDuration} min`;
    
    const hours = Math.floor(maxDuration / 60);
    const minutes = maxDuration % 60;
    
    return `${hours}h ${minutes}m`;
  }

  private calcularDuracionEnMinutos(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60));
  }

  // Mock data para desarrollo
  private getMockSesiones(): SesionActiva[] {
    const usuario = this.usuario();
    if (!usuario) return [];

    return [
      {
        id_sesion: '1',
        id_usuario: usuario.id_usuario,
        usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ubicacion: 'Bogotá, Colombia',
        fecha_inicio: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        ultima_actividad: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        dispositivo: 'Windows Desktop',
        navegador: 'Chrome 91',
        activa: true
      },
      {
        id_sesion: '2',
        id_usuario: usuario.id_usuario,
        usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        ubicacion: 'Bogotá, Colombia',
        fecha_inicio: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        ultima_actividad: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        dispositivo: 'iPhone',
        navegador: 'Safari Mobile',
        activa: true
      }
    ];
  }

  private getMockHistorialSesiones(): SesionActiva[] {
    const usuario = this.usuario();
    if (!usuario) return [];

    return [
      {
        id_sesion: '3',
        id_usuario: usuario.id_usuario,
        usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ubicacion: 'Bogotá, Colombia',
        fecha_inicio: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ultima_actividad: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        dispositivo: 'Windows Desktop',
        navegador: 'Chrome 91',
        activa: false
      },
      {
        id_sesion: '4',
        id_usuario: usuario.id_usuario,
        usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
        ip_address: '192.168.1.102',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ubicacion: 'Medellín, Colombia',
        fecha_inicio: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        ultima_actividad: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
        dispositivo: 'MacBook Pro',
        navegador: 'Chrome 90',
        activa: false
      },
      {
        id_sesion: '5',
        id_usuario: usuario.id_usuario,
        usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
        ip_address: '192.168.1.103',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ubicacion: 'Cali, Colombia',
        fecha_inicio: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        ultima_actividad: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
        dispositivo: 'Linux Desktop',
        navegador: 'Firefox 89',
        activa: false
      }
    ];
  }
}