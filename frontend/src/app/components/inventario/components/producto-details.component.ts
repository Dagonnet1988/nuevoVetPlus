import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';

import { ProductosService, Producto, MovimientoInventario } from '../../../services/productos.service';

@Component({
  selector: 'app-producto-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTableModule,
    MatBadgeModule
  ],
  template: `
    <div class="producto-details-container">
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando producto...</p>
        </div>
      } @else if (producto()) {
        <!-- Header -->
        <div class="details-header">
          <div class="header-content">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="title-section">
              <h1 class="details-title">
                <mat-icon class="title-icon">inventory</mat-icon>
                {{ producto()!.nombre }}
              </h1>
              <p class="details-subtitle">{{ producto()!.codigo }}</p>
            </div>
            <div class="actions-section">
              <button mat-stroked-button (click)="generarCodigoBarras()">
                <mat-icon>qr_code</mat-icon>
                Código de Barras
              </button>
              <button mat-raised-button 
                      color="primary" 
                      (click)="editarProducto()">
                <mat-icon>edit</mat-icon>
                Editar
              </button>
              <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionsMenu="matMenu">
                <button mat-menu-item (click)="duplicarProducto()">
                  <mat-icon>content_copy</mat-icon>
                  Duplicar
                </button>
                <button mat-menu-item (click)="ajustarStock()">
                  <mat-icon>tune</mat-icon>
                  Ajustar Stock
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="eliminarProducto()" class="delete-item">
                  <mat-icon>block</mat-icon>
                  Desactivar
                </button>
              </mat-menu>
            </div>
          </div>
        </div>

        <!-- Cards de estado -->
        <div class="status-cards">
          <mat-card class="status-card stock-card">
            <mat-card-content>
              <div class="status-content">
                <mat-icon class="status-icon" 
                          [class.stock-bajo]="estaEnStockBajo()"
                          [class.stock-critico]="producto()!.stock_actual === 0">
                  inventory_2
                </mat-icon>
                <div class="status-info">
                  <span class="status-number">{{ producto()!.stock_actual }}</span>
                  <span class="status-label">{{ producto()!.unidad_medida }}</span>
                  <span class="status-detail">Stock Actual</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="status-card value-card">
            <mat-card-content>
              <div class="status-content">
                <mat-icon class="status-icon">attach_money</mat-icon>
                <div class="status-info">
                  <span class="status-number">{{ formatearPrecio(calcularValorStock()) }}</span>
                  <span class="status-label">Valor en Stock</span>
                  <span class="status-detail">{{ producto()!.stock_actual }} × {{ formatearPrecio(producto()!.precio_compra || 0) }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="status-card margin-card">
            <mat-card-content>
              <div class="status-content">
                <mat-icon class="status-icon">trending_up</mat-icon>
                <div class="status-info">
                  <span class="status-number">{{ calcularMargen() }}%</span>
                  <span class="status-label">Margen</span>
                  <span class="status-detail">{{ formatearPrecio(producto()!.precio_venta - (producto()!.precio_compra || 0)) }} de utilidad</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="status-card estado-card">
            <mat-card-content>
              <div class="status-content">
                <mat-icon class="status-icon">{{ producto()!.activo ? 'check_circle' : 'cancel' }}</mat-icon>
                <div class="status-info">
                  <mat-chip [style.background-color]="producto()!.activo ? '#4caf50' : '#f44336'"
                            [style.color]="'white'">
                    {{ producto()!.activo ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                  <span class="status-detail">Estado del producto</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Contenido principal en tabs -->
        <mat-card class="content-card">
          <mat-card-content>
            <mat-tab-group>
              <!-- Tab: Información general -->
              <mat-tab label="Información General">
                <div class="tab-content">
                  <div class="info-grid">
                    <div class="info-section">
                      <h4><mat-icon>category</mat-icon> Categoría</h4>
                      <p>{{ producto()!.categoria }}</p>
                      @if (false) {
                        <small></small>
                      }
                    </div>
                    
                    <div class="info-section">
                      <h4><mat-icon>label</mat-icon> Tipo</h4>
                      <p>{{ getTipoLabel(producto()!.tipo) }}</p>
                    </div>

                    <div class="info-section">
                      <h4><mat-icon>business</mat-icon> Marca</h4>
                      <p>{{ producto()!.marca || 'Sin marca' }}</p>
                    </div>

                    @if (producto()!.ubicacion) {
                      <div class="info-section">
                        <h4><mat-icon>place</mat-icon> Ubicación</h4>
                        <p>{{ producto()!.ubicacion }}</p>
                      </div>
                    }
                  </div>

                  @if (producto()!.descripcion) {
                    <mat-divider></mat-divider>
                    <div class="content-section">
                      <h4><mat-icon>description</mat-icon> Descripción</h4>
                      <div class="content-text">
                        {{ producto()!.descripcion }}
                      </div>
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Tab: Precios y Stock -->
              <mat-tab label="Precios y Stock">
                <div class="tab-content">
                  <div class="prices-grid">
                    <div class="price-card compra">
                      <mat-icon>shopping_cart</mat-icon>
                      <div class="price-info">
                        <span class="price-label">Precio de Compra</span>
                        <span class="price-value">{{ formatearPrecio(producto()!.precio_compra || 0) }}</span>
                      </div>
                    </div>

                    <div class="price-card venta">
                      <mat-icon>sell</mat-icon>
                      <div class="price-info">
                        <span class="price-label">Precio de Venta</span>
                        <span class="price-value">{{ formatearPrecio(producto()!.precio_venta) }}</span>
                      </div>
                    </div>

                    <div class="price-card iva">
                      <mat-icon>receipt</mat-icon>
                      <div class="price-info">
                        <span class="price-label">IVA Aplicable</span>
                        <span class="price-value">{{ producto()!.iva_aplicable }}%</span>
                      </div>
                    </div>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="stock-section">
                    <h4><mat-icon>inventory</mat-icon> Control de Stock</h4>
                    <div class="stock-grid">
                      <div class="stock-item">
                        <span class="stock-label">Stock Actual</span>
                        <span class="stock-value actual" 
                              [class.stock-bajo]="estaEnStockBajo()"
                              [class.stock-critico]="producto()!.stock_actual === 0">
                          {{ producto()!.stock_actual }} {{ producto()!.unidad_medida }}
                        </span>
                      </div>
                      
                      <div class="stock-item">
                        <span class="stock-label">Stock Mínimo</span>
                        <span class="stock-value minimo">{{ producto()!.stock_minimo }} {{ producto()!.unidad_medida }}</span>
                      </div>
                      
                      <div class="stock-item">
                        <span class="stock-label">Stock Máximo</span>
                        <span class="stock-value maximo">{{ producto()!.stock_maximo || 'No definido' }}</span>
                      </div>
                    </div>

                    @if (estaEnStockBajo()) {
                      <div class="stock-alert">
                        <mat-icon>warning</mat-icon>
                        <span>¡Stock bajo! Se recomienda realizar una compra.</span>
                      </div>
                    }
                  </div>

                  @if (producto()!.lote || producto()!.fecha_vencimiento) {
                    <mat-divider></mat-divider>
                    <div class="batch-section">
                      <h4><mat-icon>batch_prediction</mat-icon> Información de Lote</h4>
                      <div class="batch-grid">
                        @if (producto()!.lote) {
                          <div class="batch-item">
                            <span class="batch-label">Número de Lote</span>
                            <span class="batch-value">{{ producto()!.lote }}</span>
                          </div>
                        }
                        
                        @if (producto()!.fecha_vencimiento) {
                          <div class="batch-item">
                            <span class="batch-label">Fecha de Vencimiento</span>
                            <span class="batch-value vencimiento"
                                  [class.vencimiento-proximo]="diasParaVencer() <= 30"
                                  [class.vencimiento-critico]="diasParaVencer() <= 7">
                              {{ formatearFecha(producto()!.fecha_vencimiento!) }}
                              @if (diasParaVencer() > 0) {
                                <small>({{ diasParaVencer() }} días)</small>
                              } @else {
                                <small class="vencido">¡VENCIDO!</small>
                              }
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Tab: Movimientos -->
              <mat-tab label="Movimientos" [matBadge]="movimientos().length" matBadgeColor="primary">
                <div class="tab-content">
                  @if (loadingMovimientos()) {
                    <div class="loading-container">
                      <mat-spinner diameter="30"></mat-spinner>
                      <p>Cargando movimientos...</p>
                    </div>
                  } @else if (movimientos().length > 0) {
                    <div class="movimientos-table">
                      <table mat-table [dataSource]="movimientos()" class="movimientos-data">
                        
                        <!-- Columna Fecha -->
                        <ng-container matColumnDef="fecha">
                          <th mat-header-cell *matHeaderCellDef>Fecha</th>
                          <td mat-cell *matCellDef="let movimiento">
                            {{ formatearFecha(movimiento.fecha_movimiento) }}
                          </td>
                        </ng-container>

                        <!-- Columna Tipo -->
                        <ng-container matColumnDef="tipo">
                          <th mat-header-cell *matHeaderCellDef>Tipo</th>
                          <td mat-cell *matCellDef="let movimiento">
                            <mat-chip [style.background-color]="getTipoMovimientoColor(movimiento.tipo_movimiento)"
                                      [style.color]="'white'"
                                      class="tipo-chip">
                              {{ getTipoMovimientoLabel(movimiento.tipo_movimiento) }}
                            </mat-chip>
                          </td>
                        </ng-container>

                        <!-- Columna Cantidad -->
                        <ng-container matColumnDef="cantidad">
                          <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                          <td mat-cell *matCellDef="let movimiento">
                            <span [class.positivo]="movimiento.tipo_movimiento === 'entrada'"
                                  [class.negativo]="movimiento.tipo_movimiento === 'salida'">
                              {{ movimiento.tipo_movimiento === 'entrada' ? '+' : '-' }}{{ movimiento.cantidad }}
                            </span>
                          </td>
                        </ng-container>

                        <!-- Columna Stock -->
                        <ng-container matColumnDef="stock">
                          <th mat-header-cell *matHeaderCellDef>Stock Resultante</th>
                          <td mat-cell *matCellDef="let movimiento">
                            {{ movimiento.stock_nuevo }}
                          </td>
                        </ng-container>

                        <!-- Columna Motivo -->
                        <ng-container matColumnDef="motivo">
                          <th mat-header-cell *matHeaderCellDef>Motivo</th>
                          <td mat-cell *matCellDef="let movimiento">
                            {{ movimiento.motivo }}
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="movimientosColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: movimientosColumns;"></tr>
                      </table>
                    </div>
                  } @else {
                    <div class="no-movements">
                      <mat-icon>swap_horiz</mat-icon>
                      <h3>Sin movimientos</h3>
                      <p>No hay movimientos registrados para este producto</p>
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Tab: Configuración -->
              <mat-tab label="Configuración">
                <div class="tab-content">
                  <div class="config-grid">
                    <div class="config-item">
                      <mat-icon>{{ producto()!.requiere_receta ? 'medical_services' : 'no_encryption' }}</mat-icon>
                      <div class="config-info">
                        <span class="config-label">Requiere Receta</span>
                        <span class="config-value">{{ producto()!.requiere_receta ? 'Sí' : 'No' }}</span>
                      </div>
                    </div>

                    <div class="config-item">
                      <mat-icon>schedule</mat-icon>
                      <div class="config-info">
                        <span class="config-label">Fecha de Creación</span>
                        <span class="config-value">{{ formatearFecha(producto()!.created_at) }}</span>
                      </div>
                    </div>

                    <div class="config-item">
                      <mat-icon>update</mat-icon>
                      <div class="config-info">
                        <span class="config-label">Última Actualización</span>
                        <span class="config-value">{{ formatearFecha(producto()!.updated_at) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="error-container">
          <mat-icon>error_outline</mat-icon>
          <h3>Producto no encontrado</h3>
          <p>El producto solicitado no existe o no tienes permisos para verlo.</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            Volver al inventario
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .producto-details-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    .details-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      background: rgba(25, 118, 210, 0.1);
      color: #1976d2;
    }

    .title-section {
      flex: 1;
    }

    .details-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 500;
      color: #1976d2;
    }

    .title-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .details-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
      font-family: 'Courier New', monospace;
    }

    .actions-section {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .delete-item {
      color: #f44336 !important;
    }

    /* Status cards */
    .status-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .status-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .status-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      padding: 8px;
      border-radius: 50%;
      background: rgba(25, 118, 210, 0.1);
      color: #1976d2;
    }

    .status-icon.stock-bajo {
      background: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }

    .status-icon.stock-critico {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }

    .status-info {
      display: flex;
      flex-direction: column;
    }

    .status-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .status-label {
      font-size: 14px;
      font-weight: 500;
      color: #666;
    }

    .status-detail {
      font-size: 12px;
      color: #999;
    }

    /* Content card */
    .content-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 24px 0;
    }

    /* Info sections */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .info-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: #1976d2;
    }

    .info-section p {
      margin: 0;
      color: #333;
      font-size: 14px;
    }

    .info-section small {
      color: #666;
      font-size: 12px;
    }

    .content-section {
      margin: 24px 0;
    }

    .content-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #1976d2;
    }

    .content-text {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
      line-height: 1.6;
    }

    /* Prices */
    .prices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .price-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #ddd;
    }

    .price-card.compra {
      border-left-color: #2196f3;
    }

    .price-card.venta {
      border-left-color: #4caf50;
    }

    .price-card.iva {
      border-left-color: #ff9800;
    }

    .price-info {
      display: flex;
      flex-direction: column;
    }

    .price-label {
      font-size: 12px;
      color: #666;
    }

    .price-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    /* Stock */
    .stock-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #1976d2;
    }

    .stock-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .stock-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stock-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .stock-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .stock-value.stock-bajo {
      color: #ff9800;
    }

    .stock-value.stock-critico {
      color: #f44336;
    }

    .stock-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid #ff9800;
      border-radius: 8px;
      color: #f57c00;
    }

    /* Batch */
    .batch-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #1976d2;
    }

    .batch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .batch-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .batch-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .batch-value {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .batch-value.vencimiento-proximo {
      color: #ff9800;
    }

    .batch-value.vencimiento-critico {
      color: #f44336;
    }

    .vencido {
      color: #f44336;
      font-weight: 600;
    }

    /* Movimientos */
    .movimientos-data {
      width: 100%;
    }

    .tipo-chip {
      font-size: 12px;
    }

    .positivo {
      color: #4caf50;
      font-weight: 600;
    }

    .negativo {
      color: #f44336;
      font-weight: 600;
    }

    .no-movements {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: #666;
    }

    .no-movements mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    /* Config */
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .config-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .config-info {
      display: flex;
      flex-direction: column;
    }

    .config-label {
      font-size: 12px;
      color: #666;
    }

    .config-value {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    /* Loading and error */
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .error-container mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      margin-bottom: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .producto-details-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .details-title {
        font-size: 24px;
      }

      .status-cards {
        grid-template-columns: 1fr;
      }

      .info-grid,
      .prices-grid,
      .stock-grid,
      .batch-grid,
      .config-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductoDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private productosService = inject(ProductosService);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  loadingMovimientos = signal(false);
  producto = signal<Producto | null>(null);
  movimientos = signal<MovimientoInventario[]>([]);

  // Configuración de tabla de movimientos
  movimientosColumns = ['fecha', 'tipo', 'cantidad', 'stock', 'motivo'];

  // Tipos de producto
  tiposProducto = [
    { value: 'medicamento', label: 'Medicamento' },
    { value: 'alimento', label: 'Alimento' },
    { value: 'accesorio', label: 'Accesorio' },
    { value: 'servicio', label: 'Servicio' },
    { value: 'suministro', label: 'Suministro' }
  ];

  ngOnInit(): void {
    const productoId = this.route.snapshot.paramMap.get('id');
    if (productoId) {
      this.loadProducto(productoId);
      this.loadMovimientos(productoId);
    }
  }

  private loadProducto(id: string): void {
    this.loading.set(true);
    this.productosService.getProducto(id).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando producto:', error);
        this.snackBar.open('Error cargando producto', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private loadMovimientos(productoId: string): void {
    this.loadingMovimientos.set(true);
    this.productosService.getMovimientosByProducto(productoId).subscribe({
      next: (movimientos) => {
        this.movimientos.set(Array.isArray(movimientos) ? movimientos : []);
        this.loadingMovimientos.set(false);
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        this.movimientos.set([]);
        this.loadingMovimientos.set(false);
      }
    });
  }

  // Utilidades
  formatearPrecio(precio: number): string {
    return this.productosService.formatearPrecio(precio);
  }

  estaEnStockBajo(): boolean {
    const producto = this.producto();
    return producto ? this.productosService.estaEnStockBajo(producto) : false;
  }

  calcularMargen(): number {
    const producto = this.producto();
    if (!producto) return 0;
    return this.productosService.calcularMargenGanancia(producto.precio_compra || 0, producto.precio_venta);
  }

  calcularValorStock(): number {
    const producto = this.producto();
    return producto ? this.productosService.calcularValorStock(producto) : 0;
  }

  diasParaVencer(): number {
    const producto = this.producto();
    return producto?.fecha_vencimiento ? this.productosService.diasParaVencer(producto.fecha_vencimiento) : 0;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposProducto.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  }

  getTipoMovimientoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'entrada': 'Entrada',
      'salida': 'Salida',
      'ajuste': 'Ajuste',
      'venta': 'Venta',
      'devolucion': 'Devolución'
    };
    return labels[tipo] || tipo;
  }

  getTipoMovimientoColor(tipo: string): string {
    const colors: Record<string, string> = {
      'entrada': '#4caf50',
      'salida': '#f44336',
      'ajuste': '#ff9800',
      'venta': '#2196f3',
      'devolucion': '#9c27b0'
    };
    return colors[tipo] || '#666';
  }

  // Acciones
  goBack(): void {
    this.router.navigate(['/inventario']);
  }

  editarProducto(): void {
    this.router.navigate(['/inventario/productos', this.producto()!.id_producto, 'editar']);
  }

  duplicarProducto(): void {
    const producto = this.producto();
    if (!producto) return;

    this.router.navigate(['/inventario/productos/nuevo'], {
      queryParams: { duplicate: producto.id_producto }
    });
  }

  ajustarStock(): void {
    // Implementar diálogo de ajuste de stock
    this.snackBar.open('Función de ajuste de stock en desarrollo', 'Cerrar', { duration: 3000 });
  }

  generarCodigoBarras(): void {
    const producto = this.producto();
    if (!producto) return;

    this.productosService.generarCodigoBarras(producto.id_producto).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-barras-${producto.codigo}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generando código de barras:', error);
        this.snackBar.open('Error generando código de barras', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarProducto(): void {
    const producto = this.producto();
    if (!producto) return;

    if (confirm(`¿Estás seguro de desactivar el producto ${producto.nombre}?`)) {
      this.productosService.deleteProducto(producto.id_producto).subscribe({
        next: () => {
          this.snackBar.open('Producto desactivado exitosamente', 'Cerrar', { duration: 3000 });
          this.goBack();
        },
        error: (error) => {
          console.error('Error eliminando producto:', error);
          this.snackBar.open('Error eliminando producto', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }
}