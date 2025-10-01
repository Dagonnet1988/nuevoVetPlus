import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Router } from '@angular/router';
import { ConfiguracionService, GoogleCalendarConfig, GoogleCalendarStatus, SyncStats } from '../../../services/configuracion.service';
import { CitasService } from '../../../services/citas.service';
import { SyncDialogComponent } from '../../citas/sync-dialog.component';

@Component({
  selector: 'app-google-calendar-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule,
    MatSelectModule,
    MatDialogModule,
    MatDatepickerModule
  ],
  template: `
    <div class="google-calendar-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="page-title">
                <mat-icon class="page-icon" style="color: #4285f4;">event</mat-icon>
                Google Calendar
              </h1>
              <p class="page-subtitle">Sincronización automática de citas con Google Calendar</p>
            </div>
          </div>

          <div class="header-actions">
            @if (status().conectado) {
              <mat-chip class="status-chip connected">
                <mat-icon>check_circle</mat-icon>
                Conectado
              </mat-chip>
            } @else {
              <mat-chip class="status-chip disconnected">
                <mat-icon>error</mat-icon>
                Desconectado
              </mat-chip>
            }
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-card class="config-card">
        <mat-tab-group>
          <!-- Tab 1: Configuración -->
          <mat-tab label="Configuración">
            <div class="tab-content">
              @if (loading()) {
                <div class="loading-container">
                  <mat-spinner></mat-spinner>
                  <p>Cargando configuración...</p>
                </div>
              } @else {
                <form [formGroup]="configForm" class="config-form">
                  <!-- Estado general -->
                  <div class="section">
                    <h3>Estado de la Integración</h3>
                    <div class="toggle-section">
                      <mat-slide-toggle formControlName="activo" color="primary">
                        Habilitar integración con Google Calendar
                      </mat-slide-toggle>
                      <p class="help-text">Permite sincronizar automáticamente las citas con tu calendario de Google</p>
                    </div>
                  </div>

                  @if (configForm.value.activo) {
                    <mat-divider></mat-divider>

                    <!-- Configuración OAuth -->
                    <div class="section">
                      <h3>Configuración OAuth 2.0</h3>
                      <div class="form-row">
                        <mat-form-field appearance="outline" class="form-field">
                          <mat-label>Client ID *</mat-label>
                          <input matInput formControlName="cliente_id" placeholder="12345678-abcdefgh.apps.googleusercontent.com">
                          <mat-icon matSuffix>key</mat-icon>
                          <mat-error *ngIf="configForm.get('cliente_id')?.hasError('required')">Client ID es requerido</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="form-field">
                          <mat-label>Client Secret *</mat-label>
                          <input matInput type="password" formControlName="cliente_secret" placeholder="GOCSPX-xxxxxxxxxxxxx">
                          <mat-icon matSuffix>lock</mat-icon>
                          <mat-error *ngIf="configForm.get('cliente_secret')?.hasError('required')">Client Secret es requerido</mat-error>
                        </mat-form-field>
                      </div>

                      <mat-form-field appearance="outline" class="form-field-full">
                        <mat-label>ID del Calendario *</mat-label>
                        <input matInput formControlName="calendar_id" placeholder="primary">
                        <mat-icon matSuffix>calendar_today</mat-icon>
                        <mat-hint>Usar 'primary' para el calendario principal</mat-hint>
                        <mat-error *ngIf="configForm.get('calendar_id')?.hasError('required')">ID del calendario es requerido</mat-error>
                      </mat-form-field>

                      @if (status().conectado) {
                        <div class="oauth-actions">
                          <button mat-raised-button color="warn" (click)="disconnectGoogle()" [disabled]="disconnecting()">
                            @if (disconnecting()) {
                              <mat-spinner diameter="20"></mat-spinner>
                            } @else {
                              <mat-icon>logout</mat-icon>
                            }
                            Desconectar Google Calendar
                          </button>
                          <p class="help-text">Desconecta la integración con Google Calendar. Podrás reconectar en cualquier momento.</p>
                        </div>
                      } @else {
                        <div class="oauth-actions">
                          <button mat-raised-button color="primary" (click)="initializeOAuth()" [disabled]="oauthLoading()">
                            @if (oauthLoading()) {
                              <mat-spinner diameter="20"></mat-spinner>
                            } @else {
                              <mat-icon>login</mat-icon>
                            }
                            Autorizar con Google
                          </button>
                          <p class="help-text">Debes autorizar la aplicación para acceder a tu calendario de Google</p>
                        </div>
                      }
                    </div>

                    <mat-divider></mat-divider>

                    <!-- Acciones de Sincronización -->
                    @if (status().conectado || (configForm.value.cliente_id && configForm.value.cliente_secret)) {
                      <div class="section">
                        <h3>Acciones de Sincronización</h3>
                        <div class="sync-actions">
                          <button mat-raised-button color="accent" (click)="syncNow()" [disabled]="syncing()" class="sync-button">
                            @if (syncing()) {
                              <mat-spinner diameter="20"></mat-spinner>
                            } @else {
                              <mat-icon>sync</mat-icon>
                            }
                            Sincronizar Ahora
                          </button>

                          <button mat-raised-button color="primary" (click)="openAdvancedSyncDialog()" [disabled]="syncing()" class="sync-button">
                            @if (syncing()) {
                              <mat-spinner diameter="20"></mat-spinner>
                            } @else {
                              <mat-icon>sync_alt</mat-icon>
                            }
                            Sincronización Completa
                          </button>
                        </div>
                        <p class="help-text">
                          <strong>Sincronizar Ahora:</strong> Sincroniza cambios recientes<br>
                          <strong>Sincronización Completa:</strong> Sincronización bidireccional con opciones avanzadas
                        </p>
                      </div>

                      <mat-divider></mat-divider>
                    }

                    <!-- Configuración de sincronización -->
                    <div class="section">
                      <h3>Sincronización</h3>
                      <div class="form-row">
                        <div class="toggle-field">
                          <mat-slide-toggle formControlName="sync_automatico" color="primary">
                            Sincronización automática
                          </mat-slide-toggle>
                        </div>

                        @if (configForm.value.sync_automatico) {
                          <mat-form-field appearance="outline" class="form-field">
                            <mat-label>Intervalo (minutos)</mat-label>
                            <mat-select formControlName="intervalo_sync">
                              <mat-option value="5">5 minutos</mat-option>
                              <mat-option value="15">15 minutos</mat-option>
                              <mat-option value="30">30 minutos</mat-option>
                              <mat-option value="60">1 hora</mat-option>
                            </mat-select>
                          </mat-form-field>
                        }
                      </div>

                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Prefijo de eventos</mat-label>
                        <input matInput formControlName="prefijo_eventos" placeholder="VetPlus">
                        <mat-hint>Texto que se agregará al inicio de cada evento</mat-hint>
                      </mat-form-field>
                    </div>

                    <mat-divider></mat-divider>

                    <!-- Configuración de eventos -->
                    <div class="section">
                      <h3>Configuración de Eventos</h3>
                      <div class="form-row">
                        <mat-form-field appearance="outline" class="form-field">
                          <mat-label>Duración por defecto (minutos)</mat-label>
                          <mat-select formControlName="duracion_default">
                            <mat-option value="15">15 minutos</mat-option>
                            <mat-option value="30">30 minutos</mat-option>
                            <mat-option value="45">45 minutos</mat-option>
                            <mat-option value="60">1 hora</mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="form-field">
                          <mat-label>Recordatorio (minutos antes)</mat-label>
                          <mat-select formControlName="recordatorio_default">
                            <mat-option value="15">15 minutos</mat-option>
                            <mat-option value="30">30 minutos</mat-option>
                            <mat-option value="60">1 hora</mat-option>
                            <mat-option value="1440">1 día</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>

                      <h4>Información incluida en eventos</h4>
                      <div class="checkbox-group">
                        <mat-slide-toggle formControlName="incluir_cliente" color="primary">
                          Incluir información del cliente
                        </mat-slide-toggle>
                        <mat-slide-toggle formControlName="incluir_mascota" color="primary">
                          Incluir información de la mascota
                        </mat-slide-toggle>
                        <mat-slide-toggle formControlName="incluir_veterinario" color="primary">
                          Incluir nombre del veterinario
                        </mat-slide-toggle>
                      </div>
                    </div>

                    <mat-divider></mat-divider>

                    <!-- Colores por tipo de cita -->
                    <div class="section">
                      <h3>Colores por Tipo de Cita</h3>
                      <div class="color-config">
                        <div class="color-item">
                          <span>Consulta:</span>
                          <input type="color" formControlName="color_consulta" class="color-picker">
                        </div>
                        <div class="color-item">
                          <span>Cirugía:</span>
                          <input type="color" formControlName="color_cirugia" class="color-picker">
                        </div>
                        <div class="color-item">
                          <span>Vacunación:</span>
                          <input type="color" formControlName="color_vacunacion" class="color-picker">
                        </div>
                        <div class="color-item">
                          <span>Control:</span>
                          <input type="color" formControlName="color_control" class="color-picker">
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Botones de acción -->
                  <div class="form-actions">
                    <button mat-raised-button color="primary" (click)="saveConfigurationWrapper()" [disabled]="loading() || (configForm.value.activo && configForm.invalid)">
                      @if (loading()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>save</mat-icon>
                      }
                      Guardar Configuración
                    </button>
                  </div>
                </form>
              }
            </div>
          </mat-tab>

          <!-- Tab 2: Estado y Estadísticas -->
          <mat-tab label="Estado">
            <div class="tab-content">
              @if (status().conectado) {
                <div class="status-section">
                  <h3>Estado de la Conexión</h3>
                  <div class="status-grid">
                    <div class="status-item">
                      <mat-icon class="status-icon connected">check_circle</mat-icon>
                      <div>
                        <strong>Conectado</strong>
                        <p>Calendario: {{ status().calendario_info.nombre || 'Principal' }}</p>
                      </div>
                    </div>

                    <div class="status-item">
                      <mat-icon class="status-icon">schedule</mat-icon>
                      <div>
                        <strong>Última sincronización</strong>
                        <p>{{ status().ultimo_sync ? (status().ultimo_sync | date:'dd/MM/yyyy HH:mm') : 'Nunca' }}</p>
                      </div>
                    </div>

                    <div class="status-item">
                      <mat-icon class="status-icon">event</mat-icon>
                      <div>
                        <strong>Eventos sincronizados</strong>
                        <p>{{ status().eventos_sincronizados || 0 }}</p>
                      </div>
                    </div>
                  </div>

                  @if (syncStats()) {
                    <mat-divider></mat-divider>
                    <h3>Estadísticas de Sincronización</h3>
                    <div class="stats-grid">
                      <div class="stat-card">
                        <span class="stat-number">{{ syncStats()?.total_eventos || 0 }}</span>
                        <span class="stat-label">Total Eventos</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-number">{{ syncStats()?.eventos_creados || 0 }}</span>
                        <span class="stat-label">Creados</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-number">{{ syncStats()?.eventos_actualizados || 0 }}</span>
                        <span class="stat-label">Actualizados</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-number">{{ syncStats()?.errores || 0 }}</span>
                        <span class="stat-label">Errores</span>
                      </div>
                    </div>
                  }

                  @if (status().errores_recientes && status().errores_recientes.length > 0) {
                    <mat-divider></mat-divider>
                    <h3>Errores Recientes</h3>
                    <div class="errors-section">
                      @for (error of status().errores_recientes; track error) {
                        <div class="error-item">
                          <mat-icon class="error-icon">error</mat-icon>
                          <span>{{ error }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <div class="disconnected-state">
                  <mat-icon class="disconnected-icon">cloud_off</mat-icon>
                  <h3>No Conectado</h3>
                  <p>Para usar la integración con Google Calendar, primero debes configurar y autorizar la conexión.</p>
                  <button mat-raised-button color="primary" (click)="initializeOAuth()" [disabled]="!configForm.value.activo">
                    <mat-icon>login</mat-icon>
                    Conectar con Google
                  </button>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .google-calendar-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 500;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .status-chip {
      font-weight: 500;
    }

    .connected {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .disconnected {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .config-card {
      margin-bottom: 24px;
    }

    .tab-content {
      padding: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
    }

    .config-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section h3 {
      margin: 0;
      color: #333;
      font-weight: 500;
    }

    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-field {
      flex: 1;
      min-width: 250px;
    }

    .form-field-full {
      width: 100%;
    }

    .toggle-section, .toggle-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .help-text {
      font-size: 14px;
      color: #666;
      margin: 0;
    }

    .sync-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin: 16px 0;
    }

    .sync-button {
      min-width: 200px;
      height: 48px;
      font-weight: 500;
    }

    .oauth-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .color-config {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .color-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .color-picker {
      width: 40px;
      height: 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid #ddd;
    }

    .status-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .status-icon {
      font-size: 24px;
    }

    .status-icon.connected {
      color: #4caf50;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #1976d2;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
    }

    .errors-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .error-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background-color: #ffebee;
      border-radius: 4px;
    }

    .error-icon {
      color: #d32f2f;
    }

    .disconnected-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
      text-align: center;
    }

    .disconnected-icon {
      font-size: 64px;
      color: #ccc;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }

      .status-grid, .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GoogleCalendarConfigComponent implements OnInit {
  loading = signal(false);
  oauthLoading = signal(false);
  syncing = signal(false);
  disconnecting = signal(false);

  config = signal<GoogleCalendarConfig | null>(null);
  status = signal<GoogleCalendarStatus>({
    conectado: false,
    ultimo_sync: '',
    eventos_sincronizados: 0,
    errores_recientes: [],
    calendario_info: {
      nombre: '',
      descripcion: '',
      zona_horaria: ''
    }
  });
  syncStats = signal<SyncStats | null>(null);

  configForm: FormGroup;

  // Listeners para comunicación cross-origin
  private storageListener: (event: StorageEvent) => void;
  private messageListener: (event: MessageEvent) => void;

  constructor(
    private fb: FormBuilder,
    private configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private citasService: CitasService
  ) {
    this.configForm = this.createForm();

    // Inicializar listeners
    this.storageListener = this.handleStorageEvent.bind(this);
    this.messageListener = this.handleMessageEvent.bind(this);
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadStatus();
    this.loadStats();

    // Configurar validadores condicionales
    this.setupConditionalValidators();

    // Configurar listeners para comunicación cross-origin
    this.setupStorageListeners();
    this.setupMessageListeners();
  }

  ngOnDestroy(): void {
    // Limpiar listeners
    window.removeEventListener('storage', this.storageListener);
    window.removeEventListener('message', this.messageListener);
  }

  private setupConditionalValidators(): void {
    // Cuando el toggle "activo" cambia, actualizar validadores
    this.configForm.get('activo')?.valueChanges.subscribe(activo => {
      this.updateValidators(activo);
    });

    // Inicializar validadores según el estado actual
    this.updateValidators(this.configForm.get('activo')?.value);
  }

  private updateValidators(activo: boolean): void {
    const clienteIdControl = this.configForm.get('cliente_id');
    const clienteSecretControl = this.configForm.get('cliente_secret');
    const calendarIdControl = this.configForm.get('calendar_id');

    if (activo) {
      clienteIdControl?.setValidators([Validators.required]);
      clienteSecretControl?.setValidators([Validators.required]);
      calendarIdControl?.setValidators([Validators.required]);
    } else {
      clienteIdControl?.clearValidators();
      clienteSecretControl?.clearValidators();
      calendarIdControl?.clearValidators();
    }

    clienteIdControl?.updateValueAndValidity();
    clienteSecretControl?.updateValueAndValidity();
    calendarIdControl?.updateValueAndValidity();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      activo: [false],
      cliente_id: [''],
      cliente_secret: [''],
      calendar_id: ['primary'],
      sync_automatico: [true],
      intervalo_sync: [30, [Validators.min(5)]],
      prefijo_eventos: ['VetPlus'],
      duracion_default: [30, [Validators.min(15)]],
      recordatorio_default: [30, [Validators.min(5)]],
      incluir_cliente: [true],
      incluir_mascota: [true],
      incluir_veterinario: [true],
      color_consulta: ['#2196f3'],
      color_cirugia: ['#f44336'],
      color_vacunacion: ['#4caf50'],
      color_control: ['#ff9800']
    });
  }

  private loadConfiguration(): void {
    this.loading.set(true);

    this.configuracionService.getGoogleCalendarConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.populateForm(config);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
        this.loading.set(false);
      }
    });
  }

  private loadStatus(): void {
    console.log('Cargando estado de Google Calendar...');
    this.configuracionService.getGoogleCalendarStatus().subscribe({
      next: (status) => {
        console.log('Estado cargado:', status);
        this.status.set(status);
      },
      error: (error) => {
        console.error('Error cargando estado:', error);
      }
    });
  }

  private loadStats(): void {
    this.configuracionService.getSchedulerStats().subscribe({
      next: (stats) => {
        this.syncStats.set(stats);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
      }
    });
  }

  private populateForm(config: GoogleCalendarConfig): void {
    this.configForm.patchValue({
      activo: config.activo,
      cliente_id: config.cliente_id,
      cliente_secret: config.cliente_secret,
      calendar_id: config.calendar_id,
      sync_automatico: config.sync_automatico,
      intervalo_sync: config.intervalo_sync,
      prefijo_eventos: config.prefijo_eventos,
      duracion_default: config.configuracion_eventos?.duracion_default || 30,
      recordatorio_default: config.configuracion_eventos?.recordatorio_default || 30,
      incluir_cliente: config.configuracion_eventos?.incluir_cliente ?? true,
      incluir_mascota: config.configuracion_eventos?.incluir_mascota ?? true,
      incluir_veterinario: config.configuracion_eventos?.incluir_veterinario ?? true,
      color_consulta: config.mapeo_colores?.consulta || '#2196f3',
      color_cirugia: config.mapeo_colores?.cirugia || '#f44336',
      color_vacunacion: config.mapeo_colores?.vacunacion || '#4caf50',
      color_control: config.mapeo_colores?.control || '#ff9800'
    });
  }

  saveConfiguration(): Promise<void> {
    if (this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return Promise.reject('Formulario inválido');
    }

    this.loading.set(true);
    const formValue = this.configForm.value;

    const config: GoogleCalendarConfig = {
      activo: formValue.activo,
      cliente_id: formValue.cliente_id,
      cliente_secret: formValue.cliente_secret,
      calendar_id: formValue.calendar_id,
      sync_automatico: formValue.sync_automatico,
      intervalo_sync: formValue.intervalo_sync,
      prefijo_eventos: formValue.prefijo_eventos,
      mapeo_colores: {
        consulta: formValue.color_consulta,
        cirugia: formValue.color_cirugia,
        vacunacion: formValue.color_vacunacion,
        control: formValue.color_control
      },
      configuracion_eventos: {
        duracion_default: formValue.duracion_default,
        recordatorio_default: formValue.recordatorio_default,
        incluir_cliente: formValue.incluir_cliente,
        incluir_mascota: formValue.incluir_mascota,
        incluir_veterinario: formValue.incluir_veterinario
      }
    };

    return new Promise<void>((resolve, reject) => {
      this.configuracionService.updateGoogleCalendarConfig(config).subscribe({
        next: () => {
          this.snackBar.open('Configuración guardada exitosamente', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
          this.loadStatus();
          resolve();
        },
        error: (error) => {
          console.error('Error guardando configuración:', error);
          this.snackBar.open('Error guardando configuración', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
          reject(error);
        }
      });
    });
  }

  initializeOAuth(): void {
    if (!this.configForm.value.cliente_id || !this.configForm.value.cliente_secret) {
      this.snackBar.open('Primero debes configurar Client ID y Client Secret', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.oauthLoading.set(true);

    // Primero guardar la configuración
    this.saveConfiguration().then(() => {
      // Después de guardar exitosamente, proceder con OAuth
      this.configuracionService.getGoogleOAuthUrl().subscribe({
        next: (oauthUrl) => {
          console.log('🔗 URL de OAuth obtenida:', oauthUrl);

          // Intentar abrir popup con mejores parámetros para evitar bloqueos
          const left = (screen.width / 2) - (500 / 2);
          const top = (screen.height / 2) - (600 / 2);

          const popup = window.open(
            oauthUrl,
            'google-oauth',
            `width=500,height=600,left=${left},top=${top},scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no`
          );

          // Verificar si el popup fue bloqueado
          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            this.oauthLoading.set(false);
            console.warn('⚠️ Popup bloqueado por el navegador');

            // Mostrar diálogo de confirmación para abrir en nueva pestaña
            const confirmResult = confirm(
              'El navegador bloqueó la ventana emergente de autorización.\n\n' +
              '¿Deseas abrir la autorización en una nueva pestaña?\n\n' +
              'Nota: Después de autorizar, regresa a esta pestaña para continuar.'
            );

            if (confirmResult) {
              const newTab = window.open(oauthUrl, '_blank');
              if (!newTab) {
                this.snackBar.open('❌ No se pudo abrir la autorización. Verifica la configuración del navegador.', 'Cerrar', { duration: 5000 });
              } else {
                this.snackBar.open('📋 Autorización abierta en nueva pestaña. Regresa aquí después de autorizar.', 'Cerrar', { duration: 8000 });
                // Configurar listener para cuando regrese
                this.setupTabReturnListener();
              }
            }
            return;
          }

          console.log('✅ Popup abierto correctamente');
          this.oauthLoading.set(false);

          // Escuchar mensajes de la ventana popup
          const messageListener = (event: MessageEvent) => {
            // Filtrar mensajes de Angular DevTools y otros no relacionados
            if (!event.data || typeof event.data !== 'object') {
              return;
            }

            // Ignorar mensajes de Angular DevTools
            if (event.data.source && event.data.source.includes('angular-devtools')) {
              return;
            }

            // Ignorar mensajes de detección de Angular
            if (event.data.isAngular || event.data.isIvy || event.data.topic) {
              return;
            }

            // Solo procesar mensajes específicos de Google Calendar
            if (event.data.type !== 'google-calendar-success' && event.data.type !== 'google-calendar-error') {
              return;
            }

            console.log('📩 Mensaje de Google Calendar recibido:', event.data, 'desde:', event.origin);

            // Verificar origen por seguridad
            if (event.origin !== window.location.origin) {
              console.warn('⚠️ Origen no válido:', event.origin, 'esperado:', window.location.origin);
              return;
            }

            if (event.data && (event.data.type === 'google-calendar-success' || event.data.type === 'google-calendar-error')) {
              window.removeEventListener('message', messageListener);

              if (event.data.type === 'google-calendar-success') {
                // Mostrar información detallada del éxito
                const message = event.data.testResult?.success
                  ? '✅ Google Calendar configurado y conexión verificada exitosamente'
                  : '⚠️ Google Calendar configurado pero con advertencias en la conexión';

                this.snackBar.open(message, 'Cerrar', {
                  duration: 5000,
                  panelClass: event.data.testResult?.success ? ['success-snackbar'] : ['warning-snackbar']
                });

                console.log('OAuth exitoso:', event.data);
                if (popup && !popup.closed) {
                  popup.close();
                }
              } else if (event.data.type === 'google-calendar-error') {
                // Mostrar error detallado
                this.snackBar.open(
                  `❌ Error en autorización: ${event.data.error || 'Error desconocido'}`,
                  'Cerrar',
                  { duration: 7000, panelClass: ['error-snackbar'] }
                );

                console.error('OAuth error:', event.data);
                if (popup && !popup.closed) {
                  popup.close();
                }
              }

              // Recargar estado y configuración
              this.loadStatus();
              this.loadConfiguration();
            }
          };

          window.addEventListener('message', messageListener);

          // Verificar si la ventana se cierra manualmente
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', messageListener);
              console.log('🔒 Popup cerrado manualmente, verificando estado...');
              // Dar un pequeño delay para permitir procesamiento
              setTimeout(() => {
                this.loadStatus();
              }, 1000);
            }
          }, 1000);

          // Timeout de seguridad (5 minutos)
          setTimeout(() => {
            if (popup && !popup.closed) {
              console.log('⏰ Timeout de autorización alcanzado');
              popup.close();
              clearInterval(checkClosed);
              window.removeEventListener('message', messageListener);
            }
          }, 300000);
        },
        error: (error) => {
          console.error('Error iniciando OAuth:', error);
          this.snackBar.open('Error iniciando autorización', 'Cerrar', { duration: 3000 });
          this.oauthLoading.set(false);
        }
      });
    }).catch((error) => {
      console.error('Error guardando configuración:', error);
      this.snackBar.open('Error guardando configuración antes de OAuth', 'Cerrar', { duration: 3000 });
      this.oauthLoading.set(false);
    });
  }

  private setupTabReturnListener(): void {
    // Configurar listener para detectar cuando el usuario regresa de la autorización
    const focusListener = () => {
      console.log('🔄 Usuario regresó a la pestaña, verificando estado...');
      setTimeout(() => {
        this.loadStatus();
        this.loadConfiguration();
      }, 1000);
    };

    window.addEventListener('focus', focusListener);

    // Remover listener después de 10 minutos
    setTimeout(() => {
      window.removeEventListener('focus', focusListener);
    }, 600000);
  }

  disconnectGoogle(): void {
    const confirmed = confirm(
      '¿Estás seguro de desconectar Google Calendar?\n\n' +
      'Esto eliminará la conexión actual y tendrás que autorizar nuevamente.\n' +
      'Los datos locales no se verán afectados.'
    );

    if (!confirmed) {
      return;
    }

    this.disconnecting.set(true);

    this.configuracionService.disableGoogleCalendar().subscribe({
      next: () => {
        this.snackBar.open('Google Calendar desconectado exitosamente', 'Cerrar', { duration: 3000 });
        this.disconnecting.set(false);
        this.loadStatus();
        this.loadConfiguration();
      },
      error: (error) => {
        console.error('Error desconectando Google Calendar:', error);
        this.snackBar.open('Error desconectando Google Calendar', 'Cerrar', { duration: 3000 });
        this.disconnecting.set(false);
      }
    });
  }

  syncNow(): void {
    this.syncing.set(true);

    this.configuracionService.syncGoogleCalendar().subscribe({
      next: () => {
        this.snackBar.open('Sincronización completada', 'Cerrar', { duration: 3000 });
        this.syncing.set(false);
        this.loadStatus();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error en sincronización:', error);
        this.snackBar.open('Error en sincronización', 'Cerrar', { duration: 3000 });
        this.syncing.set(false);
      }
    });
  }

  saveConfigurationWrapper(): void {
    this.saveConfiguration().catch(error => {
      // Error ya manejado en saveConfiguration
    });
  }

  // ===============================
  // SINCRONIZACIÓN BIDIRECCIONAL COMPLETA
  // ===============================

  openAdvancedSyncDialog(): void {
    const dialogRef = this.dialog.open(SyncDialogComponent, {
      width: '500px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeBidirectionalSync(result);
      }
    });
  }

  private executeBidirectionalSync(options: any): void {
    this.syncing.set(true);
    let completedSteps = 0;
    const totalSteps = this.getTotalSteps(options);

    console.log('🚀 Iniciando sincronización bidireccional completa:', options);

    // Paso 1: Sincronizar cambios locales hacia Google (si está habilitado)
    if (options.syncToGoogle) {
      this.citasService.forceSyncAllPending().subscribe({
        next: () => {
          completedSteps++;
          console.log(`✅ Paso 1/${totalSteps}: Cambios locales sincronizados hacia Google`);
          this.executeNextStep(options, completedSteps, totalSteps);
        },
        error: (error) => {
          this.handleSyncError('Error sincronizando cambios locales', error);
        }
      });
    } else {
      this.executeNextStep(options, completedSteps, totalSteps);
    }
  }

  private executeNextStep(options: any, completedSteps: number, totalSteps: number): void {
    // Paso 2: Importar desde Google (si está habilitado)
    if (options.importFromGoogle && completedSteps === (options.syncToGoogle ? 1 : 0)) {
      this.importFromGoogle(options, completedSteps, totalSteps);
      return;
    }

    // Paso 3: Sincronizar cambios existentes (si está habilitado)
    if (options.syncChanges && completedSteps === totalSteps - 1) {
      this.syncChangesFromGoogle(completedSteps, totalSteps);
      return;
    }

    // Si no hay más pasos, completar
    this.completeSyncProcess(completedSteps, totalSteps);
  }

  private getTotalSteps(options: any): number {
    let steps = 0;
    if (options.syncToGoogle) steps++;
    if (options.importFromGoogle) steps++;
    if (options.syncChanges) steps++;
    return steps;
  }

  private importFromGoogle(options: any, completedSteps: number, totalSteps: number): void {
    const fechaInicio = options.fechaInicio || this.getStartOfMonth();
    const fechaFin = options.fechaFin || this.getEndOfMonth();

    this.citasService.importFromGoogleCalendar(fechaInicio, fechaFin, {
      autoMatch: options.autoMatch,
      createMissingData: options.createMissingData,
      dryRun: options.dryRun
    }).subscribe({
      next: (result) => {
        completedSteps++;
        console.log(`✅ Paso ${completedSteps}/${totalSteps}: Importación desde Google completada:`, result);
        this.executeNextStep(options, completedSteps, totalSteps);
      },
      error: (error) => {
        this.handleSyncError('Error importando desde Google Calendar', error);
      }
    });
  }

  private syncChangesFromGoogle(completedSteps: number, totalSteps: number): void {
    this.citasService.syncChangesFromGoogle().subscribe({
      next: (result) => {
        completedSteps++;
        console.log(`✅ Paso ${completedSteps}/${totalSteps}: Sincronización de cambios completada:`, result);
        this.completeSyncProcess(completedSteps, totalSteps, result);
      },
      error: (error) => {
        this.handleSyncError('Error sincronizando cambios desde Google', error);
      }
    });
  }

  private completeSyncProcess(completedSteps: number, totalSteps: number, lastResult?: any): void {
    this.syncing.set(false);

    const processedChanges = lastResult?.data?.processed || 0;
    const message = totalSteps > 1
      ? `Sincronización completa: ${completedSteps}/${totalSteps} pasos ejecutados`
      : `Sincronización completada: ${processedChanges} cambios procesados`;

    this.snackBar.open(message, 'Cerrar', { duration: 4000 });

    // Recargar estado y estadísticas
    this.loadStatus();
    this.loadStats();
  }

  private handleSyncError(message: string, error: any): void {
    this.syncing.set(false);
    console.error(message + ':', error);

    let userMessage = message;
    if (error.status === 404) {
      userMessage = 'Servicio de sincronización no disponible';
    } else if (error.status === 401) {
      userMessage = 'No tienes permisos para sincronizar';
    } else if (error.status === 500) {
      userMessage = 'Error interno del servidor de sincronización';
    } else if (error.status === 0) {
      userMessage = 'No se puede conectar con el servidor';
    }

    this.snackBar.open(userMessage, 'Cerrar', { duration: 5000 });
  }

  private getStartOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  private getEndOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  goBack(): void {
    this.router.navigate(['/configuracion']);
  }

  // ===============================
  // COMUNICACIÓN CROSS-ORIGIN
  // ===============================

  private setupStorageListeners(): void {
    console.log('🔧 Configurando listener de storage para Google Calendar');
    window.addEventListener('storage', this.storageListener);
  }

  private setupMessageListeners(): void {
    console.log('🔧 Configurando listener de mensajes para Google Calendar');
    window.addEventListener('message', this.messageListener);
  }

  private handleStorageEvent(event: StorageEvent): void {
    // Solo procesar cambios en las claves específicas de Google Calendar
    if (event.key === 'vetplus-google-auth-success' && event.newValue) {
      console.log('📦 Recibido evento de storage:', event.key, event.newValue);

      try {
        const data = JSON.parse(event.newValue);
        if (data.success) {
          this.handleAuthSuccess(data);
        }
      } catch (error) {
        console.error('❌ Error procesando datos de storage:', error);
      }

      // Limpiar el storage después de procesar
      localStorage.removeItem('vetplus-google-auth-success');
      sessionStorage.removeItem('vetplus-google-auth-success');
    }
  }

  private handleMessageEvent(event: MessageEvent): void {
    // Filtrar mensajes de Angular DevTools y otros no relacionados
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    // Ignorar mensajes de Angular DevTools
    if (event.data.source && event.data.source.includes('angular-devtools')) {
      return;
    }

    // Ignorar mensajes de detección de Angular
    if (event.data.isAngular || event.data.isIvy || event.data.topic) {
      return;
    }

    // Solo procesar mensajes específicos de Google Calendar
    if (event.data.type !== 'google-calendar-success' && event.data.type !== 'google-calendar-error') {
      return;
    }

    console.log('📩 Mensaje de Google Calendar recibido:', event.data, 'desde:', event.origin);

    // Verificar origen por seguridad
    if (event.origin !== window.location.origin) {
      console.warn('⚠️ Origen no válido:', event.origin, 'esperado:', window.location.origin);
      return;
    }

    if (event.data.type === 'google-calendar-success') {
      this.handleAuthSuccess(event.data);
    } else if (event.data.type === 'google-calendar-error') {
      this.handleAuthError(event.data);
    }
  }

  private handleAuthSuccess(data: any): void {
    console.log('✅ Autorización exitosa procesada:', data);

    // Mostrar información detallada del éxito
    const message = data.testResult?.success
      ? '✅ Google Calendar configurado y conexión verificada exitosamente'
      : '⚠️ Google Calendar configurado pero con advertencias en la conexión';

    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: data.testResult?.success ? ['success-snackbar'] : ['warning-snackbar']
    });

    // Recargar estado y configuración
    this.loadStatus();
    this.loadConfiguration();

    // Limpiar estado de carga
    this.oauthLoading.set(false);
  }

  private handleAuthError(data: any): void {
    console.error('❌ Error en autorización:', data);

    // Mostrar error detallado
    this.snackBar.open(
      `❌ Error en autorización: ${data.error || 'Error desconocido'}`,
      'Cerrar',
      { duration: 7000, panelClass: ['error-snackbar'] }
    );

    // Limpiar estado de carga
    this.oauthLoading.set(false);
  }
}
