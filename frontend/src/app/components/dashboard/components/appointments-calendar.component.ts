import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

export interface AppointmentSummary {
  id: string;
  fecha_inicio: string;
  paciente_nombre: string;
  cliente_nombre: string;
  hora: string;
  tipo: string;
  estado: 'confirmada' | 'en_curso' | 'completada' | 'no_asistio';
  veterinario: string;
}

interface AppointmentGroup {
  key: string;
  title: string;
  appointments: AppointmentSummary[];
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    RouterLink
  ],
  templateUrl: './appointments-calendar.component.html',
  styleUrls: ['./appointments-calendar.component.css']
})
export class AppointmentsCalendarComponent {
  @Input() appointments: AppointmentSummary[] = [];

  get groupedAppointments(): AppointmentGroup[] {
    const groups = new Map<string, AppointmentSummary[]>();

    this.appointments.forEach((appointment) => {
      const date = new Date(appointment.fecha_inicio);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = this.toDateKey(date);
      const items = groups.get(key) || [];
      items.push(appointment);
      groups.set(key, items);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, appointments]) => ({
        key,
        title: this.getDayTitle(key),
        appointments
      }));
  }

  canOpenAppointment(appointment: AppointmentSummary): boolean {
    return Boolean(appointment?.id);
  }

  getStatusLabel(status: AppointmentSummary['estado']): string {
    const labels: Record<AppointmentSummary['estado'], string> = {
      confirmada: 'Confirmada',
      en_curso: 'En curso',
      completada: 'Completada',
      no_asistio: 'No asistio'
    };

    return labels[status] || status;
  }

  private getDayTitle(dateKey: string): string {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayKey = this.toDateKey(today);
    const tomorrowKey = this.toDateKey(tomorrow);

    if (dateKey === todayKey) {
      return 'Hoy';
    }

    if (dateKey === tomorrowKey) {
      return 'Mañana';
    }

    const date = new Date(`${dateKey}T00:00:00`);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
