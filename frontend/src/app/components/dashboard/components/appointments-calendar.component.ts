import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterLink } from '@angular/router';

export interface AppointmentSummary {
  id: string;
  paciente_nombre: string;
  cliente_nombre: string;
  hora: string;
  tipo: string;
  estado: 'confirmada' | 'pendiente' | 'cancelada';
  veterinario: string;
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatBadgeModule,
    RouterLink
  ],
  templateUrl: './appointments-calendar.component.html',
  styleUrls: ['./appointments-calendar.component.css']
})
export class AppointmentsCalendarComponent {
  @Input() appointments: AppointmentSummary[] = [];

  getTotalAppointments(): number {
    return this.appointments.length;
  }

  getAppointmentsByStatus(status: string): number {
    return this.appointments.filter(apt => apt.estado === status).length;
  }
}