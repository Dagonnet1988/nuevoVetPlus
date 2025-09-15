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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { ConsultasService, ConsultaClinica, ConsultaFilter } from '../../services/consultas.service';
import { PacientesService } from '../../services/pacientes.service';
import { CitasService } from '../../services/citas.service';

@Component({
  selector: 'app-historia-clinica',
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatDividerModule
  ],
  templateUrl: './historia-clinica.component.html',
  styleUrl: './historia-clinica.component.css'
})
export class HistoriaClinicaComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Signals para estado reactivo
  loading = signal(false);
  consultas = signal<ConsultaClinica[]>([]);
  pacientes = signal<any[]>([]);
  veterinarios = signal<any[]>([]);
  totalConsultas = signal(0);
  currentView = signal<'lista' | 'timeline' | 'estadisticas'>('lista');
  selectedPaciente = signal<any>(null);

  // Formulario de filtros
  filterForm: FormGroup;

  // Configuración de tabla
  displayedColumns = [
    'fecha_consulta',
    'codigo_consulta',
    'mascota',
    'veterinario',
    'motivo',
    'diagnostico',
    'estado',
    'acciones'
  ];

  // Estados disponibles
  estadosConsulta = [
    { value: 'Programada', label: 'Programada', color: '#2196f3' },
    { value: 'En Curso', label: 'En Curso', color: '#ff9800' },
    { value: 'Completada', label: 'Completada', color: '#4caf50' },
    { value: 'Cancelada', label: 'Cancelada', color: '#f44336' }
  ];

  constructor(
    private fb: FormBuilder,
    private consultasService: ConsultasService,
    private pacientesService: PacientesService,
    private citasService: CitasService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      mascota: [''],
      veterinario: [''],
      estado: [''],
      fecha_inicio: [''],
      fecha_fin: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    // Diferir la carga inicial para evitar errores de change detection
    setTimeout(() => {
      this.loadInitialData();
      this.setupFilters();
    });
  }

  private loadInitialData(): void {
    this.loadVeterinarios(); // Solo cargar veterinarios
    this.loadConsultas(); // Los pacientes se extraerán de las consultas
  }

  private loadConsultas(): void {
    this.loading.set(true);

    const filters: ConsultaFilter = {
      mascota: this.filterForm.value.mascota || undefined,
      veterinario: this.filterForm.value.veterinario || undefined,
      estado: this.filterForm.value.estado || undefined,
      fecha_inicio: this.filterForm.value.fecha_inicio ?
        new Date(this.filterForm.value.fecha_inicio).toISOString().split('T')[0] : undefined,
      fecha_fin: this.filterForm.value.fecha_fin ?
        new Date(this.filterForm.value.fecha_fin).toISOString().split('T')[0] : undefined,
      search: this.filterForm.value.search || undefined
    };

    console.log('🔍 Filtros enviados al backend:', filters);

    this.consultasService.getConsultas(1, 50, filters).subscribe({
      next: (response) => {
        const data = response?.data;
        const consultasArray = Array.isArray(data) ? data : [];
        this.consultas.set(consultasArray);
        this.totalConsultas.set(response?.pagination?.total || 0);

        // Extraer pacientes únicos de las consultas
        this.extractPacientesFromConsultas(consultasArray);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando consultas:', error);
        this.consultas.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando consultas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private extractPacientesFromConsultas(consultas: any[]): void {
    const pacientesMap = new Map();

    consultas.forEach(consulta => {
      if (consulta.mascota) {
        const mascota = consulta.mascota;
        if (!pacientesMap.has(mascota.id_mascota)) {
          pacientesMap.set(mascota.id_mascota, {
            id_mascota: mascota.id_mascota,
            nombre: mascota.nombre,
            especie: mascota.especie,
            raza: mascota.raza,
            cliente: consulta.cliente
          });
        }
      }
    });

    const pacientesUnicos = Array.from(pacientesMap.values());
    console.log('🐕 Pacientes extraídos de consultas:', pacientesUnicos);
    this.pacientes.set(pacientesUnicos);
  }

  private loadPacientes(): void {
    this.pacientesService.getClientes(1, 1000).subscribe({
      next: (response) => {
        console.log('🐕 Respuesta de pacientes:', response);
        const data = response?.data;
        if (Array.isArray(data)) {
          // Extraer todas las mascotas de todos los clientes
          const mascotas: any[] = [];
          data.forEach((cliente: any) => {
            if (cliente.mascotas && Array.isArray(cliente.mascotas)) {
              cliente.mascotas.forEach((mascota: any) => {
                mascotas.push({
                  ...mascota,
                  cliente: {
                    nombre: cliente.nombre,
                    telefono: cliente.telefono
                  }
                });
              });
            }
          });
          console.log('🐕 Mascotas extraídas:', mascotas);
          this.pacientes.set(mascotas);
        } else {
          this.pacientes.set([]);
        }
      },
      error: (error) => {
        console.error('Error cargando pacientes:', error);
        this.pacientes.set([]);
      }
    });
  }

  private loadVeterinarios(): void {
    this.citasService.getVeterinarios().subscribe({
      next: (response) => {
        console.log('👩‍⚕️ Respuesta de veterinarios:', response);
        const data = response?.data;
        if (Array.isArray(data)) {
          this.veterinarios.set(data);
        } else {
          this.veterinarios.set([]);
        }
      },
      error: (error) => {
        console.error('Error cargando veterinarios:', error);
        this.veterinarios.set([]);
      }
    });
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadConsultas();
    });
  }

  // Cambiar vista
  changeView(view: 'lista' | 'timeline' | 'estadisticas'): void {
    this.currentView.set(view);
  }

  // Seleccionar paciente para ver historia
  selectPaciente(paciente: any): void {
    this.selectedPaciente.set(paciente);
    this.filterForm.patchValue({ mascota: paciente.id_mascota });
  }

  // Acciones
  openCreateDialog(): void {
    this.router.navigate(['/historia-clinica/nueva']);
  }

  viewConsulta(consulta: ConsultaClinica): void {
    this.router.navigate(['/historia-clinica', consulta.id_consulta]);
  }

  editConsulta(consulta: ConsultaClinica): void {
    this.router.navigate(['/historia-clinica', consulta.id_consulta, 'editar']);
  }

  deleteConsulta(consulta: ConsultaClinica): void {
    if (confirm(`¿Estás seguro de eliminar la consulta ${consulta.codigo_consulta}?`)) {
      this.consultasService.deleteConsulta(consulta.id_consulta).subscribe({
        next: () => {
          this.snackBar.open('Consulta eliminada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadConsultas();
        },
        error: (error) => {
          console.error('Error eliminando consulta:', error);
          this.snackBar.open('Error eliminando consulta', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  exportarHistoria(): void {
    const paciente = this.selectedPaciente();
    if (!paciente) {
      this.snackBar.open('Selecciona un paciente primero', 'Cerrar', { duration: 3000 });
      return;
    }

    this.consultasService.exportarHistoriaClinica(paciente.id_mascota).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historia-clinica-${paciente.nombre}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando historia:', error);
        this.snackBar.open('Error exportando historia clínica', 'Cerrar', { duration: 3000 });
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.selectedPaciente.set(null);
    this.loadConsultas();
  }

  // Computed properties para las estadísticas
  get consultasCompletadas(): number {
    return this.consultas().filter(c => c.estado === 'Completada').length;
  }

  get consultasEnProgreso(): number {
    return this.consultas().filter(c => c.estado === 'En Curso').length;
  }

  get pacientesConHistoria(): number {
    const mascotasIds = new Set(this.consultas().map(c => c.id_mascota));
    return mascotasIds.size;
  }

  // Utilidades para la vista
  getEstadoColor(estado: string): string {
    const estadoConfig = this.estadosConsulta.find(e => e.value === estado);
    return estadoConfig?.color || '#666';
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

  truncateText(text: string, length: number = 50): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}
