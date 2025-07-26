import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

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

    // Agregar headers adicionales
    authReq = authReq.clone({
      headers: authReq.headers
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Manejar errores de autenticación
        if (error.status === 401) {
          // Token expirado o inválido
          console.warn('Token expirado o inválido, cerrando sesión...');
          this.authService.logout();
          return throwError(() => error);
        }

        if (error.status === 403) {
          // Sin permisos
          console.warn('Acceso denegado - Sin permisos suficientes');
          this.router.navigate(['/dashboard']);
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
}