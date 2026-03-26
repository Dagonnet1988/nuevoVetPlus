import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Cliente,
  Mascota,
  PacienteCompleto,
  PacienteFormData,
  PacienteFilter,
  PacienteResponse,
  CreatePacienteResponse
} from '../models/paciente.interface';

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private readonly API_URL = `${environment.apiUrl}/clinical`;

  // BehaviorSubject para notificar cambios de fotos
  private photoUpdatedSubject = new BehaviorSubject<{mascotaId: string, fotoUrl: string} | null>(null);
  public photoUpdated$ = this.photoUpdatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===============================
  // OPERACIONES DE CLIENTES
  // ===============================

  getClientes(page: number = 1, limit: number = 10, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(`${this.API_URL}/clientes`, { params });
  }

  getClienteById(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.API_URL}/clientes/${id}`);
  }

  createCliente(cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.API_URL}/clientes`, cliente);
  }

  updateCliente(id: string, cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.API_URL}/clientes/${id}`, cliente);
  }

  deleteCliente(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/clientes/${id}`);
  }

  // ===============================
  // OPERACIONES DE MASCOTAS
  // ===============================

  getMascotas(page: number = 1, limit: number = 10, filters?: PacienteFilter): Observable<PacienteResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.especie) {
      params = params.set('especie', filters.especie);
    }
    if (filters?.cliente) {
      params = params.set('cliente', filters.cliente);
    }
    if (filters?.activo !== undefined && filters.activo !== null) {
      params = params.set('activo', filters.activo.toString());
    }

    return this.http.get<PacienteResponse>(`${this.API_URL}/pacientes`, { params });
  }

  getMascotaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/pacientes/${id}`);
  }

  getMascotasByCliente(clienteId: string): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.API_URL}/pets/client/${clienteId}`
    );
  }

  createMascota(mascota: Partial<Mascota>): Observable<Mascota> {
    return this.http.post<Mascota>(`${this.API_URL}/pacientes/mascota`, mascota);
  }

  updateMascota(id: string, mascota: Partial<Mascota>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/pacientes/mascota/${id}`, mascota);
  }

  updatePacienteCompleto(id: string, paciente: PacienteFormData): Observable<CreatePacienteResponse> {
    return this.http.put<CreatePacienteResponse>(`${this.API_URL}/pacientes/${id}`, paciente);
  }

  inactivarMascota(id: string, motivo: 'Fallecida' | 'Transferida' | 'Error de registro' | 'Otro'): Observable<any> {
    return this.http.patch(`${this.API_URL}/pacientes/mascota/${id}/inactivar`, { motivo });
  }

  // ===============================
  // OPERACIONES COMBINADAS
  // ===============================

  createPacienteCompleto(paciente: PacienteFormData): Observable<CreatePacienteResponse> {
    return this.http.post<CreatePacienteResponse>(`${this.API_URL}/pacientes`, paciente);
  }

  getPacienteCompleto(clienteId: string): Observable<PacienteCompleto> {
    return this.http.get<PacienteCompleto>(`${this.API_URL}/clients/${clienteId}`);
  }

  getPacienteStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/pacientes/stats`);
  }

  // ===============================
  // UTILIDADES
  // ===============================

  getEspecies(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/pacientes/especies`);
  }

  getRazasByEspecie(especie: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/pacientes/especies/${especie}/razas`);
  }

  // ===============================
  // MANEJO DE FOTOS
  // ===============================

  uploadFotoPaciente(id: string, foto: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', foto);
    return this.http.post<any>(`${this.API_URL}/pacientes/${id}/foto`, formData)
      .pipe(
        map(response => {
          // Notificar que la foto se actualizó
          if (response.success && response.data?.foto_url) {
            this.photoUpdatedSubject.next({
              mascotaId: id,
              fotoUrl: response.data.foto_url
            });
          }
          return response;
        })
      );
  }

  getFotoPaciente(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/pacientes/${id}/foto`);
  }

  eliminarFotoPaciente(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/pacientes/${id}/foto`)
      .pipe(
        map(response => {
          // Notificar que la foto se eliminó
          if (response.success) {
            this.photoUpdatedSubject.next({
              mascotaId: id,
              fotoUrl: response.data?.foto_url || ''
            });
          }
          return response;
        })
      );
  }

  // Método para notificar cambios de foto manualmente
  notifyPhotoUpdate(mascotaId: string, fotoUrl: string): void {
    this.photoUpdatedSubject.next({ mascotaId, fotoUrl });
  }

  // Funciones de especies y razas ahora conectadas al backend real
}
