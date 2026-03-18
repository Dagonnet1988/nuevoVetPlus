import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { RecentActivity } from '../../../services/dashboard.service';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterLink
  ],
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.css']
})
export class RecentActivityComponent {
  @Input() activities: RecentActivity[] = [];

  getIconBgColor(color: string): string {
    // Convertir color hex a rgba con opacidad 0.1
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }

  getTypeLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'cita': 'Cita',
      'paciente': 'Paciente'
    };
    return labels[tipo] || tipo;
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Ahora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  }
}
