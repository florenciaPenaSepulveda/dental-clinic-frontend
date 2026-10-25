import { api } from "../api/client";
import type { Paciente } from "../api/types";
import { useLoad } from "../hooks/useLoad";
import { nombreCompleto } from "../lib/format";
import HistorialLista from "./HistorialLista";
import Modal from "./Modal";
import { EmptyState, Notice, Spinner } from "./States";

const Contenido = ({ paciente }: { paciente: Paciente }) => {
  const historial = useLoad(() => api.historialPaciente(paciente.id), [paciente.id]);
  if (historial.loading) {
    return <Spinner />;
  }
  if (historial.error) {
    return <Notice tone="error">{historial.error}</Notice>;
  }
  const items = historial.data ?? [];
  return items.length === 0 ? (
    <EmptyState title="Sin atenciones registradas" description="Este paciente aún no tiene citas en tu agenda." />
  ) : (
    <HistorialLista items={items} />
  );
};

const HistorialPacienteModal = ({ paciente, onClose }: { paciente: Paciente | null; onClose: () => void }) => (
  <Modal open={paciente !== null} title={paciente ? `Historial de ${nombreCompleto(paciente)}` : "Historial"} onClose={onClose} wide>
    {paciente && <Contenido key={paciente.id} paciente={paciente} />}
    <div className="modal-action">
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        Cerrar
      </button>
    </div>
  </Modal>
);

export default HistorialPacienteModal;
