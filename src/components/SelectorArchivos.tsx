import { ChangeEvent } from "react";
import { formatTamano } from "../lib/archivos";

interface Props {
  archivos: File[];
  error: string;
  onChange: (archivos: File[]) => void;
  etiqueta?: string;
}

const SelectorArchivos = ({ archivos, error, onChange, etiqueta = "Exámenes o documentos (opcional)" }: Props) => {
  const agregar = (event: ChangeEvent<HTMLInputElement>) => {
    onChange([...archivos, ...Array.from(event.target.files ?? [])]);
    event.target.value = "";
  };

  return (
    <div className="form-control">
      <label htmlFor="archivos-reserva" className="label py-1">
        <span className="field-label">{etiqueta}</span>
      </label>
      <input
        id="archivos-reserva"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="file-input file-input-bordered file-input-sm w-full"
        onChange={agregar}
      />
      <span className="mt-1 text-xs text-base-content/60">PDF, JPG o PNG de hasta 5 MB cada uno (máximo 5).</span>
      {archivos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {archivos.map((archivo, indice) => (
            <li key={`${archivo.name}-${indice}`} className="flex items-center justify-between gap-2 rounded-btn bg-base-200 px-3 py-1 text-sm">
              <span className="truncate">
                {archivo.name} <span className="text-xs text-base-content/60">({formatTamano(archivo.size)})</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                aria-label={`Quitar ${archivo.name}`}
                onClick={() => onChange(archivos.filter((_, posicion) => posicion !== indice))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

export default SelectorArchivos;
