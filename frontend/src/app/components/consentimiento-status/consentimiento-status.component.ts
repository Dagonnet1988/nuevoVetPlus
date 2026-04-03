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
import { MatDialog } from '@angular/material/dialog';
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
    MatTooltipModule
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
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al cargar estado del consentimiento', 'Cerrar', { duration: 3000 });
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
    if (!c?.token) return;
    const firmaUrl = `${window.location.origin}/consentimiento/${c.token}`;
    // El QR no se almacena en BD, se regenera mostrando el enlace directamente
    // En este caso abrimos un modal simplificado con link copiable
    this.snackBar.open('Enlace copiado al portapapeles', 'Cerrar', { duration: 3000 });
    navigator.clipboard.writeText(firmaUrl).catch(() => {});
  }

  descargarPDF(): void {
    this.actuando.set(true);
    this.service.descargarPDF(this.idCliente).subscribe({
      next: (blob) => {
        this.actuando.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consentimiento-${this.clienteNombre || this.idCliente}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.actuando.set(false);
        this.snackBar.open('Error al descargar PDF', 'Cerrar', { duration: 3000 });
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
