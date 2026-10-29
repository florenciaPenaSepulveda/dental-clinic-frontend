import { formatFecha, formatFechaCorta } from "./format";

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

export const nombreDia = (iso: string): string => aFecha(iso).toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");

export const etiquetaDia = (iso: string): string => `${nombreDia(iso)} ${formatFechaCorta(iso)}`;

export const etiquetaDiaCompleta = (iso: string): string => `${nombreDia(iso)} ${formatFecha(iso)}`;

export const rangoDeLaSemana = (lunes: string): string => `${formatFecha(lunes)} – ${formatFecha(sumarDias(lunes, 6))}`;

const nombreMes = (iso: string): string => {
  const mes = aFecha(iso).toLocaleDateString("es-CL", { month: "long" });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
};

export const mesDeLaSemana = (lunes: string): string => {
  const domingo = sumarDias(lunes, 6);
  const anioInicio = aFecha(lunes).getFullYear();
  const anioFin = aFecha(domingo).getFullYear();
  if (anioInicio !== anioFin) return `${nombreMes(lunes)} ${anioInicio} – ${nombreMes(domingo)} ${anioFin}`;
  const mesInicio = nombreMes(lunes);
  const mesFin = nombreMes(domingo);
  return mesInicio === mesFin ? `${mesInicio} ${anioInicio}` : `${mesInicio} – ${mesFin} ${anioInicio}`;
};
