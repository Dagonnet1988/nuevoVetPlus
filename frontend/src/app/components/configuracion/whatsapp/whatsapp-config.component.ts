import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import {
  ConfiguracionService,
  WhatsAppConfig,
  WhatsAppStatus,
  WhatsAppStats
} from '../../../services/configuracion.service';

@Component({
  selector: 'app-whatsapp-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
    MatCheckboxModule
  ],
  templateUrl: './whatsapp-config.component.html',
  styleUrls: ['./whatsapp-config.component.css']
})
export class WhatsAppConfigComponent implements OnInit {
  loading = signal(false);
  qrLoading = signal(false);
  actionLoading = signal(false);
  testLoading = signal(false);

  config = signal<WhatsAppConfig | null>(null);
  status = signal<WhatsAppStatus>({
    conectado: false,
    numero_vinculado: '',
    estado_conexion: 'desconectado',
    ultimo_heartbeat: ''
  });
  stats = signal<WhatsAppStats | null>(null);
  qrCode = signal<string | null>(null);

  configForm: FormGroup;
  diasActivos = signal<number[]>([1, 2, 3, 4, 5]); // Lunes a Viernes por defecto

  diasSemana = [
    { label: 'Domingo', value: 0 },
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miércoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
    { label: 'Sábado', value: 6 }
  ];

  constructor(
    private fb: FormBuilder,
    private configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.configForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadStatus();
    this.loadStats();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      activo: [false],
      numero_telefono: ['', Validators.required],
      nombre_empresa: ['', Validators.required],
      template_confirmacion: ['Hola {cliente}, tu cita para {mascota} el {fecha} a las {hora} ha sido confirmada.', Validators.required],
      template_recordatorio: ['Recordatorio: Tu cita para {mascota} es mañana {fecha} a las {hora}.', Validators.required],
      template_cancelacion: ['Tu cita para {mascota} el {fecha} ha sido cancelada.', Validators.required],
      template_factura: ['Tu factura #{numero} por {monto} ha sido generada.', Validators.required],
      enviar_confirmaciones: [true],
      enviar_recordatorios: [true],
      enviar_facturas: [true],
      tiempo_recordatorio: [24, [Validators.required, Validators.min(1)]],
      hora_inicio_envios: ['08:00', Validators.required],
      hora_fin_envios: ['18:00', Validators.required],
      // Nuevos campos para notificaciones automáticas
      notificaciones_automaticas: [false],
      auto_cita_confirmada: [false],
      auto_cita_recordatorio: [true],
      auto_consulta_completada: [false],
      auto_factura_generada: [false]
    });
  }

  private loadConfiguration(): void {
    this.configuracionService.getWhatsAppConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.populateForm(config);
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
      }
    });
  }

  private populateForm(config: WhatsAppConfig): void {
    this.configForm.patchValue({
      activo: config.activo,
      numero_telefono: config.numero_telefono,
      nombre_empresa: config.nombre_empresa,
      template_confirmacion: config.templates?.confirmacion_cita || '',
      template_recordatorio: config.templates?.recordatorio_cita || '',
      template_cancelacion: config.templates?.cancelacion_cita || '',
      template_factura: config.templates?.factura_enviada || '',
      enviar_confirmaciones: config.configuracion_envios?.enviar_confirmaciones ?? true,
      enviar_recordatorios: config.configuracion_envios?.enviar_recordatorios ?? true,
      enviar_facturas: config.configuracion_envios?.enviar_facturas ?? true,
      tiempo_recordatorio: config.configuracion_envios?.tiempo_recordatorio || 24,
      hora_inicio_envios: config.horarios_envio?.hora_inicio || '08:00',
      hora_fin_envios: config.horarios_envio?.hora_fin || '18:00',
      // Notificaciones automáticas (valores por defecto si no existen)
      notificaciones_automaticas: config.notificaciones_automaticas?.activo ?? false,
      auto_cita_confirmada: config.notificaciones_automaticas?.auto_cita_confirmada ?? false,
      auto_cita_recordatorio: config.notificaciones_automaticas?.auto_cita_recordatorio ?? true,
      auto_consulta_completada: config.notificaciones_automaticas?.auto_consulta_completada ?? false,
      auto_factura_generada: config.notificaciones_automaticas?.auto_factura_generada ?? false
    });

    if (config.horarios_envio?.dias_activos) {
      this.diasActivos.set(config.horarios_envio.dias_activos);
    }
  }

  private loadStatus(): void {
    this.configuracionService.getWhatsAppStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        if (!status.conectado && status.qr_code) {
          this.qrCode.set(status.qr_code);
        }
      },
      error: (error) => {
        console.error('Error cargando estado de WhatsApp:', error);
      }
    });
  }

  private loadStats(): void {
    this.configuracionService.getWhatsAppStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
      }
    });
  }

  generateQR(): void {
    this.qrLoading.set(true);

    this.configuracionService.getWhatsAppQR().subscribe({
      next: (qrCode) => {
        this.qrCode.set(qrCode);
        this.qrLoading.set(false);

        // Verificar estado cada 3 segundos
        const checkInterval = setInterval(() => {
          this.loadStatus();
          if (this.status().conectado) {
            clearInterval(checkInterval);
            this.qrCode.set(null);
            this.snackBar.open('WhatsApp conectado exitosamente', 'Cerrar', { duration: 3000 });
          }
        }, 3000);

        // Limpiar interval después de 5 minutos
        setTimeout(() => clearInterval(checkInterval), 300000);
      },
      error: (error) => {
        console.error('Error generando QR:', error);
        this.snackBar.open('Error generando código QR', 'Cerrar', { duration: 3000 });
        this.qrLoading.set(false);
      }
    });
  }

  refreshQR(): void {
    this.qrCode.set(null);
    this.generateQR();
  }

  logout(): void {
    this.actionLoading.set(true);

    this.configuracionService.logoutWhatsApp().subscribe({
      next: () => {
        this.snackBar.open('WhatsApp desconectado', 'Cerrar', { duration: 3000 });
        this.actionLoading.set(false);
        this.loadStatus();
      },
      error: (error) => {
        console.error('Error desconectando WhatsApp:', error);
        this.snackBar.open('Error desconectando WhatsApp', 'Cerrar', { duration: 3000 });
        this.actionLoading.set(false);
      }
    });
  }

  restart(): void {
    this.actionLoading.set(true);

    this.configuracionService.restartWhatsApp().subscribe({
      next: () => {
        this.snackBar.open('Servicio de WhatsApp reiniciado', 'Cerrar', { duration: 3000 });
        this.actionLoading.set(false);
        this.loadStatus();
      },
      error: (error) => {
        console.error('Error reiniciando WhatsApp:', error);
        this.snackBar.open('Error reiniciando servicio', 'Cerrar', { duration: 3000 });
        this.actionLoading.set(false);
      }
    });
  }

  saveConfiguration(): void {
    if (this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const formValue = this.configForm.value;

    const config: WhatsAppConfig = {
      activo: formValue.activo,
      numero_telefono: formValue.numero_telefono,
      nombre_empresa: formValue.nombre_empresa,
      templates: {
        confirmacion_cita: formValue.template_confirmacion,
        recordatorio_cita: formValue.template_recordatorio,
        cancelacion_cita: formValue.template_cancelacion,
        factura_enviada: formValue.template_factura,
        formula_enviada: 'Tu fórmula médica ha sido enviada.',
        recordatorio_pago: 'Tienes un pago pendiente por {monto}.'
      },
      configuracion_envios: {
        enviar_confirmaciones: formValue.enviar_confirmaciones,
        enviar_recordatorios: formValue.enviar_recordatorios,
        tiempo_recordatorio: formValue.tiempo_recordatorio,
        enviar_facturas: formValue.enviar_facturas,
        enviar_formulas: false,
        reintentos_max: 3,
        tiempo_entre_reintentos: 5
      },
      horarios_envio: {
        hora_inicio: formValue.hora_inicio_envios,
        hora_fin: formValue.hora_fin_envios,
        dias_activos: this.diasActivos()
      },
      // Nueva sección de notificaciones automáticas
      notificaciones_automaticas: {
        activo: formValue.notificaciones_automaticas,
        auto_cita_confirmada: formValue.auto_cita_confirmada,
        auto_cita_recordatorio: formValue.auto_cita_recordatorio,
        auto_consulta_completada: formValue.auto_consulta_completada,
        auto_factura_generada: formValue.auto_factura_generada,
        limite_diario: 50, // Límite por defecto para Baileys
        intervalo_minimo_minutos: 5 // Tiempo mínimo entre mensajes
      }
    };

    this.configuracionService.updateWhatsAppConfig(config).subscribe({
      next: () => {
        this.snackBar.open('Configuración guardada exitosamente', 'Cerrar', { duration: 3000 });
        this.loading.set(false);

        // Mostrar advertencia si las notificaciones automáticas están activas
        if (formValue.notificaciones_automaticas) {
          setTimeout(() => {
            this.snackBar.open(
              '⚠️ Notificaciones automáticas activadas. Monitorea el uso para evitar bloqueos de WhatsApp',
              'Entendido',
              { duration: 5000 }
            );
          }, 1000);
        }
      },
      error: (error) => {
        console.error('Error guardando configuración:', error);
        this.snackBar.open('Error guardando configuración', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  sendTestMessage(): void {
    const numero = this.configForm.value.numero_telefono;
    if (!numero) {
      this.snackBar.open('Primero configura el número de teléfono', 'Cerrar', { duration: 3000 });
      return;
    }

    this.testLoading.set(true);
    const mensaje = `Mensaje de prueba desde ${this.configForm.value.nombre_empresa || 'VetPlus'} - Enviado con Baileys`;

    this.configuracionService.testWhatsAppMessage(numero, mensaje).subscribe({
      next: () => {
        this.snackBar.open('Mensaje de prueba enviado', 'Cerrar', { duration: 3000 });
        this.testLoading.set(false);
      },
      error: (error) => {
        console.error('Error enviando mensaje:', error);
        this.snackBar.open('Error enviando mensaje de prueba', 'Cerrar', { duration: 3000 });
        this.testLoading.set(false);
      }
    });
  }

  toggleDay(day: number, checked: boolean): void {
    const dias = this.diasActivos();
    if (checked) {
      if (!dias.includes(day)) {
        this.diasActivos.set([...dias, day].sort());
      }
    } else {
      this.diasActivos.set(dias.filter(d => d !== day));
    }
  }

  isDayActive(day: number): boolean {
    return this.diasActivos().includes(day);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'conectado': return 'Conectado';
      case 'conectando': return 'Conectando...';
      case 'error': return 'Error';
      default: return 'Desconectado';
    }
  }

  goBack(): void {
    this.router.navigate(['/configuracion']);
  }
}
