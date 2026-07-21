import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isLoggingOut = false; // Flag para evitar bucles
  private isRefreshing = false; // Flag para evitar múltiples refresh simultáneos
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Las rutas del panel de superadmin usan su propio interceptor
    if (req.url.includes('/superadmin/')) return next.handle(req);

    // Agregar token JWT a todas las requests (excepto login)
    let authReq = req;
    const token = this.authService.getToken();

    if (token && !req.url.includes('/auth/login')) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    // Agregar X-Tenant-Slug solo en entornos con subdominio real (no localhost/dev)
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    if (!isLocal) {
      const tenantSlug = hostname.split('.')[0];
      authReq = authReq.clone({
        headers: authReq.headers.set('X-Tenant-Slug', tenantSlug)
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
        // Error funcional de Google Calendar (OAuth invalid_grant):
        // no implica sesión inválida de VetPlus, por lo tanto NO cerrar sesión.
        if (this.isGoogleCalendarReauthError(error, req)) {
          return throwError(() => error);
        }

        // Manejar errores de autenticación
        if (error.status === 401 && !this.isLoggingOut) {
          // Verificar si es un error de token expirado (no de credenciales inválidas)
          if (this.isTokenExpiredError(error)) {
            return this.handleTokenExpired(req, next);
          } else {
            // Credenciales inválidas o error de autenticación general
            console.warn('Error de autenticación, cerrando sesión...');
            this.forceLogout();
            return throwError(() => error);
          }
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
    localStorage.removeItem('vetplus_refresh_token');
    localStorage.removeItem('vetplus_user');
    this.router.navigate(['/login']);
    window.location.reload(); // Forzar recarga completa para limpiar el estado
  }

  // Mostrar mensaje de sesión expirada
  private showSessionExpiredMessage(): void {
    this.snackBar.open(
      'Su sesión ha expirado por seguridad. Por favor, inicie sesión nuevamente.',
      'Entendido',
      {
        duration: 6000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['session-expired-snackbar']
      }
    );
  }

  // Verificar si el error es por token expirado
  private isTokenExpiredError(error: HttpErrorResponse): boolean {
    // Verificar mensaje de error o código específico
    const errorMessage = error.error?.message || '';
    const errorCode = error.error?.error;

    return errorCode === 'INVALID_TOKEN' ||
           errorMessage.includes('expirado') ||
           errorMessage.includes('expired');
  }

  // Detecta errores de OAuth de Google Calendar sin afectar la sesión de VetPlus
  private isGoogleCalendarReauthError(error: HttpErrorResponse, req: HttpRequest<any>): boolean {
    const isGoogleCalendarEndpoint = req.url.includes('/google-calendar/');
    if (!isGoogleCalendarEndpoint) return false;

    const backendCode = String(error?.error?.code || '').toUpperCase();
    const backendRequiresReauth = error?.error?.requires_reauth === true;
    const backendError = String(error?.error?.error || '').toLowerCase();
    const backendMessage = String(error?.error?.message || '').toLowerCase();

    return backendCode === 'GOOGLE_REAUTH_REQUIRED'
      || backendRequiresReauth
      || backendError.includes('invalid_grant')
      || backendMessage.includes('invalid_grant');
  }

  // Manejar token expirado intentando refresh
  private handleTokenExpired(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap(() => {
          this.isRefreshing = false;
          const newToken = this.authService.getToken();
          this.refreshTokenSubject.next(newToken);

          // Reintentar la petición original con el nuevo token
          const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${newToken}`)
          });

          return next.handle(authReq);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);

          // Si el refresh falla, mostrar mensaje y hacer logout
          console.warn('Refresh token expirado, sesión finalizada por seguridad');
          this.showSessionExpiredMessage();
          this.forceLogout();
          return throwError(() => err);
        })
      );
    } else {
      // Si ya hay un refresh en proceso, esperar a que termine
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(() => {
          const newToken = this.authService.getToken();
          const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${newToken}`)
          });
          return next.handle(authReq);
        })
      );
    }
  }
}
