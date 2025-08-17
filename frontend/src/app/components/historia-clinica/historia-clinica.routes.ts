import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';

export const historiaClinicaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./historia-clinica.component').then(c => c.HistoriaClinicaComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Historia Clínica'
    }
  },
  {
    path: 'nueva',
    loadComponent: () => import('./components/consulta-form.component').then(c => c.ConsultaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Nueva Consulta'
    }
  },
  {
    path: ':id',
    loadComponent: () => import('./components/consulta-details.component').then(c => c.ConsultaDetailsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet', 'assistant'],
      title: 'Detalles de Consulta'
    }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./components/consulta-form.component').then(c => c.ConsultaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Editar Consulta'
    }
  }
];