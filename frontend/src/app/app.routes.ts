import { Routes } from '@angular/router';
import { AuthGuard } from './utils/guards/auth.guard';
import { NoAuthGuard } from './utils/guards/no-auth.guard';
import { RoleGuard } from './utils/guards/role.guard';
import { SuperadminGuard } from './utils/guards/superadmin.guard';

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
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/auth/change-password.component').then(m => m.ChangePasswordComponent)
      }
    ]
  },

  // Ruta pública de firma de consentimiento (sin autenticación)
  {
    path: 'consentimiento/:token',
    loadComponent: () => import('./components/consentimiento-publico/consentimiento-publico.component')
      .then(m => m.ConsentimientoPublicoComponent)
  },

  // Rutas principales del sistema
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      // Dashboard - Accesible para todos los usuarios autenticados
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Pacientes - Accesible para admin, vet, aux
      {
        path: 'pacientes',
        loadChildren: () => import('./components/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux'] }
      },

      // Propietarios - Accesible para admin, vet, aux
      {
        path: 'propietarios',
        loadChildren: () => import('./components/propietarios/propietarios.routes').then(m => m.PROPIETARIOS_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux'] }
      },

      // Citas - Accesible para admin, vet, aux
      {
        path: 'citas',
        loadChildren: () => import('./components/citas/citas.routes').then(m => m.CITAS_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet', 'aux'] }
      },

      // Historia Clínica - Accesible para admin, vet
      {
        path: 'historia-clinica',
        loadChildren: () => import('./components/historia-clinica/historia-clinica.routes').then(m => m.historiaClinicaRoutes),
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

      // Perfil de usuario (acceso por menú superior)
      {
        path: 'perfil',
        loadComponent: () => import('./components/usuarios/components/usuario-profile.component').then(m => m.UsuarioProfileComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet'] }
      },
      {
        path: 'perfil/sesiones',
        loadComponent: () => import('./components/usuarios/components/usuario-sesiones.component').then(m => m.UsuarioSesionesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'vet'] }
      }
    ]
  },

  // ── Panel Superadmin (plataforma) ─────────────────────────────────────────
  {
    path: 'superadmin/login',
    loadComponent: () => import('./components/superadmin/login/superadmin-login.component')
      .then(m => m.SuperadminLoginComponent)
  },
  {
    path: 'superadmin',
    loadComponent: () => import('./layouts/superadmin-layout/superadmin-layout.component')
      .then(m => m.SuperadminLayoutComponent),
    canActivate: [SuperadminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/superadmin/dashboard/superadmin-dashboard.component')
          .then(m => m.SuperadminDashboardComponent)
      },
      {
        path: 'clinicas/nueva',
        loadComponent: () => import('./components/superadmin/nueva-clinica/nueva-clinica.component')
          .then(m => m.NuevaClinicaComponent)
      },
      {
        path: 'clinicas/:id',
        loadComponent: () => import('./components/superadmin/detalle-clinica/detalle-clinica.component')
          .then(m => m.DetalleClinicaComponent)
      },
      {
        path: 'cambiar-password',
        loadComponent: () => import('./components/superadmin/cambiar-password/cambiar-password.component')
          .then(m => m.CambiarPasswordComponent)
      }
    ]
  },

  // Ruta de error 404
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
