import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';

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
            <button mat-button 
                    (click)="authService.toggleTheme()" 
                    class="footer-link"
                    [matTooltip]="'Cambiar tema visual'">
              <mat-icon>palette</mat-icon>
              Tema
            </button>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p class="copyright">© 2024 VetPlus. Todos los derechos reservados.</p>
          <p class="version">Versión 1.0.0</p>
        </div>
      </footer>

      <!-- Indicador de tema actual -->
      <div class="theme-indicator">
        <mat-icon [matTooltip]="getThemeTooltip()">
          {{ getThemeIcon() }}
        </mat-icon>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 50%, #a5d6a7 100%);
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
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(46, 125, 50, 0.1);
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
      color: #2e7d32;
      margin: 0 0 8px 0;
    }

    .company-description {
      font-size: 14px;
      color: #666;
      margin: 0;
      line-height: 1.4;
    }

    .footer-links {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .footer-link {
      color: #666 !important;
      font-size: 14px;
      min-width: auto;
      padding: 8px 12px;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .footer-link:hover {
      color: #2e7d32 !important;
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

    .theme-indicator {
      position: fixed;
      top: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      color: #2e7d32;
      transition: all 0.3s ease;
    }

    .theme-indicator:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .theme-indicator mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Dark theme */
    .dark-theme .auth-layout {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1e1e1e 100%);
    }

    .dark-theme .auth-footer {
      background: rgba(30, 30, 30, 0.9);
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    .dark-theme .company-name {
      color: #81c784;
    }

    .dark-theme .company-description,
    .dark-theme .footer-link {
      color: #b3b3b3 !important;
    }

    .dark-theme .footer-link:hover {
      color: #81c784 !important;
      background-color: rgba(129, 199, 132, 0.1);
    }

    .dark-theme .footer-bottom {
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    .dark-theme .copyright,
    .dark-theme .version {
      color: #666;
    }

    .dark-theme .theme-indicator {
      background: rgba(30, 30, 30, 0.9);
      color: #81c784;
    }

    /* Blue theme */
    .blue-theme .auth-layout {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%);
    }

    .blue-theme .company-name {
      color: #1976d2;
    }

    .blue-theme .footer-link:hover {
      color: #1976d2 !important;
      background-color: rgba(25, 118, 210, 0.1);
    }

    .blue-theme .theme-indicator {
      color: #1976d2;
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

      .footer-bottom {
        flex-direction: column;
        gap: 8px;
        text-align: center;
      }

      .theme-indicator {
        top: 16px;
        right: 16px;
        width: 40px;
        height: 40px;
      }

      .theme-indicator mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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
    }
  `]
})
export class AuthLayoutComponent {

  constructor(public authService: AuthService) {}

  getThemeIcon(): string {
    const theme = this.authService.currentTheme();
    switch (theme) {
      case 'dark': return 'dark_mode';
      case 'blue': return 'water_drop';
      default: return 'wb_sunny';
    }
  }

  getThemeTooltip(): string {
    const theme = this.authService.currentTheme();
    switch (theme) {
      case 'dark': return 'Tema oscuro activo';
      case 'blue': return 'Tema azul activo';
      default: return 'Tema claro activo';
    }
  }
}