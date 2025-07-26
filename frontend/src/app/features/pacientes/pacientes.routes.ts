import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pacientes.component').then(m => m.PacientesComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./components/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./components/paciente-form.component').then(m => m.PacienteFormComponent)
  }
  // TODO: Implementar vista de detalles
  // {
  //   path: ':id',
  //   loadComponent: () => import('./components/paciente-details.component').then(m => m.PacienteDetailsComponent)
  // }
];