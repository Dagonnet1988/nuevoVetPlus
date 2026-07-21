import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperadminAuthService } from '../../../services/superadmin-auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const nuevo = control.get('password_nuevo')?.value;
  const confirmacion = control.get('confirmacion')?.value;
  return nuevo && confirmacion && nuevo !== confirmacion ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="cp-wrapper">
      <mat-card class="cp-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>lock_reset</mat-icon>
          <mat-card-title>Cambiar Contraseña</mat-card-title>
          <mat-card-subtitle>Cuenta: {{ svc.profile()?.email }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="cp-form">

            <mat-form-field appearance="outline" class="cp-field">
              <mat-label>Contraseña actual</mat-label>
              <input matInput [type]="showActual() ? 'text' : 'password'"
                     formControlName="password_actual" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="showActual.set(!showActual())">
                <mat-icon>{{ showActual() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password_actual')?.hasError('required') && form.get('password_actual')?.touched) {
                <mat-error>La contraseña actual es requerida</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="cp-field">
              <mat-label>Nueva contraseña</mat-label>
              <input matInput [type]="showNueva() ? 'text' : 'password'"
                     formControlName="password_nuevo" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showNueva.set(!showNueva())">
                <mat-icon>{{ showNueva() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password_nuevo')?.hasError('required') && form.get('password_nuevo')?.touched) {
                <mat-error>La nueva contraseña es requerida</mat-error>
              }
              @if (form.get('password_nuevo')?.hasError('minlength') && form.get('password_nuevo')?.touched) {
                <mat-error>Mínimo 8 caracteres</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="cp-field">
              <mat-label>Confirmar nueva contraseña</mat-label>
              <input matInput [type]="showConfirm() ? 'text' : 'password'"
                     formControlName="confirmacion" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showConfirm.set(!showConfirm())">
                <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.hasError('noCoinciden') && form.get('confirmacion')?.touched) {
                <mat-error>Las contraseñas no coinciden</mat-error>
              }
            </mat-form-field>

            @if (error()) {
              <p class="cp-error">{{ error() }}</p>
            }

          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button type="button" (click)="router.navigate(['/superadmin/dashboard'])">
            Cancelar
          </button>
          <button mat-flat-button color="primary" (click)="submit()"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="20" />
            } @else {
              Guardar contraseña
            }
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cp-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 16px;
    }
    .cp-card {
      width: 100%;
      max-width: 480px;
    }
    .cp-form {
      display: flex;
      flex-direction: column;
      margin-top: 16px;
    }
    .cp-field {
      width: 100%;
    }
    .cp-error {
      color: var(--mat-sys-error, #f44336);
      font-size: 14px;
      margin: 4px 0 8px;
    }
    mat-card-actions {
      padding: 8px 16px 16px;
      gap: 8px;
    }
  `]
})
export class CambiarPasswordComponent {
  readonly svc    = inject(SuperadminAuthService);
  readonly router = inject(Router);
  private snack   = inject(MatSnackBar);
  private fb      = inject(FormBuilder);

  loading     = signal(false);
  error       = signal('');
  showActual  = signal(false);
  showNueva   = signal(false);
  showConfirm = signal(false);

  form = this.fb.group({
    password_actual: ['', Validators.required],
    password_nuevo:  ['', [Validators.required, Validators.minLength(8)]],
    confirmacion:    ['', Validators.required]
  }, { validators: passwordsMatch });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { password_actual, password_nuevo } = this.form.value;

    this.svc.changePassword(password_actual!, password_nuevo!).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snack.open(res.message || 'Contraseña actualizada', 'OK', { duration: 4000 });
        this.router.navigate(['/superadmin/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }
}
