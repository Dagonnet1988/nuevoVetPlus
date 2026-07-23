import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  HistoriaClinicaService, HistoriaClinica, TipoDocumento,
  DatosValoracionInicial, DatosSeguimiento, DatosFormula, DatosRemision,
  TIPO_LABELS, TIPO_COLORS, TIPO_ICONS
} from '../../../services/historia-clinica.service';
import { AnularHistoriaDialogComponent } from './anular-historia-dialog.component';

@Component({
  selector: 'app-historia-clinica-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDividerModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule,
    MatMenuModule, MatTooltipModule, MatDialogModule
  ],
  templateUrl: './historia-clinica-details.component.html',
  styleUrl: './historia-clinica-details.component.css'
})
export class HistoriaClinicaDetailsComponent implements OnInit {
  loading  = signal(true);
  sendingEmail = signal(false);
  historia = signal<HistoriaClinica | null>(null);
  private returnMascotaId: string | null = null;

  constructor(
    private historiaService: HistoriaClinicaService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.returnMascotaId = this.route.snapshot.queryParamMap.get('id_mascota');
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadHistoria(id);
    }
  }

  loadHistoria(id: string): void {
    this.loading.set(true);
    this.historiaService.getHistoriaById(id).subscribe({
      next: (res) => {
        this.historia.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Error cargando historia clínica', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  editar(): void {
    const h = this.historia();
    if (h) {
      this.router.navigate(['/historia-clinica', h.id_historia, 'editar'], {
        queryParams: this.returnMascotaId ? { id_mascota: this.returnMascotaId } : undefined
      });
    }
  }

  irACita(): void {
    const h = this.historia();
    if (h?.id_cita) {
      this.router.navigate(['/citas', h.id_cita]);
    }
  }

  getArchivoUrl(rutaArchivo?: string | null): string {
    if (!rutaArchivo) return '';
    if (/^https?:\/\//i.test(rutaArchivo)) return rutaArchivo;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${apiBase}${rutaArchivo.startsWith('/') ? '' : '/'}${rutaArchivo}`;
  }

  abrirAdjunto(rutaArchivo?: string | null): void {
    const url = this.getArchivoUrl(rutaArchivo);
    if (!url) {
      this.snackBar.open('No se encontró la ruta del archivo', 'Cerrar', { duration: 2500 });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  descargarAdjunto(nombre: string, rutaArchivo?: string | null): void {
    const url = this.getArchivoUrl(rutaArchivo);
    if (!url) {
      this.snackBar.open('No se encontró la ruta del archivo', 'Cerrar', { duration: 2500 });
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = nombre || 'adjunto';
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx++;
    }
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`;
  }

  isImageFile(mimeType?: string | null, nombreArchivo?: string | null): boolean {
    const mime = (mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return true;

    const filename = (nombreArchivo || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(filename);
  }

  getFileExtension(mimeType?: string | null, nombreArchivo?: string | null): string {
    const filename = (nombreArchivo || '').toLowerCase();
    const fromName = filename.includes('.') ? filename.split('.').pop() || '' : '';
    if (fromName) return fromName;

    const mime = (mimeType || '').toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx';
    if (mime.includes('word')) return 'docx';
    if (mime.includes('csv')) return 'csv';
    if (mime.includes('text')) return 'txt';
    return 'file';
  }

  getFileTypeLabel(mimeType?: string | null, nombreArchivo?: string | null): string {
    const ext = this.getFileExtension(mimeType, nombreArchivo);
    return ext.slice(0, 4).toUpperCase();
  }

  getFileTypeClass(mimeType?: string | null, nombreArchivo?: string | null): string {
    const ext = this.getFileExtension(mimeType, nombreArchivo);
    if (['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return `file-${ext}`;
    }
    return 'file-generic';
  }

  getFileTypeIcon(mimeType?: string | null, nombreArchivo?: string | null): string {
    const ext = this.getFileExtension(mimeType, nombreArchivo);
    if (ext === 'pdf') return 'picture_as_pdf';
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'table_chart';
    if (ext === 'doc' || ext === 'docx' || ext === 'txt') return 'article';
    return 'insert_drive_file';
  }

  isPdfFile(mimeType?: string | null, nombreArchivo?: string | null): boolean {
    const mime = (mimeType || '').toLowerCase();
    if (mime.includes('pdf')) return true;

    const filename = (nombreArchivo || '').toLowerCase();
    return filename.endsWith('.pdf');
  }

  getSafePdfThumbnailUrl(rutaArchivo?: string | null): SafeResourceUrl {
    const url = this.getArchivoUrl(rutaArchivo);
    const thumbUrl = `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(thumbUrl);
  }

  volver(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/historia-clinica'], {
      queryParams: this.returnMascotaId ? { id_mascota: this.returnMascotaId } : undefined
    });
  }

  verPDF(): void {
    const h = this.historia();
    if (h) this.historiaService.openPDF(h.id_historia);
  }

  enviarAlPropietario(): void {
    const h = this.historia();
    if (!h || this.sendingEmail()) return;

    if (h.estado === 'Cancelado') {
      this.snackBar.open('No se puede enviar un documento anulado', 'Cerrar', { duration: 3000 });
      return;
    }

    this.sendingEmail.set(true);
    this.historiaService.sendHistoriaByEmail(h.id_historia).subscribe({
      next: (response) => {
        this.snackBar.open(response?.message || 'Documento enviado por correo', 'Cerrar', { duration: 3500 });
        this.sendingEmail.set(false);
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message || 'No se pudo enviar el documento', 'Cerrar', { duration: 4000 });
        this.sendingEmail.set(false);
      }
    });
  }

  enviarResumenPorWhatsApp(): void {
    const h = this.historia();
    if (!h) return;
    if (h.estado === 'Cancelado') {
      this.snackBar.open('No se puede compartir un documento anulado por WhatsApp', 'Cerrar', { duration: 3000 });
      return;
    }

    const tipo = this.getTipoLabel(h.tipo_documento);
    const fecha = this.formatFecha(h.fecha);
    const mensaje =
      `Hola ${h.cliente_nombre || 'propietario'}, te compartimos el resumen de ${tipo} (${h.codigo_historia})` +
      ` de ${h.mascota_nombre || 'tu mascota'} con fecha ${fecha}.` +
      ` Si necesitas el PDF, te lo reenviamos por correo desde Ramelo.`;

    const numero = this.normalizarTelefonoWhatsApp((h as any).cliente_telefono || null);
    const waUrl = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    const popup = window.open(waUrl, '_blank', 'noopener');
    if (!popup) {
      this.snackBar.open('No se pudo abrir WhatsApp', 'Cerrar', { duration: 3500 });
      return;
    }

    this.snackBar.open('Abriendo WhatsApp Web/App…', 'Cerrar', { duration: 2200 });
  }

  private normalizarTelefonoWhatsApp(raw: string | null | undefined): string | null {
    const digits = String(raw || '').replace(/\D+/g, '');
    if (!digits) return null;

    const withoutZeros = digits.startsWith('00') ? digits.slice(2) : digits;
    if (withoutZeros.length === 10) return `57${withoutZeros}`;
    if (withoutZeros.length >= 11 && withoutZeros.length <= 15) return withoutZeros;
    return null;
  }

  imprimir(): void {
    window.print();
  }

  anular(): void {
    const h = this.historia();
    if (!h) return;
    const ref = this.dialog.open(AnularHistoriaDialogComponent, {
      width: '480px',
      data: { codigo: h.codigo_historia },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.historiaService.deleteHistoria(h.id_historia, result.motivo).subscribe({
        next: () => {
          this.snackBar.open('Documento anulado', 'Cerrar', { duration: 2500 });
          this.router.navigate(['/historia-clinica'], {
            queryParams: this.returnMascotaId ? { id_mascota: this.returnMascotaId } : undefined
          });
        },
        error: () => this.snackBar.open('Error al anular', 'Cerrar', { duration: 3000 })
      });
    });
  }

  reactivar(): void {
    const h = this.historia();
    if (!h) return;

    this.historiaService.reactivateHistoria(h.id_historia).subscribe({
      next: () => {
        this.snackBar.open('Historia reactivada', 'Cerrar', { duration: 2500 });
        this.loadHistoria(h.id_historia);
      },
      error: () => this.snackBar.open('Error al reactivar', 'Cerrar', { duration: 3000 })
    });
  }

  // UI Helpers
  getTipoLabel(tipo: TipoDocumento): string { return TIPO_LABELS[tipo] ?? tipo; }
  getTipoColor(tipo: TipoDocumento): string { return TIPO_COLORS[tipo] ?? '#666'; }
  getTipoIcon(tipo: TipoDocumento): string  { return TIPO_ICONS[tipo] ?? 'assignment'; }

  getEstadoColor(estado: string): string {
    return ({ Borrador: '#9e9e9e', Completado: '#43a047', Cancelado: '#e53935' } as any)[estado] ?? '#666';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // Typed accessors for the datos union
  get datosVI(): DatosValoracionInicial | null {
    const h = this.historia();
    return h?.tipo_documento === 'valoracion_inicial' ? (h.datos as DatosValoracionInicial) : null;
  }
  get datosSeg(): DatosSeguimiento | null {
    const h = this.historia();
    return h?.tipo_documento === 'seguimiento' ? (h.datos as DatosSeguimiento) : null;
  }

  get seguimientoChecklist(): Array<{ titulo: string; items: string[] }> {
    return this.parseSeguimientoChecklist(this.datosSeg?.ejercicios_realizados ?? '').grupos;
  }

  get seguimientoOtrosEjercicios(): string {
    return this.parseSeguimientoChecklist(this.datosSeg?.ejercicios_realizados ?? '').otros;
  }
  get datosFormula(): DatosFormula | null {
    const h = this.historia();
    return h?.tipo_documento === 'formula' ? (h.datos as DatosFormula) : null;
  }
  get datosRemision(): DatosRemision | null {
    const h = this.historia();
    return h?.tipo_documento === 'remision' ? (h.datos as DatosRemision) : null;
  }

  get perimetriaRows(): Array<{ miembro: string; medicion1: string; medicion2: string }> {
    const d = this.datosVI;
    if (!d) return [];

    const rows = [
      { miembro: 'Miembro torácico derecho (MTD)', m1: d.perimetria_mtd_1, m2: d.perimetria_mtd_2 },
      { miembro: 'Miembro torácico izquierdo (MTI)', m1: d.perimetria_mti_1, m2: d.perimetria_mti_2 },
      { miembro: 'Miembro pélvico derecho (MPD)', m1: d.perimetria_mpd_1, m2: d.perimetria_mpd_2 },
      { miembro: 'Miembro pélvico izquierdo (MPI)', m1: d.perimetria_mpi_1, m2: d.perimetria_mpi_2 }
    ];

    return rows
      .filter((r) => this.hasDisplayValue(r.m1) || this.hasDisplayValue(r.m2))
      .map((r) => ({
        miembro: r.miembro,
        medicion1: this.formatMeasurement(r.m1),
        medicion2: this.formatMeasurement(r.m2)
      }));
  }

  get goniometriaGroups(): Array<{
    titulo: string;
    rows: Array<{ articulacion: string; flexion: string; extension: string }>;
  }> {
    const g = this.datosVI?.goniometria;
    if (!g || typeof g !== 'object') return [];

    const groups = [
      {
        titulo: 'Miembro torácico derecho',
        suffix: 'd',
        articulaciones: ['hombro', 'codo', 'carpo']
      },
      {
        titulo: 'Miembro torácico izquierdo',
        suffix: 'i',
        articulaciones: ['hombro', 'codo', 'carpo']
      },
      {
        titulo: 'Miembro pélvico derecho',
        suffix: 'd',
        articulaciones: ['cadera', 'rodilla', 'tarso']
      },
      {
        titulo: 'Miembro pélvico izquierdo',
        suffix: 'i',
        articulaciones: ['cadera', 'rodilla', 'tarso']
      }
    ];

    return groups
      .map((group) => {
        const rows = group.articulaciones
          .map((articulacion) => {
            const flexRaw = g[`${articulacion}_flexion_${group.suffix}`];
            const extRaw = g[`${articulacion}_extension_${group.suffix}`];
            return {
              articulacion: this.humanizeKey(articulacion),
              flexion: this.formatMeasurement(flexRaw, '°'),
              extension: this.formatMeasurement(extRaw, '°')
            };
          })
          .filter((row) => row.flexion !== '-' || row.extension !== '-');

        return { titulo: group.titulo, rows };
      })
      .filter((group) => group.rows.length > 0);
  }

  get reflejosGroups(): Array<{
    titulo: string;
    colD: string;
    colI: string;
    rows: Array<{ nombre: string; derecho: string; izquierdo: string }>;
  }> {
    const r = this.datosVI?.reflejos;
    if (!r || typeof r !== 'object') return [];

    const groups = [
      {
        titulo: 'Torácico',
        colD: 'MTD',
        colI: 'MTI',
        items: [
          { nombre: 'Tricipital', d: 'tricipital_d', i: 'tricipital_i' },
          { nombre: 'Flexor torácico', d: 'flexor_tor_d', i: 'flexor_tor_i' }
        ]
      },
      {
        titulo: 'Pélvico',
        colD: 'MPD',
        colI: 'MPI',
        items: [
          { nombre: 'Patelar', d: 'patelar_d', i: 'patelar_i' },
          { nombre: 'Tibial craneal', d: 'tibial_craneal_d', i: 'tibial_craneal_i' },
          { nombre: 'Ciático', d: 'ciatico_d', i: 'ciatico_i' },
          { nombre: 'Flexor pélvico', d: 'flexor_pelv_d', i: 'flexor_pelv_i' }
        ]
      }
    ];

    return groups
      .map((group) => {
        const rows = group.items
          .map((item) => ({
            nombre: item.nombre,
            derecho: this.formatCompactValue(r[item.d]),
            izquierdo: this.formatCompactValue(r[item.i])
          }))
          .filter((item) => item.derecho !== '-' || item.izquierdo !== '-');

        return {
          titulo: group.titulo,
          colD: group.colD,
          colI: group.colI,
          rows
        };
      })
      .filter((group) => group.rows.length > 0);
  }

  get observacionesPalpacion(): string {
    const r = this.datosVI?.reflejos;
    if (!r || typeof r !== 'object') return '';
    return String(r['observaciones_palpacion'] || '').trim();
  }

  get datosCompletos(): Array<{ campo: string; valor: string }> {
    const datos = this.historia()?.datos as Record<string, any> | null | undefined;
    if (!datos || typeof datos !== 'object') return [];

    const camposYaMostrados = this.getRenderedKeysForCurrentType();

    return Object.entries(datos)
      .filter(([key]) => !camposYaMostrados.has(key))
      .filter(([, value]) => this.hasDisplayValue(value))
      .map(([key, value]) => ({
        campo: this.humanizeKey(key),
        valor: this.stringifyValue(value)
      }));
  }

  private getRenderedKeysForCurrentType(): Set<string> {
    const tipo = this.historia()?.tipo_documento;

    if (tipo === 'valoracion_inicial') {
      return new Set([
        'remitido_por',
        'anamnesis',
        'antiguedad_signos',
        'medicacion_previa',
        'enfermedades_anteriores',
        'actividad_fisica',
        'valoracion_estatica',
        'valoracion_dinamica',
        'hallazgos_musculares',
        'hallazgos_osteoarticulares',
        'perimetria_mtd_1',
        'perimetria_mtd_2',
        'perimetria_mti_1',
        'perimetria_mti_2',
        'perimetria_mpd_1',
        'perimetria_mpd_2',
        'perimetria_mpi_1',
        'perimetria_mpi_2',
        'goniometria',
        'prueba_cajon',
        'prueba_compresion_tibial',
        'prueba_ortolani',
        'luxacion_patelar',
        'sensibilidad',
        'propiocepcion',
        'equilibrio',
        'paniculo',
        'reflejos',
        'diagnostico',
        'tratamiento',
        'recomendaciones',
        'proxima_cita',
        'costo'
      ]);
    }

    if (tipo === 'seguimiento') {
      return new Set([
        'numero_sesion',
        'observaciones_en_casa',
        'ejercicios_realizados',
        'recomendaciones_casa',
        'notas_clinicas',
        'costo'
      ]);
    }

    if (tipo === 'formula') {
      return new Set([
        'medicamentos',
        'plan_terapeutico',
        'notas'
      ]);
    }

    if (tipo === 'remision') {
      return new Set([
        'motivo',
        'especialidad_destino',
        'profesional_destino',
        'institucion_destino',
        'texto_remision'
      ]);
    }

    return new Set<string>();
  }

  private hasDisplayValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value.trim();

    if (Array.isArray(value)) {
      if (value.every((item) => typeof item !== 'object' || item === null)) {
        return value.map((item) => String(item)).join(', ');
      }

      return value
        .map((item, index) => {
          if (item && typeof item === 'object') {
            const detail = Object.entries(item)
              .filter(([, v]) => this.hasDisplayValue(v))
              .map(([k, v]) => `${this.humanizeKey(k)}: ${this.stringifyValue(v)}`)
              .join(' · ');
            return `${index + 1}. ${detail}`;
          }
          return `${index + 1}. ${String(item)}`;
        })
        .join('\n');
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, v]) => this.hasDisplayValue(v))
        .map(([k, v]) => `${this.humanizeKey(k)}: ${this.stringifyValue(v)}`)
        .join('\n');
    }

    return String(value);
  }

  private formatMeasurement(value: any, unit = 'cm'): string {
    if (!this.hasDisplayValue(value)) return '-';
    const num = Number(value);
    if (Number.isFinite(num)) {
      const display = Number.isInteger(num) ? String(num) : num.toFixed(1);
      return `${display} ${unit}`;
    }
    return `${String(value)} ${unit}`;
  }

  private formatCompactValue(value: any): string {
    if (!this.hasDisplayValue(value)) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value.trim();
    return this.stringifyValue(value).replace(/\n/g, ' · ');
  }

  private parseSeguimientoChecklist(rawEjercicios: string): {
    grupos: Array<{ titulo: string; items: string[] }>;
    otros: string;
  } {
    const raw = String(rawEjercicios || '');
    if (!raw.trim()) return { grupos: [], otros: '' };

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const groups: Array<{ titulo: string; items: string[] }> = [];
    let otros = '';

    lines.forEach((line) => {
      const idx = line.indexOf(':');
      if (idx <= 0) return;

      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!value) return;

      if (/^otros$/i.test(key)) {
        otros = value;
        return;
      }

      const items = value
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      if (!items.length) return;
      groups.push({ titulo: this.prettySeguimientoGroupTitle(key), items });
    });

    return { grupos: groups, otros };
  }

  private prettySeguimientoGroupTitle(rawTitle: string): string {
    return rawTitle
      .replace(/^ejercicios\s+de\s+/i, '')
      .replace(/\s+y\s+/gi, ' y ')
      .trim()
      .replace(/^[a-záéíóúñ]/, (m) => m.toUpperCase());
  }
}
