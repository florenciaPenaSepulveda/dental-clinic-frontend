import { Link, useLocation } from "react-router-dom";

interface Tramo {
  label: string;
  padre?: string;
}

const tramos: Record<string, Tramo> = {
  "/reservar": { label: "Reservar hora", padre: "/" },
  "/ingresar": { label: "Ingresar", padre: "/" },
  "/activar-cuenta": { label: "Activar cuenta", padre: "/ingresar" },
  "/agenda": { label: "Agenda", padre: "/" },
  "/pacientes": { label: "Pacientes", padre: "/" },
  "/equipo": { label: "Equipo", padre: "/" },
  "/servicios": { label: "Servicios", padre: "/" },
  "/mi-cuenta": { label: "Mi cuenta", padre: "/" },
  "/mi-historial": { label: "Mi historial", padre: "/" },
};

const rutaHasta = (pathname: string) => {
  const ruta: { to: string; label: string }[] = [];
  let actual: string | undefined = pathname;
  while (actual && tramos[actual]) {
    ruta.unshift({ to: actual, label: tramos[actual].label });
    actual = tramos[actual].padre;
  }
  return actual === "/" ? [{ to: "/", label: "Inicio" }, ...ruta] : [];
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const ruta = rutaHasta(pathname);

  if (ruta.length < 2) return null;

  return (
    <nav aria-label="Ruta de navegación" className="breadcrumbs mb-4 text-sm">
      <ul>
        {ruta.map((tramo, i) => (
          <li key={tramo.to}>
            {i === ruta.length - 1 ? (
              <span aria-current="page" className="font-medium text-neutral">
                {tramo.label}
              </span>
            ) : (
              <Link to={tramo.to} className="text-primary">
                {tramo.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;
