const pad = (value: number): string => String(value).padStart(2, "0");

export const todayISO = (offsetDays = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatHora = (hora: string): string => hora.slice(0, 5);

export const formatFecha = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
};

export const formatFechaCorta = (fecha: string): string => formatFecha(fecha).slice(0, 5);

export const parseFecha = (texto: string): string | null => {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) return null;
  const [, dia, mes, anio] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  const valida = fecha.getFullYear() === Number(anio) && fecha.getMonth() === Number(mes) - 1 && fecha.getDate() === Number(dia);
  return valida ? `${anio}-${mes}-${dia}` : null;
};

export const formatPrecio = (precio: string): string =>
  Number(precio).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export const nombreCompleto = (persona: { nombre: string; apellido: string }): string =>
  `${persona.nombre} ${persona.apellido}`.trim();
