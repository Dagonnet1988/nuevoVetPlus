import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FotoEncuadreDialogComponent } from './foto-encuadre-dialog.component';

// Foto de prueba 600x300 (más ancha que alta).
function fotoApaisada(): string {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 300;
  c.getContext('2d')!.fillRect(0, 0, 600, 300);
  return c.toDataURL();
}

describe('FotoEncuadreDialogComponent', () => {
  let cerrado: any;

  async function crear(encuadre: any = null) {
    cerrado = 'sin-cerrar';
    await TestBed.configureTestingModule({
      imports: [FotoEncuadreDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: (v: any) => { cerrado = v; } } },
        { provide: MAT_DIALOG_DATA, useValue: { src: fotoApaisada(), encuadre } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(FotoEncuadreDialogComponent);
    document.body.appendChild(f.nativeElement);
    (f.nativeElement as HTMLElement).style.display = 'block';
    (f.nativeElement as HTMLElement).style.width = '320px';
    f.detectChanges();
    const img: HTMLImageElement = f.nativeElement.querySelector('img');
    // Espera a que el componente reciba el evento load de la imagen.
    for (let i = 0; i < 100 && !f.componentInstance.cargada(); i++) {
      await new Promise(r => setTimeout(r, 10));
    }
    f.detectChanges();
    await f.whenStable();
    return { f, c: f.componentInstance, img };
  }

  function puntero(tipo: string, x: number, y: number) {
    return new PointerEvent(tipo, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
  }

  function arrastre(f: any, dx: number, dy: number) {
    const marco: HTMLElement = f.nativeElement.querySelector('.marco');
    spyOn(marco, 'setPointerCapture').and.stub();
    marco.dispatchEvent(puntero('pointerdown', 100, 100));
    marco.dispatchEvent(puntero('pointermove', 100 + dx, 100 + dy));
    marco.dispatchEvent(puntero('pointerup', 100 + dx, 100 + dy));
    f.detectChanges();
  }

  it('empieza centrado y aplica los estilos de la directiva', async () => {
    const { c, img } = await crear();
    expect(c.cargada()).toBeTrue();
    expect(c.encuadre()).toEqual({ x: 50, y: 50, zoom: 1 });
    expect(img.style.objectPosition).toBe('50% 50%');
    expect(img.style.transform).toBe('');
  });

  it('arrastrar a la izquierda muestra más de la derecha; el eje sin exceso no se mueve', async () => {
    const { f, c } = await crear();
    const marco = f.nativeElement.querySelector('.marco').clientWidth;
    arrastre(f, -marco / 2, -40);
    // Exceso horizontal = marco (foto 2:1): medio marco equivale a 50 puntos.
    expect(c.encuadre().x).toBeCloseTo(100, 1);
    expect(c.encuadre().y).toBe(50);
  });

  it('el arrastre se detiene en el borde de la foto', async () => {
    const { f, c } = await crear();
    arrastre(f, 5000, 0);
    expect(c.encuadre().x).toBe(0);
  });

  it('el zoom mantiene el centro y habilita mover en el otro eje', async () => {
    const { f, c, img } = await crear();
    const input: HTMLInputElement = f.nativeElement.querySelector('input');
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    f.detectChanges();
    expect(c.encuadre().zoom).toBe(2);
    expect(c.encuadre().x).toBeCloseTo(50, 5);
    expect(c.encuadre().y).toBeCloseTo(50, 5);
    expect(img.style.transform).toBe('scale(2)');
    const marco = f.nativeElement.querySelector('.marco').clientWidth;
    arrastre(f, 0, marco / 4);
    // Con zoom 2 el exceso vertical = marco: un cuarto de marco son 25 puntos.
    expect(c.encuadre().y).toBeCloseTo(25, 1);
  });

  it('zoom sin centro: al acercar sigue viendo el mismo punto de la foto', async () => {
    const { f, c } = await crear({ x: 0, y: 50, zoom: 1 });
    const marco = f.nativeElement.querySelector('.marco').clientWidth;
    const input: HTMLInputElement = f.nativeElement.querySelector('input');
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // Punto central visible antes: x = marco/2 de un ancho de 2*marco = 25%.
    // Con zoom 2 el ancho es 4*marco y el exceso 3*marco.
    const { x, zoom } = c.encuadre();
    const izquierda = (x / 100) * (4 * marco - marco);
    expect((izquierda + marco / 2) / (2 * marco * zoom)).toBeCloseTo(0.25, 5);
  });

  it('Aplicar devuelve el encuadre redondeado; Cancelar no devuelve nada', async () => {
    const { f, c } = await crear({ x: 33.3333, y: 12.3456, zoom: 1.5 });
    c.aplicar();
    expect(cerrado).toEqual({ x: 33.33, y: 12.35, zoom: 1.5 });
    cerrado = 'sin-cerrar';
    const botones = [...f.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    botones.find(b => b.textContent!.includes('Cancelar'))!.click();
    expect(cerrado).toBeUndefined();
  });

  it('Centrar vuelve a la posición inicial', async () => {
    const { c } = await crear({ x: 10, y: 90, zoom: 3 });
    c.centrar();
    expect(c.encuadre()).toEqual({ x: 50, y: 50, zoom: 1 });
  });
});
