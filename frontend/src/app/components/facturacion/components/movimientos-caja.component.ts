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
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';

import { 
  FacturacionService, 
  MovimientoCaja,
  Caja 
} from '../../../services/facturacion.service';

@Component({
  selector: 'app-movimientos-caja',
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
    MatPaginatorModule
  ],
  template: `
    <div class="movimientos-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1 class="page-title">
              <mat-icon class="page-icon">history</mat-icon>
              Movimientos de Caja
            </h1>
            @if (caja()) {
              <p class="page-subtitle">{{ caja()!.nombre }} - Saldo actual: {{ formatearMoneda(caja()!.saldo_actual) }}</p>
            }
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando movimientos...</p>
        </div>
      } @else {
        <!-- Tabla de movimientos -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>receipt_long</mat-icon>
              Historial de Movimientos
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (movimientos().length > 0) {
              <div class="table-container">
                <table mat-table [dataSource]="movimientos()" class="movimientos-table">
                  
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha</th>
                    <td mat-cell *matCellDef="let movimiento">
                      {{ formatearFecha(movimiento.fecha) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="tipo">
                    <th mat-header-cell *matHeaderCellDef>Tipo</th>
                    <td mat-cell *matCellDef="let movimiento">
                      <mat-chip [style.background-color]="getTipoColor(movimiento.tipo)"
                                [style.color]="'white'">
                        <mat-icon>{{ getTipoIcon(movimiento.tipo) }}</mat-icon>
                        {{ movimiento.tipo }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="concepto">
                    <th mat-header-cell *matHeaderCellDef>Concepto</th>
                    <td mat-cell *matCellDef="let movimiento">
                      <div class="concepto-info">
                        <span class="concepto-text">{{ movimiento.concepto }}</span>
                        @if (movimiento.referencia) {
                          <span class="referencia">Ref: {{ movimiento.referencia }}</span>
                        }
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="metodo_pago">
                    <th mat-header-cell *matHeaderCellDef>Método</th>
                    <td mat-cell *matCellDef="let movimiento">
                      {{ movimiento.metodo_pago }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="monto">
                    <th mat-header-cell *matHeaderCellDef>Monto</th>
                    <td mat-cell *matCellDef="let movimiento">
                      <span [class]="'monto-' + movimiento.tipo.toLowerCase()">
                        {{ movimiento.tipo === 'Ingreso' ? '+' : '-' }}{{ formatearMoneda(movimiento.monto) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="saldo">
                    <th mat-header-cell *matHeaderCellDef>Saldo</th>
                    <td mat-cell *matCellDef="let movimiento">
                      <span class="saldo-value">{{ formatearMoneda(movimiento.saldo_nuevo) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </div>
              
              <mat-paginator 
                [length]="totalMovimientos"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 25, 50, 100]"
                (page)="onPageChange($event)"
                showFirstLastButtons>
              </mat-paginator>
            } @else {
              <div class="no-data">
                <mat-icon>history</mat-icon>
                <h3>No hay movimientos</h3>
                <p>No se encontraron movimientos para esta caja</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .movimientos-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background-color: #fafafa;
      min-height: calc(100vh - 64px);
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #1976d2, #42a5f5);
      padding: 24px;
      border-radius: 16px;
      color: white;
      box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
    }

    .back-button {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(10px);
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .title-section {
      flex: 1;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .page-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .page-subtitle {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
      font-weight: 300;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100px 20px;
      gap: 20px;
    }

    .loading-container p {
      margin: 0;
      color: #666;
      font-size: 16px;
      font-weight: 500;
    }

    .table-card {
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      background: white;
      overflow: hidden;
    }

    .table-card .mat-mdc-card-header {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      border-bottom: 1px solid #dee2e6;
      padding: 20px 24px;
    }

    .table-card .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #495057;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }

    .table-container {
      overflow-x: auto;
    }

    .movimientos-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .movimientos-table .mat-mdc-header-row {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      border-bottom: 2px solid #dee2e6;
    }

    .movimientos-table .mat-mdc-header-cell {
      font-weight: 600;
      color: #495057;
      border-bottom: none;
      padding: 16px 12px;
      font-size: 14px;
    }

    .movimientos-table .mat-mdc-row {
      transition: all 0.2s ease;
      border-bottom: 1px solid #f0f0f0;
    }

    .movimientos-table .mat-mdc-row:hover {
      background-color: #f8f9ff;
    }

    .movimientos-table .mat-mdc-cell {
      padding: 16px 12px;
      border-bottom: none;
      font-size: 14px;
    }

    .concepto-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .concepto-text {
      font-weight: 500;
      color: #333;
    }

    .referencia {
      font-size: 12px;
      color: #666;
      font-family: 'Courier New', monospace;
    }

    .monto-ingreso {
      color: #4caf50;
      font-weight: 600;
    }

    .monto-egreso {
      color: #f44336;
      font-weight: 600;
    }

    .saldo-value {
      color: #2e7d32;
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
    }

    .mat-mdc-chip {
      border-radius: 16px !important;
      font-weight: 500;
      font-size: 12px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .no-data {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .no-data mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .no-data h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 500;
    }

    .no-data p {
      margin: 0;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .movimientos-container {
        padding: 16px;
      }
      
      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
        padding: 20px;
      }
      
      .page-title {
        font-size: 28px;
      }
      
      .movimientos-table .mat-mdc-cell,
      .movimientos-table .mat-mdc-header-cell {
        padding: 12px 8px;
        font-size: 12px;
      }
    }
  `]
})
export class MovimientosCajaComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private facturacionService = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(true);
  caja = signal<Caja | null>(null);
  movimientos = signal<MovimientoCaja[]>([]);
  totalMovimientos = 0;
  pageSize = 25;

  // Table configuration
  displayedColumns = ['fecha', 'tipo', 'concepto', 'metodo_pago', 'monto', 'saldo'];

  ngOnInit(): void {
    const cajaId = this.route.snapshot.paramMap.get('id');
    if (cajaId) {
      this.loadCaja(cajaId);
      this.loadMovimientos(cajaId);
    } else {
      this.loading.set(false);
    }
  }

  private loadCaja(id: string): void {
    this.facturacionService.getCajas().subscribe({
      next: (cajas) => {
        const caja = cajas.find(c => c.id_caja === id);
        this.caja.set(caja || null);
      },
      error: (error) => {
        console.error('Error cargando caja:', error);
      }
    });
  }

  private loadMovimientos(cajaId: string, page: number = 1): void {
    this.loading.set(true);
    this.facturacionService.getMovimientosCaja(cajaId, page, this.pageSize).subscribe({
      next: (response) => {
        this.movimientos.set(response.data?.movimientos || []);
        this.totalMovimientos = response.data?.pagination?.total || 0;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        this.movimientos.set([]);
        this.loading.set(false);
        this.snackBar.open('Error cargando movimientos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onPageChange(event: any): void {
    const cajaId = this.route.snapshot.paramMap.get('id');
    if (cajaId) {
      this.loadMovimientos(cajaId, event.pageIndex + 1);
    }
  }

  formatearMoneda(valor: number): string {
    return this.facturacionService.formatearMoneda(valor);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTipoColor(tipo: string): string {
    return tipo === 'Ingreso' ? '#4caf50' : '#f44336';
  }

  getTipoIcon(tipo: string): string {
    return tipo === 'Ingreso' ? 'arrow_downward' : 'arrow_upward';
  }

  goBack(): void {
    this.router.navigate(['/facturacion']);
  }
}