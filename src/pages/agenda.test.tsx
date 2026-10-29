import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import { AuthProvider } from "../hooks/useAuth";
import { todayISO } from "../lib/format";
import { guardarSesion } from "../lib/session";
import { etiquetaDia, etiquetaDiaCompleta, lunesDe, sumarDias } from "../lib/semana";
import { archivo, atencion, dentista, dentistaSinEspecialidad, historialItem, paciente, pacienteSinContacto, reserva, servicio, sesionDe, slotSemana } from "../test/fixtures";
import AppointmentsPage from "./AppointmentsPage";

vi.mock("../api/client", () => ({
  api: {
    dentistas: vi.fn(),
    servicios: vi.fn(),
    semana: vi.fn(),
    crearReserva: vi.fn(),
    buscarPaciente: vi.fn(),
    crearPaciente: vi.fn(),
    actualizarReserva: vi.fn(),
    guardarAtencion: vi.fn(),
    subirArchivos: vi.fn(),
    eliminarArchivo: vi.fn(),
    cancelarReserva: vi.fn(),
    generarSlots: vi.fn(),
    sobrecupos: vi.fn(),
    fijarSobrecupos: vi.fn(),
    historialPaciente: vi.fn(),
    archivo: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const lunes = lunesDe(todayISO());
const martes = sumarDias(lunes, 1);
const sabado = sumarDias(lunes, 5);
const reservaJuan = { ...reserva(1, 10), observaciones: "Nota previa", motivo: "Dolor de muela", archivos: [archivo()] };

const semanaBase = () => [
  slotSemana(10, lunes, "09:00:00", [reservaJuan]),
  slotSemana(11, lunes, "09:30:00"),
  slotSemana(12, martes, "09:00:00"),
  slotSemana(13, sabado, "10:00:00"),
  slotSemana(14, lunes, "10:00:00", [{ ...reserva(2, 14), paciente: pacienteSinContacto }]),
];

const resumenFuturo = (permitidos = 2, usados = 0) => ({
  por_defecto: 1,
  dias: Array.from({ length: 5 }, (_, indice) => ({ fecha: todayISO(1 + indice), permitidos, usados: indice === 0 ? usados : 0, personalizado: indice === 1 })),
});

const resumenSobrecupos = (permitidos = 2, usados = 0) => ({
  por_defecto: 1,
  dias: Array.from({ length: 7 }, (_, indice) => ({ fecha: sumarDias(lunes, indice), permitidos, usados: indice === 0 ? usados : 0, personalizado: indice === 1 })),
});

const renderAgenda = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AppointmentsPage />
      </AuthProvider>
    </MemoryRouter>,
  );

const abrirSemana = async (user: ReturnType<typeof userEvent.setup>) => {
  renderAgenda();
  await screen.findAllByRole("option", { name: "Ana Pérez" });
  await user.selectOptions(screen.getAllByLabelText("Dentista")[0], "1");
  await screen.findByRole("button", { name: /Reserva de Juan Soto/ });
};

const dialogo = (titulo: string) => within(screen.getByRole("heading", { name: titulo }).closest("dialog") as HTMLElement);

const pdf = (nombre = "examen.pdf") => new File(["%PDF-1.4"], nombre, { type: "application/pdf" });

beforeEach(() => {
  sessionStorage.clear();
  guardarSesion(sesionDe("recepcion"));
  mocked.dentistas.mockResolvedValue([dentista, dentistaSinEspecialidad]);
  mocked.servicios.mockResolvedValue([servicio]);
  mocked.semana.mockResolvedValue(semanaBase());
  mocked.sobrecupos.mockResolvedValue(resumenSobrecupos());
  mocked.fijarSobrecupos.mockResolvedValue({});
  URL.createObjectURL = vi.fn(() => "blob:prueba");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

describe("Agenda semanal", () => {
  it("pide elegir un dentista y luego muestra la semana con sus horas y reservas", async () => {
    const user = userEvent.setup();
    renderAgenda();
    expect(await screen.findByText("Elige un dentista")).toBeInTheDocument();
    expect(mocked.semana).not.toHaveBeenCalled();
    await user.selectOptions(screen.getAllByLabelText("Dentista")[0], "1");
    expect(await screen.findByRole("button", { name: /Reserva de Juan Soto/ })).toBeInTheDocument();
    expect(mocked.semana).toHaveBeenCalledWith(lunes, 1);
    expect(screen.getByRole("columnheader", { name: etiquetaDia(martes) })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: etiquetaDia(sabado) })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "09:30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Agendar ${etiquetaDia(martes)} 09:00` })).toBeInTheDocument();
  });

  it("oculta el sábado y el domingo cuando no tienen horarios", async () => {
    const user = userEvent.setup();
    mocked.semana.mockResolvedValue(semanaBase().filter((slot) => slot.fecha !== sabado));
    await abrirSemana(user);
    expect(screen.queryByRole("columnheader", { name: etiquetaDia(sabado) })).not.toBeInTheDocument();
  });

  it("avanza, retrocede y vuelve a la semana actual", async () => {
    const user = userEvent.setup();
    await abrirSemana(user);
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await waitFor(() => expect(mocked.semana).toHaveBeenLastCalledWith(sumarDias(lunes, 7), 1));
    await user.click(screen.getByRole("button", { name: "Semana anterior" }));
    await user.click(screen.getByRole("button", { name: "Semana anterior" }));
    await waitFor(() => expect(mocked.semana).toHaveBeenLastCalledWith(sumarDias(lunes, -7), 1));
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    await waitFor(() => expect(mocked.semana).toHaveBeenLastCalledWith(lunes, 1));
  });

  it("informa cuando no hay horarios o falla la carga", async () => {
    const user = userEvent.setup();
    mocked.semana.mockResolvedValueOnce([]);
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    await user.selectOptions(screen.getAllByLabelText("Dentista")[0], "1");
    expect(await screen.findByText("No hay horarios esta semana")).toBeInTheDocument();
    mocked.semana.mockRejectedValueOnce(new Error("Falló la agenda"));
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(await screen.findByText("Falló la agenda")).toBeInTheDocument();
  });

  it("muestra el error de los catálogos", async () => {
    mocked.dentistas.mockRejectedValue(new Error("Sin conexión"));
    renderAgenda();
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  });

  it("al dentista le muestra solo su agenda y solo puede generar sus horarios", async () => {
    guardarSesion(sesionDe("dentista"));
    renderAgenda();
    expect(await screen.findByRole("button", { name: /Reserva de Juan Soto/ })).toBeInTheDocument();
    expect(mocked.semana).toHaveBeenCalledWith(lunes, 1);
    expect(screen.getAllByLabelText("Dentista")).toHaveLength(1);
    const opciones = within(screen.getByLabelText("Dentista para generar horarios")).getAllByRole("option");
    expect(opciones.map((opcion) => opcion.textContent)).toEqual(["Selecciona un dentista", "Ana Pérez"]);
  });
});

describe("Agendar desde la semana", () => {
  const buscarJuan = async (user: ReturnType<typeof userEvent.setup>) => {
    mocked.buscarPaciente.mockResolvedValue(paciente);
    await user.click(screen.getByRole("button", { name: `Agendar ${etiquetaDia(martes)} 09:00` }));
    await user.type(await screen.findByLabelText("RUT del paciente"), "123456785");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Paciente registrado");
  };

  it("agenda a un paciente existente en un horario libre", async () => {
    const user = userEvent.setup();
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    await abrirSemana(user);
    await buscarJuan(user);
    await user.selectOptions(screen.getByLabelText("Servicio (opcional)"), "1");
    await user.type(screen.getByLabelText("Motivo de la consulta (opcional)"), "Control");
    await user.click(screen.getByRole("button", { name: "Agendar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva creada.");
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 12, paciente: 1, servicio: 1, motivo: "Control" }, []);
    expect(mocked.semana).toHaveBeenCalledTimes(2);
  });

  it("adjunta exámenes al agendar", async () => {
    const user = userEvent.setup();
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: true });
    await abrirSemana(user);
    await buscarJuan(user);
    const examen = pdf();
    await user.upload(screen.getByLabelText("Exámenes o documentos (opcional)"), examen);
    expect(screen.getByText(/examen\.pdf/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agendar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva creada como sobrecupo.");
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 12, paciente: 1 }, [examen]);
  });

  it("rechaza archivos no permitidos y permite quitar archivos", async () => {
    const user = userEvent.setup({ applyAccept: false });
    await abrirSemana(user);
    await buscarJuan(user);
    await user.upload(screen.getByLabelText("Exámenes o documentos (opcional)"), new File(["x"], "virus.exe"));
    expect(screen.getByText("Solo se aceptan archivos PDF, JPG o PNG.", { selector: "p" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agendar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Solo se aceptan");
    expect(mocked.crearReserva).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Quitar virus.exe" }));
    expect(screen.queryByText("Solo se aceptan archivos PDF, JPG o PNG.", { selector: "p" })).not.toBeInTheDocument();
  });

  it("valida el paciente y muestra los errores del servidor", async () => {
    const user = userEvent.setup();
    mocked.crearReserva.mockRejectedValue(new Error("El slot está lleno"));
    await abrirSemana(user);
    await user.click(screen.getByRole("button", { name: `Agendar ${etiquetaDia(martes)} 09:00` }));
    await user.click(await screen.findByRole("button", { name: "Agendar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el RUT del paciente");
    await user.type(screen.getByLabelText("RUT del paciente"), "123456785");
    mocked.buscarPaciente.mockResolvedValue(paciente);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Paciente registrado");
    await user.click(screen.getByRole("button", { name: "Agendar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El slot está lleno");
  });

  it("ofrece agendar un sobrecupo solo en los horarios completos", async () => {
    const user = userEvent.setup();
    await abrirSemana(user);
    expect(await screen.findByRole("button", { name: `Agendar sobrecupo ${etiquetaDia(lunes)} 10:00` })).toHaveTextContent("+ Sobrecupo");
    expect(screen.queryByRole("button", { name: `Agendar ${etiquetaDia(lunes)} 10:00` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Agendar sobrecupo ${etiquetaDia(lunes)} 09:30` })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `Agendar sobrecupo ${etiquetaDia(lunes)} 10:00` }));
    const formulario = dialogo(`Agendar sobrecupo ${etiquetaDiaCompleta(lunes)} · 10:00`);
    expect(formulario.getByText(/se agenda como sobrecupo/)).toBeInTheDocument();
    await user.click(formulario.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("RUT del paciente")).not.toBeInTheDocument();
  });

  it("no ofrece el sobrecupo cuando se agotó el límite del día", async () => {
    const user = userEvent.setup();
    mocked.sobrecupos.mockResolvedValue(resumenSobrecupos(2, 2));
    await abrirSemana(user);
    await screen.findByText("Por defecto cada día");
    expect(screen.queryByRole("button", { name: /Agendar sobrecupo/ })).not.toBeInTheDocument();
  });

  it("envía el sobrecupo de forma explícita al agendarlo", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: true });
    await abrirSemana(user);
    await user.click(await screen.findByRole("button", { name: `Agendar sobrecupo ${etiquetaDia(lunes)} 10:00` }));
    const formulario = dialogo(`Agendar sobrecupo ${etiquetaDiaCompleta(lunes)} · 10:00`);
    await user.type(formulario.getByLabelText("RUT del paciente"), "123456785");
    await user.click(formulario.getByRole("button", { name: "Buscar" }));
    await formulario.findByText("Paciente registrado");
    await user.click(formulario.getByRole("button", { name: "Agendar" }));
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 14, paciente: 1, sobrecupo: true }, []);
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva creada como sobrecupo.");
  });
});

describe("Detalle de la reserva", () => {
  const abrirReserva = async (user: ReturnType<typeof userEvent.setup>) => {
    await abrirSemana(user);
    await user.click(screen.getByRole("button", { name: /Reserva de Juan Soto/ }));
    return dialogo("Reserva de Juan Soto");
  };

  it("muestra los datos del paciente, el motivo y los archivos", async () => {
    const user = userEvent.setup();
    const detalle = await abrirReserva(user);
    expect(detalle.getByText("Juan Soto · 12.345.678-5")).toBeInTheDocument();
    expect(detalle.getByText("Dolor de muela")).toBeInTheDocument();
    expect(detalle.getByText(/examen\.pdf/)).toBeInTheDocument();
    expect(detalle.getByLabelText("Observaciones internas")).toHaveValue("Nota previa");
    expect(detalle.queryByRole("button", { name: "Guardar atención" })).not.toBeInTheDocument();
    expect(detalle.getByText("El dentista aún no registra la atención.")).toBeInTheDocument();
  });

  it("guarda el estado, el servicio, las observaciones y la reprogramación", async () => {
    const user = userEvent.setup();
    mocked.actualizarReserva.mockResolvedValue({ ...reservaJuan, estado: "atendida" });
    const detalle = await abrirReserva(user);
    await user.selectOptions(detalle.getByLabelText("Estado"), "atendida");
    await user.selectOptions(detalle.getByLabelText("Servicio"), "");
    await user.selectOptions(detalle.getByLabelText("Reprogramar a"), "12");
    const nota = detalle.getByLabelText("Observaciones internas");
    await user.clear(nota);
    await user.type(nota, "Llamar mañana");
    await user.click(detalle.getByRole("button", { name: "Guardar cambios" }));
    expect(await detalle.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(mocked.actualizarReserva).toHaveBeenCalledWith(1, { estado: "atendida", observaciones: "Llamar mañana", servicio: null, slot: 12 });
    expect(mocked.semana).toHaveBeenCalledTimes(2);
  });

  it("solo ofrece reprogramar a horarios con cupo", async () => {
    const user = userEvent.setup();
    const detalle = await abrirReserva(user);
    const valores = detalle.getAllByRole("option").map((opcion) => (opcion as HTMLOptionElement).value);
    expect(valores).toEqual(expect.arrayContaining(["", "11", "12", "13"]));
    expect(valores).not.toContain("10");
    expect(valores).not.toContain("14");
  });

  it("muestra el error si no se puede guardar", async () => {
    const user = userEvent.setup();
    mocked.actualizarReserva.mockRejectedValue(new Error("El horario elegido está lleno."));
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Guardar cambios" }));
    expect(await detalle.findByRole("alert")).toHaveTextContent("El horario elegido está lleno.");
  });

  it("cancela la reserva tras confirmar", async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    mocked.cancelarReserva.mockResolvedValue(undefined);
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Cancelar reserva" }));
    expect(mocked.cancelarReserva).not.toHaveBeenCalled();
    await user.click(detalle.getByRole("button", { name: "Cancelar reserva" }));
    expect(await screen.findByText("Reserva cancelada.")).toBeInTheDocument();
    expect(mocked.cancelarReserva).toHaveBeenCalledWith(1);
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(mocked.semana).toHaveBeenCalledTimes(2);
  });

  it("informa si no se puede cancelar", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocked.cancelarReserva.mockRejectedValue(new Error("No se pudo"));
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Cancelar reserva" }));
    expect(await detalle.findByRole("alert")).toHaveTextContent("No se pudo");
  });

  it("abre el historial del paciente", async () => {
    const user = userEvent.setup();
    mocked.historialPaciente.mockResolvedValue([historialItem(5)]);
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Ver historial" }));
    expect(await screen.findByText("Restauración con resina")).toBeInTheDocument();
    expect(mocked.historialPaciente).toHaveBeenCalledWith(1);
    await user.click(dialogo("Historial de Juan Soto").getAllByRole("button", { name: "Cerrar" })[0]);
  });

  it("recepción lee la atención registrada pero no la edita", async () => {
    const user = userEvent.setup();
    mocked.semana.mockResolvedValue([slotSemana(10, lunes, "09:00:00", [{ ...reservaJuan, atencion }])]);
    const detalle = await abrirReserva(user);
    expect(detalle.getByText("Caries oclusal")).toBeInTheDocument();
    expect(detalle.queryByRole("button", { name: "Guardar atención" })).not.toBeInTheDocument();
  });
});

describe("Archivos de la reserva", () => {
  const abrirReserva = async (user: ReturnType<typeof userEvent.setup>) => {
    await abrirSemana(user);
    await user.click(screen.getByRole("button", { name: /Reserva de Juan Soto/ }));
    return dialogo("Reserva de Juan Soto");
  };

  it("descarga un archivo adjunto", async () => {
    const user = userEvent.setup();
    mocked.archivo.mockResolvedValue(new Blob(["%PDF"]));
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Descargar examen.pdf" }));
    await waitFor(() => expect(mocked.archivo).toHaveBeenCalledWith(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:prueba");
  });

  it("informa si falla la descarga", async () => {
    const user = userEvent.setup();
    mocked.archivo.mockRejectedValueOnce(new Error("Sin conexión")).mockRejectedValueOnce("fallo");
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Descargar examen.pdf" }));
    expect(await detalle.findByText("Sin conexión")).toBeInTheDocument();
    await user.click(detalle.getByRole("button", { name: "Descargar examen.pdf" }));
    expect(await detalle.findByText("No se pudo descargar el archivo.")).toBeInTheDocument();
  });

  it("sube archivos nuevos", async () => {
    const user = userEvent.setup();
    mocked.subirArchivos.mockResolvedValue([archivo(2, "radiografia.pdf")]);
    const detalle = await abrirReserva(user);
    const nuevo = pdf("radiografia.pdf");
    await user.upload(detalle.getByLabelText("Agregar archivos"), nuevo);
    await user.click(detalle.getByRole("button", { name: "Subir archivos" }));
    expect(await detalle.findByText("Archivos adjuntados.")).toBeInTheDocument();
    expect(mocked.subirArchivos).toHaveBeenCalledWith(1, [nuevo]);
    expect(detalle.getByRole("button", { name: "Descargar radiografia.pdf" })).toBeInTheDocument();
  });

  it("valida el límite de archivos antes de subir", async () => {
    const user = userEvent.setup();
    const detalle = await abrirReserva(user);
    await user.upload(detalle.getByLabelText("Agregar archivos"), Array.from({ length: 5 }, (_, i) => pdf(`${i}.pdf`)));
    expect(detalle.getByText(/hasta 5 archivos/)).toBeInTheDocument();
    await user.click(detalle.getByRole("button", { name: "Subir archivos" }));
    expect(mocked.subirArchivos).not.toHaveBeenCalled();
  });

  it("informa si falla la subida", async () => {
    const user = userEvent.setup();
    mocked.subirArchivos.mockRejectedValue(new Error("Solo se aceptan archivos PDF, JPG o PNG."));
    const detalle = await abrirReserva(user);
    await user.upload(detalle.getByLabelText("Agregar archivos"), pdf("otro.pdf"));
    await user.click(detalle.getByRole("button", { name: "Subir archivos" }));
    expect(await detalle.findByRole("alert")).toHaveTextContent("Solo se aceptan");
  });

  it("elimina un archivo tras confirmar", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    mocked.eliminarArchivo.mockResolvedValue(undefined);
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Eliminar examen.pdf" }));
    expect(mocked.eliminarArchivo).not.toHaveBeenCalled();
    await user.click(detalle.getByRole("button", { name: "Eliminar examen.pdf" }));
    expect(await detalle.findByText("Sin archivos adjuntos.")).toBeInTheDocument();
    expect(mocked.eliminarArchivo).toHaveBeenCalledWith(1);
  });
});

describe("Atención clínica del dentista", () => {
  const abrirReserva = async (user: ReturnType<typeof userEvent.setup>) => {
    guardarSesion(sesionDe("dentista"));
    renderAgenda();
    await user.click(await screen.findByRole("button", { name: /Reserva de Juan Soto/ }));
    return dialogo("Reserva de Juan Soto");
  };

  it("registra el diagnóstico, el procedimiento y las indicaciones", async () => {
    const user = userEvent.setup();
    mocked.guardarAtencion.mockResolvedValue({ ...reservaJuan, estado: "atendida", atencion });
    const detalle = await abrirReserva(user);
    await user.type(detalle.getByLabelText("Diagnóstico"), "Caries oclusal");
    await user.type(detalle.getByLabelText("Procedimiento"), "Restauración con resina");
    await user.type(detalle.getByLabelText("Indicaciones"), "Evitar alimentos duros");
    await user.click(detalle.getByRole("button", { name: "Guardar atención" }));
    expect(await detalle.findByText("Atención registrada.")).toBeInTheDocument();
    expect(mocked.guardarAtencion).toHaveBeenCalledWith(1, {
      diagnostico: "Caries oclusal",
      procedimiento: "Restauración con resina",
      indicaciones: "Evitar alimentos duros",
    });
    expect(detalle.getByLabelText("Estado")).toHaveValue("atendida");
  });

  it("informa si no se puede registrar la atención", async () => {
    const user = userEvent.setup();
    mocked.guardarAtencion.mockRejectedValue(new Error("Solo el dentista puede registrar la atención."));
    const detalle = await abrirReserva(user);
    await user.click(detalle.getByRole("button", { name: "Guardar atención" }));
    expect(await detalle.findByRole("alert")).toHaveTextContent("Solo el dentista");
  });

  it("carga la atención ya registrada para editarla", async () => {
    const user = userEvent.setup();
    mocked.semana.mockResolvedValue([slotSemana(10, lunes, "09:00:00", [{ ...reservaJuan, atencion }])]);
    const detalle = await abrirReserva(user);
    expect(detalle.getByLabelText("Diagnóstico")).toHaveValue("Caries oclusal");
  });
});

describe("Horarios ocupados por la duración", () => {
  it("muestra como ocupado el horario cubierto por una cita larga y no permite agendarlo", async () => {
    const user = userEvent.setup();
    const lunes = lunesDe(todayISO());
    mocked.semana.mockResolvedValue([
      slotSemana(1, lunes, "09:00:00", [reserva(1, 1)]),
      { ...slotSemana(2, lunes, "09:30:00"), bloqueado: true },
      slotSemana(3, lunes, "10:00:00"),
    ]);
    await abrirSemana(user);
    await screen.findByRole("button", { name: `Agendar ${etiquetaDia(lunes)} 10:00` });
    expect(screen.getByText("Ocupado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Agendar ${etiquetaDia(lunes)} 09:30` })).not.toBeInTheDocument();
  });
});

describe("Gestión de sobrecupos", () => {
  const panelDeSobrecupos = async () => within((await screen.findByRole("heading", { name: "Sobrecupos" })).closest("section") as HTMLElement);

  it("muestra lo usado y lo permitido de cada día y deja ajustarlo", async () => {
    const user = userEvent.setup();
    const manana = todayISO(1);
    mocked.sobrecupos.mockResolvedValue(resumenFuturo(2, 1));
    await abrirSemana(user);
    const panel = await panelDeSobrecupos();
    expect(panel.getByText("Por defecto cada día")).toBeInTheDocument();
    expect(panel.getByLabelText(`Sobrecupos usados el ${etiquetaDia(manana)}`).parentElement).toHaveTextContent("1 de 2 usados");
    await user.click(panel.getByRole("button", { name: `Aumentar sobrecupos del ${etiquetaDia(manana)}` }));
    expect(mocked.fijarSobrecupos).toHaveBeenCalledWith({ dentista: 1, fecha: manana, cupos: 3 });
  });

  it("no deja bajar el límite de un día por debajo de lo ya agendado", async () => {
    const user = userEvent.setup();
    mocked.sobrecupos.mockResolvedValue(resumenFuturo(1, 1));
    await abrirSemana(user);
    const panel = await panelDeSobrecupos();
    expect(panel.getByRole("button", { name: `Disminuir sobrecupos del ${etiquetaDia(todayISO(1))}` })).toBeDisabled();
  });

  it("cambia el valor por defecto y restablece un día con valor propio", async () => {
    const user = userEvent.setup();
    mocked.sobrecupos.mockResolvedValue(resumenFuturo());
    await abrirSemana(user);
    const panel = await panelDeSobrecupos();
    await user.click(panel.getByRole("button", { name: "Aumentar sobrecupos por defecto" }));
    expect(mocked.fijarSobrecupos).toHaveBeenCalledWith({ dentista: 1, cupos: 2 });
    await user.click(panel.getByRole("button", { name: `Restablecer sobrecupos del ${etiquetaDia(todayISO(2))}` }));
    expect(mocked.fijarSobrecupos).toHaveBeenCalledWith({ dentista: 1, fecha: todayISO(2), cupos: null });
  });

  it("muestra el error si el servidor rechaza el cambio", async () => {
    const user = userEvent.setup();
    mocked.fijarSobrecupos.mockRejectedValue(new Error("Ya hay 1 sobrecupo agendado ese día"));
    await abrirSemana(user);
    const panel = await panelDeSobrecupos();
    await user.click(panel.getByRole("button", { name: "Aumentar sobrecupos por defecto" }));
    expect(await screen.findByText("Ya hay 1 sobrecupo agendado ese día")).toBeInTheDocument();
  });
});

describe("Citas en choque de horario", () => {
  it("marca la cita que ya no cabe y explica cómo resolverla", async () => {
    const user = userEvent.setup();
    const lunes = lunesDe(todayISO());
    mocked.semana.mockResolvedValue([
      { ...slotSemana(1, lunes, "09:00:00", [reserva(1, 1)]), conflictos: [{ reserva: 1, motivo: "superpuesta" }] },
      { ...slotSemana(2, lunes, "09:30:00", [reserva(2, 2)]), bloqueado: true },
    ]);
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    await user.selectOptions(screen.getAllByLabelText("Dentista")[0], "1");
    expect(await screen.findByText("Choque de horario")).toBeInTheDocument();
    expect(screen.getAllByText(/Juan Soto/).length).toBe(2);
    await user.click(screen.getAllByRole("button", { name: /^Reserva de Juan Soto/ })[0]);
    expect(await screen.findByText(/Cambia el horario o el servicio de esta cita para resolverlo/)).toBeInTheDocument();
  });

  it("abre la agenda del dentista y la semana indicadas en la dirección", async () => {
    mocked.semana.mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={["/agenda?dentista=1&fecha=2026-11-04"]}>
        <AuthProvider>
          <AppointmentsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(mocked.semana).toHaveBeenCalledWith("2026-11-02", 1));
  });
});

describe("Generar horarios", () => {
  it("genera horarios para un dentista", async () => {
    const user = userEvent.setup();
    mocked.generarSlots.mockResolvedValue({ created: 17, existing: 0 });
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(screen.getByText("Elige un dentista.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Dentista para generar horarios"), "1");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("Se crearon 17 horarios nuevos.")).toBeInTheDocument();
    expect(mocked.generarSlots).toHaveBeenCalledWith(1, expect.objectContaining({ desde: "08:00", hasta: "16:00", dias: 1 }));
  });

  it("distingue los horarios nuevos de los que ya existían", async () => {
    const user = userEvent.setup();
    mocked.generarSlots.mockResolvedValueOnce({ created: 2, existing: 6 }).mockResolvedValueOnce({ created: 0, existing: 8 });
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    await user.selectOptions(screen.getByLabelText("Dentista para generar horarios"), "1");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("Se crearon 2 horarios nuevos. 6 ya existían.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("No se creó ningún horario nuevo: esos horarios ya existían.")).toBeInTheDocument();
  });

  it("explica cada campo y abre la ayuda completa", async () => {
    const user = userEvent.setup();
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    const ayudaDe = (campo: string) => within(screen.getByLabelText(campo).closest(".form-control") as HTMLElement).getByRole("button", { name: "Ayuda" });
    expect(ayudaDe("Cantidad de días")).toHaveAccessibleDescription(/sábados y domingos también cuentan/);
    expect(ayudaDe("Hora final")).toHaveAccessibleDescription(/última cita empieza a las 11:30/);
    await user.click(screen.getByRole("button", { name: "Cómo funciona Generar horarios" }));
    expect(screen.getByRole("dialog", { name: "Cómo funciona Generar horarios" })).toHaveTextContent("40 horarios en total");
  });

  it("informa los errores al generar horarios", async () => {
    const user = userEvent.setup();
    mocked.generarSlots.mockRejectedValue(new Error("Fecha inválida"));
    renderAgenda();
    await screen.findAllByRole("option", { name: "Ana Pérez" });
    await user.selectOptions(screen.getByLabelText("Dentista para generar horarios"), "1");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("Fecha inválida")).toBeInTheDocument();
  });
});
