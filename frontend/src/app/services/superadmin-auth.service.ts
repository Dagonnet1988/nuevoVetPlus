import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SuperadminProfile {
  id_superadmin: string;
  email: string;
  nombre: string;
}

export interface TenantStats {
  id_tenant: string;
  slug: string;
  nombre: string;
  plan: string;
  estado: string;
  max_usuarios: number;
  periodicidad_pago: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | null;
  fecha_inicio_suscripcion: string | null;
  fecha_proximo_pago: string | null;
  created_at: string;
  total_usuarios: number;
  total_clientes: number;
  total_mascotas: number;
  total_citas: number;
  ultimo_acceso: string | null;
}

export interface TenantDetail extends TenantStats {
  usuarios: {
    id_usuario: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    activo: boolean;
    ultimo_login: string | null;
  }[];
}

export interface CreateTenantPayload {
  slug: string;
  nombre: string;
  plan: string;
  max_usuarios: number;
  admin: {
    nombre: string;
    apellido: string;
    email: string;
    documento: string;
    password: string;
  };
}

@Injectable({ providedIn: 'root' })
export class SuperadminAuthService {
  private readonly API = `${environment.apiUrl}/superadmin`;
  private readonly TOKEN_KEY = 'vetplus_superadmin_token';
  private readonly PROFILE_KEY = 'vetplus_superadmin_profile';

  public profile = signal<SuperadminProfile | null>(null);
  public isAuthenticated = signal<boolean>(false);

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const raw = localStorage.getItem(this.PROFILE_KEY);
    if (token && raw) {
      try {
        this.profile.set(JSON.parse(raw));
        this.isAuthenticated.set(true);
      } catch {
        this.clearSession();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.API}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.PROFILE_KEY, JSON.stringify(res.superadmin));
        this.profile.set(res.superadmin);
        this.isAuthenticated.set(true);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/superadmin/login']);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.PROFILE_KEY);
    this.profile.set(null);
    this.isAuthenticated.set(false);
  }

  // ── API calls ────────────────────────────────────────────────────────────────
  listTenants(): Observable<TenantStats[]> {
    return this.http.get<{ data: TenantStats[] }>(`${this.API}/tenants`).pipe(
      map(res => res.data)
    );
  }

  getTenant(id: string): Observable<TenantDetail> {
    return this.http.get<{ tenant: TenantDetail; usuarios: TenantDetail['usuarios'] }>(`${this.API}/tenants/${id}`).pipe(
      map(res => ({ ...res.tenant, usuarios: res.usuarios }))
    );
  }

  createTenant(payload: CreateTenantPayload): Observable<any> {
    return this.http.post<any>(`${this.API}/tenants`, payload);
  }

  updateTenant(id: string, changes: Partial<Pick<TenantStats, 'nombre' | 'plan' | 'estado' | 'max_usuarios' | 'periodicidad_pago' | 'fecha_inicio_suscripcion' | 'fecha_proximo_pago'>>): Observable<any> {
    return this.http.patch<any>(`${this.API}/tenants/${id}`, changes);
  }

  changePassword(passwordActual: string, passwordNuevo: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/me/password`, {
      password_actual: passwordActual,
      password_nuevo: passwordNuevo
    });
  }
}
