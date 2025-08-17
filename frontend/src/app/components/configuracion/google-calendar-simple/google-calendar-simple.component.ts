import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ConfiguracionService, GoogleCalendarStatus } from '../../../services/configuracion.service';

interface GoogleCalendarConfig {
  activo: boolean;
  cliente_id: string;
  cliente_secret: string;
  calendar_id?: string;
  sync_automatico: boolean;
  prefijo_eventos: string;
}

@Component({
  selector: 'app-google-calendar-simple',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule
  ],
  template: `
    <div class="container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calendar_today</mat-icon>
            Configuración de Google Calendar
          </mat-card-title>
          <mat-card-subtitle>
            Conecta VetPlus con Google Calendar para sincronizar citas
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Estado de conexión -->
          <div class="status-section" *ngIf="status()">
            <h3>Estado de la Conexión</h3>
            <div class="status-grid">
              <div class="status-item">
                <mat-icon [class]="hasValidConfig() ? 'status-success' : 'status-error'">
                  {{ hasValidConfig() ? 'check_circle' : 'cancel' }}
                </mat-icon>
                <span>Configurado</span>
              </div>
              <div class="status-item">
                <mat-icon [class]="isAuthorized() ? 'status-success' : 'status-error'">
                  {{ isAuthorized() ? 'check_circle' : 'cancel' }}
                </mat-icon>
                <span>Autorizado</span>
              </div>
              <div class="status-item">
                <mat-icon [class]="status()?.conectado ? 'status-success' : 'status-warning'">
                  {{ status()?.conectado ? 'check_circle' : 'warning' }}
                </mat-icon>
                <span>Conectado</span>
              </div>
            </div>
            <mat-divider></mat-divider>
          </div>

          <!-- Formulario de configuración -->
          <form [formGroup]="configForm" (ngSubmit)="saveConfiguration()">
            <div class="form-section">
              <h3>Configuración Básica</h3>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Client ID de Google</mat-label>
                <input matInput formControlName="cliente_id" placeholder="xxxxx.apps.googleusercontent.com">
                <mat-hint>Obtén este valor de Google Cloud Console</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Client Secret de Google</mat-label>
                <input matInput type="password" formControlName="cliente_secret" placeholder="GOCSPX-xxxxx">
                <mat-hint>Obtén este valor de Google Cloud Console</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Calendar ID (Opcional)</mat-label>
                <input matInput formControlName="calendar_id" placeholder="primary">
                <mat-hint>Deja vacío para usar el calendar principal</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Prefijo para eventos</mat-label>
                <input matInput formControlName="prefijo_eventos" placeholder="[VetPlus]">
                <mat-hint>Texto que aparecerá al inicio de cada evento</mat-hint>
              </mat-form-field>

              <mat-slide-toggle formControlName="activo" class="full-width">
                Activar integración con Google Calendar
              </mat-slide-toggle>

              <mat-slide-toggle formControlName="sync_automatico" class="full-width">
                Sincronización automática
              </mat-slide-toggle>
            </div>

            <mat-divider></mat-divider>

            <!-- Acciones -->
            <div class="actions-section">
              <button mat-raised-button color="primary" type="submit" [disabled]="configForm.invalid || isLoading()">
                <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
                {{ isLoading() ? 'Guardando...' : 'Guardar Configuración' }}
              </button>

              <button mat-raised-button color="accent" type="button"
                      (click)="startAuthorization()"
                      [disabled]="!canAuthorize() || isAuthorizing()">
                <mat-spinner diameter="20" *ngIf="isAuthorizing()"></mat-spinner>
                <mat-icon *ngIf="!isAuthorizing()">security</mat-icon>
                {{ isAuthorizing() ? 'Autorizando...' : 'Autorizar con Google' }}
              </button>

              <button mat-stroked-button type="button"
                      (click)="testConnection()"
                      [disabled]="!canTest() || isTesting()">
                <mat-spinner diameter="20" *ngIf="isTesting()"></mat-spinner>
                <mat-icon *ngIf="!isTesting()">wifi</mat-icon>
                {{ isTesting() ? 'Probando...' : 'Probar Conexión' }}
              </button>

              <button mat-stroked-button color="warn" type="button"
                      (click)="disconnect()"
                      [disabled]="!isAuthorized()">
                <mat-icon>link_off</mat-icon>
                Desconectar
              </button>
            </div>
          </form>

          <!-- Instrucciones -->
          <div class="instructions-section">
            <h3>Instrucciones de Configuración</h3>
            <ol>
              <li>Ve a <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
              <li>Crea un proyecto o selecciona uno existente</li>
              <li>Habilita la API de Google Calendar</li>
              <li>Crea credenciales OAuth 2.0</li>
              <li>Agrega <code>http://localhost:3000/api/google-calendar/callback</code> como URI de redirección</li>
              <li>Copia el Client ID y Client Secret aquí</li>
              <li>Guarda la configuración y autoriza con Google</li>
            </ol>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .status-section {
      margin-bottom: 24px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: #f5f5f5;
    }

    .status-success {
      color: #4caf50;
    }

    .status-warning {
      color: #ff9800;
    }

    .status-error {
      color: #f44336;
    }

    .form-section {
      margin: 24px 0;
    }

    .actions-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 24px 0;
    }

    .instructions-section {
      margin-top: 32px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .instructions-section ol {
      margin: 0;
      padding-left: 20px;
    }

    .instructions-section li {
      margin-bottom: 8px;
    }

    .instructions-section code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    mat-divider {
      margin: 24px 0;
    }
  `]
})
export class GoogleCalendarSimpleComponent implements OnInit {
  configForm: FormGroup;
  status = signal<GoogleCalendarStatus | null>(null);
  isLoading = signal(false);
  isAuthorizing = signal(false);
  isTesting = signal(false);

  constructor(
    private fb: FormBuilder,
    private configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      activo: [false],
      cliente_id: ['', [Validators.required]],
      cliente_secret: ['', [Validators.required]],
      calendar_id: [''],
      sync_automatico: [false],
      prefijo_eventos: ['[VetPlus]', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadStatus();
  }

  private loadConfiguration(): void {
    this.configuracionService.getGoogleCalendarConfig().subscribe({
      next: (config) => {
        if (config) {
          this.configForm.patchValue(config);
        }
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
      }
    });
  }

  private loadStatus(): void {
    this.configuracionService.getGoogleCalendarStatus().subscribe({
      next: (status) => {
        this.status.set(status);
      },
      error: (error) => {
        console.error('Error cargando estado:', error);
        this.status.set({
          conectado: false,
          ultimo_sync: 'Error',
          eventos_sincronizados: 0,
          errores_recientes: ['Error al cargar estado'],
          calendario_info: {
            nombre: 'Error',
            descripcion: 'Error al cargar',
            zona_horaria: 'UTC'
          }
        });
      }
    });
  }

  saveConfiguration(): void {
    if (this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading.set(true);
    const formData = this.configForm.value;

    this.configuracionService.saveGoogleCalendarConfig(formData).subscribe({
      next: (response) => {
        this.snackBar.open('Configuración guardada correctamente', 'Cerrar', { duration: 3000 });
        this.loadStatus();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error guardando configuración:', error);
        this.snackBar.open('Error al guardar configuración', 'Cerrar', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  startAuthorization(): void {
    if (!this.canAuthorize()) {
      this.snackBar.open('Primero guarda la configuración', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isAuthorizing.set(true);

    this.configuracionService.getGoogleOAuthUrl().subscribe({
      next: (authUrl) => {
        // Abrir en nueva pestaña
        const authWindow = window.open(authUrl, '_blank', 'width=500,height=600');

        if (!authWindow) {
          this.snackBar.open('Popup bloqueado. Habilita popups para este sitio.', 'Cerrar', { duration: 5000 });
          this.isAuthorizing.set(false);
          return;
        }

        // Configurar listener para detectar cuando se cierra la ventana
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // Dar tiempo para que el callback procese
            setTimeout(() => {
              this.loadStatus();
              this.isAuthorizing.set(false);
            }, 2000);
          }
        }, 1000);

        // Timeout de seguridad
        setTimeout(() => {
          if (!authWindow.closed) {
            authWindow.close();
            clearInterval(checkClosed);
            this.isAuthorizing.set(false);
          }
        }, 300000); // 5 minutos
      },
      error: (error) => {
        console.error('Error obteniendo URL de autorización:', error);
        this.snackBar.open('Error iniciando autorización', 'Cerrar', { duration: 3000 });
        this.isAuthorizing.set(false);
      }
    });
  }

  testConnection(): void {
    this.isTesting.set(true);

    this.configuracionService.testGoogleCalendarConnection().subscribe({
      next: (result) => {
        if (result.success) {
          this.snackBar.open('✅ Conexión exitosa con Google Calendar', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(`⚠️ ${result.message}`, 'Cerrar', { duration: 5000 });
        }
        this.loadStatus();
        this.isTesting.set(false);
      },
      error: (error) => {
        console.error('Error probando conexión:', error);
        this.snackBar.open('❌ Error al probar conexión', 'Cerrar', { duration: 3000 });
        this.isTesting.set(false);
      }
    });
  }

  disconnect(): void {
    if (confirm('¿Estás seguro de que deseas desconectar Google Calendar?')) {
      this.configuracionService.disableGoogleCalendar().subscribe({
        next: () => {
          this.snackBar.open('Google Calendar desconectado', 'Cerrar', { duration: 3000 });
          this.loadStatus();
        },
        error: (error) => {
          console.error('Error desconectando:', error);
          this.snackBar.open('Error al desconectar', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  canAuthorize(): boolean {
    return this.configForm.valid && this.hasValidConfig() && !this.isAuthorized();
  }

  canTest(): boolean {
    return this.isAuthorized();
  }

  hasValidConfig(): boolean {
    return this.configForm.get('cliente_id')?.value && this.configForm.get('cliente_secret')?.value;
  }

  isAuthorized(): boolean {
    // Verificamos si hay conexión activa y no hay errores recientes
    return this.status()?.conectado === true && (this.status()?.errores_recientes?.length || 0) === 0;
  }
}
