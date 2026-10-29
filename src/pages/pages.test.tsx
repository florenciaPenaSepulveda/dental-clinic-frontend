import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import { AuthProvider } from "../hooks/useAuth";
import { guardarSesion } from "../lib/session";
import { dentista, dentistaSinEspecialidad, disponible, historialItem, paciente, pagina, pacienteSinContacto, sesionDe, servicio } from "../test/fixtures";
import HomePage from "./HomePage";
import PatientsPage from "./PatientsPage";
import ReservationPage from "./ReservationPage";

vi.mock("../api/client", () => ({
  api: {
    dentistas: vi.fn(),
    servicios: vi.fn(),
    pacientes: vi.fn(),
    buscarPaciente: vi.fn(),
    historialPaciente: vi.fn(),
    crearPaciente: vi.fn(),
    actualizarPaciente: vi.fn(),
    eliminarPaciente: vi.fn(),
    slotsPorFecha: vi.fn(),
    crearReserva: vi.fn(),
    cancelarReserva: vi.fn(),
    generarSlots: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  guardarSesion(sesionDe("recepcion"));
  mocked.dentistas.mockResolvedValue([dentista, dentistaSinEspecialidad]);
  mocked.servicios.mockResolvedValue([servicio]);
  mocked.pacientes.mockResolvedValue(pagina([paciente, pacienteSinContacto]));
  mocked.slotsPorFecha.mockResolvedValue([disponible(1, "08:00:00"), disponible(2, "08:30:00"), disponible(3, "09:00:00", 1, 1), disponible(4, "09:30:00")]);
});

describe("HomePage", () => {
  it("muestra dentistas y servicios", async () => {
    renderPage(<HomePage />);
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Odontología general")).toBeInTheDocument();
    expect(screen.getByText("Biobío")).toBeInTheDocument();
    expect(screen.getByText("Limpieza")).toBeInTheDocument();
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reservar hora" })).toHaveAttribute("href", "/reservar");
  });

  it("muestra estados vacíos", async () => {
    mocked.dentistas.mockResolvedValue([]);
    mocked.servicios.mockResolvedValue([]);
    renderPage(<HomePage />);
    expect(await screen.findByText("Aún no hay dentistas registrados")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay servicios registrados")).toBeInTheDocument();
  });

  it("informa cuando falla la carga", async () => {
    mocked.dentistas.mockRejectedValue(new Error("Sin conexión"));
    renderPage(<HomePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });
});

describe("ReservationPage", () => {
  const elegirDentista = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.selectOptions(screen.getAllByRole("combobox")[0], "1");
    return screen.findByRole("button", { name: "08:00" });
  };

  const buscarRut = async (user: ReturnType<typeof userEvent.setup>, rut: string) => {
    await user.type(screen.getByLabelText("RUT del paciente"), rut);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
  };

  it("pide elegir un dentista antes de mostrar horarios", async () => {
    renderPage(<ReservationPage />);
    expect(await screen.findByText("Elige un dentista para ver sus horarios.")).toBeInTheDocument();
  });

  it("muestra el valor referencial de cada servicio sin cobrar en línea", async () => {
    renderPage(<ReservationPage />);
    const opcion = await screen.findByRole("option", { name: /Limpieza/ });
    expect(opcion).toHaveTextContent(/25\.000/);
    expect(screen.getByText(/el pago se realiza en la consulta/)).toBeInTheDocument();
  });

  it("no descarga la lista de pacientes", async () => {
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    expect(mocked.pacientes).not.toHaveBeenCalled();
  });

  it("muestra el estado de cada horario según la ocupación", async () => {
    const user = userEvent.setup();
    mocked.slotsPorFecha.mockResolvedValue([disponible(1, "08:00:00"), disponible(2, "08:30:00", 1, 0, 1), disponible(3, "09:00:00", 1, 1, 2, 1)]);
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    expect(screen.getByRole("button", { name: "08:00" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "08:30" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "09:00" })).toBeDisabled();
    expect(mocked.slotsPorFecha).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 1);
  });

  it("permite reservar en sobrecupo cuando el horario está lleno pero admite más", async () => {
    const user = userEvent.setup();
    mocked.slotsPorFecha.mockResolvedValue([disponible(1, "08:00:00"), disponible(3, "09:00:00", 1, 1, 1, 0)]);
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: true });
    mocked.buscarPaciente.mockResolvedValue(paciente);
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await buscarRut(user, "123456785");
    await screen.findByText("Paciente registrado");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/sobrecupo/i);
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 3, paciente: 1 }, []);
  });

  it("un paciente con sesión reserva a su nombre sin pedir el RUT", async () => {
    const user = userEvent.setup();
    guardarSesion(sesionDe("paciente"));
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    const ficha = screen.getByLabelText("Paciente de la sesión");
    expect(ficha).toHaveTextContent("Juan Soto · RUT 12.345.678-5");
    expect(screen.queryByLabelText("RUT del paciente")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("status")).toHaveTextContent("La verás en Mi historial");
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 1 }, []);
    expect(mocked.buscarPaciente).not.toHaveBeenCalled();
  });

  it("encuentra al paciente por RUT, muestra sus datos y reserva con un servicio", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.selectOptions(screen.getAllByRole("combobox")[1], "1");
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await buscarRut(user, "123456785");
    expect(mocked.buscarPaciente).toHaveBeenCalledWith("12.345.678-5");
    const ficha = await screen.findByLabelText("Paciente encontrado");
    expect(within(ficha).getByText("Juan Soto")).toBeInTheDocument();
    expect(within(ficha).getByText("+56912345678")).toBeInTheDocument();
    expect(within(ficha).getByText("juan@test.cl")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    const confirmacion = await screen.findByRole("status");
    expect(confirmacion).toHaveTextContent("Reserva confirmada.");
    expect(confirmacion).toHaveTextContent(/a las 08:00 con Ana Pérez/);
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 1, servicio: 1 }, []);
    expect(mocked.crearPaciente).not.toHaveBeenCalled();
    expect(mocked.slotsPorFecha).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("RUT del paciente")).toHaveValue("");
  });

  it("indica los datos que faltan cuando el paciente no tiene teléfono ni correo", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(pacienteSinContacto);
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await buscarRut(user, "111111111");
    const ficha = await screen.findByLabelText("Paciente encontrado");
    expect(within(ficha).getAllByText("Sin registrar")).toHaveLength(2);
  });

  it("busca al presionar Enter en el campo de RUT", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.type(screen.getByLabelText("RUT del paciente"), "123456785{Enter}");
    expect(await screen.findByText("Paciente registrado")).toBeInTheDocument();
    expect(mocked.crearReserva).not.toHaveBeenCalled();
  });

  it("pide los datos y registra al paciente cuando el RUT no existe", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(null);
    mocked.crearPaciente.mockResolvedValue({ ...paciente, id: 7 });
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await buscarRut(user, "123456785");
    expect(await screen.findByText(/No encontramos este RUT/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nombre"), " Juan ");
    await user.type(screen.getByLabelText("Apellido"), "Soto");
    await user.type(screen.getByLabelText("Teléfono"), "999");
    await user.type(screen.getByLabelText("Correo electrónico"), "j@test.cl");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await waitFor(() => expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 7 }, []));
    expect(mocked.crearPaciente).toHaveBeenCalledWith({
      rut: "12.345.678-5",
      nombre: "Juan",
      apellido: "Soto",
      telefono: "999",
      email: "j@test.cl",
    });
  });

  it("no consulta al servidor cuando el RUT es inválido", async () => {
    const user = userEvent.setup();
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await buscarRut(user, "123456789");
    expect(screen.getByText(/El RUT ingresado no es válido/)).toBeInTheDocument();
    expect(mocked.buscarPaciente).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("RUT del paciente"));
    expect(screen.queryByText(/El RUT ingresado no es válido/)).not.toBeInTheDocument();
  });

  it("formatea el RUT mientras se escribe y descarta caracteres ajenos", async () => {
    const user = userEvent.setup();
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.type(screen.getByLabelText("RUT del paciente"), "12abc345.678 5");
    expect(screen.getByLabelText("RUT del paciente")).toHaveValue("12.345.678-5");
  });

  it("muestra el error si falla la búsqueda y permite reintentar", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(paciente);
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await buscarRut(user, "123456785");
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Paciente registrado")).toBeInTheDocument();
    expect(screen.queryByText("Sin conexión")).not.toBeInTheDocument();
  });

  it("vuelve a pedir la búsqueda si se edita el RUT después de encontrarlo", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await buscarRut(user, "123456785");
    await screen.findByText("Paciente registrado");
    await user.type(screen.getByLabelText("RUT del paciente"), "{Backspace}");
    expect(screen.queryByText("Paciente registrado")).not.toBeInTheDocument();
  });

  it("envía el motivo y los exámenes adjuntos con la reserva", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await buscarRut(user, "123456785");
    await screen.findByText("Paciente registrado");
    await user.type(screen.getByLabelText("Motivo de la consulta (opcional)"), "Dolor de muela");
    const examen = new File(["%PDF-1.4"], "examen.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Exámenes o documentos (opcional)"), examen);
    expect(screen.getByText(/examen\.pdf/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva confirmada.");
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 1, motivo: "Dolor de muela" }, [examen]);
    expect(screen.queryByText(/examen\.pdf/)).not.toBeInTheDocument();
  });

  it("rechaza exámenes con un formato no permitido", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage(<ReservationPage />);
    await screen.findAllByRole("option", { name: /Ana Pérez/ });
    await user.upload(screen.getByLabelText("Exámenes o documentos (opcional)"), new File(["x"], "virus.exe"));
    expect(screen.getByText("Solo se aceptan archivos PDF, JPG o PNG.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar virus.exe" }));
    expect(screen.queryByText("Solo se aceptan archivos PDF, JPG o PNG.")).not.toBeInTheDocument();
  });

  it("valida los datos antes de enviar", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(null);
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un dentista.");

    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un horario disponible.");

    await user.click(screen.getByRole("button", { name: "08:00" }));
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el RUT del paciente");

    await buscarRut(user, "123456785");
    await screen.findByText(/No encontramos este RUT/);
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("nombre y el apellido");
    expect(mocked.crearPaciente).not.toHaveBeenCalled();
    expect(mocked.crearReserva).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor al reservar", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(paciente);
    mocked.crearReserva.mockRejectedValue(new Error("El slot está lleno"));
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await buscarRut(user, "123456785");
    await screen.findByText("Paciente registrado");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El slot está lleno");
  });

  it("muestra el error del servidor si no se puede registrar al paciente", async () => {
    const user = userEvent.setup();
    mocked.buscarPaciente.mockResolvedValue(null);
    mocked.crearPaciente.mockRejectedValue(new Error("rut: Ya existe un paciente con este RUT."));
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await buscarRut(user, "123456785");
    await user.type(await screen.findByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellido"), "Soto");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un paciente");
    expect(mocked.crearReserva).not.toHaveBeenCalled();
  });

  it("limpia la selección al cambiar de fecha y muestra el vacío sin horarios", async () => {
    const user = userEvent.setup();
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    mocked.slotsPorFecha.mockResolvedValue([]);
    fireEvent.change(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/), { target: { value: "2030-01-02" } });
    expect(await screen.findByText("No hay horarios para esta fecha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la agenda" })).toHaveAttribute("href", "/agenda");
  });

  it("informa cuando falla la búsqueda de horarios o la carga de catálogos", async () => {
    const user = userEvent.setup();
    mocked.slotsPorFecha.mockRejectedValue(new Error("Falló la agenda"));
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.selectOptions(screen.getAllByRole("combobox")[0], "1");
    expect(await screen.findByText("Falló la agenda")).toBeInTheDocument();
  });

  it("informa cuando fallan los catálogos", async () => {
    mocked.dentistas.mockRejectedValue(new Error("Sin conexión"));
    renderPage(<ReservationPage />);
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  });
});

describe("PatientsPage por rol", () => {
  it("muestra el historial del paciente a recepción", async () => {
    const user = userEvent.setup();
    mocked.historialPaciente.mockResolvedValue([historialItem(1)]);
    renderPage(<PatientsPage />);
    await user.click((await screen.findAllByRole("button", { name: "Historial" }))[0]);
    expect(await screen.findByText("Caries oclusal")).toBeInTheDocument();
    expect(mocked.historialPaciente).toHaveBeenCalledWith(1);
  });

  it("al dentista le oculta crear, editar y eliminar pacientes", async () => {
    guardarSesion(sesionDe("dentista"));
    renderPage(<PatientsPage />);
    expect(await screen.findAllByRole("button", { name: "Historial" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Nuevo paciente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.getByText("Pacientes que se atienden contigo")).toBeInTheDocument();
  });

  it("informa cuando el historial no tiene atenciones o falla", async () => {
    const user = userEvent.setup();
    mocked.historialPaciente.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Sin permiso"));
    renderPage(<PatientsPage />);
    const botones = await screen.findAllByRole("button", { name: "Historial" });
    await user.click(botones[0]);
    expect(await screen.findByText("Sin atenciones registradas")).toBeInTheDocument();
    await user.click(botones[1]);
    expect(await screen.findByText("Sin permiso")).toBeInTheDocument();
  });
});

describe("PatientsPage", () => {
  const abrirNuevo = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByText("Juan Soto");
    await user.click(screen.getByRole("button", { name: "Nuevo paciente" }));
    return screen.getByRole("heading", { name: "Nuevo paciente", hidden: true }).closest("dialog") as HTMLElement;
  };

  it("lista los pacientes y busca en el servidor", async () => {
    const user = userEvent.setup();
    renderPage(<PatientsPage />);
    expect(await screen.findByText("Juan Soto")).toBeInTheDocument();
    expect(screen.getByText("Marta Ríos")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(mocked.pacientes).toHaveBeenLastCalledWith({ q: "", page: 1 });
    expect(screen.getByText("Mostrando 1–2 de 2")).toBeInTheDocument();
    mocked.pacientes.mockResolvedValue(pagina([pacienteSinContacto]));
    await user.type(screen.getByPlaceholderText(/Buscar/), "marta");
    await waitFor(() => expect(mocked.pacientes).toHaveBeenLastCalledWith({ q: "marta", page: 1 }));
    expect(await screen.findByText("Marta Ríos")).toBeInTheDocument();
    expect(screen.queryByText("Juan Soto")).not.toBeInTheDocument();
    mocked.pacientes.mockResolvedValue(pagina([]));
    await user.clear(screen.getByPlaceholderText(/Buscar/));
    await user.type(screen.getByPlaceholderText(/Buscar/), "zzz");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("navega entre las páginas de pacientes", async () => {
    const user = userEvent.setup();
    mocked.pacientes
      .mockResolvedValueOnce(pagina([paciente], { count: 30, next: "siguiente" }))
      .mockResolvedValueOnce(pagina([pacienteSinContacto], { count: 30, previous: "anterior" }))
      .mockResolvedValue(pagina([paciente], { count: 30, next: "siguiente" }));
    renderPage(<PatientsPage />);
    expect(await screen.findByText("Mostrando 1–1 de 30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Mostrando 26–26 de 30")).toBeInTheDocument();
    expect(mocked.pacientes).toHaveBeenLastCalledWith({ q: "", page: 2 });
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(() => expect(mocked.pacientes).toHaveBeenLastCalledWith({ q: "", page: 1 }));
  });

  it("vuelve a la página anterior al eliminar al único paciente de la última página", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocked.eliminarPaciente.mockResolvedValue(undefined);
    mocked.pacientes
      .mockResolvedValueOnce(pagina([paciente], { count: 26, next: "siguiente" }))
      .mockResolvedValueOnce(pagina([pacienteSinContacto], { count: 26, previous: "anterior" }))
      .mockResolvedValue(pagina([paciente], { count: 25 }));
    renderPage(<PatientsPage />);
    await user.click(await screen.findByRole("button", { name: "Siguiente" }));
    await screen.findByText("Marta Ríos");
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("Paciente eliminado.")).toBeInTheDocument();
    await waitFor(() => expect(mocked.pacientes).toHaveBeenLastCalledWith({ q: "", page: 1 }));
  });

  it("registra un paciente nuevo", async () => {
    const user = userEvent.setup();
    mocked.crearPaciente.mockResolvedValue(paciente);
    renderPage(<PatientsPage />);
    const dialog = await abrirNuevo(user);
    await user.type(within(dialog).getByPlaceholderText("12.345.678-5"), "123456785");
    await user.type(within(dialog).getByLabelText("Nombre"), "Ana");
    await user.type(within(dialog).getByLabelText("Apellido"), "Ríos");
    await user.type(within(dialog).getByLabelText("Teléfono"), "999");
    await user.type(within(dialog).getByLabelText("Correo electrónico"), "ana@test.cl");
    await user.click(within(dialog).getByRole("button", { name: "Registrar", hidden: true }));
    expect(await screen.findByText("Paciente registrado.")).toBeInTheDocument();
    expect(mocked.crearPaciente).toHaveBeenCalledWith({
      rut: "12.345.678-5",
      nombre: "Ana",
      apellido: "Ríos",
      telefono: "999",
      email: "ana@test.cl",
    });
  });

  it("rechaza un RUT inválido y muestra errores del servidor", async () => {
    const user = userEvent.setup();
    mocked.crearPaciente.mockRejectedValue(new Error("rut: ya existe"));
    renderPage(<PatientsPage />);
    const dialog = await abrirNuevo(user);
    await user.type(within(dialog).getByPlaceholderText("12.345.678-5"), "123456789");
    await user.type(within(dialog).getByLabelText("Nombre"), "Ana");
    await user.type(within(dialog).getByLabelText("Apellido"), "Ríos");
    await user.click(within(dialog).getByRole("button", { name: "Registrar", hidden: true }));
    expect(within(dialog).getByText("El RUT ingresado no es válido.")).toBeInTheDocument();
    await user.clear(within(dialog).getByPlaceholderText("12.345.678-5"));
    await user.type(within(dialog).getByPlaceholderText("12.345.678-5"), "123456785");
    await user.click(within(dialog).getByRole("button", { name: "Registrar", hidden: true }));
    expect(await within(dialog).findByText("rut: ya existe")).toBeInTheDocument();
  });

  it("edita un paciente", async () => {
    const user = userEvent.setup();
    mocked.actualizarPaciente.mockResolvedValue(paciente);
    renderPage(<PatientsPage />);
    await screen.findByText("Juan Soto");
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const dialog = screen.getByRole("heading", { name: "Editar paciente", hidden: true }).closest("dialog") as HTMLElement;
    const nombre = within(dialog).getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Juanito");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios", hidden: true }));
    expect(await screen.findByText("Paciente actualizado.")).toBeInTheDocument();
    expect(mocked.actualizarPaciente).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: "Juanito" }));
  });

  it("elimina un paciente tras confirmar y respeta la cancelación", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    mocked.eliminarPaciente.mockResolvedValue(undefined);
    renderPage(<PatientsPage />);
    await screen.findByText("Juan Soto");
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    expect(mocked.eliminarPaciente).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    expect(await screen.findByText("Paciente eliminado.")).toBeInTheDocument();
  });

  it("informa errores al eliminar y al cargar", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocked.eliminarPaciente.mockRejectedValue(new Error("No se pudo eliminar"));
    const { unmount } = renderPage(<PatientsPage />);
    await screen.findByText("Juan Soto");
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo eliminar");
    unmount();
    mocked.pacientes.mockRejectedValue(new Error("Sin conexión"));
    renderPage(<PatientsPage />);
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  });
});
