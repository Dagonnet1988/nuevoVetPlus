import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterLink } from '@angular/router';

export interface AppointmentSummary {
  id: string;
  paciente_nombre: string;
  cliente_nombre: string;
  hora: string;
  tipo: string;
  estado: 'confirmada' | 'pendiente' | 'cancelada';
  veterinario: string;
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatBadgeModule,
    RouterLink
  ],
  template: `
    <mat-card class="appointments-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>today</mat-icon>
          Citas de Hoy
        </mat-card-title>
        <div class="header-actions">
          @if (appointments.length > 0) {
            <span class="appointments-count" [matBadge]="appointments.length" matBadgeColor="primary">
              <mat-icon>event</mat-icon>
            </span>
          }
          <button mat-icon-button routerLink="/citas" class="header-action">
            <mat-icon>calendar_month</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-card-content class="appointments-content">
        @if (appointments && appointments.length > 0) {
          <div class="appointments-summary">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-value">{{ getTotalAppointments() }}</span>
                <span class="stat-label">Total</span>
              </div>
              <div class="stat-item">
                <span class="stat-value confirmed">{{ getAppointmentsByStatus('confirmada') }}</span>
                <span class="stat-label">Confirmadas</span>
              </div>
              <div class="stat-item">
                <span class="stat-value pending">{{ getAppointmentsByStatus('pendiente') }}</span>
                <span class="stat-label">Pendientes</span>
              </div>
            </div>
          </div>

          <mat-list class="appointments-list">
            @for (appointment of appointments.slice(0, 5); track appointment.id) {
              <mat-list-item class="appointment-item">
                <div class="appointment-time">
                  <span class="time">{{ appointment.hora }}</span>
                  <div class="status-indicator" [class]="'status-' + appointment.estado"></div>
                </div>
                
                <div class="appointment-info">
                  <p class="patient-name">{{ appointment.paciente_nombre }}</p>
                  <p class="client-name">{{ appointment.cliente_nombre }}</p>
                  <div class="appointment-meta">
                    <span class="appointment-type">{{ appointment.tipo }}</span>
                    <span class="appointment-vet">{{ appointment.veterinario }}</span>
                  </div>
                </div>

                <div class="appointment-actions">
                  <button mat-icon-button [routerLink]="['/citas', appointment.id]" class="view-appointment">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </div>
              </mat-list-item>
            }
          </mat-list>

          @if (appointments.length > 5) {
            <div class="more-appointments">
              <p class="more-text">Y {{ appointments.length - 5 }} citas más...</p>
            </div>
          }
        } @else {
          <div class="no-appointments">
            <mat-icon>event_available</mat-icon>
            <p>No hay citas programadas para hoy</p>
            <button mat-stroked-button routerLink="/citas/nueva" color="primary">
              <mat-icon>add</mat-icon>
              Agendar Nueva Cita
            </button>
          </div>
        }
      </mat-card-content>

      <mat-card-actions class="appointments-actions">
        <button mat-button routerLink="/citas" color="primary">
          <mat-icon>calendar_month</mat-icon>
          Ver Calendario Completo
        </button>
        <button mat-button routerLink="/citas/nueva" color="primary">
          <mat-icon>add</mat-icon>
          Nueva Cita
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .appointments-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .appointments-card mat-card-header {
      display: flex;
      align-items: center;
      padding-bottom: 8px;
    }

    .appointments-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
      font-size: 18px;
    }

    .header-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .appointments-count {
      display: flex;
      align-items: center;
    }

    .appointments-count mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #2e7d32;
    }

    .header-action {
      color: #666;
    }

    .appointments-content {
      flex: 1;
      padding: 16px 0 !important;
      overflow-y: auto;
    }

    .appointments-summary {
      margin-bottom: 16px;
      padding: 0 24px;
    }

    .summary-stats {
      display: flex;
      justify-content: space-around;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .stat-value.confirmed {
      color: #4caf50;
    }

    .stat-value.pending {
      color: #ff9800;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .appointments-list {
      padding: 0;
    }

    .appointment-item {
      padding: 12px 24px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: auto !important;
      height: auto !important;
    }

    .appointment-item:last-child {
      border-bottom: none;
    }

    .appointment-item:hover {
      background-color: rgba(0,0,0,0.02);
    }

    .appointment-time {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      width: 60px;
    }

    .time {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      text-align: center;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-confirmada {
      background-color: #4caf50;
    }

    .status-pendiente {
      background-color: #ff9800;
    }

    .status-cancelada {
      background-color: #f44336;
    }

    .appointment-info {
      flex: 1;
      min-width: 0;
    }

    .patient-name {
      margin: 0 0 2px 0;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      line-height: 1.2;
    }

    .client-name {
      margin: 0 0 4px 0;
      font-size: 12px;
      color: #666;
      line-height: 1.2;
    }

    .appointment-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #999;
    }

    .appointment-type {
      background-color: rgba(46, 125, 50, 0.1);
      color: #2e7d32;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 500;
    }

    .appointment-vet {
      font-style: italic;
    }

    .appointment-actions {
      flex-shrink: 0;
    }

    .view-appointment {
      color: #666;
    }

    .more-appointments {
      text-align: center;
      padding: 16px 24px;
      border-top: 1px solid #f0f0f0;
    }

    .more-text {
      margin: 0;
      font-size: 12px;
      color: #666;
      font-style: italic;
    }

    .no-appointments {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .no-appointments mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .no-appointments p {
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .no-appointments button {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto;
    }

    .appointments-actions {
      padding: 16px 24px !important;
      border-top: 1px solid #f0f0f0;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .appointments-actions button {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 140px;
    }

    // Dark theme
    .dark-theme .appointments-card mat-card-title {
      color: #fff;
    }

    .dark-theme .summary-stats {
      background: #2d2d2d;
    }

    .dark-theme .stat-value {
      color: #fff;
    }

    .dark-theme .stat-label {
      color: #b3b3b3;
    }

    .dark-theme .appointment-item {
      border-bottom-color: #333;
    }

    .dark-theme .appointment-item:hover {
      background-color: rgba(255,255,255,0.02);
    }

    .dark-theme .time,
    .dark-theme .patient-name {
      color: #fff;
    }

    .dark-theme .client-name {
      color: #b3b3b3;
    }

    .dark-theme .appointment-meta {
      color: #666;
    }

    .dark-theme .more-appointments {
      border-top-color: #333;
    }

    .dark-theme .more-text {
      color: #666;
    }

    .dark-theme .appointments-actions {
      border-top-color: #333;
    }

    .dark-theme .no-appointments {
      color: #666;
    }

    .dark-theme .no-appointments mat-icon {
      color: #444;
    }

    // Responsive
    @media (max-width: 768px) {
      .appointment-item {
        padding: 10px 16px;
        gap: 12px;
      }

      .appointment-time {
        width: 50px;
      }

      .time {
        font-size: 12px;
      }

      .patient-name {
        font-size: 13px;
      }

      .client-name {
        font-size: 11px;
      }

      .appointment-meta {
        font-size: 10px;
        gap: 8px;
      }

      .appointments-actions {
        padding: 12px 16px !important;
        flex-direction: column;
      }

      .appointments-actions button {
        min-width: auto;
      }

      .summary-stats {
        padding: 12px;
      }

      .stat-value {
        font-size: 20px;
      }
    }
  `]
})
export class AppointmentsCalendarComponent {
  @Input() appointments: AppointmentSummary[] = [];

  getTotalAppointments(): number {
    return this.appointments.length;
  }

  getAppointmentsByStatus(status: string): number {
    return this.appointments.filter(apt => apt.estado === status).length;
  }
}