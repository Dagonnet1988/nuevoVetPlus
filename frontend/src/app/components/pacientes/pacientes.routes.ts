import { Routes } from '@angular/router';
import { RoleGuard } from '../../utils/guards/role.guard';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pacientes.component').then(m => m.PacientesComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('../paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    // Antes de ':id' para que "unificar" no se tome como id de paciente.
    path: 'unificar',
    canActivate: [RoleGuard],
    data: { roles: ['admin', 'vet'] },
    loadComponent: () => import('../unificar-pacientes/unificar-pacientes.component').then(m => m.UnificarPacientesComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('../paciente-details/paciente-details.component').then(m => m.PacienteDetailsComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('../paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  }
];