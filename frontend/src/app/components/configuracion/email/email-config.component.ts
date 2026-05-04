import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfiguracionService, EmailConfig } from '../../../services/configuracion.service';

@Component({
  selector: 'app-email-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './email-config.component.html',
  styleUrl: './email-config.component.css'
})
export class EmailConfigComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  testing = signal(false);
  oauthLoading = signal(false);
  stats = signal<{ total: string; enviados: string; fallidos: string } | null>(null);
  oauthConnected = signal(false);
  oauthEmail = signal<string | null>(null);
  showSmtpConfig = signal(false);

  form: FormGroup;
  private popupPoll: ReturnType<typeof setInterval> | null = null;
  private modeSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private configService: ConfiguracionService
  ) {
    this.form = this.fb.group({
      auth_mode: ['gmail_oauth', [Validators.required]],
      nombre_remitente: ['', [Validators.maxLength(150)]],
      correo_remitente: ['', [Validators.required, Validators.email]],
      correo_respuesta: ['', [Validators.email]],
      smtp_host: ['', [Validators.maxLength(255)]],
      smtp_port: [587, [Validators.min(1), Validators.max(65535)]],
      smtp_secure: [false],
      smtp_usuario: ['', [Validators.maxLength(255)]],
      smtp_password: ['']
    });
  }

  ngOnInit(): void {
    this.modeSubscription = this.form.get('auth_mode')?.valueChanges.subscribe(() => this.applyModeValidators());
    window.addEventListener('message', this.onOAuthMessage);
    this.applyModeValidators();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.modeSubscription?.unsubscribe();
    window.removeEventListener('message', this.onOAuthMessage);
    if (this.popupPoll) {
      clearInterval(this.popupPoll);
      this.popupPoll = null;
    }
  }

  back(): void {
    this.router.navigate(['/configuracion']);
  }

  loadData(): void {
    this.loading.set(true);

    this.configService.getEmailConfig().subscribe({
      next: (config) => {
        if (config) {
          const mode = config.auth_mode || 'gmail_oauth';
          this.showSmtpConfig.set(mode === 'smtp');
          this.form.patchValue({
            auth_mode: mode,
            nombre_remitente: config.nombre_remitente || '',
            correo_remitente: config.correo_remitente || '',
            correo_respuesta: config.correo_respuesta || '',
            smtp_host: config.smtp_host || '',
            smtp_port: config.smtp_port || 587,
            smtp_secure: !!config.smtp_secure,
            smtp_usuario: config.smtp_usuario || '',
            smtp_password: ''
          });

          this.oauthConnected.set(!!config.oauth_connected);
          this.oauthEmail.set(config.oauth_email || null);

          this.applyModeValidators();

          if (config.tiene_password) {
            this.form.get('smtp_password')?.clearValidators();
            this.form.get('smtp_password')?.updateValueAndValidity();
          }
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar configuración de correo', 'Cerrar', { duration: 3000 });
      }
    });

    this.configService.getEmailModuleStatus().subscribe({
      next: (status) => this.stats.set(status.stats),
      error: () => this.stats.set(null)
    });
  }

  useGoogleMode(): void {
    this.showSmtpConfig.set(false);
    this.form.patchValue({ auth_mode: 'gmail_oauth' });
    this.applyModeValidators();
  }

  useSmtpMode(): void {
    this.showSmtpConfig.set(true);
    this.form.patchValue({ auth_mode: 'smtp' });
    this.applyModeValidators();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);

    const payload: EmailConfig = {
      proveedor: 'smtp',
      auth_mode: this.form.value.auth_mode,
      nombre_remitente: this.form.value.nombre_remitente || null,
      correo_remitente: this.form.value.correo_remitente,
      correo_respuesta: this.form.value.correo_respuesta || null,
      smtp_host: this.form.value.smtp_host || undefined,
      smtp_port: Number(this.form.value.smtp_port || 587),
      smtp_secure: !!this.form.value.smtp_secure,
      smtp_usuario: this.form.value.smtp_usuario || undefined,
      smtp_password: this.form.value.smtp_password || undefined
    };

    this.configService.updateEmailConfig(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Configuración de correo guardada', 'Cerrar', { duration: 2500 });
        this.form.patchValue({ smtp_password: '' });
        this.loadData();
      },
      error: (error) => {
        this.saving.set(false);
        this.snackBar.open(error?.error?.message || 'Error guardando configuración', 'Cerrar', { duration: 3500 });
      }
    });
  }

  testConnection(): void {
    const destino = this.form.value.correo_respuesta || this.form.value.correo_remitente;
    if (!destino) {
      this.snackBar.open('Define correo remitente o de respuesta para probar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.testing.set(true);
    this.configService.testEmailConfig(destino).subscribe({
      next: (resp) => {
        this.testing.set(false);
        this.snackBar.open(resp.message, 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        this.testing.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo enviar correo de prueba', 'Cerrar', { duration: 3500 });
      }
    });
  }

  connectGoogle(): void {
    this.oauthLoading.set(true);
    this.configService.getGoogleEmailAuthUrl().subscribe({
      next: (authUrl) => {
        this.oauthLoading.set(false);
        const popup = window.open(authUrl, 'vetplus-google-oauth-email', 'width=520,height=720');
        if (!popup) {
          this.snackBar.open('El navegador bloqueó la ventana de autorización', 'Cerrar', { duration: 3500 });
          return;
        }

        this.popupPoll = setInterval(() => {
          if (popup.closed) {
            if (this.popupPoll) {
              clearInterval(this.popupPoll);
              this.popupPoll = null;
            }
            this.loadData();
          }
        }, 700);
      },
      error: (error) => {
        this.oauthLoading.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo iniciar autorización de Google', 'Cerrar', { duration: 3500 });
      }
    });
  }

  disconnectGoogle(): void {
    this.oauthLoading.set(true);
    this.configService.disconnectGoogleEmail().subscribe({
      next: (resp) => {
        this.oauthLoading.set(false);
        this.snackBar.open(resp.message, 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        this.oauthLoading.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo desconectar Google', 'Cerrar', { duration: 3500 });
      }
    });
  }

  private applyModeValidators(): void {
    const mode = this.form.get('auth_mode')?.value || 'smtp';

    const smtpHost = this.form.get('smtp_host');
    const smtpPort = this.form.get('smtp_port');
    const smtpUser = this.form.get('smtp_usuario');

    if (mode === 'smtp') {
      smtpHost?.setValidators([Validators.required, Validators.maxLength(255)]);
      smtpPort?.setValidators([Validators.required, Validators.min(1), Validators.max(65535)]);
      smtpUser?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      smtpHost?.clearValidators();
      smtpPort?.clearValidators();
      smtpUser?.clearValidators();
    }

    smtpHost?.updateValueAndValidity({ emitEvent: false });
    smtpPort?.updateValueAndValidity({ emitEvent: false });
    smtpUser?.updateValueAndValidity({ emitEvent: false });
  }

  private onOAuthMessage = (event: MessageEvent) => {
    if (event.data?.type === 'email-google-oauth' && event.data?.status === 'ok') {
      this.snackBar.open('Google conectado correctamente', 'Cerrar', { duration: 3000 });
      this.loadData();
    }
  };
}
