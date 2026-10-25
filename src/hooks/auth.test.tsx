import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import Layout from "../components/Layout";
import RequireStaff from "../components/RequireStaff";
import { borrarSesion, guardarSesion, leerSesion } from "../lib/session";
import LoginPage from "../pages/LoginPage";
import { AuthProvider, useAuth } from "./useAuth";

vi.mock("../api/client", () => ({ api: { login: vi.fn(), logout: vi.fn() } }));

const mocked = vi.mocked(api);

const renderApp = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/ingresar" element={<LoginPage />} />
            <Route element={<RequireStaff />}>
              <Route path="/agenda" element={<p>Agenda privada</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

const ingresar = async (user: ReturnType<typeof userEvent.setup>, usuario = "recepcion", clave = "clave-123") => {
  await user.type(screen.getByLabelText("Usuario"), usuario);
  await user.type(screen.getByLabelText("Contraseña"), clave);
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("acceso del personal", () => {
  it("redirige al ingreso cuando no hay sesión y oculta las secciones privadas", () => {
    renderApp("/agenda");
    expect(screen.getByRole("heading", { name: "Ingreso del personal" })).toBeInTheDocument();
    expect(screen.queryByText("Agenda privada")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).not.toHaveTextContent("Pacientes");
  });

  it("inicia sesión, vuelve a la página pedida y muestra las secciones del personal", async () => {
    const user = userEvent.setup();
    mocked.login.mockResolvedValue({ token: "abc", username: "recepcion" });
    renderApp("/agenda");
    await ingresar(user);
    expect(mocked.login).toHaveBeenCalledWith("recepcion", "clave-123");
    expect(await screen.findByText("Agenda privada")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Pacientes");
    expect(screen.getByRole("button", { name: "Salir (recepcion)" })).toBeInTheDocument();
    expect(leerSesion()).toEqual({ token: "abc", username: "recepcion" });
  });

  it("muestra el error de credenciales y permite reintentar", async () => {
    const user = userEvent.setup();
    mocked.login.mockRejectedValueOnce(new Error("Usuario o contraseña incorrectos.")).mockResolvedValueOnce({ token: "abc", username: "recepcion" });
    renderApp("/ingresar");
    await ingresar(user, "recepcion", "mala");
    expect(await screen.findByRole("alert")).toHaveTextContent("Usuario o contraseña incorrectos.");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "buena");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Agenda privada")).toBeInTheDocument();
  });

  it("exige usuario y contraseña antes de consultar al servidor", async () => {
    const user = userEvent.setup();
    renderApp("/ingresar");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa tu usuario y tu contraseña.");
    expect(mocked.login).not.toHaveBeenCalled();
  });

  it("entra directo cuando ya hay una sesión guardada", () => {
    guardarSesion({ token: "abc", username: "recepcion" });
    renderApp("/ingresar");
    expect(screen.getByText("Agenda privada")).toBeInTheDocument();
  });

  it("cierra la sesión y vuelve al ingreso", async () => {
    const user = userEvent.setup();
    guardarSesion({ token: "abc", username: "recepcion" });
    mocked.logout.mockResolvedValue(undefined);
    renderApp("/agenda");
    await user.click(screen.getByRole("button", { name: "Salir (recepcion)" }));
    expect(await screen.findByRole("heading", { name: "Ingreso del personal" })).toBeInTheDocument();
    expect(mocked.logout).toHaveBeenCalledTimes(1);
    expect(leerSesion()).toBeNull();
  });

  it("cierra la sesión local aunque el servidor no responda", async () => {
    const user = userEvent.setup();
    guardarSesion({ token: "abc", username: "recepcion" });
    mocked.logout.mockRejectedValue(new Error("Sin conexión"));
    renderApp("/agenda");
    await user.click(screen.getByRole("button", { name: "Salir (recepcion)" }));
    expect(await screen.findByRole("heading", { name: "Ingreso del personal" })).toBeInTheDocument();
    expect(leerSesion()).toBeNull();
  });

  it("saca al usuario cuando la sesión expira", async () => {
    guardarSesion({ token: "abc", username: "recepcion" });
    renderApp("/agenda");
    expect(screen.getByText("Agenda privada")).toBeInTheDocument();
    act(() => borrarSesion());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ingreso del personal" })).toBeInTheDocument());
  });

  it("exige AuthProvider para usar useAuth", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow("AuthProvider");
  });
});
