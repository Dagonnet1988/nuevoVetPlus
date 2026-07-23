export const environment = {
  production: true,
  apiUrl: 'https://api.ramelo.app/api', // URL de producción
  backendUrl: 'https://api.ramelo.app',
  rootDomain: 'ramelo.app',
  appName: 'Ramelo',
  version: '1.0.0',
  defaultTheme: 'light',
  enableDebug: false,

  // Configuración de archivos
  maxFileSize: 5 * 1024 * 1024, // 5MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
  supportedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

  // Configuración de paginación por defecto
  paginationDefaults: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  },

  // Configuración de fecha y hora
  dateFormat: 'dd-MM-yy',
  timeFormat: 'h:mm a',
  dateTimeFormat: 'dd-MM-yy h:mm a',

  // Configuración de la aplicación
  features: {
    googleCalendar: true,
    auditLogs: true,
    multiTheme: true
  },

  // Timeouts y configuración de red
  httpTimeout: 30000, // 30 segundos
  retryAttempts: 3,

  // Configuración de cache
  cacheTimeout: 5 * 60 * 1000, // 5 minutos

  // Configuración de notificaciones
  notification: {
    duration: 4000, // 4 segundos en producción
    position: 'top-right'
  }
};
