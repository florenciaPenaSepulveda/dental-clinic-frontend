import { api } from "../api/client";
import type { Archivo } from "../api/types";

export const MAX_ARCHIVOS = 5;
export const MAX_BYTES = 5 * 1024 * 1024;
export const EXTENSIONES = ["pdf", "jpg", "jpeg", "png"];

export const validarArchivos = (archivos: File[], existentes = 0): string => {
  if (archivos.length + existentes > MAX_ARCHIVOS) {
    return `Se permiten hasta ${MAX_ARCHIVOS} archivos por reserva.`;
  }
  for (const archivo of archivos) {
    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONES.includes(extension)) {
      return "Solo se aceptan archivos PDF, JPG o PNG.";
    }
    if (archivo.size > MAX_BYTES) {
      return `${archivo.name} supera los 5 MB permitidos.`;
    }
  }
  return "";
};

export const formatTamano = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const descargarArchivo = async (archivo: Archivo): Promise<void> => {
  const blob = await api.archivo(archivo.id);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};
