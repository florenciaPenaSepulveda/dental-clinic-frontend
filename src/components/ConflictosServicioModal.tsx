import type { ConflictoDeServicio } from "../api/types";
import { textoDeConflicto } from "../lib/conflictos";
import { formatDuracion, formatFecha } from "../lib/format";
import Modal from "./Modal";

interface Props {
  conflictos: ConflictoDeServicio[] | null;
  duracionActual: number;
  duracionNueva: number;
  guardando: boolean;
  onVolver: () => void;
  onCancelarCita: (conflicto: ConflictoDeServicio) => void;
  onGuardar: (revisarEnAgenda: boolean) => void;
}

const ConflictosServicioModal = ({ conflictos, duracionActual, duracionNueva, guardando, onVolver, onCancelarCita, onGuardar }: Props) => (
  <Modal open={conflictos !== null} title="Citas que chocarían con la nueva duración" onClose={onVolver} wide>
    {conflictos && (
      <>
        <p className="mb-3">
          Al pasar este servicio de {formatDuracion(duracionActual)} a {formatDuracion(duracionNueva)}, {conflictos.length === 1 ? "esta cita ya agendada dejaría" : `estas ${conflictos.length} citas ya agendadas dejarían`} de
          caber en la agenda.
        </p>
        <div className="max-h-72 overflow-y-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase text-base-content/70">
                <th>Cita</th>
                <th>Paciente</th>
                <th>Motivo</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {conflictos.map((conflicto) => (
                <tr key={conflicto.id}>
                  <td className="whitespace-nowrap">
                    {formatFecha(conflicto.fecha)} {conflicto.hora}
                    <span className="block text-xs text-base-content/70">{conflicto.dentista}</span>
                  </td>
                  <td>{conflicto.paciente}</td>
                  <td>{textoDeConflicto[conflicto.motivo]}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-xs btn-danger" onClick={() => onCancelarCita(conflicto)}>
                      Cancelar cita
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint mt-3">
          Puedes cancelar una cita desde aquí, o guardar el cambio y reagendarlas en la agenda, donde aparecen marcadas como choque de horario.
          Las citas que no resuelvas se mantienen tal como están.
        </p>
      </>
    )}
    <div className="modal-action flex-wrap">
      <button type="button" className="btn btn-ghost" onClick={onVolver} disabled={guardando}>
        Volver sin guardar
      </button>
      <button type="button" className="btn btn-outline btn-primary" onClick={() => onGuardar(false)} disabled={guardando}>
        Guardar igualmente
      </button>
      <button type="button" className="btn btn-primary" onClick={() => onGuardar(true)} disabled={guardando || !conflictos?.length}>
        Guardar y reagendar en la agenda
      </button>
    </div>
  </Modal>
);

export default ConflictosServicioModal;
