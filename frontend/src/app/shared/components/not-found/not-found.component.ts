import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <!-- Error Icon -->
        <div class="error-icon">
          <mat-icon>error_outline</mat-icon>
        </div>

        <!-- Error Message -->
        <h1 class="error-title">404 - Página no encontrada</h1>
        <p class="error-message">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <!-- Actions -->
        <div class="error-actions">
          <button mat-raised-button
                  color="primary"
                  routerLink="/dashboard"
                  class="action-button">
            <mat-icon>home</mat-icon>
            Ir al Dashboard
          </button>

          <button mat-button
                  (click)="goBack()"
                  class="action-button">
            <mat-icon>arrow_back</mat-icon>
            Volver Atrás
          </button>
        </div>

        <!-- Additional Info -->
        <div class="help-section">
          <h3>¿Necesitas ayuda?</h3>
          <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
      padding: 24px;
    }

    .not-found-content {
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .error-icon {
      margin-bottom: 24px;
    }

    .error-icon mat-icon {
      font-size: 96px;
      width: 96px;
      height: 96px;
      color: #ff5722;
    }

    .error-title {
      font-size: 32px;
      font-weight: 400;
      color: #333;
      margin: 0 0 16px 0;
    }

    .error-message {
      font-size: 16px;
      color: #666;
      margin: 0 0 32px 0;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 140px;
    }

    .help-section {
      background: rgba(255, 255, 255, 0.8);
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid #2e7d32;
    }

    .help-section h3 {
      margin: 0 0 8px 0;
      color: #2e7d32;
      font-size: 18px;
    }

    .help-section p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .not-found-container {
        padding: 16px;
      }

      .error-icon mat-icon {
        font-size: 72px;
        width: 72px;
        height: 72px;
      }

      .error-title {
        font-size: 24px;
      }

      .error-actions {
        flex-direction: column;
        align-items: center;
      }

      .action-button {
        width: 100%;
        max-width: 200px;
      }

      .help-section {
        padding: 16px;
      }
    }
  `]
})
export class NotFoundComponent {

  goBack(): void {
    window.history.back();
  }
}
