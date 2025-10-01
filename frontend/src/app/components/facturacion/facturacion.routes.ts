import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';

export const FACTURACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./facturacion.component').then(m => m.FacturacionComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux_admin'],
      title: 'Sistema de Facturación'
    }
  },
  {
    path: 'nueva',
    loadComponent: () => import('./nueva-factura.component').then(m => m.NuevaFacturaComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux_admin'],
      title: 'Nueva Factura'
    }
  },
  {
    path: 'cotizacion/nueva',
    loadComponent: () => import('./components/factura-form.component').then(m => m.FacturaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux_admin'],
      title: 'Nueva Cotización',
      type: 'cotizacion'
    }
  },
  {
    path: ':id',
    loadComponent: () => import('./components/factura-details.component').then(m => m.FacturaDetailsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux_admin'],
      title: 'Detalles de Factura'
    }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./components/factura-form.component').then(m => m.FacturaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux_admin'],
      title: 'Editar Factura'
    }
  },
  {
    path: 'cajas/:id/movimientos',
    loadComponent: () => import('./components/movimientos-caja.component').then(m => m.MovimientosCajaComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet'],
      title: 'Movimientos de Caja'
    }
  }
];
