export interface Cliente {
  id_cliente?: string;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  cedula?: string;
  fecha_registro?: string;
  activo?: boolean;
}

export interface Mascota {
  id_mascota?: string;
  id_cliente: string;
  nombre: string;
  especie: string;
  raza?: string;
  sexo: 'M' | 'H';
  fecha_nacimiento?: string;
  peso?: number;
  color?: string;
  microchip?: string;
  notas?: string;
  activo?: boolean;
  fecha_registro?: string;
  // Datos del cliente para la vista
  cliente?: Cliente;
}

export interface PacienteCompleto {
  cliente: Cliente;
  mascotas: Mascota[];
}

export interface PacienteFormData {
  // Datos del cliente
  nombre_cliente: string;
  telefono: string;
  email?: string;
  direccion?: string;
  cedula?: string;
  
  // Datos de la mascota principal
  nombre_mascota: string;
  especie: string;
  raza?: string;
  sexo: 'M' | 'H';
  fecha_nacimiento?: string;
  peso?: number;
  color?: string;
  microchip?: string;
  notas?: string;
}

export interface PacienteFilter {
  search?: string;
  especie?: string;
  cliente?: string;
  activo?: boolean;
}

export interface PacienteResponse {
  success: boolean;
  data: Mascota[];
  total: number;
  page: number;
  limit: number;
}