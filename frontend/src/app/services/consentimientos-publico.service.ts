import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConsentimientoPublicoData {
  idConsentimiento: string;
  cliente: {
    nombre: string;
    cedula: string;
  };
  version: {
    id: string;
    titulo: string;
    textoLegal: string;
  };
  empresa: {
    nombre: string;
    logoUrl: string | null;
  };
  expiresAt: string;
  tokenDurationHours: number;
}

export interface FirmarResponse {
  message: string;
  pdfNumero?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsentimientosPublicoService {
  private readonly BASE = `${environment.apiUrl}/public/consentimiento`;

  constructor(private http: HttpClient) {}

  obtenerFormulario(token: string): Observable<ConsentimientoPublicoData> {
    return this.http.get<ConsentimientoPublicoData>(`${this.BASE}/${token}`);
  }

  firmar(token: string, firmaBase64: string): Observable<FirmarResponse> {
    return this.http.post<FirmarResponse>(`${this.BASE}/${token}/firmar`, { firmaBase64 });
  }
}
