import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConsentimientoEstado {
  estado: 'sin_consentimiento' | 'pendiente' | 'firmado' | 'expirado';
  consentimiento: {
    id_consentimiento: string;
    token?: string;
    firmado_en?: string;
    token_expires_at?: string;
    pdf_path?: string;
    pdf_numero?: string;
    whatsapp_enviado?: boolean;
    email_enviado?: boolean;
    version_titulo?: string;
  } | null;
}

export interface ConsentimientoCreado {
  id: string;
  token: string;
  firmaUrl: string;
  qrBase64: string;
  expiresAt: string;
  cliente: { id: string; nombre: string };
  version: { id: string; titulo: string };
}

@Injectable({
  providedIn: 'root'
})
export class ConsentimientosService {
  private readonly BASE = `${environment.apiUrl}/clinical/pacientes/cliente`;

  constructor(private http: HttpClient) {}

  obtenerEstado(idCliente: string): Observable<ConsentimientoEstado> {
    return this.http.get<ConsentimientoEstado>(`${this.BASE}/${idCliente}/consentimiento/estado`);
  }

  crear(idCliente: string): Observable<ConsentimientoCreado> {
    return this.http.post<ConsentimientoCreado>(`${this.BASE}/${idCliente}/consentimiento`, {});
  }

  reenviar(idCliente: string): Observable<ConsentimientoCreado> {
    return this.http.post<ConsentimientoCreado>(`${this.BASE}/${idCliente}/consentimiento/reenviar`, {});
  }

  descargarPDF(idCliente: string): Observable<Blob> {
    return this.http.get(`${this.BASE}/${idCliente}/consentimiento/pdf`, { responseType: 'blob' });
  }
}
