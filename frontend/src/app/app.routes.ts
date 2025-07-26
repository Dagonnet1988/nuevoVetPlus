import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Ruta raíz - redirigir al dashboard si está autenticado, sino al login
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Rutas de autenticación (sin autenticación requerida)
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [NoAuthGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
      }
    ]
  },

  // Ruta especial para cambio de contraseña (requiere autenticación pero no guard de primer acceso)
  {
    path: 'change-password',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/auth/change-password.component').then(m => m.ChangePasswordComponent)
      }
    ]
  },

  // Rutas principales del sistema (requieren autenticación)
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      // Dashboard - Accesible para todos los usuarios autenticados
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Pacientes - Accesible para admin, vet, aux
      {
        path: 'pacientes',
        loadChildren: () => import('./features/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux'] }
      },

      // Perfil temporal - placeholder
      {
        path: 'perfil',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // Ruta de error 404
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
