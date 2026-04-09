import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperadminAuthService } from '../../../services/superadmin-auth.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './superadmin-login.component.html',
  styleUrls: ['./superadmin-login.component.scss']
})
export class SuperadminLoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = false;

  constructor(private svc: SuperadminAuthService, private router: Router) {}

  submit(): void {
    if (!this.email || !this.password) {
      this.error.set('Ingresa email y contraseña.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.svc.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/superadmin/dashboard']),
      error: err => {
        this.error.set(err?.error?.message || 'Credenciales inválidas.');
        this.loading.set(false);
      }
    });
  }
}
