import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import SignaturePad from 'signature_pad';
import {
  ConsentimientosPublicoService,
  ConsentimientoPublicoData
} from '../../services/consentimientos-publico.service';

type Estado = 'cargando' | 'pendiente' | 'ya_firmado' | 'expirado' | 'error' | 'exito';

@Component({
  selector: 'app-consentimiento-publico',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './consentimiento-publico.component.html',
  styleUrls: ['./consentimiento-publico.component.scss']
})
export class ConsentimientoPublicoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;

  estado = signal<Estado>('cargando');
  enviando = signal(false);
  errorMensaje = signal('');
  datos: ConsentimientoPublicoData | null = null;
  pdfNumero = signal('');

  private token = '';
  private signaturePad: SignaturePad | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: ConsentimientosPublicoService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.cargarFormulario();
  }

  ngAfterViewInit(): void {
    if (this.estado() === 'pendiente') {
      this.inicializarFirma();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private cargarFormulario(): void {
    this.service.obtenerFormulario(this.token).subscribe({
      next: (data) => {
        this.datos = data;
        this.estado.set('pendiente');
        // Double rAF ensures Angular has rendered the @if block and browser has painted
        requestAnimationFrame(() => requestAnimationFrame(() => this.inicializarFirma()));
      },
      error: (err) => {
        const estado = err.error?.estado;
        if (estado === 'firmado') {
          this.estado.set('ya_firmado');
        } else if (estado === 'expirado') {
          this.estado.set('expirado');
        } else {
          this.errorMensaje.set(err.error?.message ?? 'No se pudo cargar el formulario.');
          this.estado.set('error');
        }
      }
    });
  }

  private inicializarFirma(attempt = 0): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;

    // Canvas inside @if block may not have layout yet — retry via rAF until it does
    if (canvas.offsetWidth === 0 && attempt < 10) {
      requestAnimationFrame(() => this.inicializarFirma(attempt + 1));
      return;
    }

    this.ajustarCanvas(canvas);

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: '#1a1a2e',
      minWidth: 1,
      maxWidth: 3
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.ajustarCanvas(canvas);
      this.signaturePad?.clear();
    });
    this.resizeObserver.observe(canvas.parentElement!);
  }

  private ajustarCanvas(canvas: HTMLCanvasElement): void {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (width === 0 || height === 0) return;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
  }

  limpiarFirma(): void {
    this.signaturePad?.clear();
  }

  firmarConsentimiento(): void {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      this.errorMensaje.set('Por favor, dibuje su firma antes de enviar.');
      return;
    }

    this.errorMensaje.set('');
    this.enviando.set(true);

    const firmaBase64 = this.signaturePad.toDataURL('image/png');

    this.service.firmar(this.token, firmaBase64).subscribe({
      next: (resp) => {
        this.pdfNumero.set(resp.pdfNumero ?? '');
        this.enviando.set(false);
        this.estado.set('exito');
      },
      error: (err) => {
        const estado = err.error?.estado;
        this.enviando.set(false);
        if (estado === 'firmado') {
          this.estado.set('ya_firmado');
        } else if (estado === 'expirado') {
          this.estado.set('expirado');
        } else {
          this.errorMensaje.set(err.error?.message ?? 'Error al enviar la firma. Intente de nuevo.');
        }
      }
    });
  }
}
