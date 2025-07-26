import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Si ya está autenticado, redirigir al dashboard
    if (this.authService.isAuthenticated()) {
      // Verificar si debe cambiar contraseña
      if (this.authService.mustChangePassword()) {
        return this.router.createUrlTree(['/change-password']);
      }
      
      return this.router.createUrlTree(['/dashboard']);
    }

    // Si no está autenticado, permitir acceso (para login, etc.)
    return true;
  }
}