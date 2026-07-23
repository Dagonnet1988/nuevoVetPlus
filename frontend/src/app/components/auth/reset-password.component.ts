import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  resetForm: FormGroup;
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  loading = signal(false);
  token = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });

    this.token = String(this.route.snapshot.queryParamMap.get('token') || '').trim();
  }

  onSubmit(): void {
    if (!this.token) {
      this.snackBar.open('El enlace de recuperación no es válido.', 'Cerrar', { duration: 5000 });
      return;
    }

    if (this.resetForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const newPassword = String(this.resetForm.get('newPassword')?.value || '');
    const confirmPassword = String(this.resetForm.get('confirmPassword')?.value || '');

    this.loading.set(true);
    this.authService.resetPasswordWithToken({ token: this.token, newPassword, confirmPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Contraseña actualizada. Ya puedes iniciar sesión.', 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading.set(false);
        const apiMessage = error?.error?.message;
        const errorMessage = apiMessage || 'No fue posible restablecer la contraseña. Solicita un nuevo enlace.';

        this.snackBar.open(errorMessage, 'Cerrar', {
          duration: 5500,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  private passwordsMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  private markFormGroupTouched(): void {
    Object.keys(this.resetForm.controls).forEach((key) => {
      this.resetForm.get(key)?.markAsTouched();
    });
  }
}
