import { formatFecha, formatHora, formatPrecio, nombreCompleto, todayISO } from "./format";
import { cleanRut, formatRut, isValidRut } from "./rut";

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
