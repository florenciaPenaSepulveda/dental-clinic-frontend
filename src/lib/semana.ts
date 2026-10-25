const pad = (value: number): string => String(value).padStart(2, "0");

const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00`);

const aISO = (fecha: Date): string => `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;

export const sumarDias = (iso: string, dias: number): string => {
  const fecha = aFecha(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aISO(fecha);
};

export const lunesDe = (iso: string): string => sumarDias(iso, -((aFecha(iso).getDay() + 6) % 7));

export const diasDeLaSemana = (lunes: string): string[] => Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice));

export const etiquetaDia = (iso: string): string => aFecha(iso).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" });

const corta = (iso: string): string => aFecha(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

export const rangoDeLaSemana = (lunes: string): string => `${corta(lunes)} – ${corta(sumarDias(lunes, 6))} ${aFecha(lunes).getFullYear()}`;
