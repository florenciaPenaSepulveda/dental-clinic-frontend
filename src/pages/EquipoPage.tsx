import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { Dentista, DentistaInput } from "../api/types";
import CuentaModal from "../components/CuentaModal";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { nombreCompleto } from "../lib/format";

const vacio: DentistaInput = { nombre: "", apellido: "", especialidad: "", email: "", telefono: "", max_overbook_day: 0 };

type Aviso = { tone: "success" | "error"; text: string } | null;

const EquipoPage = () => {
  const dentistas = useLoad(() => api.dentistas(), []);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Dentista | null>(null);
  const [form, setForm] = useState<DentistaInput>(vacio);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cuentaDe, setCuentaDe] = useState<Dentista | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setErrorForm("");
    setAbierto(true);
  };

  const abrirEdicion = (dentista: Dentista) => {
    setEditando(dentista);
    setForm({
      nombre: dentista.nombre,
      apellido: dentista.apellido,
      especialidad: dentista.especialidad,
      email: dentista.email,
      telefono: dentista.telefono,
      max_overbook_day: dentista.max_overbook_day,
    });
    setErrorForm("");
    setAbierto(true);
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setErrorForm("Completa el nombre y el apellido.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      const datos = { ...form, nombre: form.nombre.trim(), apellido: form.apellido.trim() };
      if (editando) {
        await api.actualizarDentista(editando.id, datos);
        setAviso({ tone: "success", text: "Dentista actualizado." });
      } else {
        await api.crearDentista(datos);
        setAviso({ tone: "success", text: "Dentista registrado. Ya puedes generarle una cuenta de acceso." });
      }
      setAbierto(false);
      dentistas.reload();
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : "No se pudo guardar el dentista.");
    } finally {
      setGuardando(false);
    }
  };

  const lista = dentistas.data ?? [];

  return (
    <>
      <PageHeader
        title="Equipo"
        subtitle="Dentistas de la clínica y sus cuentas de acceso"
        actions={
          <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
            Nuevo dentista
          </button>
        }
      />

      <section className="surface">
        {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}
        {dentistas.loading ? (
          <Spinner />
        ) : dentistas.error ? (
          <Notice tone="error">{dentistas.error}</Notice>
        ) : lista.length === 0 ? (
          <EmptyState title="Aún no hay dentistas" description="Registra al primer dentista para poder generar su agenda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="text-xs uppercase text-base-content/70">
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Acceso</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((dentista) => (
                  <tr key={dentista.id} className="hover">
                    <td className="font-medium text-neutral">{nombreCompleto(dentista)}</td>
                    <td>{dentista.especialidad || "-"}</td>
                    <td>{dentista.email || "-"}</td>
                    <td>{dentista.telefono || "-"}</td>
                    <td>
                      <span className={`badge ${dentista.tiene_cuenta ? "badge-success" : "badge-ghost"}`}>
                        {dentista.tiene_cuenta ? "Con cuenta" : "Sin cuenta"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-xs w-16" onClick={() => abrirEdicion(dentista)}>
                          Editar
                        </button>
                        <button className="btn btn-ghost btn-xs w-36" onClick={() => setCuentaDe(dentista)}>
                          {dentista.tiene_cuenta ? "Restablecer acceso" : "Crear cuenta"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={abierto} title={editando ? "Editar dentista" : "Nuevo dentista"} onClose={() => setAbierto(false)}>
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Nombre</span>
              </span>
              <input className="input input-bordered w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Apellido</span>
              </span>
              <input className="input input-bordered w-full" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
            </label>
          </div>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Especialidad</span>
            </span>
            <input className="input input-bordered w-full" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Correo electrónico</span>
              </span>
              <input type="email" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="form-control">
              <span className="label py-1">
                <span className="field-label">Teléfono</span>
              </span>
              <input className="input input-bordered w-full" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </label>
          </div>
          <label className="form-control">
            <span className="label py-1">
              <span className="field-label">Sobrecupos máximos por día</span>
            </span>
            <input
              type="number"
              min={0}
              className="input input-bordered w-full"
              value={form.max_overbook_day}
              onChange={(e) => setForm({ ...form, max_overbook_day: Math.max(0, Number(e.target.value) || 0) })}
            />
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

      <CuentaModal persona={cuentaDe} generar={(persona) => api.cuentaDentista(persona.id)} onClose={() => setCuentaDe(null)} onHecho={dentistas.reload} />
    </>
  );
};

export default EquipoPage;
