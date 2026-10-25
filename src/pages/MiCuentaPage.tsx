import { FormEvent, useState } from "react";
import PageHeader from "../components/PageHeader";
import { Notice } from "../components/States";
import { useAuth } from "../hooks/useAuth";

const etiquetaRol = { recepcion: "Recepción", dentista: "Dentista", paciente: "Paciente" };

const MiCuentaPage = () => {
  const { sesion, cambiarClave } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [aviso, setAviso] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (!actual || !nueva) {
      setAviso({ tone: "error", text: "Ingresa tu contraseña actual y la nueva." });
      return;
    }
    if (nueva.length < 8) {
      setAviso({ tone: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (nueva === actual) {
      setAviso({ tone: "error", text: "La nueva contraseña debe ser distinta de la actual." });
      return;
    }
    if (nueva !== repetida) {
      setAviso({ tone: "error", text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      await cambiarClave(actual, nueva);
      setActual("");
      setNueva("");
      setRepetida("");
      setAviso({ tone: "success", text: "Contraseña actualizada." });
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cambiar la contraseña." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Mi cuenta" subtitle={sesion ? `${sesion.nombre} · ${etiquetaRol[sesion.rol]} · usuario ${sesion.username}` : undefined} />
      <form onSubmit={enviar} className="surface mx-auto max-w-md space-y-4">
        <h2 className="section-title">Cambiar contraseña</h2>
        {sesion?.debe_cambiar_clave && <Notice tone="info">Tu contraseña es temporal. Debes cambiarla para poder usar el sistema.</Notice>}
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Contraseña actual</span>
          </span>
          <input type="password" className="input input-bordered w-full" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Nueva contraseña</span>
          </span>
          <input type="password" className="input input-bordered w-full" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Repite la nueva contraseña</span>
          </span>
          <input type="password" className="input input-bordered w-full" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </label>
        {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}
        <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
          {enviando && <span className="loading loading-spinner loading-sm" />}
          Cambiar contraseña
        </button>
      </form>
    </>
  );
};

export default MiCuentaPage;
