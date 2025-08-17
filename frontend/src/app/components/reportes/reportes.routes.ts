import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reportes.component').then(m => m.ReportesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'veterinario'],
      title: 'Reportes y Analytics'
    }
  },
  // Componentes de reportes específicos
  {
    path: 'ventas',
    loadComponent: () => import('./components/reporte-ventas.component').then(m => m.ReporteVentasComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'veterinario'],
      title: 'Reportes de Ventas'
    }
  },
  {
    path: 'pacientes',
    loadComponent: () => import('./components/reporte-pacientes.component').then(m => m.ReportePacientesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'veterinario'],
      title: 'Estadísticas de Pacientes'
    }
  },
  {
    path: 'inventario',
    loadComponent: () => import('./components/reporte-inventario.component').then(m => m.ReporteInventarioComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'veterinario'],
      title: 'Análisis de Inventario'
    }
  },
  {
    path: 'operaciones',
    loadComponent: () => import('./components/reporte-operaciones.component').then(m => m.ReporteOperacionesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'veterinario'],
      title: 'Reportes Operacionales'
    }
  }
];