import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SuperadminAuthService, TenantStats } from '../../../services/superadmin-auth.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.scss']
})
export class SuperadminDashboardComponent implements OnInit {
  tenants = signal<TenantStats[]>([]);
  loading = signal(true);
  error = signal('');

  totalClinicas = computed(() => this.tenants().length);
  totalActivas  = computed(() => this.tenants().filter(t => t.estado === 'active').length);
  totalUsuarios = computed(() => this.tenants().reduce((a, t) => a + +t.total_usuarios, 0));

  constructor(private svc: SuperadminAuthService) {}

  ngOnInit(): void {
    this.svc.listTenants().subscribe({
      next: data => { this.tenants.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err?.error?.message || 'Error al cargar clínicas.'); this.loading.set(false); }
    });
  }

  estadoColor(estado: string): string {
    const map: Record<string, string> = { active: 'success', suspended: 'warn', inactive: 'accent' };
    return map[estado] ?? 'primary';
  }

  planLabel(plan: string): string {
    const map: Record<string, string> = { standard: 'Standard', pro: 'Pro', enterprise: 'Enterprise' };
    return map[plan] ?? plan;
  }
}
