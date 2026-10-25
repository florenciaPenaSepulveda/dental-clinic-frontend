import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const RequireStaff = () => {
  const { sesion } = useAuth();
  const location = useLocation();
  return sesion ? <Outlet /> : <Navigate to="/ingresar" replace state={{ desde: location.pathname }} />;
};

export default RequireStaff;
