import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

import { ConsultasService, ConsultaClinica } from '../../../services/consultas.service';

@Component({
  selector: 'app-consulta-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './consulta-details.component.html',
  styleUrl: './consulta-details.component.css'
})
export class ConsultaDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private consultasService = inject(ConsultasService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  consulta = signal<ConsultaClinica | null>(null);

  ngOnInit(): void {
    const consultaId = this.route.snapshot.paramMap.get('id');
    if (consultaId) {
      this.loadConsulta(consultaId);
    } else {
      this.router.navigate(['/historia-clinica']);
    }
  }

  private async loadConsulta(consultaId: string): Promise<void> {
    try {
      this.loading.set(true);
      const response = await this.consultasService.getConsultaById(consultaId).toPromise();

      if (response?.success && response.data) {
        this.consulta.set(response.data);
      } else {
        throw new Error('Consulta no encontrada');
      }
    } catch (error) {
      console.error('Error cargando consulta:', error);
      this.snackBar.open('Error cargando consulta', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/historia-clinica']);
    } finally {
      this.loading.set(false);
    }
  }

  onEdit(): void {
    const consulta = this.consulta();
    if (consulta) {
      this.router.navigate(['/historia-clinica', consulta.id_consulta, 'editar']);
    }
  }

  onGoToCita(): void {
    const consulta = this.consulta();
    if ((consulta as any)?.id_cita) {
      this.router.navigate(['/citas', (consulta as any).id_cita]);
    } else {
      this.snackBar.open('No hay cita asociada a esta consulta', 'Cerrar', { duration: 3000 });
    }
  }

  onBack(): void {
    this.router.navigate(['/historia-clinica']);
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

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Completada': return '#4caf50';
      case 'En Curso': return '#ff9800';
      case 'Programada': return '#2196f3';
      case 'Cancelada': return '#f44336';
      default: return '#666';
    }
  }

  canEdit(): boolean {
    const consulta = this.consulta();
    return consulta?.estado !== 'Completada';
  }

  // Helper para Array.isArray en template
  Array = Array;
}
