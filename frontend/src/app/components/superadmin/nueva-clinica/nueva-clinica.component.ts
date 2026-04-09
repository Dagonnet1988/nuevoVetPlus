import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SuperadminAuthService, CreateTenantPayload } from '../../../services/superadmin-auth.service';

@Component({
  selector: 'app-nueva-clinica',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatCardModule, MatDividerModule
  ],
  templateUrl: './nueva-clinica.component.html',
  styleUrls: ['./nueva-clinica.component.scss']
})
export class NuevaClinicaComponent {
  // Datos clínica
  nombre = '';
  slug = '';
  plan: 'standard' | 'pro' | 'enterprise' = 'standard';
  max_usuarios = 5;

  // Datos admin
  adminNombre   = '';
  adminApellido = '';
  adminEmail    = '';
  adminDocumento = '';
  adminPassword = '';
  showPassword  = false;

  loading = signal(false);
  error   = signal('');

  slugTouched = false;

  constructor(private svc: SuperadminAuthService, private router: Router) {}

  onNombreChange(): void {
    if (!this.slugTouched) {
      this.slug = this.nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }

  submit(): void {
    this.error.set('');
    if (!this.nombre || !this.slug || !this.adminNombre || !this.adminApellido ||
        !this.adminEmail || !this.adminDocumento || !this.adminPassword) {
      this.error.set('Completa todos los campos obligatorios.');
      return;
    }
    if (this.adminPassword.length < 8) {
      this.error.set('La contraseña del admin debe tener al menos 8 caracteres.');
      return;
    }

    const payload: CreateTenantPayload = {
      slug: this.slug,
      nombre: this.nombre,
      plan: this.plan,
      max_usuarios: this.max_usuarios,
      admin: {
        nombre:    this.adminNombre,
        apellido:  this.adminApellido,
        email:     this.adminEmail,
        documento: this.adminDocumento,
        password:  this.adminPassword
      }
    };

    this.loading.set(true);
    this.svc.createTenant(payload).subscribe({
      next: res => {
        this.router.navigate(['/superadmin/clinicas', res.tenant.id_tenant]);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Error al crear la clínica.');
        this.loading.set(false);
      }
    });
  }
}
