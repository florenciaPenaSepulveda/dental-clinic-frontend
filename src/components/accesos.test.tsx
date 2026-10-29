import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";
import PasswordField from "./PasswordField";

describe("PasswordField", () => {
  it("oculta la contraseña por defecto y permite mostrarla y ocultarla", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Contraseña" defaultValue="secreta-123" />);
    const campo = screen.getByLabelText("Contraseña");
    expect(campo).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(campo).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo).toHaveAttribute("type", "password");
  });

  it("cada campo tiene su propio botón y no envía el formulario", async () => {
    const user = userEvent.setup();
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={enviar}>
        <PasswordField label="Nueva contraseña" />
        <PasswordField label="Repite la nueva contraseña" />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Mostrar nueva contraseña" }));
    expect(screen.getByLabelText("Nueva contraseña")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Repite la nueva contraseña")).toHaveAttribute("type", "password");
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe("Breadcrumbs", () => {
  const verEn = (ruta: string) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Breadcrumbs />
      </MemoryRouter>,
    );

  it("no se muestra en el inicio ni en rutas desconocidas", () => {
    verEn("/");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("muestra Inicio y la página actual", () => {
    verEn("/reservar");
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(nav).toHaveTextContent("InicioReservar hora");
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Reservar hora")).toHaveAttribute("aria-current", "page");
  });

  it("encadena la activación de cuenta bajo Ingresar", () => {
    verEn("/activar-cuenta");
    expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute("href", "/ingresar");
    expect(screen.getByText("Activar cuenta")).toHaveAttribute("aria-current", "page");
  });
});

describe("Formularios de acceso", () => {
  it("todos los campos de texto conservan el estilo de campo", async () => {
    const { default: LoginPage } = await import("../pages/LoginPage");
    const { default: ActivateAccountPage } = await import("../pages/ActivateAccountPage");
    const { AuthProvider } = await import("../hooks/useAuth");
    for (const Pagina of [LoginPage, ActivateAccountPage]) {
      const { container, unmount } = render(
        <MemoryRouter>
          <AuthProvider>
            <Pagina />
          </AuthProvider>
        </MemoryRouter>,
      );
      const campos = container.querySelectorAll("input");
      expect(campos.length).toBeGreaterThan(1);
      campos.forEach((campo) => expect(campo).toHaveClass("input", "input-bordered", "w-full"));
      unmount();
    }
  });
});
