import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    return this.http.get<ConsentimientoPublicoData>(`${this.BASE}/${token}`).pipe(
      map((data) => ({
        ...data,
        empresa: {
          ...data.empresa,
          logoUrl: this.toAbsoluteAssetUrl(data.empresa?.logoUrl ?? null)
        }
      }))
    );
  }

  firmar(token: string, firmaBase64: string): Observable<FirmarResponse> {
    return this.http.post<FirmarResponse>(`${this.BASE}/${token}/firmar`, { firmaBase64 });
  }

  private toAbsoluteAssetUrl(url: string | null): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const clean = url.startsWith('/') ? url : `/${url}`;
    return `${environment.backendUrl}${clean}`;
  }
}
