import { Directive, computed, input } from '@angular/core';
import { FotoEncuadre } from '../models/paciente.interface';

/**
 * Muestra una foto con su encuadre guardado, sin modificar el archivo original.
 * La imagen debe llenar un contenedor cuadrado con overflow: hidden y object-fit: cover.
 * Sin encuadre la foto se ve centrada.
 */
@Directive({
  selector: 'img[appFotoEncuadre]',
  standalone: true,
  host: {
    '[style.object-position]': 'posicion()',
    '[style.transform-origin]': 'posicion()',
    '[style.transform]': 'escala()'
  }
})
export class FotoEncuadreDirective {
  appFotoEncuadre = input<FotoEncuadre | null | undefined>(null);

  posicion = computed(() => {
    const encuadre = this.appFotoEncuadre();
    return encuadre ? `${encuadre.x}% ${encuadre.y}%` : null;
  });

  escala = computed(() => {
    const encuadre = this.appFotoEncuadre();
    return encuadre && encuadre.zoom !== 1 ? `scale(${encuadre.zoom})` : null;
  });
}
