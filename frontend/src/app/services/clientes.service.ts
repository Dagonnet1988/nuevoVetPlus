import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Cliente {
  id_cliente: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private API_URL = `${environment.apiUrl}/clinical/clients`;

  constructor(private http: HttpClient) { }

  getClientes(page: number = 1, limit: number = 10, search?: string): Observable<{ data: Cliente[], pagination: any }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // El backend devuelve { clients: [...], pagination: {...} }
          return {
            data: response.data.clients || [],
            pagination: response.data.pagination || {}
          };
        }
        return { data: [], pagination: {} };
      })
    );
  }

  getCliente(id: string): Observable<Cliente> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Cliente no encontrado');
      })
    );
  }

  createCliente(cliente: Omit<Cliente, 'id_cliente' | 'created_at' | 'updated_at'>): Observable<Cliente> {
    return this.http.post<any>(this.API_URL, cliente).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error creando cliente');
      })
    );
  }

  updateCliente(id: string, cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<any>(`${this.API_URL}/${id}`, cliente).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Error actualizando cliente');
      })
    );
  }

  deleteCliente(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }
}
