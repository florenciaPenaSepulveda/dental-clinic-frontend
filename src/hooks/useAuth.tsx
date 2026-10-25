import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { alCerrarSesion, borrarSesion, guardarSesion, leerSesion, type Sesion } from "../lib/session";

interface Auth {
  sesion: Sesion | null;
  iniciarSesion: (username: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  useEffect(() => alCerrarSesion(() => setSesion(null)), []);

  const iniciarSesion = async (username: string, password: string) => {
    const nueva = await api.login(username, password);
    guardarSesion(nueva);
    setSesion(nueva);
  };

  const cerrarSesion = async () => {
    try {
      await api.logout();
    } catch {
      // el token puede haber expirado: igual se cierra la sesión local
    }
    borrarSesion();
  };

  return <AuthContext.Provider value={{ sesion, iniciarSesion, cerrarSesion }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): Auth => {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return contexto;
};
