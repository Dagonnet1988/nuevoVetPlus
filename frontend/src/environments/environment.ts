export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  backendUrl: 'http://localhost:3000',
  rootDomain: 'ramelo.app',
  appName: 'Ramelo',
  version: '1.0.0',
  defaultTheme: 'light',
  enableDebug: true,

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
    duration: 3000, // 3 segundos
    position: 'top-right'
  }
};
