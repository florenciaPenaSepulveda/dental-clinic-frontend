import { useState } from "react";
import { api } from "../api/client";
import type { Paciente, PacienteInput } from "../api/types";
import { nombreCompleto } from "../lib/format";
import { formatRut, isValidRut } from "../lib/rut";

type Busqueda = { tipo: "inicial" } | { tipo: "buscando" } | { tipo: "existente"; paciente: Paciente } | { tipo: "nuevo" };

type DatosNuevo = Omit<PacienteInput, "rut">;

const datosVacios: DatosNuevo = { nombre: "", apellido: "", telefono: "", email: "" };

export const usePacienteSelector = () => {
  const [rut, setRut] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda>({ tipo: "inicial" });
  const [errorRut, setErrorRut] = useState("");
  const [nuevo, setNuevo] = useState<DatosNuevo>(datosVacios);

  const cambiarRut = (valor: string) => {
    setRut(formatRut(valor));
    setBusqueda({ tipo: "inicial" });
    setErrorRut("");
  };

  const cambiarNuevo = (campo: keyof DatosNuevo, valor: string) => setNuevo((actual) => ({ ...actual, [campo]: valor }));

  const buscar = async () => {
    if (!isValidRut(rut)) {
      setErrorRut("El RUT ingresado no es válido. Revisa los números y el dígito verificador.");
      return;
    }
    setErrorRut("");
    setBusqueda({ tipo: "buscando" });
    try {
      const encontrado = await api.buscarPaciente(rut);
      setBusqueda(encontrado ? { tipo: "existente", paciente: encontrado } : { tipo: "nuevo" });
    } catch (error) {
      setBusqueda({ tipo: "inicial" });
      setErrorRut(error instanceof Error ? error.message : "No se pudo buscar al paciente.");
    }
  };

  const validar = (): string => {
    if (busqueda.tipo === "inicial" || busqueda.tipo === "buscando") return "Ingresa el RUT del paciente y presiona Buscar.";
    if (busqueda.tipo === "nuevo" && (!nuevo.nombre.trim() || !nuevo.apellido.trim())) {
      return "Completa el nombre y el apellido del paciente.";
    }
    return "";
  };

  const resolver = async (): Promise<number> =>
    busqueda.tipo === "existente"
      ? busqueda.paciente.id
      : (await api.crearPaciente({ ...nuevo, rut, nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim() })).id;

  const reiniciar = () => {
    setRut("");
    setBusqueda({ tipo: "inicial" });
    setErrorRut("");
    setNuevo(datosVacios);
  };

  return { rut, busqueda, errorRut, nuevo, cambiarRut, cambiarNuevo, buscar, validar, resolver, reiniciar };
};

export type ControlPaciente = ReturnType<typeof usePacienteSelector>;

export const PacienteSelector = ({ control }: { control: ControlPaciente }) => {
  const { rut, busqueda, errorRut, nuevo, cambiarRut, cambiarNuevo, buscar } = control;
  return (
    <>
      <div className="form-control">
        <label htmlFor="rut-paciente" className="label py-1">
          <span className="field-label">RUT del paciente</span>
        </label>
        <div className="join w-full">
          <input
            id="rut-paciente"
            className={`input input-bordered join-item w-full ${errorRut ? "input-error" : ""}`}
            placeholder="12.345.678-5"
            autoComplete="off"
            value={rut}
            onChange={(e) => cambiarRut(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
          />
          <button type="button" className="btn btn-outline btn-primary join-item" disabled={busqueda.tipo === "buscando"} onClick={buscar}>
            {busqueda.tipo === "buscando" && <span className="loading loading-spinner loading-sm" />}
            Buscar
          </button>
        </div>
        {errorRut && <p className="mt-1 text-sm text-error">{errorRut}</p>}
      </div>

      {busqueda.tipo === "existente" && (
        <div className="rounded-box border border-success/40 bg-success/10 p-3 text-sm" aria-label="Paciente encontrado">
          <p className="font-semibold">Paciente registrado</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-base-content/70">Nombre</dt>
            <dd>{nombreCompleto(busqueda.paciente)}</dd>
            <dt className="text-base-content/70">RUT</dt>
            <dd>{busqueda.paciente.rut}</dd>
            <dt className="text-base-content/70">Teléfono</dt>
            <dd>{busqueda.paciente.telefono || "Sin registrar"}</dd>
            <dt className="text-base-content/70">Correo</dt>
            <dd className="break-all">{busqueda.paciente.email || "Sin registrar"}</dd>
          </dl>
        </div>
      )}

      {busqueda.tipo === "nuevo" && (
        <div className="space-y-3">
          <p className="text-sm text-base-content/70">No encontramos este RUT. Completa los datos para registrar al paciente.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Nombre</span>
              </span>
              <input className="input input-bordered w-full" value={nuevo.nombre} onChange={(e) => cambiarNuevo("nombre", e.target.value)} />
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Apellido</span>
              </span>
              <input className="input input-bordered w-full" value={nuevo.apellido} onChange={(e) => cambiarNuevo("apellido", e.target.value)} />
            </label>
          </div>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Teléfono</span>
            </span>
            <input className="input input-bordered w-full" value={nuevo.telefono} onChange={(e) => cambiarNuevo("telefono", e.target.value)} />
          </label>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Correo electrónico</span>
            </span>
            <input type="email" className="input input-bordered w-full" value={nuevo.email} onChange={(e) => cambiarNuevo("email", e.target.value)} />
          </label>
        </div>
      )}
    </>
  );
};
