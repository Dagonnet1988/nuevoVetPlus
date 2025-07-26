import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Primero verificar autenticación
    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/login']);
    }

    // Obtener roles permitidos desde la data de la ruta
    const allowedRoles = route.data?.['roles'] as ('admin' | 'vet' | 'aux')[];
    
    if (!allowedRoles || allowedRoles.length === 0) {
      // Si no se especifican roles, permitir acceso a usuarios autenticados
      return true;
    }

    // Verificar si el usuario tiene uno de los roles permitidos
    if (this.authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    // Si no tiene permisos, redirigir al dashboard con mensaje de error
    console.warn(`Acceso denegado. Roles requeridos: ${allowedRoles.join(', ')}, Usuario actual: ${this.authService.getCurrentUserRole()}`);
    return this.router.createUrlTree(['/dashboard']);
  }
}