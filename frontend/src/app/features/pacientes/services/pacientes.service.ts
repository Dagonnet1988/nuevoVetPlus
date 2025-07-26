import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  Cliente, 
  Mascota, 
  PacienteCompleto, 
  PacienteFormData, 
  PacienteFilter,
  PacienteResponse 
} from '../models/paciente.interface';

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private readonly API_URL = `${environment.apiUrl}/clinical`;

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
    if (filters?.activo !== undefined) {
      params = params.set('activo', filters.activo.toString());
    }

    return this.http.get<PacienteResponse>(`${this.API_URL}/mascotas`, { params });
  }

  getMascotaById(id: string): Observable<Mascota> {
    return this.http.get<Mascota>(`${this.API_URL}/mascotas/${id}`);
  }

  getMascotasByCliente(clienteId: string): Observable<Mascota[]> {
    return this.http.get<Mascota[]>(`${this.API_URL}/clientes/${clienteId}/mascotas`);
  }

  createMascota(mascota: Partial<Mascota>): Observable<Mascota> {
    return this.http.post<Mascota>(`${this.API_URL}/mascotas`, mascota);
  }

  updateMascota(id: string, mascota: Partial<Mascota>): Observable<Mascota> {
    return this.http.put<Mascota>(`${this.API_URL}/mascotas/${id}`, mascota);
  }

  deleteMascota(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/mascotas/${id}`);
  }

  // ===============================
  // OPERACIONES COMBINADAS
  // ===============================

  createPacienteCompleto(paciente: PacienteFormData): Observable<PacienteCompleto> {
    return this.http.post<PacienteCompleto>(`${this.API_URL}/pacientes`, paciente);
  }

  getPacienteCompleto(clienteId: string): Observable<PacienteCompleto> {
    return this.http.get<PacienteCompleto>(`${this.API_URL}/pacientes/${clienteId}`);
  }

  // ===============================
  // UTILIDADES
  // ===============================

  getEspecies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/especies`);
  }

  getRazasByEspecie(especie: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/especies/${especie}/razas`);
  }

  // Mock data para desarrollo (temporal)
  getMockEspecies(): string[] {
    return [
      'Perro',
      'Gato', 
      'Ave',
      'Hamster',
      'Conejo',
      'Reptil',
      'Pez',
      'Otro'
    ];
  }

  getMockRazas(especie: string): string[] {
    const razasPorEspecie: { [key: string]: string[] } = {
      'Perro': [
        'Labrador Retriever',
        'Golden Retriever', 
        'Bulldog Francés',
        'Pastor Alemán',
        'Bulldog Inglés',
        'Beagle',
        'Poodle',
        'Rottweiler',
        'Yorkshire Terrier',
        'Chihuahua',
        'Mestizo',
        'Otro'
      ],
      'Gato': [
        'Persa',
        'Maine Coon',
        'Siamés',
        'Ragdoll',
        'British Shorthair',
        'Abisinio',
        'Bengalí',
        'Sphynx',
        'Mestizo',
        'Otro'
      ],
      'Ave': [
        'Canario',
        'Periquito',
        'Cacatúa',
        'Loro',
        'Agapornis',
        'Otro'
      ],
      'Hamster': ['Sirio', 'Ruso', 'Chino', 'Otro'],
      'Conejo': ['Holland Lop', 'Angora', 'Cabeza de León', 'Otro'],
      'Reptil': ['Iguana', 'Gecko', 'Pitón', 'Tortuga', 'Otro'],
      'Pez': ['Goldfish', 'Betta', 'Guppy', 'Otro']
    };

    return razasPorEspecie[especie] || ['Otro'];
  }
}