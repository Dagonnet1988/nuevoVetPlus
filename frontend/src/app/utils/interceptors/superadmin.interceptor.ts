import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SuperadminAuthService } from '../../services/superadmin-auth.service';

/**
 * Attaches the superadmin JWT to requests targeting /superadmin/*,
 * leaving the regular clinical token untouched.
 */
@Injectable()
export class SuperadminInterceptor implements HttpInterceptor {
  constructor(private svc: SuperadminAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.includes('/superadmin/')) return next.handle(req);

    const token = this.svc.getToken();
    if (!token) return next.handle(req);

    return next.handle(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    }));
  }
}
