import type {
  Dentista,
  GenerarSlotsInput,
  Paciente,
  PacienteInput,
  Reserva,
  ReservaCreada,
  Servicio,
  Slot,
} from "./types";

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
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
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
  dentistas: () => request<Dentista[]>("/api/dentistas/"),
  servicios: () => request<Servicio[]>("/api/servicios/"),
  pacientes: () => request<Paciente[]>("/api/pacientes/"),
  crearPaciente: (data: PacienteInput) =>
    request<Paciente>("/api/pacientes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarPaciente: (id: number, data: PacienteInput) =>
    request<Paciente>(`/api/pacientes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarPaciente: (id: number) => request<void>(`/api/pacientes/${id}/`, { method: "DELETE" }),
  slotsPorFecha: (fecha: string, dentistaId?: number) =>
    request<Slot[]>(`/slots_por_fecha/${query({ fecha, dentista_id: dentistaId })}`),
  reservas: (filtros: { fecha?: string; dentista?: number } = {}) =>
    request<Reserva[]>(`/api/reservas/${query(filtros)}`),
  crearReserva: (data: { slot: number; paciente: number; servicio?: number }) =>
    request<ReservaCreada>("/reservas/", { method: "POST", body: JSON.stringify(data) }),
  cancelarReserva: (id: number) => request<void>(`/api/reservas/${id}/`, { method: "DELETE" }),
  generarSlots: (dentistaId: number, data: GenerarSlotsInput) =>
    request<{ created: number }>(`/dentistas/${dentistaId}/generar_slots/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
