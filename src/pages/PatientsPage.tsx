import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Paciente, PacienteInput } from "../api/types";
import CuentaModal from "../components/CuentaModal";
import HistorialPacienteModal from "../components/HistorialPacienteModal";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { useLoad } from "../hooks/useLoad";
import { nombreCompleto } from "../lib/format";
import { formatRut, isValidRut } from "../lib/rut";

const TAMANO_PAGINA = 25;

const vacio: PacienteInput = { rut: "", nombre: "", apellido: "", telefono: "", email: "" };

type Aviso = { tone: "success" | "error"; text: string } | null;

const PatientsPage = () => {
  const { sesion } = useAuth();
  const puedeEditar = sesion?.rol === "recepcion";
  const [historialDe, setHistorialDe] = useState<Paciente | null>(null);
  const [cuentaDe, setCuentaDe] = useState<Paciente | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [termino, setTermino] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState<PacienteInput>(vacio);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    const espera = setTimeout(() => {
      setTermino(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const pacientes = useLoad(() => api.pacientes({ q: termino, page: pagina }), [termino, pagina]);

  const lista = pacientes.data?.results ?? [];
  const total = pacientes.data?.count ?? 0;
  const primero = (pagina - 1) * TAMANO_PAGINA + 1;

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setErrorForm("");
    setAbierto(true);
  };

  const abrirEdicion = (paciente: Paciente) => {
    setEditando(paciente);
    setForm({
      rut: paciente.rut,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      telefono: paciente.telefono,
      email: paciente.email,
    });
    setErrorForm("");
    setAbierto(true);
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidRut(form.rut)) {
      setErrorForm("El RUT ingresado no es válido.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      if (editando) {
        await api.actualizarPaciente(editando.id, form);
        setAviso({ tone: "success", text: "Paciente actualizado." });
      } else {
        await api.crearPaciente(form);
        setAviso({ tone: "success", text: "Paciente registrado." });
      }
      setAbierto(false);
      pacientes.reload();
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : "No se pudo guardar el paciente.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (paciente: Paciente) => {
    if (!window.confirm(`¿Eliminar a ${nombreCompleto(paciente)}? También se eliminarán sus reservas.`)) {
      return;
    }
    try {
      await api.eliminarPaciente(paciente.id);
      setAviso({ tone: "success", text: "Paciente eliminado." });
      if (lista.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      } else {
        pacientes.reload();
      }
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo eliminar el paciente." });
    }
  };

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={puedeEditar ? "Registro de pacientes de la clínica" : "Pacientes que se atienden contigo"}
        actions={
          puedeEditar && (
            <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
              Nuevo paciente
            </button>
          )
        }
      />

      <section className="surface">
        <div className="mb-4 flex justify-end">
          <input
            className="input input-bordered input-sm w-full max-w-xs"
            placeholder="Buscar por nombre, RUT o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}

        {pacientes.loading ? (
          <Spinner />
        ) : pacientes.error ? (
          <Notice tone="error">{pacientes.error}</Notice>
        ) : lista.length === 0 ? (
          <EmptyState title="Sin resultados" description="No hay pacientes que coincidan con la búsqueda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="text-xs uppercase text-base-content/70">
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((paciente) => (
                  <tr key={paciente.id} className="hover">
                    <td className="font-medium text-neutral">{nombreCompleto(paciente)}</td>
                    <td>{paciente.rut}</td>
                    <td>{paciente.telefono || "-"}</td>
                    <td>{paciente.email || "-"}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn btn-ghost btn-xs" onClick={() => setHistorialDe(paciente)}>
                        Historial
                      </button>
                      {puedeEditar && (
                        <>
                          <button className="btn btn-ghost btn-xs" onClick={() => abrirEdicion(paciente)}>
                            Editar
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setCuentaDe(paciente)}>
                            {paciente.tiene_cuenta ? "Restablecer acceso" : "Crear cuenta"}
                          </button>
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => eliminar(paciente)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-base-content/70">
            <span>
              Mostrando {primero}–{primero + lista.length - 1} de {total}
            </span>
            <div className="join">
              <button className="btn btn-outline btn-sm join-item" disabled={!pacientes.data?.previous} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </button>
              <button className="btn btn-outline btn-sm join-item" disabled={!pacientes.data?.next} onClick={() => setPagina(pagina + 1)}>
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal open={abierto} title={editando ? "Editar paciente" : "Nuevo paciente"} onClose={() => setAbierto(false)}>
        <form onSubmit={guardar} className="space-y-3">
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">RUT</span>
            </span>
            <input
              className="input input-bordered w-full"
              placeholder="12.345.678-5"
              value={form.rut}
              onChange={(e) => setForm({ ...form, rut: formatRut(e.target.value) })}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Nombre</span>
              </span>
              <input className="input input-bordered w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Apellido</span>
              </span>
              <input className="input input-bordered w-full" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
            </label>
          </div>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Teléfono</span>
            </span>
            <input className="input input-bordered w-full" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </label>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Correo electrónico</span>
            </span>
            <input type="email" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          {errorForm && <Notice tone="error">{errorForm}</Notice>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {editando ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </Modal>
      <HistorialPacienteModal paciente={historialDe} onClose={() => setHistorialDe(null)} />
      <CuentaModal persona={cuentaDe} generar={(persona) => api.cuentaPaciente(persona.id)} onClose={() => setCuentaDe(null)} onHecho={pacientes.reload} />
    </>
  );
};

export default PatientsPage;
