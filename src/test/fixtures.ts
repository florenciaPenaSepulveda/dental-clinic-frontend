import type { Archivo, Atencion, Dentista, HistorialItem, Paciente, Reserva, Rol, Servicio, Slot, SlotDisponible, SlotSemana } from "../api/types";
import type { Sesion } from "../lib/session";

export const dentista: Dentista = {
  id: 1,
  nombre: "Ana",
  apellido: "Pérez",
  especialidad: "Ortodoncia",
  email: "ana@clinica.cl",
  telefono: "",
  region: { id: 1, nombre: "Biobío", codigo: "08" },
  max_overbook_day: 1,
};

export const dentistaSinEspecialidad: Dentista = { ...dentista, id: 2, nombre: "Luis", apellido: "Rojas", especialidad: "", region: null };

export const servicio: Servicio = { id: 1, nombre: "Limpieza", duracion_min: 30, precio: "25000.00" };

export const paciente: Paciente = {
  id: 1,
  rut: "12.345.678-5",
  nombre: "Juan",
  apellido: "Soto",
  telefono: "+56912345678",
  email: "juan@test.cl",
  fecha_registro: "2026-10-20T10:00:00Z",
};

export const pacienteSinContacto: Paciente = { ...paciente, id: 2, rut: "11.111.111-1", nombre: "Marta", apellido: "Ríos", telefono: "", email: "" };

export const slot = (id: number, hora: string, capacidad = 1, max_overbook = 0): Slot => ({
  id,
  dentista: "Ana Pérez - Ortodoncia",
  servicio: null,
  fecha: "2026-10-25",
  hora,
  capacidad,
  max_overbook,
});

export const disponible = (id: number, hora: string, capacidad = 1, max_overbook = 0, reservas_count = 0, sobrecupos_count = 0): SlotDisponible => ({
  ...slot(id, hora, capacidad, max_overbook),
  reservas_count,
  sobrecupos_count,
});

export const reserva = (id: number, slotId: number, sobrecupo = false): Reserva => ({
  id,
  slot: slot(slotId, "09:00:00"),
  paciente,
  servicio: sobrecupo ? null : servicio,
  creado_en: "2026-10-24T10:00:00Z",
  sobrecupo,
  estado: "pendiente",
  motivo: "",
  observaciones: "",
  archivos: [],
  atencion: null,
});

export const archivo = (id = 1, nombre = "examen.pdf"): Archivo => ({ id, nombre, tipo: "application/pdf", tamano: 2048, subido_en: "2026-10-24T10:00:00Z" });

export const atencion: Atencion = {
  diagnostico: "Caries oclusal",
  procedimiento: "Restauración con resina",
  indicaciones: "Evitar alimentos duros",
  actualizado_en: "2026-10-24T10:00:00Z",
};

export const slotSemana = (id: number, fecha: string, hora: string, reservas: Reserva[] = [], capacidad = 1, max_overbook = 0): SlotSemana => ({
  id,
  dentista: 1,
  fecha,
  hora,
  capacidad,
  max_overbook,
  reservas,
});

export const historialItem = (id: number, extra: Partial<HistorialItem> = {}): HistorialItem => ({
  id,
  fecha: "2026-09-10",
  hora: "09:00:00",
  dentista: { id: 1, nombre: "Ana Pérez", especialidad: "Ortodoncia" },
  servicio: "Limpieza",
  estado: "atendida",
  motivo: "",
  archivos: [],
  atencion,
  ...extra,
});

export const sesionDe = (rol: Rol): Sesion => ({
  token: "token-de-prueba",
  username: rol === "paciente" ? "12.345.678-5" : rol === "dentista" ? "dr.perez" : "recepcion",
  rol,
  nombre: rol === "paciente" ? "Juan Soto" : rol === "dentista" ? "Ana Pérez" : "recepcion",
  ...(rol === "dentista" ? { dentista_id: 1 } : {}),
  ...(rol === "paciente" ? { paciente_id: 1 } : {}),
});
