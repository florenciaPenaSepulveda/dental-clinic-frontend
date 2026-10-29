import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SlotDisponible } from "../api/types";
import DateField from "../components/DateField";
import PageHeader from "../components/PageHeader";
import { PacienteSelector, usePacienteSelector } from "../components/PacienteSelector";
import SelectorArchivos from "../components/SelectorArchivos";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { formatFecha, formatFechaLarga, formatHora, formatPrecio, nombreCompleto, todayISO } from "../lib/format";
import { validarArchivos } from "../lib/archivos";

type Estado = "disponible" | "sobrecupo" | "lleno";

const estadoDelSlot = (slot: SlotDisponible): { estado: Estado; cupos: number } => {
  if (slot.reservas_count < slot.capacidad) {
    return { estado: "disponible", cupos: slot.capacidad - slot.reservas_count };
  }
  if (slot.sobrecupos_count < slot.max_overbook) {
    return { estado: "sobrecupo", cupos: slot.max_overbook - slot.sobrecupos_count };
  }
  return { estado: "lleno", cupos: 0 };
};

const estiloDelEstado: Record<Estado, string> = {
  disponible: "btn-outline btn-primary",
  sobrecupo: "btn-outline btn-warning",
  lleno: "btn-disabled",
};

const ReservationPage = () => {
  const [dentistaId, setDentistaId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState(todayISO(1));
  const [slotId, setSlotId] = useState<number | null>(null);
  const seleccion = usePacienteSelector();
  const [motivo, setMotivo] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const catalogos = useLoad(() => Promise.all([api.dentistas(), api.servicios()]), []);
  const agenda = useLoad(
    () => (dentistaId ? api.slotsPorFecha(fecha, Number(dentistaId)) : Promise.resolve([] as SlotDisponible[])),
    [dentistaId, fecha],
  );

  const [dentistas, servicios] = catalogos.data ?? [[], []];
  const slots = agenda.data ?? [];

  const elegirDentista = (valor: string) => {
    setDentistaId(valor);
    setSlotId(null);
    setAviso(null);
  };

  const elegirFecha = (valor: string) => {
    setFecha(valor);
    setSlotId(null);
    setAviso(null);
  };

  const cambiarArchivos = (siguientes: File[]) => {
    setArchivos(siguientes);
    setErrorArchivos(validarArchivos(siguientes));
  };

  const validar = (): string => {
    if (!dentistaId) return "Elige un dentista.";
    if (slotId === null) return "Elige un horario disponible.";
    return seleccion.validar() || validarArchivos(archivos);
  };

  const reservar = async (event: FormEvent) => {
    event.preventDefault();
    const problema = validar();
    if (problema) {
      setAviso({ tone: "error", text: problema });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const paciente = await seleccion.resolver();
      const creada = await api.crearReserva(
        {
          slot: slotId as number,
          paciente,
          ...(servicioId ? { servicio: Number(servicioId) } : {}),
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        },
        archivos,
      );
      const elegido = slots.find((slot) => slot.id === slotId);
      const profesional = dentistas.find((dentista) => String(dentista.id) === dentistaId);
      const detalle = elegido && profesional ? ` Te esperamos el ${formatFechaLarga(fecha)} a las ${formatHora(elegido.hora)} con ${nombreCompleto(profesional)}.` : "";
      setAviso({
        tone: "success",
        text: `${creada.sobrecupo ? "Reserva confirmada como sobrecupo." : "Reserva confirmada."}${detalle} Si el paciente tiene email registrado, recibirá la confirmación por correo.`,
      });
      setSlotId(null);
      seleccion.reiniciar();
      setMotivo("");
      setArchivos([]);
      setErrorArchivos("");
      agenda.reload();
      catalogos.reload();
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo crear la reserva." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Reservar hora" subtitle="Elige dentista, fecha y horario, y confirma los datos del paciente." />

      {catalogos.error && <Notice tone="error">{catalogos.error}</Notice>}

      <form onSubmit={reservar} className="grid gap-6 lg:grid-cols-3">
        <section className="surface space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Dentista</span>
              </span>
              <select className="select select-bordered w-full" value={dentistaId} onChange={(e) => elegirDentista(e.target.value)}>
                <option value="">Selecciona un dentista</option>
                {dentistas.map((dentista) => (
                  <option key={dentista.id} value={dentista.id}>
                    {nombreCompleto(dentista)}
                    {dentista.especialidad ? ` · ${dentista.especialidad}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Servicio (opcional)</span>
              </span>
              <select className="select select-bordered w-full" value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                <option value="">Sin especificar</option>
                {servicios.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.nombre} · {formatPrecio(servicio.precio)}
                  </option>
                ))}
              </select>
              <span className="mt-1 text-xs text-base-content/70">Valor referencial: el pago se realiza en la consulta.</span>
            </label>
            <DateField label="Fecha" value={fecha} min={todayISO()} onChange={elegirFecha} />
          </div>

          <div>
            <h2 className="section-title mb-2">Horarios disponibles</h2>
            {!dentistaId ? (
              <p className="text-base-content/70">Elige un dentista para ver sus horarios.</p>
            ) : agenda.loading ? (
              <Spinner label="Buscando horarios..." />
            ) : agenda.error ? (
              <Notice tone="error">{agenda.error}</Notice>
            ) : slots.length === 0 ? (
              <EmptyState
                title="No hay horarios para esta fecha"
                description="Prueba con otro día o genera los horarios desde la Agenda."
                action={
                  <Link to="/agenda" className="btn btn-outline btn-primary btn-sm">
                    Ir a la agenda
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {slots.map((slot) => {
                    const { estado, cupos } = estadoDelSlot(slot);
                    const seleccionado = slotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={estado === "lleno"}
                        aria-pressed={seleccionado}
                        title={estado === "lleno" ? "Horario completo" : estado === "sobrecupo" ? `Sobrecupo (${cupos})` : `${cupos} cupo(s)`}
                        onClick={() => setSlotId(slot.id)}
                        className={`btn btn-sm ${seleccionado ? "btn-primary" : estiloDelEstado[estado]}`}
                      >
                        {formatHora(slot.hora)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-base-content/70">
                  Verde: disponible · Ámbar: solo sobrecupo · Gris: completo. {formatFecha(fecha)}.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="surface space-y-4">
          <h2 className="section-title">Paciente</h2>
          <PacienteSelector control={seleccion} />

          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Motivo de la consulta (opcional)</span>
            </span>
            <textarea className="textarea textarea-bordered w-full" rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>

          <SelectorArchivos archivos={archivos} error={errorArchivos} onChange={cambiarArchivos} />

          {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}

          <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
            {enviando && <span className="loading loading-spinner loading-sm" />}
            Confirmar reserva
          </button>
        </section>
      </form>
    </>
  );
};

export default ReservationPage;
