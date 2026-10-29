import type {
  Archivo,
  AtencionInput,
  CuentaCreada,
  Dentista,
  DentistaInput,
  GenerarSlotsInput,
  HistorialItem,
  MiHistorial,
  Paciente,
  PacienteInput,
  Pagina,
  Reserva,
  ReservaCambios,
  ReservaCreada,
  ReservaInput,
  Servicio,
  ServicioInput,
  ConflictosDeServicio,
  ResumenSobrecupos,
  SlotDisponible,
  SlotSemana,
} from "./types";
import { borrarSesion, leerSesion, type Sesion } from "../lib/session";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/agenda").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const messageFrom = (body: unknown, status: number): string => {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const data = body as Record<string, unknown>;
    if (typeof data.detail === "string") {
      return data.detail;
    }
    for (const [field, value] of Object.entries(data)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string") {
        return field === "non_field_errors" ? first : `${field}: ${first}`;
      }
    }
  }
  return `La solicitud falló (código ${status}).`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const sesion = leerSesion();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(sesion ? { Authorization: `Token ${sesion.token}` } : {}),
      },
      ...init,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.", 0);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && sesion) {
      borrarSesion();
    }
    throw new ApiError(messageFrom(body, response.status), response.status);
  }
  return body as T;
};

const query = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const api = {
  login: (username: string, password: string) =>
    request<Sesion>("/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/auth/logout/", { method: "POST" }),
  dentistas: () => request<Dentista[]>("/api/dentistas/"),
  crearDentista: (data: DentistaInput) => request<Dentista>("/api/dentistas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarDentista: (id: number, data: DentistaInput) =>
    request<Dentista>(`/api/dentistas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  cuentaDentista: (id: number) => request<CuentaCreada>(`/api/dentistas/${id}/cuenta/`, { method: "POST" }),
  cuentaPaciente: (id: number) => request<CuentaCreada>(`/api/pacientes/${id}/cuenta/`, { method: "POST" }),
  cambiarClave: (actual: string, nueva: string) =>
    request<Sesion>("/auth/cambiar-clave/", { method: "POST", body: JSON.stringify({ actual, nueva }) }),
  servicios: () => request<Servicio[]>("/api/servicios/"),
  crearServicio: (data: ServicioInput) => request<Servicio>("/api/servicios/", { method: "POST", body: JSON.stringify(data) }),
  sobrecupos: (dentistaId: number, desde: string) =>
    request<ResumenSobrecupos>(`/sobrecupos/${query({ dentista: dentistaId, desde })}`),
  fijarSobrecupos: (data: { dentista: number; fecha?: string; cupos: number | null }) =>
    request<unknown>("/sobrecupos/", { method: "PUT", body: JSON.stringify(data) }),
  conflictosDeServicio: (id: number, duracionMin: number) =>
    request<ConflictosDeServicio>(`/api/servicios/${id}/conflictos/${query({ duracion_min: duracionMin })}`),
  actualizarServicio: (id: number, data: ServicioInput) =>
    request<Servicio>(`/api/servicios/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  pacientes: (filtros: { q?: string; page?: number } = {}) => request<Pagina<Paciente>>(`/api/pacientes/${query(filtros)}`),
  buscarPaciente: async (rut: string): Promise<Paciente | null> => {
    try {
      return await request<Paciente>(`/api/pacientes/buscar/${query({ rut })}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  crearPaciente: (data: PacienteInput) =>
    request<Paciente>("/api/pacientes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarPaciente: (id: number, data: PacienteInput) =>
    request<Paciente>(`/api/pacientes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarPaciente: (id: number) => request<void>(`/api/pacientes/${id}/`, { method: "DELETE" }),
  slotsPorFecha: (fecha: string, dentistaId?: number, servicioId?: number) =>
    request<SlotDisponible[]>(`/slots_por_fecha/${query({ fecha, dentista_id: dentistaId, servicio_id: servicioId })}`),
  crearReserva: (data: ReservaInput, archivos: File[] = []) => {
    if (archivos.length === 0) {
      return request<ReservaCreada>("/reservas/", { method: "POST", body: JSON.stringify(data) });
    }
    const form = new FormData();
    Object.entries(data).forEach(([campo, valor]) => valor !== undefined && form.append(campo, String(valor)));
    archivos.forEach((archivo) => form.append("archivos", archivo));
    return request<ReservaCreada>("/reservas/", { method: "POST", body: form });
  },
  actualizarReserva: (id: number, cambios: ReservaCambios) =>
    request<Reserva>(`/api/reservas/${id}/`, { method: "PATCH", body: JSON.stringify(cambios) }),
  guardarAtencion: (id: number, datos: AtencionInput) =>
    request<Reserva>(`/api/reservas/${id}/atencion/`, { method: "PUT", body: JSON.stringify(datos) }),
  subirArchivos: (id: number, archivos: File[]) => {
    const form = new FormData();
    archivos.forEach((archivo) => form.append("archivos", archivo));
    return request<Archivo[]>(`/api/reservas/${id}/archivos/`, { method: "POST", body: form });
  },
  eliminarArchivo: (id: number) => request<void>(`/archivos/${id}/`, { method: "DELETE" }),
  archivo: async (id: number): Promise<Blob> => {
    const sesion = leerSesion();
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/archivos/${id}/`, { headers: sesion ? { Authorization: `Token ${sesion.token}` } : {} });
    } catch {
      throw new ApiError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.", 0);
    }
    if (!response.ok) {
      if (response.status === 401 && sesion) {
        borrarSesion();
      }
      throw new ApiError(messageFrom(await response.json().catch(() => null), response.status), response.status);
    }
    return response.blob();
  },
  semana: (desde: string, dentistaId?: number) => request<SlotSemana[]>(`/semana/${query({ desde, dentista: dentistaId })}`),
  historialPaciente: (id: number) => request<HistorialItem[]>(`/api/pacientes/${id}/historial/`),
  miHistorial: () => request<MiHistorial>("/mi/historial/"),
  activarCuenta: (rut: string, email: string, password: string) =>
    request<Sesion>("/auth/activar-cuenta/", { method: "POST", body: JSON.stringify({ rut, email, password }) }),
  cancelarReserva: (id: number) => request<void>(`/api/reservas/${id}/`, { method: "DELETE" }),
  generarSlots: (dentistaId: number, data: GenerarSlotsInput) =>
    request<{ created: number; existing: number }>(`/dentistas/${dentistaId}/generar_slots/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
