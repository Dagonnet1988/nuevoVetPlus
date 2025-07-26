import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
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
      return this.router.createUrlTree(['/change-password']);
    }

    // Verificar si el token está próximo a expirar
    if (this.authService.isTokenExpiringSoon()) {
      // Intentar refrescar el token o redirigir al login
      this.authService.logout();
      return this.router.createUrlTree(['/login']);
    }

    return true;
  }
}