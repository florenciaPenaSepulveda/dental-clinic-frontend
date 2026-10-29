import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Breadcrumbs from "./Breadcrumbs";

const publicLinks = [
  { to: "/", label: "Inicio", end: true },
  { to: "/reservar", label: "Reservar hora", end: false },
];

const staffLinks = [
  { to: "/agenda", label: "Agenda", end: false },
  { to: "/pacientes", label: "Pacientes", end: false },
];

const equipoLink = { to: "/equipo", label: "Equipo", end: false };

const pacienteLinks = [{ to: "/mi-historial", label: "Mi historial", end: false }];

const cuentaLink = { to: "/mi-cuenta", label: "Mi cuenta", end: false };

const enlacesDe = (rol?: string, debeCambiarClave = false) => {
  if (!rol) return publicLinks;
  if (debeCambiarClave) return [cuentaLink];
  const propios = rol === "paciente" ? pacienteLinks : rol === "recepcion" ? [...staffLinks, equipoLink] : staffLinks;
  return [...publicLinks, ...propios, cuentaLink];
};

const baseLink = "rounded-btn px-3 py-2 text-sm font-medium transition-colors";
// Texto blanco pleno sobre el primario (5.47:1); el estado activo/hover oscurece el fondo en vez de aclararlo (>= 6.9:1).
const idleLink = "text-primary-content hover:bg-black/15";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseLink} ${isActive ? "bg-black/20 text-primary-content" : idleLink}`;

export const Navbar = () => {
  const { sesion, cerrarSesion } = useAuth();
  const links = enlacesDe(sesion?.rol, sesion?.debe_cambiar_clave);

  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-content shadow">
      <a
        href="#contenido"
        className="sr-only rounded-btn bg-base-100 px-3 py-2 text-sm font-medium text-primary focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-content text-primary">+</span>
          Clínica Dental
        </NavLink>
        <nav className="flex flex-wrap gap-1" aria-label="Principal">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {sesion ? (
            <button type="button" className={`${baseLink} ${idleLink}`} onClick={cerrarSesion}>
              Salir ({sesion.nombre})
            </button>
          ) : (
            <NavLink to="/ingresar" className={linkClass}>
              Ingresar
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
};

export const Footer = () => (
  <footer className="border-t border-base-300 bg-base-100 py-4 text-center text-xs text-base-content/70">
    Clínica Dental · Agenda y reservas en línea
  </footer>
);

// Solo en el sitio de demostración (VITE_DEMO=true al compilar): avisa que los datos son ficticios y se reinician.
export const AvisoDemo = () =>
  import.meta.env.VITE_DEMO === "true" ? (
    <div role="note" className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
      <strong>Demostración:</strong> los datos son ficticios y se reinician cuando el servidor se duerme (tras unos 15 minutos sin uso).
      No ingreses datos reales. La primera carga puede tardar hasta un minuto.
    </div>
  ) : null;

const titulos: Record<string, string> = {
  "/": "Inicio",
  "/reservar": "Reservar hora",
  "/ingresar": "Ingresar",
  "/activar-cuenta": "Activar cuenta",
  "/agenda": "Agenda",
  "/pacientes": "Pacientes",
  "/equipo": "Equipo",
  "/mi-cuenta": "Mi cuenta",
  "/mi-historial": "Mi historial",
};

const Layout = () => {
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);
  const primeraCarga = useRef(true);

  // En una SPA el navegador no anuncia el cambio de página: se actualiza el título y se lleva el foco al contenido.
  useEffect(() => {
    document.title = `${titulos[pathname] ?? "Clínica Dental"} · Clínica Dental`;
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    principal.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <AvisoDemo />
      <Navbar />
      <main ref={principal} id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none">
        <Breadcrumbs />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
