import type { Dentista, Paciente, Reserva, Servicio, Slot } from "../api/types";

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

export const reserva = (id: number, slotId: number, sobrecupo = false): Reserva => ({
  id,
  slot: slot(slotId, "09:00:00"),
  paciente,
  servicio: sobrecupo ? null : servicio,
  creado_en: "2026-10-24T10:00:00Z",
  sobrecupo,
});
