import { extractError } from '../../utils/error.utils';
import { Component, OnInit, OnDestroy, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { PacientesService } from '../../services/pacientes.service';
import { CitasService } from '../../services/citas.service';
import { ConsultasService } from '../../services/consultas.service';
import { ConsentimientoStatusComponent } from '../consentimiento-status/consentimiento-status.component';
import { Mascota, Cliente } from '../../models/paciente.interface';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

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
  activeFilter = signal('all');
  documentos = signal<any[]>([]);

  // Historia médica específica por paciente
  historiaClinica = signal<any[]>([]);

  mockDocumentos = [
    {
      id: '1',
      nombre: 'Certificado de Vacunación',
      tipo: 'certificado',
      descripcion: 'Certificado actualizado de vacunas',
      fecha: '2024-01-15'
    },
    {
      id: '2',
      nombre: 'Radiografía Torácica',
      tipo: 'imagen',
      descripcion: 'Radiografía para diagnóstico',
      fecha: '2024-01-10'
    }
  ];

  pacienteId!: string;

  // Suscripciones
  private photoUpdateSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacientesService: PacientesService,
    private citasService: CitasService,
    private consultasService: ConsultasService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
          citas: 0,
          vacunas: 0,
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
    // Cargar historia clínica real desde el backend
    this.consultasService.getHistoriaClinicaMascota(pacienteId).subscribe({
      next: (response) => {
        let historiaData: any[] = [];

        if (response.success && response.data && response.data.length > 0) {
          // Mapear los datos del backend al formato del frontend
          historiaData = response.data.map((consulta: any) => ({
            id: consulta.id_consulta,
            tipo: 'consulta',
            titulo: consulta.motivo || 'Consulta general',
            fecha: consulta.fecha_consulta,
            profesional: consulta.veterinario?.nombre || 'Veterinario',
            descripcion: consulta.diagnostico || consulta.anamnesis || 'Sin descripción disponible',
            medicamentos: (() => {
              const meds = consulta.medicamentos;
              if (!meds) return [];
              if (Array.isArray(meds)) {
                return meds.map((m: any) =>
                  typeof m === 'string' ? m : `${m.nombre}${m.dosis ? ' - ' + m.dosis : ''}`
                );
              }
              // fallback: string separado por comas
              return String(meds).split(',').map((m: string) => m.trim());
            })()
          }));

          // Actualizar estadísticas del resumen
          this.statsResumen.update(stats => ({
            ...stats,
            consultas: historiaData.length,
            ultimaVisita: historiaData.length > 0 ? this.formatDate(historiaData[0].fecha) : 'No hay registros'
          }));
        } else {
          // Si no hay consultas, mostrar mensaje por defecto
          historiaData = [{
            id: `${pacienteId}-placeholder`,
            tipo: 'consulta',
            titulo: 'Sin registros médicos',
            fecha: new Date().toISOString().split('T')[0],
            profesional: 'Sistema',
            descripcion: 'Este paciente no tiene historia clínica registrada aún.',
            medicamentos: []
          }];
        }

        this.historiaClinica.set(historiaData);
      },
      error: (error) => {
        console.error('Error cargando historia clínica:', error);
        // En caso de error, mostrar datos por defecto
        this.historiaClinica.set([{
          id: `${pacienteId}-error`,
          tipo: 'consulta',
          titulo: 'Error al cargar historial',
          fecha: new Date().toISOString().split('T')[0],
          profesional: 'Sistema',
          descripcion: 'No se pudo cargar la historia clínica del paciente.',
          medicamentos: []
        }]);
      }
    });
  }

  private loadCitasStats(pacienteId: string): void {
    // Cargar estadísticas de citas del paciente
    this.citasService.getCitasByPaciente(pacienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const citas = response.data;

          // Buscar la próxima cita pendiente o confirmada
          const proximasCitas = citas.filter((c: any) =>
            ['pendiente', 'confirmada'].includes(c.estado) &&
            new Date(c.fecha_cita) > new Date()
          ).sort((a: any, b: any) => new Date(a.fecha_cita).getTime() - new Date(b.fecha_cita).getTime());

          // Actualizar estadísticas
          this.statsResumen.update(stats => ({
            ...stats,
            citas: citas.length,
            proximaCita: proximasCitas.length > 0 ? this.formatDate(proximasCitas[0].fecha_cita) : 'Sin citas programadas'
          }));
        }
      },
      error: (error) => {
        console.error('Error cargando estadísticas de citas:', error);
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

  filteredHistory() {
    const filter = this.activeFilter();
    if (filter === 'all') return this.historiaClinica();
    return this.historiaClinica().filter(evento => evento.tipo === filter);
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  getEventIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      consulta: 'medical_services',
      vacuna: 'vaccines',
      tratamiento: 'medication',
      cirugia: 'healing'
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

  // Acciones
  goBack(): void {
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

    // Exportar historia clínica del paciente
    this.consultasService.exportarHistoriaClinica(this.paciente()!.id_mascota!, 'pdf').subscribe({
      next: (blob) => {
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historia_clinica_${this.paciente()?.nombre}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.snackBar.open('Historia clínica exportada exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
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
    this.snackBar.open('Funcionalidad en desarrollo - Detalles del propietario', 'Cerrar', { duration: 3000 });
  }

  callOwner(): void {
    const telefono = this.paciente()?.cliente?.telefono;
    if (telefono) {
      window.open(`tel:${telefono}`);
    }
  }

  emailOwner(): void {
    const email = this.paciente()?.cliente?.email;
    if (email) {
      window.open(`mailto:${email}`);
    }
  }

  showMap(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Mostrar en mapa', 'Cerrar', { duration: 3000 });
  }

  viewEventDetails(evento: any): void {
    this.snackBar.open(`Ver detalles de: ${evento.titulo}`, 'Cerrar', { duration: 3000 });
  }

  uploadDocument(): void {
    this.snackBar.open('Funcionalidad en desarrollo - Subir documento', 'Cerrar', { duration: 3000 });
  }

  downloadDocument(doc: any): void {
    this.snackBar.open(`Descargando: ${doc.nombre}`, 'Cerrar', { duration: 3000 });
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
    this.snackBar.open(`Visualizando: ${doc.nombre}`, 'Cerrar', { duration: 3000 });
  }

  deleteDocument(doc: any): void {
    if (confirm(`¿Eliminar ${doc.nombre}?`)) {
      this.snackBar.open(`${doc.nombre} eliminado`, 'Cerrar', { duration: 3000 });
    }
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
