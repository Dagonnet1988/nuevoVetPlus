import { Component, OnInit, signal, computed, inject, Inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
  SesionActiva
} from '../../../services/usuarios.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

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
  private location = inject(Location);
  private usuariosService = inject(UsuariosService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  usuario = signal<Usuario | null>(null);
  sesionesActivas = signal<SesionActiva[]>([]);
  loadingSesiones = signal(false);

  usuarioId = computed(() => {
    const fromParam = this.route.snapshot.paramMap.get('id');
    const fromQuery = this.route.snapshot.queryParamMap.get('id');
    const fromSession = this.authService.currentUser()?.id_usuario;
    return fromParam || fromQuery || fromSession || '';
  });

  isUsuarioActivo = computed(() => this.usuario()?.activo || false);

  uploadingFirma = signal(false);
  firmaPreview = signal<string | null>(null);
  uploadingAvatar = signal(false);
  avatarPreview = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUsuario();
  }

  volver(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    const openedFromUsersList = !!this.route.snapshot.paramMap.get('id');
    if (openedFromUsersList && this.authService.hasRole('admin')) {
      this.router.navigate(['/usuarios']);
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  private loadUsuario(): void {
    const id = this.usuarioId();
    if (!id) {
      this.snackBar.open('No se encontró ID de usuario', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loading.set(true);
    this.usuariosService.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.loading.set(false);
        this.loadSesionesActivas();
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.loading.set(false);
        this.snackBar.open('Error cargando perfil del usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/usuarios']);
      }
    });
  }

  private loadSesionesActivas(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.loadingSesiones.set(true);
    this.usuariosService.getSesionesActivas({
      id_usuario: id,
      estado: 'todas',
      exclude_admins: false
    }).subscribe({
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
          this.usuario.update((u) => u ? { ...u, activo: !u.activo } : u);
          this.snackBar.open(`Usuario ${accion}do exitosamente`, 'Cerrar', { duration: 3000 });
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

    if (confirm(`¿Resetear la contraseña de ${usuario.nombre} ${usuario.apellido}? Se enviará una contraseña temporal por email.`)) {
      this.usuariosService.enviarPasswordTemporal(usuario.id_usuario).subscribe({
        next: (response) => {
          const tempPassword = response?.data?.tempPassword;
          if (tempPassword) {
            this.dialog.open(TempPasswordDialogComponent, {
              width: '520px',
              data: {
                usuario: `${usuario.nombre} ${usuario.apellido}`,
                password: tempPassword
              }
            });
          }

          const emailSent = response?.data?.email?.sent === true;
          const statusMessage = emailSent
            ? 'Se mostro la contrasena temporal y se envio por email.'
            : 'Se mostro la contrasena temporal. Envio por email pendiente de configuracion.';

          this.snackBar.open(statusMessage, 'Cerrar', { duration: 4500 });
        },
        error: (error) => {
          console.error('Error reseteando contraseña:', error);
          this.snackBar.open('Error reseteando contraseña', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  forzarCambioPassword(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    if (confirm(`¿Forzar cambio de contraseña para ${usuario.nombre} ${usuario.apellido}? El usuario deberá cambiar su contraseña en el próximo inicio de sesión.`)) {
      this.usuariosService.forzarCambioPassword(usuario.id_usuario).subscribe({
        next: () => {
          this.snackBar.open('Cambio de contraseña forzado exitosamente', 'Cerrar', { duration: 3000 });
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
          this.loadSesionesActivas();
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
          this.loadSesionesActivas();
        },
        error: (error) => {
          console.error('Error cerrando sesiones:', error);
          this.snackBar.open('Error cerrando sesiones', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  verMasSesiones(): void {
    const id = this.usuarioId();
    if (!id) {
      return;
    }

    if (this.authService.hasRole('admin')) {
      this.router.navigate(['/usuarios', id, 'sesiones']);
      return;
    }

    this.router.navigate(['/perfil/sesiones'], { queryParams: { id } });
  }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.snackBar.open('Solo se permiten archivos PNG, JPG o WEBP', 'Cerrar', { duration: 3000 });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.snackBar.open('La imagen no puede superar 4 MB', 'Cerrar', { duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    const id = this.usuarioId();
    if (!id) return;

    this.uploadingAvatar.set(true);
    this.usuariosService.uploadAvatar(id, file).subscribe({
      next: (data) => {
        const avatarUrl = data?.avatar_url || '';
        this.usuario.update(u => u ? { ...u, avatar_url: avatarUrl } : u);

        if (this.authService.currentUser()?.id_usuario === id) {
          this.authService.refreshUserInfo().subscribe({ error: () => {} });
        }

        this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 2500 });
        this.uploadingAvatar.set(false);
      },
      error: () => {
        this.snackBar.open('Error subiendo la foto de perfil', 'Cerrar', { duration: 3000 });
        this.uploadingAvatar.set(false);
      }
    });
  }

  getAvatarUrl(url?: string): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  onFirmaSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.snackBar.open('Solo se permiten archivos PNG o JPG', 'Cerrar', { duration: 3000 });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.snackBar.open('El archivo no puede superar 3 MB', 'Cerrar', { duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = e => this.firmaPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    const id = this.usuarioId();
    if (!id) return;
    this.uploadingFirma.set(true);
    this.usuariosService.uploadFirma(id, file).subscribe({
      next: (data) => {
        this.usuario.update(u => u ? { ...u, firma_url: data.firma_url } : u);
        this.snackBar.open('Firma subida exitosamente', 'Cerrar', { duration: 3000 });
        this.uploadingFirma.set(false);
      },
      error: () => {
        this.snackBar.open('Error subiendo la firma', 'Cerrar', { duration: 3000 });
        this.uploadingFirma.set(false);
      }
    });
  }

  getFirmaUrl(url?: string): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${environment.backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

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
    const diffInMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60)));
    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInMinutes < 1) return 'Hace menos de 1 minuto';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    if (diffInHours < 48) return 'Hace 1 día';

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;

    return this.formatearFecha(fecha);
  }

  formatearDuracionSesion(sesion: SesionActiva): string {
    const start = new Date(sesion.fecha_inicio).getTime();
    const end = sesion.fecha_logout
      ? new Date(sesion.fecha_logout).getTime()
      : Date.now();

    const durationSecondsRaw = typeof sesion.duracion_segundos === 'number'
      ? sesion.duracion_segundos
      : Math.max(0, Math.floor((end - start) / 1000));

    const totalMinutes = Math.floor(durationSecondsRaw / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getIconoDispositivoAcceso(dispositivo?: string): string {
    const normalized = (dispositivo || '').toLowerCase();
    if (normalized.includes('móvil') || normalized.includes('movil') || normalized.includes('mobile')) {
      return 'smartphone';
    }
    if (normalized.includes('tablet')) {
      return 'tablet_mac';
    }
    return 'computer';
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
      // Copiado exitoso (sin logs ruidosos en consola).
    }).catch(err => {
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
