const pad = (value: number): string => String(value).padStart(2, "0");

export const todayISO = (offsetDays = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatHora = (hora: string): string => hora.slice(0, 5);

export const formatFecha = (fecha: string): string =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const formatPrecio = (precio: string): string =>
  Number(precio).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export const nombreCompleto = (persona: { nombre: string; apellido: string }): string =>
  `${persona.nombre} ${persona.apellido}`.trim();
