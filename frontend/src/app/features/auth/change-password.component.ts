import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { PasswordChangeRequest } from '../../core/models/auth.interface';

@Component({
  selector: 'app-change-password',
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
    MatSnackBarModule
  ],
  template: `
    <div class="change-password-container">
      <div class="change-password-wrapper">
        <!-- Header -->
        <div class="header">
          <div class="logo-container">
            <mat-icon class="logo-icon">security</mat-icon>
          </div>
          <h1 class="title">Cambiar Contraseña</h1>
          <p class="subtitle">
            Es tu primer acceso. Por seguridad, debes establecer una nueva contraseña.
          </p>
        </div>

        <!-- Formulario -->
        <mat-card class="password-card">
          <mat-card-header>
            <mat-card-title>Nueva Contraseña</mat-card-title>
            <mat-card-subtitle>
              La contraseña debe cumplir con los requisitos de seguridad
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="password-form">
              
              <!-- Contraseña actual -->
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Contraseña temporal</mat-label>
                <input matInput 
                       [type]="hideCurrentPassword() ? 'password' : 'text'" 
                       formControlName="currentPassword"
                       placeholder="Ingresa la contraseña temporal"
                       autocomplete="current-password">
                <button mat-icon-button 
                        matSuffix 
                        type="button"
                        (click)="toggleCurrentPasswordVisibility()"
                        [attr.aria-label]="'Toggle password visibility'">
                  <mat-icon>{{hideCurrentPassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched) {
                  <mat-error>
                    @if (passwordForm.get('currentPassword')?.errors?.['required']) {
                      La contraseña temporal es requerida
                    }
                  </mat-error>
                }
              </mat-form-field>

              <!-- Nueva contraseña -->
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Nueva contraseña</mat-label>
                <input matInput 
                       [type]="hideNewPassword() ? 'password' : 'text'" 
                       formControlName="newPassword"
                       placeholder="Ingresa tu nueva contraseña"
                       autocomplete="new-password">
                <button mat-icon-button 
                        matSuffix 
                        type="button"
                        (click)="toggleNewPasswordVisibility()"
                        [attr.aria-label]="'Toggle password visibility'">
                  <mat-icon>{{hideNewPassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                  <mat-error>
                    @if (passwordForm.get('newPassword')?.errors?.['required']) {
                      La nueva contraseña es requerida
                    }
                    @if (passwordForm.get('newPassword')?.errors?.['minlength']) {
                      Mínimo 8 caracteres
                    }
                    @if (passwordForm.get('newPassword')?.errors?.['pattern']) {
                      Debe contener al menos: mayúscula, minúscula, número y carácter especial
                    }
                  </mat-error>
                }
              </mat-form-field>

              <!-- Confirmar nueva contraseña -->
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Confirmar nueva contraseña</mat-label>
                <input matInput 
                       [type]="hideConfirmPassword() ? 'password' : 'text'" 
                       formControlName="confirmPassword"
                       placeholder="Confirma tu nueva contraseña"
                       autocomplete="new-password">
                <button mat-icon-button 
                        matSuffix 
                        type="button"
                        (click)="toggleConfirmPasswordVisibility()"
                        [attr.aria-label]="'Toggle password visibility'">
                  <mat-icon>{{hideConfirmPassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched) {
                  <mat-error>
                    @if (passwordForm.get('confirmPassword')?.errors?.['required']) {
                      Debes confirmar la contraseña
                    }
                    @if (passwordForm.get('confirmPassword')?.errors?.['passwordMismatch']) {
                      Las contraseñas no coinciden
                    }
                  </mat-error>
                }
              </mat-form-field>

              <!-- Requisitos de contraseña -->
              <div class="password-requirements">
                <h4>Requisitos de la contraseña:</h4>
                <ul class="requirements-list">
                  <li [class.valid]="hasMinLength()">
                    <mat-icon>{{ hasMinLength() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    Mínimo 8 caracteres
                  </li>
                  <li [class.valid]="hasUppercase()">
                    <mat-icon>{{ hasUppercase() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    Al menos una mayúscula
                  </li>
                  <li [class.valid]="hasLowercase()">
                    <mat-icon>{{ hasLowercase() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    Al menos una minúscula
                  </li>
                  <li [class.valid]="hasNumber()">
                    <mat-icon>{{ hasNumber() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    Al menos un número
                  </li>
                  <li [class.valid]="hasSpecialChar()">
                    <mat-icon>{{ hasSpecialChar() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    Al menos un carácter especial (@$!%*?&)
                  </li>
                </ul>
              </div>

              <!-- Botón de cambio -->
              <button mat-raised-button 
                      color="primary" 
                      type="submit"
                      class="change-button w-100"
                      [disabled]="passwordForm.invalid || authService.loading()">
                @if (authService.loading()) {
                  <mat-spinner diameter="20" class="mr-sm"></mat-spinner>
                  Cambiando contraseña...
                } @else {
                  <ng-container>
                    <mat-icon class="mr-sm">security</mat-icon>
                    Cambiar Contraseña
                  </ng-container>
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Información adicional -->
        <div class="info-section">
          <div class="security-info">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <p><strong>¿Por qué cambiar la contraseña?</strong></p>
              <p>Tu contraseña actual es temporal y debe ser cambiada por seguridad antes de acceder al sistema.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .change-password-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      padding: 16px;
    }

    .change-password-wrapper {
      max-width: 500px;
      width: 100%;
    }

    .header {
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
      color: #ff9800;
    }

    .title {
      font-size: 28px;
      font-weight: 400;
      margin: 0 0 8px 0;
      color: #2e7d32;
    }

    .subtitle {
      color: #666;
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
    }

    .password-card {
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      border-radius: 16px !important;
    }

    .password-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 16px;
    }

    .password-requirements {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }

    .password-requirements h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #333;
    }

    .requirements-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .requirements-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 13px;
      color: #666;
      transition: color 0.2s ease;
    }

    .requirements-list li.valid {
      color: #4caf50;
    }

    .requirements-list li mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .requirements-list li.valid mat-icon {
      color: #4caf50;
    }

    .change-button {
      height: 48px;
      border-radius: 8px !important;
      font-size: 16px;
      font-weight: 500;
      margin-top: 8px;
    }

    .info-section {
      margin-top: 24px;
    }

    .security-info {
      display: flex;
      gap: 12px;
      background: rgba(255, 255, 255, 0.8);
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .info-icon {
      color: #ff9800;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .info-text {
      flex: 1;
    }

    .info-text p {
      margin: 0 0 4px 0;
      font-size: 13px;
    }

    .info-text p:first-child {
      font-weight: 500;
      color: #333;
    }

    .info-text p:last-child {
      color: #666;
    }

    .mr-sm {
      margin-right: 8px;
    }

    .w-100 {
      width: 100%;
    }

    // Responsive
    @media (max-width: 480px) {
      .change-password-container {
        padding: 8px;
      }

      .title {
        font-size: 24px;
      }

      .logo-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      .password-requirements {
        padding: 12px;
      }
    }

    // Dark theme
    .dark-theme .password-requirements {
      background: #2d2d2d;
    }

    .dark-theme .password-requirements h4 {
      color: #fff;
    }

    .dark-theme .security-info {
      background: rgba(30, 30, 30, 0.8);
    }

    .dark-theme .info-text p:first-child {
      color: #fff;
    }

    .dark-theme .info-text p:last-child {
      color: #b3b3b3;
    }
  `]
})
export class ChangePasswordComponent {
  passwordForm: FormGroup;
  hideCurrentPassword = signal(true);
  hideNewPassword = signal(true);
  hideConfirmPassword = signal(true);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Verificar si realmente debe cambiar contraseña
    if (!this.authService.mustChangePassword()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onChangePassword() {
    if (this.passwordForm.valid) {
      const passwordData: PasswordChangeRequest = {
        current_password: this.passwordForm.value.currentPassword,
        new_password: this.passwordForm.value.newPassword,
        confirm_password: this.passwordForm.value.confirmPassword
      };

      this.authService.changePassword(passwordData).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Contraseña cambiada exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            
            // Redirigir al dashboard
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          let errorMessage = 'Error al cambiar la contraseña';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 400) {
            errorMessage = 'Contraseña temporal incorrecta';
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

  toggleCurrentPasswordVisibility() {
    this.hideCurrentPassword.set(!this.hideCurrentPassword());
  }

  toggleNewPasswordVisibility() {
    this.hideNewPassword.set(!this.hideNewPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  // Validadores de requisitos de contraseña
  hasMinLength(): boolean {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return password.length >= 8;
  }

  hasUppercase(): boolean {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return /[A-Z]/.test(password);
  }

  hasLowercase(): boolean {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return /[a-z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return /\d/.test(password);
  }

  hasSpecialChar(): boolean {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return /[@$!%*?&]/.test(password);
  }

  private passwordMatchValidator(control: AbstractControl) {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  private markFormGroupTouched() {
    Object.keys(this.passwordForm.controls).forEach(key => {
      const control = this.passwordForm.get(key);
      control?.markAsTouched();
    });
  }
}