import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import HistorialLista from "../components/HistorialLista";
import Layout from "../components/Layout";
import RequireRol from "../components/RequireRol";
import { AuthProvider } from "../hooks/useAuth";
import { guardarSesion, leerSesion } from "../lib/session";
import { archivo, historialItem, paciente, sesionDe } from "../test/fixtures";
import ActivateAccountPage from "./ActivateAccountPage";
import MyHistoryPage from "./MyHistoryPage";

vi.mock("../api/client", () => ({ api: { miHistorial: vi.fn(), activarCuenta: vi.fn(), archivo: vi.fn(), logout: vi.fn() } }));

const mocked = vi.mocked(api);

const renderRutas = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Inicio público</p>} />
            <Route path="/activar-cuenta" element={<ActivateAccountPage />} />
            <Route element={<RequireRol roles={["paciente"]} />}>
              <Route path="/mi-historial" element={<MyHistoryPage />} />
            </Route>
            <Route element={<RequireRol roles={["recepcion", "dentista"]} />}>
              <Route path="/agenda" element={<p>Agenda del personal</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("Mi historial", () => {
  beforeEach(() => guardarSesion(sesionDe("paciente")));

  it("muestra las próximas citas y las atenciones con el profesional que atendió", async () => {
    mocked.miHistorial.mockResolvedValue({
      paciente,
      proximas: [historialItem(1, { estado: "pendiente", atencion: null, fecha: "2030-01-10", servicio: null })],
      historial: [historialItem(2, { motivo: "Dolor", archivos: [archivo()] }), historialItem(3, { estado: "no_asistio", atencion: null })],
    });
    renderRutas("/mi-historial");
    expect(await screen.findByText("Juan Soto · RUT 12.345.678-5")).toBeInTheDocument();
    expect(screen.getByText("Próximas citas")).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Pérez · Ortodoncia/)).toHaveLength(3);
    expect(screen.getByText("Caries oclusal")).toBeInTheDocument();
    expect(screen.getByText("Restauración con resina")).toBeInTheDocument();
    expect(screen.getByText("Evitar alimentos duros")).toBeInTheDocument();
    expect(screen.getByText("Dolor")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Atendida")).toBeInTheDocument();
    expect(screen.getByText("No asistió")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar examen.pdf" })).toBeInTheDocument();
    expect(screen.queryByText("Observaciones internas")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Mi historial");
    expect(screen.getByRole("navigation", { name: "Principal" })).not.toHaveTextContent("Pacientes");
  });

  it("muestra mensajes cuando aún no hay citas ni atenciones", async () => {
    mocked.miHistorial.mockResolvedValue({ paciente, proximas: [], historial: [] });
    renderRutas("/mi-historial");
    expect(await screen.findByText("No tienes citas próximas")).toBeInTheDocument();
    expect(screen.getByText("Aún no tienes atenciones registradas")).toBeInTheDocument();
  });

  it("informa si falla la carga", async () => {
    mocked.miHistorial.mockRejectedValue(new Error("Sin conexión"));
    renderRutas("/mi-historial");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });

  it("no deja entrar a las páginas del personal", async () => {
    renderRutas("/agenda");
    expect(await screen.findByText("Inicio público")).toBeInTheDocument();
  });
});

describe("Acceso por rol", () => {
  it("el personal no entra al historial de pacientes", async () => {
    guardarSesion(sesionDe("dentista"));
    renderRutas("/mi-historial");
    expect(await screen.findByText("Inicio público")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Agenda");
  });

  it("sin sesión el historial redirige al ingreso", () => {
    renderRutas("/mi-historial");
    expect(screen.queryByText("Mi historial")).not.toBeInTheDocument();
  });
});

describe("HistorialLista", () => {
  it("muestra las observaciones internas solo cuando vienen en los datos", () => {
    render(<HistorialLista items={[historialItem(1, { observaciones: "Paciente nervioso" }), historialItem(2, { atencion: null })]} />);
    const tarjetas = screen.getAllByRole("listitem");
    expect(within(tarjetas[0]).getByText("Observaciones internas")).toBeInTheDocument();
    expect(within(tarjetas[0]).getByText("Paciente nervioso")).toBeInTheDocument();
    expect(within(tarjetas[1]).queryByText("Observaciones internas")).not.toBeInTheDocument();
  });
});

describe("Activar cuenta", () => {
  const llenar = async (user: ReturnType<typeof userEvent.setup>, datos: { rut?: string; email?: string; clave?: string; repetida?: string } = {}) => {
    const { rut = "123456785", email = "juan@test.cl", clave = "Clave-segura-1", repetida = clave } = datos;
    await user.type(screen.getByLabelText("RUT"), rut);
    await user.type(screen.getByLabelText("Correo registrado en la clínica"), email);
    await user.type(screen.getByLabelText("Contraseña"), clave);
    await user.type(screen.getByLabelText("Repite la contraseña"), repetida);
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));
  };

  it("activa la cuenta, inicia la sesión y lleva al historial", async () => {
    const user = userEvent.setup();
    mocked.activarCuenta.mockResolvedValue(sesionDe("paciente"));
    mocked.miHistorial.mockResolvedValue({ paciente, proximas: [], historial: [] });
    renderRutas("/activar-cuenta");
    await llenar(user);
    expect(await screen.findByText("Aún no tienes atenciones registradas")).toBeInTheDocument();
    expect(mocked.activarCuenta).toHaveBeenCalledWith("12.345.678-5", "juan@test.cl", "Clave-segura-1");
    expect(leerSesion()?.rol).toBe("paciente");
  });

  it("valida los datos antes de enviar", async () => {
    const user = userEvent.setup();
    renderRutas("/activar-cuenta");
    await llenar(user, { rut: "123456789" });
    expect(screen.getByRole("alert")).toHaveTextContent("El RUT ingresado no es válido.");
    await user.clear(screen.getByLabelText("RUT"));
    await user.type(screen.getByLabelText("RUT"), "123456785");
    await user.clear(screen.getByLabelText("Correo registrado en la clínica"));
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el correo");
    await user.type(screen.getByLabelText("Correo registrado en la clínica"), "juan@test.cl");
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "corta");
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("al menos 8 caracteres");
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "Clave-segura-1");
    await user.clear(screen.getByLabelText("Repite la contraseña"));
    await user.type(screen.getByLabelText("Repite la contraseña"), "otra");
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("no coinciden");
    expect(mocked.activarCuenta).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor", async () => {
    const user = userEvent.setup();
    mocked.activarCuenta.mockRejectedValue(new Error("No pudimos verificar tus datos o la cuenta ya está activada."));
    renderRutas("/activar-cuenta");
    await llenar(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos verificar");
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toBeEnabled();
  });

  it("no se muestra cuando ya hay una sesión iniciada", () => {
    guardarSesion(sesionDe("recepcion"));
    renderRutas("/activar-cuenta");
    expect(screen.getByText("Inicio público")).toBeInTheDocument();
  });
});
