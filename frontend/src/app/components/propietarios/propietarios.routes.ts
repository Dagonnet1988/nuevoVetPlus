import { Routes } from '@angular/router';

export const PROPIETARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./propietarios.component').then(m => m.PropietariosComponent)
  }
];
