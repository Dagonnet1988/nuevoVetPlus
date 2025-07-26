import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { LoginRequest } from '../../core/models/auth.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="login-container">
      <div class="login-wrapper">
        <!-- Logo y título -->
        <div class="login-header">
          <div class="logo-container">
            <mat-icon class="logo-icon">pets</mat-icon>
          </div>
          <h1 class="app-title">VetPlus</h1>
          <p class="app-subtitle">Sistema de Gestión Veterinaria</p>
        </div>

        <!-- Formulario de login -->
        <mat-card class="login-card">
          <mat-card-header>
            <mat-card-title>Iniciar Sesión</mat-card-title>
            <mat-card-subtitle>Ingresa tus credenciales para acceder</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form">
              <!-- Email -->
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Correo electrónico</mat-label>
                <input matInput 
                       type="email" 
                       formControlName="email"
                       placeholder="usuario@ejemplo.com"
                       autocomplete="email">
                <mat-icon matSuffix>email</mat-icon>
                @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                  <mat-error>
                    @if (loginForm.get('email')?.errors?.['required']) {
                      El correo es requerido
                    }
                    @if (loginForm.get('email')?.errors?.['email']) {
                      Formato de correo inválido
                    }
                  </mat-error>
                }
              </mat-form-field>

              <!-- Password -->
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Contraseña</mat-label>
                <input matInput 
                       [type]="hidePassword() ? 'password' : 'text'" 
                       formControlName="password"
                       placeholder="Ingresa tu contraseña"
                       autocomplete="current-password">
                <button mat-icon-button 
                        matSuffix 
                        type="button"
                        (click)="togglePasswordVisibility()"
                        [attr.aria-label]="'Hide password'" 
                        [attr.aria-pressed]="hidePassword()">
                  <mat-icon>{{hidePassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                  <mat-error>
                    @if (loginForm.get('password')?.errors?.['required']) {
                      La contraseña es requerida
                    }
                    @if (loginForm.get('password')?.errors?.['minlength']) {
                      Mínimo 6 caracteres
                    }
                  </mat-error>
                }
              </mat-form-field>

              <!-- Botón de login -->
              <button mat-raised-button 
                      color="primary" 
                      type="submit"
                      class="login-button w-100"
                      [disabled]="loginForm.invalid || authService.loading()">
                @if (authService.loading()) {
                  <mat-spinner diameter="20" class="mr-sm"></mat-spinner>
                  Iniciando sesión...
                } @else {
                  <ng-container>
                    <mat-icon class="mr-sm">login</mat-icon>
                    Iniciar Sesión
                  </ng-container>
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Información adicional -->
        <div class="login-footer">
          <p class="text-muted">
            <mat-icon class="info-icon">info</mat-icon>
            Solo usuarios autorizados pueden acceder al sistema
          </p>
          <p class="version-info">VetPlus v1.0.0</p>
        </div>

        <!-- Selector de tema -->
        <div class="theme-selector">
          <button mat-icon-button 
                  (click)="toggleTheme()" 
                  [matTooltip]="'Cambiar tema'">
            <mat-icon>palette</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      padding: 16px;
    }

    .login-wrapper {
      max-width: 400px;
      width: 100%;
      position: relative;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .logo-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #2e7d32;
    }

    .app-title {
      font-size: 32px;
      font-weight: 300;
      margin: 0;
      color: #2e7d32;
    }

    .app-subtitle {
      color: #666;
      margin: 8px 0 0 0;
      font-size: 14px;
    }

    .login-card {
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      border-radius: 16px !important;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .login-button {
      height: 48px;
      border-radius: 8px !important;
      font-size: 16px;
      font-weight: 500;
    }

    .login-footer {
      text-align: center;
      margin-top: 24px;
    }

    .text-muted {
      color: #666;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin: 0;
    }

    .info-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .version-info {
      color: #999;
      font-size: 11px;
      margin: 8px 0 0 0;
    }

    .theme-selector {
      position: absolute;
      top: -60px;
      right: 0;
    }

    .mr-sm {
      margin-right: 8px;
    }

    .w-100 {
      width: 100%;
    }

    // Responsive
    @media (max-width: 480px) {
      .login-container {
        padding: 8px;
      }
      
      .login-wrapper {
        max-width: 100%;
      }
      
      .app-title {
        font-size: 28px;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Si ya está autenticado, redirigir
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin() {
    if (this.loginForm.valid) {
      const credentials: LoginRequest = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('¡Bienvenido a VetPlus!', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            
            // El AuthService ya maneja la redirección automática
          }
        },
        error: (error) => {
          let errorMessage = 'Error al iniciar sesión';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 401) {
            errorMessage = 'Credenciales incorrectas';
          } else if (error.status === 0) {
            errorMessage = 'Error de conexión con el servidor';
          }
          
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleTheme() {
    this.authService.toggleTheme();
    
    const currentTheme = this.authService.currentTheme();
    let themeName = 'Tema claro';
    
    switch (currentTheme) {
      case 'dark': themeName = 'Tema oscuro'; break;
      case 'blue': themeName = 'Tema azul'; break;
      case 'light': themeName = 'Tema verde'; break;
    }
    
    this.snackBar.open(`${themeName} activado`, '', { duration: 1500 });
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}