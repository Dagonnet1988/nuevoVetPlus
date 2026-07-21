import { Component, signal, ViewChild, OnDestroy } from '@angular/core';
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
import { CitasService } from '../../services/citas.service';
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
              <img src="logo.svg" alt="Logo VetPlus" class="logo-img logo-img-fallback" />
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
          <button
                  class="sidebar-user-chip"
                  [class.sidebar-user-chip-compact]="collapsed() && !isMobile()"
                  [matMenuTriggerFor]="userMenu"
                  [matTooltip]="collapsed() && !isMobile() ? 'Opciones de usuario' : ''"
                  matTooltipPosition="right"
                  type="button"
                  aria-label="Abrir menú de usuario">
            <span class="toolbar-user-main">
              <span class="toolbar-avatar-wrap">
                @if (authService.getCurrentUserAvatar()) {
                  <img [src]="authService.getCurrentUserAvatar()" [alt]="authService.getCurrentUserName()" class="toolbar-avatar" />
                } @else {
                  <span class="toolbar-avatar-fallback">{{ getCurrentUserInitials() }}</span>
                }
              </span>
              @if ((!collapsed() || isMobile())) {
                <span class="toolbar-user-text">
                  <span class="toolbar-user-name">{{ authService.getCurrentUserName() }}</span>
                  <span class="toolbar-user-role">{{ authService.getCurrentUserRole() }}</span>
                </span>
              }
            </span>
            @if ((!collapsed() || isMobile())) {
              <mat-icon class="toolbar-user-arrow">expand_more</mat-icon>
            }
          </button>

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

        <footer class="app-footer-mini" aria-label="Información de la aplicación">
          <div class="app-footer-mini-left">
            <span>{{ empresaNombre() }} © {{ currentYear }}</span>
            <span class="footer-separator">•</span>
            <span>v{{ appVersion }}</span>
            @if (!environment.production) {
              <span class="env-pill">DEV</span>
            }
          </div>

          <div class="app-footer-mini-right">
            <a class="footer-link-inline" href="mailto:contacto@dadev.co">Soporte</a>
          </div>
        </footer>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100%; }

    /* Animar el contenido cuando el sidebar cambia de tamaño */
    mat-sidenav-content {
      transition: margin-left 0.25s ease !important;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ── Sidebar base ── */
    .sidenav {
      width: 280px;
      background: var(--vp-surface);
      border-right: 1px solid var(--vp-border);
      transition: width 0.25s ease;
      overflow-x: hidden;
    }

    .sidenav.collapsed {
      width: 64px;
    }

    /* ── Header ── */
    .sidebar-header {
      padding: 16px 12px;
      border-bottom: 1px solid var(--vp-border);
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

    .logo-img-fallback {
      object-fit: contain;
      padding: 6px;
      border-radius: 10px;
      border: 1px solid rgba(46, 125, 50, 0.25);
      background: #f5fbf5;
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
      color: var(--vp-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-slogan {
      margin: 2px 0 0 0;
      font-size: 11px;
      line-height: 1.2;
      color: var(--vp-text-secondary);
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
    .nav-list {
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .nav-item {
      margin: 2px 8px;
      border-radius: 8px;
      transition: background 0.2s;
      width: fit-content;
      max-width: calc(100% - 16px);
      padding-right: 14px;
    }

    ::ng-deep .nav-item.mdc-list-item {
      width: fit-content;
      max-width: calc(100% - 16px);
    }

    .nav-item:hover { background-color: rgba(46, 125, 50, 0.1); }

    .nav-item-collapsed {
      width: 44px;
      min-height: 44px;
      margin: 4px auto;
      padding: 0 !important;
      border-radius: 12px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center !important;
      --mdc-list-list-item-leading-icon-start-space: 0px;
      --mdc-list-list-item-leading-icon-end-space: 0px;
      --mdc-list-list-item-one-line-container-height: 44px;
    }

    ::ng-deep .nav-item-collapsed.mdc-list-item {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    ::ng-deep .nav-item-collapsed .mdc-list-item__start {
      margin-inline-start: 0 !important;
      margin-inline-end: 0 !important;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    ::ng-deep .nav-item-collapsed .mdc-list-item__content {
      display: none !important;
    }

    ::ng-deep .nav-item-collapsed .mat-mdc-list-item-icon {
      margin: 0 !important;
    }

    .active-link {
      background-color: rgba(46, 125, 50, 0.15) !important;
      color: var(--vp-primary) !important;
    }

    .sidenav.collapsed .nav-list {
      align-items: center;
    }

    .sidenav.collapsed .nav-item,
    .sidenav.collapsed ::ng-deep .nav-item.mdc-list-item {
      width: 44px;
      max-width: 44px;
      padding-right: 0 !important;
    }

    .sidenav.collapsed .nav-item.active-link {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Footer ── */
    .sidebar-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      border-top: 1px solid var(--vp-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar-user-chip {
      height: 36px;
      min-width: 0;
      width: 100%;
      padding: 0 8px;
      border-radius: 12px;
      border: 1px solid var(--vp-border);
      background: var(--vp-surface);
      color: var(--vp-text-primary);
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      overflow: hidden;
    }

    .sidebar-user-chip-compact {
      width: 36px;
      padding: 0;
      justify-content: center;
    }

    .footer-collapsed {
      justify-content: center;
      padding: 12px 0;
      flex-direction: column;
    }

    /* ── Toolbar ── */
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
      flex: 1;
      padding: 24px;
      background: var(--vp-page-bg);
    }

    .app-footer-mini {
      height: 32px;
      padding: 0 16px;
      border-top: 1px solid var(--vp-border);
      background: var(--vp-surface);
      color: var(--vp-text-secondary);
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .app-footer-mini-left,
    .app-footer-mini-right {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .footer-separator {
      opacity: 0.55;
    }

    .env-pill {
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 10px;
    }

    .footer-link-inline {
      color: var(--vp-link);
      text-decoration: none;
      font-weight: 600;
    }

    .footer-link-inline:hover {
      color: var(--vp-link-hover);
      text-decoration: underline;
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
      .app-footer-mini { display: none; }
      .page-title { font-size: 16px; }
    }

  `]
})
export class MainLayoutComponent implements OnDestroy {
  @ViewChild(MatMenuTrigger) userMenuTrigger!: MatMenuTrigger;
  @ViewChild(MatSidenavContainer) sidenavContainer!: MatSidenavContainer;

  isMobile = signal(false);
  notificationCount = signal(3);
  collapsed = signal<boolean>(localStorage.getItem(SIDEBAR_KEY) === 'true');

  // Empresa signals (computed from ConfiguracionService)
  empresaNombre = signal<string>('VetPlus');
  empresaEslogan = signal<string>('');
  empresaLogoUrl = signal<string>('');
  readonly environment = environment;
  readonly appVersion = environment.version;
  readonly currentYear = new Date().getFullYear();
  private googleSyncMonitorTimer: ReturnType<typeof setInterval> | null = null;
  private googleReauthAlertShown = false;

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
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService,
    private citasService: CitasService
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    this.loadEmpresaData();
    this.startGoogleSyncMonitor();
  }

  private startGoogleSyncMonitor(): void {
    // Solo en área autenticada de app clínica
    if (!this.authService.hasAnyRole(['admin', 'vet', 'aux'])) {
      return;
    }

    this.checkGoogleSyncHealth();

    this.googleSyncMonitorTimer = setInterval(() => {
      this.checkGoogleSyncHealth();
    }, 120000);
  }

  private checkGoogleSyncHealth(): void {
    this.citasService.getSyncStatus().subscribe({
      next: (response) => {
        const authIssue = response?.data?.google_auth;
        const requiresReauth = authIssue?.requires_reauth === true;

        if (!requiresReauth) {
          this.googleReauthAlertShown = false;
          return;
        }

        if (this.googleReauthAlertShown) {
          return;
        }
        this.googleReauthAlertShown = true;

        if (this.authService.isAdmin()) {
          const goNow = window.confirm(
            'La sincronización automática con Google Calendar falló por autorización vencida o revocada.\n\n¿Deseas ir ahora a reautorizar Google Calendar?'
          );

          if (goNow) {
            this.router.navigate(['/configuracion/google-calendar']);
          }
          return;
        }

        window.alert(
          'La sincronización automática con Google Calendar requiere reautorización.\n\nPor favor contacta a un administrador para reautorizar la integración.'
        );
      },
      error: () => {
        // Evitar ruido de red en layout; el monitor reintentará en el siguiente ciclo.
      }
    });
  }

  ngOnDestroy(): void {
    if (this.googleSyncMonitorTimer) {
      clearInterval(this.googleSyncMonitorTimer);
      this.googleSyncMonitorTimer = null;
    }
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
    if (!cfg) {
      this.empresaNombre.set('VetPlus');
      this.empresaEslogan.set('');
      this.empresaLogoUrl.set('');
      return;
    }

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

