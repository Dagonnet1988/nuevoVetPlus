import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Verificar si está autenticado
    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/login']);
    }

    // Verificar si el usuario está activo
    if (!this.authService.isUserActive()) {
      this.authService.logout();
      return this.router.createUrlTree(['/login']);
    }

    // Verificar si debe cambiar contraseña en primer acceso
    if (this.authService.mustChangePassword()) {
      if (state.url.startsWith('/change-password')) {
        return true;
      }
      return this.router.createUrlTree(['/change-password']);
    }

    // No cerrar sesión aquí por expiración próxima.
    // El interceptor maneja refresh/expiración real para evitar bucles al navegar.

    return true;
  }
}
