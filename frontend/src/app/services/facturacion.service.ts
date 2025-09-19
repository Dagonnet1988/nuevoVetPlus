import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces de Facturación
export interface Factura {
  id_factura: string;
  codigo_factura: string;
  id_cliente?: string;
  cliente?: {
    nombre: string;
    documento: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  fecha: string;
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Cheque' | 'Crédito';
  estado: 'Pendiente' | 'Pagada' | 'Cancelada';
  id_caja: string;
  notas?: string;
  lineas: LineaFactura[];
  created_at: string;
  created_by: string;
}

export interface LineaFactura {
  id_linea: string;
  id_producto: string;
  producto?: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    tipo: string;
    categoria: string;
    marca?: string;
    unidad_medida: string;
    iva_aplicable: number;
  };
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

export interface Cotizacion {
  id_cotizacion: string;
  codigo_cotizacion: string;
  id_cliente?: string;
  cliente?: {
    nombre: string;
    documento: string;
    telefono?: string;
    email?: string;
  };
  fecha: string;
  vigencia: string;
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  estado: 'Vigente' | 'Vencida' | 'Convertida' | 'Cancelada';
  notas?: string;
  lineas: LineaCotizacion[];
  created_at: string;
  created_by: string;
}

export interface LineaCotizacion {
  id_linea: string;
  id_producto: string;
  producto?: {
    codigo: string;
    nombre: string;
    precio_venta: number;
    unidad_medida: string;
  };
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

export interface Caja {
  id_caja: string;
  nombre: string;
  tipo: 'Caja Menor' | 'Cuenta Bancaria' | 'Caja Fuerte' | 'Personalizada';
  descripcion?: string;
  saldo_inicial: number;
  saldo_actual: number;
  activa: boolean;
  created_at: string;
}

export interface MovimientoCaja {
  id_movimiento: string;
  id_caja: string;
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  referencia?: string; // ID de factura si es por venta
  metodo_pago: string;
  fecha: string;
  created_by: string;
}

export interface FacturaFilter {
  cliente?: string;
  metodo_pago?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
  caja?: string;
}

export interface ResumenFacturacion {
  total_facturas: number;
  total_ventas_dia: number;
  total_ventas_mes: number;
  facturas_pendientes: number;
  productos_mas_vendidos: ProductoVendido[];
  ventas_por_metodo_pago: VentasMetodoPago[];
  facturas_recientes: Factura[];
}

export interface ProductoVendido {
  id_producto: string;
  nombre: string;
  cantidad_vendida: number;
  total_vendido: number;
}

export interface VentasMetodoPago {
  metodo_pago: string;
  cantidad_facturas: number;
  total_vendido: number;
}

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private readonly API_URL = `${environment.apiUrl}/financial`;

  constructor(private http: HttpClient) {}

  // ===============================
  // FACTURAS
  // ===============================

  getFacturas(page: number = 1, limit: number = 50, filters?: FacturaFilter): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof FacturaFilter] !== undefined && filters[key as keyof FacturaFilter] !== null) {
          params.set(key, filters[key as keyof FacturaFilter]!.toString());
        }
      });
    }

    return this.http.get<any>(`${this.API_URL}/invoices`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  getFactura(id: string): Observable<Factura> {
    return this.http.get<any>(`${this.API_URL}/invoices/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Mapear 'detalles' del backend a 'lineas' del frontend
          const factura = response.data;
          if (factura.detalles) {
            factura.lineas = factura.detalles;
            delete factura.detalles;
          }
          return factura;
        }
        throw new Error('Factura no encontrada');
      })
    );
  }

  createFactura(factura: Omit<Factura, 'id_factura' | 'codigo_factura' | 'created_at' | 'created_by'>): Observable<Factura> {
    return this.http.post<any>(`${this.API_URL}/invoices`, factura).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error creando factura');
      })
    );
  }

  updateFactura(id: string, factura: Partial<Factura>): Observable<Factura> {
    return this.http.put<any>(`${this.API_URL}/invoices/${id}`, factura).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error actualizando factura');
      })
    );
  }

  cancelarFactura(id: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/invoices/${id}/status`, { estado: 'Cancelada' });
  }

  // ===============================
  // COTIZACIONES
  // ===============================

  getCotizaciones(page: number = 1, limit: number = 50, filters?: any): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.cliente) params = params.set('cliente', filters.cliente);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<any>(`${this.API_URL}/cotizaciones`, { params });
  }

  getCotizacion(id: string): Observable<Cotizacion> {
    return this.http.get<any>(`${this.API_URL}/cotizaciones/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Cotización no encontrada');
      })
    );
  }

  createCotizacion(cotizacion: Omit<Cotizacion, 'id_cotizacion' | 'codigo_cotizacion' | 'created_at' | 'created_by'>): Observable<Cotizacion> {
    return this.http.post<any>(`${this.API_URL}/cotizaciones`, cotizacion);
  }

  convertirCotizacionAFactura(id: string): Observable<Factura> {
    return this.http.post<any>(`${this.API_URL}/cotizaciones/${id}/convertir`, {});
  }

  // ===============================
  // CAJAS
  // ===============================

  getCajas(): Observable<Caja[]> {
    return this.http.get<any>(`${this.API_URL}/cajas`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Convertir valores string a números para evitar NaN
          return response.data.map((caja: any) => ({
            ...caja,
            saldo_inicial: parseFloat(caja.saldo_inicial) || 0,
            saldo_actual: parseFloat(caja.saldo_actual) || 0
          }));
        }
        return [];
      })
    );
  }

  getMovimientosCaja(idCaja: string, page: number = 1, limit: number = 50): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.API_URL}/cajas/${idCaja}/movimientos`, { params });
  }

  // ===============================
  // PRODUCTOS PARA FACTURACIÓN
  // ===============================

  buscarProductosPorTexto(query: string): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/products`, {
      params: { search: query, activo: 'true', limit: '20' }
    }).pipe(
      map((response: any) => {
        if (response.success && response.data?.products) {
          return response.data.products;
        }
        return [];
      })
    );
  }

  buscarProductoPorCodigo(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/products/barcode/${codigo}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Producto no encontrado');
      })
    );
  }

  // ===============================
  // REPORTES
  // ===============================

  getResumenFacturacion(): Observable<ResumenFacturacion> {
    // Usar el endpoint correcto del módulo de reportes
    return this.http.get<any>(`${environment.apiUrl}/reports/dashboard`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Transformar datos del dashboard a formato de resumen de facturación
          return {
            total_facturas: response.data.ventas?.total_facturas || 0,
            total_ventas_dia: response.data.ventas?.total_ventas || 0, // Usar total del período como aproximación
            total_ventas_mes: response.data.ventas?.total_ventas || 0,
            facturas_pendientes: 0, // No disponible en dashboard básico
            productos_mas_vendidos: [],
            ventas_por_metodo_pago: [],
            facturas_recientes: []
          };
        }
        return {
          total_facturas: 0,
          total_ventas_dia: 0,
          total_ventas_mes: 0,
          facturas_pendientes: 0,
          productos_mas_vendidos: [],
          ventas_por_metodo_pago: [],
          facturas_recientes: []
        };
      })
    );
  }

  exportarFactura(id: string, formato: 'pdf' | 'whatsapp' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/invoices/${id}/export`, {
      params: { formato },
      responseType: 'blob'
    });
  }

  enviarFacturaPorWhatsApp(id: string, telefono: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/invoices/${id}/whatsapp`, { telefono });
  }

  // ===============================
  // UTILIDADES
  // ===============================

  calcularTotalesLinea(cantidad: number, precioUnitario: number, descuento: number = 0, ivaAplicable: number = 0): any {
    const subtotal = cantidad * precioUnitario;
    const montoDescuento = (subtotal * descuento) / 100;
    const baseGravable = subtotal - montoDescuento;
    const iva = (baseGravable * ivaAplicable) / 100;
    const total = baseGravable + iva;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      descuento: Math.round(montoDescuento * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  calcularTotalesFactura(lineas: LineaFactura[]): any {
    let subtotal = 0;
    let descuentoTotal = 0;
    let ivaTotal = 0;

    lineas.forEach(linea => {
      const totales = this.calcularTotalesLinea(
        linea.cantidad,
        linea.precio_unitario,
        linea.descuento,
        linea.producto?.iva_aplicable || 0
      );

      subtotal += totales.subtotal;
      descuentoTotal += totales.descuento;
      ivaTotal += totales.iva;
    });

    const total = subtotal - descuentoTotal + ivaTotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      descuento: Math.round(descuentoTotal * 100) / 100,
      impuestos: Math.round(ivaTotal * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  // ===============================
  // PAQUETES DE TERAPIAS
  // ===============================

  verificarPaquetesActivos(idMascota: string): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/therapies/packages/${idMascota}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  registrarUsoTerapia(idControl: string, sesionesUsadas: number): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/therapies/use`, {
      id_control: idControl,
      sesiones_usadas: sesionesUsadas
    });
  }

  crearPaqueteTerapia(data: {
    id_mascota: string;
    id_producto: string;
    sesiones_total: number;
    precio_pagado: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/therapies/package`, data);
  }

  formatearMoneda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$0';
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  generarCodigoFactura(): string {
    const ahora = new Date();
    const año = ahora.getFullYear().toString().substr(-2);
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const dia = ahora.getDate().toString().padStart(2, '0');
    const hora = ahora.getHours().toString().padStart(2, '0');
    const minuto = ahora.getMinutes().toString().padStart(2, '0');

    return `FAC-${año}${mes}${dia}-${hora}${minuto}`;
  }
}
