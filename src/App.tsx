import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireStaff from "./components/RequireStaff";
import { AuthProvider } from "./hooks/useAuth";
import AppointmentsPage from "./pages/AppointmentsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
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
          <Route element={<RequireStaff />}>
            <Route path="/agenda" element={<AppointmentsPage />} />
            <Route path="/pacientes" element={<PatientsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
