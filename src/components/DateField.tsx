import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { formatFecha, parseFecha } from "../lib/format";

interface Props {
  label: string;
  value: string;
  min?: string;
  onChange: (iso: string) => void;
}

const enmascarar = (crudo: string): string => {
  const digitos = crudo.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
};

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const DateField = ({ label, value, min, onChange }: Props) => {
  const id = useId();
  const selector = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(formatFecha(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTexto(formatFecha(value));
    setError(null);
  }, [value]);

  const aceptar = (iso: string | null, incompleta: boolean) => {
    if (incompleta) return setError(null);
    if (!iso) return setError("Ingresa una fecha válida con el formato DD/MM/AAAA.");
    if (min && iso < min) return setError(`La fecha no puede ser anterior al ${formatFecha(min)}.`);
    setError(null);
    onChange(iso);
  };

  const escribir = (evento: ChangeEvent<HTMLInputElement>) => {
    const enmascarado = enmascarar(evento.target.value);
    setTexto(enmascarado);
    aceptar(parseFecha(enmascarado), enmascarado.length < 10);
  };

  const elegirEnCalendario = (evento: ChangeEvent<HTMLInputElement>) => {
    if (evento.target.value) aceptar(evento.target.value, false);
  };

  return (
    <div className="form-control">
      <label htmlFor={id} className="label py-1">
        <span className="field-label">{label}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          className={`input input-bordered w-full pr-12 ${error ? "input-error" : ""}`}
          value={texto}
          onChange={escribir}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral"
          aria-label={`Abrir calendario de ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
          onClick={() => selector.current?.showPicker?.()}
        >
          <CalendarIcon />
        </button>
        <input
          ref={selector}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
          value={value}
          min={min}
          onChange={elegirEnCalendario}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
};

export default DateField;
