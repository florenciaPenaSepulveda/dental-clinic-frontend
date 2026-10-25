import { formatFecha, formatHora, formatPrecio, nombreCompleto, todayISO } from "./format";
import { cleanRut, formatRut, isValidRut } from "./rut";
import { archivo as archivoDe, sesionDe } from "../test/fixtures";
import { api } from "../api/client";
import { descargarArchivo, formatTamano, MAX_BYTES, validarArchivos } from "./archivos";
import { diasDeLaSemana, etiquetaDia, lunesDe, rangoDeLaSemana, sumarDias } from "./semana";
import { alCerrarSesion, borrarSesion, guardarSesion, leerSesion } from "./session";

describe("rut", () => {
  it("limpia, formatea y valida", () => {
    expect(cleanRut("12.345.678-k")).toBe("12345678K");
    expect(formatRut("123456785")).toBe("12.345.678-5");
    expect(formatRut("1")).toBe("1");
    expect(isValidRut("12.345.678-5")).toBe(true);
    expect(isValidRut("12.345.678-9")).toBe(false);
    expect(isValidRut("123")).toBe(false);
    expect(isValidRut("23.232.323-K")).toBe(true);
    expect(isValidRut("20.000.007-0")).toBe(false);
  });

  it("descarta caracteres ajenos y K fuera del dígito verificador", () => {
    expect(cleanRut("12K345.678-5")).toBe("123456785");
    expect(cleanRut("abc 12.345.678-5 xyz")).toBe("123456785");
    expect(formatRut("12345678-5999")).toBe("12.345.678-5");
  });

  it("rechaza RUT con cuerpo menor al mínimo o vacío", () => {
    expect(isValidRut("")).toBe(false);
    expect(isValidRut("0000000-0")).toBe(false);
    expect(isValidRut("00.000.000-0")).toBe(false);
    expect(isValidRut("123456785")).toBe(true);
    expect(isValidRut("1.000.005-K")).toBe(true);
  });
});

describe("session", () => {
  afterEach(() => sessionStorage.clear());

  it("guarda, lee y borra la sesión avisando a los oyentes", () => {
    const oyente = vi.fn();
    const quitar = alCerrarSesion(oyente);
    expect(leerSesion()).toBeNull();
    guardarSesion(sesionDe("recepcion"));
    expect(leerSesion()).toEqual(sesionDe("recepcion"));
    borrarSesion();
    expect(leerSesion()).toBeNull();
    expect(oyente).toHaveBeenCalledTimes(1);
    quitar();
    borrarSesion();
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it("ignora una sesión guardada con formato inválido", () => {
    sessionStorage.setItem("clinica.sesion", "{no-es-json");
    expect(leerSesion()).toBeNull();
  });
});

describe("semana", () => {
  it("calcula el lunes de cualquier día", () => {
    expect(lunesDe("2026-10-28")).toBe("2026-10-26");
    expect(lunesDe("2026-10-26")).toBe("2026-10-26");
    expect(lunesDe("2026-11-01")).toBe("2026-10-26");
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(sumarDias("2026-01-02", -3)).toBe("2025-12-30");
  });

  it("lista los siete días y los etiqueta", () => {
    expect(diasDeLaSemana("2026-10-26")).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(etiquetaDia("2026-10-26")).toMatch(/lun/i);
    expect(rangoDeLaSemana("2026-10-26")).toMatch(/26.*2026/);
  });
});

describe("archivos", () => {
  const archivo = (nombre: string, tamano = 10) => new File([new Uint8Array(tamano)], nombre);

  it("valida cantidad, tipo y tamaño", () => {
    expect(validarArchivos([archivo("a.pdf"), archivo("b.PNG"), archivo("c.jpeg")])).toBe("");
    expect(validarArchivos([archivo("a.exe")])).toMatch(/PDF, JPG o PNG/);
    expect(validarArchivos([archivo("sinextension")])).toMatch(/PDF, JPG o PNG/);
    expect(validarArchivos([archivo("grande.pdf", MAX_BYTES + 1)])).toMatch(/supera los 5 MB/);
    expect(validarArchivos(Array.from({ length: 5 }, (_, i) => archivo(`${i}.pdf`)), 1)).toMatch(/hasta 5 archivos/);
  });

  it("formatea el tamaño", () => {
    expect(formatTamano(100)).toBe("1 KB");
    expect(formatTamano(2048)).toBe("2 KB");
    expect(formatTamano(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("descarga el archivo creando un enlace temporal", async () => {
    vi.spyOn(api, "archivo").mockResolvedValue(new Blob(["x"]));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await descargarArchivo(archivoDe(4, "examen.pdf"));
    expect(clic).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
  });
});

describe("format", () => {
  it("formatea horas, fechas y precios", () => {
    expect(formatHora("10:30:00")).toBe("10:30");
    expect(formatFecha("2026-10-25")).toMatch(/octubre/);
    expect(formatPrecio("25000.00")).toMatch(/25\.000/);
    expect(nombreCompleto({ nombre: "Ana", apellido: "Pérez" })).toBe("Ana Pérez");
  });

  it("calcula la fecha de hoy con desplazamiento", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayISO(1) > todayISO()).toBe(true);
  });
});
