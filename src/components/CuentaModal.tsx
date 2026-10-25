import { useState } from "react";
import type { CuentaCreada } from "../api/types";
import { nombreCompleto } from "../lib/format";
import Modal from "./Modal";
import { Notice } from "./States";

interface Persona {
  id: number;
  nombre: string;
  apellido: string;
  tiene_cuenta: boolean;
}

interface Props {
  persona: Persona | null;
  generar: (persona: Persona) => Promise<CuentaCreada>;
  onClose: () => void;
  onHecho: () => void;
}

const Contenido = ({ persona, generar, onClose, onHecho }: Omit<Props, "persona"> & { persona: Persona }) => {
  const [resultado, setResultado] = useState<CuentaCreada | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = async () => {
    setOcupado(true);
    setError("");
    try {
      setResultado(await generar(persona));
      onHecho();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el acceso.");
    } finally {
      setOcupado(false);
    }
  };

  if (resultado) {
    return (
      <div className="space-y-4">
        <Notice tone="success">{resultado.creada ? "Cuenta creada." : "Contraseña restablecida."}</Notice>
        <dl className="rounded-box border border-base-300 bg-base-200 p-4 text-sm">
          <dt className="text-xs uppercase text-base-content/60">Usuario</dt>
          <dd className="mb-2 font-mono text-base">{resultado.username}</dd>
          <dt className="text-xs uppercase text-base-content/60">Contraseña temporal</dt>
          <dd className="font-mono text-base">{resultado.password}</dd>
        </dl>
        <p className="text-sm text-base-content/70">
          Anótala y entrégala a {nombreCompleto(persona)}: no se volverá a mostrar. Deberá cambiarla en su primer ingreso para poder usar el sistema.
        </p>
        <div className="modal-action">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {persona.tiene_cuenta
          ? `${nombreCompleto(persona)} ya tiene una cuenta. Si continúas, su contraseña actual dejará de funcionar y se cerrarán sus sesiones.`
          : `Se creará una cuenta de acceso para ${nombreCompleto(persona)} con una contraseña temporal.`}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={ocupado} onClick={ejecutar}>
          {ocupado && <span className="loading loading-spinner loading-sm" />}
          {persona.tiene_cuenta ? "Restablecer contraseña" : "Generar acceso"}
        </button>
      </div>
    </div>
  );
};

const CuentaModal = ({ persona, ...resto }: Props) => (
  <Modal open={persona !== null} title="Cuenta de acceso" onClose={resto.onClose}>
    {persona && <Contenido key={persona.id} persona={persona} {...resto} />}
  </Modal>
);

export default CuentaModal;
