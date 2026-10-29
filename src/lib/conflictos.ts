import type { MotivoConflicto } from "../api/types";

export const textoDeConflicto: Record<MotivoConflicto, string> = {
  superpuesta: "Se superpone con la cita siguiente",
  excede: "No alcanza el espacio de la agenda: falta un horario seguido o pasa del cierre",
};
