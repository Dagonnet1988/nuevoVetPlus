export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface User {
  id_usuario: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'vet' | 'aux';  // Roles ajustados
  activo: boolean;
  primer_acceso: boolean; // Para forzar cambio de contraseña
  created_at: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
}

// Interfaces para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Interface para manejo de errores
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}