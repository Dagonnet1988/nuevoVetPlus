import { Routes } from '@angular/router';
import { AuthGuard } from './utils/guards/auth.guard';
import { NoAuthGuard } from './utils/guards/no-auth.guard';
import { RoleGuard } from './utils/guards/role.guard';

export const routes: Routes = [
  // Ruta raíz - redirigir al login temporalmente
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  // Rutas de autenticación (sin guards temporalmente)
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent)
      }
    ]
  },

  // Ruta especial para cambio de contraseña (requiere autenticación pero no guard de primer acceso)
  {
    path: 'change-password',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    // canActivate: [AuthGuard], // TEMPORALMENTE DESACTIVADO
    children: [
      {
        path: '',
        loadComponent: () => import('./components/auth/change-password.component').then(m => m.ChangePasswordComponent)
      }
    ]
  },

  // Rutas principales del sistema (temporalmente sin guards)
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    // canActivate: [AuthGuard], // TEMPORALMENTE DESACTIVADO
    children: [
      // Dashboard - Accesible para todos los usuarios autenticados
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Pacientes - Accesible para admin, vet, aux_admin, aux_vet
      {
        path: 'pacientes',
        loadChildren: () => import('./components/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux_admin', 'aux_vet'] }
      },

      // Citas - Accesible para admin, vet, aux_admin, aux_vet
      {
        path: 'citas',
        loadChildren: () => import('./components/citas/citas.routes').then(m => m.CITAS_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux_admin', 'aux_vet'] }
      },

      // Historia Clínica - Accesible para admin, vet
      {
        path: 'historia-clinica',
        loadChildren: () => import('./components/historia-clinica/historia-clinica.routes').then(m => m.historiaClinicaRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet'] }
      },

      // Inventario - Accesible para admin, vet
      {
        path: 'inventario',
        loadChildren: () => import('./components/inventario/inventario.routes').then(m => m.inventarioRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet'] }
      },

      // Facturación - Accesible para admin, vet, aux_admin
      {
        path: 'facturacion',
        loadChildren: () => import('./components/facturacion/facturacion.routes').then(m => m.FACTURACION_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux_admin'] }
      },

      // Reportes - Accesible para admin, vet
      {
        path: 'reportes',
        loadChildren: () => import('./components/reportes/reportes.routes').then(m => m.REPORTES_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet'] }
      },

      // Usuarios - Solo admin
      {
        path: 'usuarios',
        loadChildren: () => import('./components/usuarios/usuarios.routes').then(m => m.USUARIOS_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },

      // Configuración - Solo admin
      {
        path: 'configuracion',
        loadChildren: () => import('./components/configuracion/configuracion.routes').then(m => m.CONFIGURACION_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
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
