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
    loadComponent: () => import('./google-calendar-simple/google-calendar-simple.component').then(m => m.GoogleCalendarSimpleComponent),
    data: {
      title: 'Configuración de Google Calendar',
      breadcrumb: 'Google Calendar'
    }
  },
  {
    path: 'whatsapp',
    loadComponent: () => import('./whatsapp/whatsapp-config.component').then(m => m.WhatsAppConfigComponent),
    data: {
      title: 'Configuración de WhatsApp',
      breadcrumb: 'WhatsApp'
    }
  }
];
