import { extractError } from '../../utils/error.utils';
import {
  Component,
  Input,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ConsentimientosService,
  ConsentimientoCreado,
  ConsentimientoEstado
} from '../../services/consentimientos.service';
import { QRModalComponent, QRModalData } from '../qr-modal/qr-modal.component';

@Component({
  selector: 'app-consentimiento-status',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './consentimiento-status.component.html',
  styleUrls: ['./consentimiento-status.component.scss']
})
export class ConsentimientoStatusComponent implements OnInit {
  @Input({ required: true }) idCliente!: string;
  @Input() clienteNombre: string = '';
  @Input() clienteTelefono: string | null = null;

  cargando = signal(true);
  actuando = signal(false);
  estado = signal<ConsentimientoEstado | null>(null);

  constructor(
    private service: ConsentimientosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarEstado();
  }

  enviarPorCorreo(): void {
    this.actuando.set(true);

    this.service.enviarPorCorreo(this.idCliente).subscribe({
      next: (resp) => {
        this.actuando.set(false);
        this.cargarEstado();

        const data = resp?.data;
        if (data?.mode === 'link' && data?.firmaUrl && data?.qrBase64 && data?.expiresAt) {
          this.abrirModalQR({
            qrBase64: data.qrBase64,
            firmaUrl: data.firmaUrl,
            expiresAt: data.expiresAt,
            idCliente: this.idCliente,
            clienteNombre: this.clienteNombre || data?.clienteNombre || '',
            clienteTelefono: this.clienteTelefono
          });
        }

        this.snackBar.open(resp?.message || 'Correo de consentimiento enviado correctamente', 'Cerrar', { duration: 3500 });
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(extractError(err, 'No fue posible enviar el consentimiento por correo'), 'Cerrar', { duration: 4500 });
      }
    });
  }

  enviarLinkPorWhatsApp(): void {
    const consentimiento = this.estado()?.consentimiento;

    if (consentimiento?.firmaUrl && consentimiento?.expiresAt && this.isLinkVigente(consentimiento.expiresAt)) {
      this.abrirWhatsAppConLink(consentimiento.firmaUrl, consentimiento.expiresAt);
      return;
    }

    this.actuando.set(true);
    const estadoActual = this.estado()?.estado;
    const request$ = estadoActual === 'sin_consentimiento'
      ? this.service.crear(this.idCliente)
      : this.service.reenviar(this.idCliente);

    request$.subscribe({
      next: (resp: ConsentimientoCreado) => {
        this.actuando.set(false);
        this.cargarEstado();
        this.abrirModalQR({
          qrBase64: resp.qrBase64,
          firmaUrl: resp.firmaUrl,
          expiresAt: resp.expiresAt,
          idCliente: this.idCliente,
          clienteNombre: this.clienteNombre || resp?.cliente?.nombre || '',
          clienteTelefono: this.clienteTelefono
        });
        this.abrirWhatsAppConLink(resp.firmaUrl, resp.expiresAt);
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(extractError(err, 'No fue posible preparar el link para WhatsApp'), 'Cerrar', { duration: 4500 });
      }
    });
  }

  enviarConfirmacionPdfPorWhatsApp(): void {
    const nombre = this.clienteNombre || 'propietario';
    const mensaje =
      `Hola ${nombre}, te compartimos por este medio la confirmación de tu consentimiento firmado. ` +
      `Si no recibiste el PDF por correo, por favor responde este mensaje para reenviarlo.`;

    this.abrirWhatsApp(mensaje, this.clienteTelefono, 'No se pudo abrir WhatsApp en el navegador');
  }

  cargarEstado(): void {
    this.cargando.set(true);
    this.service.obtenerEstado(this.idCliente).subscribe({
      next: (resp) => {
        this.estado.set(resp);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(extractError(err, 'Error al cargar estado del consentimiento'), 'Cerrar', { duration: 3000 });
      }
    });
  }

  copiarEnlaceFirma(): void {
    const c = this.estado()?.consentimiento;
    if (!c?.firmaUrl) {
      this.snackBar.open('No hay link de firma disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
      this.snackBar.open('El enlace ha vencido. Genera uno nuevo.', 'Cerrar', { duration: 4000 });
      this.cargarEstado();
      return;
    }

    const firmaUrl = c.firmaUrl;

    if (!navigator.clipboard) {
      this.snackBar.open(`Copia este link de firma: ${firmaUrl}`, 'Cerrar', { duration: 8000 });
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

  solicitarRevocacion(): void {
    const motivo = window.prompt(
      `¿Por qué se revoca el consentimiento de ${this.clienteNombre || 'este propietario'}?\n` +
      '(Indique el motivo, ej: "Solicitud del propietario")'
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

  private abrirModalQR(data: QRModalData): void {
    const ref = this.dialog.open(QRModalComponent, { data, width: '420px' });
    ref.afterClosed().subscribe(() => this.cargarEstado());
  }

  private abrirWhatsAppConLink(firmaUrl: string, expiresAt: string): void {
    const nombre = this.clienteNombre || 'propietario';
    const vence = new Date(expiresAt).toLocaleString('es-CO');
    const mensaje =
      `Hola ${nombre}, este es tu link para firmar el consentimiento: ${firmaUrl}\n` +
      `Vigente hasta: ${vence}`;

    this.abrirWhatsApp(mensaje, this.clienteTelefono, 'No se pudo abrir WhatsApp. Copia el link manualmente.');
  }

  private abrirWhatsApp(mensaje: string, telefono: string | null, errorMsg: string): void {
    const numero = this.normalizarTelefonoWhatsApp(telefono);
    const waUrl = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    const popup = window.open(waUrl, '_blank', 'noopener');

    if (!popup) {
      this.snackBar.open(errorMsg, 'Cerrar', { duration: 4000 });
      return;
    }

    this.snackBar.open('Abriendo WhatsApp Web/App…', 'Cerrar', { duration: 2200 });
  }

  private normalizarTelefonoWhatsApp(raw: string | null | undefined): string | null {
    const digits = String(raw || '').replace(/\D+/g, '');
    if (!digits) return null;

    const withoutZeros = digits.startsWith('00') ? digits.slice(2) : digits;
    if (withoutZeros.length === 10) {
      return `57${withoutZeros}`;
    }

    if (withoutZeros.length >= 11 && withoutZeros.length <= 15) {
      return withoutZeros;
    }

    return null;
  }
}
