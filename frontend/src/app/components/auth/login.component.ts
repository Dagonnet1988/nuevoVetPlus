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
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.interface';

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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);
  recoveryLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      documento: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
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
            this.snackBar.open('¡Bienvenido a Ramelo!', 'Cerrar', {
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

  onForgotPassword(): void {
    const documento = (this.loginForm.get('documento')?.value || '').toString().trim();

    const requestPayload = documento
      ? { documento }
      : this.getForgotPasswordPayloadFromPrompt();

    if (!requestPayload) {
      this.loginForm.get('documento')?.markAsTouched();
      this.snackBar.open('Ingresa tu documento o correo para recuperar la contraseña.', 'Cerrar', {
        duration: 4500
      });
      return;
    }

    this.recoveryLoading.set(true);
    this.authService.forgotPassword(requestPayload).subscribe({
      next: () => {
        this.recoveryLoading.set(false);
        this.snackBar.open('Si el usuario existe, enviaremos un enlace de recuperación al correo registrado. Si no puedes recuperar el acceso, comunícate con un administrador.', 'Cerrar', {
          duration: 7000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.recoveryLoading.set(false);

        const apiMessage = error?.error?.message;
        const errorMessage = apiMessage || 'No fue posible solicitar la recuperación en este momento. Si persiste, comunícate con un administrador.';
        this.snackBar.open(errorMessage, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private getForgotPasswordPayloadFromPrompt(): { email: string } | null {
    const email = window.prompt('Ingresa el correo registrado para recuperar tu contraseña:');
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      this.snackBar.open('El correo ingresado no es válido.', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return null;
    }

    return { email: normalizedEmail };
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
