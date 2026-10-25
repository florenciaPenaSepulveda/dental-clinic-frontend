import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { PacienteInput, Reserva, Slot } from "../api/types";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { formatFecha, formatHora, nombreCompleto, todayISO } from "../lib/format";
import { formatRut, isValidRut } from "../lib/rut";

type Estado = "disponible" | "sobrecupo" | "lleno";

const estadoDelSlot = (slot: Slot, reservas: Reserva[]): { estado: Estado; cupos: number } => {
  const delSlot = reservas.filter((reserva) => reserva.slot.id === slot.id);
  const sobrecupos = delSlot.filter((reserva) => reserva.sobrecupo).length;
  if (delSlot.length < slot.capacidad) {
    return { estado: "disponible", cupos: slot.capacidad - delSlot.length };
  }
  if (sobrecupos < slot.max_overbook) {
    return { estado: "sobrecupo", cupos: slot.max_overbook - sobrecupos };
  }
  return { estado: "lleno", cupos: 0 };
};

const estiloDelEstado: Record<Estado, string> = {
  disponible: "btn-outline btn-primary",
  sobrecupo: "btn-outline btn-warning",
  lleno: "btn-disabled",
};

const pacienteVacio: PacienteInput = { rut: "", nombre: "", apellido: "", telefono: "", email: "" };

const ReservationPage = () => {
  const [dentistaId, setDentistaId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState(todayISO(1));
  const [slotId, setSlotId] = useState<number | null>(null);
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [pacienteId, setPacienteId] = useState("");
  const [nuevo, setNuevo] = useState<PacienteInput>(pacienteVacio);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const catalogos = useLoad(() => Promise.all([api.dentistas(), api.servicios(), api.pacientes()]), []);
  const agenda = useLoad(
    () =>
      dentistaId
        ? Promise.all([api.slotsPorFecha(fecha, Number(dentistaId)), api.reservas({ fecha, dentista: Number(dentistaId) })])
        : Promise.resolve([[], []] as [Slot[], Reserva[]]),
    [dentistaId, fecha],
  );

  const [dentistas, servicios, pacientes] = catalogos.data ?? [[], [], []];
  const [slots, reservas] = agenda.data ?? [[], []];

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

  const cambiarNuevo = (campo: keyof PacienteInput, valor: string) =>
    setNuevo((actual) => ({ ...actual, [campo]: campo === "rut" ? formatRut(valor) : valor }));

  const validar = (): string => {
    if (!dentistaId) return "Elige un dentista.";
    if (slotId === null) return "Elige un horario disponible.";
    if (modo === "existente" && !pacienteId) return "Elige un paciente o registra uno nuevo.";
    if (modo === "nuevo") {
      if (!isValidRut(nuevo.rut)) return "El RUT ingresado no es válido.";
      if (!nuevo.nombre.trim() || !nuevo.apellido.trim()) return "Completa el nombre y el apellido del paciente.";
    }
    return "";
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
      const paciente =
        modo === "nuevo"
          ? (await api.crearPaciente({ ...nuevo, nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim() })).id
          : Number(pacienteId);
      const creada = await api.crearReserva({
        slot: slotId as number,
        paciente,
        ...(servicioId ? { servicio: Number(servicioId) } : {}),
      });
      setAviso({
        tone: "success",
        text: creada.sobrecupo
          ? "Reserva confirmada como sobrecupo. Te avisaremos por correo si el paciente tiene email registrado."
          : "Reserva confirmada. Si el paciente tiene email registrado, recibirá la confirmación por correo.",
      });
      setSlotId(null);
      setPacienteId("");
      setNuevo(pacienteVacio);
      setModo("existente");
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
                    {servicio.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Fecha</span>
              </span>
              <input
                type="date"
                className="input input-bordered w-full"
                value={fecha}
                min={todayISO()}
                onChange={(e) => elegirFecha(e.target.value)}
              />
            </label>
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
                    const { estado, cupos } = estadoDelSlot(slot, reservas);
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
                <p className="mt-3 text-xs text-base-content/60">
                  Verde: disponible · Ámbar: solo sobrecupo · Gris: completo. {formatFecha(fecha)}.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="surface space-y-4">
          <h2 className="section-title">Paciente</h2>
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button type="button" role="tab" className={`tab ${modo === "existente" ? "tab-active" : ""}`} onClick={() => setModo("existente")}>
              Existente
            </button>
            <button type="button" role="tab" className={`tab ${modo === "nuevo" ? "tab-active" : ""}`} onClick={() => setModo("nuevo")}>
              Nuevo
            </button>
          </div>

          {modo === "existente" ? (
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Paciente</span>
              </span>
              <select className="select select-bordered w-full" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
                <option value="">Selecciona un paciente</option>
                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {nombreCompleto(paciente)} · {paciente.rut}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="space-y-3">
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">RUT</span>
                </span>
                <input className="input input-bordered w-full" placeholder="12.345.678-5" value={nuevo.rut} onChange={(e) => cambiarNuevo("rut", e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control">
                  <span className="label py-1">
                    <span className="field-label">Nombre</span>
                  </span>
                  <input className="input input-bordered w-full" value={nuevo.nombre} onChange={(e) => cambiarNuevo("nombre", e.target.value)} />
                </label>
                <label className="form-control">
                  <span className="label py-1">
                    <span className="field-label">Apellido</span>
                  </span>
                  <input className="input input-bordered w-full" value={nuevo.apellido} onChange={(e) => cambiarNuevo("apellido", e.target.value)} />
                </label>
              </div>
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Teléfono</span>
                </span>
                <input className="input input-bordered w-full" value={nuevo.telefono} onChange={(e) => cambiarNuevo("telefono", e.target.value)} />
              </label>
              <label className="form-control">
                <span className="label py-1">
                  <span className="field-label">Correo electrónico</span>
                </span>
                <input type="email" className="input input-bordered w-full" value={nuevo.email} onChange={(e) => cambiarNuevo("email", e.target.value)} />
              </label>
            </div>
          )}

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
