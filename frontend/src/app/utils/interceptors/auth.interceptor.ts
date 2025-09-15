import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isLoggingOut = false; // Flag para evitar bucles

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Agregar token JWT a todas las requests (excepto login)
    let authReq = req;
    const token = this.authService.getToken();

    if (token && !req.url.includes('/auth/login')) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    // Agregar headers adicionales (solo para requests que no son FormData)
    const isFormData = authReq.body instanceof FormData;
    
    if (!isFormData) {
      authReq = authReq.clone({
        headers: authReq.headers
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
      });
    } else {
      // Para FormData, solo agregar Accept header, no Content-Type
      authReq = authReq.clone({
        headers: authReq.headers.set('Accept', 'application/json')
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Manejar errores de autenticación
        if (error.status === 401 && !this.isLoggingOut) {
          // Token expirado o inválido
          console.warn('Token expirado o inválido, cerrando sesión...');

          // Evitar bucles: si ya estamos haciendo logout, forzar logout local
          if (req.url.includes('/auth/logout')) {
            this.forceLogout();
            return throwError(() => error);
          }

          // Marcar que estamos en proceso de logout
          this.isLoggingOut = true;

          // Usar logout que no hace petición al servidor para evitar bucles
          this.authService.logout(true);

          // Resetear flag después de un tiempo
          setTimeout(() => {
            this.isLoggingOut = false;
          }, 1000);

          return throwError(() => error);
        }

        if (error.status === 403) {
          // Sin permisos
          console.warn('Acceso denegado - Sin permisos suficientes');
          
          // No redirigir automáticamente si es una request de sincronización
          if (!req.url.includes('sync-google') && !req.url.includes('sync-all')) {
            this.router.navigate(['/dashboard']);
          }
          
          return throwError(() => error);
        }

        if (error.status === 0) {
          // Error de conexión
          console.error('Error de conexión con el servidor');
        }

        return throwError(() => error);
      })
    );
  }

  // Forzar logout sin hacer petición HTTP
  private forceLogout(): void {
    localStorage.removeItem('vetplus_token');
    localStorage.removeItem('vetplus_user');
    this.router.navigate(['/login']);
    window.location.reload(); // Forzar recarga completa para limpiar el estado
  }
}
