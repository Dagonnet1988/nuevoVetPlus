import { Routes } from '@angular/router';

export const CAJAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cajas.component').then(m => m.CajasComponent)
  },
  {
    path: ':id/movimientos',
    loadComponent: () => import('./cajas.component').then(m => m.CajasComponent)
  }
];
