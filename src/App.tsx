import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AppointmentsPage from "./pages/AppointmentsPage";
import HomePage from "./pages/HomePage";
import PatientsPage from "./pages/PatientsPage";
import ReservationPage from "./pages/ReservationPage";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reservar" element={<ReservationPage />} />
        <Route path="/agenda" element={<AppointmentsPage />} />
        <Route path="/pacientes" element={<PatientsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
