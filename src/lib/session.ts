const KEY = "clinica.sesion";

export interface Sesion {
  token: string;
  username: string;
}

const listeners = new Set<() => void>();

export const leerSesion = (): Sesion | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
};

export const guardarSesion = (sesion: Sesion): void => sessionStorage.setItem(KEY, JSON.stringify(sesion));

export const borrarSesion = (): void => {
  sessionStorage.removeItem(KEY);
  listeners.forEach((listener) => listener());
};

export const alCerrarSesion = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
