import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
const idleLink = "text-primary-content/80 hover:bg-primary-content/10 hover:text-primary-content";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseLink} ${isActive ? "bg-primary-content/15 text-primary-content" : idleLink}`;

export const Navbar = () => {
  const { sesion, cerrarSesion } = useAuth();
  const links = enlacesDe(sesion?.rol, sesion?.debe_cambiar_clave);

  return (
    <header className="bg-primary text-primary-content shadow">
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
  <footer className="border-t border-base-300 bg-base-100 py-4 text-center text-xs text-base-content/60">
    Clínica Dental · Agenda y reservas en línea
  </footer>
);

const Layout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default Layout;
