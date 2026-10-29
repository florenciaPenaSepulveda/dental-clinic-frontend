import { useState } from "react";
import { api } from "../api/client";
import type { Archivo, AtencionInput, EstadoReserva, Paciente, Reserva, Rol, Servicio, SlotSemana } from "../api/types";
import { validarArchivos } from "../lib/archivos";
import { formatFecha, formatHora, nombreCompleto } from "../lib/format";
import { etiquetaDiaCompleta } from "../lib/semana";
import ArchivosLista from "./ArchivosLista";
import { etiquetaEstado } from "./HistorialLista";
import Modal from "./Modal";
import SelectorArchivos from "./SelectorArchivos";
import { Notice } from "./States";

interface Props {
  reserva: Reserva | null;
  slots: SlotSemana[];
  servicios: Servicio[];
  rol: Rol;
  onClose: () => void;
  onCambio: (mensaje?: string) => void;
  onVerHistorial: (paciente: Paciente) => void;
}

type Aviso = { tone: "success" | "error"; text: string } | null;

type DetalleProps = Omit<Props, "reserva"> & { inicial: Reserva };

const vacia = (atencion: Reserva["atencion"]): AtencionInput => ({
  diagnostico: atencion?.diagnostico ?? "",
  procedimiento: atencion?.procedimiento ?? "",
  indicaciones: atencion?.indicaciones ?? "",
});

const Campo = ({ titulo, valor }: { titulo: string; valor: string }) => (
  <div>
    <dt className="text-xs uppercase text-base-content/70">{titulo}</dt>
    <dd className="whitespace-pre-line">{valor || "Sin registrar"}</dd>
  </div>
);

const Detalle = ({ inicial, slots, servicios, rol, onClose, onCambio, onVerHistorial }: DetalleProps) => {
  const [actual, setActual] = useState(inicial);
  const [estado, setEstado] = useState<EstadoReserva>(inicial.estado);
  const [servicioId, setServicioId] = useState(inicial.servicio ? String(inicial.servicio.id) : "");
  const [slotId, setSlotId] = useState("");
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [atencion, setAtencion] = useState<AtencionInput>(vacia(inicial.atencion));
  const [nuevos, setNuevos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);

  const esDentista = rol === "dentista";
  const destinos = slots.filter((slot) => slot.id !== actual.slot.id && slot.reservas.length < slot.capacidad + slot.max_overbook);

  const ejecutar = async (accion: () => Promise<void>, exito: string, falla: string) => {
    setOcupado(true);
    setAviso(null);
    try {
      await accion();
      setAviso({ tone: "success", text: exito });
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : falla });
    } finally {
      setOcupado(false);
    }
  };

  const guardar = () =>
    ejecutar(
      async () => {
        const guardada = await api.actualizarReserva(actual.id, {
          estado,
          observaciones,
          servicio: servicioId ? Number(servicioId) : null,
          ...(slotId ? { slot: Number(slotId) } : {}),
        });
        setActual(guardada);
        setSlotId("");
        onCambio();
      },
      "Cambios guardados.",
      "No se pudieron guardar los cambios.",
    );

  const guardarAtencion = () =>
    ejecutar(
      async () => {
        const guardada = await api.guardarAtencion(actual.id, atencion);
        setActual(guardada);
        setEstado(guardada.estado);
        onCambio();
      },
      "Atención registrada.",
      "No se pudo registrar la atención.",
    );

  const cambiarNuevos = (siguientes: File[]) => {
    setNuevos(siguientes);
    setErrorArchivos(validarArchivos(siguientes, actual.archivos.length));
  };

  const subir = () => {
    const problema = validarArchivos(nuevos, actual.archivos.length);
    if (problema) {
      setErrorArchivos(problema);
      return Promise.resolve();
    }
    return ejecutar(
      async () => {
        const subidos = await api.subirArchivos(actual.id, nuevos);
        setActual({ ...actual, archivos: [...actual.archivos, ...subidos] });
        setNuevos([]);
        onCambio();
      },
      "Archivos adjuntados.",
      "No se pudieron subir los archivos.",
    );
  };

  const eliminarArchivo = (archivo: Archivo) => {
    if (!window.confirm(`¿Eliminar ${archivo.nombre}?`)) {
      return Promise.resolve();
    }
    return ejecutar(
      async () => {
        await api.eliminarArchivo(archivo.id);
        setActual({ ...actual, archivos: actual.archivos.filter((existente) => existente.id !== archivo.id) });
        onCambio();
      },
      "Archivo eliminado.",
      "No se pudo eliminar el archivo.",
    );
  };

  const cancelar = async () => {
    if (!window.confirm(`¿Cancelar la reserva de ${nombreCompleto(actual.paciente)}?`)) {
      return;
    }
    setOcupado(true);
    try {
      await api.cancelarReserva(actual.id);
      onCambio("Reserva cancelada.");
      onClose();
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cancelar la reserva." });
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Campo titulo="Paciente" valor={`${nombreCompleto(actual.paciente)} · ${actual.paciente.rut}`} />
        <Campo titulo="Contacto" valor={[actual.paciente.telefono, actual.paciente.email].filter(Boolean).join(" · ")} />
        <Campo titulo="Fecha y hora" valor={`${formatFecha(actual.slot.fecha)} · ${formatHora(actual.slot.hora)}`} />
        <Campo titulo="Tipo" valor={actual.sobrecupo ? "Sobrecupo" : "Normal"} />
        <div className="sm:col-span-2">
          <Campo titulo="Motivo de la consulta" valor={actual.motivo} />
        </div>
      </dl>

      <section className="space-y-3">
        <h4 className="section-title">Reserva</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Estado</span>
            </span>
            <select className="select select-bordered select-sm w-full" value={estado} onChange={(e) => setEstado(e.target.value as EstadoReserva)}>
              {(Object.keys(etiquetaEstado) as EstadoReserva[]).map((valor) => (
                <option key={valor} value={valor}>
                  {etiquetaEstado[valor]}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Servicio</span>
            </span>
            <select className="select select-bordered select-sm w-full" value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
              <option value="">Sin especificar</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control sm:col-span-2">
            <span className="label py-1">
              <span className="field-label">Reprogramar a</span>
            </span>
            <select className="select select-bordered select-sm w-full" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">No cambiar</option>
              {destinos.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {etiquetaDiaCompleta(slot.fecha)} · {formatHora(slot.hora)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control sm:col-span-2">
            <span className="label py-1">
              <span className="field-label">Observaciones internas</span>
            </span>
            <textarea className="textarea textarea-bordered w-full" rows={2} maxLength={2000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={ocupado} onClick={guardar}>
          Guardar cambios
        </button>
      </section>

      <section className="space-y-3">
        <h4 className="section-title">Archivos adjuntos</h4>
        <ArchivosLista archivos={actual.archivos} onEliminar={eliminarArchivo} />
        <SelectorArchivos archivos={nuevos} error={errorArchivos} onChange={cambiarNuevos} etiqueta="Agregar archivos" />
        {nuevos.length > 0 && (
          <button type="button" className="btn btn-outline btn-primary btn-sm" disabled={ocupado} onClick={subir}>
            Subir archivos
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="section-title">Atención clínica</h4>
        {esDentista ? (
          <>
            {(["diagnostico", "procedimiento", "indicaciones"] as const).map((campo) => (
              <label key={campo} className="form-control">
                <span className="label py-1">
                  <span className="field-label">{{ diagnostico: "Diagnóstico", procedimiento: "Procedimiento", indicaciones: "Indicaciones" }[campo]}</span>
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  maxLength={5000}
                  value={atencion[campo]}
                  onChange={(e) => setAtencion({ ...atencion, [campo]: e.target.value })}
                />
              </label>
            ))}
            <button type="button" className="btn btn-primary btn-sm" disabled={ocupado} onClick={guardarAtencion}>
              Guardar atención
            </button>
          </>
        ) : actual.atencion ? (
          <dl className="space-y-2 text-sm">
            <Campo titulo="Diagnóstico" valor={actual.atencion.diagnostico} />
            <Campo titulo="Procedimiento" valor={actual.atencion.procedimiento} />
            <Campo titulo="Indicaciones" valor={actual.atencion.indicaciones} />
          </dl>
        ) : (
          <p className="text-sm text-base-content/70">El dentista aún no registra la atención.</p>
        )}
      </section>

      {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}

      <div className="modal-action flex-wrap">
        <button type="button" className="btn btn-ghost text-error" disabled={ocupado} onClick={cancelar}>
          Cancelar reserva
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onVerHistorial(actual.paciente)}>
          Ver historial
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

const ReservaModal = ({ reserva, ...resto }: Props) => (
  <Modal open={reserva !== null} title={reserva ? `Reserva de ${nombreCompleto(reserva.paciente)}` : "Reserva"} onClose={resto.onClose} wide>
    {reserva && <Detalle key={reserva.id} inicial={reserva} {...resto} />}
  </Modal>
);

export default ReservaModal;
