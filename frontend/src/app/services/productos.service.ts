import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Producto {
  id_producto: string;
  codigo: string;
  codigo_barras?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  tipo: 'Producto' | 'Servicio' | 'Terapia Individual';
  precio_compra?: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  unidad_medida: string;
  lote?: string;
  fecha_vencimiento?: string;
  ubicacion?: string;
  inventariable: boolean;
  activo: boolean;
  requiere_receta: boolean;
  iva_aplicable: number;
  sesiones_incluidas?: number;
  duracion_sesion?: number;
  created_at: string;
  updated_at: string;
  movimientos?: MovimientoInventario[];
}

export interface MovimientoInventario {
  id_movimiento: string;
  id_producto: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion';
  cantidad: number;
  precio_unitario?: number;
  motivo: string;
  referencia?: string; // ID de consulta, factura, etc.
  fecha_movimiento: string;
  usuario_responsable: string;
  stock_anterior: number;
  stock_nuevo: number;
  created_at: string;
}

export interface CategoriaProducto {
  id_categoria: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  categoria_padre_id?: string;
  subcategorias?: SubcategoriaProducto[];
  total_productos?: number;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubcategoriaProducto {
  id_subcategoria: string;
  id_categoria: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface Proveedor {
  id_proveedor: string;
  nombre: string;
  ruc?: string;
  razon_social?: string;
  rfc?: string;
  tipo_proveedor: string;
  contacto_principal?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  estado?: string;
  codigo_postal?: string;
  condiciones_pago?: string;
  descuento_habitual?: number;
  tiempo_entrega?: number;
  monto_minimo_compra?: number;
  notas_comerciales?: string;
  descripcion?: string;
  total_productos?: number;
  ultima_compra?: string;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductoFilter {
  categoria?: string;
  tipo?: string;
  inventariable?: boolean;
  stock_bajo?: boolean;
  vencimiento_proximo?: boolean;
  activo?: boolean;
  search?: string;
}

export interface InventarioResumen {
  total_productos: number;
  valor_total_inventario: number;
  productos_stock_bajo: number;
  productos_vencimiento_proximo: number;
  categorias_activas: number;
  movimientos_hoy: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private readonly API_URL = `${environment.apiUrl}/financial`;

  constructor(private http: HttpClient) {}

  // ===============================
  // PRODUCTOS
  // ===============================

  getProductos(page: number = 1, limit: number = 50, filters?: ProductoFilter): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.categoria) params = params.set('categoria', filters.categoria);
      if (filters.tipo) params = params.set('tipo', filters.tipo);
      if (filters.inventariable !== undefined) params = params.set('inventariable', filters.inventariable.toString());
      if (filters.activo !== undefined) params = params.set('activo', filters.activo.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<any>(`${this.API_URL}/products`, { params });
  }

  getProducto(id: string): Observable<Producto> {
    return this.http.get<any>(`${this.API_URL}/products/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Producto no encontrado');
      })
    );
  }

  createProducto(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>): Observable<Producto> {
    return this.http.post<Producto>(`${this.API_URL}/products`, producto);
  }

  updateProducto(id: string, producto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.API_URL}/products/${id}`, producto);
  }

  deleteProducto(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/products/${id}`);
  }

  // ===============================
  // MOVIMIENTOS DE INVENTARIO
  // ===============================

  getMovimientos(page: number = 1, limit: number = 50, filtros?: any): Observable<any> {
    // Usar sistema de ingresos y egresos del backend real
    const fechaInicio = filtros?.fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaFin = filtros?.fecha_fin || new Date().toISOString().split('T')[0];

    const ingresos$ = this.http.get<any>(`${this.API_URL}/ingresos`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: (limit/2).toString() }
    });

    const egresos$ = this.http.get<any>(`${this.API_URL}/egresos`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: (limit/2).toString() }
    });

    return this.http.get<any>(`${this.API_URL}/reportes/financiero`, {
      params: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        grupo_por: 'fecha',
        page: page.toString(),
        limit: limit.toString()
      }
    }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            success: true,
            data: {
              movements: response.data.movimientos || [],
              pagination: response.data.pagination || {
                page: page,
                limit: limit,
                total: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
              }
            }
          };
        }
        return {
          success: true,
          data: {
            movements: [],
            pagination: {
              page: page,
              limit: limit,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          }
        };
      }),
      catchError(() => {
        return new Observable(observer => {
          observer.next({
            success: true,
            data: {
              movements: [],
              pagination: {
                page: page,
                limit: limit,
                total: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
              }
            }
          });
          observer.complete();
        });
      })
    );
  }

  registrarMovimiento(movimiento: Omit<MovimientoInventario, 'id_movimiento' | 'stock_anterior' | 'stock_nuevo' | 'created_at'>): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.API_URL}/movements`, movimiento);
  }

  getMovimientosByProducto(idProducto: string): Observable<MovimientoInventario[]> {
    // Como no hay endpoint específico para movimientos por producto,
    // retornamos el historial del producto desde las actualizaciones de stock
    return this.http.get<any>(`${this.API_URL}/products/${idProducto}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Simular movimientos basados en el stock actual del producto
          const producto = response.data;
          return [{
            id_movimiento: `${idProducto}-actual`,
            id_producto: idProducto,
            tipo_movimiento: 'ajuste' as any,
            cantidad: producto.stock_actual || 0,
            stock_anterior: 0,
            stock_nuevo: producto.stock_actual || 0,
            motivo: 'Stock inicial',
            referencia: undefined,
            fecha_movimiento: producto.updated_at || new Date().toISOString(),
            usuario_responsable: 'Sistema',
            created_at: producto.updated_at || new Date().toISOString(),
            precio_unitario: undefined
          }];
        }
        return [];
      }),
      catchError(() => {
        return new Observable<MovimientoInventario[]>(observer => {
          observer.next([]);
          observer.complete();
        });
      })
    );
  }

  // ===============================
  // CATEGORÍAS
  // ===============================

  getCategorias(): Observable<CategoriaProducto[]> {
    return this.http.get<any>(`${this.API_URL}/products/categories`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data.map((cat: any) => ({
            id_categoria: cat.categoria,
            nombre: cat.categoria,
            total_productos: parseInt(cat.count) || 0,
            activa: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        }
        return [];
      })
    );
  }

  createCategoria(categoria: Omit<CategoriaProducto, 'id_categoria'>): Observable<CategoriaProducto> {
    return this.http.post<CategoriaProducto>(`${this.API_URL}/categories`, categoria);
  }

  updateCategoria(id: string, categoria: Partial<CategoriaProducto>): Observable<CategoriaProducto> {
    return this.http.put<CategoriaProducto>(`${this.API_URL}/categories/${id}`, categoria);
  }

  deleteCategoria(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/categories/${id}`);
  }

  // Subcategorías
  createSubcategoria(subcategoria: Omit<SubcategoriaProducto, 'id_subcategoria'>): Observable<SubcategoriaProducto> {
    return this.http.post<SubcategoriaProducto>(`${this.API_URL}/subcategories`, subcategoria);
  }

  updateSubcategoria(id: string, subcategoria: Partial<SubcategoriaProducto>): Observable<SubcategoriaProducto> {
    return this.http.put<SubcategoriaProducto>(`${this.API_URL}/subcategories/${id}`, subcategoria);
  }

  deleteSubcategoria(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/subcategories/${id}`);
  }

  exportarCategorias(): Observable<any> {
    return this.http.get(`${this.API_URL}/categories/export`, { responseType: 'blob' });
  }

  // ===============================
  // PROVEEDORES
  // ===============================

  getProveedores(page: number = 1, limit: number = 50, filtros?: any): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filtros) {
      if (filtros.search) params = params.set('search', filtros.search);
      if (filtros.tipo_proveedor) params = params.set('tipo_proveedor', filtros.tipo_proveedor);
      if (filtros.activo !== undefined) params = params.set('activo', filtros.activo.toString());
    }

    return this.http.get<any>(`${this.API_URL}/proveedores`, { params });
  }

  getProveedor(id: string): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.API_URL}/proveedores/${id}`);
  }

  createProveedor(proveedor: Omit<Proveedor, 'id_proveedor' | 'created_at'>): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.API_URL}/proveedores`, proveedor);
  }

  updateProveedor(id: string, proveedor: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.API_URL}/proveedores/${id}`, proveedor);
  }

  deleteProveedor(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/proveedores/${id}`);
  }

  exportarProveedores(): Observable<any> {
    return this.http.get(`${this.API_URL}/proveedores/export`, { responseType: 'blob' });
  }

  descargarPlantillaProveedores(): Observable<any> {
    return this.http.get(`${this.API_URL}/proveedores/template`, { responseType: 'blob' });
  }

  // ===============================
  // REPORTES Y ESTADÍSTICAS
  // ===============================

  getResumenInventario(): Observable<InventarioResumen> {
    return this.http.get<any>(`${environment.apiUrl}/reports/inventory`).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.resumen) {
          const resumen = response.data.resumen;
          return {
            total_productos: resumen.total_productos || 0,
            valor_total_inventario: resumen.valor_inventario || 0,
            productos_stock_bajo: resumen.productos_criticos || 0,
            productos_vencimiento_proximo: 0, // Not available in backend
            categorias_activas: resumen.categorias_activas || 0,
            movimientos_hoy: 0 // Not available in this endpoint
          };
        }
        return {
          total_productos: 0,
          valor_total_inventario: 0,
          productos_stock_bajo: 0,
          productos_vencimiento_proximo: 0,
          categorias_activas: 0,
          movimientos_hoy: 0
        };
      })
    );
  }

  getProductosStockBajo(): Observable<Producto[]> {
    return this.http.get<any>(`${environment.apiUrl}/reports/inventory?critico_only=true`).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.productos_criticos) {
          return response.data.productos_criticos.map((item: any) => ({
            id_producto: item.codigo || '',
            codigo_producto: item.codigo || '',
            nombre: item.nombre || '',
            categoria: item.categoria || '',
            stock_actual: item.stock_actual || 0,
            stock_minimo: item.stock_minimo || 0,
            precio_venta: item.precio_venta || 0,
            precio_compra: 0,
            stock_maximo: 0,
            unidad_medida: '',
            tipo_producto: 'medicamento' as any,
            activo: true,
            requiere_receta: false,
            iva_aplicable: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        }
        return [];
      })
    );
  }

  getProductosVencimientoProximo(dias: number = 30): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/products/expiring-soon`, {
      params: { dias: dias.toString() }
    });
  }

  getReporteMovimientos(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/reports/movements`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    });
  }

  getReporteValorizacion(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/reports/valuation`);
  }

  // ===============================
  // CÓDIGOS DE BARRAS Y BÚSQUEDA
  // ===============================

  buscarPorCodigo(codigo: string): Observable<Producto | null> {
    return this.http.get<Producto>(`${this.API_URL}/products/by-code/${codigo}`);
  }

  generarCodigoBarras(idProducto: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/products/${idProducto}/barcode`, {
      responseType: 'blob' as 'json'
    });
  }

  // ===============================
  // IMPORTACIÓN Y EXPORTACIÓN
  // ===============================

  exportarInventario(formato: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/export`, {
      params: { formato },
      responseType: 'blob'
    });
  }

  importarProductos(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<any>(`${this.API_URL}/import`, formData);
  }

  descargarPlantillaImportacion(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/import/template`, {
      responseType: 'blob'
    });
  }

  // ===============================
  // UTILIDADES
  // ===============================

  calcularMargenGanancia(precioCompra: number, precioVenta: number): number {
    if (precioCompra === 0) return 0;
    return ((precioVenta - precioCompra) / precioCompra) * 100;
  }

  calcularValorStock(producto: Producto): number {
    return producto.stock_actual * (producto.precio_compra || 0);
  }

  estaEnStockBajo(producto: Producto): boolean {
    return producto.stock_actual <= producto.stock_minimo;
  }

  diasParaVencer(fechaVencimiento: string): number {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(precio);
  }

  validarCodigoProducto(codigo: string): boolean {
    // Validar formato de código (ejemplo: PRD-001)
    const regex = /^[A-Z]{3}-\d{3,}$/;
    return regex.test(codigo);
  }
}
