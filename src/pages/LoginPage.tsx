import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Notice } from "../components/States";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const { sesion, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pedido = (location.state as { desde?: string } | null)?.desde;
  const destinoDe = (rol?: string, debeCambiarClave?: boolean) =>
    debeCambiarClave ? "/mi-cuenta" : (pedido ?? (rol === "paciente" ? "/mi-historial" : "/agenda"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesion) {
    return <Navigate to={destinoDe(sesion.rol, sesion.debe_cambiar_clave)} replace />;
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
      const nueva = await iniciarSesion(username.trim(), password);
      navigate(destinoDe(nueva.rol, nueva.debe_cambiar_clave), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Ingresar" subtitle="Para el personal de la clínica y para pacientes con cuenta." />
      <form onSubmit={enviar} className="surface mx-auto max-w-md space-y-4">
        {pedido && <Notice tone="info">Inicia sesión para continuar.</Notice>}
        <label className="form-control">
          <span className="label py-1">
            <span className="field-label">Usuario o RUT</span>
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
        <p className="text-center text-sm text-base-content/70">
          ¿Eres paciente y aún no tienes cuenta?{" "}
          <Link to="/activar-cuenta" className="link link-primary">
            Actívala aquí
          </Link>
        </p>
      </form>
    </>
  );
};

export default LoginPage;
