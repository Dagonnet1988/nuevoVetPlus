import { Component, ElementRef, Inject, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FotoEncuadre } from '../../models/paciente.interface';
import { FotoEncuadreDirective } from '../../directives/foto-encuadre.directive';

export interface FotoEncuadreDialogData {
  src: string;
  encuadre?: FotoEncuadre | null;
}

const ENCUADRE_CENTRADO: FotoEncuadre = { x: 50, y: 50, zoom: 1 };
const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);
const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Permite elegir qué parte de la foto se muestra. Solo devuelve el encuadre:
 * el archivo original no se modifica. La vista usa la misma directiva que el resto
 * de pantallas, así que lo que se ve aquí es lo que se verá después.
 */
@Component({
  selector: 'app-foto-encuadre-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatSliderModule, FotoEncuadreDirective],
  template: `
    <h2 mat-dialog-title>Encuadrar foto</h2>
    <mat-dialog-content>
      <div #marco class="marco"
           [class.arrastrando]="arrastrando"
           (pointerdown)="iniciarArrastre($event)"
           (pointermove)="arrastrar($event)"
           (pointerup)="terminarArrastre()"
           (pointercancel)="terminarArrastre()">
        <img [src]="data.src" alt="Foto del paciente" draggable="false"
             [appFotoEncuadre]="encuadre()"
             (load)="onCargada($event)"
             (error)="error.set(true)">
        <div class="guia" aria-hidden="true"></div>
      </div>

      @if (error()) {
        <p class="error">No se pudo cargar la foto.</p>
      } @else {
        <div class="zoom">
          <mat-icon>zoom_out</mat-icon>
          <mat-slider min="1" max="4" step="0.01" class="zoom-slider">
            <input matSliderThumb aria-label="Zoom" [value]="encuadre().zoom" (input)="onZoom($event)">
          </mat-slider>
          <mat-icon>zoom_in</mat-icon>
        </div>
        <p class="ayuda">
          Arrastra la foto y ajusta el zoom. El círculo marca lo que se ve en las fotos redondas.
          La foto original no se modifica.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="centrar()" [disabled]="!cargada()">Centrar</button>
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="aplicar()" [disabled]="!cargada()">Aplicar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .marco {
      position: relative;
      width: min(320px, 100%);
      aspect-ratio: 1;
      margin: 0 auto;
      overflow: hidden;
      border-radius: 8px;
      background: #eceff1;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    .marco.arrastrando { cursor: grabbing; }
    .marco img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }
    .guia {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow: 0 0 0 200px rgba(255, 255, 255, 0.45);
      outline: 2px dashed rgba(255, 255, 255, 0.9);
      outline-offset: -2px;
      pointer-events: none;
    }
    .zoom { display: flex; align-items: center; gap: 8px; margin-top: 12px; color: #607d8b; }
    .zoom-slider { flex: 1; min-width: 0; }
    .ayuda { margin: 4px 0 0; font-size: 12px; color: #666; }
    .error { margin: 12px 0 0; color: #d32f2f; }
  `]
})
export class FotoEncuadreDialogComponent {
  @ViewChild('marco', { static: true }) marco!: ElementRef<HTMLElement>;

  readonly ref = inject(MatDialogRef<FotoEncuadreDialogComponent, FotoEncuadre>);

  encuadre = signal<FotoEncuadre>(ENCUADRE_CENTRADO);
  cargada = signal(false);
  error = signal(false);
  arrastrando = false;

  private anchoFoto = 0;
  private altoFoto = 0;
  private ultimoX = 0;
  private ultimoY = 0;

  constructor(@Inject(MAT_DIALOG_DATA) public data: FotoEncuadreDialogData) {
    if (data.encuadre) this.encuadre.set({ ...data.encuadre });
  }

  onCargada(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.anchoFoto = img.naturalWidth;
    this.altoFoto = img.naturalHeight;
    this.cargada.set(this.anchoFoto > 0 && this.altoFoto > 0);
  }

  iniciarArrastre(event: PointerEvent): void {
    if (!this.cargada()) return;
    this.arrastrando = true;
    this.ultimoX = event.clientX;
    this.ultimoY = event.clientY;
    this.marco.nativeElement.setPointerCapture(event.pointerId);
  }

  arrastrar(event: PointerEvent): void {
    if (!this.arrastrando) return;
    const dx = event.clientX - this.ultimoX;
    const dy = event.clientY - this.ultimoY;
    this.ultimoX = event.clientX;
    this.ultimoY = event.clientY;

    const { x, y, zoom } = this.encuadre();
    const marco = this.marco.nativeElement.clientWidth;
    const excesoX = this.ladoVisible(this.anchoFoto, zoom) - marco;
    const excesoY = this.ladoVisible(this.altoFoto, zoom) - marco;
    this.encuadre.set({
      x: excesoX > 0 ? limitar(x - (dx / excesoX) * 100, 0, 100) : x,
      y: excesoY > 0 ? limitar(y - (dy / excesoY) * 100, 0, 100) : y,
      zoom
    });
  }

  terminarArrastre(): void {
    this.arrastrando = false;
  }

  onZoom(event: Event): void {
    if (!this.cargada()) return;
    const zoom = Number((event.target as HTMLInputElement).value);
    const actual = this.encuadre();
    this.encuadre.set({
      x: this.posicionConZoom(this.anchoFoto, actual.x, actual.zoom, zoom),
      y: this.posicionConZoom(this.altoFoto, actual.y, actual.zoom, zoom),
      zoom
    });
  }

  centrar(): void {
    this.encuadre.set(ENCUADRE_CENTRADO);
  }

  aplicar(): void {
    const { x, y, zoom } = this.encuadre();
    this.ref.close({ x: redondear(x), y: redondear(y), zoom: redondear(zoom) });
  }

  /** Tamaño en pantalla de un lado de la foto (object-fit: cover + zoom). */
  private ladoVisible(ladoFoto: number, zoom: number): number {
    const marco = this.marco.nativeElement.clientWidth;
    return ladoFoto * (marco / Math.min(this.anchoFoto, this.altoFoto)) * zoom;
  }

  /** Nueva posición para que el centro del marco siga en el mismo punto de la foto al cambiar el zoom. */
  private posicionConZoom(ladoFoto: number, posicion: number, zoomAntes: number, zoomNuevo: number): number {
    const marco = this.marco.nativeElement.clientWidth;
    const ladoAntes = this.ladoVisible(ladoFoto, zoomAntes);
    const ladoNuevo = this.ladoVisible(ladoFoto, zoomNuevo);
    const excesoNuevo = ladoNuevo - marco;
    if (excesoNuevo <= 0) return posicion;

    const centro = ((posicion / 100) * (ladoAntes - marco) + marco / 2) / ladoAntes;
    return limitar(((centro * ladoNuevo - marco / 2) / excesoNuevo) * 100, 0, 100);
  }
}
