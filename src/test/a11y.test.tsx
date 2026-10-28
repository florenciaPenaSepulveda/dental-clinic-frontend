import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import App from "../App";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { guardarSesion } from "../lib/session";
import { dentista, dentistaSinEspecialidad, historialItem, paciente, pagina, pacienteSinContacto, servicio, sesionDe } from "./fixtures";
import type { Rol } from "../api/types";

vi.mock("../api/client", () => ({
  api: new Proxy({} as Record<string, unknown>, {
    get: (cache, name: string) => (cache[name] ??= vi.fn()),
  }),
}));

const mocked = vi.mocked(api);

// jsdom no calcula colores ni layout: el contraste se verifica aparte (ver docs/accesibilidad.md).
const auditar = async (container: HTMLElement) => {
  const resultado = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
};

const paginas: { ruta: string; rol?: Rol; espera: RegExp }[] = [
  { ruta: "/", espera: /Ana Pérez/ },
  { ruta: "/reservar", espera: /Reservar hora/ },
  { ruta: "/ingresar", rol: undefined, espera: /Usuario o RUT/ },
  { ruta: "/activar-cuenta", espera: /Activar/i },
  { ruta: "/agenda", rol: "recepcion", espera: /Agenda/ },
  { ruta: "/pacientes", rol: "recepcion", espera: /Juan Soto/ },
  { ruta: "/equipo", rol: "recepcion", espera: /Equipo/ },
  { ruta: "/mi-cuenta", rol: "dentista", espera: /Mi cuenta/ },
  { ruta: "/mi-historial", rol: "paciente", espera: /Mi historial/ },
];

describe("accesibilidad (axe-core)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocked.dentistas.mockResolvedValue([dentista, dentistaSinEspecialidad]);
    mocked.servicios.mockResolvedValue([servicio]);
    mocked.pacientes.mockResolvedValue(pagina([paciente, pacienteSinContacto]));
    mocked.slotsPorFecha.mockResolvedValue([]);
    mocked.semana.mockResolvedValue([]);
    mocked.miHistorial.mockResolvedValue({ paciente, proximas: [], historial: [historialItem(1)] });
  });

  it.each(paginas)("$ruta no tiene violaciones", async ({ ruta, rol, espera }) => {
    if (rol) guardarSesion(sesionDe(rol));
    window.history.pushState({}, "", ruta);
    const { container } = render(<App />);
    expect((await screen.findAllByText(espera)).length).toBeGreaterThan(0);
    expect(await auditar(container)).toEqual([]);
  });

  it("al navegar actualiza el título y lleva el foco al contenido", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    await screen.findByText("Ana Pérez");
    expect(document.title).toBe("Inicio · Clínica Dental");

    await userEvent.click(screen.getByRole("link", { name: "Ingresar" }));
    expect(document.title).toBe("Ingresar · Clínica Dental");
    expect(document.getElementById("contenido")).toHaveFocus();
  });

  it("el modal tiene nombre accesible", () => {
    render(<Modal open title="Nueva reserva" onClose={() => {}}>contenido</Modal>);
    expect(screen.getByRole("dialog", { name: "Nueva reserva", hidden: true })).toBeInTheDocument();
  });
});
