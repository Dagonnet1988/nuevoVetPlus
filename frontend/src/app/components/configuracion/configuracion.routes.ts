import { Routes } from '@angular/router';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./configuracion.component').then(m => m.ConfiguracionComponent),
    data: {
      title: 'Configuración del Sistema',
      breadcrumb: 'Configuración'
    }
  },
  {
    path: 'empresa',
    loadComponent: () => import('./empresa/empresa-config.component').then(m => m.EmpresaConfigComponent),
    data: {
      title: 'Configuración de Empresa',
      breadcrumb: 'Empresa'
    }
  },
  {
    path: 'google-calendar',
    loadComponent: () => import('./google-calendar/google-calendar-config.component').then(m => m.GoogleCalendarConfigComponent),
    data: {
      title: 'Configuración de Google Calendar',
      breadcrumb: 'Google Calendar'
    }
  },
  {
    path: 'correo',
    loadComponent: () => import('./email/email-config.component').then(m => m.EmailConfigComponent),
    data: {
      title: 'Configuración de Correo',
      breadcrumb: 'Correo'
    }
  },
  {
    path: 'consentimiento-texto',
    loadComponent: () => import('./consentimiento-texto/consentimiento-texto.component').then(m => m.ConsentimientoTextoComponent),
    data: {
      title: 'Texto de Consentimiento',
      breadcrumb: 'Consentimiento'
    }
  }
];
