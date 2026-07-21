import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

export interface StatItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  route?: string;
  queryParams?: Record<string, string>;
  category?: string;
}

@Component({
  selector: 'app-stats-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterLink
  ],
  templateUrl: './stats-widget.component.html',
  styleUrls: ['./stats-widget.component.css']
})
export class StatsWidgetComponent {
  @Input() stat!: StatItem;

  formatValue(value: string | number): string {
    if (typeof value === 'number') {
      // Formatear números grandes con separadores de miles
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return value.toLocaleString();
    }
    return value.toString();
  }

  getIconBgColor(): string {
    const colorMap: { [key: string]: string } = {
      'primary': 'rgba(46, 125, 50, 0.1)',
      'success': 'rgba(76, 175, 80, 0.1)',
      'warning': 'rgba(255, 152, 0, 0.1)',
      'error': 'rgba(244, 67, 54, 0.1)',
      'info': 'rgba(33, 150, 243, 0.1)'
    };
    return colorMap[this.stat.color] || colorMap['primary'];
  }

  getIconColor(): string {
    const colorMap: { [key: string]: string } = {
      'primary': '#2e7d32',
      'success': '#4caf50',
      'warning': '#ff9800',
      'error': '#f44336',
      'info': '#2196f3'
    };
    return colorMap[this.stat.color] || colorMap['primary'];
  }
}
