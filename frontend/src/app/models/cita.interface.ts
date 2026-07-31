export interface Cita {
  id_cita: string;
  codigo_cita: string;
  id_mascota: string;
  id_veterinario: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo?: string;
  observaciones?: string;
  google_event_id?: string;
  google_sync_status?: 'pending' | 'synced' | 'failed' | 'disabled' | 'conflict';
  google_sync_error?: string;
  recordatorio_enviado?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;

  // Datos relacionados para el frontend (estructura anidada)
  mascota?: {
    nombre: string;
    especie: string;
    raza?: string;
    foto_url?: string;
    cliente?: {
      nombre: string;
      documento?: string;
      telefono?: string;
      email?: string;
      direccion?: string;
    };
  };
  veterinario?: {
    nombre: string;
    especialidad?: string;
    email?: string;
    avatar_url?: string;
  };

  // Campos planos que viene del backend (estructura flat)
  mascota_nombre?: string;
  mascota_especie?: string;
  mascota_raza?: string;
  mascota_foto_url?: string;
  cliente_nombre?: string;
  cliente_documento?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  cliente_direccion?: string;
  veterinario_nombre?: string;
  veterinario_especialidad?: string;
  veterinario_email?: string;
  veterinario_avatar_url?: string;
}

export type TipoCita =
  | 'valoracion'
  | 'hidroterapia'
  | 'terapia'
  | 'domicilio'
  | 'sin_clasificar'
  | 'control'
  // Legacy support
  | 'consulta_general'
  | 'vacunacion'
  | 'cirugia'
  | 'emergencia'
  | 'revision'
  | 'desparasitacion'
  | 'estetica'
  | 'otro';

export type EstadoCita =
  | 'confirmada'
  | 'en_curso'
  | 'completada'
  | 'no_asistio'
  | 'cancelada';

export interface CitaFormData {
  id_mascota: string;
  id_veterinario: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoCita;
  estado?: EstadoCita;
  motivo?: string;
  observaciones?: string;
}

export interface RecurrenciaConfig {
  frecuencia: 'daily' | 'weekly';
  intervalo?: number;
  dias_semana?: number[];
  total_ocurrencias?: number;
  fecha_hasta?: string;
}

export interface RecurringAppointmentPayload {
  id_mascota: string;
  id_veterinario: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo?: TipoCita;
  motivo?: string;
  notas?: string;
  observaciones?: string;
  recurrencia: RecurrenciaConfig;
  ocurrencias_editadas?: RecurringEditedOccurrence[];
}

export interface RecurringPreviewItem {
  indice: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface RecurringEditedOccurrence {
  indice: number;
  fecha_inicio: string;
  fecha_fin: string;
  tipo?: TipoCita;
}

export interface CitaFilter {
  fecha_inicio?: string;
  fecha_fin?: string;
  id_veterinario?: string;
  estado?: EstadoCita;
  tipo?: TipoCita;
  search?: string;
}

export interface CalendarView {
  vista: 'mes' | 'semana' | 'dia';
  fecha: string;
}

export interface HorarioDisponible {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  id_veterinario: string;
}

export interface VeterinarioDisponibilidad {
  id_veterinario: string;
  nombre: string;
  horarios: HorarioDisponible[];
}

export interface SugerenciaHorario {
  fecha_inicio: string;
  fecha_fin: string;
  id_veterinario: string;
  veterinario_nombre: string;
  disponible: boolean;
}

export interface CitaCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  textColor: string;
  extendedProps: {
    cita: Cita;
    tipo: TipoCita;
    estado: EstadoCita;
  };
}

export interface CitaStats {
  total_citas: number;
  citas_hoy: number;
  citas_pendientes: number;
  citas_completadas: number;
  tasa_ocupacion: number;
}

// Constantes para tipos y estados
export const TIPOS_CITA: { value: TipoCita; label: string; color: string }[] = [
  { value: 'domicilio', label: 'Domicilio', color: '#51b749' },
  { value: 'control', label: 'Control', color: '#e09a5f' },
  { value: 'valoracion', label: 'Valoración', color: '#fbd75b' },
  { value: 'terapia', label: 'Terapia', color: '#46d6db' },
  { value: 'hidroterapia', label: 'Hidroterapia', color: '#5484ed' },
  { value: 'sin_clasificar', label: 'Sin clasificar', color: '#c7d0d8' }
];

export const ESTADOS_CITA: { value: EstadoCita; label: string; color: string }[] = [
  { value: 'confirmada', label: 'Confirmada', color: '#2196f3' },
  { value: 'en_curso', label: 'En Curso', color: '#9c27b0' },
  { value: 'completada', label: 'Completa', color: '#4caf50' },
  { value: 'no_asistio', label: 'No Asistió', color: '#f44336' },
  // No es una transición manual disponible: solo se llega acá vía el flujo
  // dedicado de "Cancelar cita" (valida que no tenga historia clínica y
  // elimina el evento de Google). Se incluye aquí para que el badge/label
  // se muestren bien donde se necesite consultar el estado.
  { value: 'cancelada', label: 'Cancelada', color: '#9e9e9e' }
];
