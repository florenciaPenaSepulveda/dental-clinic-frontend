import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import { AuthProvider } from "../hooks/useAuth";
import ErrorBoundary from "./ErrorBoundary";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { EmptyState, Notice, Spinner } from "./States";
import { useLoad } from "../hooks/useLoad";
import App from "../App";

describe("Layout", () => {
  it("muestra la navegación y el contenido de la ruta", () => {
    render(
      <MemoryRouter initialEntries={["/prueba"]}>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/prueba" element={<p>Contenido</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(nav).toHaveTextContent("Reservar hora");
    expect(nav).toHaveTextContent("Ingresar");
    expect(nav).not.toHaveTextContent("Agenda");
    expect(nav).not.toHaveTextContent("Pacientes");
    expect(screen.getByText(/Agenda y reservas en línea/)).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("avisa que los datos son de demostración cuando VITE_DEMO está activo", () => {
    vi.stubEnv("VITE_DEMO", "true");
    render(
      <MemoryRouter initialEntries={["/prueba"]}>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/prueba" element={<p>Contenido</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("note")).toHaveTextContent("los datos son ficticios y se reinician");
    vi.unstubAllEnvs();
  });
});

describe("Accesibilidad y errores", () => {
  it("ofrece un enlace para saltar al contenido principal", () => {
    render(
      <MemoryRouter initialEntries={["/prueba"]}>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/prueba" element={<p>Contenido</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido");
  });

  it("actualiza el título del documento con el de cada página", () => {
    const { rerender } = render(<PageHeader title="Pacientes" />);
    expect(document.title).toBe("Pacientes · Clínica Dental");
    rerender(<PageHeader title="Agenda" />);
    expect(document.title).toBe("Agenda · Clínica Dental");
  });

  it("muestra un mensaje en lugar de una pantalla en blanco cuando algo falla", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const recargar = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload: recargar });
    const Roto = () => {
      throw new Error("falla de prueba");
    };
    render(
      <ErrorBoundary>
        <Roto />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal");
    await user.click(screen.getByRole("button", { name: "Recargar la página" }));
    expect(recargar).toHaveBeenCalled();
  });

  it("renderiza el contenido cuando no hay errores", () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });
});

describe("componentes simples", () => {
  it("renderizan sus textos", () => {
    render(
      <>
        <PageHeader title="Título" subtitle="Subtítulo" actions={<button>Acción</button>} />
        <Spinner />
        <EmptyState title="Vacío" description="Sin datos" action={<button>Crear</button>} />
        <Notice tone="error">Falló</Notice>
        <Notice tone="success">Listo</Notice>
      </>,
    );
    expect(screen.getByText("Subtítulo")).toBeInTheDocument();
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    const estados = screen.getAllByRole("status");
    expect(estados).toHaveLength(2);
    expect(estados[0]).toHaveTextContent("Cargando...");
    expect(estados[1]).toHaveTextContent("Listo");
  });
});

describe("Modal", () => {
  const Harness = () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir</button>
        <button onClick={() => setOpen(false)}>Cerrar desde fuera</button>
        <Modal open={open} title="Ventana" onClose={() => setOpen(false)}>
          <p>Contenido</p>
        </Modal>
      </>
    );
  };

  it("abre y cierra el diálogo", async () => {
    const { container } = render(<Harness />);
    const dialog = container.querySelector("dialog") as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Abrir"));
    expect(dialog).toHaveAttribute("open");
    await userEvent.click(screen.getByText("Cerrar desde fuera"));
    expect(dialog).not.toHaveAttribute("open");
  });
});

describe("useLoad", () => {
  it("entrega los datos y permite recargar", async () => {
    const loader = vi.fn().mockResolvedValueOnce("primero").mockResolvedValueOnce("segundo");
    const { result } = renderHook(() => useLoad(loader, []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("primero"));
    result.current.reload();
    await waitFor(() => expect(result.current.data).toBe("segundo"));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("informa los errores", async () => {
    const { result } = renderHook(() => useLoad(() => Promise.reject(new Error("Falló la carga")), []));
    await waitFor(() => expect(result.current.error).toBe("Falló la carga"));
    expect(result.current.data).toBeUndefined();
  });

  it("usa un mensaje genérico para errores desconocidos", async () => {
    const { result } = renderHook(() => useLoad(() => Promise.reject("texto"), []));
    await waitFor(() => expect(result.current.error).toBe("Ocurrió un error inesperado."));
  });

  it("recarga cuando cambian las dependencias y descarta respuestas antiguas", async () => {
    const loader = vi.fn((valor: string) => Promise.resolve(valor));
    const { result, rerender } = renderHook(({ valor }) => useLoad(() => loader(valor), [valor]), {
      initialProps: { valor: "a" },
    });
    await waitFor(() => expect(result.current.data).toBe("a"));
    rerender({ valor: "b" });
    await waitFor(() => expect(result.current.data).toBe("b"));
  });
});

describe("App", () => {
  it("redirige las rutas desconocidas al inicio", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response("[]", { status: 200 })));
    window.history.pushState({}, "", "/no-existe");
    render(<App />);
    expect(await screen.findByText("Bienvenido a la Clínica Dental")).toBeInTheDocument();
  });
});
