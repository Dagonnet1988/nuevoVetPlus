import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { DashboardService, Notification } from '../../services/dashboard.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <button 
      mat-icon-button 
      [matMenuTriggerFor]="notificationsMenu"
      class="notifications-trigger"
      [matBadge]="unreadCount"
      [matBadgeHidden]="unreadCount === 0"
      matBadgeColor="warn"
      matBadgeSize="small">
      <mat-icon>notifications</mat-icon>
    </button>

    <mat-menu #notificationsMenu="matMenu" class="notifications-menu" xPosition="before">
      <div class="notifications-header" (click)="$event.stopPropagation()">
        <h3>Notificaciones</h3>
        @if (unreadCount > 0) {
          <button mat-button (click)="markAllAsRead()" class="mark-all-read">
            Marcar todas como leídas
          </button>
        }
      </div>

      <mat-divider></mat-divider>

      <div class="notifications-content">
        @if (notifications.length > 0) {
          @for (notification of notifications.slice(0, 10); track notification.id) {
            <div 
              class="notification-item"
              [class.unread]="!notification.leida"
              [class]="'notification-' + notification.tipo"
              (click)="markAsRead(notification.id)">
              
              <div class="notification-icon">
                <mat-icon>{{ getNotificationIcon(notification.tipo) }}</mat-icon>
              </div>
              
              <div class="notification-content">
                <h4 class="notification-title">{{ notification.titulo }}</h4>
                <p class="notification-message">{{ notification.mensaje }}</p>
                <span class="notification-time">{{ getRelativeTime(notification.fecha) }}</span>
              </div>
              
              @if (!notification.leida) {
                <div class="unread-indicator"></div>
              }
            </div>
          }
          
          @if (notifications.length > 10) {
            <div class="more-notifications">
              <span>{{ notifications.length - 10 }} notificaciones más...</span>
            </div>
          }
        } @else {
          <div class="no-notifications">
            <mat-icon>notifications_none</mat-icon>
            <p>No hay notificaciones</p>
          </div>
        }
      </div>

      <mat-divider></mat-divider>

      <div class="notifications-footer" (click)="$event.stopPropagation()">
        <button mat-button class="view-all-btn">
          Ver todas las notificaciones
        </button>
      </div>
    </mat-menu>
  `,
  styles: [`
    .notifications-trigger {
      position: relative;
    }

    ::ng-deep .notifications-menu {
      min-width: 320px;
      max-width: 400px;
    }

    ::ng-deep .notifications-menu .mat-mdc-menu-content {
      padding: 0 !important;
    }

    .notifications-header {
      padding: 16px 20px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .notifications-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .mark-all-read {
      font-size: 12px;
      min-width: auto;
      padding: 4px 8px;
    }

    .notifications-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 20px;
      gap: 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-left: 3px solid transparent;
      position: relative;
    }

    .notification-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .notification-item.unread {
      background-color: rgba(46, 125, 50, 0.02);
    }

    .notification-info {
      border-left-color: #2196f3;
    }

    .notification-warning {
      border-left-color: #ff9800;
    }

    .notification-error {
      border-left-color: #f44336;
    }

    .notification-success {
      border-left-color: #4caf50;
    }

    .notification-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-info .notification-icon {
      background-color: rgba(33, 150, 243, 0.1);
    }

    .notification-info .notification-icon mat-icon {
      color: #2196f3;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-warning .notification-icon {
      background-color: rgba(255, 152, 0, 0.1);
    }

    .notification-warning .notification-icon mat-icon {
      color: #ff9800;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-error .notification-icon {
      background-color: rgba(244, 67, 54, 0.1);
    }

    .notification-error .notification-icon mat-icon {
      color: #f44336;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-success .notification-icon {
      background-color: rgba(76, 175, 80, 0.1);
    }

    .notification-success .notification-icon mat-icon {
      color: #4caf50;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      line-height: 1.2;
    }

    .notification-message {
      margin: 0 0 4px 0;
      font-size: 12px;
      color: #666;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .notification-time {
      font-size: 11px;
      color: #999;
    }

    .unread-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #2e7d32;
      flex-shrink: 0;
      margin-top: 4px;
    }

    .more-notifications {
      padding: 12px 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      font-style: italic;
      background: #f8f9fa;
    }

    .no-notifications {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .no-notifications mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      color: #ddd;
    }

    .no-notifications p {
      margin: 0;
      font-size: 14px;
    }

    .notifications-footer {
      padding: 12px 20px;
      text-align: center;
      background: #f8f9fa;
    }

    .view-all-btn {
      width: 100%;
      font-size: 12px;
      color: #2e7d32;
      font-weight: 500;
    }

    // Dark theme
    .dark-theme .notifications-header {
      background: #2d2d2d;
    }

    .dark-theme .notifications-header h3 {
      color: #fff;
    }

    .dark-theme .notification-item:hover {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .dark-theme .notification-item.unread {
      background-color: rgba(129, 199, 132, 0.02);
    }

    .dark-theme .notification-title {
      color: #fff;
    }

    .dark-theme .notification-message {
      color: #b3b3b3;
    }

    .dark-theme .notification-time {
      color: #666;
    }

    .dark-theme .more-notifications {
      background: #2d2d2d;
      color: #666;
    }

    .dark-theme .notifications-footer {
      background: #2d2d2d;
    }

    .dark-theme .no-notifications {
      color: #666;
    }

    .dark-theme .no-notifications mat-icon {
      color: #444;
    }

    // Responsive
    @media (max-width: 768px) {
      ::ng-deep .notifications-menu {
        min-width: 280px;
      }

      .notification-item {
        padding: 10px 16px;
        gap: 10px;
      }

      .notification-icon {
        width: 28px;
        height: 28px;
      }

      .notification-title {
        font-size: 12px;
      }

      .notification-message {
        font-size: 11px;
      }

      .notifications-header {
        padding: 12px 16px 8px;
      }

      .notifications-footer {
        padding: 8px 16px;
      }
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  private subscription: Subscription = new Subscription();

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription.add(
      this.dashboardService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.updateUnreadCount();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  markAsRead(notificationId: string) {
    this.dashboardService.markNotificationAsRead(notificationId);
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      if (!notification.leida) {
        this.dashboardService.markNotificationAsRead(notification.id);
      }
    });
  }

  getNotificationIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'info': 'info',
      'warning': 'warning',
      'error': 'error',
      'success': 'check_circle'
    };
    return icons[tipo] || 'info';
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

  private updateUnreadCount() {
    this.unreadCount = this.dashboardService.getUnreadNotificationsCount();
  }
}