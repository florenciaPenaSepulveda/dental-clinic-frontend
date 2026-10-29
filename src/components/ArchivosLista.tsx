import { useState } from "react";
import type { Archivo } from "../api/types";
import { descargarArchivo, formatTamano } from "../lib/archivos";

interface Props {
  archivos: Archivo[];
  onEliminar?: (archivo: Archivo) => void;
}

const ArchivosLista = ({ archivos, onEliminar }: Props) => {
  const [error, setError] = useState("");

  const descargar = async (archivo: Archivo) => {
    setError("");
    try {
      await descargarArchivo(archivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el archivo.");
    }
  };

  if (archivos.length === 0) {
    return <p className="text-sm text-base-content/70">Sin archivos adjuntos.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-base-300 rounded-box border border-base-300">
        {archivos.map((archivo) => (
          <li key={archivo.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {archivo.nombre} <span className="hint">({formatTamano(archivo.tamano)})</span>
            </span>
            <button type="button" className="btn btn-ghost btn-xs" aria-label={`Descargar ${archivo.nombre}`} onClick={() => descargar(archivo)}>
              Descargar
            </button>
            {onEliminar && (
              <button type="button" className="btn btn-ghost btn-xs btn-danger" aria-label={`Eliminar ${archivo.nombre}`} onClick={() => onEliminar(archivo)}>
                Eliminar
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

export default ArchivosLista;
