import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminAuthService, TenantStats } from '../../../services/superadmin-auth.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule
  ],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.scss']
})
export class SuperadminDashboardComponent implements OnInit {
  tenants = signal<TenantStats[]>([]);
  loading = signal(true);
  error = signal('');
  togglingId = signal<string | null>(null);

  totalClinicas    = computed(() => this.tenants().length);
  totalActivas     = computed(() => this.tenants().filter(t => t.estado === 'active').length);
  totalSuspendidas = computed(() => this.tenants().filter(t => t.estado === 'suspended').length);
  totalMascotas    = computed(() => this.tenants().reduce((a, t) => a + +t.total_mascotas, 0));

  constructor(private svc: SuperadminAuthService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.svc.listTenants().subscribe({
      next: data => { this.tenants.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err?.error?.message || 'Error al cargar clínicas.'); this.loading.set(false); }
    });
  }

  toggleEstado(t: TenantStats): void {
    const nuevoEstado = t.estado === 'active' ? 'suspended' : 'active';
    const accion = nuevoEstado === 'active' ? 'activada' : 'suspendida';
    this.togglingId.set(t.id_tenant);
    this.svc.updateTenant(t.id_tenant, { estado: nuevoEstado as any }).subscribe({
      next: () => {
        this.tenants.update(list =>
          list.map(x => x.id_tenant === t.id_tenant ? { ...x, estado: nuevoEstado } : x)
        );
        this.snack.open(`Clínica ${accion} correctamente`, 'OK', { duration: 3000 });
        this.togglingId.set(null);
      },
      error: err => {
        this.snack.open(err?.error?.message || 'Error al cambiar estado', 'Cerrar', { duration: 3000 });
        this.togglingId.set(null);
      }
    });
  }

  planLabel(plan: string): string {
    const map: Record<string, string> = { standard: 'Standard', pro: 'Pro', enterprise: 'Enterprise' };
    return map[plan] ?? plan;
  }

  periodicidadLabel(p: string | null): string {
    const map: Record<string, string> = { monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' };
    return p ? (map[p] ?? p) : '—';
  }

  /** Returns 'vencido' | 'alerta' | 'proximo' | 'ok' | 'sin-fecha' */
  pagoEstado(t: TenantStats): 'vencido' | 'alerta' | 'proximo' | 'ok' | 'sin-fecha' {
    if (!t.fecha_proximo_pago) return 'sin-fecha';
    const dias = Math.floor((new Date(t.fecha_proximo_pago).getTime() - Date.now()) / 86_400_000);
    if (dias < 0)   return 'vencido';
    if (dias <= 7)  return 'alerta';
    if (dias <= 30) return 'proximo';
    return 'ok';
  }

  pagoLabel(t: TenantStats): string {
    if (!t.fecha_proximo_pago) return 'Sin fecha';
    const dias = Math.floor((new Date(t.fecha_proximo_pago).getTime() - Date.now()) / 86_400_000);
    if (dias < 0)  return `Vencido hace ${Math.abs(dias)}d`;
    if (dias === 0) return 'Vence hoy';
    if (dias <= 30) return `Vence en ${dias}d`;
    return new Date(t.fecha_proximo_pago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
