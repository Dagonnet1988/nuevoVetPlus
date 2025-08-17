import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExportOptions {
  formato: 'individual' | 'consolidada';
  tipo: 'pdf' | 'xlsx';
  veterinario_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private apiUrl = `${environment.apiUrl}/appointments/export`;

  constructor(private http: HttpClient) {}

  /**
   * Exportar agenda en el formato especificado
   */
  exportAgenda(options: ExportOptions): Observable<Blob> {
    let params = new HttpParams()
      .set('formato', options.formato)
      .set('fecha_inicio', options.fecha_inicio)
      .set('fecha_fin', options.fecha_fin);

    if (options.veterinario_id) {
      params = params.set('veterinario_id', options.veterinario_id);
    }

    const endpoint = options.tipo === 'pdf' ? 'pdf' : 'xlsx';
    const contentType = options.tipo === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return this.http.get(`${this.apiUrl}/${endpoint}`, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': contentType
      }
    });
  }

  /**
   * Descargar archivo desde blob
   */
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generar nombre de archivo
   */
  generateFilename(options: ExportOptions): string {
    const { formato, tipo, fecha_inicio, fecha_fin } = options;
    const extension = tipo === 'pdf' ? 'pdf' : 'xlsx';
    const tipoTexto = formato === 'individual' ? 'individual' : 'consolidada';

    return `agenda_${tipoTexto}_${fecha_inicio}_${fecha_fin}.${extension}`;
  }
}
