import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { EmptyState, Notice, Spinner } from "./States";
import { useLoad } from "../hooks/useLoad";
import App from "../App";

describe("Layout", () => {
  it("muestra la navegación y el contenido de la ruta", () => {
    render(
      <MemoryRouter initialEntries={["/prueba"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/prueba" element={<p>Contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(nav).toHaveTextContent("Reservar hora");
    expect(nav).toHaveTextContent("Agenda");
    expect(nav).toHaveTextContent("Pacientes");
    expect(screen.getByText(/Agenda y reservas en línea/)).toBeInTheDocument();
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
    expect(screen.getByRole("status")).toHaveTextContent("Listo");
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
