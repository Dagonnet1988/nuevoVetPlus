import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
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
  private readonly NOTIFICACIONES = `${environment.apiUrl}/clinical/notificaciones`;

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

  enviarPorCorreo(idCliente: string, emailDestino?: string): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(
      `${this.NOTIFICACIONES}/consentimiento/${idCliente}/email`,
      { email_destino: emailDestino || undefined }
    );
  }

  descargarPDF(idCliente: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.BASE}/${idCliente}/consentimiento/pdf`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  revocar(idCliente: string, motivo: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.BASE}/${idCliente}/consentimiento/revocar`, { motivo });
  }
}
