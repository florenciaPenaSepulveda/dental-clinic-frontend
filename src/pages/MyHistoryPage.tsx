import { api } from "../api/client";
import DemoNota from "../components/DemoNota";
import HistorialLista from "../components/HistorialLista";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { nombreCompleto } from "../lib/format";

const MyHistoryPage = () => {
  const { data, loading, error } = useLoad(() => api.miHistorial(), []);

  return (
    <>
      <PageHeader
        title="Mi historial"
        subtitle={data ? `${nombreCompleto(data.paciente)} · RUT ${data.paciente.rut}` : "Tus citas y atenciones en la clínica"}
      />
      <DemoNota>tus citas se borran cuando el servidor se reinicia (tras unos 15 minutos sin uso o al actualizar la demo).</DemoNota>
      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <Notice tone="error">{error || "No se pudo cargar tu historial."}</Notice>
      ) : (
        <div className="space-y-6">
          <section className="surface">
            <h2 className="section-title mb-3">Próximas citas</h2>
            {data.proximas.length === 0 ? (
              <EmptyState title="No tienes citas próximas" description="Puedes reservar una hora desde la sección Reservar hora." />
            ) : (
              <HistorialLista items={data.proximas} />
            )}
          </section>
          <section className="surface">
            <h2 className="section-title mb-3">Historial de atenciones</h2>
            {data.historial.length === 0 ? (
              <EmptyState title="Aún no tienes atenciones registradas" description="Cuando te atiendas en la clínica verás aquí el detalle y el profesional que te atendió." />
            ) : (
              <HistorialLista items={data.historial} />
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default MyHistoryPage;
