import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===============================
// INTERFACES DE USUARIOS
// ===============================

export interface Usuario {
  id_usuario: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: string;
  documento: string;
  tipo_documento: 'CC' | 'CE' | 'TI' | 'PP';
  rol: 'admin' | 'vet' | 'aux';
  especialidad?: string;
  numero_licencia?: string;
  activo: boolean;
  ultimo_login?: string;
  created_at: string;
  updated_at?: string;
  password_temporal?: boolean;
  debe_cambiar_password?: boolean;
  // Campos opcionales que pueden no venir del backend
  avatar_url?: string;
  firma_url?: string;
  configuraciones?: ConfiguracionUsuario;
  estadisticas?: EstadisticasUsuario;
}

export interface ConfiguracionUsuario {
  tema: 'claro' | 'oscuro' | 'auto';
  idioma: 'es' | 'en';
  timezone: string;
  notificaciones_email: boolean;
  notificaciones_push: boolean;
  formato_fecha: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  formato_hora: '12h' | '24h';
  items_por_pagina: number;
  dashboard_personalizado: any[];
}

export interface EstadisticasUsuario {
  total_citas: number;
  total_consultas: number;
  total_pacientes_atendidos: number;
  horas_trabajadas: number;
  calificacion_promedio: number;
  sesiones_activas: number;
  ultimo_login: string;
}

export interface CreateUsuarioRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: string;
  documento: string;
  tipo_documento: 'CC' | 'CE' | 'TI' | 'PP';
  rol: 'admin' | 'vet' | 'aux';
  especialidad?: string;
  numero_licencia?: string;
  password_temporal?: string;
  enviar_credenciales?: boolean;
}

export interface UpdateUsuarioRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  documento?: string;
  tipo_documento?: 'CC' | 'CE' | 'TI' | 'PP';
  rol?: 'admin' | 'vet' | 'aux';
  especialidad?: string;
  numero_licencia?: string;
  activo?: boolean;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nueva: string;
  password_confirmacion: string;
}

export interface ResetPasswordRequest {
  id_usuario: string;
  password_temporal: string;
  enviar_email: boolean;
}

// ===============================
// ROLES Y PERMISOS
// ===============================

export interface Rol {
  codigo: 'admin' | 'vet' | 'aux';
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
  activo: boolean;
}

export interface Permiso {
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  acciones: AccionPermiso[];
}

export interface AccionPermiso {
  accion: 'crear' | 'leer' | 'actualizar' | 'eliminar';
  permitido: boolean;
}

export interface AsignarRolRequest {
  id_usuario: string;
  rol: 'admin' | 'vet' | 'aux';
  motivo?: string;
}

// ===============================
// LOGS DE ACTIVIDAD
// ===============================

export interface LogActividad {
  id_log: string;
  id_usuario: string;
  usuario_nombre: string;
  accion: string;
  modulo: string;
  descripcion: string;
  ip_address: string;
  user_agent: string;
  metadatos?: any;
  fecha: string;
  tipo: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'error';
  resultado: 'exitoso' | 'fallido' | 'pendiente';
}

export interface FiltroLogsActividad {
  id_usuario?: string;
  accion?: string;
  modulo?: string;
  tipo?: string;
  resultado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
}

// ===============================
// SESIONES Y SEGURIDAD
// ===============================

export interface SesionActiva {
  id_sesion: string;
  id_usuario: string;
  usuario_nombre: string;
  ip_address: string;
  user_agent: string;
  ubicacion?: string;
  fecha_inicio: string;
  fecha_logout?: string | null;
  ultima_actividad: string;
  duracion_segundos?: number;
  dispositivo: string;
  navegador: string;
  activa: boolean;
}

export interface FiltroSesiones {
  id_usuario?: string;
  estado?: 'activas' | 'cerradas' | 'todas';
  search?: string;
  exclude_admins?: boolean;
}

export interface ConfiguracionSeguridad {
  max_sesiones_simultaneas: number;
  tiempo_inactividad_minutos: number;
  requerir_2fa: boolean;
  longitud_minima_password: number;
  requerir_mayusculas: boolean;
  requerir_numeros: boolean;
  requerir_simbolos: boolean;
  dias_expiracion_password: number;
  intentos_login_maximos: number;
  tiempo_bloqueo_minutos: number;
}

// ===============================
// FILTROS Y BÚSQUEDA
// ===============================

export interface FiltroUsuarios {
  rol?: string;
  activo?: boolean;
  primer_acceso?: boolean;
  especialidad?: string;
  search?: string;
  fecha_creacion_inicio?: string;
  fecha_creacion_fin?: string;
  ultimo_acceso_desde?: string;
}

export interface ResumenUsuarios {
  total_usuarios: number;
  usuarios_activos: number;
  usuarios_inactivos: number;
  usuarios_primer_acceso: number;
  distribución_roles: DistribucionRol[];
  nuevos_este_mes: number;
  sesiones_activas: number;
}

export interface DistribucionRol {
  rol: string;
  cantidad: number;
  porcentaje: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  // ===============================
  // GESTIÓN DE USUARIOS
  // ===============================

  getUsuarios(page: number = 1, limit: number = 50, filtros?: FiltroUsuarios): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.API_URL}/users`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Si la data viene paginada
          if (Array.isArray(response.data)) {
            return response.data;
          }
          if (Array.isArray(response.data.items)) {
            return response.data.items;
          }
          return response.data;
        }
        throw new Error('Error obteniendo usuarios');
      })
    );
  }

  getUsuario(id: string): Observable<Usuario> {
    return this.http.get<any>(`${this.API_URL}/users/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Usuario no encontrado');
      })
    );
  }

  createUsuario(usuario: CreateUsuarioRequest): Observable<Usuario> {
    return this.http.post<any>(`${this.API_URL}/users`, usuario).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error creando usuario');
      })
    );
  }

  updateUsuario(id: string, usuario: UpdateUsuarioRequest): Observable<Usuario> {
    return this.http.put<any>(`${this.API_URL}/users/${id}`, usuario).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error actualizando usuario');
      })
    );
  }

  toggleUsuarioEstado(id: string, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/users/${id}/estado`, { activo });
  }

  deleteUsuario(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/users/${id}`);
  }

  // ===============================
  // GESTIÓN DE CONTRASEÑAS
  // ===============================

  cambiarPassword(id: string, request: CambiarPasswordRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/users/${id}/cambiar-password`, request);
  }

  // Métodos de administrador para reseteo de contraseñas
  generarPasswordTemporal(userId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/generate-temp-password`, { userId: userId });
  }

  resetearPasswordAdmin(userId: string, nuevaPassword: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/reset-password`, {
      userId: userId,
      newPassword: nuevaPassword
    });
  }

  forzarCambioPassword(userId: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/force-password-change/${userId}`, {});
  }

  // Método legacy - mantener por compatibilidad
  resetearPassword(request: ResetPasswordRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/users/resetear-password`, request);
  }

  enviarPasswordTemporal(id: string): Observable<any> {
    return this.generarPasswordTemporal(id);
  }

  // ===============================
  // ROLES Y PERMISOS
  // ===============================

  getRoles(): Observable<Rol[]> {
    return this.http.get<any>(`${this.API_URL}/roles`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  getPermisos(): Observable<Permiso[]> {
    return this.http.get<any>(`${this.API_URL}/permisos`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  asignarRol(request: AsignarRolRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/users/asignar-rol`, request);
  }

  getPermisosUsuario(id: string): Observable<Permiso[]> {
    return this.http.get<any>(`${this.API_URL}/users/${id}/permisos`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  // ===============================
  // LOGS DE ACTIVIDAD
  // ===============================

  getLogsActividad(page: number = 1, limit: number = 50, filtros?: FiltroLogsActividad): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.API_URL}/logs-actividad`, { params });
  }

  getLogsUsuario(id: string, page: number = 1, limit: number = 50): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/usuarios/${id}/logs`, { params });
  }

  // ===============================
  // SESIONES ACTIVAS
  // ===============================

  getSesionesActivas(filtros?: FiltroSesiones): Observable<SesionActiva[]> {
    let params = new HttpParams();
    if (filtros?.id_usuario) {
      params = params.set('id_usuario', filtros.id_usuario);
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.exclude_admins !== undefined) {
      params = params.set('exclude_admins', String(filtros.exclude_admins));
    }

    return this.http.get<any>(`${this.API_URL}/sesiones-activas`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  cerrarSesion(id_sesion: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/sesiones/${id_sesion}`);
  }

  cerrarTodasLasSesiones(id_usuario: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/usuarios/${id_usuario}/sesiones`);
  }

  uploadFirma(id_usuario: string, file: File): Observable<{ firma_url: string }> {
    const formData = new FormData();
    formData.append('firma', file);
    return this.http.post<any>(`${this.API_URL}/users/${id_usuario}/firma`, formData).pipe(
      map(r => r.data)
    );
  }

  uploadAvatar(id_usuario: string, file: File): Observable<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<any>(`${this.API_URL}/users/${id_usuario}/avatar`, formData).pipe(
      map(r => r.data)
    );
  }

  // ===============================
  // CONFIGURACIÓN Y SEGURIDAD
  // ===============================

  getConfiguracionSeguridad(): Observable<ConfiguracionSeguridad> {
    return this.http.get<any>(`${this.API_URL}/configuracion-seguridad`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo configuración de seguridad');
      })
    );
  }

  updateConfiguracionSeguridad(config: Partial<ConfiguracionSeguridad>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/configuracion-seguridad`, config);
  }

  // ===============================
  // ESTADÍSTICAS Y RESÚMENES
  // ===============================

  getResumenUsuarios(): Observable<ResumenUsuarios> {
    return this.http.get<any>(`${this.API_URL}/users/stats`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          const stats = response.data;
          return {
            total_usuarios: stats.total_usuarios || 0,
            usuarios_activos: stats.usuarios_activos || 0,
            usuarios_inactivos: stats.usuarios_inactivos || 0,
            usuarios_primer_acceso: 0, // No disponible en backend
            distribución_roles: [
              { rol: 'admin', cantidad: stats.administradores || 0, porcentaje: this.calcularPorcentaje(stats.administradores, stats.total_usuarios) },
              { rol: 'vet', cantidad: stats.veterinarios || 0, porcentaje: this.calcularPorcentaje(stats.veterinarios, stats.total_usuarios) },
              { rol: 'aux', cantidad: stats.auxiliares || 0, porcentaje: this.calcularPorcentaje(stats.auxiliares, stats.total_usuarios) }
            ],
            nuevos_este_mes: 0, // No disponible en backend
            sesiones_activas: stats.usuarios_activos_semana || 0
          };
        }
        throw new Error('Error obteniendo estadísticas de usuarios');
      })
    );
  }

  getEstadisticasUsuario(id: string): Observable<EstadisticasUsuario> {
    return this.http.get<any>(`${this.API_URL}/users/${id}/estadisticas`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo estadísticas del usuario');
      })
    );
  }

  // ===============================
  // CONFIGURACIÓN DE USUARIO
  // ===============================

  getConfiguracionUsuario(id: string): Observable<ConfiguracionUsuario> {
    return this.http.get<any>(`${this.API_URL}/users/${id}/configuracion`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return this.getConfiguracionDefecto();
      })
    );
  }

  updateConfiguracionUsuario(id: string, config: Partial<ConfiguracionUsuario>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/users/${id}/configuracion`, config);
  }

  // ===============================
  // UTILIDADES
  // ===============================

  private calcularPorcentaje(cantidad: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((cantidad / total) * 100 * 100) / 100; // Redondear a 2 decimales
  }

  validarEmail(email: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('email', email);
    if (excludeId) {
      params = params.set('exclude_id', excludeId);
    }

    return this.http.get<any>(`${this.API_URL}/validar-email`, { params }).pipe(
      map((response: any) => response.disponible || false)
    );
  }

  validarDocumento(documento: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('documento', documento);
    if (excludeId) {
      params = params.set('exclude_id', excludeId);
    }

    return this.http.get<any>(`${this.API_URL}/validar-documento`, { params }).pipe(
      map((response: any) => response.disponible || false)
    );
  }

  generarPasswordString(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  formatearRol(rol: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      vet: 'Veterinario',
      aux: 'Auxiliar'
    };
    return roles[rol] || rol;
  }

  formatearTipoDocumento(tipo: string): string {
    const tipos = {
      CC: 'Cédula de Ciudadanía',
      CE: 'Cédula de Extranjería',
      Pasaporte: 'Pasaporte'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  }

  getColorRol(rol: string): string {
    const colores: Record<string, string> = {
      admin: '#f44336',
      vet: '#2196f3',
      aux: '#4caf50'
    };
    return colores[rol] || '#666';
  }

  getIconoRol(rol: string): string {
    const iconos: Record<string, string> = {
      admin: 'admin_panel_settings',
      vet: 'medical_services',
      aux: 'support_agent'
    };
    return iconos[rol] || 'person';
  }


  private getConfiguracionDefecto(): ConfiguracionUsuario {
    return {
      tema: 'claro',
      idioma: 'es',
      timezone: 'America/Bogota',
      notificaciones_email: true,
      notificaciones_push: true,
      formato_fecha: 'DD/MM/YYYY',
      formato_hora: '24h',
      items_por_pagina: 25,
      dashboard_personalizado: []
    };
  }
}
