import { extractError } from '../../utils/error.utils';
import { Component, OnInit, OnDestroy, signal, Inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { sexoDbToFrontend } from '../../utils/paciente.utils';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

import { PacientesService } from '../../services/pacientes.service';
import { CitasService } from '../../services/citas.service';
import { ConsultasService } from '../../services/consultas.service';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { ConsentimientoStatusComponent } from '../consentimiento-status/consentimiento-status.component';
import { Mascota, Cliente } from '../../models/paciente.interface';
import { environment } from '../../../environments/environment';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-paciente-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatMenuModule,
    MatTabsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDialogModule,
    ConsentimientoStatusComponent
  ],
  templateUrl: './paciente-details.component.html',
  styleUrls: ['./paciente-details.component.css']
})
export class PacienteDetailsComponent implements OnInit, OnDestroy {
  // Signals para estado reactivo
  loading = signal(true);
  paciente = signal<Mascota | null>(null);
  statsResumen = signal<any>({});
  documentos = signal<any[]>([]);

  // Historia médica específica por paciente
  historiaClinica = signal<any[]>([]);
  historialEventos = signal<any[]>([]);
  historialAgrupado = signal<any[]>([]);
  private historiasEventos = signal<any[]>([]);
  private citasEventos = signal<any[]>([]);

  pacienteId!: string;

  // Suscripciones
  private photoUpdateSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private pacientesService: PacientesService,
    private citasService: CitasService,
    private consultasService: ConsultasService,
    private historiaClinicaService: HistoriaClinicaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.pacienteId = params['id'];
      this.loadPacienteDetails();
    });
    this.setupPhotoUpdateListener();
  }

  private loadPacienteDetails(): void {
    this.loading.set(true);

    if (!this.pacienteId) {
      this.loading.set(false);
      this.snackBar.open('ID de paciente no válido', 'Cerrar', { duration: 3000 });
      return;
    }

    // Cargar datos reales del paciente desde la API
    this.pacientesService.getMascotaById(this.pacienteId).subscribe({
      next: (response) => {
        // Verificar el formato de la respuesta
        let pacienteData: Mascota;

        if (response.success && response.data) {
          // El backend devuelve los datos del cliente mezclados con los de la mascota
          const rawData = response.data;

          // Restructurar para que coincida con la interfaz frontend
          pacienteData = {
            id_mascota: rawData.id_mascota,
            id_cliente: rawData.id_cliente,
            nombre: rawData.nombre,
            especie: rawData.especie,
            raza: rawData.raza,
            sexo: (sexoDbToFrontend(rawData.sexo) || 'M') as 'M' | 'H',
            fecha_nacimiento: rawData.fecha_nacimiento,
            peso: rawData.peso,
            color: rawData.color,
            microchip: rawData.microchip,
            foto_url: rawData.foto_url, // ¡FALTABA ESTE CAMPO!
            activo: rawData.activo,
            fecha_registro: rawData.created_at || rawData.fecha_registro,
            cliente: {
              id_cliente: rawData.id_cliente,
              nombre: rawData.nombre_cliente,
              telefono: rawData.telefono,
              email: rawData.email,
              direccion: rawData.direccion,
              activo: true
            }
          };
        } else if (response.id_mascota) {
          // Respuesta directa sin wrapper
          pacienteData = response;
        } else {
          throw new Error('Formato de respuesta inválido');
        }

        this.paciente.set(pacienteData);

        // Stats mock (por ahora hasta implementar la historia clínica)
        this.statsResumen.set({
          consultas: 0,
          historias: 0,
          citas: 0,
          adjuntos: 0,
          ultimaVisita: 'No hay registros',
          proximaCita: 'Sin citas programadas'
        });

        this.documentos.set([]);

        // Cargar historia clínica específica del paciente
        this.loadHistoriaClinica(pacienteData.id_mascota || this.pacienteId || 'unknown');

        // Cargar estadísticas de citas
        this.loadCitasStats(pacienteData.id_mascota || this.pacienteId || 'unknown');

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando detalles del paciente:', error);
        this.loading.set(false);

        let mensaje = 'Error al cargar los detalles del paciente';
        if (error.status === 404) {
          mensaje = 'Paciente no encontrado';
        }

        this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
        this.goBack();
      }
    });
  }

  private loadHistoriaClinica(pacienteId: string): void {
    // Cargar historias clínicas reales del backend (valoración inicial, seguimiento, fórmula, remisión)
    this.historiaClinicaService.getHistorias({ id_mascota: pacienteId, page: 1, limit: 50 }).subscribe({
      next: (response) => {
        let historiaData: any[] = [];
        const historiasRaw: any[] = response?.success && Array.isArray(response?.data) ? response.data : [];

        if (historiasRaw.length > 0) {
          // Mapear los datos del backend al formato del frontend
          historiaData = historiasRaw.map((historia: any) => ({
            id: historia.id_historia,
            source: 'historia',
            tipo: historia.tipo_documento,
            id_cita: historia.id_cita || null,
            codigo_historia: historia.codigo_historia,
            estado: String(historia.estado || '').toLowerCase().replace(' ', '_'),
            titulo: this.getHistoriaTitulo(historia.tipo_documento),
            fecha: historia.fecha,
            profesional: historia.veterinario_nombre || 'Veterinario',
            descripcion: `Documento ${this.getHistoriaTitulo(historia.tipo_documento)} · Código ${historia.codigo_historia || 'N/A'}`,
            medicamentos: []
          }));

          // Actualizar estadísticas del resumen
          this.statsResumen.update(stats => ({
            ...stats,
            consultas: historiaData.length,
            historias: historiaData.length,
            ultimaVisita: historiaData.length > 0 ? this.formatDate(historiaData[0].fecha) : 'No hay registros'
          }));
          this.loadDocumentosFromHistorias(historiasRaw);
        } else {
          this.documentos.set([]);
          this.statsResumen.update(stats => ({ ...stats, consultas: 0, adjuntos: 0, historias: 0 }));
        }

        this.historiaClinica.set(historiaData);
        this.historiasEventos.set(historiaData);
        this.rebuildHistorialEventos();
      },
      error: (error) => {
        console.error('Error cargando historia clínica:', error);
        this.historiaClinica.set([]);
        this.historiasEventos.set([]);
        this.rebuildHistorialEventos();
        this.documentos.set([]);
      }
    });
  }

  private loadCitasStats(pacienteId: string): void {
    // Cargar estadísticas de citas del paciente
    this.citasService.getCitasByPaciente(pacienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const citas = response.data;
          const citaDate = (c: any) => c.fecha_cita || c.fecha_inicio || c.fecha;

          // Buscar la próxima cita pendiente o confirmada
          const proximasCitas = citas.filter((c: any) =>
            ['pendiente', 'confirmada'].includes(c.estado) &&
            new Date(citaDate(c)) > new Date()
          ).sort((a: any, b: any) => new Date(citaDate(a)).getTime() - new Date(citaDate(b)).getTime());

          const citasPasadas = citas
            .filter((c: any) => ['completada', 'en_curso'].includes(String(c.estado || '').toLowerCase()) && new Date(citaDate(c)) <= new Date())
            .sort((a: any, b: any) => new Date(citaDate(b)).getTime() - new Date(citaDate(a)).getTime());

          const citasEventos = citas.map((c: any) => ({
            id: c.id_cita,
            source: 'cita',
            tipo: 'cita',
            id_historia: c.id_historia || null,
            codigo_cita: c.codigo_cita || null,
            estado: String(c.estado || '').toLowerCase().replace(' ', '_'),
            titulo: c.tipo || c.motivo || 'Cita',
            fecha: citaDate(c),
            profesional: c.veterinario_nombre || 'Veterinario',
            descripcion: `Cita ${String(c.estado || '').replace('_', ' ')}`,
            medicamentos: []
          }));
          this.citasEventos.set(citasEventos);
          this.rebuildHistorialEventos();

          // Actualizar estadísticas
          this.statsResumen.update(stats => ({
            ...stats,
            citas: citas.length,
            ultimaVisita: stats.ultimaVisita !== 'No hay registros'
              ? stats.ultimaVisita
              : (citasPasadas.length > 0 ? this.formatDate(citaDate(citasPasadas[0])) : 'No hay registros'),
            proximaCita: proximasCitas.length > 0 ? this.formatDate(citaDate(proximasCitas[0])) : 'Sin citas programadas'
          }));
        }
      },
      error: (error) => {
        console.error('Error cargando estadísticas de citas:', error);
        this.citasEventos.set([]);
        this.rebuildHistorialEventos();
      }
    });
  }

  // Utilidades
  calculateAge(fechaNacimiento?: string): string {
    if (!fechaNacimiento) return 'Edad desconocida';

    const birth = new Date(fechaNacimiento);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

    if (months < 12) {
      return `${months} meses`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years} años`;
    }
  }

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getEventIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      valoracion_inicial: 'assignment',
      seguimiento: 'repeat',
      formula: 'medication',
      remision: 'send',
      cita: 'event',
      consulta: 'medical_services'
    };
    return icons[tipo] || 'event';
  }

  getDocumentIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      certificado: 'verified',
      imagen: 'image',
      reporte: 'description',
      receta: 'receipt'
    };
    return icons[tipo] || 'insert_drive_file';
  }

  getDocumentUrl(doc: any): string {
    const ruta = doc?.ruta_archivo;
    if (!ruta) return '';
    if (String(ruta).startsWith('http')) return ruta;
    return `${environment.backendUrl}${ruta}`;
  }

  isImageDocument(doc: any): boolean {
    const mime = String(doc?.tipo || '').toLowerCase();
    if (mime.startsWith('image/')) return true;

    const nombre = String(doc?.nombre || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(nombre);
  }

  isPdfDocument(doc: any): boolean {
    const mime = String(doc?.tipo || '').toLowerCase();
    if (mime.includes('pdf')) return true;

    const nombre = String(doc?.nombre || '').toLowerCase();
    return nombre.endsWith('.pdf');
  }

  getDocumentExtension(doc: any): string {
    const nombre = String(doc?.nombre || '').toLowerCase();
    const fromName = nombre.includes('.') ? nombre.split('.').pop() || '' : '';
    if (fromName) return fromName;

    const mime = String(doc?.tipo || '').toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx';
    if (mime.includes('word')) return 'docx';
    if (mime.includes('csv')) return 'csv';
    if (mime.includes('text')) return 'txt';
    return 'file';
  }

  getDocumentTypeLabel(doc: any): string {
    return this.getDocumentExtension(doc).slice(0, 4).toUpperCase();
  }

  getDocumentTypeClass(doc: any): string {
    const ext = this.getDocumentExtension(doc);
    if (['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return `file-${ext}`;
    }
    return 'file-generic';
  }

  getDocumentTypeIcon(doc: any): string {
    const ext = this.getDocumentExtension(doc);
    if (ext === 'pdf') return 'picture_as_pdf';
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'table_chart';
    if (ext === 'doc' || ext === 'docx' || ext === 'txt') return 'article';
    return 'insert_drive_file';
  }

  getSafePdfDocumentThumbnailUrl(doc: any): SafeResourceUrl {
    const url = this.getDocumentUrl(doc);
    const thumbUrl = `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(thumbUrl);
  }

  // Acciones
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/pacientes']);
  }

  editPaciente(): void {
    this.router.navigate(['/pacientes', this.pacienteId, 'editar']);
  }

  newConsulta(): void {
    if (!this.paciente()?.id_mascota) {
      this.snackBar.open('Error: No se pudo identificar el paciente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.router.navigate(['/historia-clinica/nueva'], {
      queryParams: {
        pacienteId: this.paciente()?.id_mascota,
        pacienteNombre: this.paciente()?.nombre
      }
    });
  }

  newCita(): void {
    if (!this.paciente()?.id_mascota) {
      this.snackBar.open('Error: No se pudo identificar el paciente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.router.navigate(['/citas/nueva'], {
      queryParams: {
        pacienteId: this.paciente()?.id_mascota,
        pacienteNombre: this.paciente()?.nombre,
        clienteId: this.paciente()?.id_cliente,
        clienteNombre: this.paciente()?.cliente?.nombre
      }
    });
  }

  viewHistory(): void {
    if (!this.paciente()?.id_mascota) {
      this.snackBar.open('Error: No se pudo identificar el paciente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.router.navigate(['/historia-clinica'], {
      queryParams: {
        pacienteId: this.paciente()?.id_mascota,
        pacienteNombre: this.paciente()?.nombre
      }
    });
  }

  exportData(): void {
    if (!this.paciente()?.id_mascota) {
      this.snackBar.open('Error: No se pudo identificar el paciente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.snackBar.open('Preparando exportación de datos...', 'Cerrar', { duration: 2000 });

    // Open a blank tab synchronously so browsers don't block it as a popup.
    const previewTab = window.open('', '_blank', 'noopener,noreferrer');

    // Exportar historia clínica del paciente
    this.consultasService.exportarHistoriaClinica(this.paciente()!.id_mascota!, 'pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);

        if (previewTab) {
          previewTab.location.href = url;
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = `historia_clinica_${this.paciente()?.nombre}_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);

        this.snackBar.open('Historia clínica exportada exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        if (previewTab && !previewTab.closed) {
          previewTab.close();
        }
        console.error('Error exportando datos:', error);
        this.snackBar.open('Error al exportar los datos del paciente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  toggleStatus(): void {
    const paciente = this.paciente();
    if (!paciente) {
      return;
    }

    const action = paciente.activo ? 'desactivar' : 'activar';
    const message = `¿Estás seguro de ${action} a ${paciente.nombre}?`;

    if (confirm(message)) {
      const nuevoEstado = !paciente.activo;
      const datosEnviados = { activo: nuevoEstado };

      // Llamar al servicio para persistir el cambio
      this.pacientesService.updateMascota(paciente.id_mascota!, datosEnviados).subscribe({
        next: () => {
          // Actualizar el estado local solo si el servidor responde exitosamente
          paciente.activo = nuevoEstado;
          this.paciente.set({...paciente});

          this.snackBar.open(
            `${paciente.nombre} ha sido ${nuevoEstado ? 'activado' : 'desactivado'}`,
            'Cerrar',
            { duration: 3000 }
          );
        },
        error: (err) => {
          this.snackBar.open(
            extractError(err, 'Error al actualizar el estado del paciente'),
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    }
  }

  viewOwnerDetails(): void {
    const ownerId = this.paciente()?.cliente?.id_cliente;
    const ownerName = this.paciente()?.cliente?.nombre || '';

    if (!ownerId) {
      this.snackBar.open('No se encontró información del propietario', 'Cerrar', { duration: 3000 });
      return;
    }

    this.router.navigate(['/propietarios'], {
      queryParams: {
        ownerId,
        search: ownerName
      }
    });
  }

  callOwner(): void {
    const telefono = this.paciente()?.cliente?.telefono;
    if (telefono) {
      window.open(`tel:${telefono}`);
    }
  }

  emailOwner(): void {
    const email = this.paciente()?.cliente?.email;
    if (!email) {
      this.snackBar.open('El propietario no tiene correo registrado', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!navigator.clipboard) {
      this.snackBar.open(`Correo del propietario: ${email}`, 'Cerrar', { duration: 5000 });
      return;
    }

    navigator.clipboard.writeText(email).then(() => {
      this.snackBar.open('Correo del propietario copiado', 'Cerrar', { duration: 2500 });
    }).catch(() => {
      this.snackBar.open(`Correo del propietario: ${email}`, 'Cerrar', { duration: 5000 });
    });
  }

  showMap(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Mostrar en mapa', 'Cerrar', { duration: 3000 });
  }

  viewEventDetails(evento: any): void {
    if (evento?.source === 'historia' && evento?.id) {
      this.router.navigate(['/historia-clinica', evento.id]);
      return;
    }
    if (evento?.source === 'cita' && evento?.id) {
      this.router.navigate(['/citas', evento.id]);
      return;
    }
    this.snackBar.open('No se encontró el detalle del evento', 'Cerrar', { duration: 3000 });
  }

  uploadDocument(): void {
    const historia = this.historiaClinica();
    const historiaId = historia[0]?.id;

    if (!historiaId) {
      this.snackBar.open('Primero crea una historia clínica para adjuntar documentos', 'Cerrar', { duration: 3500 });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      this.historiaClinicaService.uploadHistoriaArchivos(historiaId, [file]).subscribe({
        next: () => {
          this.snackBar.open('Documento subido correctamente', 'Cerrar', { duration: 2500 });
          this.loadHistoriaClinica(this.paciente()?.id_mascota || this.pacienteId);
        },
        error: () => {
          this.snackBar.open('No se pudo subir el documento', 'Cerrar', { duration: 3000 });
        }
      });
    };
    input.click();
  }

  downloadDocument(doc: any): void {
    if (!doc?.ruta_archivo) {
      this.snackBar.open('Documento sin ruta de descarga', 'Cerrar', { duration: 3000 });
      return;
    }

    const link = document.createElement('a');
    link.href = `${environment.backendUrl}${doc.ruta_archivo}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = doc.nombre || 'documento';
    link.click();
  }

  private async loadDocumentosFromHistorias(historias: any[]): Promise<void> {
    const historiaIds = [...new Set((historias || []).map((h) => h.id_historia).filter(Boolean))];
    if (historiaIds.length === 0) {
      this.documentos.set([]);
      this.statsResumen.update((stats) => ({ ...stats, adjuntos: 0 }));
      return;
    }

    try {
      const responses = await Promise.all(
        historiaIds.map((historiaId) =>
          firstValueFrom(this.historiaClinicaService.getHistoriaById(historiaId)).catch(() => ({ data: { archivos: [] } }))
        )
      );

      const docs = responses
        .flatMap((r: any, idx: number) => {
          const idHistoria = historiaIds[idx];
          const files = Array.isArray(r?.data?.archivos) ? r.data.archivos : [];
          return files.map((d: any) => ({
            id: d.id_archivo,
            id_archivo: d.id_archivo,
            id_historia: idHistoria,
            nombre: d.nombre_original || d.nombre_archivo || 'Archivo',
            tipo: d.tipo_mime || 'archivo',
            descripcion: d.descripcion || 'Documento de historia clínica',
            fecha: d.fecha_subida || d.created_at,
            ruta_archivo: d.ruta_archivo
          }));
        })
        .sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

      this.documentos.set(docs);
      this.statsResumen.update((stats) => ({ ...stats, adjuntos: docs.length }));
    } catch {
      this.documentos.set([]);
      this.statsResumen.update((stats) => ({ ...stats, adjuntos: 0 }));
    }
  }

  // Funciones para cambio de foto
  changePhoto(): void {
    // Activar el input de archivo oculto
    const photoInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (photoInput) {
      photoInput.click();
    }
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Solo se permiten archivos de imagen', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('El archivo es demasiado grande. Máximo 5MB permitido.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Subir la foto inmediatamente
    if (!this.pacienteId) {
      this.snackBar.open('Error: ID de paciente no válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.pacientesService.uploadFotoPaciente(this.pacienteId, file).subscribe({
      next: (response) => {
        this.snackBar.open('Foto actualizada exitosamente', 'Cerrar', { duration: 3000 });
        // La actualización se hará automáticamente mediante el listener de photoUpdated$
      },
      error: (error) => {
        console.error('Error subiendo foto:', error);
        this.snackBar.open('Error al subir la foto', 'Cerrar', { duration: 3000 });
      }
    });

    // Limpiar el input
    event.target.value = '';
  }

  viewDocument(doc: any): void {
    const url = this.getDocumentUrl(doc);
    if (!url) {
      this.snackBar.open('No se puede previsualizar este documento', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(DocumentPreviewDialog, {
      data: {
        title: doc.nombre || 'Documento',
        url,
        mimeType: doc.tipo || ''
      },
      maxWidth: '92vw',
      maxHeight: '92vh',
      width: '960px'
    });
  }

  deleteDocument(doc: any): void {
    if (confirm(`¿Eliminar ${doc.nombre}?`)) {
      this.snackBar.open('Eliminar adjuntos de historia clínica aún no está habilitado en backend', 'Cerrar', { duration: 3500 });
    }
  }

  getHistoriaTitulo(tipo: string): string {
    const labels: Record<string, string> = {
      valoracion_inicial: 'Valoración',
      seguimiento: 'Terapia / Hidroterapia',
      formula: 'Fórmula',
      remision: 'Remisión'
    };
    return labels[tipo] || 'Historia Clínica';
  }

  shouldShowCitaColumn(grupo: any): boolean {
    return Boolean(grupo?.cita);
  }

  shouldShowHistoriaColumn(grupo: any): boolean {
    const historias = Array.isArray(grupo?.historias) ? grupo.historias : [];
    if (historias.length > 0) return true;

    const cita = grupo?.cita;
    if (!cita) return false;

    const estado = String(cita?.estado || '').toLowerCase();
    const noAtendida = ['pendiente', 'confirmada', 'programada'].includes(estado);
    const fecha = new Date(cita?.fecha || 0);
    const esFutura = !Number.isNaN(fecha.getTime()) && fecha.getTime() > Date.now();

    // Citas futuras no atendidas no muestran columna de historia.
    if (noAtendida && esFutura) return false;

    return true;
  }

  private rebuildHistorialEventos(): void {
    const merged = [...this.historiasEventos(), ...this.citasEventos()]
      .sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
    this.historialEventos.set(merged);

    const historias = [...this.historiasEventos()];
    const citas = [...this.citasEventos()].sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

    const historiaById = new Map<string, any>();
    const historiaByCitaId = new Map<string, any[]>();
    const usedHistoriaIds = new Set<string>();

    for (const historia of historias) {
      if (historia?.id) {
        historiaById.set(historia.id, historia);
      }
      if (historia?.id_cita) {
        const existentes = historiaByCitaId.get(historia.id_cita) || [];
        existentes.push(historia);
        historiaByCitaId.set(historia.id_cita, existentes);
      }
    }

    const grupos: any[] = [];

    for (const cita of citas) {
      const historiasRelacionadas: any[] = [];

      if (cita?.id_historia && historiaById.has(cita.id_historia)) {
        historiasRelacionadas.push(historiaById.get(cita.id_historia));
      }

      if (cita?.id && historiaByCitaId.has(cita.id)) {
        const historiasPorCita = historiaByCitaId.get(cita.id) || [];
        for (const historia of historiasPorCita) {
          if (!historiasRelacionadas.some((h: any) => h?.id === historia?.id)) {
            historiasRelacionadas.push(historia);
          }
        }
      }

      for (const historiaRelacionada of historiasRelacionadas) {
        if (historiaRelacionada?.id) {
          usedHistoriaIds.add(historiaRelacionada.id);
        }
      }

      grupos.push({
        key: `cita-${cita.id}`,
        fecha: cita.fecha,
        cita,
        historias: historiasRelacionadas,
      });
    }

    for (const historia of historias) {
      if (historia?.id && !usedHistoriaIds.has(historia.id)) {
        grupos.push({
          key: `historia-${historia.id}`,
          fecha: historia.fecha,
          cita: null,
          historias: [historia],
        });
      }
    }

    grupos.sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
    this.historialAgrupado.set(grupos);
  }

  // Utilidades para imágenes
  getImageUrl(fotoUrl: string): string {
    if (fotoUrl.startsWith('http')) {
      return fotoUrl;
    }
    return `${environment.backendUrl}${fotoUrl}`;
  }

  onImageError(event: any): void {
    // Ocultar la imagen rota y mostrar solo el ícono de respaldo
    event.target.style.display = 'none';
  }

  openImageDialog(imageUrl: string, patientName: string): void {
    this.dialog.open(ImageViewerDialog, {
      data: { imageUrl, patientName },
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'image-dialog'
    });
  }

  private setupPhotoUpdateListener(): void {
    // Escuchar cambios de fotos para actualizar la vista de detalles
    this.photoUpdateSubscription = this.pacientesService.photoUpdated$.subscribe(photoUpdate => {
      if (photoUpdate && photoUpdate.mascotaId === this.pacienteId) {
        // Actualizar la foto del paciente actual
        const currentPaciente = this.paciente();
        if (currentPaciente) {
          this.paciente.set({
            ...currentPaciente,
            foto_url: photoUpdate.fotoUrl
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.photoUpdateSubscription?.unsubscribe();
  }
}

// Componente de diálogo para mostrar imagen en grande
@Component({
  selector: 'app-image-viewer-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="image-dialog-content">
      <div class="dialog-header">
        <h2>{{ data.patientName }}</h2>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="image-container">
        <img [src]="data.imageUrl"
             [alt]="data.patientName"
             crossorigin="anonymous"
             (error)="onImageError($event)"
             class="full-image">
      </div>
    </div>
  `,
  styles: [`
    .image-dialog-content {
      padding: 0;
      max-width: 90vw;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .dialog-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.2rem;
    }

    .close-button {
      color: #666;
    }

    .image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: #f5f5f5;
    }

    .full-image {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
  `]
})
export class ImageViewerDialog {
  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { imageUrl: string, patientName: string }
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}

@Component({
  selector: 'app-document-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="doc-preview-dialog">
      <div class="dialog-header">
        <h2>{{ data.title }}</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="preview-body">
        @if (isImage()) {
          <img [src]="data.url" [alt]="data.title" class="preview-image" />
        } @else if (isPdf()) {
          @if (pdfLoading) {
            <div class="preview-fallback">
              <mat-icon>hourglass_top</mat-icon>
              <p>Cargando PDF...</p>
            </div>
          } @else if (pdfLoadError || !safePdfUrl) {
            <div class="preview-fallback">
              <mat-icon>error_outline</mat-icon>
              <p>No se pudo cargar la vista previa del PDF.</p>
              <button mat-raised-button color="primary" (click)="openNewTab()">Abrir archivo</button>
            </div>
          } @else {
            <iframe [src]="safePdfUrl" class="preview-pdf" title="Vista previa de documento"></iframe>
          }
        } @else {
          <div class="preview-fallback">
            <mat-icon>description</mat-icon>
            <p>Este tipo de archivo no tiene vista previa embebida.</p>
            <button mat-raised-button color="primary" (click)="openNewTab()">Abrir archivo</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .doc-preview-dialog { display: flex; flex-direction: column; height: 86vh; }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }
    .dialog-header h2 {
      margin: 0;
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-body {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f5f7;
      padding: 12px;
    }
    .preview-image {
      max-width: 100%;
      max-height: 100%;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .preview-pdf {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 8px;
      background: #fff;
    }
    .preview-fallback {
      text-align: center;
      color: #5f6368;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    .preview-fallback mat-icon { font-size: 42px; width: 42px; height: 42px; }
  `]
})
export class DocumentPreviewDialog {
  safePdfUrl: SafeResourceUrl | null = null;
  private objectUrl: string | null = null;
  pdfLoading = false;
  pdfLoadError = false;

  constructor(
    public dialogRef: MatDialogRef<DocumentPreviewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; url: string; mimeType: string },
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    if (this.isPdf()) {
      this.loadPdfAsBlob();
    }
  }

  private loadPdfAsBlob(): void {
    this.pdfLoading = true;
    this.pdfLoadError = false;

    this.http.get(this.data.url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (!blob || blob.size === 0) {
          this.pdfLoadError = true;
          this.pdfLoading = false;
          return;
        }

        const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        this.objectUrl = URL.createObjectURL(pdfBlob);
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
        this.pdfLoading = false;
      },
      error: () => {
        this.pdfLoadError = true;
        this.pdfLoading = false;
      }
    });
  }

  close(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.dialogRef.close();
  }

  isImage(): boolean {
    const type = (this.data.mimeType || '').toLowerCase();
    return type.startsWith('image/');
  }

  isPdf(): boolean {
    const type = (this.data.mimeType || '').toLowerCase();
    return type.includes('pdf') || this.data.url.toLowerCase().endsWith('.pdf');
  }

  openNewTab(): void {
    window.open(this.data.url, '_blank', 'noopener');
  }
}
