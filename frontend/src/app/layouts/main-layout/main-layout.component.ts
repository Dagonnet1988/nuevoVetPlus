import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule, MatSidenavContainer } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationsComponent } from '../../shared/components/notifications/notifications.component';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: ('admin' | 'vet' | 'aux')[];
  badge?: number;
}

const SIDEBAR_KEY = 'vetplus_sidebar_collapsed';

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
        [class.collapsed]="collapsed() && !isMobile()"
        fixedInViewport="true"
        [attr.role]="'navigation'"
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()">

        <!-- Header: logo + toggle -->
        <div class="sidebar-header">
          <div class="logo-section">
            <mat-icon class="logo-icon">pets</mat-icon>
            @if (!collapsed() || isMobile()) {
              <h2 class="app-name">VetPlus</h2>
            }
          </div>
          @if (!isMobile()) {
            <button mat-icon-button
                    class="collapse-btn"
                    (click)="toggleCollapse()"
                    [matTooltip]="collapsed() ? 'Expandir menú' : 'Colapsar menú'">
              <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
            </button>
          }
        </div>

        <!-- Info de usuario -->
        @if (!collapsed() || isMobile()) {
          <div class="user-info">
            <div class="user-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <div class="user-details">
              <p class="user-name">{{ authService.getCurrentUserName() }}</p>
              <p class="user-role">{{ authService.getCurrentUserRole() }}</p>
            </div>
          </div>
        } @else {
          <div class="user-info-collapsed">
            <div class="user-avatar" [matTooltip]="authService.getCurrentUserName()">
              <mat-icon>person</mat-icon>
            </div>
          </div>
        }

        <!-- Menú de navegación -->
        <mat-nav-list class="nav-list">
          @for (item of filteredMenuItems(); track item.route) {
            <a mat-list-item
               [routerLink]="item.route"
               routerLinkActive="active-link"
               class="nav-item"
               [class.nav-item-collapsed]="collapsed() && !isMobile()"
               [matTooltip]="collapsed() && !isMobile() ? item.label : ''"
               matTooltipPosition="right">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              @if (!collapsed() || isMobile()) {
                <span matListItemTitle>{{ item.label }}</span>
              }
              @if ((!collapsed() || isMobile()) && item.badge && item.badge > 0) {
                <span matListItemMeta>
                  <span matBadge="{{ item.badge }}" matBadgeColor="warn" matBadgeSize="small"></span>
                </span>
              }
            </a>
          }
        </mat-nav-list>

        <!-- Footer del sidebar -->
        <div class="sidebar-footer" [class.footer-collapsed]="collapsed() && !isMobile()">
          <button mat-icon-button
                  (click)="authService.toggleTheme()"
                  [matTooltip]="collapsed() && !isMobile() ? 'Cambiar tema' : ''"
                  matTooltipPosition="right"
                  class="theme-btn-icon">
            <mat-icon>palette</mat-icon>
          </button>
          @if (!collapsed() || isMobile()) {
            <span class="theme-label">Cambiar tema</span>
          }
        </div>
      </mat-sidenav>

      <!-- Contenido principal -->
      <mat-sidenav-content>
        <!-- Toolbar superior -->
        <mat-toolbar color="primary" class="main-toolbar">
          <!-- Botón de menú para móvil -->
          @if (isMobile()) {
            <button type="button" aria-label="Toggle sidenav" mat-icon-button (click)="drawer.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <span class="page-title">{{ getCurrentPageTitle() }}</span>
          <span class="spacer"></span>

          <app-notifications></app-notifications>

          <button mat-icon-button
                  [matMenuTriggerFor]="userMenu"
                  [matTooltip]="'Opciones de usuario'"
                  type="button"
                  (click)="openUserMenu()"
                  aria-label="Abrir menú de usuario">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu" xPosition="before" class="user-dropdown-menu"
                    [hasBackdrop]="true"
                    [overlapTrigger]="false">
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

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100%; }

    /* Animar el contenido cuando el sidebar cambia de tamaño */
    mat-sidenav-content { transition: margin-left 0.25s ease !important; }

    /* ── Sidebar base ── */
    .sidenav {
      width: 280px;
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
      transition: width 0.25s ease;
      overflow-x: hidden;
    }

    .sidenav.collapsed {
      width: 64px;
    }

    /* ── Header ── */
    .sidebar-header {
      padding: 16px 12px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      flex: 1;
    }

    .logo-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #2e7d32;
      flex-shrink: 0;
    }

    .app-name {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2e7d32;
      white-space: nowrap;
    }

    .collapse-btn {
      flex-shrink: 0;
      color: #666;
    }

    /* ── User info expanded ── */
    .user-info {
      padding: 14px 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-info-collapsed {
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: center;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #2e7d32;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
      cursor: default;
    }

    .user-details { flex: 1; overflow: hidden; }

    .user-name {
      margin: 0;
      font-weight: 500;
      font-size: 13px;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      margin: 0;
      font-size: 11px;
      color: #666;
      white-space: nowrap;
    }

    /* ── Nav list ── */
    .nav-list { padding: 8px 0; }

    .nav-item {
      margin: 2px 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .nav-item:hover { background-color: rgba(46, 125, 50, 0.1); }

    .nav-item-collapsed {
      margin: 2px 4px;
      justify-content: center;
    }

    .active-link {
      background-color: rgba(46, 125, 50, 0.15) !important;
      color: #2e7d32 !important;
    }

    /* ── Footer ── */
    .sidebar-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-collapsed {
      justify-content: center;
      padding: 12px 0;
    }

    .theme-btn-icon { color: #666; flex-shrink: 0; }

    .theme-label {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
    }

    /* ── Toolbar ── */
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .page-title { font-size: 18px; font-weight: 500; }
    .spacer { flex: 1 1 auto; }

    .main-content {
      padding: 24px;
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }

    /* ── Menú usuario ── */
    .user-menu-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .user-menu-name { margin: 0; font-weight: 500; font-size: 14px; }
    .user-menu-email { margin: 4px 0 0 0; font-size: 12px; color: #666; }
    .logout-item { color: #f44336 !important; }

    ::ng-deep .user-dropdown-menu { z-index: 9999 !important; }
    ::ng-deep .cdk-overlay-pane { z-index: 9999 !important; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .sidenav { width: 100%; }
      .main-content { padding: 16px; }
      .page-title { font-size: 16px; }
    }

    /* ── Dark theme ── */
    .dark-theme .sidenav { background: #1e1e1e; border-right-color: #333; }
    .dark-theme .user-info,
    .dark-theme .user-info-collapsed,
    .dark-theme .sidebar-header,
    .dark-theme .sidebar-footer { border-color: #333; }
    .dark-theme .user-name { color: #fff; }
    .dark-theme .main-content { background: #121212; }
  `]
})
export class MainLayoutComponent {
  @ViewChild(MatMenuTrigger) userMenuTrigger!: MatMenuTrigger;
  @ViewChild(MatSidenavContainer) sidenavContainer!: MatSidenavContainer;

  isMobile = signal(false);
  notificationCount = signal(3);
  collapsed = signal<boolean>(localStorage.getItem(SIDEBAR_KEY) === 'true');

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
      label: 'Propietarios',
      icon: 'people',
      route: '/propietarios',
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
    },
    {
      label: 'Auditoría',
      icon: 'security',
      route: '/auditoria',
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

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
    // Notificar a mat-sidenav-container para que recalcule el margen del contenido
    // Esperar a que termine la transición CSS (250ms) y luego recalcular márgenes
    setTimeout(() => this.sidenavContainer?.updateContentMargins(), 260);
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

  goToProfile(): void { this.router.navigate(['/perfil']); }
  goToSettings(): void { this.router.navigate(['/configuracion']); }
  logout(): void { this.authService.logout(); }

  openUserMenu(): void {
    if (this.userMenuTrigger) this.userMenuTrigger.openMenu();
  }

  private checkScreenSize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }
}

