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
import { MatSelectModule } from '@angular/material/select';
import { ConfiguracionService, EmailConfig, EmailTemplateConfig, EmailDeliveryItem, EmailDeliveryDetail } from '../../../services/configuracion.service';

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
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './email-config.component.html',
  styleUrl: './email-config.component.css'
})
export class EmailConfigComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  testing = signal(false);
  oauthLoading = signal(false);
  templateLoading = signal(false);
  templateSaving = signal(false);
  deliveriesLoading = signal(false);
  showChannelSection = signal(false);
  showTemplatesSection = signal(false);
  showHistorySection = signal(false);
  stats = signal<{ total: string; enviados: string; fallidos: string }>({ total: '0', enviados: '0', fallidos: '0' });
  deliveries = signal<EmailDeliveryItem[]>([]);
  selectedDeliveryDetail = signal<EmailDeliveryDetail | null>(null);
  detailLoading = signal(false);
  retryingIds = signal<string[]>([]);
  deliveriesPagination = signal<{ total: number; limit: number; offset: number; hasMore: boolean }>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });
  oauthConnected = signal(false);
  oauthEmail = signal<string | null>(null);
  oauthSecretStored = signal(false);
  showSmtpConfig = signal(false);
  templates = signal<EmailTemplateConfig[]>([]);
  selectedTemplateKey = signal<string>('');

  form: FormGroup;
  templateForm: FormGroup;
  deliveriesFilterForm: FormGroup;
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
      oauth_client_id: ['', [Validators.maxLength(4000)]],
      oauth_client_secret: ['', [Validators.maxLength(4000)]],
      smtp_host: ['', [Validators.maxLength(255)]],
      smtp_port: [587, [Validators.min(1), Validators.max(65535)]],
      smtp_secure: [false],
      smtp_usuario: ['', [Validators.maxLength(255)]],
      smtp_password: ['']
    });

    this.templateForm = this.fb.group({
      asunto: ['', [Validators.required]],
      mensaje: ['', [Validators.required]],
      activa: [true]
    });

    this.deliveriesFilterForm = this.fb.group({
      estado: [''],
      receptor: [''],
      fecha_desde: [''],
      fecha_hasta: ['']
    });
  }

  ngOnInit(): void {
    this.modeSubscription = this.form.get('auth_mode')?.valueChanges.subscribe(() => this.applyModeValidators());
    window.addEventListener('message', this.onOAuthMessage);
    this.applyModeValidators();
    this.loadData();
    this.loadTemplates();
    this.loadDeliveries();
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
            oauth_client_id: config.oauth_client_id || '',
            oauth_client_secret: '',
            smtp_host: config.smtp_host || '',
            smtp_port: config.smtp_port || 587,
            smtp_secure: !!config.smtp_secure,
            smtp_usuario: config.smtp_usuario || '',
            smtp_password: ''
          });

          this.oauthConnected.set(!!config.oauth_connected);
          this.oauthEmail.set(config.oauth_email || null);
          this.oauthSecretStored.set(Boolean(config.oauth_client_secret));

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
      next: (status) => this.stats.set(status.stats || { total: '0', enviados: '0', fallidos: '0' }),
      error: () => this.stats.set({ total: '0', enviados: '0', fallidos: '0' })
    });
  }

  loadDeliveries(offset: number = 0): void {
    this.deliveriesLoading.set(true);
    const filters = this.deliveriesFilterForm.value;

    this.configService.getEmailDeliveries({
      limit: this.deliveriesPagination().limit,
      offset,
      estado: filters.estado || undefined,
      receptor: String(filters.receptor || '').trim() || undefined,
      fecha_desde: filters.fecha_desde || undefined,
      fecha_hasta: filters.fecha_hasta || undefined
    }).subscribe({
      next: (result) => {
        this.deliveries.set(result.data || []);
        this.deliveriesPagination.set(result.pagination);
        this.deliveriesLoading.set(false);
      },
      error: () => {
        this.deliveriesLoading.set(false);
        this.deliveries.set([]);
        this.deliveriesPagination.set({ total: 0, limit: 20, offset: 0, hasMore: false });
      }
    });
  }

  applyDeliveriesFilters(): void {
    this.loadDeliveries(0);
  }

  clearDeliveriesFilters(): void {
    this.deliveriesFilterForm.reset({
      estado: '',
      receptor: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    this.loadDeliveries(0);
  }

  previousDeliveriesPage(): void {
    const pagination = this.deliveriesPagination();
    const nextOffset = Math.max(0, pagination.offset - pagination.limit);
    this.loadDeliveries(nextOffset);
  }

  nextDeliveriesPage(): void {
    const pagination = this.deliveriesPagination();
    if (!pagination.hasMore) return;
    this.loadDeliveries(pagination.offset + pagination.limit);
  }

  isRetrying(item: EmailDeliveryItem): boolean {
    const key = `${item.fuente}:${item.id}`;
    return this.retryingIds().includes(key);
  }

  viewDeliveryCopy(item: EmailDeliveryItem): void {
    this.detailLoading.set(true);
    this.configService.getEmailDeliveryDetail(item.fuente, item.id).subscribe({
      next: (detail) => {
        this.selectedDeliveryDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.detailLoading.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo cargar el detalle del correo', 'Cerrar', { duration: 3500 });
      }
    });
  }

  clearDeliveryCopy(): void {
    this.selectedDeliveryDetail.set(null);
  }

  retryDelivery(item: EmailDeliveryItem): void {
    if (item.estado !== 'fallido') return;

    const key = `${item.fuente}:${item.id}`;
    this.retryingIds.set([...this.retryingIds(), key]);

    this.configService.retryEmailDelivery(item.fuente, item.id).subscribe({
      next: (resp) => {
        this.retryingIds.set(this.retryingIds().filter((value) => value !== key));
        this.snackBar.open(resp.message, 'Cerrar', { duration: 3000 });
        this.loadDeliveries(this.deliveriesPagination().offset);
        this.loadData();
      },
      error: (error) => {
        this.retryingIds.set(this.retryingIds().filter((value) => value !== key));
        this.snackBar.open(error?.error?.message || 'No se pudo reenviar el correo', 'Cerrar', { duration: 3500 });
      }
    });
  }

  canRetryDelivery(item: EmailDeliveryItem): boolean {
    if (item.estado !== 'fallido') return false;
    const md = item.metadata || {};
    return Boolean((md as any)?.retry_payload || (md as any)?.email_snapshot);
  }

  getCopyPreviewHtml(): string {
    const copy = this.selectedDeliveryDetail()?.copy;
    if (!copy?.html) return '';
    return copy.html;
  }

  deliveriesPageLabel(): string {
    const pagination = this.deliveriesPagination();
    const total = pagination.total || 0;
    if (total === 0) return '0 de 0';

    const start = pagination.offset + 1;
    const end = Math.min(pagination.offset + pagination.limit, total);
    return `${start}-${end} de ${total}`;
  }

  toggleSection(section: 'channel' | 'templates' | 'history'): void {
    if (section === 'channel') {
      this.showChannelSection.set(!this.showChannelSection());
      return;
    }

    if (section === 'templates') {
      this.showTemplatesSection.set(!this.showTemplatesSection());
      return;
    }

    this.showHistorySection.set(!this.showHistorySection());
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

    const payload = this.buildConfigPayload();

    this.configService.updateEmailConfig(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Configuración de correo guardada', 'Cerrar', { duration: 2500 });
        this.form.patchValue({ smtp_password: '', oauth_client_secret: '' });
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
        this.loadDeliveries();
      },
      error: (error) => {
        this.testing.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo enviar correo de prueba', 'Cerrar', { duration: 3500 });
        this.loadData();
      }
    });
  }

  connectGoogle(): void {
    if (!this.showSmtpConfig() && !this.oauthConnected()) {
      const clientId = String(this.form.value.oauth_client_id || '').trim();
      const clientSecret = String(this.form.value.oauth_client_secret || '').trim();
      if (!clientId || !clientSecret) {
        this.snackBar.open('Ingresa Google Client ID y Client Secret para conectar', 'Cerrar', { duration: 3800 });
        return;
      }
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snackBar.open('Completa y guarda primero la configuración de correo', 'Cerrar', { duration: 3500 });
      return;
    }

    this.saving.set(true);
    this.configService.updateEmailConfig(this.buildConfigPayload()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.patchValue({ smtp_password: '', oauth_client_secret: '' }, { emitEvent: false });
        this.form.markAsPristine();
        this.startGoogleConnect();
      },
      error: (error) => {
        this.saving.set(false);
        this.snackBar.open(error?.error?.message || 'Guarda primero la configuración antes de conectar Google', 'Cerrar', { duration: 3800 });
      }
    });
  }

  private startGoogleConnect(): void {
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

  private buildConfigPayload(): EmailConfig {
    return {
      proveedor: 'smtp',
      auth_mode: this.form.value.auth_mode,
      nombre_remitente: this.form.value.nombre_remitente || null,
      correo_remitente: this.form.value.correo_remitente,
      correo_respuesta: this.form.value.correo_respuesta || null,
      oauth_client_id: this.form.value.oauth_client_id || undefined,
      oauth_client_secret: this.form.value.oauth_client_secret || undefined,
      smtp_host: this.form.value.smtp_host || undefined,
      smtp_port: Number(this.form.value.smtp_port || 587),
      smtp_secure: !!this.form.value.smtp_secure,
      smtp_usuario: this.form.value.smtp_usuario || undefined,
      smtp_password: this.form.value.smtp_password || undefined
    };
  }

  disconnectGoogle(): void {
    this.oauthLoading.set(true);
    this.configService.disconnectGoogleEmail().subscribe({
      next: (resp) => {
        this.oauthLoading.set(false);
        this.oauthConnected.set(false);
        this.oauthEmail.set(null);
        this.oauthSecretStored.set(false);
        this.showSmtpConfig.set(false);
        this.form.patchValue({
          auth_mode: 'gmail_oauth',
          oauth_client_id: '',
          oauth_client_secret: ''
        }, { emitEvent: false });
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

  loadTemplates(): void {
    this.templateLoading.set(true);
    this.configService.getEmailTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates || []);

        if (!templates.length) {
          this.selectedTemplateKey.set('');
          this.templateForm.reset({ asunto: '', mensaje: '', activa: true });
          this.templateLoading.set(false);
          return;
        }

        const selected = this.selectedTemplateKey();
        const exists = templates.some((tpl) => tpl.clave_template === selected);
        const nextKey = exists ? selected : templates[0].clave_template;
        this.onTemplateSelected(nextKey);
      },
      error: () => {
        this.templateLoading.set(false);
        this.snackBar.open('No se pudieron cargar las plantillas de correo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onTemplateSelected(key: string): void {
    if (!key) return;
    this.selectedTemplateKey.set(key);
    this.templateLoading.set(true);

    this.configService.getEmailTemplate(key).subscribe({
      next: (tpl) => {
        this.templateForm.patchValue({
          asunto: tpl.asunto,
          mensaje: tpl.mensaje || tpl.cuerpo_text || this.htmlToText(tpl.cuerpo_html),
          activa: tpl.activa
        });
        this.templateLoading.set(false);
      },
      error: () => {
        this.templateLoading.set(false);
        this.snackBar.open('No se pudo cargar el detalle de la plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  saveTemplate(): void {
    const key = this.selectedTemplateKey();
    if (!key) {
      this.snackBar.open('Selecciona una plantilla para guardar', 'Cerrar', { duration: 2500 });
      return;
    }

    this.templateForm.markAllAsTouched();
    if (this.templateForm.invalid) {
      this.snackBar.open('Completa asunto y mensaje de la plantilla', 'Cerrar', { duration: 2500 });
      return;
    }

    this.templateSaving.set(true);
    this.configService.updateEmailTemplate(key, this.templateForm.value).subscribe({
      next: () => {
        this.templateSaving.set(false);
        this.snackBar.open('Plantilla guardada correctamente', 'Cerrar', { duration: 2500 });
        this.loadTemplates();
      },
      error: (error) => {
        this.templateSaving.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo guardar la plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  resetTemplate(): void {
    const key = this.selectedTemplateKey();
    if (!key) {
      this.snackBar.open('Selecciona una plantilla para restaurar', 'Cerrar', { duration: 2500 });
      return;
    }

    this.templateSaving.set(true);
    this.configService.resetEmailTemplate(key).subscribe({
      next: (tpl) => {
        this.templateSaving.set(false);
        this.templateForm.patchValue({
          asunto: tpl.asunto,
          mensaje: tpl.mensaje || tpl.cuerpo_text || this.htmlToText(tpl.cuerpo_html),
          activa: tpl.activa
        });
        this.snackBar.open('Plantilla restaurada al valor predeterminado', 'Cerrar', { duration: 2500 });
        this.loadTemplates();
      },
      error: (error) => {
        this.templateSaving.set(false);
        this.snackBar.open(error?.error?.message || 'No se pudo restaurar la plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  getSelectedTemplateVariables(): string[] {
    const key = this.selectedTemplateKey();
    const tpl = this.templates().find((item) => item.clave_template === key);
    return tpl?.variables_permitidas || [];
  }

  insertVariable(variable: string, controlName: 'asunto' | 'mensaje' = 'mensaje'): void {
    const control = this.templateForm.get(controlName);
    if (!control) return;

    const token = `{{${variable}}}`;
    const current = String(control.value || '');
    const nextValue = current ? `${current}${current.endsWith(' ') ? '' : ' '}${token}` : token;
    control.setValue(nextValue);
    control.markAsDirty();
  }

  getTemplatePreview(): string {
    const message = String(this.templateForm.get('mensaje')?.value || '').trim();
    if (!message) return '<p></p>';

    return message
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private htmlToText(html: string): string {
    return String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private onOAuthMessage = (event: MessageEvent) => {
    if (event.data?.type === 'email-google-oauth' && event.data?.status === 'ok') {
      this.snackBar.open('Google conectado correctamente', 'Cerrar', { duration: 3000 });
      this.loadData();
    }
  };

  formatDeliveryDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
