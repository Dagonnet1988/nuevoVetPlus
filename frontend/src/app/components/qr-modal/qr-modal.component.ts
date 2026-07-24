import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, of, Subscription } from 'rxjs';
import { catchError, switchMap, takeWhile } from 'rxjs/operators';
import { ConsentimientosService } from '../../services/consentimientos.service';

export interface QRModalData {
  qrBase64: string;
  firmaUrl: string;
  expiresAt: string;
  idCliente: string;
  clienteNombre: string;
  clienteTelefono?: string | null;
}

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="qr-modal">
      <div class="qr-header">
        <mat-icon class="qr-title-icon">qr_code_2</mat-icon>
        <h2 mat-dialog-title>Solicitud de consentimiento</h2>
      </div>

      @if (!firmado()) {
        <mat-dialog-content>
          <p class="qr-instruction">
            Muestre este código QR al propietario para que firme con su teléfono.
          </p>
          <div class="qr-wrap">
            <img [src]="data.qrBase64" alt="Código QR" class="qr-image" />
          </div>
          @if (polling()) {
            <div class="polling-status" aria-live="polite">
              <mat-spinner diameter="16"></mat-spinner>
              <span>Esperando firma en tiempo real...</span>
            </div>
          }
          <p class="qr-name">{{ data.clienteNombre }}</p>
          <p class="qr-url">
            <a [href]="data.firmaUrl" target="_blank" rel="noopener">
              {{ data.firmaUrl }}
            </a>
          </p>
          <p class="qr-expires">Válido hasta: {{ data.expiresAt | date:'dd-MM-yy h:mm a' }}</p>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-stroked-button color="primary" (click)="abrirWhatsApp()">
            <mat-icon>chat</mat-icon>
            Enviar por WhatsApp
          </button>
          <button mat-button (click)="cerrar()">Cerrar</button>
        </mat-dialog-actions>
      }

      @if (firmado()) {
        <mat-dialog-content>
          <div class="firmado-state">
            <mat-icon class="firmado-icon">verified</mat-icon>
            <h3>¡Consentimiento firmado!</h3>
            <p>El propietario completó la firma exitosamente.</p>
          </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-raised-button color="primary" (click)="cerrar()">Aceptar</button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [`
    .qr-modal { min-width: 320px; max-width: 400px; }
    .qr-header { display: flex; align-items: center; gap: 8px; padding: 16px 24px 0; }
    .qr-title-icon { color: #1976d2; font-size: 28px; width: 28px; height: 28px; }
    h2[mat-dialog-title] { margin: 0; font-size: 1.1rem; }
    .qr-instruction { color: #555; font-size: 0.9rem; margin-bottom: 16px; }
    .qr-wrap { position: relative; display: inline-block; }
    .qr-image { width: 220px; height: 220px; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #e0e0e0; }
    .polling-status {
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #5f6b7a;
      font-size: 0.8rem;
    }
    .qr-name { font-weight: 600; text-align: center; margin: 12px 0 4px; }
    .qr-url { text-align: center; font-size: 0.78rem; word-break: break-all; color: #1976d2; margin: 0 0 8px; }
    .qr-expires { text-align: center; font-size: 0.8rem; color: #888; margin: 0; }
    .firmado-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 0; text-align: center; }
    .firmado-icon { font-size: 56px; width: 56px; height: 56px; color: #2e7d32; }
    .firmado-state h3 { margin: 0; font-size: 1.1rem; color: #2e7d32; }
    .firmado-state p { margin: 0; color: #555; font-size: 0.9rem; }
  `]
})
export class QRModalComponent implements OnInit, OnDestroy {
  firmado = signal(false);
  polling = signal(false);

  private pollSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<QRModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QRModalData,
    private consentimientosService: ConsentimientosService
  ) {}

  ngOnInit(): void {
    this.iniciarPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private iniciarPolling(): void {
    this.polling.set(true);
    this.pollSub = interval(5000).pipe(
      switchMap(() => this.consentimientosService.obtenerEstado(this.data.idCliente).pipe(
        catchError(() => of(null))
      )),
      takeWhile(resp => !resp || resp.estado === 'pendiente', true)
    ).subscribe({
      next: (resp) => {
        if (!resp) {
          return;
        }

        if (resp.estado === 'firmado') {
          this.polling.set(false);
          this.firmado.set(true);
          setTimeout(() => this.cerrar(), 1200);
          return;
        }

        // Si dejó de estar pendiente (expirado/revocado/desactualizado/sin_consentimiento),
        // cerramos para evitar un modal congelado con QR obsoleto.
        this.polling.set(false);
        setTimeout(() => this.cerrar(), 300);
      },
      error: () => { this.polling.set(false); }
    });
  }

  cerrar(): void {
    this.dialogRef.close(this.firmado());
  }

  abrirWhatsApp(): void {
    const mensaje = this.buildWhatsAppMessage();
    const numero = this.normalizarTelefonoWhatsApp(this.data.clienteTelefono);
    const waUrl = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(waUrl, '_blank', 'noopener');
  }

  private buildWhatsAppMessage(): string {
    const nombre = this.data.clienteNombre || 'propietario';
    const vence = new Date(this.data.expiresAt).toLocaleString('es-CO');
    return `Hola ${nombre}, este es tu link para firmar el consentimiento: ${this.data.firmaUrl}\nVigente hasta: ${vence}`;
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
