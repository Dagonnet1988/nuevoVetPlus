import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

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
    MatDividerModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule
  ],
  template: `
    <div class="consulta-details-container">
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando consulta...</p>
        </div>
      } @else if (consulta()) {
        <!-- Header -->
        <div class="details-header">
          <div class="header-content">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="title-section">
              <h1 class="details-title">
                <mat-icon class="title-icon">assignment</mat-icon>
                Consulta {{ consulta()!.codigo_consulta }}
              </h1>
              <p class="details-subtitle">{{ formatearFecha(consulta()!.fecha_consulta) }}</p>
            </div>
            <div class="actions-section">
              <button mat-stroked-button (click)="exportConsulta()">
                <mat-icon>file_download</mat-icon>
                Exportar
              </button>
              <button mat-raised-button 
                      color="primary" 
                      (click)="editConsulta()">
                <mat-icon>edit</mat-icon>
                Editar
              </button>
              <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionsMenu="matMenu">
                <button mat-menu-item (click)="duplicateConsulta()">
                  <mat-icon>content_copy</mat-icon>
                  Duplicar
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteConsulta()" class="delete-item">
                  <mat-icon>delete</mat-icon>
                  Eliminar
                </button>
              </mat-menu>
            </div>
          </div>
        </div>

        <!-- Estado y información básica -->
        <mat-card class="status-card">
          <mat-card-content>
            <div class="status-row">
              <div class="status-info">
                <mat-chip [style.background-color]="getEstadoColor(consulta()!.estado)"
                          [style.color]="'white'"
                          class="status-chip">
                  {{ consulta()!.estado }}
                </mat-chip>
                <div class="basic-info">
                  <span class="info-label">Código:</span>
                  <span class="codigo-consulta">{{ consulta()!.codigo_consulta }}</span>
                </div>
              </div>
              <div class="patient-summary">
                <div class="patient-avatar">
                  <mat-icon>pets</mat-icon>
                </div>
                <div class="patient-info">
                  <h3>{{ consulta()!.mascota?.nombre }}</h3>
                  <p>{{ consulta()!.mascota?.especie }} - {{ consulta()!.mascota?.raza }}</p>
                  <p>Propietario: {{ consulta()!.mascota?.cliente?.nombre }}</p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Contenido principal en tabs -->
        <mat-card class="content-card">
          <mat-card-content>
            <mat-tab-group>
              <!-- Tab: Información general -->
              <mat-tab label="Información General">
                <div class="tab-content">
                  <div class="info-grid">
                    <div class="info-section">
                      <h4><mat-icon>person</mat-icon> Veterinario</h4>
                      <p>{{ consulta()!.veterinario?.nombre || 'No asignado' }}</p>
                    </div>
                    
                    <div class="info-section">
                      <h4><mat-icon>schedule</mat-icon> Fecha y Hora</h4>
                      <p>{{ formatearFecha(consulta()!.fecha_consulta) }}</p>
                    </div>

                    @if (consulta()!.proxima_cita) {
                      <div class="info-section">
                        <h4><mat-icon>event</mat-icon> Próxima Cita</h4>
                        <p>{{ formatearFecha(consulta()!.proxima_cita!) }}</p>
                      </div>
                    }
                  </div>

                  <mat-divider></mat-divider>

                  <div class="content-section">
                    <h4><mat-icon>assignment</mat-icon> Motivo de Consulta</h4>
                    <div class="content-text">
                      {{ consulta()!.motivo }}
                    </div>
                  </div>

                  @if (consulta()!.diagnostico) {
                    <div class="content-section">
                      <h4><mat-icon>healing</mat-icon> Diagnóstico</h4>
                      <div class="content-text">
                        {{ consulta()!.diagnostico }}
                      </div>
                    </div>
                  }

                  @if (consulta()!.tratamiento) {
                    <div class="content-section">
                      <h4><mat-icon>medication</mat-icon> Tratamiento</h4>
                      <div class="content-text">
                        {{ consulta()!.tratamiento }}
                      </div>
                    </div>
                  }

                  @if (consulta()!.notas) {
                    <div class="content-section">
                      <h4><mat-icon>notes</mat-icon> Notas Adicionales</h4>
                      <div class="content-text">
                        {{ consulta()!.notas }}
                      </div>
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Tab: Examen físico -->
              <mat-tab label="Examen Físico">
                <div class="tab-content">
                  <div class="vitals-grid">
                    @if (consulta()!.temperatura) {
                      <div class="vital-card">
                        <mat-icon class="vital-icon temperature">thermostat</mat-icon>
                        <div class="vital-info">
                          <span class="vital-value">{{ consulta()!.temperatura }}°C</span>
                          <span class="vital-label">Temperatura</span>
                        </div>
                      </div>
                    }

                    @if (consulta()!.peso) {
                      <div class="vital-card">
                        <mat-icon class="vital-icon weight">monitor_weight</mat-icon>
                        <div class="vital-info">
                          <span class="vital-value">{{ consulta()!.peso }} kg</span>
                          <span class="vital-label">Peso</span>
                        </div>
                      </div>
                    }

                    @if (consulta()!.frecuencia_cardiaca) {
                      <div class="vital-card">
                        <mat-icon class="vital-icon heart">favorite</mat-icon>
                        <div class="vital-info">
                          <span class="vital-value">{{ consulta()!.frecuencia_cardiaca }} bpm</span>
                          <span class="vital-label">Frecuencia Cardíaca</span>
                        </div>
                      </div>
                    }

                    @if (consulta()!.frecuencia_respiratoria) {
                      <div class="vital-card">
                        <mat-icon class="vital-icon respiratory">air</mat-icon>
                        <div class="vital-info">
                          <span class="vital-value">{{ consulta()!.frecuencia_respiratoria }} rpm</span>
                          <span class="vital-label">Frecuencia Respiratoria</span>
                        </div>
                      </div>
                    }
                  </div>

                  @if (consulta()!.observaciones_examen) {
                    <mat-divider></mat-divider>
                    <div class="content-section">
                      <h4><mat-icon>visibility</mat-icon> Observaciones del Examen</h4>
                      <div class="content-text">
                        {{ consulta()!.observaciones_examen }}
                      </div>
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Tab: Archivos -->
              <mat-tab label="Archivos">
                <div class="tab-content">
                  <div class="files-section">
                    <div class="files-header">
                      <h4><mat-icon>attach_file</mat-icon> Archivos Adjuntos</h4>
                      <button mat-stroked-button (click)="uploadFile()">
                        <mat-icon>cloud_upload</mat-icon>
                        Subir Archivo
                      </button>
                    </div>
                    
                    @if (archivos().length > 0) {
                      <div class="files-list">
                        @for (archivo of archivos(); track archivo.id) {
                          <div class="file-item">
                            <mat-icon class="file-icon">{{ getFileIcon(archivo.tipo) }}</mat-icon>
                            <div class="file-info">
                              <span class="file-name">{{ archivo.nombre }}</span>
                              <span class="file-meta">{{ archivo.tamano }} - {{ formatearFecha(archivo.fecha_subida) }}</span>
                            </div>
                            <div class="file-actions">
                              <button mat-icon-button (click)="downloadFile(archivo)">
                                <mat-icon>download</mat-icon>
                              </button>
                              <button mat-icon-button (click)="deleteFile(archivo)" class="delete-btn">
                                <mat-icon>delete</mat-icon>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="no-files">
                        <mat-icon>folder_open</mat-icon>
                        <p>No hay archivos adjuntos</p>
                      </div>
                    }
                  </div>
                </div>
              </mat-tab>

              <!-- Tab: Historial -->
              <mat-tab label="Historial">
                <div class="tab-content">
                  <div class="timeline">
                    <div class="timeline-item">
                      <div class="timeline-icon created">
                        <mat-icon>add_circle</mat-icon>
                      </div>
                      <div class="timeline-content">
                        <h5>Consulta creada</h5>
                        <p>{{ formatearFecha(consulta()!.fecha_creacion || consulta()!.fecha_consulta) }}</p>
                      </div>
                    </div>

                    @if (consulta()!.fecha_actualizacion && consulta()!.fecha_actualizacion !== consulta()!.fecha_creacion) {
                      <div class="timeline-item">
                        <div class="timeline-icon updated">
                          <mat-icon>edit</mat-icon>
                        </div>
                        <div class="timeline-content">
                          <h5>Última actualización</h5>
                          <p>{{ formatearFecha(consulta()!.fecha_actualizacion!) }}</p>
                        </div>
                      </div>
                    }

                    @if (consulta()!.estado === 'Completada') {
                      <div class="timeline-item">
                        <div class="timeline-icon completed">
                          <mat-icon>check_circle</mat-icon>
                        </div>
                        <div class="timeline-content">
                          <h5>Consulta completada</h5>
                          <p>Estado actualizado a completada</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="error-container">
          <mat-icon>error_outline</mat-icon>
          <h3>Consulta no encontrada</h3>
          <p>La consulta solicitada no existe o no tienes permisos para verla.</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            Volver al listado
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .consulta-details-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    .details-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      background: rgba(46, 125, 50, 0.1);
      color: #2e7d32;
    }

    .title-section {
      flex: 1;
    }

    .details-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 500;
      color: #2e7d32;
    }

    .title-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .details-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .actions-section {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .delete-item {
      color: #f44336 !important;
    }

    /* Status card */
    .status-card {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-chip {
      font-weight: 500;
      font-size: 14px;
    }

    .basic-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-label {
      color: #666;
      font-size: 14px;
    }

    .codigo-consulta {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #2e7d32;
      background: rgba(46, 125, 50, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .patient-summary {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .patient-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #2e7d32;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .patient-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 500;
    }

    .patient-info p {
      margin: 2px 0;
      font-size: 14px;
      color: #666;
    }

    /* Content card */
    .content-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 24px 0;
    }

    /* Info sections */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .info-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: #2e7d32;
    }

    .info-section p {
      margin: 0;
      color: #333;
      font-size: 14px;
    }

    .content-section {
      margin: 24px 0;
    }

    .content-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #2e7d32;
    }

    .content-text {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #2e7d32;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    /* Vitals */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .vital-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .vital-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      padding: 8px;
      border-radius: 50%;
    }

    .vital-icon.temperature { background: rgba(255, 152, 0, 0.1); color: #ff9800; }
    .vital-icon.weight { background: rgba(156, 39, 176, 0.1); color: #9c27b0; }
    .vital-icon.heart { background: rgba(244, 67, 54, 0.1); color: #f44336; }
    .vital-icon.respiratory { background: rgba(33, 150, 243, 0.1); color: #2196f3; }

    .vital-info {
      display: flex;
      flex-direction: column;
    }

    .vital-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .vital-label {
      font-size: 12px;
      color: #666;
    }

    /* Files */
    .files-section {
      min-height: 200px;
    }

    .files-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .files-header h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #2e7d32;
    }

    .files-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .file-icon {
      color: #666;
    }

    .file-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-weight: 500;
      color: #333;
    }

    .file-meta {
      font-size: 12px;
      color: #666;
    }

    .file-actions {
      display: flex;
      gap: 4px;
    }

    .delete-btn {
      color: #f44336;
    }

    .no-files {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: #666;
    }

    .no-files mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 24px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 15px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e0e0e0;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .timeline-icon {
      position: absolute;
      left: -39px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .timeline-icon.created { background: #4caf50; }
    .timeline-icon.updated { background: #ff9800; }
    .timeline-icon.completed { background: #2196f3; }

    .timeline-content h5 {
      margin: 0 0 4px 0;
      font-weight: 500;
      color: #333;
    }

    .timeline-content p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    /* Loading and error states */
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .loading-container p,
    .error-container p {
      margin: 16px 0;
      color: #666;
    }

    .error-container mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      margin-bottom: 16px;
    }

    .error-container h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .consulta-details-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .details-title {
        font-size: 24px;
      }

      .status-row {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .patient-summary {
        justify-content: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .vitals-grid {
        grid-template-columns: 1fr;
      }

      .files-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
    }
  `]
})
export class ConsultaDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private consultasService = inject(ConsultasService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(false);
  consulta = signal<ConsultaClinica | null>(null);
  archivos = signal<any[]>([]);

  ngOnInit(): void {
    const consultaId = this.route.snapshot.paramMap.get('id');
    if (consultaId) {
      this.loadConsulta(consultaId);
      // Comentado hasta implementar el backend de archivos
      // this.loadArchivos(consultaId);
    }
  }

  private loadConsulta(id: string): void {
    this.loading.set(true);
    this.consultasService.getConsulta(id).subscribe({
      next: (consulta) => {
        this.consulta.set(consulta);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando consulta:', error);
        this.snackBar.open('Error cargando consulta', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private loadArchivos(consultaId: string): void {
    this.consultasService.getArchivos(consultaId).subscribe({
      next: (archivos) => {
        this.archivos.set(Array.isArray(archivos) ? archivos : []);
      },
      error: (error) => {
        console.error('Error cargando archivos:', error);
        this.archivos.set([]);
      }
    });
  }

  getEstadoColor(estado: string): string {
    const estadosConfig: Record<string, string> = {
      'En progreso': '#ff9800',
      'Completada': '#4caf50',
      'Cancelada': '#f44336'
    };
    return estadosConfig[estado] || '#666';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileIcon(tipo: string): string {
    const iconMap: Record<string, string> = {
      'pdf': 'picture_as_pdf',
      'image': 'image',
      'doc': 'description',
      'video': 'videocam'
    };
    return iconMap[tipo] || 'attach_file';
  }

  goBack(): void {
    this.router.navigate(['/historia-clinica']);
  }

  editConsulta(): void {
    this.router.navigate(['/historia-clinica', this.consulta()!.id_consulta, 'editar']);
  }

  exportConsulta(): void {
    const consulta = this.consulta();
    if (!consulta) return;

    this.consultasService.exportarConsulta(consulta.id_consulta).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consulta-${consulta.codigo_consulta}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando consulta:', error);
        this.snackBar.open('Error exportando consulta', 'Cerrar', { duration: 3000 });
      }
    });
  }

  duplicateConsulta(): void {
    const consulta = this.consulta();
    if (!consulta) return;

    this.router.navigate(['/historia-clinica/nueva'], {
      queryParams: { duplicate: consulta.id_consulta }
    });
  }

  deleteConsulta(): void {
    const consulta = this.consulta();
    if (!consulta) return;

    if (confirm(`¿Estás seguro de eliminar la consulta ${consulta.codigo_consulta}?`)) {
      this.consultasService.deleteConsulta(consulta.id_consulta).subscribe({
        next: () => {
          this.snackBar.open('Consulta eliminada exitosamente', 'Cerrar', { duration: 3000 });
          this.goBack();
        },
        error: (error) => {
          console.error('Error eliminando consulta:', error);
          this.snackBar.open('Error eliminando consulta', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  uploadFile(): void {
    // Implementar lógica de subida de archivos
    this.snackBar.open('Funcionalidad de subida de archivos en desarrollo', 'Cerrar', { duration: 3000 });
  }

  downloadFile(archivo: any): void {
    this.consultasService.downloadArchivo(archivo.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.nombre;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando archivo:', error);
        this.snackBar.open('Error descargando archivo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  deleteFile(archivo: any): void {
    if (confirm(`¿Estás seguro de eliminar el archivo ${archivo.nombre}?`)) {
      this.consultasService.deleteArchivo(archivo.id).subscribe({
        next: () => {
          this.snackBar.open('Archivo eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadArchivos(this.consulta()!.id_consulta);
        },
        error: (error) => {
          console.error('Error eliminando archivo:', error);
          this.snackBar.open('Error eliminando archivo', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }
}