import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, User, PasswordChangeRequest, ApiResponse } from '../models/auth.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'vetplus_token';
  private readonly USER_KEY = 'vetplus_user';
  private readonly THEME_KEY = 'vetplus_theme';

  // Signals para Angular 20 - Estado reactivo
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public currentTheme = signal<string>('light');
  public loading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
    this.loadThemeFromStorage();
  }

  // ===============================
  // AUTENTICACIÓN
  // ===============================

  login(credentials: LoginRequest): Observable<any> {
    this.loading.set(true);

    return this.http.post<any>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Extraer token y user de response.data
            const { token, user, must_change_password } = response.data;

            // Convertir formato del backend al formato esperado por el frontend
            const frontendUser = {
              id_usuario: user.id,
              email: user.email,
              documento: user.documento,
              nombre: user.nombre,
              apellido: user.apellido,
              rol: user.rol,
              activo: true,
              primer_acceso: must_change_password || false,
              created_at: new Date().toISOString()
            };

            this.setUserSession(token, frontendUser);

            // Redirigir según el estado del usuario
            if (must_change_password) {
              this.router.navigate(['/change-password']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          }
          this.loading.set(false);
        }),
        catchError(error => {
          this.loading.set(false);
          return throwError(() => error);
        })
      );
  }

  logout(skipServerCall: boolean = false): void {
    if (skipServerCall) {
      // Logout forzado sin llamar al servidor (para evitar bucles)
      this.clearSession();
      return;
    }

    // Llamar al endpoint de logout en el backend
    this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
      next: () => {
        this.clearSession();
      },
      error: () => {
        // Limpiar sesión local aunque falle el servidor
        this.clearSession();
      }
    });
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  // ===============================
  // CAMBIO DE CONTRASEÑA (Primer acceso)
  // ===============================

  changePassword(passwordData: PasswordChangeRequest): Observable<ApiResponse> {
    this.loading.set(true);

    return this.http.put<ApiResponse>(`${this.API_URL}/auth/change-password`, passwordData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Actualizar el usuario para marcar que ya no es primer acceso
            const currentUser = this.currentUser();
            if (currentUser) {
              const updatedUser = { ...currentUser, primer_acceso: false };
              this.currentUser.set(updatedUser);
              localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
            }
          }
          this.loading.set(false);
        }),
        catchError(error => {
          this.loading.set(false);
          return throwError(() => error);
        })
      );
  }

  mustChangePassword(): boolean {
    const user = this.currentUser();
    return user?.primer_acceso || false;
  }

  // ===============================
  // GESTIÓN DE SESIÓN
  // ===============================

  private setUserSession(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  private loadUserFromStorage(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const userJson = localStorage.getItem(this.USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } else {
        this.isAuthenticated.set(false);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearSession();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Verificar si el token está próximo a expirar
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convertir a milisegundos
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Considerar "próximo a expirar" si faltan menos de 5 minutos
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      return true;
    }
  }

  // ===============================
  // VERIFICACIÓN DE ROLES
  // ===============================

  hasRole(role: 'admin' | 'vet' | 'aux'): boolean {
    const user = this.currentUser();
    return user?.rol === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isVet(): boolean {
    return this.hasRole('vet');
  }

  isAux(): boolean {
    return this.hasRole('aux');
  }

  // Verificar múltiples roles
  hasAnyRole(roles: ('admin' | 'vet' | 'aux')[]): boolean {
    const user = this.currentUser();
    return roles.includes(user?.rol as any);
  }

  // Verificar si puede acceder a funciones administrativas
  canAccessAdmin(): boolean {
    return this.isAdmin();
  }

  // Verificar si puede realizar consultas médicas
  canAccessMedical(): boolean {
    return this.hasAnyRole(['admin', 'vet']);
  }

  // Verificar si puede acceder a funciones financieras
  canAccessFinancial(): boolean {
    return this.hasAnyRole(['admin', 'aux']);
  }

  // ===============================
  // GESTIÓN DE TEMAS
  // ===============================

  setTheme(theme: 'light' | 'dark' | 'blue'): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);

    // Aplicar clase CSS al body
    document.body.className = document.body.className.replace(/\w*-theme/g, '');
    if (theme !== 'light') {
      document.body.classList.add(`${theme}-theme`);
    }
  }

  loadThemeFromStorage(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as 'light' | 'dark' | 'blue';
    this.setTheme(savedTheme || 'light');
  }

  toggleTheme(): void {
    const currentTheme = this.currentTheme();
    const themes: ('light' | 'dark' | 'blue')[] = ['light', 'dark', 'blue'];
    const currentIndex = themes.indexOf(currentTheme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  // ===============================
  // UTILIDADES
  // ===============================

  getCurrentUserName(): string {
    return this.currentUser()?.nombre || 'Usuario';
  }

  getCurrentUserEmail(): string {
    return this.currentUser()?.email || '';
  }

  getCurrentUserRole(): string {
    const role = this.currentUser()?.rol;
    switch (role) {
      case 'admin': return 'Administrador';
      case 'vet': return 'Veterinario';
      case 'aux': return 'Auxiliar';
      default: return 'Usuario';
    }
  }

  // Verificar si el usuario está activo
  isUserActive(): boolean {
    return this.currentUser()?.activo || false;
  }

  // Refrescar información del usuario
  refreshUserInfo(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/auth/me`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentUser.set(response.data);
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
          }
        })
      );
  }
}
