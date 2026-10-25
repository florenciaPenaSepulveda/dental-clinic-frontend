import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Notice } from "../components/States";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const { sesion, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { desde?: string } | null)?.desde ?? "/agenda";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesion) {
    return <Navigate to={destino} replace />;
  }

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Ingresa tu usuario y tu contraseña.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await iniciarSesion(username.trim(), password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Ingreso del personal" subtitle="La agenda y la ficha de pacientes son solo para el personal de la clínica." />
      <form onSubmit={enviar} className="surface mx-auto max-w-md space-y-4">
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Usuario</span>
          </span>
          <input className="input input-bordered w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Contraseña</span>
          </span>
          <input
            type="password"
            className="input input-bordered w-full"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
          {enviando && <span className="loading loading-spinner loading-sm" />}
          Ingresar
        </button>
      </form>
    </>
  );
};

export default LoginPage;
