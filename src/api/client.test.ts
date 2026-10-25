import { borrarSesion, guardarSesion, leerSesion } from "../lib/session";
import { sesionDe } from "../test/fixtures";
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

  it("construye los filtros de horarios y pacientes", async () => {
    const spy = respond([]);
    await api.slotsPorFecha("2026-10-25", 3);
    await api.slotsPorFecha("2026-10-25");
    await api.pacientes({ q: "juan soto", page: 2 });
    await api.pacientes();
    const urls = spy.mock.calls.map(([url]) => String(url).replace(/^.*\/agenda/, ""));
    expect(urls).toEqual([
      "/slots_por_fecha/?fecha=2026-10-25&dentista_id=3",
      "/slots_por_fecha/?fecha=2026-10-25",
      "/api/pacientes/?q=juan+soto&page=2",
      "/api/pacientes/",
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

  it("envía el token de la sesión y no lo envía sin sesión", async () => {
    const spy = respond([]);
    await api.pacientes();
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
    guardarSesion({ ...sesionDe("recepcion"), token: "abc123" });
    await api.pacientes();
    expect((spy.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe("Token abc123");
    borrarSesion();
  });

  it("cierra la sesión cuando el servidor responde 401", async () => {
    guardarSesion({ ...sesionDe("recepcion"), token: "vencido" });
    respond({ detail: "Token inválido." }, 401);
    await expect(api.pacientes()).rejects.toMatchObject({ status: 401 });
    expect(leerSesion()).toBeNull();
  });

  it("no toca la sesión por un 401 sin sesión iniciada", async () => {
    respond({ detail: "No autenticado." }, 401);
    await expect(api.pacientes()).rejects.toMatchObject({ status: 401 });
  });

  it("inicia y cierra sesión", async () => {
    const spy = respond(sesionDe("recepcion"));
    await expect(api.login("recepcion", "clave")).resolves.toEqual(sesionDe("recepcion"));
    expect(spy.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ username: "recepcion", password: "clave" }) });
    respond(null, 204);
    await expect(api.logout()).resolves.toBeUndefined();
  });

  it("consulta la semana, el historial y las operaciones de la reserva", async () => {
    const spy = respond([]);
    await api.semana("2026-10-26", 3);
    expect(String(spy.mock.calls[0][0])).toContain("/semana/?desde=2026-10-26&dentista=3");
    await api.semana("2026-10-26");
    expect(String(spy.mock.calls[1][0])).not.toContain("dentista");
    await api.historialPaciente(4);
    expect(String(spy.mock.calls[2][0])).toContain("/api/pacientes/4/historial/");
    await api.actualizarReserva(5, { estado: "atendida" });
    expect(spy.mock.calls[3][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ estado: "atendida" }) });
    await api.guardarAtencion(5, { diagnostico: "a", procedimiento: "b", indicaciones: "c" });
    expect(String(spy.mock.calls[4][0])).toContain("/api/reservas/5/atencion/");
    expect(spy.mock.calls[4][1]).toMatchObject({ method: "PUT" });
    respond({ paciente: {}, proximas: [], historial: [] });
    await expect(api.miHistorial()).resolves.toMatchObject({ proximas: [] });
    const activar = respond(sesionDe("paciente"));
    activar.mockClear();
    await api.activarCuenta("12.345.678-5", "j@test.cl", "clave");
    expect(String(activar.mock.calls[0][0])).toContain("/auth/activar-cuenta/");
    respond(null, 204);
    await expect(api.eliminarArchivo(7)).resolves.toBeUndefined();
  });

  it("envía los archivos como formulario sin fijar el tipo de contenido", async () => {
    const archivo = new File(["%PDF"], "examen.pdf", { type: "application/pdf" });
    const spy = respond({ id: 1, sobrecupo: false });
    await api.crearReserva({ slot: 3, paciente: 4, motivo: "Dolor" }, [archivo]);
    const [, init] = spy.mock.calls[0];
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("slot")).toBe("3");
    expect((init?.body as FormData).get("motivo")).toBe("Dolor");
    expect((init?.body as FormData).getAll("archivos")).toHaveLength(1);
    expect(init?.headers as Record<string, string>).not.toHaveProperty("Content-Type");
    const subida = respond([{ id: 2 }], 201);
    await api.subirArchivos(8, [archivo]);
    expect(subida.mock.calls[0][1]?.body).toBeInstanceOf(FormData);
  });

  it("descarga archivos con el token y traduce los errores", async () => {
    guardarSesion({ ...sesionDe("recepcion"), token: "abc" });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("%PDF", { status: 200 }));
    await expect(api.archivo(3)).resolves.toBeInstanceOf(Blob);
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe("Token abc");
    spy.mockResolvedValue(new Response(JSON.stringify({ detail: "No encontrado." }), { status: 404 }));
    await expect(api.archivo(3)).rejects.toMatchObject({ status: 404, message: "No encontrado." });
    spy.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(api.archivo(3)).rejects.toMatchObject({ status: 401 });
    expect(leerSesion()).toBeNull();
    spy.mockRejectedValue(new TypeError("fallo"));
    await expect(api.archivo(3)).rejects.toThrow(/No se pudo conectar/);
    spy.mockResolvedValue(new Response("%PDF", { status: 200 }));
    await expect(api.archivo(3)).resolves.toBeInstanceOf(Blob);
    expect((spy.mock.calls[spy.mock.calls.length - 1][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
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
