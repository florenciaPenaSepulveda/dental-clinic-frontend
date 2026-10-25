import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Paciente, PacienteInput, SlotDisponible } from "../api/types";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { formatFecha, formatHora, nombreCompleto, todayISO } from "../lib/format";
import { formatRut, isValidRut } from "../lib/rut";

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

type Busqueda = { tipo: "inicial" } | { tipo: "buscando" } | { tipo: "existente"; paciente: Paciente } | { tipo: "nuevo" };

type DatosNuevo = Omit<PacienteInput, "rut">;

const datosVacios: DatosNuevo = { nombre: "", apellido: "", telefono: "", email: "" };

const ReservationPage = () => {
  const [dentistaId, setDentistaId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState(todayISO(1));
  const [slotId, setSlotId] = useState<number | null>(null);
  const [rut, setRut] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda>({ tipo: "inicial" });
  const [errorRut, setErrorRut] = useState("");
  const [nuevo, setNuevo] = useState<DatosNuevo>(datosVacios);
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

  const cambiarRut = (valor: string) => {
    setRut(formatRut(valor));
    setBusqueda({ tipo: "inicial" });
    setErrorRut("");
  };

  const cambiarNuevo = (campo: keyof DatosNuevo, valor: string) => setNuevo((actual) => ({ ...actual, [campo]: valor }));

  const buscarPaciente = async () => {
    if (!isValidRut(rut)) {
      setErrorRut("El RUT ingresado no es válido. Revisa los números y el dígito verificador.");
      return;
    }
    setErrorRut("");
    setBusqueda({ tipo: "buscando" });
    try {
      const encontrado = await api.buscarPaciente(rut);
      setBusqueda(encontrado ? { tipo: "existente", paciente: encontrado } : { tipo: "nuevo" });
    } catch (error) {
      setBusqueda({ tipo: "inicial" });
      setErrorRut(error instanceof Error ? error.message : "No se pudo buscar al paciente.");
    }
  };

  const validar = (): string => {
    if (!dentistaId) return "Elige un dentista.";
    if (slotId === null) return "Elige un horario disponible.";
    if (busqueda.tipo === "inicial" || busqueda.tipo === "buscando") return "Ingresa el RUT del paciente y presiona Buscar.";
    if (busqueda.tipo === "nuevo" && (!nuevo.nombre.trim() || !nuevo.apellido.trim())) {
      return "Completa el nombre y el apellido del paciente.";
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
        busqueda.tipo === "existente"
          ? busqueda.paciente.id
          : (await api.crearPaciente({ ...nuevo, rut, nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim() })).id;
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
      setRut("");
      setBusqueda({ tipo: "inicial" });
      setNuevo(datosVacios);
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
                <p className="mt-3 text-xs text-base-content/60">
                  Verde: disponible · Ámbar: solo sobrecupo · Gris: completo. {formatFecha(fecha)}.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="surface space-y-4">
          <h2 className="section-title">Paciente</h2>
          <div className="form-control">
            <label htmlFor="rut-paciente" className="label py-1">
              <span className="field-label">RUT del paciente</span>
            </label>
            <div className="join w-full">
              <input
                id="rut-paciente"
                className={`input input-bordered join-item w-full ${errorRut ? "input-error" : ""}`}
                placeholder="12.345.678-5"
                autoComplete="off"
                value={rut}
                onChange={(e) => cambiarRut(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarPaciente();
                  }
                }}
              />
              <button type="button" className="btn btn-outline btn-primary join-item" disabled={busqueda.tipo === "buscando"} onClick={buscarPaciente}>
                {busqueda.tipo === "buscando" && <span className="loading loading-spinner loading-sm" />}
                Buscar
              </button>
            </div>
            {errorRut && <p className="mt-1 text-sm text-error">{errorRut}</p>}
          </div>

          {busqueda.tipo === "existente" && (
            <div className="rounded-box border border-success/40 bg-success/10 p-3 text-sm" aria-label="Paciente encontrado">
              <p className="font-semibold">Paciente registrado</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-base-content/70">Nombre</dt>
                <dd>{nombreCompleto(busqueda.paciente)}</dd>
                <dt className="text-base-content/70">RUT</dt>
                <dd>{busqueda.paciente.rut}</dd>
                <dt className="text-base-content/70">Teléfono</dt>
                <dd>{busqueda.paciente.telefono || "Sin registrar"}</dd>
                <dt className="text-base-content/70">Correo</dt>
                <dd className="break-all">{busqueda.paciente.email || "Sin registrar"}</dd>
              </dl>
            </div>
          )}

          {busqueda.tipo === "nuevo" && (
            <div className="space-y-3">
              <p className="text-sm text-base-content/70">No encontramos este RUT. Completa los datos para registrar al paciente.</p>
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
