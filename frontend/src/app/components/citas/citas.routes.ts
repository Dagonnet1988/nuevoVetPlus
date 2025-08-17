import { Routes } from '@angular/router';

export const CITAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./citas.component').then(m => m.CitasComponent),
    data: { 
      title: 'Gestión de Citas',
      breadcrumb: 'Citas'
    }
  },
  {
    path: 'nueva',
    loadComponent: () => import('../cita-form/cita-form.component').then(m => m.CitaFormComponent),
    data: { 
      title: 'Nueva Cita',
      breadcrumb: 'Nueva Cita'
    }
  },
  {
    path: ':id',
    loadComponent: () => import('../cita-details/cita-details.component').then(m => m.CitaDetailsComponent),
    data: { 
      title: 'Detalles de Cita',
      breadcrumb: 'Detalles'
    }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('../cita-form/cita-form.component').then(m => m.CitaFormComponent),
    data: { 
      title: 'Editar Cita',
      breadcrumb: 'Editar'
    }
  }
];