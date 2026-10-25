import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import Layout from "../components/Layout";
import RequireRol from "../components/RequireRol";
import { AuthProvider } from "../hooks/useAuth";
import { guardarSesion, leerSesion } from "../lib/session";
import { dentista, dentistaSinEspecialidad, paciente, pacienteSinContacto, sesionDe } from "../test/fixtures";
import EquipoPage from "./EquipoPage";
import LoginPage from "./LoginPage";
import MiCuentaPage from "./MiCuentaPage";
import PatientsPage from "./PatientsPage";

vi.mock("../api/client", () => ({
  api: {
    dentistas: vi.fn(),
    crearDentista: vi.fn(),
    actualizarDentista: vi.fn(),
    cuentaDentista: vi.fn(),
    cuentaPaciente: vi.fn(),
    pacientes: vi.fn(),
    cambiarClave: vi.fn(),
    login: vi.fn(),
    historialPaciente: vi.fn(),
    logout: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const renderRutas = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Inicio público</p>} />
            <Route path="/ingresar" element={<LoginPage />} />
            <Route element={<RequireRol roles={["recepcion"]} />}>
              <Route path="/equipo" element={<EquipoPage />} />
              <Route path="/pacientes" element={<PatientsPage />} />
            </Route>
            <Route element={<RequireRol roles={["recepcion", "dentista", "paciente"]} />}>
              <Route path="/mi-cuenta" element={<MiCuentaPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

const dialogo = (titulo: string) => within(screen.getByRole("heading", { name: titulo, hidden: true }).closest("dialog") as HTMLElement);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  guardarSesion(sesionDe("recepcion"));
  mocked.dentistas.mockResolvedValue([dentista, { ...dentistaSinEspecialidad, tiene_cuenta: false }]);
  mocked.pacientes.mockResolvedValue([paciente, pacienteSinContacto]);
});

describe("Equipo", () => {
  it("lista a los dentistas y si tienen cuenta", async () => {
    renderRutas("/equipo");
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Con cuenta")).toBeInTheDocument();
    expect(screen.getByText("Sin cuenta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restablecer acceso" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Equipo");
  });

  it("solo es accesible para recepción", async () => {
    guardarSesion(sesionDe("dentista"));
    renderRutas("/equipo");
    expect(await screen.findByText("Inicio público")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).not.toHaveTextContent("Equipo");
  });

  it("registra a un dentista nuevo", async () => {
    const user = userEvent.setup();
    mocked.crearDentista.mockResolvedValue(dentista);
    renderRutas("/equipo");
    await screen.findByText("Ana Pérez");
    await user.click(screen.getByRole("button", { name: "Nuevo dentista" }));
    const form = dialogo("Nuevo dentista");
    await user.click(form.getByRole("button", { name: "Registrar", hidden: true }));
    expect(await form.findByText("Completa el nombre y el apellido.")).toBeInTheDocument();
    await user.type(form.getByLabelText("Nombre"), " Sofía ");
    await user.type(form.getByLabelText("Apellido"), "Núñez");
    await user.type(form.getByLabelText("Especialidad"), "Periodoncia");
    await user.type(form.getByLabelText("Correo electrónico"), "s@clinica.cl");
    await user.type(form.getByLabelText("Teléfono"), "999");
    await user.clear(form.getByLabelText("Sobrecupos máximos por día"));
    await user.type(form.getByLabelText("Sobrecupos máximos por día"), "2");
    await user.click(form.getByRole("button", { name: "Registrar", hidden: true }));
    expect(await screen.findByText(/Dentista registrado/)).toBeInTheDocument();
    expect(mocked.crearDentista).toHaveBeenCalledWith({
      nombre: "Sofía",
      apellido: "Núñez",
      especialidad: "Periodoncia",
      email: "s@clinica.cl",
      telefono: "999",
      max_overbook_day: 2,
    });
    expect(mocked.dentistas).toHaveBeenCalledTimes(2);
  });

  it("edita a un dentista y muestra los errores del servidor", async () => {
    const user = userEvent.setup();
    mocked.actualizarDentista.mockRejectedValueOnce(new Error("email: Introduzca una dirección de correo válida.")).mockResolvedValueOnce(dentista);
    renderRutas("/equipo");
    await screen.findByText("Ana Pérez");
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const form = dialogo("Editar dentista");
    expect(form.getByLabelText("Especialidad", { selector: "input" })).toHaveValue("Ortodoncia");
    await user.clear(form.getByLabelText("Nombre"));
    await user.type(form.getByLabelText("Nombre"), "Anita");
    await user.click(form.getByRole("button", { name: "Guardar cambios", hidden: true }));
    expect(await form.findByText(/dirección de correo válida/)).toBeInTheDocument();
    await user.click(form.getByRole("button", { name: "Guardar cambios", hidden: true }));
    expect(await screen.findByText("Dentista actualizado.")).toBeInTheDocument();
    expect(mocked.actualizarDentista).toHaveBeenLastCalledWith(1, expect.objectContaining({ nombre: "Anita" }));
  });

  it("informa cuando no hay dentistas o falla la carga", async () => {
    mocked.dentistas.mockResolvedValueOnce([]);
    renderRutas("/equipo");
    expect(await screen.findByText("Aún no hay dentistas")).toBeInTheDocument();
  });

  it("informa si falla la carga", async () => {
    mocked.dentistas.mockRejectedValue(new Error("Sin conexión"));
    renderRutas("/equipo");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });

  it("crea la cuenta de un dentista y muestra el usuario y la contraseña temporal", async () => {
    const user = userEvent.setup();
    mocked.cuentaDentista.mockResolvedValue({ username: "dr.rojas", password: "Temporal-123", creada: true });
    renderRutas("/equipo");
    await screen.findByText("Ana Pérez");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    const cuenta = dialogo("Cuenta de acceso");
    expect(cuenta.getByText(/Se creará una cuenta de acceso para Luis Rojas/)).toBeInTheDocument();
    await user.click(cuenta.getByRole("button", { name: "Generar acceso", hidden: true }));
    expect(await cuenta.findByText("Cuenta creada.")).toBeInTheDocument();
    expect(cuenta.getByText("dr.rojas")).toBeInTheDocument();
    expect(cuenta.getByText("Temporal-123")).toBeInTheDocument();
    expect(mocked.cuentaDentista).toHaveBeenCalledWith(2);
    expect(mocked.dentistas).toHaveBeenCalledTimes(2);
    await user.click(cuenta.getByRole("button", { name: "Listo", hidden: true }));
  });

  it("restablece la contraseña de un dentista que ya tiene cuenta", async () => {
    const user = userEvent.setup();
    mocked.cuentaDentista.mockResolvedValue({ username: "dr.perez", password: "Nueva-456", creada: false });
    renderRutas("/equipo");
    await screen.findByText("Ana Pérez");
    await user.click(screen.getByRole("button", { name: "Restablecer acceso" }));
    const cuenta = dialogo("Cuenta de acceso");
    expect(cuenta.getByText(/ya tiene una cuenta/)).toBeInTheDocument();
    await user.click(cuenta.getByRole("button", { name: "Restablecer contraseña", hidden: true }));
    expect(await cuenta.findByText("Contraseña restablecida.")).toBeInTheDocument();
    expect(cuenta.getByText("Nueva-456")).toBeInTheDocument();
  });

  it("informa si no se puede generar el acceso", async () => {
    const user = userEvent.setup();
    mocked.cuentaDentista.mockRejectedValueOnce(new Error("Sin permiso")).mockRejectedValueOnce("fallo");
    renderRutas("/equipo");
    await screen.findByText("Ana Pérez");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    const cuenta = dialogo("Cuenta de acceso");
    await user.click(cuenta.getByRole("button", { name: "Generar acceso", hidden: true }));
    expect(await cuenta.findByText("Sin permiso")).toBeInTheDocument();
    await user.click(cuenta.getByRole("button", { name: "Generar acceso", hidden: true }));
    expect(await cuenta.findByText("No se pudo generar el acceso.")).toBeInTheDocument();
    await user.click(cuenta.getByRole("button", { name: "Cancelar", hidden: true }));
  });
});

describe("Cuentas de pacientes", () => {
  it("crea la cuenta de un paciente desde la lista", async () => {
    const user = userEvent.setup();
    mocked.cuentaPaciente.mockResolvedValue({ username: "12.345.678-5", password: "Paciente-789", creada: true });
    renderRutas("/pacientes");
    await screen.findByText("Juan Soto");
    await user.click(screen.getAllByRole("button", { name: "Crear cuenta" })[0]);
    const cuenta = dialogo("Cuenta de acceso");
    await user.click(cuenta.getByRole("button", { name: "Generar acceso", hidden: true }));
    expect(await cuenta.findByText("Paciente-789")).toBeInTheDocument();
    expect(mocked.cuentaPaciente).toHaveBeenCalledWith(1);
    expect(mocked.pacientes).toHaveBeenCalledTimes(2);
  });

  it("indica restablecer cuando el paciente ya tiene cuenta", async () => {
    mocked.pacientes.mockResolvedValue([{ ...paciente, tiene_cuenta: true }]);
    renderRutas("/pacientes");
    expect(await screen.findByRole("button", { name: "Restablecer acceso" })).toBeInTheDocument();
  });
});

describe("Contraseña temporal", () => {
  const temporal = () => guardarSesion({ ...sesionDe("recepcion"), debe_cambiar_clave: true });

  it("obliga a cambiarla antes de usar cualquier sección", async () => {
    temporal();
    renderRutas("/equipo");
    expect(await screen.findByText("Tu contraseña es temporal. Debes cambiarla para poder usar el sistema.")).toBeInTheDocument();
    expect(mocked.dentistas).not.toHaveBeenCalled();
    const menu = screen.getByRole("navigation", { name: "Principal" });
    expect(menu).toHaveTextContent("Mi cuenta");
    expect(menu).not.toHaveTextContent("Equipo");
    expect(menu).not.toHaveTextContent("Pacientes");
    expect(menu).not.toHaveTextContent("Reservar hora");
  });

  it("al iniciar sesión con una contraseña temporal lleva a Mi cuenta", async () => {
    sessionStorage.clear();
    const user = userEvent.setup();
    mocked.login.mockResolvedValue({ ...sesionDe("dentista"), debe_cambiar_clave: true });
    renderRutas("/ingresar");
    await user.type(screen.getByLabelText("Usuario o RUT"), "dr.nuevo");
    await user.type(screen.getByLabelText("Contraseña"), "Temporal-123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText(/Tu contraseña es temporal/)).toBeInTheDocument();
  });

  it("libera el acceso cuando la cambia", async () => {
    temporal();
    const user = userEvent.setup();
    mocked.cambiarClave.mockResolvedValue(sesionDe("recepcion"));
    renderRutas("/mi-cuenta");
    await user.type(await screen.findByLabelText("Contraseña actual"), "Temporal-123");
    await user.type(screen.getByLabelText("Nueva contraseña"), "Mi-clave-personal-26");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "Mi-clave-personal-26");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada.");
    expect(screen.queryByText(/Tu contraseña es temporal/)).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Equipo");
  });

  it("no acepta conservar la misma contraseña", async () => {
    temporal();
    const user = userEvent.setup();
    renderRutas("/mi-cuenta");
    await user.type(await screen.findByLabelText("Contraseña actual"), "Temporal-123");
    await user.type(screen.getByLabelText("Nueva contraseña"), "Temporal-123");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "Temporal-123");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("debe ser distinta de la actual");
    expect(mocked.cambiarClave).not.toHaveBeenCalled();
  });
});

describe("Mi cuenta", () => {
  it("muestra los datos de la sesión", async () => {
    guardarSesion(sesionDe("dentista"));
    renderRutas("/mi-cuenta");
    expect(await screen.findByText("Ana Pérez · Dentista · usuario dr.perez")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Mi cuenta");
  });

  it("cambia la contraseña y conserva la sesión con el token nuevo", async () => {
    const user = userEvent.setup();
    mocked.cambiarClave.mockResolvedValue({ ...sesionDe("recepcion"), token: "token-nuevo" });
    renderRutas("/mi-cuenta");
    await user.type(await screen.findByLabelText("Contraseña actual"), "vieja-clave");
    await user.type(screen.getByLabelText("Nueva contraseña"), "Nueva-clave-9");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "Nueva-clave-9");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada.");
    expect(mocked.cambiarClave).toHaveBeenCalledWith("vieja-clave", "Nueva-clave-9");
    expect(leerSesion()?.token).toBe("token-nuevo");
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
  });

  it("valida los campos antes de enviar", async () => {
    const user = userEvent.setup();
    renderRutas("/mi-cuenta");
    await user.click(await screen.findByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa tu contraseña actual y la nueva.");
    await user.type(screen.getByLabelText("Contraseña actual"), "vieja");
    await user.type(screen.getByLabelText("Nueva contraseña"), "corta");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("al menos 8 caracteres");
    await user.clear(screen.getByLabelText("Nueva contraseña"));
    await user.type(screen.getByLabelText("Nueva contraseña"), "Nueva-clave-9");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "otra");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("no coinciden");
    expect(mocked.cambiarClave).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor", async () => {
    const user = userEvent.setup();
    mocked.cambiarClave.mockRejectedValueOnce(new Error("La contraseña actual no es correcta.")).mockRejectedValueOnce("fallo");
    renderRutas("/mi-cuenta");
    await user.type(await screen.findByLabelText("Contraseña actual"), "mala");
    await user.type(screen.getByLabelText("Nueva contraseña"), "Nueva-clave-9");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "Nueva-clave-9");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña actual no es correcta.");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByText("No se pudo cambiar la contraseña.")).toBeInTheDocument();
  });

  it("exige iniciar sesión", async () => {
    sessionStorage.clear();
    renderRutas("/mi-cuenta");
    expect(screen.queryByText("Cambiar contraseña")).not.toBeInTheDocument();
  });
});
