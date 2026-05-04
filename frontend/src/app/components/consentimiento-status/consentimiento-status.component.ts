import { extractError } from '../../utils/error.utils';
import {
  Component,
  Input,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ConsentimientosService,
  ConsentimientoEstado
} from '../../services/consentimientos.service';
import {
  QRModalComponent,
  QRModalData
} from '../qr-modal/qr-modal.component';

@Component({
  selector: 'app-consentimiento-status',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './consentimiento-status.component.html',
  styleUrls: ['./consentimiento-status.component.scss']
})
export class ConsentimientoStatusComponent implements OnInit {
  @Input({ required: true }) idCliente!: string;
  @Input() clienteNombre: string = '';

  cargando = signal(true);
  actuando = signal(false);
  mostrandoCanales = signal(false);
  estado = signal<ConsentimientoEstado | null>(null);

  constructor(
    private service: ConsentimientosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarEstado();
  }

  enviarPorCanal(canal?: 'whatsapp' | 'correo' | 'ambos'): void {
    if (!canal) {
      this.mostrandoCanales.update((prev) => !prev);
      return;
    }

    this.mostrandoCanales.set(false);

    const st = this.estado()?.estado;
    const consentimiento = this.estado()?.consentimiento;
    const enviarComoPdf = this.debeEnviarPdf();

    if (enviarComoPdf) {
      this.prepararEnvioPdf(canal);
      return;
    }

    // Si ya hay un enlace pendiente y vigente, reutilizarlo.
    if (st === 'pendiente' && consentimiento?.firmaUrl && consentimiento.expiresAt && this.isLinkVigente(consentimiento.expiresAt)) {
      this.compartirEnlace(consentimiento.firmaUrl, canal);
      return;
    }

    this.actuando.set(true);

    const op$ = st === 'pendiente'
      ? this.service.reenviar(this.idCliente)
      : this.service.crear(this.idCliente);

    op$.subscribe({
      next: (resp) => {
        this.actuando.set(false);
        this.cargarEstado();
        this.compartirEnlace(resp.firmaUrl, canal);
        this.abrirQR(resp.qrBase64, resp.firmaUrl, resp.expiresAt);
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al enviar consentimiento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  debeEnviarPdf(): boolean {
    const consentimiento = this.estado()?.consentimiento;
    return Boolean(consentimiento?.pdfDisponible);
  }

  cargarEstado(): void {
    this.cargando.set(true);
    this.service.obtenerEstado(this.idCliente).subscribe({
      next: (resp) => {
        this.estado.set(resp);
        this.mostrandoCanales.set(false);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(extractError(err, 'Error al cargar estado del consentimiento'), 'Cerrar', { duration: 3000 });
      }
    });
  }

  enviarConsentimiento(): void {
    this.actuando.set(true);
    this.service.crear(this.idCliente).subscribe({
      next: (resp) => {
        this.actuando.set(false);
        this.cargarEstado();
        this.abrirQR(resp.qrBase64, resp.firmaUrl, resp.expiresAt);
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al crear consentimiento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  reenviarConsentimiento(): void {
    this.actuando.set(true);
    this.service.reenviar(this.idCliente).subscribe({
      next: (resp) => {
        this.actuando.set(false);
        this.cargarEstado();
        this.abrirQR(resp.qrBase64, resp.firmaUrl, resp.expiresAt);
        this.snackBar.open('Enlace renovado', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al reenviar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  verQR(): void {
    const c = this.estado()?.consentimiento;
    if (!c?.firmaUrl) {
      this.snackBar.open('No hay enlace disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    // Verificar expiración en cliente antes de copiar
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
      this.snackBar.open('El enlace ha vencido. Genera uno nuevo.', 'Cerrar', { duration: 4000 });
      this.cargarEstado(); // Actualizar badge a 'expirado'
      return;
    }

    const firmaUrl = c.firmaUrl;

    if (!navigator.clipboard) {
      this.snackBar.open(`Copia este enlace: ${firmaUrl}`, 'Cerrar', { duration: 8000 });
      return;
    }

    navigator.clipboard.writeText(firmaUrl).then(() => {
      this.snackBar.open('Enlace copiado al portapapeles', 'Cerrar', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open(`No se pudo copiar automáticamente. Enlace: ${firmaUrl}`, 'Cerrar', { duration: 8000 });
    });
  }

  isLinkVigente(expiresAt: string): boolean {
    return new Date(expiresAt) > new Date();
  }

  descargarPDF(): void {
    this.actuando.set(true);
    this.service.descargarPDF(this.idCliente).subscribe({
      next: (resp) => {
        this.actuando.set(false);
        const blob = resp.body;
        if (!blob) {
          this.snackBar.open('No se recibió el archivo PDF', 'Cerrar', { duration: 3000 });
          return;
        }

        const header = resp.headers.get('Content-Disposition') || '';
        const fileName = this.extractFileName(header) || this.buildFriendlyPdfName();
        const url = URL.createObjectURL(blob);

        const viewer = window.open('', '_blank');
        if (!viewer) {
          this.fallbackDownload(url, fileName);
          return;
        }

        viewer.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(fileName)}</title>
    <style>
      html, body { height: 100%; margin: 0; font-family: Arial, sans-serif; background: #111; }
      .topbar {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: #1f1f1f;
        color: #fff;
      }
      .filename { font-size: 13px; opacity: 0.9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .download {
        color: #fff;
        text-decoration: none;
        border: 1px solid #4e4e4e;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
      }
      .pdf-frame { width: 100%; height: calc(100% - 48px); border: 0; background: #2a2a2a; }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="filename">${this.escapeHtml(fileName)}</div>
      <a class="download" href="${url}" download="${this.escapeHtml(fileName)}">Descargar PDF</a>
    </div>
    <iframe class="pdf-frame" src="${url}" title="${this.escapeHtml(fileName)}"></iframe>
  </body>
</html>`);
        viewer.document.close();

        setTimeout(() => URL.revokeObjectURL(url), 600000);
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(extractError(err, 'Error al ver PDF'), 'Cerrar', { duration: 3000 });
      }
    });
  }

  private prepararEnvioPdf(canal: 'whatsapp' | 'correo' | 'ambos'): void {
    this.actuando.set(true);
    this.service.descargarPDF(this.idCliente).subscribe({
      next: (resp) => {
        this.actuando.set(false);
        const blob = resp.body;
        if (!blob) {
          this.snackBar.open('No se recibió el archivo PDF', 'Cerrar', { duration: 3000 });
          return;
        }

        const header = resp.headers.get('Content-Disposition') || '';
        const fileName = this.extractFileName(header) || this.buildFriendlyPdfName();
        const url = URL.createObjectURL(blob);

        this.fallbackDownload(url, fileName);
        this.compartirPdfPorCanal(fileName, canal);
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(extractError(err, 'Error al preparar PDF'), 'Cerrar', { duration: 3000 });
      }
    });
  }

  private extractFileName(contentDisposition: string): string | null {
    if (!contentDisposition) return null;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]).replace(/["']/g, '');
      } catch {
        return utf8Match[1].replace(/["']/g, '');
      }
    }

    const asciiMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    if (asciiMatch?.[1]) {
      return asciiMatch[1].trim();
    }

    return null;
  }

  private buildFriendlyPdfName(): string {
    const pdfNumero = this.estado()?.consentimiento?.pdfNumero || 'CONS-SIN-NUMERO';
    const cliente = (this.clienteNombre || 'cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'cliente';

    return `consentimiento-${cliente}-${pdfNumero}.pdf`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private fallbackDownload(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private compartirEnlace(firmaUrl: string, canal: 'whatsapp' | 'correo' | 'ambos'): void {
    const nombre = this.clienteNombre || 'propietario';
    const mensaje = `Hola ${nombre}, por favor firma tu consentimiento en este enlace: ${firmaUrl}`;

    if (canal === 'whatsapp' || canal === 'ambos') {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(waUrl, '_blank', 'noopener');
    }

    if (canal === 'correo' || canal === 'ambos') {
      const subject = 'Firma de consentimiento - VetPlus';
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mensaje)}`;
      window.open(mailto, '_blank', 'noopener');
    }

    this.snackBar.open('Enlace preparado para envío.', 'Cerrar', { duration: 3000 });
  }

  private compartirPdfPorCanal(fileName: string, canal: 'whatsapp' | 'correo' | 'ambos'): void {
    const nombre = this.clienteNombre || 'propietario';
    const mensaje =
      `Hola ${nombre}, te envío el consentimiento firmado en PDF (${fileName}). ` +
      'El archivo ya se descargó para adjuntarlo en este mensaje.';

    if (canal === 'whatsapp' || canal === 'ambos') {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(waUrl, '_blank', 'noopener');
    }

    if (canal === 'correo' || canal === 'ambos') {
      const subject = `Consentimiento firmado en PDF - ${nombre}`;
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mensaje)}`;
      window.open(mailto, '_blank', 'noopener');
    }

    this.snackBar.open('PDF descargado. Adjunta el archivo en el canal elegido.', 'Cerrar', { duration: 5000 });
  }

  solicitarRevocacion(): void {
    const motivo = window.prompt(
      `¿Por qué se revoca el consentimiento de ${this.clienteNombre || 'este propietario'}?\n` +
      '(Indique el motivo, ej: "Solicitud del propietario el 04/04/2026")'
    );
    if (!motivo || motivo.trim().length < 5) return;

    this.actuando.set(true);
    this.service.revocar(this.idCliente, motivo.trim()).subscribe({
      next: () => {
        this.actuando.set(false);
        this.snackBar.open('Consentimiento revocado correctamente.', 'Cerrar', { duration: 4000 });
        this.cargarEstado();
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al revocar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private abrirQR(qrBase64: string, firmaUrl: string, expiresAt: string): void {
    const data: QRModalData = {
      qrBase64,
      firmaUrl,
      expiresAt,
      idCliente: this.idCliente,
      clienteNombre: this.clienteNombre
    };
    this.dialog.open(QRModalComponent, {
      data,
      disableClose: false,
      width: '420px'
    }).afterClosed().subscribe((firmado) => {
      if (firmado) this.cargarEstado();
    });
  }
}
