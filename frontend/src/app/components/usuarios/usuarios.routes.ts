import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./usuarios.component').then(m => m.UsuariosComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Gestión de Usuarios'
    }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./components/usuario-form.component').then(m => m.UsuarioFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Nuevo Usuario'
    }
  },
  {
    path: ':id',
    loadComponent: () => import('./components/usuario-profile.component').then(m => m.UsuarioProfileComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Perfil de Usuario'
    }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./components/usuario-form.component').then(m => m.UsuarioFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Editar Usuario'
    }
  },
  {
    path: ':id/sesiones',
    loadComponent: () => import('./components/usuario-sesiones.component').then(m => m.UsuarioSesionesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Sesiones del Usuario'
    }
  },
  // Componentes pendientes - descomentar cuando se implementen
  /*
  {
    path: ':id/actividad',
    loadComponent: () => import('./components/usuario-actividad.component').then(m => m.UsuarioActividadComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Actividad del Usuario'
    }
  },
  {
    path: 'roles',
    loadComponent: () => import('./components/roles-management.component').then(m => m.RolesManagementComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Gestión de Roles'
    }
  },
  {
    path: 'permisos',
    loadComponent: () => import('./components/permisos-management.component').then(m => m.PermisosManagementComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Gestión de Permisos'
    }
  },
  {
    path: 'configuracion-seguridad',
    loadComponent: () => import('./components/security-config.component').then(m => m.SecurityConfigComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Configuración de Seguridad'
    }
  }
  */
];