import { Link } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState, Notice, Spinner } from "../components/States";
import PageHeader from "../components/PageHeader";
import { useLoad } from "../hooks/useLoad";
import { formatPrecio, nombreCompleto } from "../lib/format";

const HomePage = () => {
  const { data, loading, error } = useLoad(() => Promise.all([api.dentistas(), api.servicios()]), []);
  const [dentistas, servicios] = data ?? [[], []];

  return (
    <>
      <PageHeader
        title="Bienvenido a la Clínica Dental"
        subtitle="Reserva tu hora en línea, elige a tu dentista y recibe la confirmación por correo."
        actions={
          <Link to="/reservar" className="btn btn-primary">
            Reservar hora
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <Notice tone="error">{error}</Notice>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface">
            <h2 className="section-title mb-3">Nuestros dentistas</h2>
            {dentistas.length === 0 ? (
              <EmptyState title="Aún no hay dentistas registrados" />
            ) : (
              <ul className="divide-y divide-base-300">
                {dentistas.map((dentista) => (
                  <li key={dentista.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-neutral">{nombreCompleto(dentista)}</p>
                      <p className="text-base-content/70">{dentista.especialidad || "Odontología general"}</p>
                    </div>
                    {dentista.region && <span className="badge badge-ghost">{dentista.region.nombre}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface">
            <h2 className="section-title mb-3">Servicios</h2>
            {servicios.length === 0 ? (
              <EmptyState title="Aún no hay servicios registrados" />
            ) : (
              <ul className="divide-y divide-base-300">
                {servicios.map((servicio) => (
                  <li key={servicio.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-neutral">{servicio.nombre}</p>
                      <p className="text-base-content/70">{servicio.duracion_min} minutos</p>
                    </div>
                    <span className="font-semibold text-primary">{formatPrecio(servicio.precio)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default HomePage;
