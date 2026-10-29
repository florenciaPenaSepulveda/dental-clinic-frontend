import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PasswordField from "../components/PasswordField";
import { Notice } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { formatRut, isValidRut } from "../lib/rut";

const ActivateAccountPage = () => {
  const { sesion, activarCuenta } = useAuth();
  const navigate = useNavigate();
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesion) {
    return <Navigate to="/" replace />;
  }

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidRut(rut)) {
      setError("El RUT ingresado no es válido.");
      return;
    }
    if (!email.trim()) {
      setError("Ingresa el correo que registraste en la clínica.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await activarCuenta(rut, email.trim(), password);
      navigate("/mi-historial", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar la cuenta.");
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Activar mi cuenta" subtitle="Consulta tu historial de atenciones con tu RUT y una contraseña." />
      <form onSubmit={enviar} className="surface mx-auto max-w-md space-y-4">
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">RUT</span>
          </span>
          <input className="input input-bordered w-full" placeholder="12.345.678-5" autoComplete="off" value={rut} onChange={(e) => setRut(formatRut(e.target.value))} />
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Correo registrado en la clínica</span>
          </span>
          <input type="email" className="input input-bordered w-full" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <PasswordField label="Contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField label="Repite la contraseña" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
          {enviando && <span className="loading loading-spinner loading-sm" />}
          Activar cuenta
        </button>
        <p className="text-center text-sm text-base-content/70">
          ¿Ya tienes cuenta?{" "}
          <Link to="/ingresar" className="link link-primary">
            Ingresar
          </Link>
        </p>
      </form>
    </>
  );
};

export default ActivateAccountPage;
