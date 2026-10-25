import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import { dentista, dentistaSinEspecialidad, paciente, pacienteSinContacto, reserva, servicio, slot } from "../test/fixtures";
import AppointmentsPage from "./AppointmentsPage";
import HomePage from "./HomePage";
import PatientsPage from "./PatientsPage";
import ReservationPage from "./ReservationPage";

vi.mock("../api/client", () => ({
  api: {
    dentistas: vi.fn(),
    servicios: vi.fn(),
    pacientes: vi.fn(),
    crearPaciente: vi.fn(),
    actualizarPaciente: vi.fn(),
    eliminarPaciente: vi.fn(),
    slotsPorFecha: vi.fn(),
    reservas: vi.fn(),
    crearReserva: vi.fn(),
    cancelarReserva: vi.fn(),
    generarSlots: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const renderPage = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  mocked.dentistas.mockResolvedValue([dentista, dentistaSinEspecialidad]);
  mocked.servicios.mockResolvedValue([servicio]);
  mocked.pacientes.mockResolvedValue([paciente, pacienteSinContacto]);
  mocked.slotsPorFecha.mockResolvedValue([slot(1, "08:00:00"), slot(2, "08:30:00"), slot(3, "09:00:00", 1, 1), slot(4, "09:30:00")]);
  mocked.reservas.mockResolvedValue([]);
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

  it("pide elegir un dentista antes de mostrar horarios", async () => {
    renderPage(<ReservationPage />);
    expect(await screen.findByText("Elige un dentista para ver sus horarios.")).toBeInTheDocument();
  });

  it("muestra el estado de cada horario según la ocupación", async () => {
    const user = userEvent.setup();
    mocked.reservas.mockResolvedValue([reserva(1, 2), reserva(2, 3), reserva(3, 3, true)]);
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    expect(screen.getByRole("button", { name: "08:00" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "08:30" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "09:00" })).toBeDisabled();
    expect(mocked.slotsPorFecha).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 1);
  });

  it("permite reservar en sobrecupo cuando el horario está lleno pero admite más", async () => {
    const user = userEvent.setup();
    mocked.reservas.mockResolvedValue([reserva(2, 3)]);
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: true });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.selectOptions(screen.getAllByRole("combobox")[2], "1");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/sobrecupo/i);
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 3, paciente: 1 });
  });

  it("reserva con un paciente existente y un servicio", async () => {
    const user = userEvent.setup();
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.selectOptions(screen.getAllByRole("combobox")[1], "1");
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await user.selectOptions(screen.getAllByRole("combobox")[2], "1");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva confirmada.");
    expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 1, servicio: 1 });
    expect(mocked.slotsPorFecha).toHaveBeenCalledTimes(2);
  });

  it("registra un paciente nuevo antes de reservar", async () => {
    const user = userEvent.setup();
    mocked.crearPaciente.mockResolvedValue({ ...paciente, id: 7 });
    mocked.crearReserva.mockResolvedValue({ id: 9, sobrecupo: false });
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await user.click(screen.getByRole("tab", { name: "Nuevo" }));
    await user.type(screen.getByPlaceholderText("12.345.678-5"), "123456785");
    await user.type(screen.getByLabelText("Nombre"), " Juan ");
    await user.type(screen.getByLabelText("Apellido"), "Soto");
    await user.type(screen.getByLabelText("Teléfono"), "999");
    await user.type(screen.getByLabelText("Correo electrónico"), "j@test.cl");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await waitFor(() => expect(mocked.crearReserva).toHaveBeenCalledWith({ slot: 1, paciente: 7 }));
    expect(mocked.crearPaciente).toHaveBeenCalledWith({
      rut: "12.345.678-5",
      nombre: "Juan",
      apellido: "Soto",
      telefono: "999",
      email: "j@test.cl",
    });
  });

  it("valida los datos antes de enviar", async () => {
    const user = userEvent.setup();
    renderPage(<ReservationPage />);
    await screen.findByRole("option", { name: /Ana Pérez/ });
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un dentista.");

    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un horario disponible.");

    await user.click(screen.getByRole("button", { name: "08:00" }));
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un paciente");

    await user.click(screen.getByRole("tab", { name: "Nuevo" }));
    await user.type(screen.getByPlaceholderText("12.345.678-5"), "123456789");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("RUT");

    await user.clear(screen.getByPlaceholderText("12.345.678-5"));
    await user.type(screen.getByPlaceholderText("12.345.678-5"), "123456785");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByRole("alert")).toHaveTextContent("nombre y el apellido");
    expect(mocked.crearReserva).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor al reservar", async () => {
    const user = userEvent.setup();
    mocked.crearReserva.mockRejectedValue(new Error("El slot está lleno"));
    renderPage(<ReservationPage />);
    await elegirDentista(user);
    await user.click(screen.getByRole("button", { name: "08:00" }));
    await user.selectOptions(screen.getAllByRole("combobox")[2], "1");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El slot está lleno");
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

describe("AppointmentsPage", () => {
  it("lista las reservas y filtra por dentista", async () => {
    const user = userEvent.setup();
    mocked.reservas.mockResolvedValue([reserva(1, 1), reserva(2, 2, true)]);
    renderPage(<AppointmentsPage />);
    expect(await screen.findAllByText("Juan Soto")).toHaveLength(2);
    expect(screen.getByText("Limpieza")).toBeInTheDocument();
    expect(screen.getByText("Sobrecupo")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "1");
    await waitFor(() => expect(mocked.reservas).toHaveBeenLastCalledWith({ fecha: expect.any(String), dentista: 1 }));
  });

  it("cambia la fecha consultada", async () => {
    renderPage(<AppointmentsPage />);
    await screen.findByText("No hay reservas para este día");
    fireEvent.change(screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[0], { target: { value: "2030-01-02" } });
    await waitFor(() => expect(mocked.reservas).toHaveBeenLastCalledWith({ fecha: "2030-01-02", dentista: undefined }));
  });

  it("cancela una reserva tras confirmar", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocked.reservas.mockResolvedValue([reserva(1, 1)]);
    mocked.cancelarReserva.mockResolvedValue(undefined);
    renderPage(<AppointmentsPage />);
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reserva cancelada.");
    expect(mocked.cancelarReserva).toHaveBeenCalledWith(1);
  });

  it("respeta la cancelación del diálogo y muestra errores", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    mocked.reservas.mockResolvedValue([reserva(1, 1)]);
    mocked.cancelarReserva.mockRejectedValue(new Error("No se pudo"));
    renderPage(<AppointmentsPage />);
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(mocked.cancelarReserva).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo");
  });

  it("genera horarios para un dentista", async () => {
    const user = userEvent.setup();
    mocked.generarSlots.mockResolvedValue({ created: 17 });
    renderPage(<AppointmentsPage />);
    await screen.findByText("No hay reservas para este día");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(screen.getByText("Elige un dentista.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Dentista para generar horarios"), "1");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("Se prepararon 17 horarios.")).toBeInTheDocument();
    expect(mocked.generarSlots).toHaveBeenCalledWith(1, expect.objectContaining({ desde: "08:00", hasta: "16:00", dias: 1 }));
  });

  it("informa errores al generar horarios y al cargar reservas", async () => {
    const user = userEvent.setup();
    mocked.generarSlots.mockRejectedValue(new Error("Fecha inválida"));
    renderPage(<AppointmentsPage />);
    await screen.findByText("No hay reservas para este día");
    await user.selectOptions(screen.getByLabelText("Dentista para generar horarios"), "1");
    await user.click(screen.getByRole("button", { name: "Generar horarios" }));
    expect(await screen.findByText("Fecha inválida")).toBeInTheDocument();
  });

  it("informa cuando falla la carga de reservas", async () => {
    mocked.reservas.mockRejectedValue(new Error("Sin conexión"));
    renderPage(<AppointmentsPage />);
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  });
});

describe("PatientsPage", () => {
  const abrirNuevo = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByText("Juan Soto");
    await user.click(screen.getByRole("button", { name: "Nuevo paciente" }));
    return screen.getByRole("dialog", { hidden: true });
  };

  it("lista y filtra pacientes", async () => {
    const user = userEvent.setup();
    renderPage(<PatientsPage />);
    expect(await screen.findByText("Juan Soto")).toBeInTheDocument();
    expect(screen.getByText("Marta Ríos")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    await user.type(screen.getByPlaceholderText(/Buscar/), "marta");
    expect(screen.queryByText("Juan Soto")).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(/Buscar/));
    await user.type(screen.getByPlaceholderText(/Buscar/), "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
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
    const dialog = screen.getByRole("dialog", { hidden: true });
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
