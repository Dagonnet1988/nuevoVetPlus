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
      status: 'active'
    },
    {
      title: 'Google Calendar',
      description: 'Integración con Google Calendar para sincronizar citas',
      icon: 'event',
      route: '/configuracion/google-calendar',
      color: '#4285f4',
      adminOnly: true,
      status: 'pending'
    },
    {
      title: 'WhatsApp',
      description: 'Configuración de mensajería automática con Baileys',
      icon: 'chat',
      route: '/configuracion/whatsapp',
      color: '#25d366',
      adminOnly: true,
      status: 'pending'
    },
    {
      title: 'Sistema',
      description: 'Configuraciones generales del sistema',
      icon: 'settings',
      route: '/configuracion/sistema',
      color: '#ff9800',
      adminOnly: true,
      status: 'pending'
    },
    {
      title: 'Usuarios y Roles',
      description: 'Gestión de usuarios del sistema',
      icon: 'people',
      route: '/usuarios',
      color: '#34a853',
      adminOnly: true,
      status: 'active'
    },
    {
      title: 'Reportes',
      description: 'Configuración de reportes y analytics',
      icon: 'analytics',
      route: '/reportes',
      color: '#9c27b0',
      adminOnly: false,
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
    whatsapp_conectado: false,
    usuarios_activos: 0,
    total_configuraciones: 0
  });

  ngOnInit(): void {
    this.empresaConfig.set(this.configuracionService.empresaConfig());
    this.loadConfigurations();
    this.loadQuickStats();
  }

  private loadConfigurations(): void {
    this.loading.set(true);
    
    // Cargar configuración de empresa
    this.configuracionService.getEmpresaConfig().subscribe({
      next: (config) => {
        this.loading.set(false);
        this.updateSectionStatus('Empresa', config ? 'active' : 'pending');
      },
      error: (error) => {
        console.error('Error cargando configuración de empresa:', error);
        this.loading.set(false);
        this.updateSectionStatus('Empresa', 'error');
      }
    });
  }

  private loadQuickStats(): void {
    // Cargar estadísticas rápidas
    const stats = this.quickStats();
    
    // Verificar si empresa está configurada
    if (this.empresaConfig()) {
      stats.empresa_configurada = true;
      stats.total_configuraciones++;
    }
    
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
    this.loadConfigurations();
    this.loadQuickStats();
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