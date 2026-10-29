import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import RequireRol from "../components/RequireRol";
import { AuthProvider } from "../hooks/useAuth";
import { bloquesDe, formatDuracion } from "../lib/format";
import { guardarSesion } from "../lib/session";
import { servicio, sesionDe } from "../test/fixtures";
import ServiciosPage from "./ServiciosPage";

vi.mock("../api/client", () => ({
  api: {
    servicios: vi.fn(),
    crearServicio: vi.fn(),
    actualizarServicio: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const largo = { id: 2, nombre: "Tratamiento de conducto", duracion_min: 90, precio: "120000.00" };

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={["/servicios"]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>Inicio público</p>} />
          <Route element={<RequireRol roles={["recepcion"]} />}>
            <Route path="/servicios" element={<ServiciosPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

const formulario = () => within(screen.getByRole("heading", { name: /servicio$/i, hidden: true }).closest("dialog") as HTMLElement);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  guardarSesion(sesionDe("recepcion"));
  mocked.servicios.mockResolvedValue([servicio, largo]);
});

describe("Formato de duración", () => {
  it("expresa los minutos y los horarios que ocupan", () => {
    expect(formatDuracion(30)).toBe("30 min");
    expect(formatDuracion(60)).toBe("1 h");
    expect(formatDuracion(90)).toBe("1 h 30 min");
    expect([15, 30, 45, 60, 90].map(bloquesDe)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe("Servicios", () => {
  it("lista los servicios con su duración y los horarios que ocupan", async () => {
    renderPagina();
    const fila = (await screen.findByText("Tratamiento de conducto")).closest("tr") as HTMLElement;
    expect(within(fila).getByText("1 h 30 min")).toBeInTheDocument();
    expect(within(fila).getByText("3 horarios seguidos")).toBeInTheDocument();
    const otra = screen.getByText("Limpieza").closest("tr") as HTMLElement;
    expect(within(otra).getByText("1 horario")).toBeInTheDocument();
  });

  it("solo recepción puede entrar", async () => {
    guardarSesion(sesionDe("dentista"));
    renderPagina();
    expect(await screen.findByText("Inicio público")).toBeInTheDocument();
    expect(mocked.servicios).not.toHaveBeenCalled();
  });

  it("crea un servicio con su duración", async () => {
    const user = userEvent.setup();
    mocked.crearServicio.mockResolvedValue({ id: 3, nombre: "Blanqueamiento", duracion_min: 60, precio: "150000.00" });
    renderPagina();
    await screen.findByText("Limpieza");
    await user.click(screen.getByRole("button", { name: "Nuevo servicio" }));
    const form = formulario();
    await user.type(form.getByLabelText("Nombre"), "  Blanqueamiento ");
    await user.selectOptions(form.getByLabelText("Duración"), "60");
    expect(form.getByText("Ocupará 2 horarios seguidos de la agenda.")).toBeInTheDocument();
    await user.type(form.getByLabelText("Precio (CLP)"), "150000");
    await user.click(form.getByRole("button", { name: "Crear servicio" }));
    expect(mocked.crearServicio).toHaveBeenCalledWith({ nombre: "Blanqueamiento", duracion_min: 60, precio: "150000" });
    expect(await screen.findByText("Servicio creado.")).toBeInTheDocument();
    expect(mocked.servicios).toHaveBeenCalledTimes(2);
  });

  it("edita la duración de un servicio", async () => {
    const user = userEvent.setup();
    mocked.actualizarServicio.mockResolvedValue({ ...largo, duracion_min: 60 });
    renderPagina();
    const fila = (await screen.findByText("Tratamiento de conducto")).closest("tr") as HTMLElement;
    await user.click(within(fila).getByRole("button", { name: "Editar" }));
    const form = formulario();
    expect(form.getByLabelText("Nombre")).toHaveValue("Tratamiento de conducto");
    expect(form.getByLabelText("Duración")).toHaveValue("90");
    expect(form.getByLabelText("Precio (CLP)")).toHaveValue(120000);
    await user.selectOptions(form.getByLabelText("Duración"), "60");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));
    expect(mocked.actualizarServicio).toHaveBeenCalledWith(2, { nombre: "Tratamiento de conducto", duracion_min: 60, precio: "120000" });
    expect(await screen.findByText(/Servicio actualizado/)).toBeInTheDocument();
  });

  it("valida el nombre y el precio antes de guardar", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Limpieza");
    await user.click(screen.getByRole("button", { name: "Nuevo servicio" }));
    const form = formulario();
    await user.click(form.getByRole("button", { name: "Crear servicio" }));
    expect(form.getByRole("alert")).toHaveTextContent("Ingresa el nombre del servicio.");
    await user.type(form.getByLabelText("Nombre"), "Control");
    await user.click(form.getByRole("button", { name: "Crear servicio" }));
    expect(form.getByRole("alert")).toHaveTextContent("Ingresa un precio válido.");
    expect(mocked.crearServicio).not.toHaveBeenCalled();
  });

  it("muestra el error que devuelve el servidor", async () => {
    const user = userEvent.setup();
    mocked.crearServicio.mockRejectedValue(new Error("La duración debe estar entre 15 y 240 minutos."));
    renderPagina();
    await screen.findByText("Limpieza");
    await user.click(screen.getByRole("button", { name: "Nuevo servicio" }));
    const form = formulario();
    await user.type(form.getByLabelText("Nombre"), "Control");
    await user.type(form.getByLabelText("Precio (CLP)"), "10000");
    await user.click(form.getByRole("button", { name: "Crear servicio" }));
    expect(await form.findByRole("alert")).toHaveTextContent("La duración debe estar entre 15 y 240 minutos.");
  });
});
