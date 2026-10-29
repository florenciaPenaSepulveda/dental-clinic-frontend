import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { EstadoReserva, Paciente, Reserva, SlotSemana } from "../api/types";
import AgendarModal from "../components/AgendarModal";
import HistorialPacienteModal from "../components/HistorialPacienteModal";
import AyudaGenerarModal from "../components/AyudaGenerarModal";
import DateField from "../components/DateField";
import { Field, HelpButton } from "../components/HelpTip";
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

const mensajeDeGeneracion = (creados: number, existentes: number): string => {
  if (creados === 0) return "No se creó ningún horario nuevo: esos horarios ya existían.";
  const nuevos = `Se crearon ${creados} ${creados === 1 ? "horario nuevo" : "horarios nuevos"}.`;
  return existentes > 0 ? `${nuevos} ${existentes} ya existían.` : nuevos;
};

const hayCupo = (slot: SlotSemana): boolean => slot.reservas.length < slot.capacidad + slot.max_overbook;

const esFecha = (valor: string | null): valor is string => valor !== null && /^\d{4}-\d{2}-\d{2}$/.test(valor);

const AppointmentsPage = () => {
  const { sesion } = useAuth();
  const [parametros] = useSearchParams();
  const esDentista = sesion?.rol === "dentista";
  const dentistaPropio = esDentista && sesion?.dentista_id ? String(sesion.dentista_id) : "";

  const fechaPedida = parametros.get("fecha");
  const dentistaPedido = parametros.get("dentista");
  const [lunes, setLunes] = useState(() => lunesDe(esFecha(fechaPedida) ? fechaPedida : todayISO()));
  const [dentistaId, setDentistaId] = useState(dentistaPropio || (dentistaPedido && /^\d+$/.test(dentistaPedido) ? dentistaPedido : ""));
  const [aAgendar, setAAgendar] = useState<SlotSemana | null>(null);
  const [abierta, setAbierta] = useState<Reserva | null>(null);
  const [historialDe, setHistorialDe] = useState<Paciente | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const [ayudaAbierta, setAyudaAbierta] = useState(false);
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
      setAvisoGenerar({ tone: "success", text: mensajeDeGeneracion(resultado.created, resultado.existing ?? 0) });
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
    if (slot.bloqueado && slot.reservas.length === 0) {
      return (
        <span className="block rounded-btn bg-base-200 px-2 py-1 text-center text-xs text-base-content/70" title="Ocupado por la duración de la cita anterior">
          Ocupado
        </span>
      );
    }
    return (
      <div className="space-y-1">
        {slot.reservas.map((reserva) => {
          const choque = slot.conflictos.some((conflicto) => conflicto.reserva === reserva.id);
          return (
          <button
            key={reserva.id}
            type="button"
            aria-label={`Reserva de ${nombreCompleto(reserva.paciente)} ${etiquetaDia(dia)} ${hora}`}
            className={`w-full rounded-btn border px-2 py-1 text-left text-xs transition hover:shadow ${choque ? "border-error bg-error/10" : estiloDelEstado[reserva.estado]}`}
            onClick={() => abrirReserva(reserva)}
          >
            <span className="block truncate font-semibold text-neutral">{nombreCompleto(reserva.paciente)}</span>
            <span className="block truncate text-[11px] text-base-content/70">
              {reserva.servicio?.nombre ?? "Sin servicio"}
              {reserva.sobrecupo ? " · sobrecupo" : ""}
            </span>
            {choque && <span className="block text-[11px] font-semibold text-error">Choque de horario</span>}
          </button>
          );
        })}
        {hayCupo(slot) && !slot.bloqueado && (
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
          <p className="page-title order-last w-full text-center sm:order-none sm:w-auto" aria-live="polite">
            {mesDeLaSemana(lunes)}
          </p>
          <div className="join">
            <button type="button" className="btn btn-outline btn-primary btn-sm join-item" aria-label="Semana anterior" onClick={() => cambiarSemana(-7)}>
              ←
            </button>
            <button type="button" className="btn btn-outline btn-primary btn-sm join-item" onClick={() => setLunes(lunesDe(todayISO()))}>
              Hoy
            </button>
            <button type="button" className="btn btn-outline btn-primary btn-sm join-item" aria-label="Semana siguiente" onClick={() => cambiarSemana(7)}>
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
                        <span className="block text-sm font-semibold">{nombreDia(dia)}</span>{" "}
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
            <p className="mt-3 hint">Azul: pendiente · Verde: atendida · Ámbar: no asistió. Haz clic en una reserva para ver el detalle o en un horario libre para agendar.</p>
          </>
        )}
      </section>

      <section className="surface h-fit">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="section-title">Generar horarios</h2>
          <HelpButton label="Cómo funciona Generar horarios" onClick={() => setAyudaAbierta(true)} />
        </div>
        <p className="mb-4 text-base-content/70">Crea los horarios libres de un dentista: bloques de 30 minutos entre la hora inicial y la final, en días seguidos.</p>
        <form onSubmit={generarHorarios} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Dentista" help="De quién es la agenda donde se crean los horarios. Un dentista solo puede generar los suyos.">
            {(id) => (
              <select
                id={id}
                aria-label="Dentista para generar horarios"
                className="select select-bordered w-full"
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
            )}
          </Field>
          <DateField
            label="Desde el día"
            help="Primer día en que se crean horarios. No puede ser anterior a hoy."
            value={generar.fecha}
            min={todayISO()}
            onChange={(fecha) => setGenerar({ ...generar, fecha })}
          />
          <Field label="Cantidad de días" help="Cuántos días seguidos se generan, contando desde el día elegido. Los sábados y domingos también cuentan.">
            {(id) => (
              <input id={id} type="number" min={1} max={31} className="input input-bordered w-full" value={generar.dias} onChange={(e) => setGenerar({ ...generar, dias: e.target.value })} />
            )}
          </Field>
          <Field label="Hora inicial" help="Hora en que empieza la primera cita de cada día. Entre 08:00 y 17:30, en bloques de 30 minutos.">
            {(id) => (
              <input id={id} type="time" step={1800} className="input input-bordered w-full" value={generar.desde} onChange={(e) => setGenerar({ ...generar, desde: e.target.value })} />
            )}
          </Field>
          <Field label="Hora final" help="Hora en que termina la última cita. Con 12:00, la última cita empieza a las 11:30. Máximo 18:00.">
            {(id) => (
              <input id={id} type="time" step={1800} className="input input-bordered w-full" value={generar.hasta} onChange={(e) => setGenerar({ ...generar, hasta: e.target.value })} />
            )}
          </Field>
          <div className="sm:col-span-2 lg:col-span-5">
            {avisoGenerar && <Notice tone={avisoGenerar.tone}>{avisoGenerar.text}</Notice>}
            <button type="submit" className="btn btn-primary mt-3" disabled={generando}>
              {generando && <span className="loading loading-spinner loading-sm" />}
              Generar horarios
            </button>
          </div>
        </form>
      </section>

      <AyudaGenerarModal open={ayudaAbierta} onClose={() => setAyudaAbierta(false)} />

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
        conflicto={abierta ? slots.flatMap((slot) => slot.conflictos).find((conflicto) => conflicto.reserva === abierta.id)?.motivo : undefined}
        onClose={() => setAbierta(null)}
        onCambio={alCambiar}
        onVerHistorial={setHistorialDe}
      />
      <HistorialPacienteModal paciente={historialDe} onClose={() => setHistorialDe(null)} />
    </>
  );
};

export default AppointmentsPage;
