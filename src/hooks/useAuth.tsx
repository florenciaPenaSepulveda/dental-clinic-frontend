import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { alCerrarSesion, borrarSesion, guardarSesion, leerSesion, type Sesion } from "../lib/session";

interface Auth {
  sesion: Sesion | null;
  iniciarSesion: (username: string, password: string) => Promise<Sesion>;
  activarCuenta: (rut: string, email: string, password: string) => Promise<Sesion>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  useEffect(() => alCerrarSesion(() => setSesion(null)), []);

  const abrirSesion = (nueva: Sesion) => {
    guardarSesion(nueva);
    setSesion(nueva);
    return nueva;
  };

  const iniciarSesion = async (username: string, password: string) => abrirSesion(await api.login(username, password));

  const activarCuenta = async (rut: string, email: string, password: string) => abrirSesion(await api.activarCuenta(rut, email, password));

  const cerrarSesion = async () => {
    try {
      await api.logout();
    } catch {
    }
    borrarSesion();
  };

  return <AuthContext.Provider value={{ sesion, iniciarSesion, activarCuenta, cerrarSesion }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): Auth => {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return contexto;
};
