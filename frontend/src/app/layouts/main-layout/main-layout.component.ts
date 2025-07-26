import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import { NotificationsComponent } from '../../shared/components/notifications/notifications.component';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: ('admin' | 'vet' | 'aux')[];
  badge?: number;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    NotificationsComponent
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- Sidebar -->
      <mat-sidenav
        #drawer
        class="sidenav"
        fixedInViewport="true"
        [attr.role]="'navigation'"
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()">
        
        <!-- Logo y nombre de la app -->
        <div class="sidebar-header">
          <div class="logo-section">
            <mat-icon class="logo-icon">pets</mat-icon>
            <h2 class="app-name">VetPlus</h2>
          </div>
        </div>

        <!-- Información del usuario -->
        <div class="user-info">
          <div class="user-avatar">
            <mat-icon>person</mat-icon>
          </div>
          <div class="user-details">
            <p class="user-name">{{ authService.getCurrentUserName() }}</p>
            <p class="user-role">{{ authService.getCurrentUserRole() }}</p>
          </div>
        </div>

        <!-- Menú de navegación -->
        <mat-nav-list class="nav-list">
          @for (item of filteredMenuItems(); track item.route) {
            <a mat-list-item 
               [routerLink]="item.route"
               routerLinkActive="active-link"
               class="nav-item">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.badge && item.badge > 0) {
                <span matListItemMeta>
                  <span matBadge="{{ item.badge }}" matBadgeColor="warn" matBadgeSize="small"></span>
                </span>
              }
            </a>
          }
        </mat-nav-list>

        <!-- Footer del sidebar -->
        <div class="sidebar-footer">
          <button mat-button (click)="authService.toggleTheme()" class="theme-button">
            <mat-icon>palette</mat-icon>
            <span>Cambiar tema</span>
          </button>
        </div>
      </mat-sidenav>

      <!-- Contenido principal -->
      <mat-sidenav-content>
        <!-- Toolbar superior -->
        <mat-toolbar color="primary" class="main-toolbar">
          <!-- Botón de menú para móvil -->
          <button
            type="button"
            aria-label="Toggle sidenav"
            mat-icon-button
            (click)="drawer.toggle()"
            *ngIf="isMobile()">
            <mat-icon>menu</mat-icon>
          </button>

          <!-- Breadcrumb o título de página -->
          <span class="page-title">{{ getCurrentPageTitle() }}</span>
          
          <span class="spacer"></span>

          <!-- Notificaciones -->
          <app-notifications></app-notifications>

          <!-- Menú de usuario -->
          <button mat-icon-button [matMenuTriggerFor]="userMenu" [matTooltip]="'Opciones de usuario'">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu" xPosition="before">
            <div class="user-menu-header">
              <p class="user-menu-name">{{ authService.getCurrentUserName() }}</p>
              <p class="user-menu-email">{{ authService.getCurrentUserEmail() }}</p>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="goToProfile()">
              <mat-icon>person</mat-icon>
              <span>Mi perfil</span>
            </button>
            <button mat-menu-item (click)="goToSettings()">
              <mat-icon>settings</mat-icon>
              <span>Configuración</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()" class="logout-item">
              <mat-icon>logout</mat-icon>
              <span>Cerrar sesión</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Contenido de la página -->
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100%;
    }

    .sidenav {
      width: 280px;
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }

    .sidebar-header {
      padding: 24px 16px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #2e7d32;
    }

    .app-name {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: #2e7d32;
    }

    .user-info {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #2e7d32;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .user-details {
      flex: 1;
    }

    .user-name {
      margin: 0;
      font-weight: 500;
      font-size: 14px;
      color: #333;
    }

    .user-role {
      margin: 0;
      font-size: 12px;
      color: #666;
    }

    .nav-list {
      padding: 8px 0;
    }

    .nav-item {
      margin: 4px 16px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background-color: rgba(46, 125, 50, 0.1);
    }

    .active-link {
      background-color: rgba(46, 125, 50, 0.15) !important;
      color: #2e7d32 !important;
    }

    .sidebar-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .theme-button {
      width: 100%;
      justify-content: flex-start;
      gap: 12px;
    }

    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .page-title {
      font-size: 18px;
      font-weight: 500;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .main-content {
      padding: 24px;
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }

    .user-menu-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .user-menu-name {
      margin: 0;
      font-weight: 500;
      font-size: 14px;
    }

    .user-menu-email {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #666;
    }

    .logout-item {
      color: #f44336 !important;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidenav {
        width: 100%;
      }

      .main-content {
        padding: 16px;
      }

      .page-title {
        font-size: 16px;
      }
    }

    /* Dark theme */
    .dark-theme .sidenav {
      background: #1e1e1e;
      border-right-color: #333;
    }

    .dark-theme .user-info,
    .dark-theme .sidebar-header,
    .dark-theme .sidebar-footer {
      border-color: #333;
    }

    .dark-theme .user-name {
      color: #fff;
    }

    .dark-theme .main-content {
      background: #121212;
    }
  `]
})
export class MainLayoutComponent {
  isMobile = signal(false);
  notificationCount = signal(3);

  private readonly menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: ['admin', 'vet', 'aux']
    },
    {
      label: 'Pacientes',
      icon: 'pets',
      route: '/pacientes',
      roles: ['admin', 'vet', 'aux']
    },
    {
      label: 'Citas',
      icon: 'event',
      route: '/citas',
      roles: ['admin', 'vet', 'aux'],
      badge: 5
    },
    {
      label: 'Historia Clínica',
      icon: 'assignment',
      route: '/historia-clinica',
      roles: ['admin', 'vet']
    },
    {
      label: 'Inventario',
      icon: 'inventory',
      route: '/inventario',
      roles: ['admin', 'aux']
    },
    {
      label: 'Facturación',
      icon: 'receipt',
      route: '/facturacion',
      roles: ['admin', 'aux']
    },
    {
      label: 'Reportes',
      icon: 'analytics',
      route: '/reportes',
      roles: ['admin']
    },
    {
      label: 'Usuarios',
      icon: 'people',
      route: '/usuarios',
      roles: ['admin']
    },
    {
      label: 'Configuración',
      icon: 'settings',
      route: '/configuracion',
      roles: ['admin']
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  filteredMenuItems() {
    return this.menuItems.filter(item => 
      this.authService.hasAnyRole(item.roles)
    );
  }

  getCurrentPageTitle(): string {
    const currentRoute = this.router.url;
    const menuItem = this.menuItems.find(item => 
      currentRoute.startsWith(item.route)
    );
    return menuItem?.label || 'VetPlus';
  }

  goToProfile(): void {
    this.router.navigate(['/perfil']);
  }

  goToSettings(): void {
    this.router.navigate(['/configuracion']);
  }

  logout(): void {
    this.authService.logout();
  }

  private checkScreenSize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }
}