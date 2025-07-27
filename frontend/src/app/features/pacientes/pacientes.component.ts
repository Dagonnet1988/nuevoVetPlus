import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
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

import { PacientesService } from './services/pacientes.service';
import { Mascota, PacienteFilter } from './models/paciente.interface';

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
  template: `
    <div class="pacientes-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">pets</mat-icon>
              Gestión de Pacientes
            </h1>
            <p class="page-subtitle">Administra la información de mascotas y sus propietarios</p>
          </div>
          <div class="actions-section">
            <button mat-raised-button 
                    color="primary" 
                    (click)="openCreateDialog()"
                    class="create-button">
              <mat-icon>add</mat-icon>
              Nuevo Paciente
            </button>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <div class="filter-row">
              <!-- Búsqueda general -->
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar paciente o propietario</mat-label>
                <input matInput 
                       formControlName="search"
                       placeholder="Nombre de mascota, propietario, teléfono..."
                       (input)="onFilterChange()">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <!-- Filtro por especie -->
              <mat-form-field appearance="outline" class="species-field">
                <mat-label>Especie</mat-label>
                <mat-select formControlName="especie" (selectionChange)="onFilterChange()">
                  <mat-option value="">Todas las especies</mat-option>
                  @for (especie of especies(); track especie) {
                    <mat-option [value]="especie">{{ especie }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Filtro por estado -->
              <mat-form-field appearance="outline" class="status-field">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="activo" (selectionChange)="onFilterChange()">
                  <mat-option [value]="null">Todos</mat-option>
                  <mat-option [value]="true">Activos</mat-option>
                  <mat-option [value]="false">Inactivos</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Botón limpiar filtros -->
              <button mat-stroked-button 
                      type="button"
                      (click)="clearFilters()"
                      class="clear-filters-btn">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon primary-color">pets</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalPacientes() }}</span>
                <span class="stat-label">Total Pacientes</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon accent-color">people</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalClientes() }}</span>
                <span class="stat-label">Propietarios</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon warn-color">category</mat-icon>
              <div class="stat-info">
                <span class="stat-number">{{ totalEspecies() }}</span>
                <span class="stat-label">Especies</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Tabla de pacientes -->
      <mat-card class="table-card">
        <mat-card-content>
          @if (loading()) {
            <div class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Cargando pacientes...</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table 
                     [dataSource]="dataSource" 
                     matSort 
                     class="pacientes-table"
                     multiTemplateDataRows>

                <!-- Columna Avatar/Foto -->
                <ng-container matColumnDef="avatar">
                  <th mat-header-cell *matHeaderCellDef class="avatar-column">Foto</th>
                  <td mat-cell *matCellDef="let paciente" class="avatar-column">
                    <div class="patient-avatar">
                      <mat-icon class="animal-icon">pets</mat-icon>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Paciente -->
                <ng-container matColumnDef="paciente">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Paciente</th>
                  <td mat-cell *matCellDef="let paciente" class="paciente-column">
                    <div class="patient-info">
                      <span class="patient-name">{{ paciente.nombre }}</span>
                      <span class="patient-details">
                        {{ paciente.especie }}
                        @if (paciente.raza) {
                          • {{ paciente.raza }}
                        }
                      </span>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Propietario -->
                <ng-container matColumnDef="propietario">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Propietario</th>
                  <td mat-cell *matCellDef="let paciente" class="propietario-column">
                    <div class="owner-info">
                      <span class="owner-name">{{ paciente.cliente?.nombre || 'Sin asignar' }}</span>
                      @if (paciente.cliente?.telefono) {
                        <span class="owner-phone">{{ paciente.cliente.telefono }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Edad/Sexo -->
                <ng-container matColumnDef="edad">
                  <th mat-header-cell *matHeaderCellDef>Edad/Sexo</th>
                  <td mat-cell *matCellDef="let paciente" class="edad-column">
                    <div class="age-sex-info">
                      @if (paciente.fecha_nacimiento) {
                        <span class="age">{{ calculateAge(paciente.fecha_nacimiento) }}</span>
                      } @else {
                        <span class="age">N/A</span>
                      }
                      <mat-chip class="sex-chip" [class.male]="paciente.sexo === 'M'" [class.female]="paciente.sexo === 'H'">
                        {{ paciente.sexo === 'M' ? 'Macho' : 'Hembra' }}
                      </mat-chip>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Estado -->
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let paciente" class="estado-column">
                    <mat-chip [class.active]="paciente.activo" [class.inactive]="!paciente.activo">
                      {{ paciente.activo ? 'Activo' : 'Inactivo' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Columna Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef class="actions-column">Acciones</th>
                  <td mat-cell *matCellDef="let paciente" class="actions-column">
                    <button mat-icon-button 
                            [matMenuTriggerFor]="actionsMenu"
                            [matTooltip]="'Más opciones'">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    
                    <mat-menu #actionsMenu="matMenu">
                      <button mat-menu-item (click)="viewDetails(paciente)">
                        <mat-icon>visibility</mat-icon>
                        <span>Ver detalles</span>
                      </button>
                      <button mat-menu-item (click)="editPaciente(paciente)">
                        <mat-icon>edit</mat-icon>
                        <span>Editar</span>
                      </button>
                      <button mat-menu-item (click)="viewHistory(paciente)">
                        <mat-icon>history</mat-icon>
                        <span>Historia clínica</span>
                      </button>
                      <mat-divider></mat-divider>
                      <button mat-menu-item 
                              (click)="toggleStatus(paciente)"
                              [class.warn-action]="paciente.activo">
                        <mat-icon>{{ paciente.activo ? 'block' : 'check_circle' }}</mat-icon>
                        <span>{{ paciente.activo ? 'Desactivar' : 'Activar' }}</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <!-- Definir columnas mostradas -->
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row 
                    *matRowDef="let row; columns: displayedColumns;"
                    class="table-row"
                    (click)="viewDetails(row)"></tr>
              </table>

              <!-- Paginador -->
              <mat-paginator #paginator
                           [length]="totalRecords()"
                           [pageSize]="pageSize()"
                           [pageSizeOptions]="[10, 25, 50, 100]"
                           showFirstLastButtons
                           (page)="onPageChange($event)">
              </mat-paginator>

              <!-- Mensaje cuando no hay datos -->
              @if (dataSource.data.length === 0 && !loading()) {
                <div class="no-data-container">
                  <mat-icon class="no-data-icon">pets</mat-icon>
                  <h3>No se encontraron pacientes</h3>
                  <p>No hay pacientes registrados que coincidan con los filtros aplicados.</p>
                  <button mat-raised-button color="primary" (click)="openCreateDialog()">
                    <mat-icon>add</mat-icon>
                    Registrar primer paciente
                  </button>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .pacientes-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .title-section {
      flex: 1;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 500;
      color: #2e7d32;
    }

    .page-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .page-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .actions-section {
      display: flex;
      gap: 12px;
    }

    .create-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Filtros */
    .filters-card {
      margin-bottom: 24px;
    }

    .filters-form {
      width: 100%;
    }

    .filter-row {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 2;
      min-width: 300px;
    }

    .species-field,
    .status-field {
      flex: 1;
      min-width: 150px;
    }

    .clear-filters-btn {
      height: 56px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .primary-color { color: #2e7d32; }
    .accent-color { color: #1976d2; }
    .warn-color { color: #f57c00; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Tabla */
    .table-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .table-container {
      overflow-x: auto;
    }

    .pacientes-table {
      width: 100%;
      min-width: 800px;
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .table-row:hover {
      background-color: #f5f5f5;
    }

    /* Columnas específicas */
    .avatar-column {
      width: 60px;
      text-align: center;
    }

    .patient-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }

    .animal-icon {
      color: #2e7d32;
      font-size: 20px;
    }

    .paciente-column {
      min-width: 200px;
    }

    .patient-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .patient-name {
      font-weight: 500;
      color: #333;
    }

    .patient-details {
      font-size: 12px;
      color: #666;
    }

    .propietario-column {
      min-width: 180px;
    }

    .owner-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .owner-name {
      font-weight: 400;
      color: #333;
    }

    .owner-phone {
      font-size: 12px;
      color: #666;
    }

    .edad-column {
      min-width: 120px;
    }

    .age-sex-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .age {
      font-size: 14px;
      color: #333;
    }

    .sex-chip {
      font-size: 11px;
      height: 20px;
      line-height: 20px;
    }

    .sex-chip.male {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .sex-chip.female {
      background-color: #fce4ec;
      color: #c2185b;
    }

    .estado-column {
      min-width: 100px;
    }

    .active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .inactive {
      background-color: #ffebee;
      color: #c62828;
    }

    .actions-column {
      width: 60px;
      text-align: center;
    }

    .warn-action {
      color: #d32f2f;
    }

    /* Loading y estados vacíos */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      color: #666;
    }

    .no-data-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
      color: #666;
    }

    .no-data-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.5;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .pacientes-container {
        padding: 16px;
      }
      
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }
      
      .filter-row {
        flex-direction: column;
      }
      
      .search-field,
      .species-field,
      .status-field {
        min-width: auto;
        width: 100%;
      }
      
      .stats-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PacientesComponent implements OnInit {
  // Signals para estado reactivo
  loading = signal(false);
  totalPacientes = signal(0);
  totalClientes = signal(0);
  totalEspecies = signal(0);
  totalRecords = signal(0);
  pageSize = signal(10);
  currentPage = signal(0);
  especies = signal<string[]>(['Perro', 'Gato']); // Inicializar con datos básicos

  // Tabla y datos
  dataSource = new MatTableDataSource<Mascota>([]);
  displayedColumns: string[] = ['avatar', 'paciente', 'propietario', 'edad', 'estado', 'acciones'];
  
  // Formulario de filtros
  filterForm: FormGroup;
  
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

    this.pacientesService.getMascotas(this.currentPage() + 1, this.pageSize(), filters)
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data.pacientes;
          this.totalRecords.set(response.data.pagination.total);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error cargando pacientes:', error);
          this.loading.set(false);
          this.snackBar.open('Error cargando pacientes', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private loadEspecies(): void {
    this.pacientesService.getEspecies().subscribe({
      next: (response) => {
        // Verificar que sea un array
        if (response && response.data && Array.isArray(response.data)) {
          this.especies.set(response.data);
        } else if (Array.isArray(response)) {
          this.especies.set(response);
        } else {
          console.warn('Respuesta de especies no es un array:', response);
          this.especies.set(this.pacientesService.getMockEspecies());
        }
      },
      error: (error) => {
        console.error('Error cargando especies:', error);
        // Fallback a datos locales
        this.especies.set(this.pacientesService.getMockEspecies());
      }
    });
  }

  private loadEstadisticas(): void {
    this.pacientesService.getPacienteStats().subscribe({
      next: (stats) => {
        this.totalPacientes.set(stats.data.totalPacientes);
        this.totalClientes.set(stats.data.totalClientes);
        this.totalEspecies.set(stats.data.totalEspecies);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
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
    this.loadPacientes();
  }

  onPageChange(event: any): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
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
    // TODO: Implementar historia clínica
    this.snackBar.open(`Historia clínica de ${paciente.nombre} - En desarrollo`, 'Cerrar', { duration: 3000 });
  }

  toggleStatus(paciente: Mascota): void {
    const action = paciente.activo ? 'desactivar' : 'activar';
    const message = `¿Estás seguro de ${action} a ${paciente.nombre}?`;
    
    if (confirm(message)) {
      const nuevoEstado = !paciente.activo;
      
      console.log('=== TOGGLE STATUS DEBUG ===');
      console.log('Paciente ID:', paciente.id_mascota);
      console.log('Estado actual:', paciente.activo);
      console.log('Nuevo estado:', nuevoEstado);
      console.log('Datos enviados:', { activo: nuevoEstado });
      console.log('===========================');
      
      this.pacientesService.updateMascota(paciente.id_mascota!, { activo: nuevoEstado }).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          
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
          console.error('Error actualizando estado:', error);
          this.snackBar.open(
            'Error al actualizar el estado del paciente',
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
}