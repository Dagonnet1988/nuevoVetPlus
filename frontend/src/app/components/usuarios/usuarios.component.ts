import { Component, OnInit, signal, computed, ViewChild, inject, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TempPasswordDialogComponent } from './components/usuario-profile.component';

import {
  UsuariosService,
  Usuario,
  FiltroUsuarios,
  ResumenUsuarios
} from '../../services/usuarios.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatBadgeModule
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private location = inject(Location);

  // Signals
  loading = signal(false);
  usuarios = signal<Usuario[]>([]);
  resumen = signal<ResumenUsuarios>({
    total_usuarios: 0,
    usuarios_activos: 0,
    usuarios_inactivos: 0,
    usuarios_primer_acceso: 0,
    distribución_roles: [],
    nuevos_este_mes: 0,
    sesiones_activas: 0
  });
  currentView = signal<'todos' | 'activos' | 'inactivos'>('todos');
  private selectedAvatarUserId: string | null = null;

  // Form y paginación
  filterForm: FormGroup;
  totalUsuarios = 0;
  pageSize = 25;

  // Configuración de tabla
  displayedColumns = [
    'usuario',
    'documento',
    'rol',
    'profesional',
    'estado',
    'ultimo_acceso',
    'acciones'
  ];

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      rol: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  private loadInitialData(): void {
    this.loadUsuarios();
  }

  private loadUsuarios(): void {
    this.loading.set(true);

    const filtros: FiltroUsuarios = this.buildFiltros();

    this.usuariosService.getUsuarios(1, this.pageSize, filtros).subscribe({
      next: (usuarios) => {
        const usersArray = Array.isArray(usuarios) ? usuarios : [];
        const visibleUsers = usersArray.filter((u: Usuario) => u.rol !== 'admin');

        this.usuarios.set(visibleUsers);
        this.totalUsuarios = visibleUsers.length;

        const activos = visibleUsers.filter(u => u.activo).length;
        const inactivos = visibleUsers.length - activos;
        const sesionesActivas = visibleUsers.filter((u) => {
          if (!u.ultimo_login) return false;
          const diffMs = Date.now() - new Date(u.ultimo_login).getTime();
          const diffDays = diffMs / 86400000;
          return diffDays <= 7;
        }).length;

        this.resumen.update((current) => ({
          ...current,
          total_usuarios: visibleUsers.length,
          usuarios_activos: activos,
          usuarios_inactivos: inactivos,
          sesiones_activas: sesionesActivas
        }));

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadUsuarios();
    });
  }

  private buildFiltros(): FiltroUsuarios {
    const filtros: FiltroUsuarios = {};

    const formValue = this.filterForm.value;

    if (formValue.search) filtros.search = formValue.search;
    if (formValue.rol) filtros.rol = formValue.rol;
    // Aplicar filtro de vista
    switch (this.currentView()) {
      case 'activos':
        filtros.activo = true;
        break;
      case 'inactivos':
        filtros.activo = false;
        break;
    }

    return filtros;
  }

  changeView(view: 'todos' | 'activos' | 'inactivos'): void {
    this.currentView.set(view);
    this.loadUsuarios();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentView.set('todos');
    this.loadUsuarios();
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.loadUsuarios();
  }

  goBack(): void {
    if (window.history.length <= 1) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.location.back();
  }

  // Acciones de usuarios
  nuevoUsuario(): void {
    this.router.navigate(['/usuarios/nuevo']);
  }

  verSesionesGlobales(): void {
    this.router.navigate(['/usuarios/sesiones']);
  }

  verUsuario(usuario: Usuario): void {
    this.router.navigate(['/usuarios', usuario.id_usuario]);
  }

  editarUsuario(usuario: Usuario): void {
    this.router.navigate(['/usuarios', usuario.id_usuario, 'editar']);
  }

  toggleEstadoUsuario(usuario: Usuario): void {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    const mensaje = `¿Estás seguro de ${accion} el usuario ${usuario.nombre} ${usuario.apellido}?`;

    if (confirm(mensaje)) {
      this.usuariosService.toggleUsuarioEstado(usuario.id_usuario, !usuario.activo).subscribe({
        next: () => {
          this.snackBar.open(`Usuario ${accion}do exitosamente`, 'Cerrar', { duration: 3000 });
          this.loadUsuarios();
        },
        error: (error) => {
          console.error(`Error ${accion}ndo usuario:`, error);
          this.snackBar.open(`Error ${accion}ndo usuario`, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  resetearPassword(usuario: Usuario): void {
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

  enviarCredenciales(usuario: Usuario): void {
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

  gestionarSesiones(usuario: Usuario): void {
    this.router.navigate(['/usuarios', usuario.id_usuario, 'sesiones']);
  }

  abrirSelectorAvatar(usuario: Usuario): void {
    this.selectedAvatarUserId = usuario.id_usuario;
    this.avatarInput?.nativeElement.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const userId = this.selectedAvatarUserId;

    if (!file || !userId) {
      return;
    }

    this.usuariosService.uploadAvatar(userId, file).subscribe({
      next: ({ avatar_url }) => {
        this.usuarios.update((items) =>
          items.map((u) => u.id_usuario === userId ? { ...u, avatar_url } : u)
        );
        this.snackBar.open('Foto de usuario actualizada', 'Cerrar', { duration: 2500 });
        input.value = '';
        this.selectedAvatarUserId = null;
      },
      error: (error) => {
        console.error('Error subiendo avatar:', error);
        this.snackBar.open('No se pudo subir la foto de usuario', 'Cerrar', { duration: 3000 });
        input.value = '';
        this.selectedAvatarUserId = null;
      }
    });
  }

  exportarUsuarios(): void {
    // Implementar exportación
    this.snackBar.open('Función de exportación en desarrollo', 'Cerrar', { duration: 2000 });
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

  getAvatarUrl(avatarUrl?: string): string {
    if (!avatarUrl) return '';
    if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${apiBase}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
  }
}
