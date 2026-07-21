import { Component, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { extractError } from '../../utils/error.utils';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PacientesService } from '../../services/pacientes.service';
import { Mascota, PacienteFilter } from '../../models/paciente.interface';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit, OnDestroy {
  // Signals para estado reactivo
  loading = signal(false);
  totalPacientes = signal(0);
  totalClientes = signal(0);
  totalEspecies = signal(0);
  totalRecords = signal(0);
  pageSize = signal(10);
  currentPage = signal(0);
  sortActive = signal<string>('paciente');
  sortDirection = signal<SortDirection>('asc');
  sortBy = signal<'nombre' | 'cliente_nombre'>('nombre');
  sortOrder = signal<'ASC' | 'DESC'>('ASC');
  especies = signal<string[]>(['Perro', 'Gato']); // Inicializar con datos básicos

  // Tabla y datos
  dataSource = new MatTableDataSource<Mascota>([]);
  displayedColumns: string[] = ['avatar', 'paciente', 'propietario', 'edad', 'estado', 'acciones'];

  // Formulario de filtros
  filterForm: FormGroup;

  // Suscripciones
  private photoUpdateSubscription?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private pacientesService: PacientesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      especie: [''],
      activo: [null]
    });

    // Cargar especies desde el backend
    this.loadEspecies();
  }

  ngOnInit(): void {
    this.loadPacientes();
    this.loadEstadisticas();
    this.setupFilters();
    this.setupPhotoUpdateListener();
  }

  private setupFilters(): void {
    // Configurar filtros reactivos con debounce
    this.filterForm.get('search')?.valueChanges.subscribe(() => {
      this.onFilterChange();
    });
  }

  loadPacientes(): void {
    this.loading.set(true);

    const filters: PacienteFilter = {
      search: this.filterForm.value.search || undefined,
      especie: this.filterForm.value.especie || undefined,
      activo: this.filterForm.value.activo
    };

    this.pacientesService.getMascotas(
      this.currentPage() + 1,
      this.pageSize(),
      filters,
      this.sortBy(),
      this.sortOrder()
    )
      .subscribe({
        next: (response) => {
          const anyResponse: any = response as any;
          // Manejar diferentes estructuras de respuesta de forma robusta
          let pacientes: any[] = [];
          let total = 0;

          if (response?.success && response?.data) {
            // Estructura: { success: true, data: { pacientes: [...], pagination: { total: ... } } }
            pacientes = response.data.pacientes || [];
            total = response.data.pagination?.total || pacientes.length;
          } else if (anyResponse?.pagination) {
            // Estructura: { data: [...], pagination: { total: ... } }
            pacientes = Array.isArray(anyResponse?.data) ? anyResponse.data : [];
            total = anyResponse.pagination?.total || pacientes.length;
          } else if (response?.data?.pacientes) {
            // Estructura: { data: { pacientes: [...] } }
            pacientes = response.data.pacientes;
            total = response.data.pagination?.total || pacientes.length;
          } else if (Array.isArray(response?.data)) {
            // Estructura: { data: [...] }
            pacientes = response.data;
            total = pacientes.length;
          } else if (Array.isArray(response)) {
            // Estructura: [...]
            pacientes = response;
            total = pacientes.length;
          }

          this.dataSource.data = pacientes;
          this.totalRecords.set(Number(total || 0));
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error cargando pacientes:', error);
          this.dataSource.data = [];
          this.totalRecords.set(0);
          this.loading.set(false);
          this.snackBar.open(extractError(error, 'Error cargando pacientes'), 'Cerrar', { duration: 3000 });
        }
      });
  }

  private loadEspecies(): void {
    this.pacientesService.getEspecies().subscribe({
      next: (response) => {
        // Verificar si response tiene data o es un array directamente
        if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
          this.especies.set((response as any).data);
        } else if (Array.isArray(response)) {
          this.especies.set(response);
        } else {
          console.warn('Respuesta de especies no es un array:', response);
        }
      },
      error: (error) => {
        console.error('Error cargando especies:', error);
        // Fallback a datos locales
      }
    });
  }

  private loadEstadisticas(): void {
    this.pacientesService.getPacienteStats().subscribe({
      next: (response) => {
        // Manejar diferentes estructuras de respuesta para estadísticas
        let statsData: any = {};

        if (response?.success && response?.data) {
          statsData = response.data;
        } else if (response?.data) {
          statsData = response.data;
        } else {
          statsData = response || {};
        }

        this.totalPacientes.set(statsData.totalPacientes || 0);
        this.totalClientes.set(statsData.totalClientes || 0);
        this.totalEspecies.set(statsData.totalEspecies || 0);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        // Establecer valores por defecto en caso de error
        this.totalPacientes.set(0);
        this.totalClientes.set(0);
        this.totalEspecies.set(0);
      }
    });
  }

  onFilterChange(): void {
    // Reiniciar a la primera página cuando cambien los filtros
    this.currentPage.set(0);
    this.loadPacientes();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage.set(0);
    this.loadPacientes();
  }

  onPageChange(event: any): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadPacientes();
  }

  onSortChange(event: Sort): void {
    const sortMap: { [key: string]: 'nombre' | 'cliente_nombre' } = {
      paciente: 'nombre',
      propietario: 'cliente_nombre'
    };

    const uiActive = event.active || 'paciente';
    const uiDirection: SortDirection = (event.direction || 'asc') as SortDirection;
    const mappedSortBy = sortMap[uiActive] || 'nombre';
    const mappedSortOrder: 'ASC' | 'DESC' = uiDirection === 'desc' ? 'DESC' : 'ASC';

    this.sortActive.set(uiActive);
    this.sortDirection.set(uiDirection);

    this.sortBy.set(mappedSortBy);
    this.sortOrder.set(mappedSortOrder);
    this.currentPage.set(0);
    this.loadPacientes();
  }

  // Acciones de la tabla
  openCreateDialog(): void {
    this.router.navigate(['/pacientes/nuevo']);
  }

  viewDetails(paciente: Mascota): void {
    this.router.navigate(['/pacientes', paciente.id_mascota]);
  }

  editPaciente(paciente: Mascota): void {
    this.router.navigate(['/pacientes', paciente.id_mascota, 'editar']);
  }

  viewHistory(paciente: Mascota): void {
    this.router.navigate(['/historia-clinica'], {
      queryParams: {
        id_mascota: paciente.id_mascota,
        pacienteNombre: paciente.nombre
      }
    });
  }

  toggleStatus(paciente: Mascota): void {
    const action = paciente.activo ? 'desactivar' : 'activar';
    const message = `¿Estás seguro de ${action} a ${paciente.nombre}?`;

    if (confirm(message)) {
      const nuevoEstado = !paciente.activo;
      const datosEnviados = { activo: nuevoEstado };

      this.pacientesService.updateMascota(paciente.id_mascota!, datosEnviados).subscribe({
        next: (response) => {
          // Actualizar en la tabla
          paciente.activo = nuevoEstado;

          // Recargar la lista para verificar persistencia
          this.loadPacientes();

          this.snackBar.open(
            `${paciente.nombre} ha sido ${nuevoEstado ? 'activado' : 'desactivado'}`,
            'Cerrar',
            { duration: 3000 }
          );
        },
        error: (error) => {
          this.snackBar.open(
            extractError(error, 'Error al actualizar el estado del paciente'),
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    }
  }

  // Utilidades
  calculateAge(fechaNacimiento: string): string {
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

    if (months < 12) {
      return `${months} meses`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years} años`;
    }
  }

  // Utilidades para imágenes
  getImageUrl(fotoUrl: string): string {
    // Validar que la URL no esté vacía o sea inválida
    if (!fotoUrl || fotoUrl.trim() === '') {
      return '';
    }

    if (fotoUrl.startsWith('http')) {
      return fotoUrl;
    }

    // Para rutas de uploads, usar backendUrl en lugar de apiUrl
    return `${environment.backendUrl}${fotoUrl}`;
  }

  onImageError(event: any): void {
    // Ocultar la imagen rota y mostrar solo el ícono de respaldo
    event.target.style.display = 'none';
  }

  private setupPhotoUpdateListener(): void {
    // Escuchar cambios de fotos para actualizar la tabla
    this.photoUpdateSubscription = this.pacientesService.photoUpdated$.subscribe(photoUpdate => {
      if (photoUpdate) {
        // Buscar la mascota en la tabla y actualizar su foto_url
        const currentData = this.dataSource.data;
        const mascotaIndex = currentData.findIndex(m => m.id_mascota === photoUpdate.mascotaId);

        if (mascotaIndex !== -1) {
          currentData[mascotaIndex].foto_url = photoUpdate.fotoUrl;
          // Forzar actualización de la tabla
          this.dataSource.data = [...currentData];
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.photoUpdateSubscription?.unsubscribe();
  }
}
