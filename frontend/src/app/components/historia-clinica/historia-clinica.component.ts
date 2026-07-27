import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import {
  HistoriaClinicaService, HistoriaClinica, HistoriaFilter,
  TipoDocumento, TIPO_LABELS, TIPO_COLORS, TIPO_ICONS
} from '../../services/historia-clinica.service';
import { CitasService } from '../../services/citas.service';
import { AnularHistoriaDialogComponent } from './components/anular-historia-dialog.component';

export interface PacienteAgrupado {
  id_mascota:     string;
  mascota_nombre: string;
  cliente_nombre: string;
  total:          number;
  ultima_fecha:   string;
  historias:      HistoriaClinica[];
}

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatTableModule, MatMenuModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDividerModule, MatDialogModule,
  ],
  templateUrl: './historia-clinica.component.html',
  styleUrl: './historia-clinica.component.css'
})
export class HistoriaClinicaComponent implements OnInit {
  loading   = signal(false);
  historias = signal<HistoriaClinica[]>([]);

  // Vista de dos niveles: pacientes → historias
  vistaActual   = signal<'pacientes' | 'historias'>('pacientes');
  mascotaActual = signal<PacienteAgrupado | null>(null);

  // Agrupa las historias cargadas por mascota
  pacientes = computed<PacienteAgrupado[]>(() => {
    const map = new Map<string, PacienteAgrupado>();
    for (const h of this.historias()) {
      if (!map.has(h.id_mascota)) {
        map.set(h.id_mascota, {
          id_mascota:     h.id_mascota,
          mascota_nombre: (h as any).mascota_nombre ?? h.id_mascota,
          cliente_nombre: (h as any).cliente_nombre ?? '',
          total:          0,
          ultima_fecha:   h.fecha,
          historias:      [],
        });
      }
      const p = map.get(h.id_mascota)!;
      p.historias.push(h);
      p.total++;
      if (h.fecha > p.ultima_fecha) p.ultima_fecha = h.fecha;
    }
    return Array.from(map.values())
      .sort((a, b) => b.ultima_fecha.localeCompare(a.ultima_fecha));
  });

  // Historias del paciente seleccionado, ordenadas según la columna activa
  sortColumn = signal<string>('fecha');
  sortDir    = signal<'asc' | 'desc'>('desc');

  historialActual = computed<HistoriaClinica[]>(() => {
    const m = this.mascotaActual();
    if (!m) return [];
    const col = this.sortColumn();
    const dir = this.sortDir();
    return [...m.historias].sort((a, b) => {
      const va = String((a as any)[col] ?? '');
      const vb = String((b as any)[col] ?? '');
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  });

  mostrarAnulados = false;

  filterForm: FormGroup;

  pacienteColumns = ['mascota', 'propietario', 'total', 'ultima', 'acciones'];
  historyColumns  = ['fecha', 'codigo', 'tipo', 'veterinario', 'acciones'];
  private pendingMascotaId: string | null = null;

  constructor(
    private fb: FormBuilder,
    protected historiaService: HistoriaClinicaService,
    private citasService: CitasService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      search:      [''],
      fecha_desde: [''],
      fecha_hasta: [''],
    });
  }

  ngOnInit(): void {
    this.pendingMascotaId = this.route.snapshot.queryParamMap.get('id_mascota');
    this.loadHistorias();
    this.filterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => this.loadHistorias());
  }

  sortBy(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  toggleAnulados(): void {
    this.mostrarAnulados = !this.mostrarAnulados;
    this.loadHistorias();
  }

  /**
   * getHistorias pagina en el backend (LIMIT/OFFSET). Con más de 500 historias
   * en total, pedir solo la página 1 dejaba fuera pacientes cuya última visita
   * quedó más allá del top 500 por fecha — desaparecían de la lista completa.
   * Se acumulan todas las páginas siguiendo pagination.pages/total.
   */
  private fetchAllHistorias(filters: HistoriaFilter, page = 1, acumulado: HistoriaClinica[] = []): Observable<HistoriaClinica[]> {
    const PAGE_SIZE = 500;
    return this.historiaService.getHistorias({ ...filters, page, limit: PAGE_SIZE }).pipe(
      switchMap((res) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        const combinado = [...acumulado, ...data];
        const totalPages = Number(res?.pagination?.pages || 0);
        const hasMore = data.length > 0 && page < totalPages;
        return hasMore ? this.fetchAllHistorias(filters, page + 1, combinado) : of(combinado);
      })
    );
  }

  loadHistorias(): void {
    this.loading.set(true);
    const v = this.filterForm.value;
    const filters: HistoriaFilter = {
      search:      v.search      || undefined,
      fecha_desde: v.fecha_desde ? this.toDateStr(v.fecha_desde) : undefined,
      fecha_hasta: v.fecha_hasta ? this.toDateStr(v.fecha_hasta) : undefined,
      estado:      this.mostrarAnulados ? 'Cancelado' : 'Completado',
    };
    this.fetchAllHistorias(filters).subscribe({
      next: (data) => {
        this.historias.set(data ?? []);
        this.loading.set(false);

        // Si llegamos con contexto de retorno desde detalle, reabrir vista del paciente.
        if (this.pendingMascotaId && this.vistaActual() === 'pacientes') {
          const paciente = this.pacientes().find(p => p.id_mascota === this.pendingMascotaId) ?? null;
          if (paciente) {
            this.mascotaActual.set(paciente);
            this.vistaActual.set('historias');
          }
          this.pendingMascotaId = null;
        }

        // Si estamos en vista de historias, refrescar mascotaActual desde los nuevos datos
        const m = this.mascotaActual();
        if (m) {
          const actualizada = this.pacientes().find(p => p.id_mascota === m.id_mascota) ?? null;
          this.mascotaActual.set(actualizada);
          if (!actualizada) this.vistaActual.set('pacientes');
        }
      },
      error: () => {
        this.snackBar.open('Error cargando historias clínicas', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  seleccionarPaciente(p: PacienteAgrupado): void {
    if (this.mostrarAnulados) {
      this.mostrarAnulados = false;
      this.loadHistorias();
    }
    this.mascotaActual.set(p);
    this.vistaActual.set('historias');
  }

  volverAPacientes(): void {
    this.mascotaActual.set(null);
    this.vistaActual.set('pacientes');
  }

  nueva(): void {
    this.router.navigate(['/historia-clinica/nueva']);
  }

  verDetalle(id: string): void {
    const mascotaId = this.vistaActual() === 'historias' ? this.mascotaActual()?.id_mascota : null;
    this.router.navigate(['/historia-clinica', id], {
      queryParams: mascotaId ? { id_mascota: mascotaId } : undefined
    });
  }

  editar(id: string): void {
    this.router.navigate(['/historia-clinica', id, 'editar']);
  }

  cancelar(historia: HistoriaClinica): void {
    const ref = this.dialog.open(AnularHistoriaDialogComponent, {
      width: '480px',
      data: { codigo: historia.codigo_historia },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.historiaService.deleteHistoria(historia.id_historia, result.motivo).subscribe({
        next: () => {
          this.snackBar.open('Documento anulado', 'Cerrar', { duration: 2500 });
          this.loadHistorias();
        },
        error: () => this.snackBar.open('Error al anular el documento', 'Cerrar', { duration: 3000 })
      });
    });
  }

  reactivar(historia: HistoriaClinica): void {
    this.historiaService.reactivateHistoria(historia.id_historia).subscribe({
      next: () => {
        this.snackBar.open('Documento reactivado', 'Cerrar', { duration: 2500 });
        this.loadHistorias();
      },
      error: () => this.snackBar.open('Error al reactivar el documento', 'Cerrar', { duration: 3000 })
    });
  }

  limpiarFiltros(): void {
    this.filterForm.reset();
  }

  getTipoLabel(tipo: TipoDocumento): string { return TIPO_LABELS[tipo] ?? tipo; }
  getTipoColor(tipo: TipoDocumento): string { return TIPO_COLORS[tipo] ?? '#666'; }
  getTipoIcon(tipo: TipoDocumento): string  { return TIPO_ICONS[tipo] ?? 'assignment'; }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toDateStr(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val.slice(0, 10);
    return new Date(val).toISOString().slice(0, 10);
  }
}

