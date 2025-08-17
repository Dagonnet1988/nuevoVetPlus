import { Routes } from '@angular/router';
import { AuthGuard } from '../../utils/guards/auth.guard';
import { RoleGuard } from '../../utils/guards/role.guard';

export const inventarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventario.component').then(c => c.InventarioComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Inventario'
    }
  },
  {
    path: 'productos/nuevo',
    loadComponent: () => import('./components/producto-form.component').then(c => c.ProductoFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Nuevo Producto'
    }
  },
  {
    path: 'productos/:id',
    loadComponent: () => import('./components/producto-details.component').then(c => c.ProductoDetailsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet', 'assistant'],
      title: 'Detalles del Producto'
    }
  },
  {
    path: 'productos/:id/editar',
    loadComponent: () => import('./components/producto-form.component').then(c => c.ProductoFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Editar Producto'
    }
  },
  // {
  //   path: 'productos/:id/movimientos',
  //   loadComponent: () => import('./components/movimientos-producto.component').then(c => c.MovimientosProductoComponent),
  //   canActivate: [AuthGuard, RoleGuard],
  //   data: { 
  //     roles: ['admin', 'vet', 'assistant'],
  //     title: 'Movimientos del Producto'
  //   }
  // },
  {
    path: 'categorias',
    loadComponent: () => import('./components/categorias.component').then(c => c.CategoriasComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin'],
      title: 'Categorías'
    }
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./components/proveedores.component').then(c => c.ProveedoresComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet'],
      title: 'Proveedores'
    }
  },
  {
    path: 'movimientos',
    loadComponent: () => import('./components/movimientos.component').then(c => c.MovimientosComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: ['admin', 'vet', 'assistant'],
      title: 'Movimientos de Inventario'
    }
  }
];