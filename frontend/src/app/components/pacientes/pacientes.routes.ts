import { Routes } from '@angular/router';

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
    path: ':id',
    loadComponent: () => import('../paciente-details/paciente-details.component').then(m => m.PacienteDetailsComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () => import('../paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  }
];