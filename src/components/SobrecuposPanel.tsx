import type { ResumenSobrecupos } from "../api/types";
import { etiquetaDia } from "../lib/semana";
import { HelpTip } from "./HelpTip";
import { Notice, Spinner } from "./States";

const MAXIMO = 10;

const ayuda =
  "Un sobrecupo es una cita extra que se agenda en un horario que ya está completo, por ejemplo para una urgencia. Aquí defines cuántos admite el dentista cada día; solo recepción o el propio dentista pueden agendarlos desde la agenda.";

interface Props {
  resumen: ResumenSobrecupos | null;
  cargando: boolean;
  error: string;
  hoy: string;
  onFijar: (fecha: string | null, cupos: number | null) => void;
}

const Contador = ({
  valor,
  minimo,
  maximo,
  nombre,
  onCambiar,
}: {
  valor: number;
  minimo: number;
  maximo: number;
  nombre: string;
  onCambiar: (nuevo: number) => void;
}) => (
  <div className="join">
    <button type="button" className="btn btn-outline btn-primary btn-xs join-item" aria-label={`Disminuir ${nombre}`} disabled={valor <= minimo} onClick={() => onCambiar(valor - 1)}>
      −
    </button>
    <span className="join-item flex min-w-8 items-center justify-center border border-base-300 px-2 text-sm font-semibold tabular-nums" aria-label={`${nombre}: ${valor}`}>
      {valor}
    </span>
    <button type="button" className="btn btn-outline btn-primary btn-xs join-item" aria-label={`Aumentar ${nombre}`} disabled={valor >= maximo} onClick={() => onCambiar(valor + 1)}>
      +
    </button>
  </div>
);

const SobrecuposPanel = ({ resumen, cargando, error, hoy, onFijar }: Props) => (
  <section className="surface mb-6" aria-labelledby="titulo-sobrecupos">
    <div className="mb-1 flex items-center gap-2">
      <h2 id="titulo-sobrecupos" className="section-title">
        Sobrecupos
      </h2>
      <HelpTip texto={ayuda} />
    </div>
    <p className="mb-4 text-base-content/70">Citas extra que se agendan en un horario completo. Ajusta cuántas admite este dentista cada día de la semana.</p>
    {cargando && !resumen ? (
      <Spinner label="Cargando sobrecupos..." />
    ) : error ? (
      <Notice tone="error">{error}</Notice>
    ) : resumen ? (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="field-label">Por defecto cada día</span>
          <Contador valor={resumen.por_defecto} minimo={0} maximo={MAXIMO} nombre="sobrecupos por defecto" onCambiar={(nuevo) => onFijar(null, nuevo)} />
          <span className="hint">Se aplica a los días que no tengan un valor propio.</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {resumen.dias
            .filter((dia, indice) => indice < 5 || dia.usados > 0 || dia.personalizado)
            .map((dia) => {
              const pasado = dia.fecha < hoy;
              const etiqueta = etiquetaDia(dia.fecha);
              return (
                <li key={dia.fecha} className={`rounded-box border p-3 ${dia.fecha === hoy ? "border-primary" : "border-base-300"} ${pasado ? "opacity-60" : ""}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold capitalize text-neutral">{etiqueta}</span>
                    {dia.personalizado && <span className="badge badge-ghost whitespace-nowrap">Propio</span>}
                  </div>
                  <p className="mb-1 text-sm">
                    <span className="font-semibold tabular-nums">{dia.usados}</span> de <span className="tabular-nums">{dia.permitidos}</span> usados
                  </p>
                  <progress className="progress progress-warning mb-3 w-full" value={dia.usados} max={Math.max(dia.permitidos, 1)} aria-label={`Sobrecupos usados el ${etiqueta}`} />
                  {!pasado && (
                    <div className="flex items-center justify-between gap-2">
                      <Contador
                        valor={dia.permitidos}
                        minimo={dia.usados}
                        maximo={MAXIMO}
                        nombre={`sobrecupos del ${etiqueta}`}
                        onCambiar={(nuevo) => onFijar(dia.fecha, nuevo)}
                      />
                      {dia.personalizado && (
                        <button type="button" className="btn btn-ghost btn-xs" aria-label={`Restablecer sobrecupos del ${etiqueta}`} onClick={() => onFijar(dia.fecha, null)}>
                          Restablecer
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </>
    ) : null}
  </section>
);

export default SobrecuposPanel;
