import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Inicio", end: true },
  { to: "/reservar", label: "Reservar hora", end: false },
  { to: "/agenda", label: "Agenda", end: false },
  { to: "/pacientes", label: "Pacientes", end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-primary-content/15 text-primary-content" : "text-primary-content/80 hover:bg-primary-content/10 hover:text-primary-content"
  }`;

export const Navbar = () => (
  <header className="bg-primary text-primary-content shadow">
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
      </nav>
    </div>
  </header>
);

export const Footer = () => (
  <footer className="border-t border-base-300 bg-base-100 py-4 text-center text-xs text-base-content/60">
    Clínica Dental · Agenda y reservas en línea
  </footer>
);

const Layout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default Layout;
