import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

export interface QuickAction {
  title: string;
  icon: string;
  route: string;
  color: string;
  roles: ('admin' | 'vet' | 'aux')[];
  description?: string;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    RouterLink
  ],
  template: `
    <mat-card class="quick-actions-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>flash_on</mat-icon>
          Accesos Rápidos
        </mat-card-title>
      </mat-card-header>

      <mat-card-content class="actions-content">
        <div class="actions-grid">
          @for (action of filteredActions; track action.route) {
            <button 
              mat-stroked-button 
              [routerLink]="action.route"
              class="action-button"
              [class]="'action-' + action.color">
              <div class="action-icon">
                <mat-icon>{{ action.icon }}</mat-icon>
              </div>
              <div class="action-info">
                <span class="action-title">{{ action.title }}</span>
                @if (action.description) {
                  <span class="action-description">{{ action.description }}</span>
                }
              </div>
            </button>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .quick-actions-card {
      height: 100%;
    }

    .quick-actions-card mat-card-header {
      padding-bottom: 8px;
    }

    .quick-actions-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
      font-size: 18px;
    }

    .actions-content {
      padding: 16px 0 !important;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .action-button {
      display: flex !important;
      align-items: center;
      gap: 12px;
      padding: 16px !important;
      text-align: left;
      height: auto !important;
      border-radius: 8px !important;
      transition: all 0.2s ease;
      text-decoration: none !important;
      border: 2px solid #e0e0e0 !important;
    }

    .action-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .action-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .action-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .action-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      line-height: 1.2;
    }

    .action-description {
      font-size: 12px;
      color: #666;
      line-height: 1.2;
    }

    // Color variants
    .action-primary {
      border-color: rgba(46, 125, 50, 0.3) !important;
    }

    .action-primary:hover {
      border-color: #2e7d32 !important;
      background-color: rgba(46, 125, 50, 0.02);
    }

    .action-primary .action-icon {
      background-color: rgba(46, 125, 50, 0.1);
    }

    .action-primary .action-icon mat-icon {
      color: #2e7d32;
    }

    .action-success {
      border-color: rgba(76, 175, 80, 0.3) !important;
    }

    .action-success:hover {
      border-color: #4caf50 !important;
      background-color: rgba(76, 175, 80, 0.02);
    }

    .action-success .action-icon {
      background-color: rgba(76, 175, 80, 0.1);
    }

    .action-success .action-icon mat-icon {
      color: #4caf50;
    }

    .action-warning {
      border-color: rgba(255, 152, 0, 0.3) !important;
    }

    .action-warning:hover {
      border-color: #ff9800 !important;
      background-color: rgba(255, 152, 0, 0.02);
    }

    .action-warning .action-icon {
      background-color: rgba(255, 152, 0, 0.1);
    }

    .action-warning .action-icon mat-icon {
      color: #ff9800;
    }

    .action-info {
      border-color: rgba(33, 150, 243, 0.3) !important;
    }

    .action-info:hover {
      border-color: #2196f3 !important;
      background-color: rgba(33, 150, 243, 0.02);
    }

    .action-info .action-icon {
      background-color: rgba(33, 150, 243, 0.1);
    }

    .action-info .action-icon mat-icon {
      color: #2196f3;
    }

    .action-error {
      border-color: rgba(244, 67, 54, 0.3) !important;
    }

    .action-error:hover {
      border-color: #f44336 !important;
      background-color: rgba(244, 67, 54, 0.02);
    }

    .action-error .action-icon {
      background-color: rgba(244, 67, 54, 0.1);
    }

    .action-error .action-icon mat-icon {
      color: #f44336;
    }

    // Dark theme
    .dark-theme .quick-actions-card mat-card-title {
      color: #fff;
    }

    .dark-theme .action-button {
      border-color: #444 !important;
    }

    .dark-theme .action-title {
      color: #fff;
    }

    .dark-theme .action-description {
      color: #b3b3b3;
    }

    // Responsive
    @media (max-width: 768px) {
      .actions-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .action-button {
        padding: 12px !important;
        gap: 10px;
      }

      .action-icon {
        width: 36px;
        height: 36px;
      }

      .action-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .action-title {
        font-size: 13px;
      }

      .action-description {
        font-size: 11px;
      }
    }

    @media (max-width: 480px) {
      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-button {
        flex-direction: column;
        text-align: center;
        gap: 8px;
        padding: 12px 8px !important;
      }

      .action-info {
        align-items: center;
      }
    }
  `]
})
export class QuickActionsComponent {
  @Input() actions: QuickAction[] = [];

  private readonly defaultActions: QuickAction[] = [
    {
      title: 'Nueva Cita',
      icon: 'event_available',
      route: '/citas/nueva',
      color: 'primary',
      roles: ['admin', 'vet', 'aux'],
      description: 'Agendar cita'
    },
    {
      title: 'Nuevo Paciente',
      icon: 'pets',
      route: '/pacientes/nuevo',
      color: 'success',
      roles: ['admin', 'vet', 'aux'],
      description: 'Registrar mascota'
    },
    {
      title: 'Nueva Factura',
      icon: 'receipt_long',
      route: '/facturacion/nueva',
      color: 'warning',
      roles: ['admin', 'aux'],
      description: 'Generar factura'
    },
    {
      title: 'Consulta Médica',
      icon: 'medical_services',
      route: '/historia-clinica/nueva',
      color: 'info',
      roles: ['admin', 'vet'],
      description: 'Nueva consulta'
    },
    {
      title: 'Inventario',
      icon: 'inventory_2',
      route: '/inventario',
      color: 'primary',
      roles: ['admin', 'aux'],
      description: 'Gestionar stock'
    },
    {
      title: 'Reportes',
      icon: 'analytics',
      route: '/reportes',
      color: 'info',
      roles: ['admin'],
      description: 'Ver estadísticas'
    },
    {
      title: 'Usuarios',
      icon: 'people',
      route: '/usuarios',
      color: 'error',
      roles: ['admin'],
      description: 'Gestionar usuarios'
    },
    {
      title: 'Configuración',
      icon: 'settings',
      route: '/configuracion',
      color: 'primary',
      roles: ['admin'],
      description: 'Ajustes sistema'
    }
  ];

  constructor(private authService: AuthService) {}

  get filteredActions(): QuickAction[] {
    const actionsToFilter = this.actions.length > 0 ? this.actions : this.defaultActions;
    
    return actionsToFilter.filter(action => 
      this.authService.hasAnyRole(action.roles)
    );
  }
}