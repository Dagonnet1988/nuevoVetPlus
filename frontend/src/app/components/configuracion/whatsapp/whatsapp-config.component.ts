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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  ConfiguracionService,
  WhatsAppConfig,
  WhatsAppStatus,
  WhatsAppStats,
  WhatsAppMessage,
  WhatsAppLimites,
  WhatsAppEstadoLimites
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
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatDialogModule
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
  limitesForm: FormGroup;
  diasActivos = signal<number[]>([1, 2, 3, 4, 5]); // Lunes a Viernes por defecto

  // Historial de mensajes
  historialLoading = signal(false);
  mensajes = signal<WhatsAppMessage[]>([]);
  mensajesFiltrados = signal<WhatsAppMessage[]>([]);
  totalMensajes = signal(0);

  // Filtros para historial
  filtroEstado = '';
  filtroTipo = '';
  fechaDesde = '';
  fechaHasta = '';

  // Paginación
  tamañoPagina = 25;
  paginaActual = 0;

  // Columnas de la tabla
  columnasHistorial = ['fecha', 'cliente', 'tipo', 'estado', 'mensaje', 'intentos', 'acciones'];

  // Estado de límites
  estadoLimites = signal<WhatsAppEstadoLimites>({
    mensajes_hoy: 0,
    mensajes_hora: 0,
    pausado: false,
    pausa_hasta: undefined,
    limites_por_tipo: {
      confirmaciones: 0,
      recordatorios: 0,
      facturas: 0,
      manuales: 0
    }
  });

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
    private router: Router,
    private dialog: MatDialog
  ) {
    this.configForm = this.createForm();
    this.limitesForm = this.createLimitesForm();
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadStatus();
    this.loadStats();
    this.loadHistorial();
    this.loadEstadoLimites();
    this.loadLimitesConfiguration();
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

  private createLimitesForm(): FormGroup {
    return this.fb.group({
      // Límites generales
      limite_diario: [50, [Validators.required, Validators.min(1), Validators.max(200)]],
      limite_por_hora: [15, [Validators.required, Validators.min(1), Validators.max(50)]],
      intervalo_minimo: [20, [Validators.required, Validators.min(5), Validators.max(300)]],
      max_reintentos: [3, [Validators.required, Validators.min(1), Validators.max(5)]],

      // Límites por tipo
      limitar_confirmaciones: [false],
      limite_confirmaciones_dia: [20, Validators.min(1)],
      limitar_recordatorios: [false],
      limite_recordatorios_dia: [15, Validators.min(1)],
      limitar_facturas: [false],
      limite_facturas_dia: [10, Validators.min(1)],
      limitar_manuales: [false],
      limite_manuales_dia: [5, Validators.min(1)],

      // Pausas automáticas
      pausas_automaticas: [true],
      pausa_limite_hora: [30, [Validators.min(5), Validators.max(120)]],
      pausa_limite_dia: [8, [Validators.min(1), Validators.max(24)]]
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

  private loadLimitesConfiguration(): void {
    this.configuracionService.getWhatsAppLimites().subscribe({
      next: (limites) => {
        this.limitesForm.patchValue(limites);
      },
      error: (error) => {
        console.error('Error cargando configuración de límites:', error);
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

  // ===============================
  // MÉTODOS PARA HISTORIAL DE MENSAJES
  // ===============================

  loadHistorial(): void {
    this.historialLoading.set(true);

    const filtros = {
      fecha_inicio: this.fechaDesde,
      fecha_fin: this.fechaHasta,
      estado: this.filtroEstado
    };

    this.configuracionService.getWhatsAppMessages(filtros).subscribe({
      next: (mensajes) => {
        this.mensajes.set(mensajes);
        this.aplicarFiltros();
        this.historialLoading.set(false);
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.historialLoading.set(false);
      }
    });
  }

  filtrarMensajes(): void {
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let mensajesFiltrados = [...this.mensajes()];

    // Filtrar por estado
    if (this.filtroEstado) {
      mensajesFiltrados = mensajesFiltrados.filter(m => m.estado === this.filtroEstado);
    }

    // Filtrar por tipo
    if (this.filtroTipo) {
      mensajesFiltrados = mensajesFiltrados.filter(m => m.contexto?.tipo === this.filtroTipo);
    }

    // Filtrar por fechas
    if (this.fechaDesde) {
      const fechaDesde = new Date(this.fechaDesde);
      mensajesFiltrados = mensajesFiltrados.filter(m => new Date(m.fecha_creacion) >= fechaDesde);
    }

    if (this.fechaHasta) {
      const fechaHasta = new Date(this.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999);
      mensajesFiltrados = mensajesFiltrados.filter(m => new Date(m.fecha_creacion) <= fechaHasta);
    }

    this.mensajesFiltrados.set(mensajesFiltrados);
    this.totalMensajes.set(mensajesFiltrados.length);
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroTipo = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.aplicarFiltros();
  }

  refreshHistorial(): void {
    this.loadHistorial();
  }

  cambiarPagina(event: PageEvent): void {
    this.paginaActual = event.pageIndex;
    this.tamañoPagina = event.pageSize;
  }

  reintentarMensaje(messageId: string): void {
    this.configuracionService.retryWhatsAppMessage(messageId).subscribe({
      next: () => {
        this.snackBar.open('Mensaje reenviado', 'Cerrar', { duration: 3000 });
        this.loadHistorial();
      },
      error: (error) => {
        console.error('Error reenviando mensaje:', error);
        this.snackBar.open('Error al reenviar mensaje', 'Cerrar', { duration: 3000 });
      }
    });
  }

  verDetallesMensaje(mensaje: WhatsAppMessage): void {
    // TODO: Implementar diálogo de detalles
    console.log('Ver detalles:', mensaje);
  }

  verErrorMensaje(mensaje: WhatsAppMessage): void {
    this.snackBar.open(mensaje.error_mensaje || 'Error desconocido', 'Cerrar', { duration: 5000 });
  }

  // Métodos auxiliares para la tabla
  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'confirmacion': return '#4caf50';
      case 'recordatorio': return '#ff9800';
      case 'factura': return '#2196f3';
      case 'formula': return '#9c27b0';
      case 'cancelacion': return '#f44336';
      case 'manual': return '#607d8b';
      default: return '#9e9e9e';
    }
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'confirmacion': return 'Confirmación';
      case 'recordatorio': return 'Recordatorio';
      case 'factura': return 'Factura';
      case 'formula': return 'Fórmula';
      case 'cancelacion': return 'Cancelación';
      case 'manual': return 'Manual';
      default: return 'Otro';
    }
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'enviado': return '#4caf50';
      case 'entregado': return '#2196f3';
      case 'leido': return '#009688';
      case 'fallido': return '#f44336';
      case 'pendiente': return '#ff9800';
      default: return '#9e9e9e';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'enviado': return 'check';
      case 'entregado': return 'done_all';
      case 'leido': return 'mark_chat_read';
      case 'fallido': return 'error';
      case 'pendiente': return 'schedule';
      default: return 'help';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'enviado': return 'Enviado';
      case 'entregado': return 'Entregado';
      case 'leido': return 'Leído';
      case 'fallido': return 'Fallido';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocido';
    }
  }

  // ===============================
  // MÉTODOS PARA CONTROL DE LÍMITES
  // ===============================

  loadEstadoLimites(): void {
    this.configuracionService.getWhatsAppEstadoLimites().subscribe({
      next: (estado) => {
        this.estadoLimites.set(estado);
      },
      error: (error) => {
        console.error('Error cargando estado de límites:', error);
      }
    });
  }

  guardarLimites(): void {
    if (this.limitesForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const limites = this.limitesForm.value;

    this.configuracionService.updateWhatsAppLimites(limites).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Límites guardados exitosamente', 'Cerrar', { duration: 3000 });
        this.loadEstadoLimites(); // Recargar estado
      },
      error: (error) => {
        console.error('Error guardando límites:', error);
        this.loading.set(false);
        this.snackBar.open('Error guardando límites', 'Cerrar', { duration: 3000 });
      }
    });
  }

  restablecerLimites(): void {
    this.limitesForm.patchValue({
      limite_diario: 50,
      limite_por_hora: 15,
      intervalo_minimo: 20,
      max_reintentos: 3,
      limitar_confirmaciones: false,
      limite_confirmaciones_dia: 20,
      limitar_recordatorios: false,
      limite_recordatorios_dia: 15,
      limitar_facturas: false,
      limite_facturas_dia: 10,
      limitar_manuales: false,
      limite_manuales_dia: 5,
      pausas_automaticas: true,
      pausa_limite_hora: 30,
      pausa_limite_dia: 8
    });
  }

  resetearContadores(): void {
    this.loading.set(true);

    this.configuracionService.resetWhatsAppContadores().subscribe({
      next: () => {
        this.estadoLimites.set({
          mensajes_hoy: 0,
          mensajes_hora: 0,
          pausado: false,
          pausa_hasta: undefined,
          limites_por_tipo: {
            confirmaciones: 0,
            recordatorios: 0,
            facturas: 0,
            manuales: 0
          }
        });
        this.loading.set(false);
        this.snackBar.open('Contadores reseteados', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error reseteando contadores:', error);
        this.loading.set(false);
        this.snackBar.open('Error reseteando contadores', 'Cerrar', { duration: 3000 });
      }
    });
  }

  reanudarEnvios(): void {
    this.loading.set(true);

    this.configuracionService.reanudarWhatsAppEnvios().subscribe({
      next: () => {
        this.estadoLimites.update(estado => ({
          ...estado,
          pausado: false,
          pausa_hasta: undefined
        }));
        this.loading.set(false);
        this.snackBar.open('Envíos reanudados', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error reanudando envíos:', error);
        this.loading.set(false);
        this.snackBar.open('Error reanudando envíos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // Métodos auxiliares para límites
  getPorcentajeUso(actual: number, limite: number): number {
    return limite > 0 ? (actual / limite) * 100 : 0;
  }

  getColorUsoLimite(actual: number, limite: number): string {
    const porcentaje = this.getPorcentajeUso(actual, limite);
    if (porcentaje >= 90) return '#f44336';
    if (porcentaje >= 75) return '#ff9800';
    if (porcentaje >= 50) return '#ffc107';
    return '#4caf50';
  }

  getColorBarraLimite(actual: number, limite: number): 'primary' | 'accent' | 'warn' {
    const porcentaje = this.getPorcentajeUso(actual, limite);
    if (porcentaje >= 75) return 'warn';
    if (porcentaje >= 50) return 'accent';
    return 'primary';
  }
}
