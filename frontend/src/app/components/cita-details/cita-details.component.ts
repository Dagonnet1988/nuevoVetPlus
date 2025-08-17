import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';

import { CitasService } from '../../services/citas.service';
import { Cita, TIPOS_CITA, ESTADOS_CITA } from '../../models/cita.interface';
import { CitaFormComponent } from '../cita-form/cita-form.component';

@Component({
  selector: 'app-cita-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './cita-details.component.html',
  styleUrl: './cita-details.component.css'
})
export class CitaDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private citasService = inject(CitasService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Callback para notificar al calendario padre sobre cambios
  onStateUpdated?: () => void;

  // Signals
  loading = signal(false);
  cita = signal<Cita | null>(null);
  updating = signal(false);

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

    const confirmMessage = this.getConfirmationMessage(nuevoEstado);
    if (!confirm(confirmMessage)) return;

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

        this.snackBar.open(
          `Estado actualizado a ${this.getEstadoLabel(nuevoEstado)}`,
          'Cerrar',
          { duration: 3000 }
        );

        // Notificar al calendario para que se refresque
        if (this.onStateUpdated) {
          this.onStateUpdated();
        }
      } else {
        throw new Error(response?.message || 'Error actualizando estado');
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      this.snackBar.open('Error actualizando el estado', 'Cerrar', { duration: 3000 });
    } finally {
      this.updating.set(false);
    }
  }

  async onCancel(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.updating()) return;

    const motivo = prompt('Motivo de cancelación (opcional):');

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

  onViewPaciente(): void {
    const cita = this.cita();
    if (cita?.id_mascota) {
      this.router.navigate(['/pacientes', cita.id_mascota]);
    }
  }

  onBack(): void {
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
    const date = this.parseLocalDate(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

    // No se puede editar si está cancelada o completada
    return !['cancelada', 'completada'].includes(cita.estado);
  }

  canCancelCita(): boolean {
    const cita = this.cita();
    if (!cita) return false;

    // Solo se puede cancelar si no está ya cancelada o completada
    return !['cancelada', 'completada'].includes(cita.estado);
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
      'pendiente': ['confirmada', 'cancelada'],
      'confirmada': ['en_progreso', 'cancelada', 'no_asistio'],
      'en_progreso': ['completada', 'cancelada'],
      'completada': [], // No se puede cambiar desde completada
      'cancelada': [], // No se puede cambiar desde cancelada
      'no_asistio': ['pendiente'] // Se puede reprogramar
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
      case 'en_progreso':
        return `¿Marcar como en progreso la cita de ${cita?.mascota?.nombre}?`;
      case 'completada':
        return `¿Marcar como completada la cita de ${cita?.mascota?.nombre}?`;
      case 'no_asistio':
        return `¿Marcar que ${cita?.mascota?.nombre} no asistió a la cita?`;
      default:
        return `¿Cambiar el estado a ${estadoLabel}?`;
    }
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
      'pendiente': 'schedule',
      'confirmada': 'check_circle',
      'en_progreso': 'play_circle',
      'completada': 'task_alt',
      'cancelada': 'cancel',
      'no_asistio': 'event_busy'
    };
    return icons[estado] || 'radio_button_unchecked';
  }

  private transformarCitaParaTemplate(citaData: any): Cita {
    console.log('🔄 Transformando cita para template:', citaData);

    // Crear estructura anidada a partir de campos planos
    const citaTransformada: Cita = {
      ...citaData,
      // Estructura anidada para mascota
      mascota: {
        nombre: citaData.mascota_nombre || 'Sin nombre',
        especie: citaData.especie || citaData.mascota_especie || 'No especificado',
        raza: citaData.raza || citaData.mascota_raza,
        cliente: {
          nombre: citaData.cliente_nombre || 'Sin nombre',
          telefono: citaData.cliente_telefono,
          email: citaData.cliente_email
        }
      },
      // Estructura anidada para veterinario
      veterinario: {
        nombre: citaData.veterinario_nombre || 'Sin asignar',
        especialidad: citaData.veterinario_especialidad,
        email: citaData.veterinario_email
      }
    };

    console.log('✅ Cita transformada:', {
      mascota_nombre: citaTransformada.mascota?.nombre,
      cliente_nombre: citaTransformada.mascota?.cliente?.nombre,
      veterinario_nombre: citaTransformada.veterinario?.nombre
    });

    return citaTransformada;
  }
}
