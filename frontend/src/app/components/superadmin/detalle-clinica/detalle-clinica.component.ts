import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SuperadminAuthService, TenantDetail } from '../../../services/superadmin-auth.service';

@Component({
  selector: 'app-detalle-clinica',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule, MatDialogModule
  ],
  templateUrl: './detalle-clinica.component.html',
  styleUrls: ['./detalle-clinica.component.scss']
})
export class DetalleClinicaComponent implements OnInit {
  tenant = signal<TenantDetail | null>(null);
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  saveError = signal('');
  saveOk = signal('');

  editNombre = '';
  editPlan: string = 'standard';
  editEstado: string = 'active';
  editMaxUsuarios = 5;

  constructor(
    private route: ActivatedRoute,
    private svc: SuperadminAuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getTenant(id).subscribe({
      next: data => {
        this.tenant.set(data);
        this.editNombre      = data.nombre;
        this.editPlan        = data.plan;
        this.editEstado      = data.estado;
        this.editMaxUsuarios = data.max_usuarios;
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Error al cargar la clínica.');
        this.loading.set(false);
      }
    });
  }

  saveChanges(): void {
    const t = this.tenant();
    if (!t) return;
    this.saving.set(true);
    this.saveError.set('');
    this.saveOk.set('');

    this.svc.updateTenant(t.id_tenant, {
      nombre: this.editNombre,
      plan: this.editPlan as any,
      estado: this.editEstado as any,
      max_usuarios: this.editMaxUsuarios
    }).subscribe({
      next: res => {
        this.tenant.set({ ...t, ...res.tenant });
        this.saveOk.set('Cambios guardados correctamente.');
        this.saving.set(false);
      },
      error: err => {
        this.saveError.set(err?.error?.message || 'Error al guardar cambios.');
        this.saving.set(false);
      }
    });
  }

  toggleEstado(): void {
    this.editEstado = this.editEstado === 'active' ? 'suspended' : 'active';
    this.saveChanges();
  }

  planLabel(plan: string): string {
    const m: Record<string, string> = { standard: 'Standard', pro: 'Pro', enterprise: 'Enterprise' };
    return m[plan] ?? plan;
  }
}
