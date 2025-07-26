import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { PacientesService } from '../services/pacientes.service';
import { Mascota, Cliente } from '../models/paciente.interface';

@Component({
  selector: 'app-paciente-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatMenuModule,
    MatTabsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
    <div class="details-container" *ngIf="!loading(); else loadingTemplate">
      <!-- Header con información básica -->
      <div class="details-header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        
        <div class="header-content">
          <div class="patient-avatar">
            <mat-icon class="avatar-icon">pets</mat-icon>
          </div>
          
          <div class="patient-basic-info">
            <h1 class="patient-name">{{ paciente()?.nombre }}</h1>
            <div class="patient-meta">
              <span class="species-breed">{{ paciente()?.especie }}</span>
              @if (paciente()?.raza) {
                <span class="separator">•</span>
                <span class="species-breed">{{ paciente()?.raza }}</span>
              }
              <span class="separator">•</span>
              <span class="age">{{ calculateAge(paciente()?.fecha_nacimiento) }}</span>
            </div>
            <div class="patient-status">
              <mat-chip [class.active]="paciente()?.activo" [class.inactive]="!paciente()?.activo">
                {{ paciente()?.activo ? 'Activo' : 'Inactivo' }}
              </mat-chip>
              <mat-chip [class.male]="paciente()?.sexo === 'M'" [class.female]="paciente()?.sexo === 'H'">
                {{ paciente()?.sexo === 'M' ? 'Macho' : 'Hembra' }}
              </mat-chip>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button mat-stroked-button (click)="editPaciente()" class="action-button">
            <mat-icon>edit</mat-icon>
            Editar
          </button>
          
          <button mat-button [matMenuTriggerFor]="actionsMenu" class="action-button">
            <mat-icon>more_vert</mat-icon>
          </button>
          
          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="newConsulta()">
              <mat-icon>medical_services</mat-icon>
              Nueva Consulta
            </button>
            <button mat-menu-item (click)="newCita()">
              <mat-icon>event</mat-icon>
              Agendar Cita
            </button>
            <button mat-menu-item (click)="viewHistory()">
              <mat-icon>history</mat-icon>
              Historia Clínica
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="generateReport()">
              <mat-icon>description</mat-icon>
              Generar Reporte
            </button>
            <button mat-menu-item (click)="exportData()">
              <mat-icon>file_download</mat-icon>
              Exportar Datos
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="toggleStatus()" [class.warn]="paciente()?.activo">
              <mat-icon>{{ paciente()?.activo ? 'block' : 'check_circle' }}</mat-icon>
              {{ paciente()?.activo ? 'Desactivar' : 'Activar' }}
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Contenido principal con tabs -->
      <mat-tab-group class="details-tabs" animationDuration="300ms">
        
        <!-- Tab: Información General -->
        <mat-tab label="Información General">
          <div class="tab-content">
            <div class="info-grid">
              
              <!-- Card: Datos de la Mascota -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon class="card-icon">pets</mat-icon>
                    Datos de la Mascota
                  </mat-card-title>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="info-grid-2">
                    <div class="info-item">
                      <span class="label">Nombre:</span>
                      <span class="value">{{ paciente()?.nombre || 'N/A' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Especie:</span>
                      <span class="value">{{ paciente()?.especie || 'N/A' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Raza:</span>
                      <span class="value">{{ paciente()?.raza || 'No especificada' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Sexo:</span>
                      <span class="value">{{ paciente()?.sexo === 'M' ? 'Macho' : 'Hembra' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Fecha de nacimiento:</span>
                      <span class="value">{{ formatDate(paciente()?.fecha_nacimiento) || 'No especificada' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Edad:</span>
                      <span class="value">{{ calculateAge(paciente()?.fecha_nacimiento) }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Peso:</span>
                      <span class="value">{{ paciente()?.peso ? paciente()?.peso + ' kg' : 'No registrado' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Color:</span>
                      <span class="value">{{ paciente()?.color || 'No especificado' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Microchip:</span>
                      <span class="value">{{ paciente()?.microchip || 'No registrado' }}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Fecha de registro:</span>
                      <span class="value">{{ formatDate(paciente()?.fecha_registro) || 'N/A' }}</span>
                    </div>
                  </div>
                  
                  @if (paciente()?.notas) {
                    <mat-divider class="notes-divider"></mat-divider>
                    <div class="notes-section">
                      <span class="label">Notas:</span>
                      <p class="notes-content">{{ paciente()?.notas }}</p>
                    </div>
                  }
                </mat-card-content>
              </mat-card>

              <!-- Card: Datos del Propietario -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon class="card-icon">person</mat-icon>
                    Propietario
                  </mat-card-title>
                  <button mat-icon-button (click)="viewOwnerDetails()" matTooltip="Ver detalles completos">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="owner-info">
                    <div class="owner-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <div class="owner-details">
                      <h3 class="owner-name">{{ paciente()?.cliente?.nombre || 'Sin asignar' }}</h3>
                      
                      @if (paciente()?.cliente?.telefono) {
                        <div class="contact-item">
                          <mat-icon class="contact-icon">phone</mat-icon>
                          <span>{{ paciente()?.cliente?.telefono }}</span>
                          <button mat-icon-button (click)="callOwner()" matTooltip="Llamar">
                            <mat-icon>call</mat-icon>
                          </button>
                        </div>
                      }
                      
                      @if (paciente()?.cliente?.email) {
                        <div class="contact-item">
                          <mat-icon class="contact-icon">email</mat-icon>
                          <span>{{ paciente()?.cliente?.email }}</span>
                          <button mat-icon-button (click)="emailOwner()" matTooltip="Enviar email">
                            <mat-icon>mail</mat-icon>
                          </button>
                        </div>
                      }
                      
                      @if (paciente()?.cliente?.direccion) {
                        <div class="contact-item">
                          <mat-icon class="contact-icon">location_on</mat-icon>
                          <span>{{ paciente()?.cliente?.direccion }}</span>
                          <button mat-icon-button (click)="showMap()" matTooltip="Ver en mapa">
                            <mat-icon>map</mat-icon>
                          </button>
                        </div>
                      }
                      
                      @if (paciente()?.cliente?.cedula) {
                        <div class="contact-item">
                          <mat-icon class="contact-icon">badge</mat-icon>
                          <span>CC: {{ paciente()?.cliente?.cedula }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Card: Estadísticas Rápidas -->
              <mat-card class="info-card stats-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon class="card-icon">analytics</mat-icon>
                    Resumen Médico
                  </mat-card-title>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <mat-icon class="stat-icon primary">medical_services</mat-icon>
                      <div class="stat-info">
                        <span class="stat-number">{{ statsResumen()?.consultas || 0 }}</span>
                        <span class="stat-label">Consultas</span>
                      </div>
                    </div>
                    
                    <div class="stat-item">
                      <mat-icon class="stat-icon accent">event</mat-icon>
                      <div class="stat-info">
                        <span class="stat-number">{{ statsResumen()?.citas || 0 }}</span>
                        <span class="stat-label">Citas</span>
                      </div>
                    </div>
                    
                    <div class="stat-item">
                      <mat-icon class="stat-icon warn">vaccines</mat-icon>
                      <div class="stat-info">
                        <span class="stat-number">{{ statsResumen()?.vacunas || 0 }}</span>
                        <span class="stat-label">Vacunas</span>
                      </div>
                    </div>
                  </div>
                  
                  <mat-divider class="stats-divider"></mat-divider>
                  
                  <div class="last-visit">
                    <span class="label">Última visita:</span>
                    <span class="value">{{ statsResumen()?.ultimaVisita || 'Nunca' }}</span>
                  </div>
                  
                  <div class="next-appointment">
                    <span class="label">Próxima cita:</span>
                    <span class="value">{{ statsResumen()?.proximaCita || 'No programada' }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Tab: Historia Médica -->
        <mat-tab label="Historia Médica">
          <div class="tab-content">
            <div class="history-container">
              
              <!-- Filtros rápidos -->
              <div class="history-filters">
                <button mat-stroked-button [class.active]="activeFilter() === 'all'" (click)="setFilter('all')">
                  Todos
                </button>
                <button mat-stroked-button [class.active]="activeFilter() === 'consultas'" (click)="setFilter('consultas')">
                  Consultas
                </button>
                <button mat-stroked-button [class.active]="activeFilter() === 'vacunas'" (click)="setFilter('vacunas')">
                  Vacunas
                </button>
                <button mat-stroked-button [class.active]="activeFilter() === 'tratamientos'" (click)="setFilter('tratamientos')">
                  Tratamientos
                </button>
              </div>

              <!-- Timeline de eventos médicos -->
              <div class="medical-timeline">
                @for (evento of filteredHistory(); track evento.id) {
                  <div class="timeline-item">
                    <div class="timeline-marker" [class]="evento.tipo">
                      <mat-icon>{{ getEventIcon(evento.tipo) }}</mat-icon>
                    </div>
                    <div class="timeline-content">
                      <mat-card class="event-card">
                        <mat-card-header>
                          <mat-card-title>{{ evento.titulo }}</mat-card-title>
                          <mat-card-subtitle>{{ formatDate(evento.fecha) }} - {{ evento.profesional }}</mat-card-subtitle>
                        </mat-card-header>
                        <mat-card-content>
                          <p>{{ evento.descripcion }}</p>
                          @if (evento.medicamentos && evento.medicamentos.length > 0) {
                            <div class="medications">
                              <strong>Medicamentos:</strong>
                              <ul>
                                @for (med of evento.medicamentos; track med) {
                                  <li>{{ med }}</li>
                                }
                              </ul>
                            </div>
                          }
                        </mat-card-content>
                        <mat-card-actions>
                          <button mat-button (click)="viewEventDetails(evento)">
                            <mat-icon>visibility</mat-icon>
                            Ver detalles
                          </button>
                        </mat-card-actions>
                      </mat-card>
                    </div>
                  </div>
                } @empty {
                  <div class="no-history">
                    <mat-icon class="no-history-icon">history</mat-icon>
                    <h3>Sin historial médico</h3>
                    <p>No hay registros médicos para este paciente.</p>
                    <button mat-raised-button color="primary" (click)="newConsulta()">
                      <mat-icon>add</mat-icon>
                      Nueva Consulta
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Tab: Documentos -->
        <mat-tab label="Documentos">
          <div class="tab-content">
            <div class="documents-container">
              <div class="documents-header">
                <h3>Documentos del Paciente</h3>
                <button mat-raised-button color="primary" (click)="uploadDocument()">
                  <mat-icon>upload</mat-icon>
                  Subir Documento
                </button>
              </div>
              
              <!-- Lista de documentos -->
              <div class="documents-list">
                @for (doc of documentos(); track doc.id) {
                  <mat-card class="document-card">
                    <mat-card-content>
                      <div class="document-info">
                        <mat-icon class="document-icon">{{ getDocumentIcon(doc.tipo) }}</mat-icon>
                        <div class="document-details">
                          <h4>{{ doc.nombre }}</h4>
                          <p>{{ doc.descripcion }}</p>
                          <span class="document-date">{{ formatDate(doc.fecha) }}</span>
                        </div>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-icon-button (click)="downloadDocument(doc)" matTooltip="Descargar">
                        <mat-icon>download</mat-icon>
                      </button>
                      <button mat-icon-button (click)="viewDocument(doc)" matTooltip="Ver">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button (click)="deleteDocument(doc)" matTooltip="Eliminar" class="delete-btn">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-card-actions>
                  </mat-card>
                } @empty {
                  <div class="no-documents">
                    <mat-icon class="no-docs-icon">folder_open</mat-icon>
                    <h3>Sin documentos</h3>
                    <p>No hay documentos registrados para este paciente.</p>
                  </div>
                }
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading template -->
    <ng-template #loadingTemplate>
      <div class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Cargando información del paciente...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .details-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .details-header {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 32px;
      padding: 24px;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      border-radius: 16px;
    }

    .back-button {
      margin-top: 8px;
    }

    .header-content {
      display: flex;
      gap: 20px;
      flex: 1;
    }

    .patient-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
    }

    .avatar-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .patient-basic-info {
      flex: 1;
    }

    .patient-name {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 500;
      color: #2e7d32;
    }

    .patient-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #666;
      font-size: 16px;
    }

    .separator {
      color: #999;
    }

    .patient-status {
      display: flex;
      gap: 8px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tabs */
    .details-tabs {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 24px;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .info-card {
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .card-icon {
      margin-right: 8px;
      color: #2e7d32;
    }

    .info-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-weight: 500;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      color: #333;
      font-size: 14px;
    }

    .notes-divider {
      margin: 20px 0;
    }

    .notes-section {
      margin-top: 16px;
    }

    .notes-content {
      margin: 8px 0 0 0;
      color: #333;
      line-height: 1.5;
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
    }

    /* Owner Info */
    .owner-info {
      display: flex;
      gap: 16px;
    }

    .owner-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #e3f2fd;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1976d2;
    }

    .owner-details {
      flex: 1;
    }

    .owner-name {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 500;
      color: #333;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .contact-icon {
      color: #666;
      font-size: 16px;
    }

    /* Stats */
    .stats-card {
      height: fit-content;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-icon.primary { color: #2e7d32; }
    .stat-icon.accent { color: #1976d2; }
    .stat-icon.warn { color: #f57c00; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }

    .stats-divider {
      margin: 16px 0;
    }

    .last-visit,
    .next-appointment {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    /* History */
    .history-filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .history-filters button.active {
      background: #2e7d32;
      color: white;
    }

    .medical-timeline {
      position: relative;
    }

    .timeline-item {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 22px;
      top: 44px;
      bottom: -24px;
      width: 2px;
      background: #e0e0e0;
    }

    .timeline-marker {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .timeline-marker.consulta { background: #2e7d32; }
    .timeline-marker.vacuna { background: #1976d2; }
    .timeline-marker.tratamiento { background: #f57c00; }
    .timeline-marker.cirugia { background: #d32f2f; }

    .timeline-content {
      flex: 1;
    }

    .event-card {
      border-radius: 8px;
    }

    .medications {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .medications ul {
      margin: 8px 0;
      padding-left: 20px;
    }

    .no-history {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .no-history-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.5;
      margin-bottom: 16px;
    }

    /* Documents */
    .documents-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .documents-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .document-card {
      border-radius: 8px;
    }

    .document-info {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .document-icon {
      color: #666;
      font-size: 24px;
    }

    .document-details h4 {
      margin: 0 0 4px 0;
      color: #333;
    }

    .document-details p {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 14px;
    }

    .document-date {
      font-size: 12px;
      color: #999;
    }

    .delete-btn {
      color: #d32f2f;
    }

    .no-documents {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .no-docs-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.5;
      margin-bottom: 16px;
    }

    /* Chips */
    .active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .inactive {
      background-color: #ffebee;
      color: #c62828;
    }

    .male {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .female {
      background-color: #fce4ec;
      color: #c2185b;
    }

    .warn {
      color: #d32f2f;
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      color: #666;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .details-container {
        padding: 16px;
      }

      .details-header {
        flex-direction: column;
        gap: 16px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .documents-list {
        grid-template-columns: 1fr;
      }

      .timeline-item {
        flex-direction: column;
        gap: 12px;
      }

      .timeline-marker {
        align-self: flex-start;
      }
    }
  `]
})
export class PacienteDetailsComponent implements OnInit {
  // Signals para estado reactivo
  loading = signal(true);
  paciente = signal<Mascota | null>(null);
  statsResumen = signal<any>({});
  activeFilter = signal('all');
  documentos = signal<any[]>([]);

  // Datos mock para desarrollo
  mockHistorial = [
    {
      id: '1',
      tipo: 'consulta',
      titulo: 'Consulta General',
      fecha: '2024-01-15',
      profesional: 'Dr. García',
      descripcion: 'Consulta de rutina. Paciente en buen estado general.',
      medicamentos: ['Vitaminas B-Complex', 'Antiparasitario']
    },
    {
      id: '2',
      tipo: 'vacuna',
      titulo: 'Vacuna Triple',
      fecha: '2024-01-10',
      profesional: 'Dr. Pérez',
      descripcion: 'Aplicación de vacuna triple viral.',
      medicamentos: []
    },
    {
      id: '3',
      tipo: 'tratamiento',
      titulo: 'Tratamiento Dermatológico',
      fecha: '2023-12-20',
      profesional: 'Dr. García',
      descripcion: 'Tratamiento para dermatitis alérgica.',
      medicamentos: ['Antihistamínico', 'Shampoo medicado']
    }
  ];

  mockDocumentos = [
    {
      id: '1',
      nombre: 'Certificado de Vacunación',
      tipo: 'certificado',
      descripcion: 'Certificado actualizado de vacunas',
      fecha: '2024-01-15'
    },
    {
      id: '2',
      nombre: 'Radiografía Torácica',
      tipo: 'imagen',
      descripcion: 'Radiografía para diagnóstico',
      fecha: '2024-01-10'
    }
  ];

  pacienteId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacientesService: PacientesService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.pacienteId = params['id'];
      this.loadPacienteDetails();
    });
  }

  private loadPacienteDetails(): void {
    this.loading.set(true);
    
    // Simular carga de datos
    setTimeout(() => {
      // Datos mock del paciente (normalmente vendría del servicio)
      const mockPaciente: Mascota = {
        id_mascota: this.pacienteId,
        id_cliente: '1',
        nombre: 'Max',
        especie: 'Perro',
        raza: 'Golden Retriever',
        sexo: 'M',
        fecha_nacimiento: '2020-03-15',
        peso: 25.5,
        color: 'Dorado',
        microchip: '982000123456789',
        notas: 'Paciente muy dócil y tranquilo. Le gusta jugar con otros perros. Alérgico al pollo.',
        activo: true,
        fecha_registro: '2023-01-15',
        cliente: {
          id_cliente: '1',
          nombre: 'Carlos Rodríguez',
          telefono: '+57 301 234 5678',
          email: 'carlos@email.com',
          direccion: 'Calle 123 #45-67, Bogotá',
          cedula: '12345678',
          activo: true
        }
      };

      this.paciente.set(mockPaciente);
      
      // Stats mock
      this.statsResumen.set({
        consultas: 12,
        citas: 8,
        vacunas: 6,
        ultimaVisita: '15 de Enero, 2024',
        proximaCita: '28 de Febrero, 2024'
      });

      this.documentos.set(this.mockDocumentos);
      this.loading.set(false);
    }, 1500);
  }

  // Utilidades
  calculateAge(fechaNacimiento?: string): string {
    if (!fechaNacimiento) return 'Edad desconocida';
    
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

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  filteredHistory() {
    const filter = this.activeFilter();
    if (filter === 'all') return this.mockHistorial;
    return this.mockHistorial.filter(evento => evento.tipo === filter);
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  getEventIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      consulta: 'medical_services',
      vacuna: 'vaccines',
      tratamiento: 'medication',
      cirugia: 'healing'
    };
    return icons[tipo] || 'event';
  }

  getDocumentIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      certificado: 'verified',
      imagen: 'image',
      reporte: 'description',
      receta: 'receipt'
    };
    return icons[tipo] || 'insert_drive_file';
  }

  // Acciones
  goBack(): void {
    this.router.navigate(['/pacientes']);
  }

  editPaciente(): void {
    this.router.navigate(['/pacientes', this.pacienteId, 'editar']);
  }

  newConsulta(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Nueva Consulta', 'Cerrar', { duration: 3000 });
  }

  newCita(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Agendar Cita', 'Cerrar', { duration: 3000 });
  }

  viewHistory(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Historia Clínica Completa', 'Cerrar', { duration: 3000 });
  }

  generateReport(): void {
    this.snackBar.open('Generando reporte del paciente...', 'Cerrar', { duration: 3000 });
  }

  exportData(): void {
    this.snackBar.open('Exportando datos del paciente...', 'Cerrar', { duration: 3000 });
  }

  toggleStatus(): void {
    const paciente = this.paciente();
    if (paciente) {
      const action = paciente.activo ? 'desactivar' : 'activar';
      if (confirm(`¿Estás seguro de ${action} a ${paciente.nombre}?`)) {
        paciente.activo = !paciente.activo;
        this.paciente.set({...paciente});
        this.snackBar.open(
          `${paciente.nombre} ha sido ${paciente.activo ? 'activado' : 'desactivado'}`,
          'Cerrar',
          { duration: 3000 }
        );
      }
    }
  }

  viewOwnerDetails(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Detalles del propietario', 'Cerrar', { duration: 3000 });
  }

  callOwner(): void {
    const telefono = this.paciente()?.cliente?.telefono;
    if (telefono) {
      window.open(`tel:${telefono}`);
    }
  }

  emailOwner(): void {
    const email = this.paciente()?.cliente?.email;
    if (email) {
      window.open(`mailto:${email}`);
    }
  }

  showMap(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Mostrar en mapa', 'Cerrar', { duration: 3000 });
  }

  viewEventDetails(evento: any): void {
    this.snackBar.open(`Ver detalles de: ${evento.titulo}`, 'Cerrar', { duration: 3000 });
  }

  uploadDocument(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Subir documento', 'Cerrar', { duration: 3000 });
  }

  downloadDocument(doc: any): void {
    this.snackBar.open(`Descargando: ${doc.nombre}`, 'Cerrar', { duration: 3000 });
  }

  viewDocument(doc: any): void {
    this.snackBar.open(`Visualizando: ${doc.nombre}`, 'Cerrar', { duration: 3000 });
  }

  deleteDocument(doc: any): void {
    if (confirm(`¿Eliminar ${doc.nombre}?`)) {
      this.snackBar.open(`${doc.nombre} eliminado`, 'Cerrar', { duration: 3000 });
    }
  }
}