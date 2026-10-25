import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { Reserva } from "../api/types";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { formatFecha, formatHora, nombreCompleto, todayISO } from "../lib/format";

type Aviso = { tone: "success" | "error"; text: string } | null;

const AppointmentsPage = () => {
  const [fecha, setFecha] = useState(todayISO());
  const [dentistaId, setDentistaId] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);

  const [generar, setGenerar] = useState({ dentista: "", fecha: todayISO(1), desde: "08:00", hasta: "16:00", dias: "1" });
  const [generando, setGenerando] = useState(false);
  const [avisoGenerar, setAvisoGenerar] = useState<Aviso>(null);

  const dentistas = useLoad(() => api.dentistas(), []);
  const reservas = useLoad(
    () => api.reservas({ fecha, dentista: dentistaId ? Number(dentistaId) : undefined }),
    [fecha, dentistaId],
  );

  const cancelar = async (reserva: Reserva) => {
    if (!window.confirm(`¿Cancelar la reserva de ${nombreCompleto(reserva.paciente)}?`)) {
      return;
    }
    try {
      await api.cancelarReserva(reserva.id);
      setAviso({ tone: "success", text: "Reserva cancelada." });
      reservas.reload();
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cancelar la reserva." });
    }
  };

  const generarHorarios = async (event: FormEvent) => {
    event.preventDefault();
    if (!generar.dentista) {
      setAvisoGenerar({ tone: "error", text: "Elige un dentista." });
      return;
    }
    setGenerando(true);
    setAvisoGenerar(null);
    try {
      const resultado = await api.generarSlots(Number(generar.dentista), {
        fecha: generar.fecha,
        desde: generar.desde,
        hasta: generar.hasta,
        dias: Number(generar.dias) || 1,
      });
      setAvisoGenerar({ tone: "success", text: `Se prepararon ${resultado.created} horarios.` });
    } catch (error) {
      setAvisoGenerar({ tone: "error", text: error instanceof Error ? error.message : "No se pudieron generar los horarios." });
    } finally {
      setGenerando(false);
    }
  };

  const lista = reservas.data ?? [];

  return (
    <>
      <PageHeader title="Agenda" subtitle={`Reservas del ${formatFecha(fecha)}`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Fecha</span>
              </span>
              <input type="date" className="input input-bordered input-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Dentista</span>
              </span>
              <select className="select select-bordered select-sm" value={dentistaId} onChange={(e) => setDentistaId(e.target.value)}>
                <option value="">Todos</option>
                {(dentistas.data ?? []).map((dentista) => (
                  <option key={dentista.id} value={dentista.id}>
                    {nombreCompleto(dentista)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}

          {reservas.loading ? (
            <Spinner />
          ) : reservas.error ? (
            <Notice tone="error">{reservas.error}</Notice>
          ) : lista.length === 0 ? (
            <EmptyState title="No hay reservas para este día" description="Cuando se reserve una hora aparecerá aquí." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs uppercase text-base-content/60">
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Dentista</th>
                    <th>Servicio</th>
                    <th>Tipo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((reserva) => (
                    <tr key={reserva.id} className="hover">
                      <td className="font-semibold text-neutral">{formatHora(reserva.slot.hora)}</td>
                      <td>
                        <p className="font-medium text-neutral">{nombreCompleto(reserva.paciente)}</p>
                        <p className="text-xs text-base-content/60">{reserva.paciente.rut}</p>
                      </td>
                      <td>{reserva.slot.dentista}</td>
                      <td>{reserva.servicio?.nombre ?? "Sin especificar"}</td>
                      <td>
                        {reserva.sobrecupo ? <span className="badge badge-warning">Sobrecupo</span> : <span className="badge badge-success">Normal</span>}
                      </td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => cancelar(reserva)}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="surface h-fit">
          <h2 className="section-title mb-1">Generar horarios</h2>
          <p className="mb-4 text-base-content/70">Crea bloques de 30 minutos para un dentista.</p>
          <form onSubmit={generarHorarios} className="space-y-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Dentista</span>
              </span>
              <select
                className="select select-bordered w-full"
                aria-label="Dentista para generar horarios"
                value={generar.dentista}
                onChange={(e) => setGenerar({ ...generar, dentista: e.target.value })}
              >
                <option value="">Selecciona un dentista</option>
                {(dentistas.data ?? []).map((dentista) => (
                  <option key={dentista.id} value={dentista.id}>
                    {nombreCompleto(dentista)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Desde el día</span>
                </span>
                <input type="date" className="input input-bordered w-full" value={generar.fecha} min={todayISO()} onChange={(e) => setGenerar({ ...generar, fecha: e.target.value })} />
              </label>
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Cantidad de días</span>
                </span>
                <input type="number" min={1} max={31} className="input input-bordered w-full" value={generar.dias} onChange={(e) => setGenerar({ ...generar, dias: e.target.value })} />
              </label>
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Hora inicial</span>
                </span>
                <input type="time" className="input input-bordered w-full" value={generar.desde} onChange={(e) => setGenerar({ ...generar, desde: e.target.value })} />
              </label>
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Hora final</span>
                </span>
                <input type="time" className="input input-bordered w-full" value={generar.hasta} onChange={(e) => setGenerar({ ...generar, hasta: e.target.value })} />
              </label>
            </div>
            {avisoGenerar && <Notice tone={avisoGenerar.tone}>{avisoGenerar.text}</Notice>}
            <button type="submit" className="btn btn-primary w-full" disabled={generando}>
              {generando && <span className="loading loading-spinner loading-sm" />}
              Generar horarios
            </button>
          </form>
        </section>
      </div>
    </>
  );
};

export default AppointmentsPage;
