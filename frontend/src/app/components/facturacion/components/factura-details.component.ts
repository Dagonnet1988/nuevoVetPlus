import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { 
  FacturacionService, 
  Factura, 
  LineaFactura 
} from '../../../services/facturacion.service';

@Component({
  selector: 'app-factura-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    MatMenuModule,
    MatDialogModule
  ],
  template: `
    <div class="factura-details-container">
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando detalles de la factura...</p>
        </div>
      } @else if (factura()) {
        <!-- Header -->
        <div class="details-header">
          <div class="header-content">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="title-section">
              <h1 class="details-title">
                <mat-icon class="title-icon">receipt</mat-icon>
                Factura {{ factura()!.codigo_factura }}
              </h1>
              <p class="details-subtitle">Detalles completos de la factura</p>
            </div>
            <div class="actions-section">
              <button mat-icon-button [matMenuTriggerFor]="actionsMenu" class="menu-button">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionsMenu="matMenu">
                <button mat-menu-item (click)="editarFactura()">
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
                <button mat-menu-item (click)="exportarPDF()">
                  <mat-icon>print</mat-icon>
                  Exportar PDF
                </button>
                <button mat-menu-item (click)="enviarWhatsApp()">
                  <mat-icon>send</mat-icon>
                  Enviar por WhatsApp
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item 
                        (click)="cambiarEstado()"
                        [disabled]="factura()!.estado === 'Cancelada'">
                  <mat-icon>swap_horiz</mat-icon>
                  Cambiar Estado
                </button>
                <button mat-menu-item 
                        (click)="cancelarFactura()"
                        [disabled]="factura()!.estado === 'Cancelada'"
                        class="danger-item">
                  <mat-icon>cancel</mat-icon>
                  Cancelar Factura
                </button>
              </mat-menu>
            </div>
          </div>
        </div>

        <!-- Contenido principal -->
        <div class="details-content">
          <div class="content-layout">
            
            <!-- Información principal -->
            <mat-card class="info-card main-info">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>info</mat-icon>
                  Información General
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Código:</span>
                    <span class="info-value codigo">{{ factura()!.codigo_factura }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">{{ formatearFecha(factura()!.fecha) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Estado:</span>
                    <mat-chip [style.background-color]="getEstadoColor(factura()!.estado)"
                              [style.color]="'white'">
                      {{ factura()!.estado }}
                    </mat-chip>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Método de Pago:</span>
                    <mat-chip [style.background-color]="getMetodoColor(factura()!.metodo_pago)"
                              [style.color]="'white'">
                      <mat-icon>{{ getMetodoIcon(factura()!.metodo_pago) }}</mat-icon>
                      {{ factura()!.metodo_pago }}
                    </mat-chip>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Información del cliente -->
            <mat-card class="info-card client-info">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>person</mat-icon>
                  Información del Cliente
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (factura()!.cliente) {
                  <div class="client-details">
                    <div class="client-item">
                      <mat-icon class="client-icon">person</mat-icon>
                      <div class="client-text">
                        <span class="client-name">{{ factura()!.cliente!.nombre }}</span>
                        <span class="client-doc">{{ factura()!.cliente!.documento }}</span>
                      </div>
                    </div>
                    @if (factura()!.cliente!.telefono) {
                      <div class="client-item">
                        <mat-icon class="client-icon">phone</mat-icon>
                        <span class="client-contact">{{ factura()!.cliente!.telefono }}</span>
                      </div>
                    }
                    @if (factura()!.cliente!.email) {
                      <div class="client-item">
                        <mat-icon class="client-icon">email</mat-icon>
                        <span class="client-contact">{{ factura()!.cliente!.email }}</span>
                      </div>
                    }
                    @if (factura()!.cliente!.direccion) {
                      <div class="client-item">
                        <mat-icon class="client-icon">location_on</mat-icon>
                        <span class="client-contact">{{ factura()!.cliente!.direccion }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="no-client">
                    <mat-icon>person_outline</mat-icon>
                    <span>Cliente General</span>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- Totales -->
            <mat-card class="info-card totals-info">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>calculate</mat-icon>
                  Totales
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="totals-summary">
                  <div class="total-row">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-value">{{ formatearMoneda(factura()!.subtotal) }}</span>
                  </div>
                  <div class="total-row">
                    <span class="total-label">Descuento:</span>
                    <span class="total-value discount">{{ formatearMoneda(factura()!.descuento) }}</span>
                  </div>
                  <div class="total-row">
                    <span class="total-label">Impuestos:</span>
                    <span class="total-value">{{ formatearMoneda(factura()!.impuestos) }}</span>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="total-row final-total">
                    <span class="total-label">TOTAL:</span>
                    <span class="total-value">{{ formatearMoneda(factura()!.total) }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Tab de productos/servicios -->
          <mat-card class="products-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>shopping_cart</mat-icon>
                Productos y Servicios ({{ factura()!.lineas.length }})
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="products-table-container">
                <table mat-table [dataSource]="factura()!.lineas" class="products-table">
                  
                  <ng-container matColumnDef="producto">
                    <th mat-header-cell *matHeaderCellDef>Producto/Servicio</th>
                    <td mat-cell *matCellDef="let linea">
                      <div class="product-info">
                        <span class="product-name">{{ linea.producto?.nombre }}</span>
                        <span class="product-code">{{ linea.producto?.codigo }}</span>
                        @if (linea.producto?.descripcion) {
                          <span class="product-description">{{ linea.producto.descripcion }}</span>
                        }
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="categoria">
                    <th mat-header-cell *matHeaderCellDef>Categoría</th>
                    <td mat-cell *matCellDef="let linea">
                      <mat-chip class="category-chip">{{ linea.producto?.categoria }}</mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cantidad">
                    <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                    <td mat-cell *matCellDef="let linea">
                      <div class="quantity-info">
                        <span class="quantity-value">{{ linea.cantidad }}</span>
                        <span class="quantity-unit">{{ linea.producto?.unidad_medida || 'unidad' }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="precio_unitario">
                    <th mat-header-cell *matHeaderCellDef>Precio Unit.</th>
                    <td mat-cell *matCellDef="let linea">
                      <span class="price-value">{{ formatearMoneda(linea.precio_unitario) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="descuento">
                    <th mat-header-cell *matHeaderCellDef>Descuento</th>
                    <td mat-cell *matCellDef="let linea">
                      @if (linea.descuento > 0) {
                        <span class="discount-value">{{ linea.descuento }}%</span>
                      } @else {
                        <span class="no-discount">-</span>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="subtotal">
                    <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                    <td mat-cell *matCellDef="let linea">
                      <span class="subtotal-value">{{ formatearMoneda(linea.subtotal) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Notas adicionales -->
          @if (factura()!.notas) {
            <mat-card class="notes-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>note</mat-icon>
                  Notas Adicionales
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p class="notes-text">{{ factura()!.notas }}</p>
              </mat-card-content>
            </mat-card>
          }
        </div>
      } @else {
        <div class="error-container">
          <mat-icon class="error-icon">error_outline</mat-icon>
          <h2>Factura no encontrada</h2>
          <p>La factura solicitada no existe o ha sido eliminada.</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Volver
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './factura-details.component.css'
})
export class FacturaDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(true);
  factura = signal<Factura | null>(null);

  // Table configuration
  displayedColumns = ['producto', 'categoria', 'cantidad', 'precio_unitario', 'descuento', 'subtotal'];

  ngOnInit(): void {
    const facturaId = this.route.snapshot.paramMap.get('id');
    if (facturaId) {
      this.loadFactura(facturaId);
    } else {
      this.loading.set(false);
    }
  }

  private loadFactura(id: string): void {
    this.loading.set(true);
    this.facturacionService.getFactura(id).subscribe({
      next: (factura) => {
        this.factura.set(factura);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando factura:', error);
        this.factura.set(null);
        this.loading.set(false);
        this.snackBar.open('Error cargando factura', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Actions
  editarFactura(): void {
    if (this.factura()) {
      this.router.navigate(['/facturacion', this.factura()!.id_factura, 'editar']);
    }
  }

  exportarPDF(): void {
    if (!this.factura()) return;

    this.facturacionService.exportarFactura(this.factura()!.id_factura, 'pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${this.factura()!.codigo_factura}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exportando factura:', error);
        this.snackBar.open('Error exportando factura', 'Cerrar', { duration: 3000 });
      }
    });
  }

  enviarWhatsApp(): void {
    if (!this.factura()?.cliente?.telefono) {
      this.snackBar.open('El cliente no tiene teléfono registrado', 'Cerrar', { duration: 3000 });
      return;
    }

    this.facturacionService.enviarFacturaPorWhatsApp(
      this.factura()!.id_factura, 
      this.factura()!.cliente!.telefono!
    ).subscribe({
      next: () => {
        this.snackBar.open('Factura enviada por WhatsApp', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error enviando por WhatsApp:', error);
        this.snackBar.open('Error enviando por WhatsApp', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cambiarEstado(): void {
    // Implementar modal para cambiar estado
    this.snackBar.open('Función de cambio de estado en desarrollo', 'Cerrar', { duration: 2000 });
  }

  cancelarFactura(): void {
    if (!this.factura()) return;

    if (confirm(`¿Estás seguro de cancelar la factura ${this.factura()!.codigo_factura}?`)) {
      this.facturacionService.cancelarFactura(this.factura()!.id_factura).subscribe({
        next: () => {
          this.snackBar.open('Factura cancelada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadFactura(this.factura()!.id_factura);
        },
        error: (error) => {
          console.error('Error cancelando factura:', error);
          this.snackBar.open('Error cancelando factura', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  // Utility methods
  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Pagada': return '#4caf50';
      case 'Pendiente': return '#ff9800';
      case 'Cancelada': return '#f44336';
      default: return '#666';
    }
  }

  getMetodoColor(metodo: string): string {
    switch (metodo) {
      case 'Efectivo': return '#4caf50';
      case 'Tarjeta': return '#2196f3';
      case 'Transferencia': return '#9c27b0';
      case 'Cheque': return '#ff9800';
      default: return '#666';
    }
  }

  getMetodoIcon(metodo: string): string {
    switch (metodo) {
      case 'Efectivo': return 'paid';
      case 'Tarjeta': return 'credit_card';
      case 'Transferencia': return 'account_balance';
      case 'Cheque': return 'payment';
      default: return 'payment';
    }
  }

  goBack(): void {
    this.router.navigate(['/facturacion']);
  }
}