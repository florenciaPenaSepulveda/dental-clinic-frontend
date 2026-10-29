import { ReactNode, useId } from "react";

const botonAyuda =
  "inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-content";

export const HelpTip = ({ texto }: { texto: string }) => {
  const id = useId();
  return (
    <span
      className="tooltip tooltip-top before:max-w-[16rem] before:whitespace-normal before:text-left before:text-xs"
      data-tip={texto}
    >
      <button type="button" className={botonAyuda} aria-label="Ayuda" aria-describedby={id}>
        ?
      </button>
      <span id={id} className="sr-only">
        {texto}
      </span>
    </span>
  );
};

export const HelpButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" className={botonAyuda} aria-label={label} onClick={onClick}>
    ?
  </button>
);

interface FieldProps {
  label: string;
  help?: string;
  children: (id: string) => ReactNode;
}

export const Field = ({ label, help, children }: FieldProps) => {
  const id = useId();
  return (
    <div className="form-control">
      <div className="label justify-start gap-1.5 py-1">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {help && <HelpTip texto={help} />}
      </div>
      {children(id)}
    </div>
  );
};
