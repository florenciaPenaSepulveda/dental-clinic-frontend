import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireRol from "./components/RequireRol";
import { AuthProvider } from "./hooks/useAuth";
import ActivateAccountPage from "./pages/ActivateAccountPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import EquipoPage from "./pages/EquipoPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MiCuentaPage from "./pages/MiCuentaPage";
import MyHistoryPage from "./pages/MyHistoryPage";
import PatientsPage from "./pages/PatientsPage";
import ReservationPage from "./pages/ReservationPage";

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/reservar" element={<ReservationPage />} />
          <Route path="/ingresar" element={<LoginPage />} />
          <Route path="/activar-cuenta" element={<ActivateAccountPage />} />
          <Route element={<RequireRol roles={["recepcion", "dentista"]} />}>
            <Route path="/agenda" element={<AppointmentsPage />} />
            <Route path="/pacientes" element={<PatientsPage />} />
          </Route>
          <Route element={<RequireRol roles={["recepcion"]} />}>
            <Route path="/equipo" element={<EquipoPage />} />
          </Route>
          <Route element={<RequireRol roles={["recepcion", "dentista", "paciente"]} />}>
            <Route path="/mi-cuenta" element={<MiCuentaPage />} />
          </Route>
          <Route element={<RequireRol roles={["paciente"]} />}>
            <Route path="/mi-historial" element={<MyHistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
