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
  tiene_cuenta: boolean;
}

export type DentistaInput = Pick<Dentista, "nombre" | "apellido" | "especialidad" | "email" | "telefono" | "max_overbook_day">;

export interface CuentaCreada {
  username: string;
  password: string;
  creada: boolean;
}

export interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: string;
}

export type ServicioInput = Omit<Servicio, "id">;

export interface DiaSobrecupo {
  fecha: string;
  permitidos: number;
  usados: number;
  personalizado: boolean;
}

export interface ResumenSobrecupos {
  por_defecto: number;
  dias: DiaSobrecupo[];
}

export type MotivoConflicto = "superpuesta" | "excede";

export interface ConflictoDeServicio {
  id: number;
  fecha: string;
  hora: string;
  paciente: string;
  dentista: string;
  dentista_id: number;
  servicio: string | null;
  motivo: MotivoConflicto;
}

export interface ConflictosDeServicio {
  duracion_actual: number;
  duracion_nueva: number;
  conflictos: ConflictoDeServicio[];
}

export interface Pagina<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Paciente {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fecha_registro: string;
  tiene_cuenta: boolean;
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
}

export interface SlotDisponible extends Slot {
  reservas_count: number;
  sobrecupos_count: number;
  bloqueado: boolean;
  cabe: boolean;
  sobrecupo_disponible: boolean;
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
  reservas: Reserva[];
  bloqueado: boolean;
  conflictos: { reserva: number; motivo: MotivoConflicto }[];
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
  sobrecupo?: boolean;
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
