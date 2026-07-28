import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';
import { unsavedChangesGuard } from '../../guards/unsaved-changes.guard';

export const historiaClinicaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./historia-clinica.component').then(c => c.HistoriaClinicaComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux'],
      title: 'Historia Clínica'
    }
  },
  {
    path: 'nueva',
    loadComponent: () => import('./components/historia-clinica-form.component').then(c => c.HistoriaClinicaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      roles: ['admin', 'vet', 'aux'],
      title: 'Nueva Historia Clínica'
    }
  },
  {
    path: ':id',
    loadComponent: () => import('./components/historia-clinica-details.component').then(c => c.HistoriaClinicaDetailsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin', 'vet', 'aux'],
      title: 'Detalles de Historia Clínica'
    }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./components/historia-clinica-form.component').then(c => c.HistoriaClinicaFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      roles: ['admin', 'vet', 'aux'],
      title: 'Editar Historia Clínica'
    }
  }
];
