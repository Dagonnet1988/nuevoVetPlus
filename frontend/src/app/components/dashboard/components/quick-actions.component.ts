import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

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
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.css']
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
      title: 'Historia Clínica',
      icon: 'medical_services',
      route: '/historia-clinica/nueva',
      color: 'info',
      roles: ['admin', 'vet'],
      description: 'Registrar valoración o consulta'
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
