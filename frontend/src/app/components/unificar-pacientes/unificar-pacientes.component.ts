import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';
import { FotoEncuadre } from '../../models/paciente.interface';
import { FotoEncuadreDirective } from '../../directives/foto-encuadre.directive';
import {
  PacientesService,
  UnificacionPreview,
  UnificacionPaciente,
  UnificacionHistorial
} from '../../services/pacientes.service';

interface Opcion { id: string; nombre: string; especie: string; propietario: string; }
type Lado = 'A' | 'B';

const CAMPOS: { key: string; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'especie', label: 'Especie' },
  { key: 'raza', label: 'Raza' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'edad', label: 'Edad' },
  { key: 'peso', label: 'Peso (kg)' },
  { key: 'color', label: 'Color' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento' },
  { key: 'esterilizado', label: 'Esterilizado' },
  { key: 'microchip', label: 'Microchip' },
  { key: 'foto_url', label: 'Foto' }
];

const vacio = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
// Las mascotas sin foto subida guardan el ícono por especie (/uploads/pacientes/default/...).
const esFotoPorDefecto = (v: unknown) => String(v ?? '').includes('/uploads/pacientes/default/');
const esFotoReal = (v: unknown) => !vacio(v) && !esFotoPorDefecto(v);

@Component({
  selector: 'app-unificar-pacientes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, DatePipe, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatRadioModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, FotoEncuadreDirective
  ],
  template: `
    <div class="unificar-container">
      <div class="page-header">
        <button mat-icon-button routerLink="/pacientes" matTooltip="Volver a Pacientes">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1><mat-icon>merge_type</mat-icon> Unificar pacientes</h1>
          <p>Junta dos registros del mismo paciente: las citas e historias pasan al que se conserva y el otro se elimina.</p>
        </div>
      </div>

      <!-- 1. Elegir pacientes -->
      <mat-card class="card">
        <h2>1. Elige los dos registros</h2>
        <div class="buscadores">
          @for (lado of lados; track lado) {
            <mat-form-field appearance="outline">
              <mat-label>Paciente {{ lado }}</mat-label>
              <input matInput [(ngModel)]="texto[lado]" (ngModelChange)="onEscribir(lado, $event)"
                     [matAutocomplete]="auto" placeholder="Nombre del paciente">
              <mat-autocomplete #auto="matAutocomplete" [displayWith]="mostrar"
                                (optionSelected)="elegir(lado, $event.option.value)">
                @for (o of opcionesPara(lado); track o.id) {
                  <mat-option [value]="o">{{ o.nombre }} <span class="muted">· {{ o.especie }} · {{ o.propietario }}</span></mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
          }
        </div>
        <button mat-raised-button color="primary" (click)="comparar()" [disabled]="!ids.A || !ids.B || cargando()">
          <mat-icon>compare_arrows</mat-icon> Comparar
        </button>
        @if (error()) { <p class="error">{{ error() }}</p> }
      </mat-card>

      @if (cargando()) {
        <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
      }

      @if (datos.A && datos.B && !resultado()) {
        <!-- 2. Comparar y elegir -->
        <mat-card class="card">
          <h2>2. Elige cuál se conserva y qué datos quedan</h2>
          <div class="tabla-wrap">
            <table class="comparacion">
              <thead>
                <tr>
                  <th></th>
                  @for (lado of lados; track lado) {
                    <th [class.principal]="principal === lado">
                      <mat-radio-button [checked]="principal === lado" (change)="cambiarPrincipal(lado)">
                        Conservar {{ lado }}
                      </mat-radio-button>
                      <div class="badge">{{ principal === lado ? 'Se conserva' : 'Se elimina' }}</div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (c of campos; track c.key) {
                  <tr>
                    <td class="campo">{{ c.label }}</td>
                    @for (lado of lados; track lado) {
                      <td [class.elegido]="eleccion[c.key] === lado">
                        @if (iguales(c.key)) {
                          {{ mostrarValor(c.key, lado) }}
                        } @else {
                          <mat-radio-button [name]="'campo-' + c.key" [checked]="eleccion[c.key] === lado"
                                            (change)="elegirCampo(c.key, lado)">
                            {{ mostrarValor(c.key, lado) }}
                          </mat-radio-button>
                        }
                        @if (c.key === 'foto_url' && urlFoto(lado); as src) {
                          <div class="miniatura"><img [src]="src" alt="Foto" [appFotoEncuadre]="encuadreFoto(lado)"></div>
                        }
                      </td>
                    }
                  </tr>
                }
                <tr>
                  <td class="campo">Propietario</td>
                  @for (lado of lados; track lado) {
                    <td [class.elegido]="propietarioDe === lado">
                      @if (datos.A!.id_cliente === datos.B!.id_cliente) {
                        {{ datos[lado]!.propietario.nombre }} <span class="muted">(el mismo)</span>
                      } @else {
                        <mat-radio-button name="propietario" [checked]="propietarioDe === lado" (change)="elegirPropietario(lado)">
                          {{ datos[lado]!.propietario.nombre }}
                        </mat-radio-button>
                        <div class="muted">{{ datos[lado]!.propietario.telefono || 'sin teléfono' }} · {{ datos[lado]!.propietario.total_mascotas }} mascota(s)</div>
                      }
                    </td>
                  }
                </tr>
                <tr class="conteo"><td class="campo">Citas</td>
                  @for (lado of lados; track lado) { <td>{{ datos[lado]!.conteos.citas }} <span class="muted">({{ datos[lado]!.conteos.citas_futuras }} futuras)</span></td> }
                </tr>
                <tr class="conteo"><td class="campo">Historias</td>
                  @for (lado of lados; track lado) { <td>{{ datos[lado]!.conteos.historias }} <span class="muted">({{ datos[lado]!.conteos.sesiones_terapia }} sesiones de terapia)</span></td> }
                </tr>
                <tr class="conteo"><td class="campo">Atendido</td>
                  @for (lado of lados; track lado) { <td>{{ datos[lado]!.conteos.primera_cita || '—' }} → {{ datos[lado]!.conteos.ultima_cita_pasada || '—' }}</td> }
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>

        <!-- 3. Resultado previsto -->
        @if (efectos(); as e) {
          <mat-card class="card efectos">
            <h2>3. Qué va a pasar</h2>
            <ul>
              <li>Queda <strong>{{ e.nombre_final }}</strong>, con propietario <strong>{{ e.propietario_final.nombre }}</strong>.</li>
              <li>Se mueven <strong>{{ e.citas_a_mover }}</strong> cita(s), <strong>{{ e.historias_a_mover }}</strong> historia(s)
                @if (e.series_a_mover) { y {{ e.series_a_mover }} serie(s) } de {{ datos[secundario()]!.ficha.nombre }}.</li>
              @if (e.sesiones_a_renumerar > 0) {
                <li>Las <strong>{{ e.sesiones_a_renumerar }}</strong> sesiones de Terapia/Hidroterapia se renumeran por fecha (1 a {{ e.sesiones_a_renumerar }}).</li>
              }
              <li>Se elimina el registro <strong>{{ datos[secundario()]!.ficha.nombre }}</strong>.</li>
              @for (p of e.propietarios_a_eliminar; track p.id_cliente) {
                <li>Se elimina el propietario <strong>{{ p.nombre }}</strong> porque queda sin mascotas
                  @if (p.consentimientos_a_mover || p.envios_a_mover) {
                    ; sus {{ p.consentimientos_a_mover }} consentimiento(s) y {{ p.envios_a_mover }} envío(s) pasan a {{ e.propietario_final.nombre }}
                  }.</li>
              }
              @if (e.eventos_google_a_retitular > 0) {
                <li>Se actualiza el título de {{ e.eventos_google_a_retitular }} evento(s) en Google Calendar.</li>
              }
            </ul>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Motivo</mat-label>
              <textarea matInput rows="2" [(ngModel)]="motivo" maxlength="500"
                        placeholder="Ej: registro duplicado por error de tilde"></textarea>
            </mat-form-field>
            <div class="acciones">
              <button mat-button (click)="reiniciar()" [disabled]="ejecutando()">Cancelar</button>
              <button mat-raised-button color="warn" (click)="ejecutar()"
                      [disabled]="ejecutando() || motivo.trim().length < 5">
                <mat-icon>merge_type</mat-icon> {{ ejecutando() ? 'Unificando...' : 'Unificar' }}
              </button>
            </div>
          </mat-card>
        }
      }

      @if (resultado(); as r) {
        <mat-card class="card exito">
          <h2><mat-icon>check_circle</mat-icon> Unificación completada</h2>
          <p>{{ r.message }}</p>
          <p class="muted">{{ r.data.resumen.citas_movidas }} cita(s) y {{ r.data.resumen.historias_movidas }} historia(s) movidas ·
            {{ r.data.resumen.sesiones_renumeradas }} sesión(es) renumeradas ·
            {{ r.data.resumen.propietarios_eliminados }} propietario(s) eliminados.
            @if (r.data.google_en_proceso > 0) { Google Calendar se actualiza en segundo plano. }</p>
          <div class="acciones">
            <button mat-button (click)="reiniciar()">Unificar otros</button>
            <button mat-raised-button color="primary" [routerLink]="['/pacientes', r.data.id_mascota]">Ver paciente</button>
          </div>
        </mat-card>
      }

      <!-- Historial -->
      <mat-card class="card">
        <h2>Historial de unificaciones</h2>
        @if (historial().length === 0) {
          <p class="muted">Todavía no hay unificaciones registradas.</p>
        } @else {
          <div class="tabla-wrap">
            <table class="historial">
              <thead><tr><th>Fecha</th><th>Unificación</th><th>Movido</th><th>Motivo</th><th>Usuario</th></tr></thead>
              <tbody>
                @for (h of historial(); track h.id_unificacion) {
                  <tr>
                    <td>{{ h.created_at | date:'dd/MM/yy h:mm a' }}</td>
                    <td>
                      {{ h.nombre_eliminada }} →
                      @if (h.principal_existe) {
                        <a [routerLink]="['/pacientes', h.id_mascota_principal]">{{ h.nombre_principal }}</a>
                      } @else { {{ h.nombre_principal }} }
                    </td>
                    <td>{{ h.resumen?.citas_movidas || 0 }} citas · {{ h.resumen?.historias_movidas || 0 }} historias</td>
                    <td>{{ h.motivo }}</td>
                    <td>{{ h.usuario_nombre || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (historial().length < totalHistorial()) {
            <button mat-button (click)="cargarHistorial(true)">Ver más</button>
          }
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .unificar-container { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .page-header { display: flex; align-items: flex-start; gap: 8px; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 24px; color: #2e7d32; }
    .page-header p { margin: 4px 0 0; color: #607d8b; }
    .card { padding: 20px; }
    .card h2 { margin: 0 0 12px; font-size: 17px; display: flex; align-items: center; gap: 8px; }
    .buscadores { display: flex; gap: 12px; flex-wrap: wrap; }
    .buscadores mat-form-field { flex: 1 1 280px; }
    .muted { color: #78909c; font-size: 12px; }
    .error { color: #d32f2f; }
    .loading { display: flex; justify-content: center; padding: 16px; }
    .tabla-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #eceff1; text-align: left; vertical-align: top; }
    th.principal { background: #e8f5e9; }
    .badge { font-size: 11px; color: #607d8b; margin-top: 2px; }
    td.campo { font-weight: 600; color: #455a64; white-space: nowrap; width: 160px; }
    td.elegido { background: #f1f8e9; }
    tr.conteo td { background: #fafafa; }
    .miniatura { width: 56px; height: 56px; overflow: hidden; border-radius: 8px; margin-top: 6px; border: 1px solid #eceff1; }
    .miniatura img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .efectos ul { margin: 0 0 16px; padding-left: 20px; line-height: 1.6; }
    .full { width: 100%; }
    .acciones { display: flex; justify-content: flex-end; gap: 8px; }
    .exito h2 mat-icon { color: #2e7d32; }
    @media (max-width: 640px) { td.campo { width: auto; } }
  `]
})
export class UnificarPacientesComponent implements OnInit, OnDestroy {
  private pacientesService = inject(PacientesService);
  private snackBar = inject(MatSnackBar);

  lados: Lado[] = ['A', 'B'];
  campos = CAMPOS;

  texto: Record<Lado, string> = { A: '', B: '' };
  ids: Record<Lado, string | null> = { A: null, B: null };
  opciones: Record<Lado, ReturnType<typeof signal<Opcion[]>>> = { A: signal<Opcion[]>([]), B: signal<Opcion[]>([]) };
  datos: Record<Lado, UnificacionPaciente | null> = { A: null, B: null };

  principal: Lado = 'A';
  eleccion: Record<string, Lado> = {};
  propietarioDe: Lado = 'A';
  motivo = '';

  efectos = signal<UnificacionPreview['efectos'] | null>(null);
  cargando = signal(false);
  ejecutando = signal(false);
  error = signal('');
  resultado = signal<any | null>(null);
  historial = signal<UnificacionHistorial[]>([]);
  totalHistorial = signal(0);

  private busqueda$ = { A: new Subject<string>(), B: new Subject<string>() };
  private recalculo$ = new Subject<void>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    for (const lado of this.lados) {
      this.subs.push(this.busqueda$[lado].pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(t => t.trim().length < 2
          ? of(null)
          : this.pacientesService.getMascotas(1, 15, { search: t.trim() }).pipe(catchError(() => of(null))))
      ).subscribe((res: any) => this.opciones[lado].set(this.normalizar(res))));
    }
    this.subs.push(this.recalculo$.pipe(debounceTime(250)).subscribe(() => this.cargarVista(false)));
    this.cargarHistorial(false);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private normalizar(res: any): Opcion[] {
    const lista = res?.data?.pacientes ?? res?.pacientes ?? (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    return lista.map((p: any) => ({
      id: p.id_mascota || p.id,
      nombre: p.nombre || 'Sin nombre',
      especie: p.especie || '',
      propietario: p.cliente?.nombre || p.cliente_nombre || p.nombre_cliente || p.propietario || ''
    })).filter((o: Opcion) => Boolean(o.id));
  }

  mostrar = (o: Opcion | string | null): string => typeof o === 'string' ? o : (o?.nombre ?? '');

  /** Opciones del buscador sin el paciente ya elegido en el otro lado. */
  opcionesPara(lado: Lado): Opcion[] {
    const otro = this.ids[lado === 'A' ? 'B' : 'A'];
    return this.opciones[lado]().filter(o => o.id !== otro);
  }

  urlFoto(lado: Lado): string | null {
    const v = (this.datos[lado]?.ficha as any)?.foto_url;
    if (vacio(v)) return null;
    return String(v).startsWith('http') ? String(v) : `${environment.backendUrl}${v}`;
  }

  encuadreFoto(lado: Lado): FotoEncuadre | null {
    return (this.datos[lado]?.ficha as any)?.foto_encuadre ?? null;
  }

  onEscribir(lado: Lado, valor: string | Opcion): void {
    if (typeof valor !== 'string') return;
    this.resultado.set(null);
    this.ids[lado] = null;
    this.limpiarVista();
    this.busqueda$[lado].next(valor);
  }

  elegir(lado: Lado, o: Opcion): void {
    this.ids[lado] = o.id;
    this.texto[lado] = o.nombre;
    this.limpiarVista();
  }

  secundario(): Lado {
    return this.principal === 'A' ? 'B' : 'A';
  }

  comparar(): void {
    if (this.ids.A === this.ids.B) {
      this.error.set('Elegiste el mismo registro dos veces.');
      return;
    }
    this.principal = 'A';
    this.propietarioDe = 'A';
    this.eleccion = {};
    this.cargarVista(true);
  }

  /** Pide al backend los datos y los efectos con las elecciones actuales. */
  private cargarVista(inicial: boolean): void {
    if (!this.ids.A || !this.ids.B) return;
    this.error.set('');
    if (inicial) this.cargando.set(true);

    this.pacientesService.previewUnificacion(this.construirCuerpo()).subscribe({
      next: (v) => {
        this.cargando.set(false);
        const porId = (id: string) => v.principal.id_mascota === id ? v.principal : v.secundario;
        this.datos = { A: porId(this.ids.A!), B: porId(this.ids.B!) };
        if (inicial) this.elegirPorDefecto();
        this.efectos.set(v.efectos);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar la comparación.');
      }
    });
  }

  /** Por defecto, cada dato sale del que se conserva, salvo que esté vacío y el otro lo tenga. */
  private elegirPorDefecto(): void {
    const p = this.principal;
    const s = this.secundario();
    for (const c of CAMPOS) {
      const vp = (this.datos[p]!.ficha as any)[c.key];
      const vs = (this.datos[s]!.ficha as any)[c.key];
      if (c.key === 'foto_url') {
        // Una foto subida gana sobre el ícono por defecto o la ausencia de foto.
        this.eleccion[c.key] = !esFotoReal(vp) && esFotoReal(vs) ? s : p;
      } else {
        this.eleccion[c.key] = vacio(vp) && !vacio(vs) ? s : p;
      }
    }
    this.propietarioDe = p;
  }

  private construirCuerpo() {
    const p = this.principal;
    const campos: Record<string, 'principal' | 'secundario'> = {};
    for (const c of CAMPOS) {
      if (this.eleccion[c.key]) campos[c.key] = this.eleccion[c.key] === p ? 'principal' : 'secundario';
    }
    return {
      id_principal: this.ids[p]!,
      id_secundario: this.ids[this.secundario()]!,
      propietario: (this.propietarioDe === p ? 'principal' : 'secundario') as 'principal' | 'secundario',
      campos
    };
  }

  cambiarPrincipal(lado: Lado): void {
    this.principal = lado;
    this.elegirPorDefecto();
    this.recalculo$.next();
  }

  elegirCampo(campo: string, lado: Lado): void {
    this.eleccion[campo] = lado;
    if (campo === 'nombre') this.recalculo$.next();
  }

  elegirPropietario(lado: Lado): void {
    this.propietarioDe = lado;
    this.recalculo$.next();
  }

  iguales(campo: string): boolean {
    const a = (this.datos.A?.ficha as any)?.[campo];
    const b = (this.datos.B?.ficha as any)?.[campo];
    // Sin foto subida en ninguno de los dos: no hay nada que elegir.
    if (campo === 'foto_url' && !esFotoReal(a) && !esFotoReal(b)) return true;
    return String(a ?? '') === String(b ?? '');
  }

  mostrarValor(campo: string, lado: Lado): string {
    const v = (this.datos[lado]?.ficha as any)?.[campo];
    if (campo === 'foto_url') return esFotoReal(v) ? 'Foto subida' : (esFotoPorDefecto(v) ? 'Imagen por defecto' : 'Sin foto');
    if (campo === 'esterilizado') return v === true ? 'Sí' : v === false ? 'No' : '—';
    return vacio(v) ? '—' : String(v);
  }

  ejecutar(): void {
    const s = this.datos[this.secundario()]!;
    const p = this.datos[this.principal]!;
    if (!confirm(`¿Unificar "${s.ficha.nombre}" en "${this.efectos()?.nombre_final || p.ficha.nombre}"?\n\n`
      + `El registro "${s.ficha.nombre}" se eliminará. Esta acción no se puede deshacer desde la aplicación.`)) {
      return;
    }

    this.ejecutando.set(true);
    this.pacientesService.ejecutarUnificacion({ ...this.construirCuerpo(), motivo: this.motivo.trim() }).subscribe({
      next: (r) => {
        this.ejecutando.set(false);
        this.limpiarFormulario();
        this.resultado.set(r);
        this.snackBar.open(r?.message || 'Pacientes unificados', 'Cerrar', { duration: 4000 });
        this.cargarHistorial(false);
      },
      error: (err) => {
        this.ejecutando.set(false);
        this.error.set(err?.error?.message || 'No se pudo completar la unificación.');
      }
    });
  }

  private limpiarVista(): void {
    this.datos = { A: null, B: null };
    this.efectos.set(null);
    this.error.set('');
  }

  /** Deja en blanco la búsqueda y la comparación. */
  private limpiarFormulario(): void {
    this.texto = { A: '', B: '' };
    this.ids = { A: null, B: null };
    this.opciones.A.set([]);
    this.opciones.B.set([]);
    this.motivo = '';
    this.limpiarVista();
  }

  reiniciar(): void {
    this.limpiarFormulario();
    this.resultado.set(null);
  }

  cargarHistorial(masAdelante: boolean): void {
    const offset = masAdelante ? this.historial().length : 0;
    this.pacientesService.listarUnificaciones(20, offset).subscribe({
      next: (r) => {
        this.historial.set(masAdelante ? [...this.historial(), ...r.data] : r.data);
        this.totalHistorial.set(r.total);
      },
      error: () => { /* el historial es secundario: no bloquear la pantalla */ }
    });
  }
}
