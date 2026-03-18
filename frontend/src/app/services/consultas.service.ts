import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones?: string;
}

export interface ConsultaClinica {
  id_consulta: string;
  codigo_consulta: string;
  id_mascota: string;
  id_veterinario: string;
  fecha_consulta: string;
  motivo: string;
  anamnesis?: string;
  examen_fisico?: string;
  temperatura?: number;
  peso?: number;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  observaciones_examen?: string;
  diagnostico?: string;
  tratamiento?: string;
  medicamentos?: string | Medicamento[]; // Puede ser string simple o array estructurado
  recomendaciones?: string;
  proxima_cita?: string;
  notas?: string;
  estado: 'Programada' | 'En Curso' | 'Completada' | 'Cancelada';
  costo?: number;
  enviar_recordatorio?: boolean;
  seguimiento_requerido?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  mascota?: {
    id_mascota: string;
    nombre: string;
    especie: string;
    raza: string;
    fecha_nacimiento?: string;
    peso?: number;
    foto?: string;
    cliente?: {
      nombre: string;
      email: string;
      telefono: string;
    };
  };
  veterinario?: {
    id_usuario: string;
    nombre: string;
    email: string;
  };
}

export interface ConsultaFormData {
  id_mascota: string;
  id_veterinario: string;
  motivo: string;
  anamnesis?: string;
  examen_fisico?: string;
  temperatura?: number;
  peso?: number;
  diagnostico?: string;
  tratamiento?: string;
  medicamentos?: string;
  recomendaciones?: string;
  proxima_cita?: string;
  estado?: 'En Curso' | 'Completada' | 'Cancelada';
  costo?: number;
}

export interface ConsultaFilter {
  mascota?: string;
  veterinario?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  search?: string;
}

export interface PlantillaConsulta {
  id_plantilla: string;
  nombre: string;
  descripcion: string;
  campos: {
    anamnesis?: string;
    examen_fisico?: string;
    diagnostico?: string;
    tratamiento?: string;
    medicamentos?: string;
    recomendaciones?: string;
  };
  especialidad?: string;
  created_by: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultasService {
  private readonly API_URL = `${environment.apiUrl}/clinical`;

  constructor(private http: HttpClient) {}

  // ===============================
  // OPERACIONES BÁSICAS DE CONSULTAS
  // ===============================

  getConsultas(page: number = 1, limit: number = 10, filters?: ConsultaFilter): Observable<any> {
    const offset = (page - 1) * limit;
    let params = new HttpParams()
      .set('offset', offset.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.mascota) params = params.set('mascota', filters.mascota);
      if (filters.veterinario) params = params.set('veterinario', filters.veterinario);
      if (filters.fecha_inicio) params = params.set('fecha_desde', filters.fecha_inicio);
      if (filters.fecha_fin) params = params.set('fecha_hasta', filters.fecha_fin);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<any>(`${this.API_URL}/consultations`, { params });
  }

  getConsulta(id: string): Observable<ConsultaClinica> {
    return this.http.get<ConsultaClinica>(`${this.API_URL}/consultations/${id}`);
  }

  getConsultaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultations/${id}`);
  }

  createConsulta(consulta: ConsultaFormData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/consultations`, consulta);
  }

  updateConsulta(id: string, consulta: Partial<ConsultaFormData>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/consultations/${id}`, consulta);
  }

  deleteConsulta(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/consultations/${id}`);
  }

  // ===============================
  // OPERACIONES CITA → CONSULTA
  // ===============================

  createConsultaFromCita(idCita: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/consultations/from-appointment/${idCita}`, {});
  }

  getConsultaByCitaId(idCita: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultations/by-appointment/${idCita}`);
  }

  // ===============================
  // CONSULTAS POR MASCOTA
  // ===============================

  getConsultasByMascota(idMascota: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultations/pet/${idMascota}`);
  }

  getHistoriaClinicaMascota(idMascota: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultations/pet/${idMascota}/history`);
  }

  // ===============================
  // CONSULTAS POR CITA
  // ===============================

  getConsultaFromAppointment(citaId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/appointments/${citaId}/consultation`);
  }

  // ===============================
  // PLANTILLAS DE CONSULTA
  // ===============================

  getPlantillas(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultation-templates`);
  }

  createPlantilla(plantilla: Omit<PlantillaConsulta, 'id_plantilla' | 'created_by'>): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/consultation-templates`, plantilla);
  }

  updatePlantilla(id: string, plantilla: Partial<PlantillaConsulta>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/consultation-templates/${id}`, plantilla);
  }

  deletePlantilla(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/consultation-templates/${id}`);
  }

  // ===============================
  // ESTADISTICAS CLINICAS
  // ===============================

  getEstadisticasConsultas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);

    return this.http.get<any>(`${this.API_URL}/consultations/stats`, { params });
  }

  // ===============================
  // ARCHIVOS Y DOCUMENTOS
  // ===============================

  uploadDocumento(consultaId: string, file: File, descripcion?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (descripcion) formData.append('descripcion', descripcion);

    return this.http.post<any>(`${this.API_URL}/consultations/${consultaId}/documents`, formData);
  }

  getArchivos(consultaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/consultations/${consultaId}/documents`);
  }

  getDocumentosConsulta(consultaId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/consultations/${consultaId}/documents`);
  }

  downloadArchivo(archivoId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/documents/${archivoId}/download`, {
      responseType: 'blob'
    });
  }

  deleteArchivo(archivoId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/documents/${archivoId}`);
  }

  deleteDocumento(consultaId: string, documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/consultations/${consultaId}/documents/${documentoId}`);
  }

  // ===============================
  // EXPORTACION DE DOCUMENTOS
  // ===============================

  generarReceta(consultaId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/consultations/${consultaId}/prescription`, {}, {
      responseType: 'blob' as 'json'
    });
  }

  generarCertificado(consultaId: string, tipo: 'salud' | 'vacunacion' | 'tratamiento'): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/consultations/${consultaId}/certificate`, { tipo }, {
      responseType: 'blob' as 'json'
    });
  }

  exportarConsulta(consultaId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/consultations/${consultaId}/export`, {
      responseType: 'blob'
    });
  }

  exportarHistoriaClinica(idMascota: string, formato: 'pdf' | 'excel' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/consultations/pet/${idMascota}/export`, {
      params: { formato },
      responseType: 'blob'
    });
  }

  // ===============================
  // UTILIDADES
  // ===============================

  calcularIMC(peso: number, especie: string): number {
    // Lógica específica para calcular IMC veterinario
    const baseIMC = {
      'Perro': { min: 4, max: 5 },
      'Gato': { min: 3, max: 5 },
      'Conejo': { min: 3, max: 4 }
    };

    return peso / ((baseIMC[especie as keyof typeof baseIMC]?.max || 4.5) ** 2);
  }

  formatearTemperatura(temp: number): string {
    return `${temp.toFixed(1)}°C`;
  }

  obtenerRangoTemperaturaNormal(especie: string): { min: number; max: number } {
    const rangos = {
      'Perro': { min: 38.0, max: 39.2 },
      'Gato': { min: 38.1, max: 39.2 },
      'Conejo': { min: 38.5, max: 40.0 },
      'Ave': { min: 40.0, max: 42.0 }
    };

    return rangos[especie as keyof typeof rangos] || { min: 38.0, max: 39.5 };
  }
}
