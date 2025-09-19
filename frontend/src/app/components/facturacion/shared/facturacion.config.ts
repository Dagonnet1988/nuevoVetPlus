/**
 * 📋 CONFIGURACIÓN CENTRALIZADA DEL MÓDULO DE FACTURACIÓN
 * VetPlus - Configuración y constantes del sistema de facturación
 */

export const FACTURACION_CONFIG = {
  // ===========================================
  // PAGINACIÓN Y LÍMITES
  // ===========================================
  PAGINACION: {
    DEFAULT_PAGE_SIZE: 100,
    MAX_PAGE_SIZE: 500,
    MIN_PAGE_SIZE: 10,
    DEFAULT_PAGE: 1
  },

  // ===========================================
  // TIEMPOS Y DURACIONES
  // ===========================================
  TIEMPOS: {
    SNACKBAR_DURATION: 3000,
    LOADING_DELAY: 300,
    DEBOUNCE_SEARCH: 500,
    SESSION_TIMEOUT: 3600000 // 1 hora
  },

  // ===========================================
  // COLUMNAS DE TABLAS
  // ===========================================
  TABLAS: {
    FACTURAS: {
      COLUMNAS: [
        'codigo',
        'fecha',
        'cliente',
        'total',
        'metodo_pago',
        'estado',
        'acciones'
      ] as const,

      COLUMNAS_VISIBLES: {
        CODIGO: 'codigo',
        FECHA: 'fecha',
        CLIENTE: 'cliente',
        TOTAL: 'total',
        METODO_PAGO: 'metodo_pago',
        ESTADO: 'estado',
        ACCIONES: 'acciones'
      }
    },

    CAJAS: {
      COLUMNAS: [
        'nombre',
        'tipo',
        'saldo_actual',
        'acciones'
      ] as const
    }
  },

  // ===========================================
  // ESTADOS Y TIPOS
  // ===========================================
  ESTADOS: {
    FACTURA: {
      PENDIENTE: 'Pendiente',
      PAGADA: 'Pagada',
      CANCELADA: 'Cancelada',
      VENCIDA: 'Vencida'
    },

    CAJA: {
      ACTIVA: true,
      INACTIVA: false
    },

    COTIZACION: {
      VIGENTE: 'Vigente',
      VENCIDA: 'Vencida',
      CONVERTIDA: 'Convertida',
      CANCELADA: 'Cancelada'
    }
  },

  // ===========================================
  // MÉTODOS DE PAGO
  // ===========================================
  METODOS_PAGO: {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    CHEQUE: 'Cheque',
    CREDITO: 'Crédito'
  },

  // ===========================================
  // TIPOS DE PRODUCTOS
  // ===========================================
  TIPOS_PRODUCTO: {
    PRODUCTO: 'Producto',
    SERVICIO: 'Servicio',
    TERAPIA_INDIVIDUAL: 'Terapia Individual',
    TERAPIA_PAQUETE: 'Terapia Paquete'
  },

  // ===========================================
  // TIPOS DE CAJA
  // ===========================================
  TIPOS_CAJA: {
    CAJA_MENOR: 'Caja Menor',
    CUENTA_BANCARIA: 'Cuenta Bancaria',
    CAJA_FUERTE: 'Caja Fuerte',
    PERSONALIZADA: 'Personalizada'
  },

  // ===========================================
  // PALETA DE COLORES
  // ===========================================
  COLORES: {
    // Estados de factura
    ESTADO_PAGADA: '#4caf50',
    ESTADO_PENDIENTE: '#ff9800',
    ESTADO_CANCELADA: '#f44336',
    ESTADO_VENCIDA: '#9c27b0',

    // Métodos de pago
    METODO_EFECTIVO: '#4caf50',
    METODO_TARJETA: '#2196f3',
    METODO_TRANSFERENCIA: '#9c27b0',
    METODO_CHEQUE: '#ff9800',
    METODO_CREDITO: '#9c27b0',

    // Tema general
    PRIMARY: '#1976d2',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
    ACCENT: '#9c27b0'
  },

  // ===========================================
  // ICONOS MATERIAL DESIGN
  // ===========================================
  ICONOS: {
    // Acciones principales
    NUEVA_FACTURA: 'add',
    EDITAR: 'edit',
    ELIMINAR: 'delete',
    VER: 'visibility',
    IMPRIMIR: 'print',
    EXPORTAR: 'download',
    WHATSAPP: 'send',
    BUSCAR: 'search',
    LIMPIAR: 'clear',
    CERRAR: 'close',

    // Estados
    PAGADO: 'check_circle',
    PENDIENTE: 'schedule',
    CANCELADO: 'cancel',
    VENCIDO: 'warning',

    // Tipos
    FACTURA: 'receipt',
    COTIZACION: 'description',
    CAJA: 'account_balance_wallet',
    PRODUCTO: 'inventory',
    SERVICIO: 'build',
    TERAPIA: 'healing',

    // Métodos de pago
    EFECTIVO: 'paid',
    TARJETA: 'credit_card',
    TRANSFERENCIA: 'account_balance',
    CHEQUE: 'receipt_long',

    // Navegación
    ATRAS: 'arrow_back',
    ADELANTE: 'arrow_forward',
    MENU: 'menu',
    CONFIGURACION: 'settings'
  },

  // ===========================================
  // MENSAJES Y TEXTOS
  // ===========================================
  MENSAJES: {
    // Confirmaciones
    CONFIRMAR_CANCELAR_FACTURA: (codigo: string) =>
      `¿Estás seguro de cancelar la factura ${codigo}?`,

    CONFIRMAR_ELIMINAR_ITEM: '¿Estás seguro de eliminar este elemento?',

    // Éxitos
    FACTURA_CREADA: 'Factura creada exitosamente',
    FACTURA_ACTUALIZADA: 'Factura actualizada exitosamente',
    FACTURA_CANCELADA: 'Factura cancelada exitosamente',
    FACTURA_EXPORTADA: 'Factura exportada exitosamente',
    WHATSAPP_ENVIADO: 'Factura enviada por WhatsApp',

    // Errores
    ERROR_CARGAR_FACTURAS: 'Error cargando facturas',
    ERROR_CREAR_FACTURA: 'Error creando factura',
    ERROR_ACTUALIZAR_FACTURA: 'Error actualizando factura',
    ERROR_CANCELAR_FACTURA: 'Error cancelando factura',
    ERROR_EXPORTAR_FACTURA: 'Error exportando factura',
    ERROR_ENVIAR_WHATSAPP: 'Error enviando por WhatsApp',
    ERROR_SIN_TELEFONO: 'El cliente no tiene teléfono registrado',

    // Información
    SIN_FACTURAS: 'No hay facturas con los filtros aplicados',
    CARGANDO_FACTURAS: 'Cargando facturas...',
    SIN_CAJAS: 'No hay cajas activas'
  },

  // ===========================================
  // VALIDACIONES
  // ===========================================
  VALIDACIONES: {
    // Longitudes máximas
    MAX_DESCRIPCION: 500,
    MAX_NOTAS: 1000,
    MAX_NOMBRE: 150,
    MAX_CODIGO: 50,

    // Rangos numéricos
    MIN_CANTIDAD: 0.01,
    MAX_CANTIDAD: 999999.99,
    MIN_PRECIO: 0,
    MAX_PRECIO: 999999999.99,

    // Fechas
    FECHA_MINIMA: '2000-01-01',
    FECHA_MAXIMA: '2030-12-31'
  },

  // ===========================================
  // FORMATOS
  // ===========================================
  FORMATOS: {
    MONEDA: {
      LOCALES: 'es-CO',
      MONEDA: 'COP',
      MINIMO_DECIMALES: 0,
      MAXIMO_DECIMALES: 2
    },

    FECHA: {
      LOCALES: 'es-ES',
      OPCIONES: {
        year: 'numeric' as const,
        month: 'short' as const,
        day: 'numeric' as const,
        hour: '2-digit' as const,
        minute: '2-digit' as const
      }
    },

    NUMERO: {
      LOCALES: 'es-CO',
      OPCIONES: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    }
  },

  // ===========================================
  // RUTAS DE NAVEGACIÓN
  // ===========================================
  RUTAS: {
    // Principales
    FACTURACION: '/facturacion',
    NUEVA_FACTURA: '/facturacion/nueva',
    EDITAR_FACTURA: (id: string) => `/facturacion/${id}/editar`,
    VER_FACTURA: (id: string) => `/facturacion/${id}`,

    // Cotizaciones
    NUEVA_COTIZACION: '/facturacion/cotizacion/nueva',
    EDITAR_COTIZACION: (id: string) => `/facturacion/cotizacion/${id}/editar`,

    // Cajas
    MOVIMIENTOS_CAJA: (id: string) => `/facturacion/cajas/${id}/movimientos`,

    // Productos
    PRODUCTOS: '/inventario/productos',
    NUEVO_PRODUCTO: '/inventario/productos/nuevo',

    // Clientes
    CLIENTES: '/clientes',
    NUEVO_CLIENTE: '/clientes/nuevo'
  },

  // ===========================================
  // CONFIGURACIÓN DE API
  // ===========================================
  API: {
    // Endpoints
    FACTURAS: '/api/financial/invoices',
    CAJAS: '/api/financial/cajas',
    PRODUCTOS: '/api/financial/products',
    CLIENTES: '/api/clinical/clients',

    // Parámetros de consulta
    PARAMS: {
      PAGE: 'page',
      LIMIT: 'limit',
      SEARCH: 'search',
      ESTADO: 'estado',
      FECHA_INICIO: 'fecha_inicio',
      FECHA_FIN: 'fecha_fin',
      METODO_PAGO: 'metodo_pago',
      CAJA: 'caja'
    }
  }
} as const;

// ===========================================
// TIPOS DERIVADOS DE LA CONFIGURACIÓN
// ===========================================

export type EstadoFactura = typeof FACTURACION_CONFIG.ESTADOS.FACTURA[keyof typeof FACTURACION_CONFIG.ESTADOS.FACTURA];
export type MetodoPago = typeof FACTURACION_CONFIG.METODOS_PAGO[keyof typeof FACTURACION_CONFIG.METODOS_PAGO];
export type TipoProducto = typeof FACTURACION_CONFIG.TIPOS_PRODUCTO[keyof typeof FACTURACION_CONFIG.TIPOS_PRODUCTO];
export type TipoCaja = typeof FACTURACION_CONFIG.TIPOS_CAJA[keyof typeof FACTURACION_CONFIG.TIPOS_CAJA];
export type ViewType = 'facturas' | 'cotizaciones' | 'cajas';

// ===========================================
// UTILIDADES DE CONFIGURACIÓN
// ===========================================

export class FacturacionUtils {
  /**
   * Obtiene el color correspondiente a un estado de factura
   */
  static getEstadoColor(estado: EstadoFactura): string {
    const colores = {
      [FACTURACION_CONFIG.ESTADOS.FACTURA.PAGADA]: FACTURACION_CONFIG.COLORES.ESTADO_PAGADA,
      [FACTURACION_CONFIG.ESTADOS.FACTURA.PENDIENTE]: FACTURACION_CONFIG.COLORES.ESTADO_PENDIENTE,
      [FACTURACION_CONFIG.ESTADOS.FACTURA.CANCELADA]: FACTURACION_CONFIG.COLORES.ESTADO_CANCELADA,
      [FACTURACION_CONFIG.ESTADOS.FACTURA.VENCIDA]: FACTURACION_CONFIG.COLORES.ESTADO_VENCIDA
    };
    return colores[estado] || FACTURACION_CONFIG.COLORES.INFO;
  }

  /**
   * Obtiene el color correspondiente a un método de pago
   */
  static getMetodoPagoColor(metodo: MetodoPago): string {
    const colores = {
      [FACTURACION_CONFIG.METODOS_PAGO.EFECTIVO]: FACTURACION_CONFIG.COLORES.METODO_EFECTIVO,
      [FACTURACION_CONFIG.METODOS_PAGO.TARJETA]: FACTURACION_CONFIG.COLORES.METODO_TARJETA,
      [FACTURACION_CONFIG.METODOS_PAGO.TRANSFERENCIA]: FACTURACION_CONFIG.COLORES.METODO_TRANSFERENCIA,
      [FACTURACION_CONFIG.METODOS_PAGO.CHEQUE]: FACTURACION_CONFIG.COLORES.METODO_CHEQUE,
      [FACTURACION_CONFIG.METODOS_PAGO.CREDITO]: FACTURACION_CONFIG.COLORES.METODO_CREDITO
    };
    return colores[metodo] || FACTURACION_CONFIG.COLORES.INFO;
  }

  /**
   * Obtiene el icono correspondiente a un tipo de caja
   */
  static getCajaIcon(tipo: TipoCaja): string {
    const iconos = {
      [FACTURACION_CONFIG.TIPOS_CAJA.CAJA_MENOR]: FACTURACION_CONFIG.ICONOS.EFECTIVO,
      [FACTURACION_CONFIG.TIPOS_CAJA.CUENTA_BANCARIA]: FACTURACION_CONFIG.ICONOS.TRANSFERENCIA,
      [FACTURACION_CONFIG.TIPOS_CAJA.CAJA_FUERTE]: 'security',
      [FACTURACION_CONFIG.TIPOS_CAJA.PERSONALIZADA]: FACTURACION_CONFIG.ICONOS.CAJA
    };
    return iconos[tipo] || FACTURACION_CONFIG.ICONOS.CAJA;
  }

  /**
   * Formatea una fecha según la configuración
   */
  static formatearFecha(fecha: string | Date): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleDateString(
      FACTURACION_CONFIG.FORMATOS.FECHA.LOCALES,
      FACTURACION_CONFIG.FORMATOS.FECHA.OPCIONES
    );
  }

  /**
   * Formatea un número como moneda
   */
  static formatearMoneda(valor: number): string {
    return new Intl.NumberFormat(
      FACTURACION_CONFIG.FORMATOS.MONEDA.LOCALES,
      {
        style: 'currency',
        currency: FACTURACION_CONFIG.FORMATOS.MONEDA.MONEDA,
        minimumFractionDigits: FACTURACION_CONFIG.FORMATOS.MONEDA.MINIMO_DECIMALES
      }
    ).format(valor);
  }
}

// ===========================================
// CONSTANTES EXPORTADAS PARA USO DIRECTO
// ===========================================

export const {
  PAGINACION,
  TIEMPOS,
  TABLAS,
  ESTADOS,
  METODOS_PAGO,
  TIPOS_PRODUCTO,
  TIPOS_CAJA,
  COLORES,
  ICONOS,
  MENSAJES,
  VALIDACIONES,
  FORMATOS,
  RUTAS,
  API
} = FACTURACION_CONFIG;
