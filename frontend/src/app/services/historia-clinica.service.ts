import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoDocumento = 'valoracion_inicial' | 'seguimiento' | 'formula' | 'remision';
export type EstadoHistoria = 'Borrador' | 'Completado' | 'Cancelado';

export const TIPO_LABELS: Record<TipoDocumento, string> = {
  valoracion_inicial: 'Valoración Inicial',
  seguimiento:        'Seguimiento',
  formula:            'Fórmula',
  remision:           'Remisión',
};

export const TIPO_ICONS: Record<TipoDocumento, string> = {
  valoracion_inicial: 'assignment',
  seguimiento:        'repeat',
  formula:            'medication',
  remision:           'send',
};

export const TIPO_COLORS: Record<TipoDocumento, string> = {
  valoracion_inicial: '#1976d2',
  seguimiento:        '#388e3c',
  formula:            '#f57c00',
  remision:           '#7b1fa2',
};

export interface HistoriaClinica {
  id_historia:       string;
  codigo_historia:   string;
  tipo_documento:    TipoDocumento;
  id_mascota:        string;
  id_veterinario:    string;
  id_cita?:          string;
  fecha:             string;
  estado:            EstadoHistoria;
  id_tenant:         string;
  created_at:        string;
  updated_at:        string;
  // Joins
  mascota_nombre?:     string;
  cliente_nombre?:     string;
  cliente_id?:         string;
  veterinario_nombre?: string;
  especie?:            string;
  raza?:               string;
  sexo?:               string;
  peso?:               number;
  // Datos del tipo hijo (solo en getById)
  datos?: DatosValoracionInicial | DatosSeguimiento | DatosFormula | DatosRemision;
  archivos?: ArchivoHistoria[];
}

export interface DatosValoracionInicial {
  remitido_por?:               string;
  anamnesis?:                  string;
  antiguedad_signos?:          string;
  medicacion_previa?:          string;
  enfermedades_anteriores?:    string;
  actividad_fisica?:           string;
  valoracion_estatica?:        string;
  valoracion_dinamica?:        string;
  hallazgos_musculares?:       string;
  perimetria_mtd_1?:           number;
  perimetria_mtd_2?:           number;
  perimetria_mti_1?:           number;
  perimetria_mti_2?:           number;
  perimetria_mpd_1?:           number;
  perimetria_mpd_2?:           number;
  perimetria_mpi_1?:           number;
  perimetria_mpi_2?:           number;
  hallazgos_osteoarticulares?: string;
  goniometria?:                Record<string, any>;
  prueba_cajon?:               string;
  prueba_compresion_tibial?:   string;
  prueba_ortolani?:            string;
  luxacion_patelar?:           string;
  sensibilidad?:               string;
  propiocepcion?:              string;
  equilibrio?:                 string;
  paniculo?:                   string;
  reflejos?:                   Record<string, any>;
  imagenes_diagnosticas?:      string;
  diagnostico?:                string;
  tratamiento?:                string;
  recomendaciones?:            string;
  proxima_cita?:               string;
  costo?:                      number;
}

export interface DatosSeguimiento {
  numero_sesion?:         number;
  observaciones_en_casa?: string;
  ejercicios_realizados?: string;
  recomendaciones_casa?:  string;
  notas_clinicas?:        string;
  costo?:                 number;
}

export interface Medicamento {
  medicamento:   string;
  instrucciones: string;
  cantidad:      string;
  dosis?:        string;
  frecuencia?:   string;
  duracion?:     string;
}

export interface DatosFormula {
  medicamentos?:     Medicamento[];
  plan_terapeutico?: string;
  notas?:            string;
}

export interface DatosRemision {
  motivo?:               string;
  texto_remision?:       string;
  especialidad_destino?: string;
  profesional_destino?:  string;
  institucion_destino?:  string;
}

export interface ArchivoHistoria {
  id_archivo:          string;
  nombre_original:     string;
  nombre_archivo?:     string;
  ruta_archivo?:       string;
  tipo_mime?:          string;
  tamano_bytes?:       number;
  descripcion?:        string;
  created_at:          string;
  subido_por_nombre?:  string;
}

export interface HistoriaFilter {
  page?:          number;
  limit?:         number;
  id_mascota?:    string;
  tipo_documento?: TipoDocumento;
  estado?:        EstadoHistoria;
  fecha_desde?:   string;
  fecha_hasta?:   string;
  search?:        string;
}

export interface HistoriaFormData {
  tipo_documento:  TipoDocumento;
  id_mascota:      string;
  id_veterinario:  string;
  id_cita?:        string;
  fecha?:          string;
  estado?:         EstadoHistoria;
  // Campos de todos los tipos (se ignoran los que no corresponden al tipo)
  [key: string]: any;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class HistoriaClinicaService {
  private readonly API = `${environment.apiUrl}/clinical/historias`;
  private readonly NOTIFICACIONES_API = `${environment.apiUrl}/clinical/notificaciones`;

  constructor(private http: HttpClient) {}

  getHistorias(filters: HistoriaFilter = {}): Observable<{ success: boolean; data: HistoriaClinica[]; pagination: any }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<any>(this.API, { params });
  }

  getHistoriaById(id: string): Observable<{ success: boolean; data: HistoriaClinica }> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  getHistoriaByCitaId(idCita: string): Observable<{ success: boolean; data: HistoriaClinica }> {
    return this.http.get<any>(`${this.API}/by-appointment/${idCita}`);
  }

  getHistoriasByCitaId(idCita: string): Observable<{ success: boolean; data: HistoriaClinica[]; total: number }> {
    return this.http.get<any>(`${this.API}/by-appointment/${idCita}/all`);
  }

  createHistoria(data: HistoriaFormData): Observable<{ success: boolean; data: HistoriaClinica }> {
    return this.http.post<any>(this.API, data);
  }

  updateHistoria(id: string, data: Partial<HistoriaFormData>): Observable<{ success: boolean; data: HistoriaClinica }> {
    return this.http.put<any>(`${this.API}/${id}`, data);
  }

  uploadHistoriaArchivos(id: string, files: File[]): Observable<{ success: boolean; message: string; data: any }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('archivos', f));
    return this.http.post<any>(`${this.API}/${id}/upload-files`, formData);
  }

  deleteHistoria(id: string, motivoAnulacion?: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.API}/${id}`, {
      body: motivoAnulacion ? { motivo_anulacion: motivoAnulacion } : {}
    });
  }

  reactivateHistoria(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.API}/${id}/reactivar`, {});
  }

  sendHistoriaByEmail(idHistoria: string, emailDestino?: string): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<any>(`${this.NOTIFICACIONES_API}/historia/${idHistoria}/email`, {
      email_destino: emailDestino || undefined
    });
  }

  sendHistoriasByEmail(idsHistoria: string[], emailDestino?: string): Observable<Array<{ id_historia: string; ok: boolean; message: string }>> {
    const uniqueIds = Array.from(new Set((idsHistoria || []).filter(Boolean)));
    if (!uniqueIds.length) return new Observable((subscriber) => {
      subscriber.next([]);
      subscriber.complete();
    });

    return new Observable((subscriber) => {
      const results: Array<{ id_historia: string; ok: boolean; message: string }> = [];
      let processed = 0;

      uniqueIds.forEach((id) => {
        this.sendHistoriaByEmail(id, emailDestino).subscribe({
          next: (response) => {
            results.push({
              id_historia: id,
              ok: true,
              message: response?.message || 'Enviado'
            });
            processed += 1;
            if (processed === uniqueIds.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          },
          error: (error) => {
            results.push({
              id_historia: id,
              ok: false,
              message: error?.error?.message || 'Error enviando documento'
            });
            processed += 1;
            if (processed === uniqueIds.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          }
        });
      });
    });
  }

  getTipoLabel(tipo: TipoDocumento): string {
    return TIPO_LABELS[tipo] ?? tipo;
  }

  getTipoColor(tipo: TipoDocumento): string {
    return TIPO_COLORS[tipo] ?? '#666';
  }

  getTipoIcon(tipo: TipoDocumento): string {
    return TIPO_ICONS[tipo] ?? 'assignment';
  }

  getPDFBlob(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.API}/${id}/pdf`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  private extractFilename(response: HttpResponse<Blob>, fallback: string): string {
    const contentDisposition = response.headers.get('content-disposition') || '';
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]).trim();
      } catch {
        // ignore and try regular filename
      }
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return (match?.[1] || fallback).trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Abre el PDF en una nueva pestaña del navegador */
  openPDF(id: string): void {
    // Open synchronously first to avoid popup blockers.
    const openedTab = window.open('', '_blank');

    if (openedTab && !openedTab.closed) {
      openedTab.document.title = 'Cargando PDF...';
      openedTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">Cargando PDF...</p>';
    }

    this.getPDFBlob(id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          if (openedTab && !openedTab.closed) openedTab.close();
          return;
        }

        const contentType = (response.headers.get('content-type') || blob.type || '').toLowerCase();
        if (!contentType.includes('application/pdf')) {
          if (openedTab && !openedTab.closed) {
            openedTab.document.title = 'Error al abrir PDF';
            openedTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">No se recibió un PDF válido. Intenta descargar el archivo.</p>';
          }
          this.downloadPDF(id);
          return;
        }

        const filename = this.extractFilename(response, `historia-${id}.pdf`);
        const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);

        if (openedTab) {
          const safeTitle = this.escapeHtml(filename);
          openedTab.document.open();
          openedTab.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>html,body{margin:0;height:100%;}iframe{border:0;width:100%;height:100%;}</style></head><body><iframe src="${url}" title="${safeTitle}"></iframe></body></html>`);
          openedTab.document.close();
        } else {
          // Fallback: direct download if popup was blocked.
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        if (openedTab && !openedTab.closed) {
          openedTab.close();
        }
        console.error('Error abriendo PDF:', err);
      }
    });
  }

  /** Descarga directa del PDF (sin abrir pestaña) */
  downloadPDF(id: string): void {
    this.getPDFBlob(id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const filename = this.extractFilename(response, `historia-${id}.pdf`);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error descargando PDF:', err)
    });
  }
}
