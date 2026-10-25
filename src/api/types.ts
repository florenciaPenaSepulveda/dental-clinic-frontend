export interface Region {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Dentista {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  telefono: string;
  region: Region | null;
  max_overbook_day: number;
}

export interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: string;
}

export interface Paciente {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fecha_registro: string;
}

export interface PacienteInput {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
}

export interface Slot {
  id: number;
  dentista: string;
  servicio: string | null;
  fecha: string;
  hora: string;
  capacidad: number;
  max_overbook: number;
}

export interface SlotDisponible extends Slot {
  reservas_count: number;
  sobrecupos_count: number;
}

export type Rol = "recepcion" | "dentista" | "paciente";

export type EstadoReserva = "pendiente" | "atendida" | "no_asistio";

export interface Archivo {
  id: number;
  nombre: string;
  tipo: string;
  tamano: number;
  subido_en: string;
}

export interface Atencion {
  diagnostico: string;
  procedimiento: string;
  indicaciones: string;
  actualizado_en: string;
}

export interface Reserva {
  id: number;
  slot: Slot;
  paciente: Paciente;
  servicio: Servicio | null;
  creado_en: string;
  sobrecupo: boolean;
  estado: EstadoReserva;
  motivo: string;
  observaciones: string;
  archivos: Archivo[];
  atencion: Atencion | null;
}

export interface SlotSemana {
  id: number;
  dentista: number;
  fecha: string;
  hora: string;
  capacidad: number;
  max_overbook: number;
  reservas: Reserva[];
}

export interface HistorialItem {
  id: number;
  fecha: string;
  hora: string;
  dentista: { id: number; nombre: string; especialidad: string };
  servicio: string | null;
  estado: EstadoReserva;
  motivo: string;
  archivos: Archivo[];
  atencion: Atencion | null;
  observaciones?: string;
}

export interface MiHistorial {
  paciente: Paciente;
  proximas: HistorialItem[];
  historial: HistorialItem[];
}

export interface ReservaInput {
  slot: number;
  paciente: number;
  servicio?: number;
  motivo?: string;
}

export interface ReservaCambios {
  estado?: EstadoReserva;
  observaciones?: string;
  servicio?: number | null;
  slot?: number;
}

export type AtencionInput = Pick<Atencion, "diagnostico" | "procedimiento" | "indicaciones">;

export interface ReservaCreada {
  id: number;
  sobrecupo: boolean;
}

export interface GenerarSlotsInput {
  fecha: string;
  desde: string;
  hasta: string;
  dias: number;
}
