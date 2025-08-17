import { Component, OnInit, signal, computed, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  UsuariosService,
  Usuario,
  LogActividad,
  SesionActiva,
  EstadisticasUsuario
} from '../../../services/usuarios.service';

@Component({
  selector: 'app-usuario-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './usuario-profile.component.html',
  styleUrl: './usuario-profile.component.css'
})
export class UsuarioProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(false);
  usuario = signal<Usuario | null>(null);
  logsActividad = signal<LogActividad[]>([]);
  sesionesActivas = signal<SesionActiva[]>([]);
  loadingLogs = signal(false);
  loadingSesiones = signal(false);

  // Computed
  usuarioId = computed(() => this.route.snapshot.paramMap.get('id') || '');
  isUsuarioActivo = computed(() => this.usuario()?.activo || false);
  tienePermisos = computed(() => {
    const usuario = this.usuario();
    return usuario?.rol === 'admin' || usuario?.rol === 'vet';
  });

  estadisticasResumen = computed(() => {
    const stats = this.usuario()?.estadisticas;
    if (!stats) return [];

    return [
      { label: 'Citas Realizadas', value: stats.total_citas, icon: 'event', color: '#3182ce' },
      { label: 'Consultas', value: stats.total_consultas, icon: 'medical_services', color: '#38a169' },
      { label: 'Pacientes Atendidos', value: stats.total_pacientes_atendidos, icon: 'pets', color: '#805ad5' },
      { label: 'Horas Trabajadas', value: stats.horas_trabajadas, icon: 'access_time', color: '#ed8936' },
      { label: 'Calificación', value: stats.calificacion_promedio.toFixed(1), icon: 'star', color: '#f56565' },
      { label: 'Sesiones Activas', value: stats.sesiones_activas, icon: 'devices', color: '#38b2ac' }
    ];
  });

  ngOnInit(): void {
    this.loadUsuario();
  }

  private loadUsuario(): void {
    const id = this.usuarioId();
    if (!id) {
      this.router.navigate(['/usuarios']);
      return;
    }

    this.loading.set(true);
    this.usuariosService.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.loading.set(false);

        // Cargar datos adicionales cuando estén disponibles los endpoints
        // this.loadLogsActividad();
        // this.loadSesionesActivas();

        // Temporalmente inicializar arrays vacíos
        this.logsActividad.set([]);
        this.sesionesActivas.set([]);
        this.loadingLogs.set(false);
        this.loadingSesiones.set(false);
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.snackBar.open('Error cargando información del usuario', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/usuarios']);
      }
    });
  }

  private loadLogsActividad(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.loadingLogs.set(true);
    this.usuariosService.getLogsUsuario(id, 1, 10).subscribe({
      next: (response) => {
        const logs = response?.data || response || [];
        this.logsActividad.set(Array.isArray(logs) ? logs : []);
        this.loadingLogs.set(false);
      },
      error: (error) => {
        console.error('Error cargando logs de actividad:', error);
        this.logsActividad.set([]);
        this.loadingLogs.set(false);
      }
    });
  }

  private loadSesionesActivas(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.loadingSesiones.set(true);
    this.usuariosService.getSesionesActivas(id).subscribe({
      next: (sesiones) => {
        this.sesionesActivas.set(Array.isArray(sesiones) ? sesiones : []);
        this.loadingSesiones.set(false);
      },
      error: (error) => {
        console.error('Error cargando sesiones:', error);
        this.sesionesActivas.set([]);
        this.loadingSesiones.set(false);
      }
    });
  }

  // Acciones
  editarUsuario(): void {
    const id = this.usuarioId();
    if (id) {
      this.router.navigate(['/usuarios', id, 'editar']);
    }
  }

  toggleEstadoUsuario(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    const accion = usuario.activo ? 'desactivar' : 'activar';
    const mensaje = `¿Estás seguro de ${accion} el usuario ${usuario.nombre} ${usuario.apellido}?`;

    if (confirm(mensaje)) {
      this.usuariosService.toggleUsuarioEstado(usuario.id_usuario, !usuario.activo).subscribe({
        next: () => {
          this.snackBar.open(`Usuario ${accion}do exitosamente`, 'Cerrar', { duration: 3000 });
          this.loadUsuario(); // Recargar datos
        },
        error: (error) => {
          console.error(`Error ${accion}ndo usuario:`, error);
          this.snackBar.open(`Error ${accion}ndo usuario`, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  resetearPassword(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    if (confirm(`¿Resetear la contraseña de ${usuario.nombre} ${usuario.apellido}? Se generará una contraseña temporal que deberá cambiar en el primer acceso.`)) {
      // Usar el método de administrador para generar contraseña temporal
      this.usuariosService.generarPasswordTemporal(usuario.id_usuario).subscribe({
        next: (response) => {
          console.log('Respuesta completa del servidor:', response);

          // Intentar obtener la contraseña de diferentes posibles estructuras
          const tempPassword = response.password_temporal ||
                              response.data?.password_temporal ||
                              response.passwordTemporal ||
                              response.data?.passwordTemporal ||
                              response.password ||
                              response.data?.password;

          if (tempPassword) {
            // Mostrar la contraseña temporal en un diálogo profesional
            this.dialog.open(TempPasswordDialogComponent, {
              width: '500px',
              data: {
                usuario: `${usuario.nombre} ${usuario.apellido}`,
                password: tempPassword
              },
              disableClose: true
            });

            // También mostrar en consola para fácil copia
            console.log(`Contraseña temporal para ${usuario.nombre} ${usuario.apellido}: ${tempPassword}`);
          } else {
            console.warn('No se encontró la contraseña temporal en la respuesta:', response);
            alert('Contraseña temporal generada, pero no se pudo obtener del servidor. Revisa la consola para más detalles.');
          }

          this.snackBar.open('Contraseña temporal generada exitosamente', 'Cerrar', { duration: 5000 });

          // Recargar datos del usuario para actualizar estado
          this.loadUsuario();
        },
        error: (error) => {
          console.error('Error generando contraseña temporal:', error);
          this.snackBar.open('Error generando contraseña temporal', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  enviarCredenciales(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    this.usuariosService.enviarPasswordTemporal(usuario.id_usuario).subscribe({
      next: () => {
        this.snackBar.open('Credenciales enviadas por email', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error enviando credenciales:', error);
        this.snackBar.open('Error enviando credenciales', 'Cerrar', { duration: 3000 });
      }
    });
  }

  forzarCambioPassword(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    if (confirm(`¿Forzar cambio de contraseña para ${usuario.nombre} ${usuario.apellido}? El usuario deberá cambiar su contraseña en el próximo inicio de sesión.`)) {
      this.usuariosService.forzarCambioPassword(usuario.id_usuario).subscribe({
        next: () => {
          this.snackBar.open('Cambio de contraseña forzado exitosamente', 'Cerrar', { duration: 3000 });
          // Recargar datos del usuario para actualizar estado
          this.loadUsuario();
        },
        error: (error) => {
          console.error('Error forzando cambio de contraseña:', error);
          this.snackBar.open('Error forzando cambio de contraseña', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  cerrarSesion(sesion: SesionActiva): void {
    if (confirm(`¿Cerrar la sesión desde ${sesion.dispositivo}?`)) {
      this.usuariosService.cerrarSesion(sesion.id_sesion).subscribe({
        next: () => {
          this.snackBar.open('Sesión cerrada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadSesionesActivas(); // Recargar sesiones
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

    if (confirm(`¿Cerrar todas las sesiones activas de ${usuario.nombre} ${usuario.apellido}?`)) {
      this.usuariosService.cerrarTodasLasSesiones(usuario.id_usuario).subscribe({
        next: () => {
          this.snackBar.open('Todas las sesiones han sido cerradas', 'Cerrar', { duration: 3000 });
          this.loadSesionesActivas(); // Recargar sesiones
        },
        error: (error) => {
          console.error('Error cerrando sesiones:', error);
          this.snackBar.open('Error cerrando sesiones', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  verMasLogs(): void {
    const id = this.usuarioId();
    if (id) {
      this.router.navigate(['/usuarios', id, 'actividad']);
    }
  }

  verMasSesiones(): void {
    const id = this.usuarioId();
    if (id) {
      this.router.navigate(['/usuarios', id, 'sesiones']);
    }
  }

  // Utility methods
  formatearRol(rol: string): string {
    return this.usuariosService.formatearRol(rol);
  }

  formatearTipoDocumento(tipo: string): string {
    return this.usuariosService.formatearTipoDocumento(tipo);
  }

  getColorRol(rol: string): string {
    return this.usuariosService.getColorRol(rol);
  }

  getIconoRol(rol: string): string {
    return this.usuariosService.getIconoRol(rol);
  }

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

  getColorTipoLog(tipo: string): string {
    const colores: { [key: string]: string } = {
      login: '#38a169',
      logout: '#ed8936',
      create: '#3182ce',
      update: '#805ad5',
      delete: '#e53e3e',
      view: '#4a5568',
      export: '#38b2ac',
      error: '#e53e3e'
    };
    return colores[tipo] || '#4a5568';
  }

  getIconoTipoLog(tipo: string): string {
    const iconos: { [key: string]: string } = {
      login: 'login',
      logout: 'logout',
      create: 'add',
      update: 'edit',
      delete: 'delete',
      view: 'visibility',
      export: 'download',
      error: 'error'
    };
    return iconos[tipo] || 'info';
  }
}

// Componente de diálogo para mostrar contraseña temporal
@Component({
  selector: 'temp-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="temp-password-dialog">
      <mat-dialog-content>
        <div class="dialog-header">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <h2>Contraseña Temporal Generada</h2>
        </div>

        <div class="user-info">
          <p>Para el usuario: <strong>{{ data.usuario }}</strong></p>
        </div>

        <div class="password-section">
          <label>Contraseña temporal:</label>
          <div class="password-container">
            <code class="password-code">{{ data.password }}</code>
            <button mat-icon-button
                    (click)="copyToClipboard()"
                    matTooltip="Copiar al portapapeles">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>

        <div class="warning-section">
          <mat-icon class="warning-icon">warning</mat-icon>
          <p>
            <strong>Importante:</strong> El usuario deberá cambiar esta contraseña en su primer acceso.
            Guarda esta información ya que no podrás verla nuevamente.
          </p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button
                (click)="copyToClipboard()"
                color="primary">
          <mat-icon>content_copy</mat-icon>
          Copiar
        </button>
        <button mat-raised-button
                color="primary"
                [mat-dialog-close]="true">
          Entendido
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .temp-password-dialog {
      min-width: 400px;
    }

    .dialog-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .success-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #4caf50;
      margin-bottom: 10px;
    }

    .dialog-header h2 {
      margin: 0;
      color: #333;
    }

    .user-info {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .password-section {
      margin-bottom: 20px;
    }

    .password-section label {
      font-weight: 500;
      color: #666;
      display: block;
      margin-bottom: 8px;
    }

    .password-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 2px solid #2196f3;
      border-radius: 4px;
      padding: 12px;
    }

    .password-code {
      flex: 1;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      color: #2196f3;
      background: transparent;
      letter-spacing: 1px;
    }

    .warning-section {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 12px;
    }

    .warning-icon {
      color: #856404;
      margin-top: 2px;
    }

    .warning-section p {
      margin: 0;
      color: #856404;
      font-size: 14px;
    }
  `]
})
export class TempPasswordDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TempPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { usuario: string; password: string }
  ) {}

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.data.password).then(() => {
      // Podríamos mostrar un snackbar aquí, pero como es un diálogo modal,
      // es mejor un feedback visual simple
      console.log('Contraseña copiada al portapapeles');
    }).catch(err => {
      console.error('Error al copiar al portapapeles:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = this.data.password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  }
}
