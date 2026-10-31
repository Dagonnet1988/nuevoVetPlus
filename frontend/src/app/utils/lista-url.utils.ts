import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router, convertToParamMap } from '@angular/router';

export type ValorUrl = string | number | boolean | null | undefined;

const serializar = (params: Params) =>
  JSON.stringify(Object.keys(params).sort().map(clave => [clave, params[clave]]));

/**
 * Guarda el estado de un listado (búsqueda, filtros, página) en la URL, para que volver
 * atrás o recargar lo conserven. Entrar desde el menú abre la URL limpia: vista general.
 * Debe llamarse al crear el componente.
 */
export function usarListaEnUrl() {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const destroyRef = inject(DestroyRef);
  let destruido = false;
  let propiasEnCurso = 0;
  let ultimo = serializar(route.snapshot.queryParams);
  destroyRef.onDestroy(() => { destruido = true; });

  return {
    params: (): ParamMap => route.snapshot.queryParamMap,

    /** Los valores vacíos no se escriben. No agrega entradas al historial del navegador. */
    guardar(estado: Record<string, ValorUrl>): void {
      // Una búsqueda pendiente no debe cancelar la navegación a otra pantalla.
      if (destruido || (router.getCurrentNavigation() && propiasEnCurso === 0)) return;

      const queryParams: Params = {};
      for (const [clave, valor] of Object.entries(estado)) {
        if (valor !== null && valor !== undefined && valor !== '') queryParams[clave] = String(valor);
      }

      const nuevo = serializar(queryParams);
      if (nuevo === ultimo) return;
      ultimo = nuevo;
      propiasEnCurso++;
      router.navigate([], { relativeTo: route, queryParams, replaceUrl: true })
        .finally(() => { propiasEnCurso--; });
    },

    /** Avisa si la URL cambió por algo distinto al listado, como entrar desde el menú estando en él. */
    alCambiarDesdeFuera(aplicar: (params: ParamMap) => void): void {
      route.queryParams.pipe(takeUntilDestroyed(destroyRef)).subscribe(params => {
        const actual = serializar(params);
        if (actual === ultimo) return;
        ultimo = actual;
        aplicar(convertToParamMap(params));
      });
    }
  };
}
