import type { EstadoReserva, HistorialItem } from "../api/types";
import { formatFecha, formatHora } from "../lib/format";
import ArchivosLista from "./ArchivosLista";

export const etiquetaEstado: Record<EstadoReserva, string> = {
  pendiente: "Pendiente",
  atendida: "Atendida",
  no_asistio: "No asistió",
};

export const claseEstado: Record<EstadoReserva, string> = {
  pendiente: "badge-info",
  atendida: "badge-success",
  no_asistio: "badge-warning",
};

const Dato = ({ titulo, valor }: { titulo: string; valor: string }) => (
  <div>
    <dt className="text-xs uppercase text-base-content/70">{titulo}</dt>
    <dd className="whitespace-pre-line">{valor}</dd>
  </div>
);

const HistorialLista = ({ items }: { items: HistorialItem[] }) => (
  <ul className="space-y-3">
    {items.map((item) => (
      <li key={item.id} className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-neutral first-letter:uppercase">
              {formatFecha(item.fecha)} · {formatHora(item.hora)}
            </p>
            <p className="text-sm text-base-content/70">
              {item.dentista.nombre}
              {item.dentista.especialidad ? ` · ${item.dentista.especialidad}` : ""}
              {item.servicio ? ` · ${item.servicio}` : ""}
            </p>
          </div>
          <span className={`badge ${claseEstado[item.estado]}`}>{etiquetaEstado[item.estado]}</span>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          {item.motivo && <Dato titulo="Motivo de la consulta" valor={item.motivo} />}
          {item.atencion?.diagnostico && <Dato titulo="Diagnóstico" valor={item.atencion.diagnostico} />}
          {item.atencion?.procedimiento && <Dato titulo="Procedimiento" valor={item.atencion.procedimiento} />}
          {item.atencion?.indicaciones && <Dato titulo="Indicaciones" valor={item.atencion.indicaciones} />}
          {item.observaciones && <Dato titulo="Observaciones internas" valor={item.observaciones} />}
        </dl>
        {item.archivos.length > 0 && (
          <div className="mt-3">
            <ArchivosLista archivos={item.archivos} />
          </div>
        )}
      </li>
    ))}
  </ul>
);

export default HistorialLista;
