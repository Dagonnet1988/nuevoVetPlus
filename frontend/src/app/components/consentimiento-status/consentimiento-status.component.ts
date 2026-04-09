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
  estado = signal<ConsentimientoEstado | null>(null);

  constructor(
    private service: ConsentimientosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarEstado();
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
      next: (blob) => {
        this.actuando.set(false);
        const url = URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');
        // Liberar el object URL cuando la pestaña ya lo cargó
        if (ventana) {
          ventana.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
        }
      },
      error: (err) => {
        this.actuando.set(false);
        this.snackBar.open(extractError(err, 'Error al ver PDF'), 'Cerrar', { duration: 3000 });
      }
    });
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
