import { Component, OnInit, signal, computed, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

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
  currentView = signal<'todos' | 'activos' | 'inactivos' | 'primer_acceso'>('todos');

  // Form y paginación
  filterForm: FormGroup;
  totalUsuarios = 0;
  pageSize = 25;

  // Configuración de tabla
  displayedColumns = [
    'usuario',
    'documento',
    'rol',
    'especialidad',
    'estado',
    'ultimo_acceso',
    'acciones'
  ];

  // Opciones
  especialidades = [
    'Medicina General',
    'Cirugía',
    'Dermatología',
    'Cardiología',
    'Neurología',
    'Oncología',
    'Radiología',
    'Anestesiología'
  ];

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      rol: [''],
      especialidad: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  private loadInitialData(): void {
    this.loadUsuarios();
    this.loadResumen();
  }

  private loadUsuarios(): void {
    this.loading.set(true);

    const filtros: FiltroUsuarios = this.buildFiltros();

    this.usuariosService.getUsuarios(1, this.pageSize, filtros).subscribe({
      next: (usuarios) => {
        this.usuarios.set(Array.isArray(usuarios) ? usuarios : []);
        this.totalUsuarios = usuarios.length;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
      }
    });
  }

  private loadResumen(): void {
    this.usuariosService.getResumenUsuarios().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
      },
      error: (error) => {
        console.error('Error cargando resumen:', error);
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
    if (formValue.especialidad) filtros.especialidad = formValue.especialidad;

    // Aplicar filtro de vista
    switch (this.currentView()) {
      case 'activos':
        filtros.activo = true;
        break;
      case 'inactivos':
        filtros.activo = false;
        break;
      case 'primer_acceso':
        filtros.primer_acceso = true;
        break;
    }

    return filtros;
  }

  changeView(view: 'todos' | 'activos' | 'inactivos' | 'primer_acceso'): void {
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

  // Acciones de usuarios
  nuevoUsuario(): void {
    this.router.navigate(['/usuarios/nuevo']);
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
          this.loadResumen();
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
      const request = {
        id_usuario: usuario.id_usuario,
        password_temporal: this.usuariosService.generarPasswordString(),
        enviar_email: true
      };

      this.usuariosService.resetearPassword(request).subscribe({
        next: () => {
          this.snackBar.open('Contraseña reseteada y enviada por email', 'Cerrar', { duration: 3000 });
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
}
