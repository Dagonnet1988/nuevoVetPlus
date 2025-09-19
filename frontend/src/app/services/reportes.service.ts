import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===============================
// INTERFACES DE REPORTES
// ===============================

export interface FiltroFechas {
  fecha_inicio: string;
  fecha_fin: string;
  periodo?: 'dia' | 'semana' | 'mes' | 'año' | 'personalizado';
}

export interface FiltroReporte extends FiltroFechas {
  categoria?: string;
  categoria_id?: string;
  tipo?: string;
  veterinario?: string;
  veterinario_id?: string;
  metodo_pago?: string;
  estado?: string;
  tipo_reporte?: string;
}

// ===============================
// REPORTES FINANCIEROS
// ===============================

export interface ReporteVentas {
  periodo?: string;
  resumen_general: {
    total_facturas: number;
    total_ventas: number;
    promedio_venta: number;
    crecimiento_mensual: number;
  };
  ventas_por_periodo: VentasPorPeriodo[];
  ventas_por_categoria: VentasPorCategoria[];
  ventas_por_veterinario: VentasPorVeterinario[];
  top_servicios: TopServicio[];
  tendencias: {
    mejor_dia_semana: string;
    mejor_hora: string;
    estacionalidad: string;
    prediccion_proximo_mes: number;
  };
  comparacion_periodo_anterior: ComparacionPeriodo;
}

export interface VentaDiaria {
  fecha: string;
  cantidad_facturas: number;
  total_ventas: number;
  total_descuentos: number;
}

export interface VentaMetodoPago {
  metodo_pago: string;
  cantidad_facturas: number;
  total_ventas: number;
  porcentaje: number;
}

export interface ProductoVendido {
  id_producto: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad_vendida: number;
  total_vendido: number;
  margen_ganancia: number;
}

export interface ComparacionPeriodo {
  periodo_anterior: number;
  porcentaje_cambio: number;
  diferencia_absoluta: number;
  tendencia?: 'subida' | 'bajada' | 'estable';
}

// Interfaces adicionales para reportes de ventas
export interface VentasPorPeriodo {
  periodo: string;
  total_ventas: number;
  cantidad_facturas: number;
}

export interface VentasPorCategoria {
  categoria: string;
  total_ventas: number;
  porcentaje: number;
}

export interface VentasPorVeterinario {
  veterinario_id: string;
  veterinario_nombre: string;
  total_ventas: number;
  cantidad_consultas: number;
  promedio_consulta: number;
}

export interface TopServicio {
  servicio: string;
  cantidad: number;
  total_ventas: number;
}

export interface ReporteFinanciero {
  ingresos: ResumenIngresos;
  egresos: ResumenEgresos;
  flujo_caja: FlujoCaja[];
  rentabilidad: AnalisisRentabilidad;
  cuentas_por_cobrar: CuentaPorCobrar[];
}

export interface ResumenIngresos {
  total_ingresos: number;
  ingresos_por_categoria: IngresoCategoria[];
  ingresos_recurrentes: number;
  ingresos_nuevos: number;
}

export interface IngresoCategoria {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface ResumenEgresos {
  total_egresos: number;
  egresos_por_categoria: EgresoCategoria[];
  gastos_fijos: number;
  gastos_variables: number;
}

export interface EgresoCategoria {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface FlujoCaja {
  fecha: string;
  ingresos: number;
  egresos: number;
  saldo_neto: number;
  saldo_acumulado: number;
}

export interface AnalisisRentabilidad {
  margen_bruto: number;
  margen_neto: number;
  roi: number;
  punto_equilibrio: number;
}

export interface CuentaPorCobrar {
  factura_codigo: string;
  cliente_nombre: string;
  fecha_vencimiento: string;
  monto: number;
  dias_vencido: number;
  estado: string;
}

// ===============================
// REPORTES DE PACIENTES
// ===============================

export interface ReportePacientes {
  total_pacientes: number;
  pacientes_nuevos: number;
  pacientes_activos: number;
  distribucion_especies: EspecieDistribucion[];
  distribucion_edades: EdadDistribucion[];
  pacientes_por_veterinario: PacienteVeterinario[];
  consultas_frecuentes: ConsultaFrecuente[];
  tendencia_registros: TendenciaRegistro[];
}

export interface EspecieDistribucion {
  especie: string;
  cantidad: number;
  porcentaje: number;
}

export interface EdadDistribucion {
  rango_edad: string;
  cantidad: number;
  porcentaje: number;
}

export interface PacienteVeterinario {
  veterinario_nombre: string;
  total_pacientes: number;
  pacientes_activos: number;
  consultas_realizadas: number;
}

export interface ConsultaFrecuente {
  motivo: string;
  cantidad: number;
  porcentaje: number;
}

export interface TendenciaRegistro {
  fecha: string;
  pacientes_nuevos: number;
  consultas_realizadas: number;
}

export interface ReporteCitas {
  total_citas: number;
  citas_completadas: number;
  citas_canceladas: number;
  tasa_cumplimiento: number;
  citas_por_dia: CitaDiaria[];
  citas_por_veterinario: CitaVeterinario[];
  tipos_consulta: TipoConsulta[];
  horarios_populares: HorarioPopular[];
}

export interface CitaDiaria {
  fecha: string;
  total_citas: number;
  completadas: number;
  canceladas: number;
  no_asistio: number;
}

export interface CitaVeterinario {
  veterinario_nombre: string;
  total_citas: number;
  completadas: number;
  canceladas: number;
  duracion_promedio: number;
}

export interface TipoConsulta {
  tipo: string;
  cantidad: number;
  porcentaje: number;
  duracion_promedio: number;
}

export interface HorarioPopular {
  hora: string;
  cantidad_citas: number;
  porcentaje: number;
}

// ===============================
// REPORTES DE INVENTARIO
// ===============================

export interface ReporteInventario {
  valor_total_inventario: number;
  productos_activos: number;
  productos_bajo_stock: number;
  productos_por_vencer: number;
  movimientos_periodo: MovimientoInventario[];
  productos_mas_rotacion: ProductoRotacion[];
  analisis_abc: AnalisisABC[];
  alertas_inventario: AlertaInventario[];
}

export interface MovimientoInventario {
  fecha: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
  motivo: string;
}

export interface ProductoRotacion {
  id_producto: string;
  nombre: string;
  categoria: string;
  cantidad_vendida: number;
  stock_promedio: number;
  rotacion: number;
  dias_inventario: number;
}

export interface AnalisisABC {
  categoria_abc: 'A' | 'B' | 'C';
  producto_nombre: string;
  valor_inventario: number;
  porcentaje_acumulado: number;
}

export interface AlertaInventario {
  tipo: 'stock_bajo' | 'producto_vencido' | 'sin_movimiento';
  producto_nombre: string;
  descripcion: string;
  gravedad: 'alta' | 'media' | 'baja';
  fecha_alerta: string;
}

// ===============================
// DASHBOARD EJECUTIVO
// ===============================

export interface DashboardEjecutivo {
  kpis_principales: KPIPrincipal[];
  comparaciones_periodo: ComparacionKPI[];
  alertas_criticas: AlertaCritica[];
  resumen_financiero: ResumenFinancieroDashboard;
  metricas_operativas: MetricaOperativa[];
  tendencias: TendenciaDashboard[];
}

export interface KPIPrincipal {
  nombre: string;
  valor_actual: number;
  valor_anterior: number;
  unidad: string;
  tipo: 'moneda' | 'numero' | 'porcentaje';
  tendencia: 'subida' | 'bajada' | 'estable';
  variacion_porcentual: number;
  icono: string;
  color: string;
}

export interface ComparacionKPI {
  periodo_actual: string;
  periodo_anterior: string;
  metricas: {
    ventas: number;
    pacientes_nuevos: number;
    citas_completadas: number;
    rentabilidad: number;
  };
}

export interface AlertaCritica {
  id: string;
  tipo: 'financiera' | 'operativa' | 'inventario' | 'sistema';
  titulo: string;
  descripcion: string;
  gravedad: 'alta' | 'media' | 'baja';
  fecha: string;
  accion_sugerida: string;
}

export interface ResumenFinancieroDashboard {
  ingresos_mes: number;
  gastos_mes: number;
  ganancia_neta: number;
  margen_ganancia: number;
  flujo_caja_proyectado: number;
}

export interface MetricaOperativa {
  nombre: string;
  valor: number;
  objetivo: number;
  porcentaje_cumplimiento: number;
  estado: 'excelente' | 'bueno' | 'regular' | 'malo';
}

export interface TendenciaDashboard {
  nombre: string;
  datos: { fecha: string; valor: number; }[];
  tipo_grafico: 'linea' | 'barra' | 'area';
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly API_URL = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  // ===============================
  // REPORTES FINANCIEROS
  // ===============================

  getReporteVentas(filtros: FiltroReporte): Observable<ReporteVentas> {
    let params = this.buildParams(filtros);

    return this.http.get<any>(`${this.API_URL}/sales`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo reporte de ventas');
      })
    );
  }

  getReporteFinanciero(filtros: FiltroReporte): Observable<ReporteFinanciero> {
    let params = this.buildParams(filtros);

    return this.http.get<any>(`${this.API_URL}/profitability`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo reporte financiero');
      })
    );
  }

  // REMOVIDO: Funcionalidad de flujo de caja no disponible en backend

  // ===============================
  // REPORTES DE PACIENTES
  // ===============================

  getReportePacientes(filtros: FiltroReporte): Observable<ReportePacientes> {
    let params = this.buildParams(filtros);

    return this.http.get<any>(`${this.API_URL}/patients`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo reporte de pacientes');
      })
    );
  }

  // REEMPLAZADO: Usar endpoint de pacientes que incluye datos de citas
  getReporteCitas(filtros: FiltroReporte): Observable<ReporteCitas> {
    // Los datos de citas están incluidos en el endpoint de patients
    return this.getReportePacientes(filtros).pipe(
      map((data: any) => {
        // Transformar datos de pacientes a formato de citas
        const reporteCitas: ReporteCitas = {
          total_citas: data.total_citas || 0,
          citas_completadas: data.citas_completadas || 0,
          citas_canceladas: data.citas_canceladas || 0,
          tasa_cumplimiento: data.tasa_cumplimiento || 0,
          citas_por_dia: data.citas_por_dia || [],
          citas_por_veterinario: data.citas_por_veterinario || [],
          tipos_consulta: data.tipos_consulta || [],
          horarios_populares: data.horarios_populares || []
        };
        return reporteCitas;
      })
    );
  }

  // ===============================
  // REPORTES DE INVENTARIO
  // ===============================

  getReporteInventario(filtros: FiltroReporte): Observable<ReporteInventario> {
    let params = this.buildParams(filtros);

    return this.http.get<any>(`${this.API_URL}/inventory`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error obteniendo reporte de inventario');
      })
    );
  }

  // REMOVIDO: Análisis ABC no disponible en backend

  // ===============================
  // DASHBOARD EJECUTIVO
  // ===============================

  getDashboardEjecutivo(filtros?: FiltroFechas): Observable<DashboardEjecutivo> {
    let params = filtros ? this.buildParams(filtros) : new HttpParams();

    return this.http.get<any>(`${this.API_URL}/dashboard`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Transformar datos del backend al formato esperado por el frontend
          return this.transformDashboardData(response.data);
        }
        throw new Error('Error obteniendo dashboard ejecutivo');
      })
    );
  }

  getKPIs(filtros?: FiltroFechas): Observable<KPIPrincipal[]> {
    let params = filtros ? this.buildParams(filtros) : new HttpParams();

    return this.http.get<any>(`${this.API_URL}/alerts-kpis`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  // ===============================
  // EXPORTACIÓN
  // ===============================

  // REMOVIDO: Funcionalidad de exportación no disponible en backend

  // REMOVIDO: Reportes programados no disponibles en backend

  // ===============================
  // UTILIDADES
  // ===============================

  private buildParams(filtros: any): HttpParams {
    let params = new HttpParams();

    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== '') {
        if (filtros[key] instanceof Date) {
          params = params.set(key, filtros[key].toISOString().split('T')[0]);
        } else {
          params = params.set(key, filtros[key].toString());
        }
      }
    });

    return params;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatearPorcentaje(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(valor / 100);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
  }

  calcularTendencia(actual: number, anterior: number): 'subida' | 'bajada' | 'estable' {
    const diferencia = ((actual - anterior) / anterior) * 100;

    if (diferencia > 5) return 'subida';
    if (diferencia < -5) return 'bajada';
    return 'estable';
  }

  generarPeriodosComparacion(periodo: 'dia' | 'semana' | 'mes' | 'año'): { actual: FiltroFechas, anterior: FiltroFechas } {
    const hoy = new Date();
    const actual: FiltroFechas = { fecha_inicio: '', fecha_fin: '', periodo };
    const anterior: FiltroFechas = { fecha_inicio: '', fecha_fin: '', periodo };

    switch (periodo) {
      case 'dia':
        actual.fecha_fin = hoy.toISOString().split('T')[0];
        actual.fecha_inicio = actual.fecha_fin;

        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        anterior.fecha_fin = ayer.toISOString().split('T')[0];
        anterior.fecha_inicio = anterior.fecha_fin;
        break;

      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        actual.fecha_inicio = inicioSemana.toISOString().split('T')[0];
        actual.fecha_fin = hoy.toISOString().split('T')[0];

        const inicioSemanaAnterior = new Date(inicioSemana);
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
        const finSemanaAnterior = new Date(inicioSemana);
        finSemanaAnterior.setDate(finSemanaAnterior.getDate() - 1);
        anterior.fecha_inicio = inicioSemanaAnterior.toISOString().split('T')[0];
        anterior.fecha_fin = finSemanaAnterior.toISOString().split('T')[0];
        break;

      case 'mes':
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        actual.fecha_inicio = inicioMes.toISOString().split('T')[0];
        actual.fecha_fin = hoy.toISOString().split('T')[0];

        const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        anterior.fecha_inicio = inicioMesAnterior.toISOString().split('T')[0];
        anterior.fecha_fin = finMesAnterior.toISOString().split('T')[0];
        break;

      case 'año':
        const inicioAño = new Date(hoy.getFullYear(), 0, 1);
        actual.fecha_inicio = inicioAño.toISOString().split('T')[0];
        actual.fecha_fin = hoy.toISOString().split('T')[0];

        const inicioAñoAnterior = new Date(hoy.getFullYear() - 1, 0, 1);
        const finAñoAnterior = new Date(hoy.getFullYear() - 1, 11, 31);
        anterior.fecha_inicio = inicioAñoAnterior.toISOString().split('T')[0];
        anterior.fecha_fin = finAñoAnterior.toISOString().split('T')[0];
        break;
    }
return { actual, anterior };
}

// Método para transformar datos del backend al formato esperado por el frontend
private transformDashboardData(backendData: any): DashboardEjecutivo {
return {
  kpis_principales: [
    {
      nombre: 'Ingresos Totales',
      valor_actual: backendData.ventas?.total_ventas || 0,
      valor_anterior: (backendData.ventas?.total_ventas || 0) * 0.85, // Estimación
      unidad: 'COP',
      tipo: 'moneda',
      tendencia: 'subida',
      variacion_porcentual: 17.65,
      icono: 'attach_money',
      color: '#4caf50'
    },
    {
      nombre: 'Pacientes Nuevos',
      valor_actual: backendData.clientes?.clientes_nuevos || 0,
      valor_anterior: Math.floor((backendData.clientes?.clientes_nuevos || 0) * 0.8),
      unidad: '',
      tipo: 'numero',
      tendencia: 'subida',
      variacion_porcentual: 25.0,
      icono: 'pets',
      color: '#2196f3'
    },
    {
      nombre: 'Consultas Realizadas',
      valor_actual: backendData.citas?.total_citas || 0,
      valor_anterior: Math.floor((backendData.citas?.total_citas || 0) * 0.9),
      unidad: '',
      tipo: 'numero',
      tendencia: 'subida',
      variacion_porcentual: 11.11,
      icono: 'medical_services',
      color: '#ff9800'
    },
    {
      nombre: 'Tasa de Cumplimiento',
      valor_actual: backendData.citas?.tasa_completamiento || 0,
      valor_anterior: Math.floor((backendData.citas?.tasa_completamiento || 0) * 0.95),
      unidad: '%',
      tipo: 'porcentaje',
      tendencia: 'subida',
      variacion_porcentual: 5.26,
      icono: 'check_circle',
      color: '#9c27b0'
    }
  ],
  comparaciones_periodo: [],
  alertas_criticas: [
    {
      id: '1',
      tipo: 'inventario',
      titulo: 'Stock Bajo Crítico',
      descripcion: `${backendData.inventario?.productos_criticos || 0} productos por debajo del stock mínimo`,
      gravedad: 'alta',
      fecha: new Date().toISOString(),
      accion_sugerida: 'Revisar y reabastecer inventario crítico'
    },
    {
      id: '2',
      tipo: 'financiera',
      titulo: 'Estado de Caja',
      descripcion: `Balance actual: ${this.formatearMoneda(backendData.caja?.balance_actual || 0)}`,
      gravedad: backendData.caja?.balance_actual < 0 ? 'alta' : 'baja',
      fecha: new Date().toISOString(),
      accion_sugerida: 'Revisar movimientos de caja'
    }
  ],
  resumen_financiero: {
    ingresos_mes: backendData.ventas?.total_ventas || 0,
    gastos_mes: Math.abs(backendData.caja?.balance_actual || 0) - (backendData.ventas?.total_ventas || 0),
    ganancia_neta: backendData.caja?.balance_actual || 0,
    margen_ganancia: backendData.ventas?.total_ventas > 0 ?
      ((backendData.caja?.balance_actual || 0) / backendData.ventas.total_ventas) * 100 : 0,
    flujo_caja_proyectado: (backendData.caja?.balance_actual || 0) * 1.2
  },
  metricas_operativas: [
    {
      nombre: 'Ocupación de Agenda',
      valor: backendData.citas?.tasa_completamiento || 0,
      objetivo: 90,
      porcentaje_cumplimiento: backendData.citas?.tasa_completamiento || 0,
      estado: (backendData.citas?.tasa_completamiento || 0) >= 90 ? 'excelente' :
              (backendData.citas?.tasa_completamiento || 0) >= 75 ? 'bueno' : 'regular'
    },
    {
      nombre: 'Valor del Inventario',
      valor: backendData.inventario?.valor_total || 0,
      objetivo: (backendData.inventario?.valor_total || 0) * 1.1,
      porcentaje_cumplimiento: 90,
      estado: 'bueno'
    },
    {
      nombre: 'Pacientes Activos',
      valor: backendData.clientes?.total_clientes || 0,
      objetivo: (backendData.clientes?.total_clientes || 0) * 1.05,
      porcentaje_cumplimiento: 95,
      estado: 'excelente'
    }
  ],
  tendencias: []
};
}

}
