export interface EventoCalendario {
  id_evento: string;
  titulo: string;
  descripcion?: string | null;
  /** Hora local sin zona, formato YYYY-MM-DDTHH:mm:ss */
  fecha_inicio: string;
  fecha_fin: string;
  id_creador: string;
  creador_nombre?: string;
  compartido_con: string[];
  es_propio: boolean;
  google_sync_status?: string;
  google_sync_error?: string | null;
}

export interface EventoCalendarioPayload {
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  compartido_con: string[];
}

export interface UsuarioCompartible {
  id_usuario: string;
  nombre: string;
  rol: string;
}
