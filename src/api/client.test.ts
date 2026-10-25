import { api, ApiError } from "./client";

const respond = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );

describe("cliente de la API", () => {
  it("lee los catálogos", async () => {
    const spy = respond([{ id: 1 }]);
    await expect(api.dentistas()).resolves.toEqual([{ id: 1 }]);
    await api.servicios();
    await api.pacientes();
    expect(spy.mock.calls.map(([url]) => String(url).replace(/^.*\/agenda/, ""))).toEqual([
      "/api/dentistas/",
      "/api/servicios/",
      "/api/pacientes/",
    ]);
  });

  it("construye los filtros de horarios y reservas", async () => {
    const spy = respond([]);
    await api.slotsPorFecha("2026-10-25", 3);
    await api.slotsPorFecha("2026-10-25");
    await api.reservas({ fecha: "2026-10-25", dentista: 3 });
    await api.reservas();
    const urls = spy.mock.calls.map(([url]) => String(url).replace(/^.*\/agenda/, ""));
    expect(urls).toEqual([
      "/slots_por_fecha/?fecha=2026-10-25&dentista_id=3",
      "/slots_por_fecha/?fecha=2026-10-25",
      "/api/reservas/?fecha=2026-10-25&dentista=3",
      "/api/reservas/",
    ]);
  });

  it("envía los datos de las operaciones de escritura", async () => {
    const spy = respond({ id: 1, sobrecupo: false });
    const datos = { rut: "1-9", nombre: "A", apellido: "B", telefono: "", email: "" };
    await api.crearPaciente(datos);
    await api.actualizarPaciente(4, datos);
    await api.crearReserva({ slot: 2, paciente: 1 });
    await api.generarSlots(1, { fecha: "2026-10-25", desde: "08:00", hasta: "09:00", dias: 2 });
    const llamadas = spy.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/agenda/, ""), init?.method]);
    expect(llamadas).toEqual([
      ["/api/pacientes/", "POST"],
      ["/api/pacientes/4/", "PATCH"],
      ["/reservas/", "POST"],
      ["/dentistas/1/generar_slots/", "POST"],
    ]);
  });

  it("busca un paciente por RUT y distingue cuando no existe", async () => {
    const spy = respond({ id: 3, rut: "12.345.678-5" });
    await expect(api.buscarPaciente("12.345.678-5")).resolves.toMatchObject({ id: 3 });
    expect(String(spy.mock.calls[0][0])).toContain("/api/pacientes/buscar/?rut=12.345.678-5");
    respond({ detail: "No existe un paciente con este RUT." }, 404);
    await expect(api.buscarPaciente("11.111.111-1")).resolves.toBeNull();
    respond({ detail: "El RUT ingresado no es válido." }, 400);
    await expect(api.buscarPaciente("1")).rejects.toThrow("no es válido");
  });

  it("maneja respuestas sin contenido", async () => {
    respond(null, 204);
    await expect(api.eliminarPaciente(1)).resolves.toBeUndefined();
    respond(null, 204);
    await expect(api.cancelarReserva(1)).resolves.toBeUndefined();
  });

  it("traduce los errores del servidor a mensajes", async () => {
    respond({ detail: "No encontrado." }, 404);
    await expect(api.dentistas()).rejects.toMatchObject({ message: "No encontrado.", status: 404 });
    respond({ rut: ["paciente with this rut already exists."] }, 400);
    await expect(api.dentistas()).rejects.toThrow("rut: paciente with this rut already exists.");
    respond({ non_field_errors: ["Combinación inválida."] }, 400);
    await expect(api.dentistas()).rejects.toThrow("Combinación inválida.");
    respond({ slot: "texto suelto" }, 400);
    await expect(api.dentistas()).rejects.toThrow("slot: texto suelto");
    respond(["x"], 500);
    await expect(api.dentistas()).rejects.toThrow("código 500");
  });

  it("informa cuando no hay conexión o la respuesta no es JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fallo"));
    const error = await api.dentistas().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/No se pudo conectar/);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(api.dentistas()).rejects.toThrow("código 502");
  });
});
