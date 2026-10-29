import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { EstadoReserva, Paciente, Reserva, SlotSemana } from "../api/types";
import AgendarModal from "../components/AgendarModal";
import HistorialPacienteModal from "../components/HistorialPacienteModal";
import DateField from "../components/DateField";
import PageHeader from "../components/PageHeader";
import ReservaModal from "../components/ReservaModal";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { useLoad } from "../hooks/useLoad";
import { formatFechaCorta, formatHora, nombreCompleto, todayISO } from "../lib/format";
import { diasDeLaSemana, etiquetaDia, etiquetaDiaCompleta, lunesDe, mesDeLaSemana, nombreDia, rangoDeLaSemana, sumarDias } from "../lib/semana";

type Aviso = { tone: "success" | "error"; text: string } | null;

const estiloDelEstado: Record<EstadoReserva, string> = {
  pendiente: "border-primary/40 bg-primary/10",
  atendida: "border-success/40 bg-success/10",
  no_asistio: "border-warning/50 bg-warning/10",
};

const hayCupo = (slot: SlotSemana): boolean => slot.reservas.length < slot.capacidad + slot.max_overbook;

const AppointmentsPage = () => {
  const { sesion } = useAuth();
  const esDentista = sesion?.rol === "dentista";
  const dentistaPropio = esDentista && sesion?.dentista_id ? String(sesion.dentista_id) : "";

  const [lunes, setLunes] = useState(() => lunesDe(todayISO()));
  const [dentistaId, setDentistaId] = useState(dentistaPropio);
  const [aAgendar, setAAgendar] = useState<SlotSemana | null>(null);
  const [abierta, setAbierta] = useState<Reserva | null>(null);
  const [historialDe, setHistorialDe] = useState<Paciente | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const [generar, setGenerar] = useState({ dentista: dentistaPropio, fecha: todayISO(1), desde: "08:00", hasta: "16:00", dias: "1" });
  const [generando, setGenerando] = useState(false);
  const [avisoGenerar, setAvisoGenerar] = useState<Aviso>(null);

  const catalogos = useLoad(() => Promise.all([api.dentistas(), api.servicios()]), []);
  const semana = useLoad(
    () => (dentistaId ? api.semana(lunes, Number(dentistaId)) : Promise.resolve([] as SlotSemana[])),
    [lunes, dentistaId],
  );

  const [dentistas, servicios] = catalogos.data ?? [[], []];
  const slots = semana.data ?? [];
  const visibles = esDentista ? dentistas.filter((dentista) => String(dentista.id) === dentistaPropio) : dentistas;

  const dias = diasDeLaSemana(lunes).filter((dia, indice) => indice < 5 || slots.some((slot) => slot.fecha === dia));
  const horas = [...new Set(slots.map((slot) => formatHora(slot.hora)))].sort();
  const hoy = todayISO();

  const cambiarSemana = (dias: number) => setLunes((actual) => sumarDias(actual, dias));

  const alCambiar = (mensaje?: string) => {
    if (mensaje) {
      setAviso({ tone: "success", text: mensaje });
    }
    semana.reload();
  };

  const abrirReserva = (reserva: Reserva) => setAbierta(reserva);

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
      semana.reload();
    } catch (error) {
      setAvisoGenerar({ tone: "error", text: error instanceof Error ? error.message : "No se pudieron generar los horarios." });
    } finally {
      setGenerando(false);
    }
  };

  const celda = (dia: string, hora: string) => {
    const slot = slots.find((candidato) => candidato.fecha === dia && formatHora(candidato.hora) === hora);
    if (!slot) {
      return <span className="block text-center text-base-content/30">·</span>;
    }
    return (
      <div className="space-y-1">
        {slot.reservas.map((reserva) => (
          <button
            key={reserva.id}
            type="button"
            aria-label={`Reserva de ${nombreCompleto(reserva.paciente)} ${etiquetaDia(dia)} ${hora}`}
            className={`w-full rounded-btn border px-2 py-1 text-left text-xs transition hover:shadow ${estiloDelEstado[reserva.estado]}`}
            onClick={() => abrirReserva(reserva)}
          >
            <span className="block truncate font-semibold text-neutral">{nombreCompleto(reserva.paciente)}</span>
            <span className="block truncate text-[11px] text-base-content/70">
              {reserva.servicio?.nombre ?? "Sin servicio"}
              {reserva.sobrecupo ? " · sobrecupo" : ""}
            </span>
          </button>
        ))}
        {hayCupo(slot) && (
          <button
            type="button"
            aria-label={`Agendar ${etiquetaDia(dia)} ${hora}`}
            className="btn btn-outline btn-primary btn-xs w-full"
            onClick={() => setAAgendar(slot)}
          >
            {slot.reservas.length === 0 ? "Libre" : "+ Agregar"}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Agenda" subtitle={rangoDeLaSemana(lunes)} />

      <section className="surface mb-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            {!esDentista && (
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Dentista</span>
                </span>
                <select className="select select-bordered select-sm" value={dentistaId} onChange={(e) => setDentistaId(e.target.value)}>
                  <option value="">Selecciona un dentista</option>
                  {dentistas.map((dentista) => (
                    <option key={dentista.id} value={dentista.id}>
                      {nombreCompleto(dentista)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="order-last w-full text-center text-2xl font-bold text-primary sm:order-none sm:w-auto" aria-live="polite">
            {mesDeLaSemana(lunes)}
          </p>
          <div className="join">
            <button type="button" className="btn btn-outline btn-sm join-item" aria-label="Semana anterior" onClick={() => cambiarSemana(-7)}>
              ←
            </button>
            <button type="button" className="btn btn-outline btn-sm join-item" onClick={() => setLunes(lunesDe(todayISO()))}>
              Hoy
            </button>
            <button type="button" className="btn btn-outline btn-sm join-item" aria-label="Semana siguiente" onClick={() => cambiarSemana(7)}>
              →
            </button>
          </div>
        </div>

        {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}
        {catalogos.error && <Notice tone="error">{catalogos.error}</Notice>}

        {!dentistaId ? (
          <EmptyState title="Elige un dentista" description="Selecciona un dentista para ver su agenda de la semana." />
        ) : semana.loading ? (
          <Spinner label="Cargando la semana..." />
        ) : semana.error ? (
          <Notice tone="error">{semana.error}</Notice>
        ) : slots.length === 0 ? (
          <EmptyState title="No hay horarios esta semana" description="Genera horarios para este dentista en el panel de abajo." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-sm min-w-[820px] table-fixed">
                <thead>
                  <tr className="text-xs uppercase text-base-content/70">
                    <th className="w-16">Hora</th>
                    {dias.map((dia) => (
                      <th key={dia} className={dia === hoy ? "bg-primary/10 text-primary" : ""}>
                        <span className="block text-sm font-bold">{nombreDia(dia)}</span>{" "}
                        <span className="block text-base font-semibold normal-case">{formatFechaCorta(dia)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horas.map((hora) => (
                    <tr key={hora}>
                      <th scope="row" className="align-top font-semibold text-neutral">{hora}</th>
                      {dias.map((dia) => (
                        <td key={dia} className="align-top">
                          {celda(dia, hora)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-base-content/70">Azul: pendiente · Verde: atendida · Ámbar: no asistió. Haz clic en una reserva para ver el detalle o en un horario libre para agendar.</p>
          </>
        )}
      </section>

      <section className="surface h-fit">
        <h2 className="section-title mb-1">Generar horarios</h2>
        <p className="mb-4 text-base-content/70">Crea bloques de 30 minutos para un dentista.</p>
        <form onSubmit={generarHorarios} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              {visibles.map((dentista) => (
                <option key={dentista.id} value={dentista.id}>
                  {nombreCompleto(dentista)}
                </option>
              ))}
            </select>
          </label>
          <DateField label="Desde el día" value={generar.fecha} min={todayISO()} onChange={(fecha) => setGenerar({ ...generar, fecha })} />
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
          <div className="sm:col-span-2 lg:col-span-5">
            {avisoGenerar && <Notice tone={avisoGenerar.tone}>{avisoGenerar.text}</Notice>}
            <button type="submit" className="btn btn-primary mt-3" disabled={generando}>
              {generando && <span className="loading loading-spinner loading-sm" />}
              Generar horarios
            </button>
          </div>
        </form>
      </section>

      <AgendarModal
        slot={aAgendar}
        titulo={aAgendar ? `Agendar ${etiquetaDiaCompleta(aAgendar.fecha)} · ${formatHora(aAgendar.hora)}` : "Agendar"}
        servicios={servicios}
        onClose={() => setAAgendar(null)}
        onCreada={(sobrecupo) => {
          setAAgendar(null);
          alCambiar(sobrecupo ? "Reserva creada como sobrecupo." : "Reserva creada.");
        }}
      />
      <ReservaModal
        reserva={abierta}
        slots={slots}
        servicios={servicios}
        rol={sesion?.rol ?? "recepcion"}
        onClose={() => setAbierta(null)}
        onCambio={alCambiar}
        onVerHistorial={setHistorialDe}
      />
      <HistorialPacienteModal paciente={historialDe} onClose={() => setHistorialDe(null)} />
    </>
  );
};

export default AppointmentsPage;
