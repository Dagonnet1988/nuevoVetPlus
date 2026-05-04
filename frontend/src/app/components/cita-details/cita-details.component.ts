import { Component, OnInit, signal, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';

import { CitasService } from '../../services/citas.service';
import { ConsultasService } from '../../services/consultas.service';
import { AuthService } from '../../services/auth.service';
import { HistoriaClinica, HistoriaClinicaService } from '../../services/historia-clinica.service';
import { Cita, TIPOS_CITA, ESTADOS_CITA } from '../../models/cita.interface';

@Component({
  selector: 'app-cita-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './cita-details.component.html',
  styleUrl: './cita-details.component.css'
})
export class CitaDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private citasService = inject(CitasService);
  private consultasService = inject(ConsultasService);
  private authService = inject(AuthService);
  private historiaClinicaService = inject(HistoriaClinicaService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  // Callback para notificar al calendario padre sobre cambios
  onStateUpdated?: () => void;

  // Signals
  loading = signal(false);
  cita = signal<Cita | null>(null);
  updating = signal(false);
  historiaClinicaAsociada = signal<boolean>(false);
  documentosCita = signal<HistoriaClinica[]>([]);
  loadingDocumentos = signal(false);
  documentosPanelOpen = signal(false);

  // Constants
  tiposCita = TIPOS_CITA;
  estadosCita = ESTADOS_CITA;

  ngOnInit(): void {
    const citaId = this.route.snapshot.paramMap.get('id');
    if (citaId) {
      this.loadCita(citaId);
    } else {
      this.router.navigate(['/citas']);
    }
  }

  private async loadCita(citaId: string): Promise<void> {
    try {
      this.loading.set(true);
      console.log('🔍 Cargando cita con ID:', citaId);
      const response = await this.citasService.getCitaById(citaId).toPromise();

      console.log('📝 Respuesta del backend:', response);

      if (response?.success && response.data) {
        // Transformar datos planos a estructura anidada para compatibilidad con el template
        const citaTransformada = this.transformarCitaParaTemplate(response.data);
        console.log('🔄 Cita transformada:', citaTransformada);
        this.cita.set(citaTransformada);
        await this.refreshHistoriaClinicaStatus(citaTransformada.id_cita);
        await this.loadDocumentosCita(citaTransformada.id_cita);

        // Debug: verificar transiciones disponibles
        console.log('🎯 Verificando transiciones después de cargar cita...');
        const transiciones = this.getAvailableStatusTransitions();
        console.log('🔄 Transiciones encontradas:', transiciones);
      } else {
        throw new Error('Cita no encontrada');
      }
    } catch (error) {
      console.error('Error cargando cita:', error);
      this.snackBar.open('Error cargando la cita', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/citas']);
    } finally {
      this.loading.set(false);
    }
  }

  onEdit(): void {
    const cita = this.cita();
    if (!cita) return;

    this.router.navigate(['/citas', cita.id_cita, 'editar']);
  }

  async onUpdateStatus(nuevoEstado: string): Promise<void> {
    const cita = this.cita();
    if (!cita || this.updating()) return;

    const blockedReason = this.getTransitionBlockReason(nuevoEstado);
    if (blockedReason) {
      this.snackBar.open(blockedReason, 'Cerrar', { duration: 5000 });
      return;
    }

    const confirmMessage = this.getConfirmationMessage(nuevoEstado);
    const confirmed = await this.openConfirmDialog('Confirmar cambio de estado', confirmMessage, 'Confirmar');
    if (!confirmed) return;

    try {
      this.updating.set(true);

      const response = await this.citasService.updateEstadoCita(
        cita.id_cita,
        nuevoEstado
      ).toPromise();

      if (response?.success) {
        // Actualizar el estado local
        const citaActualizada = { ...cita, estado: nuevoEstado as any };
        this.cita.set(citaActualizada);
        await this.refreshHistoriaClinicaStatus(cita.id_cita);
        await this.loadDocumentosCita(cita.id_cita);

        this.snackBar.open(
          `Estado actualizado a ${this.getEstadoLabel(nuevoEstado)}`,
          'Cerrar',
          { duration: 3000 }
        );

        if (nuevoEstado === 'completada' && this.documentosCita().length > 0) {
          const enviarAhora = await this.openConfirmDialog(
            'Enviar documentos al propietario',
            'La cita quedó completada. ¿Deseas enviar ahora los documentos clínicos de esta cita al propietario por correo?',
            'Enviar ahora'
          );
          if (enviarAhora) {
            await this.onEnviarTodosDocumentos();
          }
        }

        // Notificar al calendario para que se refresque
        if (this.onStateUpdated) {
          this.onStateUpdated();
        }
      } else {
        throw new Error(response?.message || 'Error actualizando estado');
      }
    } catch (error: any) {
      console.error('Error actualizando estado:', error);

      // Manejar errores específicos de validación de historia clínica
      if (error.error?.code === 'CONSULTATION_REQUIRED') {
        this.snackBar.open(
          'No se puede completar la cita sin historia clínica. Primero debe crear la historia clínica.',
          'Ir a Historia Clínica',
          { duration: 6000 }
        ).onAction().subscribe(() => {
          this.onViewHistoriaClinica();
        });
      } else if (error.error?.code === 'CONSULTATION_NOT_COMPLETED') {
        this.snackBar.open(
          'La historia clínica debe estar completada antes de marcar la cita como completada.',
          'Completar Historia Clínica',
          { duration: 6000 }
        ).onAction().subscribe(() => {
          this.onViewHistoriaClinica();
        });
      } else if (error.status === 400) {
        // Manejar errores 400 específicos
        const errorMessage = error.error?.message || 'Error de validación en el servidor';
        this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
      } else if (error.status === 404) {
        this.snackBar.open('Cita no encontrada', 'Cerrar', { duration: 3000 });
      } else if (error.status === 500) {
        this.snackBar.open('Error interno del servidor. Intenta nuevamente.', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('Error actualizando el estado', 'Cerrar', { duration: 3000 });
      }
    } finally {
      this.updating.set(false);
    }
  }

  async onCancel(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.updating()) return;

    const motivo = await this.openCancelReasonDialog();
    if (motivo === null) return;

    try {
      this.updating.set(true);

      const response = await this.citasService.cancelCita(cita.id_cita, motivo || undefined).toPromise();

      if (response?.success) {
        this.snackBar.open('Cita cancelada exitosamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/citas']);
      } else {
        throw new Error(response?.message || 'Error cancelando cita');
      }
    } catch (error) {
      console.error('Error cancelando cita:', error);
      this.snackBar.open('Error cancelando la cita', 'Cerrar', { duration: 3000 });
    } finally {
      this.updating.set(false);
    }
  }

  async onSyncWithGoogle(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.updating()) return;

    try {
      this.updating.set(true);

      const response = await this.citasService.syncWithGoogleCalendar(cita.id_cita).toPromise();

      if (response?.success) {
        this.snackBar.open('Sincronización exitosa con Google Calendar', 'Cerrar', { duration: 3000 });
        // Recargar la cita para obtener el nuevo estado de sincronización
        this.loadCita(cita.id_cita);
      } else {
        throw new Error(response?.message || 'Error en la sincronización');
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      this.snackBar.open('Error sincronizando con Google Calendar', 'Cerrar', { duration: 3000 });
    } finally {
      this.updating.set(false);
    }
  }

  // ===============================
  // NAVEGACIÓN CITA → CONSULTA
  // ===============================

  async onVerConsulta(): Promise<void> {
    const cita = this.cita();
    if (!cita) return;

    try {
      this.updating.set(true);

      // Buscar la consulta asociada a esta cita
      const response = await this.consultasService.getConsultaByCitaId(cita.id_cita).toPromise();

      if (response?.success && response.data) {
        // Navegar a la vista de consulta (solo lectura para auxiliares)
        this.router.navigate(['/consultas', response.data.id_consulta]);
      } else {
        this.snackBar.open('No se encontró consulta asociada', 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error cargando consulta:', error);
      this.snackBar.open('Error al cargar la consulta', 'Cerrar', { duration: 3000 });
    } finally {
      this.updating.set(false);
    }
  }

  onViewPaciente(): void {
    const cita = this.cita();
    if (cita?.id_mascota) {
      this.router.navigate(['/pacientes', cita.id_mascota]);
    }
  }


  async onViewHistoriaClinica(): Promise<void> {
    const cita = this.cita();
    if (!cita) return;

    // En cita en curso siempre se lleva al formulario.
    // La validación de duplicados por tipo ocurre al guardar en el módulo de historias.
    if (cita.estado === 'en_curso') {
      this.navigateToHistoriaCreationFromCita(cita);
      return;
    }

    try {
      console.log('🔍 Buscando historia clínica para cita:', cita.id_cita);

      const response = await this.historiaClinicaService.getHistoriaByCitaId(cita.id_cita).toPromise();

      if (response?.success && response.data) {
        console.log('✅ Historia clínica encontrada:', response.data);

        // Si está completada u otro estado, ir a VER la historia clínica (solo lectura)
        this.router.navigate(['/historia-clinica', response.data.id_historia]);
      } else {
        console.log('⚠️ No se encontró historia clínica para esta cita');

        if (cita.estado === 'completada') {
          this.snackBar.open('No se encontró historia clínica para esta cita', 'Cerrar', {
            duration: 4000
          });
        } else {
          this.snackBar.open(
            'La historia clínica se crea automáticamente cuando la cita pasa a "En Curso"',
            'Cerrar',
            { duration: 5000 }
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo historia clínica:', error);

      if (error.status === 404) {
        if (cita.estado === 'completada') {
          this.snackBar.open('No se encontró historia clínica para esta cita', 'Cerrar', { duration: 4000 });
        } else {
          this.snackBar.open(
            'La historia clínica se crea automáticamente cuando la cita pasa a "En Curso"',
            'Cerrar',
            { duration: 5000 }
          );
        }
      } else {
        this.snackBar.open('Error accediendo a la historia clínica', 'Cerrar', { duration: 3000 });
      }
    }
  }

  canViewHistoriaClinica(): boolean {
    const cita = this.cita();
    // Mostrar botón para estados que pueden tener historia clínica
    return cita?.estado === 'en_curso' || cita?.estado === 'completada';
  }

  getHistoriaClinicaButtonText(): string {
    const cita = this.cita();
    if (cita?.estado === 'en_curso') {
      return this.historiaClinicaAsociada() ? 'Crear otro documento clínico' : 'Crear Historia Clínica';
    } else if (cita?.estado === 'completada') {
      return 'Ver Historia Clínica';
    }
    return 'Historia Clínica';
  }

  getDocumentoTipoLabel(tipo: string): string {
    return this.historiaClinicaService.getTipoLabel(tipo as any);
  }

  private getHistoriaTipoDocumentoFromCita(cita: Cita): 'valoracion_inicial' | 'seguimiento' {
    return cita.tipo === 'valoracion' ? 'valoracion_inicial' : 'seguimiento';
  }

  private navigateToHistoriaCreationFromCita(cita: Cita): void {
    this.router.navigate(['/historia-clinica/nueva'], {
      queryParams: {
        id_mascota: cita.id_mascota,
        id_veterinario: cita.id_veterinario,
        id_cita: cita.id_cita,
        tipo_documento: this.getHistoriaTipoDocumentoFromCita(cita)
      }
    });
  }

  async onToggleDocumentosPanel(): Promise<void> {
    const cita = this.cita();
    if (!cita) return;

    await this.loadDocumentosCita(cita.id_cita);

    const dialogRef = this.dialog.open(CitaDocumentosListDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      data: {
        estadoCita: cita.estado,
        documentos: this.documentosCita(),
        getTipoLabel: (tipo: string) => this.getDocumentoTipoLabel(tipo),
        formatDate: (fecha: string) => this.formatDateCompact(fecha),
      }
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (!result) return;

    if (result.action === 'open-pdf' && result.idHistoria) {
      this.verDocumentoCita(result.idHistoria);
      return;
    }

    if (result.action === 'send-one' && result.idHistoria) {
      const doc = this.documentosCita().find((d) => d.id_historia === result.idHistoria);
      if (doc) await this.onEnviarDocumento(doc);
      return;
    }

    if (result.action === 'send-all') {
      await this.onEnviarTodosDocumentos();
    }
  }

  verDocumentoCita(idHistoria: string): void {
    const historyRef = this.documentosCita().find((d) => d.id_historia === idHistoria);
    this.openDocumentoPdfModal(idHistoria, historyRef?.codigo_historia || 'Documento clínico');
  }

  async onEnviarDocumento(historia: HistoriaClinica): Promise<void> {
    const cita = this.cita();
    if (!cita || !historia?.id_historia || this.updating()) return;
    if (cita.estado !== 'completada') {
      this.snackBar.open('Solo puedes enviar documentos cuando la cita esté completada.', 'Cerrar', { duration: 4000 });
      return;
    }

    const confirmar = await this.openConfirmDialog(
      'Enviar documento',
      `¿Enviar ${this.historiaClinicaService.getTipoLabel(historia.tipo_documento)} (${historia.codigo_historia}) al propietario por correo?`,
      'Enviar'
    );
    if (!confirmar) return;

    try {
      this.updating.set(true);
      const response = await this.historiaClinicaService.sendHistoriaByEmail(historia.id_historia).toPromise();
      this.snackBar.open(response?.message || 'Documento enviado por correo', 'Cerrar', { duration: 3500 });
    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'No se pudo enviar el documento', 'Cerrar', { duration: 4000 });
    } finally {
      this.updating.set(false);
    }
  }

  async onEnviarTodosDocumentos(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.updating()) return;
    if (cita.estado !== 'completada') {
      this.snackBar.open('Solo puedes enviar documentos cuando la cita esté completada.', 'Cerrar', { duration: 4000 });
      return;
    }

    const docs = this.documentosCita();
    if (!docs.length) {
      this.snackBar.open('No hay documentos para enviar en esta cita', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.updating.set(true);
      const ids = docs.map((d) => d.id_historia);
      const results = await this.historiaClinicaService.sendHistoriasByEmail(ids).toPromise();
      const ok = (results || []).filter((r) => r.ok).length;
      const fail = (results || []).length - ok;
      if (fail === 0) {
        this.snackBar.open(`Se enviaron ${ok} documento(s) al propietario`, 'Cerrar', { duration: 4000 });
      } else {
        this.snackBar.open(`Enviados: ${ok}. Fallidos: ${fail}. Revisa configuración de correo.`, 'Cerrar', { duration: 5000 });
      }
    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'No se pudieron enviar los documentos', 'Cerrar', { duration: 4000 });
    } finally {
      this.updating.set(false);
    }
  }

  onBack(): void {
    const from = this.route.snapshot.queryParamMap.get('from');

    if (from === 'calendario') {
      this.router.navigate(['/citas'], {
        queryParams: { view: 'calendario' }
      });
      return;
    }

    this.router.navigate(['/citas']);
  }

  // Helper methods
  getTipoInfo(tipo: string) {
    return this.tiposCita.find(t => t.value === tipo) || this.tiposCita[0];
  }

  getEstadoInfo(estado: string) {
    return this.estadosCita.find(e => e.value === estado) || this.estadosCita[0];
  }

  getEstadoLabel(estado: string): string {
    return this.getEstadoInfo(estado).label;
  }

  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return 'Fecha no disponible';
    const date = this.parseLocalDate(dateString);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(dateString: string | null | undefined): string {
    if (!dateString) return '--:--';
    const date = this.parseLocalDate(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const fecha = this.parseLocalDate(dateString);
      return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(fecha);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha no válida';
    }
  }

  formatDateCompact(dateString: string | null | undefined): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const fecha = this.parseLocalDate(dateString);
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(fecha);
    } catch (error) {
      console.error('Error formateando fecha compacta:', error);
      return 'Fecha no válida';
    }
  }

  calculateDuration(): string {
    const cita = this.cita();
    if (!cita || !cita.fecha_inicio || !cita.fecha_fin) return '';

    const inicio = this.parseLocalDate(cita.fecha_inicio);
    const fin = this.parseLocalDate(cita.fecha_fin);
    const duracionMs = fin.getTime() - inicio.getTime();
    const duracionMinutos = Math.round(duracionMs / (1000 * 60));

    if (duracionMinutos < 0) {
      return 'Duración inválida';
    }

    if (duracionMinutos >= 60) {
      const horas = Math.floor(duracionMinutos / 60);
      const minutos = duracionMinutos % 60;
      return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
    }

    return `${duracionMinutos}m`;
  }

  private parseLocalDate(fechaStr: string): Date {
    // console.log('🔍 Details parseLocalDate:', {
    //   input: fechaStr,
    //   output: date,
    //   hours: date.getHours(),
    //   conversion: `${fechaStr} -> ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    // });

    const date = new Date(fechaStr);
    return date;
  }

  canEditCita(): boolean {
    const cita = this.cita();
    if (!cita) return false;

    // En curso: sólo administrador puede editar la cita
    if (cita.estado === 'en_curso' && this.authService.isVet()) {
      return false;
    }

    // No se puede editar si está completada o no asistió
    return !['completada', 'no_asistio'].includes(cita.estado);
  }

  canCancelCita(): boolean {
    const cita = this.cita();
    if (!cita) return false;

    // Solo se puede cancelar si no está ya cancelada o completada
    return !['cancelada', 'completada'].includes(cita.estado);
  }

  canTransitionTo(estadoDestino: string): boolean {
    return !this.getTransitionBlockReason(estadoDestino);
  }

  getTransitionBlockReason(estadoDestino: string): string | null {
    const cita = this.cita();
    if (!cita) return 'No hay cita cargada';

    if (estadoDestino === 'completada' && !this.historiaClinicaAsociada()) {
      return 'Para cerrar la cita debes tener historia clínica asociada y finalizada.';
    }

    return null;
  }

  getAvailableStatusTransitions(): Array<{value: string, label: string, color: string}> {
    const cita = this.cita();
    if (!cita) {
      // console.log('🚫 No hay cita disponible para transiciones');
      return [];
    }

    const currentStatus = cita.estado;
    // console.log('🔄 Estado actual de la cita:', currentStatus);

    // Definir transiciones permitidas
    const transitions: {[key: string]: string[]} = {
      // Compatibilidad con estados legados
      'pendiente': ['confirmada'],
      'cancelada': ['no_asistio'],
      'confirmada': ['en_curso', 'no_asistio'],
      'en_curso': ['completada', 'no_asistio'],
      'completada': [], // No se puede cambiar desde completada
      'no_asistio': []
    };

    const allowedTransitions = transitions[currentStatus] || [];
    // console.log('✅ Transiciones permitidas:', allowedTransitions);

    const availableStates = this.estadosCita.filter(estado =>
      allowedTransitions.includes(estado.value) && estado.value !== currentStatus
    );

    // console.log('🎯 Estados disponibles para transición:', availableStates);
    return availableStates;
  }

  private getConfirmationMessage(nuevoEstado: string): string {
    const estadoLabel = this.getEstadoLabel(nuevoEstado);
    const cita = this.cita();

    switch (nuevoEstado) {
      case 'confirmada':
        return `¿Confirmar la cita de ${cita?.mascota?.nombre}?`;
      case 'en_curso':
        return `¿Marcar como en curso la cita de ${cita?.mascota?.nombre}?`;
      case 'completada':
        return `¿Marcar como completada la cita de ${cita?.mascota?.nombre}?`;
      case 'no_asistio':
        return `¿Marcar que ${cita?.mascota?.nombre} no asistió a la cita?`;
      default:
        return `¿Cambiar el estado a ${estadoLabel}?`;
    }
  }

  private async openConfirmDialog(title: string, message: string, confirmText: string): Promise<boolean> {
    const dialogRef = this.dialog.open(CitaConfirmDialogComponent, {
      width: '420px',
      data: { title, message, confirmText, cancelText: 'Cancelar' }
    });

    const result = await dialogRef.afterClosed().toPromise();
    return Boolean(result);
  }

  private async openCancelReasonDialog(): Promise<string | null> {
    const dialogRef = this.dialog.open(CitaCancelReasonDialogComponent, {
      width: '460px',
      data: {
        title: 'Cancelar cita',
        subtitle: 'Puedes registrar una razón breve de cancelación (opcional).',
        confirmText: 'Cancelar cita',
        cancelText: 'Volver'
      }
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result === undefined) return null;
    return typeof result === 'string' ? result.trim() : '';
  }

  getSyncStatusInfo() {
    const cita = this.cita();
    if (!cita) return null;

    if (cita.google_event_id) {
      return {
        synced: true,
        message: 'Sincronizada con Google Calendar',
        icon: 'cloud_done',
        color: 'success'
      };
    } else {
      return {
        synced: false,
        message: 'No sincronizada',
        icon: 'cloud_off',
        color: 'warn'
      };
    }
  }

  getStatusIcon(estado: string): string {
    const icons: { [key: string]: string } = {
      'confirmada': 'check_circle',
      'en_curso': 'play_circle',
      'completada': 'task_alt',
      'pendiente': 'schedule',
      'cancelada': 'cancel',
      'no_asistio': 'event_busy'
    };
    return icons[estado] || 'radio_button_unchecked';
  }

  getStatusActionClass(estado: string): string {
    const classes: { [key: string]: string } = {
      confirmada: 'status-btn-confirmada',
      en_curso: 'status-btn-curso',
      completada: 'status-btn-completada',
      no_asistio: 'status-btn-no-asistio',
      pendiente: 'status-btn-pendiente',
      cancelada: 'status-btn-cancelada'
    };
    return classes[estado] || 'status-btn-default';
  }

  hasStateActions(): boolean {
    return this.getAvailableStatusTransitions().length > 0;
  }

  getAssetUrl(assetUrl?: string | null): string {
    if (!assetUrl) return '';
    if (/^https?:\/\//i.test(assetUrl)) return assetUrl;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${apiBase}${assetUrl.startsWith('/') ? '' : '/'}${assetUrl}`;
  }

  private async refreshHistoriaClinicaStatus(citaId: string): Promise<void> {
    try {
      const response = await this.historiaClinicaService.getHistoriaByCitaId(citaId).toPromise();
      this.historiaClinicaAsociada.set(Boolean(response?.success && response?.data));
    } catch (error: any) {
      if (error?.status === 404) {
        this.historiaClinicaAsociada.set(false);
        return;
      }
      // Fallback conservador: no bloquear flujo visual si hay error temporal de red
      this.historiaClinicaAsociada.set(false);
    }
  }

  private async loadDocumentosCita(citaId: string): Promise<void> {
    try {
      this.loadingDocumentos.set(true);
      const response = await this.historiaClinicaService.getHistoriasByCitaId(citaId).toPromise();
      const docs = Array.isArray(response?.data) ? response.data : [];
      this.documentosCita.set(docs);
    } catch (error: any) {
      if (error?.status === 404) {
        this.documentosCita.set([]);
      } else {
        this.documentosCita.set([]);
      }
    } finally {
      this.loadingDocumentos.set(false);
    }
  }

  private openDocumentoPdfModal(idHistoria: string, codigoHistoria: string): void {
    const dialogRef = this.dialog.open(CitaDocumentoPdfDialogComponent, {
      width: '92vw',
      maxWidth: '1100px',
      height: '88vh',
      data: {
        title: `PDF ${codigoHistoria}`,
        loading: true,
        pdfUrl: null,
        error: null,
      },
    });

    this.historiaClinicaService.getPDFBlob(idHistoria).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          dialogRef.componentInstance.updateState({
            loading: false,
            error: 'No se recibió un PDF válido',
            pdfUrl: null,
          });
          return;
        }

        const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }));
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

        dialogRef.componentInstance.updateState({
          loading: false,
          error: null,
          pdfUrl: safeUrl,
        });

        dialogRef.afterClosed().subscribe(() => URL.revokeObjectURL(url));
      },
      error: (error: any) => {
        dialogRef.componentInstance.updateState({
          loading: false,
          error: error?.error?.message || 'No se pudo cargar el PDF del documento',
          pdfUrl: null,
        });
      }
    });
  }

  // ===============================
  // MÉTODOS AUXILIARES PARA CONSULTA
  // ===============================

  puedeVerConsulta(): boolean {
    const cita = this.cita();
    return cita?.estado === 'completada';
  }

  private transformarCitaParaTemplate(citaData: any): Cita {
    console.log('🔄 Transformando cita para template:', citaData);
    console.log('🔄 cliente_documento en citaData:', citaData.cliente_documento);

    // Crear estructura anidada a partir de campos planos
    const citaTransformada: Cita = {
      ...citaData,
      // Estructura anidada para mascota
      mascota: {
        nombre: citaData.mascota_nombre || 'Sin nombre',
        especie: citaData.especie || citaData.mascota_especie || 'No especificado',
        raza: citaData.raza || citaData.mascota_raza,
        foto_url: citaData.mascota_foto_url || citaData.foto_url,
        cliente: {
          nombre: citaData.cliente_nombre || 'Sin nombre',
          documento: citaData.cliente_documento,
          telefono: citaData.cliente_telefono,
          email: citaData.cliente_email,
          direccion: citaData.cliente_direccion
        }
      },
      // Estructura anidada para veterinario
      veterinario: {
        nombre: citaData.veterinario_nombre || 'Sin asignar',
        especialidad: citaData.veterinario_especialidad,
        email: citaData.veterinario_email,
        avatar_url: citaData.veterinario_avatar_url
      }
    };

    console.log('✅ Cita transformada:', {
      mascota_nombre: citaTransformada.mascota?.nombre,
      cliente_nombre: citaTransformada.mascota?.cliente?.nombre,
      cliente_documento: citaTransformada.mascota?.cliente?.documento,
      cliente_documento_plano: citaTransformada.cliente_documento
    });

    return citaTransformada;
  }
}

interface CitaConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-cita-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>help</mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ data.cancelText || 'Cancelar' }}</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(true)">{{ data.confirmText || 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display:flex; align-items:center; gap:8px; }
    mat-dialog-content p { margin: 0; line-height: 1.4; }
  `]
})
export class CitaConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CitaConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CitaConfirmDialogData
  ) {}
}

interface CitaCancelReasonDialogData {
  title: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-cita-cancel-reason-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.subtitle) {
        <p class="subtitle">{{ data.subtitle }}</p>
      }
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motivo de cancelación</mat-label>
        <textarea matInput rows="3" [(ngModel)]="reason" placeholder="Ej: cliente solicitó reagendar"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(undefined)">{{ data.cancelText || 'Volver' }}</button>
      <button mat-raised-button color="warn" (click)="dialogRef.close(reason || '')">{{ data.confirmText || 'Cancelar cita' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .subtitle { margin: 0 0 12px 0; color: #607d8b; }
    .full-width { width: 100%; }
  `]
})
export class CitaCancelReasonDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<CitaCancelReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CitaCancelReasonDialogData
  ) {}
}

interface CitaDocumentoPdfDialogData {
  title: string;
  loading: boolean;
  error: string | null;
  pdfUrl: SafeResourceUrl | null;
}

@Component({
  selector: 'app-cita-documento-pdf-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>picture_as_pdf</mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content class="pdf-dialog-content">
      @if (data.loading) {
        <div class="pdf-state">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Cargando PDF...</span>
        </div>
      } @else if (data.error) {
        <div class="pdf-state error">
          <mat-icon>error</mat-icon>
          <span>{{ data.error }}</span>
        </div>
      } @else if (data.pdfUrl) {
        <iframe [src]="data.pdfUrl" title="Vista previa PDF"></iframe>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display:flex; align-items:center; gap:8px; }
    .pdf-dialog-content {
      min-height: 65vh;
      padding-top: 8px;
    }
    .pdf-state {
      height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #475569;
    }
    .pdf-state.error mat-icon { color: #dc2626; }
    iframe {
      width: 100%;
      height: 70vh;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
    }
  `]
})
export class CitaDocumentoPdfDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CitaDocumentoPdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CitaDocumentoPdfDialogData
  ) {}

  updateState(partial: Partial<CitaDocumentoPdfDialogData>): void {
    this.data = { ...this.data, ...partial };
  }
}

interface CitaDocumentosListDialogData {
  estadoCita: string;
  documentos: HistoriaClinica[];
  getTipoLabel: (tipo: string) => string;
  formatDate: (fecha: string) => string;
}

@Component({
  selector: 'app-cita-documentos-list-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>folder</mat-icon>
      Documentos de cita
    </h2>
    <mat-dialog-content class="docs-dialog-content">
      @if (!data.documentos.length) {
        <div class="docs-empty">
          <mat-icon>folder_off</mat-icon>
          <span>No hay documentos para esta cita.</span>
        </div>
      } @else {
        <mat-nav-list>
          @for (doc of data.documentos; track doc.id_historia) {
            <button mat-list-item (click)="openPdf(doc.id_historia)">
              <mat-icon matListItemIcon>picture_as_pdf</mat-icon>
              <div matListItemTitle>{{ doc.codigo_historia }}</div>
              <div matListItemLine>{{ data.getTipoLabel(doc.tipo_documento) }} · {{ data.formatDate(doc.fecha) }}</div>
            </button>
          }
        </mat-nav-list>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="docs-dialog-actions">
      @if (data.estadoCita === 'completada' && data.documentos.length) {
        <button mat-stroked-button color="primary" (click)="sendAll()">
          <mat-icon>send</mat-icon>
          Enviar todos
        </button>
      } @else {
        <span></span>
      }
      <button mat-button (click)="dialogRef.close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display:flex; align-items:center; gap:8px; }
    .docs-dialog-content { min-height: 120px; max-height: 52vh; }
    .docs-empty {
      min-height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 8px;
      color: #64748b;
    }
    .docs-dialog-actions {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
  `]
})
export class CitaDocumentosListDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CitaDocumentosListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CitaDocumentosListDialogData
  ) {}

  openPdf(idHistoria: string): void {
    this.dialogRef.close({ action: 'open-pdf', idHistoria });
  }

  sendAll(): void {
    this.dialogRef.close({ action: 'send-all' });
  }
}
