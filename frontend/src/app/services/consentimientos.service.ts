import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConsentimientoEstado {
  estado: 'sin_consentimiento' | 'pendiente' | 'firmado' | 'expirado' | 'desactualizado' | 'revocado';
  consentimiento: {
    id: string;
    estado: string;
    firmaUrl?: string;
    expiresAt?: string;
    firmadoEn?: string;
    pdfDisponible?: boolean;
    pdfNumero?: string;
    versionTitulo?: string;
    idVersion?: string;
    whatsappEnviado?: boolean;
    emailEnviado?: boolean;
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

  revocar(idCliente: string, motivo: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.BASE}/${idCliente}/consentimiento/revocar`, { motivo });
  }
}
