import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { LoginRequest, LoginResponse, User, PasswordChangeRequest, ApiResponse } from '../models/auth.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'vetplus_token';
  private readonly REFRESH_TOKEN_KEY = 'vetplus_refresh_token';
  private readonly USER_KEY = 'vetplus_user';
  private readonly THEME_KEY = 'vetplus_theme';

  private storageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private storageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignorar errores de storage (Safari/Firefox en modos restrictivos)
    }
  }

  private storageRemove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar errores de storage
    }
  }

  // Signals para Angular 20 - Estado reactivo
  public currentUser = signal<User | null>(null);
  public authStatus = signal<boolean>(false);
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
          if (!response?.success) {
            return;
          }

          const payload = response?.data ?? response;
          const token = payload?.token;
          const refreshToken = payload?.refreshToken;
          const user = payload?.user;
          const mustChangePassword = !!payload?.must_change_password;

          // Evita bloquear el flujo si el backend cambia el shape del payload.
          if (!token || !refreshToken || !user) {
            throw new Error('Respuesta de login incompleta');
          }

          // Convertir formato del backend al formato esperado por el frontend
          const frontendUser = {
            id_usuario: user.id,
            email: user.email,
            documento: user.documento,
            nombre: user.nombre,
            apellido: user.apellido,
            avatar_url: user.avatar_url,
            rol: user.rol,
            activo: true,
            primer_acceso: mustChangePassword,
            created_at: new Date().toISOString()
          };

          this.setUserSession(token, refreshToken, frontendUser);

          // Redirigir según el estado del usuario
          if (mustChangePassword) {
            this.router.navigate(['/change-password']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }),
        catchError(error => {
          return throwError(() => error);
        }),
        finalize(() => {
          this.loading.set(false);
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
    this.storageRemove(this.TOKEN_KEY);
    this.storageRemove(this.REFRESH_TOKEN_KEY);
    this.storageRemove(this.USER_KEY);
    this.currentUser.set(null);
    this.authStatus.set(false);
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
              this.storageSet(this.USER_KEY, JSON.stringify(updatedUser));
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

  private setUserSession(token: string, refreshToken: string, user: User): void {
    this.storageSet(this.TOKEN_KEY, token);
    this.storageSet(this.REFRESH_TOKEN_KEY, refreshToken);
    this.storageSet(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.authStatus.set(true);
  }

  private loadUserFromStorage(): void {
    try {
      const token = this.storageGet(this.TOKEN_KEY);
      const userJson = this.storageGet(this.USER_KEY);

      if (token && userJson) {
        // Verificar si el token está expirado antes de autenticar
        if (this.isTokenExpired(token)) {
          console.warn('Token expirado encontrado, intentando refresh...');
          // Intentar refresh automático
          this.refreshToken().subscribe({
            next: () => {
              // Si el refresh fue exitoso, cargar usuario
              const user = JSON.parse(userJson);
              this.currentUser.set(user);
              this.authStatus.set(true);
            },
            error: () => {
              // Si el refresh falla, limpiar sesión
              this.clearSession();
            }
          });
        } else {
          const user = JSON.parse(userJson);
          this.currentUser.set(user);
          this.authStatus.set(true);
        }
      } else {
        this.authStatus.set(false);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearSession();
    }
  }

  // Método auxiliar para verificar expiración
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwtPayload(token);
      const expirationTime = payload.exp * 1000;
      return Date.now() >= expirationTime;
    } catch (error) {
      return true; // Si no se puede decodificar, considerar expirado
    }
  }

  getToken(): string | null {
    return this.storageGet(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.storageGet(this.REFRESH_TOKEN_KEY);
  }

  // Verificar si el token está próximo a expirar
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = this.decodeJwtPayload(token);
      const expirationTime = payload.exp * 1000; // Convertir a milisegundos
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Considerar "próximo a expirar" si faltan menos de 5 minutos
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      return true;
    }
  }

  private decodeJwtPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid JWT format');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded));
  }

  // Refrescar token automáticamente
  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout(true);
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>(`${this.API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            const { token, refreshToken: newRefreshToken } = response.data;
            this.storageSet(this.TOKEN_KEY, token);
            this.storageSet(this.REFRESH_TOKEN_KEY, newRefreshToken);
            console.log('Token refrescado automáticamente');
          }
        }),
        catchError(error => {
          console.error('Error refrescando token:', error);
          this.logout(true);
          return throwError(() => error);
        })
      );
  }

  // ===============================
  // VERIFICACIÓN DE AUTENTICACIÓN
  // ===============================

  // Función para compatibilidad con guards (retorna el valor del signal)
  isAuthenticated(): boolean {
    return this.authStatus();
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

  isAuxAdmin(): boolean {
    return this.hasRole('aux');
  }

  isAuxVet(): boolean {
    return this.hasRole('aux');
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

  // ===============================
  // GESTIÓN DE TEMAS
  // ===============================

  setTheme(theme: 'light' | 'dark' | 'blue'): void {
    this.currentTheme.set(theme);
    this.storageSet(this.THEME_KEY, theme);

    // Aplicar clase CSS al body
    document.body.className = document.body.className.replace(/\w*-theme/g, '');
    if (theme !== 'light') {
      document.body.classList.add(`${theme}-theme`);
    }
  }

  loadThemeFromStorage(): void {
    const savedTheme = this.storageGet(this.THEME_KEY) as 'light' | 'dark' | 'blue';
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

  getCurrentUserAvatar(): string {
    const avatar = this.currentUser()?.avatar_url;
    if (!avatar) return '';
    if (/^https?:\/\//i.test(avatar)) return avatar;

    const apiBase = this.API_URL.replace(/\/api\/?$/, '');
    return `${apiBase}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
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
            this.storageSet(this.USER_KEY, JSON.stringify(response.data));
          }
        })
      );
  }
}
