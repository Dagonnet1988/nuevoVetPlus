import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { RecentActivity } from '../../../shared/services/dashboard.service';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterLink
  ],
  template: `
    <mat-card class="activity-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>history</mat-icon>
          Actividad Reciente
        </mat-card-title>
        <button mat-icon-button routerLink="/actividad" class="header-action">
          <mat-icon>more_vert</mat-icon>
        </button>
      </mat-card-header>

      <mat-card-content class="activity-content">
        @if (activities && activities.length > 0) {
          <mat-list class="activity-list">
            @for (activity of activities; track activity.id) {
              <mat-list-item class="activity-item">
                <div class="activity-icon" [style.background-color]="getIconBgColor(activity.color)">
                  <mat-icon [style.color]="activity.color">{{ activity.icono }}</mat-icon>
                </div>
                
                <div class="activity-info">
                  <p class="activity-description">{{ activity.descripcion }}</p>
                  <div class="activity-meta">
                    <span class="activity-user">{{ activity.usuario }}</span>
                    <span class="activity-time">{{ getRelativeTime(activity.fecha) }}</span>
                  </div>
                </div>

                <div class="activity-type">
                  <span class="type-badge" [class]="'type-' + activity.tipo">
                    {{ getTypeLabel(activity.tipo) }}
                  </span>
                </div>
              </mat-list-item>
            }
          </mat-list>
        } @else {
          <div class="no-activity">
            <mat-icon>inbox</mat-icon>
            <p>No hay actividad reciente</p>
          </div>
        }
      </mat-card-content>

      <mat-card-actions class="activity-actions">
        <button mat-button routerLink="/actividad" color="primary">
          <mat-icon>visibility</mat-icon>
          Ver Todo el Historial
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .activity-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .activity-card mat-card-header {
      display: flex;
      align-items: center;
      padding-bottom: 0;
    }

    .activity-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
      font-size: 18px;
    }

    .header-action {
      margin-left: auto;
      color: #666;
    }

    .activity-content {
      flex: 1;
      padding: 16px 0 !important;
      overflow-y: auto;
      max-height: 400px;
    }

    .activity-list {
      padding: 0;
    }

    .activity-item {
      padding: 12px 24px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-height: auto !important;
      height: auto !important;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-item:hover {
      background-color: rgba(0,0,0,0.02);
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .activity-info {
      flex: 1;
      min-width: 0;
    }

    .activity-description {
      margin: 0 0 4px 0;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      word-wrap: break-word;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
    }

    .activity-user {
      font-weight: 500;
    }

    .activity-time {
      position: relative;
    }

    .activity-time::before {
      content: '•';
      margin-right: 8px;
      color: #ccc;
    }

    .activity-type {
      flex-shrink: 0;
    }

    .type-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-cita {
      background-color: rgba(46, 125, 50, 0.1);
      color: #2e7d32;
    }

    .type-venta {
      background-color: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }

    .type-paciente {
      background-color: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .type-inventario {
      background-color: rgba(33, 150, 243, 0.1);
      color: #2196f3;
    }

    .no-activity {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .no-activity mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .no-activity p {
      margin: 0;
      font-size: 14px;
    }

    .activity-actions {
      padding: 16px 24px !important;
      border-top: 1px solid #f0f0f0;
      justify-content: center;
    }

    .activity-actions button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    // Dark theme
    .dark-theme .activity-card mat-card-title {
      color: #fff;
    }

    .dark-theme .activity-item {
      border-bottom-color: #333;
    }

    .dark-theme .activity-item:hover {
      background-color: rgba(255,255,255,0.02);
    }

    .dark-theme .activity-description {
      color: #fff;
    }

    .dark-theme .activity-meta {
      color: #b3b3b3;
    }

    .dark-theme .activity-time::before {
      color: #666;
    }

    .dark-theme .activity-actions {
      border-top-color: #333;
    }

    .dark-theme .no-activity {
      color: #666;
    }

    .dark-theme .no-activity mat-icon {
      color: #444;
    }

    // Responsive
    @media (max-width: 768px) {
      .activity-item {
        padding: 10px 16px;
        gap: 10px;
      }

      .activity-icon {
        width: 32px;
        height: 32px;
      }

      .activity-icon mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .activity-description {
        font-size: 13px;
      }

      .activity-meta {
        font-size: 11px;
      }

      .activity-actions {
        padding: 12px 16px !important;
      }
    }
  `]
})
export class RecentActivityComponent {
  @Input() activities: RecentActivity[] = [];

  getIconBgColor(color: string): string {
    // Convertir color hex a rgba con opacidad 0.1
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }

  getTypeLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'cita': 'Cita',
      'venta': 'Venta',
      'paciente': 'Paciente',
      'inventario': 'Inventario'
    };
    return labels[tipo] || tipo;
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Ahora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  }
}