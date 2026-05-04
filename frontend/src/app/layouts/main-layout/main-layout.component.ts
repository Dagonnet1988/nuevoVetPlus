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
import { ConfiguracionService } from '../../services/configuracion.service';
import { environment } from '../../../environments/environment';

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
    MatTooltipModule
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
          <div class="logo-section" [class.logo-section-collapsed]="collapsed() && !isMobile()">
            @if (empresaLogoUrl()) {
              <img [src]="empresaLogoUrl()" alt="Logo" class="logo-img" />
            } @else {
              <mat-icon class="logo-icon">pets</mat-icon>
            }
            @if (!collapsed() || isMobile()) {
              <div class="brand-text">
                <h2 class="app-name">{{ empresaNombre() }}</h2>
                @if (empresaEslogan()) {
                  <p class="app-slogan">{{ empresaEslogan() }}</p>
                }
              </div>
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
        <div class="top-user-strip">
          <button
                  class="toolbar-user-chip"
                  [class.toolbar-user-chip-compact]="isMobile()"
                  [matMenuTriggerFor]="userMenu"
                  [matTooltip]="'Opciones de usuario'"
                  type="button"
                  (click)="openUserMenu()"
                  aria-label="Abrir menú de usuario">
            <span class="toolbar-user-main">
              <span class="toolbar-avatar-wrap">
                @if (authService.getCurrentUserAvatar()) {
                  <img [src]="authService.getCurrentUserAvatar()" [alt]="authService.getCurrentUserName()" class="toolbar-avatar" />
                } @else {
                  <span class="toolbar-avatar-fallback">{{ getCurrentUserInitials() }}</span>
                }
              </span>
              @if (!isMobile()) {
                <span class="toolbar-user-text">
                  <span class="toolbar-user-name">{{ authService.getCurrentUserName() }}</span>
                  <span class="toolbar-user-role">{{ authService.getCurrentUserRole() }}</span>
                </span>
              }
            </span>
            <mat-icon class="toolbar-user-arrow">expand_more</mat-icon>
          </button>
        </div>

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
        </mat-toolbar>

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
      position: relative;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      flex: 1;
    }

    .logo-section-collapsed {
      justify-content: center;
      gap: 0;
      padding-right: 0;
      padding-top: 18px;
    }

    .logo-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #2e7d32;
      flex-shrink: 0;
    }

    .logo-img {
      width: 44px;
      height: 44px;
      object-fit: cover;
      flex-shrink: 0;
      border-radius: 10px;
      border: 1px solid rgba(46, 125, 50, 0.2);
      background: #fff;
    }

    .sidenav.collapsed .logo-img {
      width: 38px;
      height: 38px;
    }

    .sidenav.collapsed .logo-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .brand-text {
      overflow: hidden;
      flex: 1;
      min-width: 0;
    }

    .app-name {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #2e7d32;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-slogan {
      margin: 2px 0 0 0;
      font-size: 11px;
      line-height: 1.2;
      color: #5f6368;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .collapse-btn {
      flex-shrink: 0;
      color: #666;
      z-index: 1;
    }

    .sidenav.collapsed .collapse-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 28px;
      height: 28px;
      line-height: 28px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(2px);
    }

    .sidenav.collapsed .sidebar-header {
      min-height: 86px;
      padding: 8px 8px 12px;
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
      overflow: hidden;
    }

    .user-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initials {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .toolbar-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .toolbar-user-chip {
      height: 40px;
      min-width: 170px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
    }

    .toolbar-user-main {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .toolbar-avatar-wrap {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.22);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toolbar-avatar-fallback {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .toolbar-user-text {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      line-height: 1.1;
    }

    .toolbar-user-name {
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 112px;
    }

    .toolbar-user-role {
      font-size: 10px;
      opacity: 0.85;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 112px;
    }

    .toolbar-user-arrow {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.9;
      flex-shrink: 0;
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

    .top-user-strip {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 8px 16px;
      background: linear-gradient(90deg, #0f3d68 0%, #155288 100%);
      border-bottom: 1px solid #0b2f4f;
    }

    .toolbar-user-chip {
      border-color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.24);
    }

    .toolbar-user-chip:hover {
      background: rgba(255, 255, 255, 0.34);
    }

    .page-title {
      font-size: 18px;
      font-weight: 500;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: min(48vw, 420px);
    }
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
      .top-user-strip {
        padding: 6px 10px;
      }
      .toolbar-user-chip {
        min-width: auto;
        width: 44px;
        height: 36px;
        padding: 0 4px;
        justify-content: center;
        gap: 4px;
      }
      .toolbar-user-chip-compact .toolbar-user-main {
        flex: 0 0 auto;
      }
      .toolbar-user-chip-compact .toolbar-user-arrow {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }
      .toolbar-user-chip-compact .toolbar-avatar-wrap,
      .toolbar-user-chip-compact .toolbar-avatar {
        width: 26px;
        height: 26px;
      }
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

  // Empresa signals (computed from ConfiguracionService)
  empresaNombre = signal<string>('VetPlus');
  empresaEslogan = signal<string>('');
  empresaLogoUrl = signal<string>('');

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
      icon: 'groups',
      route: '/propietarios',
      roles: ['admin', 'vet', 'aux']
    },
    {
      label: 'Citas',
      icon: 'event',
      route: '/citas',
      roles: ['admin', 'vet', 'aux']
    },
    {
      label: 'Historia Clínica',
      icon: 'assignment',
      route: '/historia-clinica',
      roles: ['admin', 'vet']
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
    private router: Router,
    private configuracionService: ConfiguracionService
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    this.loadEmpresaData();
  }

  private loadEmpresaData(): void {
    // Check cached signal first
    const cached = this.configuracionService.empresaConfig();
    if (cached) {
      this.applyEmpresaConfig(cached);
    } else {
      this.configuracionService.getEmpresaConfig().subscribe({
        next: (cfg) => this.applyEmpresaConfig(cfg),
        error: () => {} // Silently fallback to defaults
      });
    }
  }

  private applyEmpresaConfig(cfg: any): void {
    this.empresaNombre.set(cfg.nombre_empresa || 'VetPlus');
    this.empresaEslogan.set(cfg.eslogan || '');
    const logo = cfg.logo_url
      ? this.configuracionService.getAbsoluteAssetUrl(cfg.logo_url)
      : '';
    this.empresaLogoUrl.set(logo);
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

  goToProfile(): void {
    const userId = this.authService.currentUser()?.id_usuario;
    if (this.authService.hasAnyRole(['admin', 'vet'])) {
      this.router.navigate(['/perfil'], {
        queryParams: userId ? { id: userId } : undefined
      });
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  goToSettings(): void { this.router.navigate(['/configuracion']); }
  logout(): void { this.authService.logout(); }

  openUserMenu(): void {
    if (this.userMenuTrigger) this.userMenuTrigger.openMenu();
  }

  private checkScreenSize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  getCurrentUserInitials(): string {
    const user = this.authService.currentUser();
    const nombre = user?.nombre?.trim() || '';
    const apellido = user?.apellido?.trim() || '';
    const initials = `${nombre.charAt(0)}${apellido.charAt(0)}`.trim();
    return initials || 'VP';
  }
}

