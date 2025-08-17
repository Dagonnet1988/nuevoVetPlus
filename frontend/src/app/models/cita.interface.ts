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
  precio?: number;
  google_event_id?: string;
  recordatorio_enviado?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;

  // Datos relacionados para el frontend (estructura anidada)
  mascota?: {
    nombre: string;
    especie: string;
    raza?: string;
    cliente?: {
      nombre: string;
      telefono?: string;
      email?: string;
    };
  };
  veterinario?: {
    nombre: string;
    especialidad?: string;
    email?: string;
  };

  // Campos planos que viene del backend (estructura flat)
  mascota_nombre?: string;
  mascota_especie?: string;
  mascota_raza?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  veterinario_nombre?: string;
  veterinario_especialidad?: string;
  veterinario_email?: string;
}

export type TipoCita =
  | 'consulta_general'
  | 'vacunacion'
  | 'cirugia'
  | 'control'
  | 'emergencia'
  | 'revision'
  | 'desparasitacion'
  | 'estetica'
  | 'otro';

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'en_progreso'
  | 'completada'
  | 'cancelada'
  | 'no_asistio';

export interface CitaFormData {
  id_mascota: string;
  id_veterinario: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoCita;
  estado?: EstadoCita;
  motivo?: string;
  observaciones?: string;
  precio?: number;
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
  { value: 'consulta_general', label: 'Consulta General', color: '#2196f3' },
  { value: 'vacunacion', label: 'Vacunación', color: '#4caf50' },
  { value: 'cirugia', label: 'Cirugía', color: '#f44336' },
  { value: 'control', label: 'Control', color: '#ff9800' },
  { value: 'emergencia', label: 'Emergencia', color: '#e91e63' },
  { value: 'revision', label: 'Revisión', color: '#9c27b0' },
  { value: 'desparasitacion', label: 'Desparasitación', color: '#00bcd4' },
  { value: 'estetica', label: 'Estética', color: '#cddc39' },
  { value: 'otro', label: 'Otro', color: '#607d8b' }
];

export const ESTADOS_CITA: { value: EstadoCita; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: '#ff9800' },
  { value: 'confirmada', label: 'Confirmada', color: '#2196f3' },
  { value: 'en_progreso', label: 'En Progreso', color: '#9c27b0' },
  { value: 'completada', label: 'Completada', color: '#4caf50' },
  { value: 'cancelada', label: 'Cancelada', color: '#607d8b' },
  { value: 'no_asistio', label: 'No Asistió', color: '#f44336' }
];
