# 🚀 SESIÓN 1: Setup y Configuración Inicial
## Angular 20 + Material Design + Multi-Tema

---

## ✅ **OBJETIVOS DE LA SESIÓN**
- ✅ Crear proyecto Angular 20 con Standalone Components
- ✅ Configurar Angular Material 20 con sistema multi-tema
- ✅ Configurar solo login (sin registro público)
- ✅ Estructurar proyecto modular optimizado
- ✅ Configurar proxy para desarrollo

---

## 🔧 **COMANDOS DE INSTALACIÓN**

### **1. Verificar Versiones**
```bash
# Verificar Angular CLI
ng version

# Si no tienes Angular 20, actualizar
npm install -g @angular/cli@latest
```

### **2. Crear Proyecto**
```bash
# Crear proyecto VetPlus Frontend
ng new vetplus-frontend --routing --style=scss --standalone

cd vetplus-frontend

# Verificar que sea Angular 20+
ng version
```

### **3. Instalar Angular Material 20**
```bash
# Instalar Angular Material
ng add @angular/material

# Seleccionar:
# - Theme: Custom (crearemos nuestros temas)
# - Typography: Yes
# - Animations: Yes
```

### **4. Dependencias Adicionales**
```bash
# Instalar dependencias para el proyecto
npm install @angular/cdk rxjs chart.js ng2-charts

# DevDependencies
npm install --save-dev @types/chart.js
```

---

## 📁 **ESTRUCTURA DE PROYECTO**

```
src/
├── app/
│   ├── core/                    # Servicios singleton y configuración
│   │   ├── auth/               # Servicios de autenticación
│   │   ├── guards/             # Guards de rutas
│   │   ├── interceptors/       # HTTP interceptors
│   │   ├── services/           # Servicios core
│   │   └── models/             # Interfaces y tipos
│   ├── shared/                 # Componentes compartidos
│   │   ├── components/         # Componentes reutilizables
│   │   ├── pipes/              # Pipes personalizados
│   │   ├── directives/         # Directivas personalizadas
│   │   └── utils/              # Utilidades
│   ├── features/               # Módulos de funcionalidades
│   │   ├── auth/               # Solo login (sin registro)
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── clinical/           # Módulo clínico
│   │   ├── financial/          # Módulo financiero
│   │   └── admin/              # Panel administrativo
│   ├── layouts/                # Layouts de la aplicación
│   │   ├── auth-layout/        # Layout para login
│   │   └── main-layout/        # Layout principal
│   └── assets/                 # Recursos estáticos
│       ├── images/
│       ├── icons/
│       └── i18n/
├── styles/                     # SCSS globales
│   ├── _variables.scss         # Variables SCSS
│   ├── _themes.scss            # Definición de temas
│   ├── _mixins.scss            # Mixins reutilizables
│   └── styles.scss            # Estilos globales
└── environments/               # Configuración de entornos
    ├── environment.ts          # Desarrollo
    └── environment.prod.ts     # Producción
```

---

## 🎨 **CONFIGURACIÓN DE TEMAS MÚLTIPLES**

### **1. Crear Variables SCSS** (`src/styles/_variables.scss`)
```scss
// ===============================
// VETPLUS - VARIABLES DE DISEÑO
// ===============================

// Colores base del sistema
$vetplus-primary-color: #2E7D32;      // Verde veterinario profesional
$vetplus-accent-color: #FF8F00;       // Naranja cálido para acciones
$vetplus-warn-color: #D32F2F;         // Rojo para alertas y errores
$vetplus-success-color: #388E3C;      // Verde para éxito
$vetplus-info-color: #1976D2;         // Azul para información

// Grises y neutros
$vetplus-background: #FAFAFA;         // Fondo principal claro
$vetplus-surface: #FFFFFF;            // Superficie de cards y componentes
$vetplus-text-primary: #212121;       // Texto principal
$vetplus-text-secondary: #757575;     // Texto secundario
$vetplus-divider: #E0E0E0;           // Líneas y divisores

// Colores de estado específicos para veterinaria
$vet-healthy: #4CAF50;               // Estado saludable
$vet-sick: #FF5722;                  // Estado enfermo  
$vet-treatment: #FF9800;             // En tratamiento
$vet-recovered: #8BC34A;             // Recuperado
$vet-emergency: #F44336;             // Emergencia

// Espaciado consistente
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-xxl: 48px;

// Bordes y sombras
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;
$border-radius-xl: 16px;

// Sombras predefinidas
$shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
$shadow-md: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
$shadow-lg: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);

// Breakpoints responsivos
$breakpoint-xs: 599px;
$breakpoint-sm: 959px;
$breakpoint-md: 1279px;
$breakpoint-lg: 1919px;

// Z-index layering
$z-index-dropdown: 1000;
$z-index-sticky: 1020;
$z-index-fixed: 1030;
$z-index-modal-backdrop: 1040;
$z-index-modal: 1050;
$z-index-popover: 1060;
$z-index-tooltip: 1070;
```

### **2. Crear Temas Múltiples** (`src/styles/_themes.scss`)
```scss
@use '@angular/material' as mat;

// Incluir el core de Material Design
@include mat.core();

// ===============================
// TEMA PRINCIPAL - VERDE VETERINARIO
// ===============================
$vetplus-primary: mat.define-palette(mat.$green-palette, 800);
$vetplus-accent: mat.define-palette(mat.$orange-palette, 600);
$vetplus-warn: mat.define-palette(mat.$red-palette);

$vetplus-light-theme: mat.define-light-theme((
  color: (
    primary: $vetplus-primary,
    accent: $vetplus-accent,
    warn: $vetplus-warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

// ===============================
// TEMA OSCURO - PARA TRABAJO NOCTURNO
// ===============================
$vetplus-dark-theme: mat.define-dark-theme((
  color: (
    primary: $vetplus-primary,
    accent: $vetplus-accent,
    warn: $vetplus-warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

// ===============================
// TEMA AZUL - ALTERNATIVO FORMAL
// ===============================
$vetplus-blue-primary: mat.define-palette(mat.$blue-palette, 700);
$vetplus-blue-accent: mat.define-palette(mat.$amber-palette, 600);

$vetplus-blue-theme: mat.define-light-theme((
  color: (
    primary: $vetplus-blue-primary,
    accent: $vetplus-blue-accent,
    warn: $vetplus-warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

// ===============================
// APLICAR TEMAS CON CLASES
// ===============================

// Tema principal (por defecto)
@include mat.all-component-themes($vetplus-light-theme);

// Tema oscuro
.dark-theme {
  @include mat.all-component-colors($vetplus-dark-theme);
}

// Tema azul
.blue-theme {
  @include mat.all-component-colors($vetplus-blue-theme);
}
```

### **3. Configurar Estilos Globales** (`src/styles/styles.scss`)
```scss
@import 'variables';
@import 'themes';

// Reset básico
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', sans-serif;
  margin: 0;
  background-color: $vetplus-background;
  color: $vetplus-text-primary;
}

// Clases de utilidad
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-left { text-align: left; }

.mt-xs { margin-top: $spacing-xs; }
.mt-sm { margin-top: $spacing-sm; }
.mt-md { margin-top: $spacing-md; }
.mt-lg { margin-top: $spacing-lg; }

.mb-xs { margin-bottom: $spacing-xs; }
.mb-sm { margin-bottom: $spacing-sm; }
.mb-md { margin-bottom: $spacing-md; }
.mb-lg { margin-bottom: $spacing-lg; }

.p-xs { padding: $spacing-xs; }
.p-sm { padding: $spacing-sm; }
.p-md { padding: $spacing-md; }
.p-lg { padding: $spacing-lg; }

// Estados de veterinaria
.status-healthy { color: $vet-healthy; }
.status-sick { color: $vet-sick; }
.status-treatment { color: $vet-treatment; }
.status-recovered { color: $vet-recovered; }
.status-emergency { color: $vet-emergency; }

// Clases de fondo para estados
.bg-healthy { background-color: rgba($vet-healthy, 0.1); }
.bg-sick { background-color: rgba($vet-sick, 0.1); }
.bg-treatment { background-color: rgba($vet-treatment, 0.1); }
.bg-emergency { background-color: rgba($vet-emergency, 0.1); }
```

---

## 🔐 **CONFIGURACIÓN DE AUTENTICACIÓN (Solo Login)**

### **1. Interfaces** (`src/app/core/models/auth.interface.ts`)
```typescript
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
  rol: 'admin' | 'vet' | 'auxiliar';
  activo: boolean;
  primer_acceso: boolean; // Para forzar cambio de contraseña
  created_at: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
```

### **2. Servicio de Autenticación** (`src/app/core/auth/auth.service.ts`)
```typescript
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { LoginRequest, LoginResponse, User, PasswordChangeRequest } from '../models/auth.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'vetplus_token';
  private readonly USER_KEY = 'vetplus_user';

  // Signals para Angular 20
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public currentTheme = signal<string>('light');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  // ===============================
  // AUTENTICACIÓN
  // ===============================

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            this.setUserSession(response.token, response.user);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  // ===============================
  // CAMBIO DE CONTRASEÑA (Primer acceso)
  // ===============================

  changePassword(passwordData: PasswordChangeRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/auth/change-password`, passwordData);
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
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // ===============================
  // UTILIDADES
  // ===============================

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.rol === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isVet(): boolean {
    return this.hasRole('vet');
  }

  // ===============================
  // GESTIÓN DE TEMAS
  // ===============================

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    localStorage.setItem('vetplus_theme', theme);
    
    // Aplicar clase CSS al body
    document.body.className = document.body.className.replace(/\w*-theme/g, '');
    if (theme !== 'light') {
      document.body.classList.add(`${theme}-theme`);
    }
  }

  loadThemeFromStorage(): void {
    const savedTheme = localStorage.getItem('vetplus_theme') || 'light';
    this.setTheme(savedTheme);
  }
}
```

---

## 🌍 **CONFIGURACIÓN DE ENTORNOS**

### **1. Desarrollo** (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appName: 'VetPlus',
  version: '1.0.0',
  defaultTheme: 'light',
  enableDebug: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
  paginationDefaults: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  }
};
```

### **2. Producción** (`src/environments/environment.prod.ts`)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.vetplus.com/api', // URL de producción
  appName: 'VetPlus',
  version: '1.0.0',
  defaultTheme: 'light',
  enableDebug: false,
  maxFileSize: 5 * 1024 * 1024,
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
  paginationDefaults: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  }
};
```

---

## 🔧 **CONFIGURACIÓN DEL PROXY**

### **Crear proxy.conf.json**
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### **Actualizar angular.json**
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

- [ ] ✅ Proyecto Angular 20 creado
- [ ] ✅ Angular Material 20 instalado y configurado
- [ ] ✅ Sistema multi-tema implementado
- [ ] ✅ Estructura de carpetas modular creada
- [ ] ✅ Variables SCSS y temas configurados
- [ ] ✅ AuthService con solo login implementado
- [ ] ✅ Interfaces de TypeScript definidas
- [ ] ✅ Entornos de desarrollo/producción configurados
- [ ] ✅ Proxy para backend configurado

---

## 🚀 **COMANDOS PARA PROBAR**

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo con proxy
ng serve

# Acceder a la aplicación
# http://localhost:4200
```

---

## 📝 **PRÓXIMOS PASOS (Sesión 2)**

En la siguiente sesión implementaremos:
- ✅ **Componente de Login** (sin registro)
- ✅ **Guards de autenticación** y roles
- ✅ **Interceptor HTTP** para tokens
- ✅ **Manejo de primer acceso** (cambio de contraseña obligatorio)
- ✅ **Layout principal** con sidebar

**¿Estás listo para comenzar con la instalación? 🤔**