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
  template: `
    <mat-card class="stats-card" [class]="'stats-' + stat.color">
      <mat-card-content class="stats-content">
        <div class="stats-info">
          <div class="stats-header">
            <h3 class="stats-title">{{ stat.title }}</h3>
            <div class="stats-icon" [style.background-color]="getIconBgColor()">
              <mat-icon [style.color]="getIconColor()">{{ stat.icon }}</mat-icon>
            </div>
          </div>
          
          <div class="stats-value">
            <span class="value">{{ formatValue(stat.value) }}</span>
            @if (stat.trend) {
              <div class="trend" [class.positive]="stat.trend.isPositive" [class.negative]="!stat.trend.isPositive">
                <mat-icon>{{ stat.trend.isPositive ? 'trending_up' : 'trending_down' }}</mat-icon>
                <span>{{ stat.trend.value }}%</span>
              </div>
            }
          </div>
          
          @if (stat.subtitle) {
            <p class="stats-subtitle">{{ stat.subtitle }}</p>
          }
        </div>
        
        @if (stat.route) {
          <div class="stats-action">
            <button mat-button [routerLink]="stat.route" class="view-more-btn">
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stats-card {
      height: 100%;
      transition: all 0.3s ease;
      cursor: pointer;
      border-radius: 12px !important;
      overflow: hidden;
    }

    .stats-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
    }

    .stats-content {
      padding: 20px !important;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      height: 100%;
    }

    .stats-info {
      flex: 1;
    }

    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .stats-title {
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin: 0;
      line-height: 1.2;
    }

    .stats-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stats-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .stats-value {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .trend {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 12px;
    }

    .trend.positive {
      color: #4caf50;
      background-color: rgba(76, 175, 80, 0.1);
    }

    .trend.negative {
      color: #f44336;
      background-color: rgba(244, 67, 54, 0.1);
    }

    .trend mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .stats-subtitle {
      font-size: 12px;
      color: #999;
      margin: 0;
      line-height: 1.2;
    }

    .stats-action {
      display: flex;
      align-items: center;
    }

    .view-more-btn {
      min-width: auto !important;
      padding: 8px !important;
      border-radius: 50% !important;
      color: #666;
    }

    .view-more-btn:hover {
      background-color: rgba(0,0,0,0.1);
    }

    // Color variants
    .stats-primary .stats-icon {
      background-color: rgba(46, 125, 50, 0.1);
    }

    .stats-primary .stats-icon mat-icon {
      color: #2e7d32;
    }

    .stats-success .stats-icon {
      background-color: rgba(76, 175, 80, 0.1);
    }

    .stats-success .stats-icon mat-icon {
      color: #4caf50;
    }

    .stats-warning .stats-icon {
      background-color: rgba(255, 152, 0, 0.1);
    }

    .stats-warning .stats-icon mat-icon {
      color: #ff9800;
    }

    .stats-error .stats-icon {
      background-color: rgba(244, 67, 54, 0.1);
    }

    .stats-error .stats-icon mat-icon {
      color: #f44336;
    }

    .stats-info .stats-icon {
      background-color: rgba(33, 150, 243, 0.1);
    }

    .stats-info .stats-icon mat-icon {
      color: #2196f3;
    }

    // Dark theme
    .dark-theme .stats-title {
      color: #b3b3b3;
    }

    .dark-theme .value {
      color: #fff;
    }

    .dark-theme .stats-subtitle {
      color: #666;
    }

    .dark-theme .view-more-btn {
      color: #b3b3b3;
    }

    .dark-theme .view-more-btn:hover {
      background-color: rgba(255,255,255,0.1);
    }

    // Responsive
    @media (max-width: 768px) {
      .stats-content {
        padding: 16px !important;
      }

      .stats-header {
        margin-bottom: 12px;
      }

      .stats-icon {
        width: 36px;
        height: 36px;
      }

      .stats-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .value {
        font-size: 24px;
      }

      .stats-title {
        font-size: 13px;
      }
    }
  `]
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