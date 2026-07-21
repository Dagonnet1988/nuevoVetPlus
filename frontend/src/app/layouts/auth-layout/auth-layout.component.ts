import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <div class="auth-layout">
      <!-- Contenido principal de autenticación -->
      <main class="auth-main">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer con información adicional -->
      <footer class="auth-footer">
        <div class="footer-content">
          <div class="footer-da footer-da-left">
            <img src="DA logo.png" alt="DA Developments" class="footer-da-logo" />
            <p class="footer-da-line">
              <span>D.A. developments</span>
              <span>Desarrollo web</span>
              <span>Soporte y mantenimiento</span>
              <a class="footer-da-link" href="mailto:contacto@dadev.co">contacto@dadev.co</a>
            </p>
          </div>

          <div class="company-info">
            <p class="company-name">VetPlus - Sistema de Gestión Veterinaria</p>
            <p class="company-description">
              Solución integral para la administración de clínicas veterinarias
            </p>
          </div>

          <div class="footer-links">
            <button mat-button class="footer-link" [matTooltip]="'Contactar soporte técnico'">
              <mat-icon>support</mat-icon>
              Soporte
            </button>
            <button mat-button class="footer-link" [matTooltip]="'Ver documentación'">
              <mat-icon>help</mat-icon>
              Ayuda
            </button>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="copyright">© {{ currentYear }} VetPlus. Todos los derechos reservados.</p>
          <p class="version">Versión 1.0.0</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      background: linear-gradient(135deg, #e8f5e8 0%, #d9f0da 50%, #c8e6c9 100%);
    }

    .auth-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-height: calc(100vh - 200px);
    }

    .auth-footer {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(46, 125, 50, 0.2);
      box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.06);
      padding: 24px 16px 16px;
      margin-top: auto;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .company-info {
      flex: 1;
    }

    .company-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--vp-primary);
      margin: 0 0 8px 0;
    }

    .company-description {
      font-size: 14px;
      color: var(--vp-text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .footer-links {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .footer-da {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0;
      min-width: 0;
    }

    .footer-da-left {
      flex: 1;
      justify-content: flex-start;
    }

    .footer-da-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
      border: 1px solid #d9e7da;
      padding: 6px;
      flex-shrink: 0;
    }

    .footer-da-line {
      margin: 0;
      color: #244f7a;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
    }

    .footer-da-link {
      color: var(--vp-link);
      text-decoration: none;
      font-weight: 600;
    }

    .footer-da-link:hover {
      text-decoration: underline;
    }

    .footer-link {
      color: var(--vp-text-secondary) !important;
      font-size: 14px;
      min-width: auto;
      padding: 8px 12px;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .footer-link:hover {
      color: var(--vp-primary) !important;
      background-color: rgba(46, 125, 50, 0.1);
    }

    .footer-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .footer-bottom {
      max-width: 1200px;
      margin: 16px auto 0;
      padding-top: 16px;
      border-top: 1px solid rgba(46, 125, 50, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .copyright {
      font-size: 12px;
      color: #999;
      margin: 0;
    }

    .version {
      font-size: 12px;
      color: #999;
      margin: 0;
      font-family: monospace;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .auth-main {
        padding: 16px;
        min-height: calc(100vh - 160px);
      }

      .footer-content {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }

      .footer-links {
        justify-content: center;
        flex-wrap: wrap;
      }

      .footer-da {
        width: 100%;
        justify-content: center;
      }

      .footer-bottom {
        flex-direction: column;
        gap: 8px;
        text-align: center;
      }

    }

    @media (max-width: 480px) {
      .auth-footer {
        padding: 16px 12px 12px;
      }

      .company-name {
        font-size: 14px;
      }

      .company-description {
        font-size: 12px;
      }

      .footer-link {
        font-size: 12px;
        padding: 6px 8px;
      }

      .footer-da-line {
        text-align: center;
        align-items: center;
      }
    }
  `]
})
export class AuthLayoutComponent {
  currentYear = new Date().getFullYear();
}
