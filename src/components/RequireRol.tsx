import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Rol } from "../api/types";
import { useAuth } from "../hooks/useAuth";

const RequireRol = ({ roles }: { roles: Rol[] }) => {
  const { sesion } = useAuth();
  const location = useLocation();
  if (!sesion) {
    return <Navigate to="/ingresar" replace state={{ desde: location.pathname }} />;
  }
  if (sesion.debe_cambiar_clave && location.pathname !== "/mi-cuenta") {
    return <Navigate to="/mi-cuenta" replace />;
  }
  return roles.includes(sesion.rol) ? <Outlet /> : <Navigate to="/" replace />;
};

export default RequireRol;
