import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface PublicTenant {
  slug: string;
  nombre: string;
  logo_url: string | null;
  has_logo: boolean;
}

interface TenantDirectoryResponse {
  success: boolean;
  data: {
    total: number;
    tenants: PublicTenant[];
  };
}

@Component({
  selector: 'app-tenant-home',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="tenant-home">
      <div class="ambient ambient-a"></div>
      <div class="ambient ambient-b"></div>

      <div class="hero-shell">
        <div class="hero">
          <p class="eyebrow">Plataforma de acceso</p>
          <h1>Bienvenido a Ramelo</h1>
          <p class="lead">
            Selecciona tu workspace para continuar al acceso seguro.
          </p>
          <div class="hero-badges">
            <span class="hero-badge">Acceso seguro</span>
            <span class="hero-badge">Directorio en tiempo real</span>
            <span class="hero-badge">Multiclínica</span>
          </div>
        </div>

        <aside class="hero-side-brand" aria-label="Marca Ramelo">
          <img src="brand/logo-full.svg" alt="Ramelo" class="hero-side-brand-logo" />
        </aside>
      </div>

      <div class="content-grid">
        <div class="workspace-column">
          <section class="directory-card">
            <header class="directory-header">
              <h2>Workspace</h2>
              <p class="directory-subtitle">Elige donde deseas ingresar.</p>
            </header>

            @if (loading()) {
              <div class="state-wrap">
                <mat-spinner diameter="34"></mat-spinner>
                <p>Cargando directorio de clínicas...</p>
              </div>
            } @else if (errorMessage()) {
              <div class="state-wrap error">
                <p>{{ errorMessage() }}</p>
              </div>
            } @else if (!tenants().length) {
              <div class="state-wrap">
                <p>No hay workspaces disponibles para mostrar en este momento.</p>
              </div>
            } @else {
              <div class="tenant-grid" [class.tenant-grid-sparse]="tenants().length <= 2">
                @for (tenant of tenants(); track tenant.slug) {
                  <button class="tenant-item" type="button" (click)="goToTenant(tenant.slug)">
                    <div class="logo-wrap">
                      @if (tenant.logo_url) {
                        <img [src]="tenant.logo_url" [alt]="tenant.nombre" loading="lazy" />
                      } @else {
                        <span class="logo-fallback">{{ getInitials(tenant.nombre) }}</span>
                      }
                    </div>
                    <div class="tenant-meta">
                      <h3>{{ tenant.nombre }}</h3>
                      <p>{{ tenant.slug }}.{{ rootDomain }}</p>
                    </div>
                  </button>
                }
              </div>
            }
          </section>
        </div>

        <aside class="access-card" aria-label="Guía de acceso">
          <h3>Cómo ingresar</h3>
          <ol>
            <li>Selecciona tu workspace en la lista.</li>
            <li>Serás redirigido al login seguro de tu clínica.</li>
            <li>Inicia sesión con tus credenciales habituales.</li>
          </ol>
        </aside>
      </div>

      <footer class="tenant-footer">
        <div class="footer-inner">
          <div class="footer-da">
            <img src="brand/da-logo.png" alt="DA Developments" class="footer-da-logo" />
            <p class="footer-da-line">
              <span>D.A. developments</span>
              <span>Desarrollo web</span>
              <span>Soporte y mantenimiento</span>
              <a class="footer-da-link" href="mailto:contacto@dadev.com">contacto@dadev.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background:
        radial-gradient(circle at 10% 10%, rgba(34, 197, 94, 0.18), transparent 40%),
        radial-gradient(circle at 85% 5%, rgba(14, 165, 233, 0.18), transparent 42%),
        linear-gradient(155deg, #f7fbf8 0%, #eff8ff 100%);
      color: #0f172a;
    }

    .tenant-home {
      max-width: 1080px;
      margin: 0 auto;
      padding: 56px 20px 120px;
      position: relative;
      z-index: 1;
    }

    .ambient {
      position: fixed;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(30px);
      opacity: 0.5;
      z-index: 0;
      animation: drift 12s ease-in-out infinite;
    }

    .ambient-a {
      width: 260px;
      height: 260px;
      top: -60px;
      left: -40px;
      background: rgba(34, 197, 94, 0.26);
    }

    .ambient-b {
      width: 300px;
      height: 300px;
      right: -70px;
      bottom: 30px;
      background: rgba(14, 165, 233, 0.24);
      animation-delay: -4s;
    }

    .hero {
      margin-bottom: 0;
      animation: fadeUp 0.6s ease-out both;
    }

    .hero-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.9fr) minmax(250px, 1fr);
      gap: 16px;
      align-items: start;
      margin-bottom: 50px;
    }

    .hero-side-brand {
      margin: 0;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 24px rgba(2, 6, 23, 0.06);
      backdrop-filter: blur(8px);
      animation: fadeUp 0.65s ease-out both;
    }

    .hero-side-brand-logo {
      width: 100%;
      max-width: 520px;
      height: auto;
      display: block;
    }

    .eyebrow {
      margin: 0;
      color: #0f766e;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-weight: 700;
    }

    .hero h1 {
      margin: 10px 0 8px;
      font-size: clamp(30px, 4.8vw, 46px);
      line-height: 1.08;
      color: #064e3b;
    }

    .lead {
      margin: 0;
      color: #334155;
      font-size: 16px;
      max-width: 680px;
    }

    .hero-badges {
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #bbf7d0;
      background: rgba(240, 253, 244, 0.9);
      color: #166534;
      font-size: 12px;
      font-weight: 600;
      border-radius: 999px;
      padding: 6px 10px;
    }

    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.9fr) minmax(250px, 1fr);
      gap: 16px;
      align-items: start;
    }

    .workspace-column {
      min-width: 0;
    }

    .directory-card {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.08);
      backdrop-filter: blur(8px);
      animation: fadeUp 0.7s ease-out both;
      animation-delay: 0.08s;
    }

    .directory-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .directory-header h2 {
      margin: 0 0 2px;
      font-size: 22px;
      color: #0f172a;
    }

    .directory-subtitle {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }

    .tenant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }

    .tenant-grid-sparse {
      grid-template-columns: repeat(auto-fit, minmax(300px, 360px));
      justify-content: start;
    }

    .tenant-item {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      text-align: left;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      animation: fadeUp 0.45s ease-out both;
      min-height: 86px;
    }

    .tenant-item:hover {
      transform: translateY(-2px);
      border-color: #86efac;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.11);
    }

    .logo-wrap {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: #f1f5f9;
      flex-shrink: 0;
      border: 1px solid #e2e8f0;
    }

    .logo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .logo-fallback {
      font-size: 16px;
      font-weight: 700;
      color: #0f766e;
    }

    .tenant-meta h3 {
      margin: 0;
      font-size: 15px;
      color: #0f172a;
      line-height: 1.25;
    }

    .tenant-meta p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #64748b;
    }

    .state-wrap {
      min-height: 160px;
      display: grid;
      place-items: center;
      text-align: center;
      color: #475569;
      gap: 10px;
      padding: 8px;
    }

    .state-wrap.error {
      color: #b91c1c;
    }

    .access-card {
      background: linear-gradient(160deg, #ffffff, #f0fdf4);
      border: 1px solid #d1fae5;
      color: #0f172a;
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 16px 34px rgba(2, 6, 23, 0.08);
      animation: fadeUp 0.8s ease-out both;
      animation-delay: 0.12s;
    }

    .access-card h3 {
      margin: 0 0 12px;
      font-size: 18px;
      color: #065f46;
    }

    .access-card ol {
      margin: 0;
      padding-left: 18px;
      color: #1f2937;
      display: grid;
      gap: 8px;
      font-size: 14px;
      line-height: 1.45;
    }

    .access-note {
      margin: 12px 0 0;
      font-size: 12px;
      line-height: 1.4;
      color: #334155;
    }

    .tenant-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      background: rgba(255, 255, 255, 0.88);
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(10px);
      padding: 10px 14px;
      animation: fadeUp 0.8s ease-out both;
      animation-delay: 0.14s;
    }

    .footer-inner {
      max-width: 1080px;
      margin: 0 auto;
    }

    .footer-da {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-da-logo {
      width: 46px;
      height: 46px;
      object-fit: contain;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 4px;
    }

    .footer-da-line {
      margin: 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      color: #475569;
      font-size: 12px;
    }

    .footer-da-line span::after {
      content: '•';
      margin-left: 10px;
      color: #94a3b8;
    }

    .footer-da-line span:last-of-type::after {
      content: '';
      margin: 0;
    }

    .footer-da-link {
      color: #0f766e;
      font-weight: 600;
      text-decoration: none;
    }

    .footer-da-link:hover {
      text-decoration: underline;
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes drift {
      0%, 100% {
        transform: translateY(0px) scale(1);
      }
      50% {
        transform: translateY(-14px) scale(1.04);
      }
    }

    @media (max-width: 700px) {
      .tenant-home {
        padding: 28px 14px 130px;
      }

      .hero-shell,
      .content-grid {
        grid-template-columns: 1fr;
      }

      .hero-shell {
        margin-bottom: 20px;
      }

      .directory-card {
        padding: 14px;
      }

      .directory-header {
        margin-bottom: 12px;
      }

      .tenant-grid,
      .tenant-grid-sparse {
        grid-template-columns: 1fr;
      }

      .footer-da {
        flex-direction: column;
        align-items: flex-start;
      }

      .footer-da-line {
        gap: 6px;
      }

      .footer-da-line span::after {
        margin-left: 6px;
      }
    }
  `]
})
export class TenantHomeComponent implements OnInit {
  readonly rootDomain = environment.rootDomain;
  readonly tenants = signal<PublicTenant[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.isTenantSubdomainHost()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDirectory();
  }

  getInitials(nombre: string): string {
    const parts = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  goToTenant(slug: string): void {
    const protocol = window.location.protocol || 'https:';
    const target = `${protocol}//${slug}.${this.rootDomain}/login`;
    window.location.href = target;
  }

  private loadDirectory(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<TenantDirectoryResponse>(`${environment.apiUrl}/public/tenants`).subscribe({
      next: (response) => {
        const tenants = response?.data?.tenants || [];
        this.tenants.set(tenants);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el directorio de clínicas. Inténtalo de nuevo en unos minutos.');
        this.loading.set(false);
      }
    });
  }

  private isTenantSubdomainHost(): boolean {
    const hostname = window.location.hostname.toLowerCase();
    const root = String(this.rootDomain || '').toLowerCase();

    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    if (isLocal || !root) return false;

    const isRootHost = hostname === root || hostname === `www.${root}`;
    if (isRootHost) return false;

    return hostname.endsWith(`.${root}`);
  }
}
