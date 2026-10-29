import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { Servicio, SlotDisponible } from "../api/types";
import { validarArchivos } from "../lib/archivos";
import { formatDuracion } from "../lib/format";
import Modal from "./Modal";
import { PacienteSelector, usePacienteSelector } from "./PacienteSelector";
import SelectorArchivos from "./SelectorArchivos";
import { Notice } from "./States";

interface Props {
  slot: Pick<SlotDisponible, "id"> | null;
  titulo: string;
  servicios: Servicio[];
  onClose: () => void;
  onCreada: (sobrecupo: boolean) => void;
}

interface FormularioProps extends Omit<Props, "slot" | "titulo"> {
  slotId: number;
}

const Formulario = ({ slotId, servicios, onClose, onCreada }: FormularioProps) => {
  const seleccion = usePacienteSelector();
  const [servicioId, setServicioId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiarArchivos = (siguientes: File[]) => {
    setArchivos(siguientes);
    setErrorArchivos(validarArchivos(siguientes));
  };

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const problema = seleccion.validar() || validarArchivos(archivos);
    if (problema) {
      setError(problema);
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const paciente = await seleccion.resolver();
      const creada = await api.crearReserva(
        {
          slot: slotId,
          paciente,
          ...(servicioId ? { servicio: Number(servicioId) } : {}),
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        },
        archivos,
      );
      onCreada(creada.sobrecupo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la reserva.");
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <PacienteSelector control={seleccion} />
      <label className="form-control">
        <span className="label py-1">
          <span className="field-label">Servicio (opcional)</span>
        </span>
        <select className="select select-bordered w-full" value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
          <option value="">Sin especificar</option>
          {servicios.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} · {formatDuracion(servicio.duracion_min)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-control">
        <span className="label py-1">
          <span className="field-label">Motivo de la consulta (opcional)</span>
        </span>
        <textarea className="textarea textarea-bordered w-full" rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </label>
      <SelectorArchivos archivos={archivos} error={errorArchivos} onChange={cambiarArchivos} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando && <span className="loading loading-spinner loading-sm" />}
          Agendar
        </button>
      </div>
    </form>
  );
};

const AgendarModal = ({ slot, titulo, servicios, onClose, onCreada }: Props) => (
  <Modal open={slot !== null} title={titulo} onClose={onClose}>
    {slot && <Formulario key={slot.id} slotId={slot.id} servicios={servicios} onClose={onClose} onCreada={onCreada} />}
  </Modal>
);

export default AgendarModal;
