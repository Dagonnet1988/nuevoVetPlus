import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces para Cajas
export interface Caja {
  id_caja: string;
  nombre: string;
  tipo: 'Caja Menor' | 'Cuenta Bancaria' | 'Caja Fuerte' | 'Personalizada';
  descripcion?: string;
  saldo_inicial: number;
  saldo_actual: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface MovimientoCaja {
  id_movimiento: string;
  id_caja: string;
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  referencia?: string;
  metodo_pago: string;
  fecha: string;
  created_by: string;
}

export interface TransferenciaCaja {
  id_transferencia: string;
  codigo_transferencia: string;
  id_caja_origen: string;
  id_caja_destino: string;
  monto: number;
  descripcion: string;
  metodo_pago: 'Efectivo' | 'Transferencia';
  estado: 'Completada' | 'Cancelada';
  fecha: string;
  created_by: string;
  caja_origen?: Caja;
  caja_destino?: Caja;
}

export interface ResumenCaja {
  caja: Caja;
  totales: {
    saldo_inicial: number;
    total_ingresos: number;
    total_egresos: number;
    saldo_actual: number;
    cantidad_ingresos: number;
    cantidad_egresos: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CajasService {
  private API_URL = `${environment.apiUrl}/financial`;

  constructor(private http: HttpClient) { }

  // =============================== CAJAS ==============================

  getCajas(activa?: boolean): Observable<Caja[]> {
    let params = new HttpParams();
    if (activa !== undefined) {
      params = params.set('activa', activa.toString());
    }

    return this.http.get<any>(`${this.API_URL}/cajas`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
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

  getCajaById(id: string): Observable<Caja> {
    return this.http.get<any>(`${this.API_URL}/cajas/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            saldo_inicial: parseFloat(response.data.saldo_inicial) || 0,
            saldo_actual: parseFloat(response.data.saldo_actual) || 0
          };
        }
        throw new Error('Caja no encontrada');
      })
    );
  }

  createCaja(caja: Omit<Caja, 'id_caja' | 'saldo_actual' | 'created_at' | 'updated_at' | 'created_by'>): Observable<Caja> {
    return this.http.post<any>(`${this.API_URL}/cajas`, caja).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            saldo_inicial: parseFloat(response.data.saldo_inicial) || 0,
            saldo_actual: parseFloat(response.data.saldo_actual) || 0
          };
        }
        throw new Error('Error creando caja');
      })
    );
  }

  updateCaja(id: string, caja: Partial<Caja>): Observable<Caja> {
    return this.http.put<any>(`${this.API_URL}/cajas/${id}`, caja).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            saldo_inicial: parseFloat(response.data.saldo_inicial) || 0,
            saldo_actual: parseFloat(response.data.saldo_actual) || 0
          };
        }
        throw new Error('Error actualizando caja');
      })
    );
  }

  deleteCaja(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/cajas/${id}`);
  }

  cerrarCaja(id: string, motivo?: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/cajas/${id}/cerrar`, { motivo_cierre: motivo });
  }

  getResumenCajaActiva(): Observable<ResumenCaja> {
    return this.http.get<any>(`${this.API_URL}/cajas/resumen/activa`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            caja: {
              ...response.data.caja,
              saldo_inicial: parseFloat(response.data.caja.saldo_inicial) || 0,
              saldo_actual: parseFloat(response.data.caja.saldo_actual) || 0
            },
            totales: {
              saldo_inicial: parseFloat(response.data.totales.saldo_inicial) || 0,
              total_ingresos: parseFloat(response.data.totales.total_ingresos) || 0,
              total_egresos: parseFloat(response.data.totales.total_egresos) || 0,
              saldo_actual: parseFloat(response.data.totales.saldo_actual) || 0,
              cantidad_ingresos: parseInt(response.data.totales.cantidad_ingresos) || 0,
              cantidad_egresos: parseInt(response.data.totales.cantidad_egresos) || 0
            }
          };
        }
        throw new Error('Error obteniendo resumen de caja');
      })
    );
  }

  // =============================== MOVIMIENTOS ==============================

  getMovimientosCaja(idCaja: string, filtros?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo?: 'ingreso' | 'egreso';
    limit?: number;
    offset?: number;
  }): Observable<{
    movimientos: MovimientoCaja[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      page: number;
      totalPages: number;
    };
  }> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
    }

    return this.http.get<any>(`${this.API_URL}/cajas/${idCaja}/movimientos`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            movimientos: response.data.movimientos.map((mov: any) => ({
              ...mov,
              monto: parseFloat(mov.monto) || 0,
              saldo_anterior: parseFloat(mov.saldo_anterior) || 0,
              saldo_nuevo: parseFloat(mov.saldo_nuevo) || 0
            })),
            pagination: response.data.pagination
          };
        }
        return { movimientos: [], pagination: { total: 0, limit: 10, offset: 0, page: 1, totalPages: 0 } };
      })
    );
  }

  // =============================== INGRESOS ==============================

  registrarIngreso(ingreso: {
    id_concepto_ingreso: string;
    monto: number;
    descripcion: string;
    metodo_pago: string;
    referencia?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/ingresos`, ingreso);
  }

  getIngresos(filtros?: {
    id_caja?: string;
    id_categoria?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.id_caja) params = params.set('id_caja', filtros.id_caja);
      if (filtros.id_categoria) params = params.set('id_categoria', filtros.id_categoria);
      if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
    }

    return this.http.get<any>(`${this.API_URL}/ingresos`, { params });
  }

  // =============================== EGRESOS ==============================

  registrarEgreso(egreso: {
    id_concepto_egreso: string;
    monto: number;
    descripcion: string;
    metodo_pago: string;
    referencia?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/egresos`, egreso);
  }

  getEgresos(filtros?: {
    id_caja?: string;
    id_categoria?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.id_caja) params = params.set('id_caja', filtros.id_caja);
      if (filtros.id_categoria) params = params.set('id_categoria', filtros.id_categoria);
      if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
    }

    return this.http.get<any>(`${this.API_URL}/egresos`, { params });
  }

  // =============================== TRANSFERENCIAS ==============================

  transferirEntreCajas(transferencia: {
    id_caja_origen: string;
    id_caja_destino: string;
    monto: number;
    descripcion: string;
    metodo_pago: 'Efectivo' | 'Transferencia';
    notas?: string;
  }): Observable<TransferenciaCaja> {
    return this.http.post<any>(`${this.API_URL}/transferencias`, transferencia).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            monto: parseFloat(response.data.monto) || 0
          };
        }
        throw new Error('Error realizando transferencia');
      })
    );
  }

  getTransferencias(filtros?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    id_caja_origen?: string;
    id_caja_destino?: string;
    estado?: 'Completada' | 'Cancelada';
    limit?: number;
    offset?: number;
  }): Observable<{
    transferencias: TransferenciaCaja[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
      if (filtros.id_caja_origen) params = params.set('id_caja_origen', filtros.id_caja_origen);
      if (filtros.id_caja_destino) params = params.set('id_caja_destino', filtros.id_caja_destino);
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
    }

    return this.http.get<any>(`${this.API_URL}/transferencias`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            transferencias: response.data.data.map((trans: any) => ({
              ...trans,
              monto: parseFloat(trans.monto) || 0
            })),
            pagination: response.data.pagination
          };
        }
        return {
          transferencias: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
        };
      })
    );
  }

  // =============================== REPORTES ==============================

  getReporteFinanciero(filtros?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    caja_id?: string;
    grupo_por?: 'dia' | 'semana' | 'mes';
  }): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.fecha_inicio) params = params.set('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params = params.set('fecha_fin', filtros.fecha_fin);
      if (filtros.caja_id) params = params.set('caja_id', filtros.caja_id);
      if (filtros.grupo_por) params = params.set('grupo_por', filtros.grupo_por);
    }

    return this.http.get<any>(`${this.API_URL}/reportes/financiero`, { params });
  }

  // =============================== UTILIDADES ==============================

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

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTipoCajaIcon(tipo: string): string {
    switch (tipo) {
      case 'Caja Menor': return 'monetization_on';
      case 'Cuenta Bancaria': return 'account_balance';
      case 'Caja Fuerte': return 'security';
      default: return 'account_balance_wallet';
    }
  }

  getTipoCajaColor(tipo: string): string {
    switch (tipo) {
      case 'Caja Menor': return '#4caf50';
      case 'Cuenta Bancaria': return '#2196f3';
      case 'Caja Fuerte': return '#ff9800';
      default: return '#666';
    }
  }
}
