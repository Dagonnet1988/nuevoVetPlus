import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracionService } from '../../services/configuracion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(false);
  empresaConfig = signal<any>(null);
  systemStatus = signal<any>(null);

  constructor(
    public configuracionService: ConfiguracionService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  configSections = [
    {
      title: 'Empresa',
      description: 'Información general de la empresa y clínica',
      icon: 'business',
      route: '/configuracion/empresa',
      color: '#1976d2',
      adminOnly: false,
      status: 'loading'
    },
    {
      title: 'Google Calendar',
      description: 'Integración con Google Calendar para sincronizar citas',
      icon: 'event',
      route: '/configuracion/google-calendar',
      color: '#4285f4',
      adminOnly: true,
      status: 'loading'
    },
    {
      title: 'Sistema',
      description: 'Configuraciones generales del sistema',
      icon: 'settings',
      route: '/configuracion/sistema',
      color: '#ff9800',
      adminOnly: true,
      status: 'loading'
    },
    {
      title: 'Usuarios y Roles',
      description: 'Gestión de usuarios del sistema',
      icon: 'people',
      route: '/usuarios',
      color: '#34a853',
      adminOnly: true,
      status: 'active'
    }
  ];

  // Filtrar secciones según permisos del usuario
  get availableSections() {
    return this.configSections.filter(section =>
      !section.adminOnly || this.authService.isAdmin()
    );
  }

  // Estadísticas rápidas
  quickStats = signal({
    empresa_configurada: false,
    google_calendar_conectado: false,
    usuarios_activos: 0,
    total_configuraciones: 0
  });

  ngOnInit(): void {
    this.empresaConfig.set(this.configuracionService.empresaConfig());
    this.loadSystemStatus();
  }

  private loadSystemStatus(): void {
    this.loading.set(true);

    this.configuracionService.getSystemStatus().subscribe({
      next: (status) => {
        this.systemStatus.set(status);
        this.updateSectionStatuses(status);
        this.updateQuickStats(status);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando estado del sistema:', error);
        this.loading.set(false);
        this.snackBar.open('Error cargando estado del sistema', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private updateSectionStatuses(status: any): void {
    // Mapear estados del backend a estados de UI
    const getUIStatus = (backendStatus: string): 'active' | 'pending' | 'error' => {
      switch (backendStatus?.toLowerCase()) {
        case 'configurado':
        case 'conectado':
        case 'operativo':
        case 'desconectado': // ✅ Agregar estado desconectado como activo (configurado pero no conectado)
          return 'active';
        case 'error':
        case 'fallido':
          return 'error';
        default:
          return 'pending';
      }
    };

    // Actualizar estado de cada sección basado en configuración real
    this.updateSectionStatus('Empresa', getUIStatus(status.empresa?.estado || 'pending'));
    this.updateSectionStatus('Google Calendar', getUIStatus(status.google_calendar?.estado || 'pending'));
    this.updateSectionStatus('Sistema', getUIStatus(status.sistema?.estado || 'pending'));
  }

  private updateQuickStats(status: any): void {
    const stats = {
      empresa_configurada: status.empresa?.configurado || false,
      google_calendar_conectado: status.google_calendar?.conectado || false,
      usuarios_activos: status.sistema?.usuarios_activos || 0,
      total_configuraciones: [
        status.empresa?.configurado,
        status.google_calendar?.conectado,
        status.sistema?.estado === 'operativo'
      ].filter(Boolean).length
    };

    this.quickStats.set(stats);
  }

  private updateSectionStatus(title: string, status: 'active' | 'pending' | 'error'): void {
    const section = this.configSections.find(s => s.title === title);
    if (section) {
      section.status = status;
    }
  }

  onSectionClick(section: any): void {
    if (section.adminOnly && !this.authService.isAdmin()) {
      this.snackBar.open('No tienes permisos para acceder a esta sección', 'Cerrar', { duration: 3000 });
      return;
    }
  }

  refreshConfigurations(): void {
    this.loadSystemStatus();
    this.snackBar.open('Configuraciones actualizadas', 'Cerrar', { duration: 2000 });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'check_circle';
      case 'error': return 'error';
      default: return 'schedule';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#ff9800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Configurado';
      case 'error': return 'Error';
      default: return 'Pendiente';
    }
  }
}
