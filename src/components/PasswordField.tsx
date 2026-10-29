import { InputHTMLAttributes, useId, useState } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
  label: string;
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9" />
    <path d="M6.6 6.7A17 17 0 0 0 2 12s3.5 6 10 6a10.5 10.5 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

const PasswordField = ({ label, className = "", ...rest }: Props) => {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-control">
      <label htmlFor={id} className="label py-1">
        <span className="field-label">{label}</span>
      </label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={`input input-bordered w-full pr-12 ${className}`} {...rest} />
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
