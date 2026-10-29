import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ConflictoDeServicio, Servicio, ServicioInput } from "../api/types";
import ConflictosServicioModal from "../components/ConflictosServicioModal";
import { Field } from "../components/HelpTip";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { EmptyState, Notice, Spinner } from "../components/States";
import { useLoad } from "../hooks/useLoad";
import { bloquesDe, formatDuracion, formatFecha, formatPrecio } from "../lib/format";

type Aviso = { tone: "success" | "error"; text: string } | null;

const duraciones = Array.from({ length: 16 }, (_, indice) => (indice + 1) * 15);

const vacio: ServicioInput = { nombre: "", duracion_min: 30, precio: "" };

const ayudaDuracion =
  "Cuánto dura el servicio. Los horarios son bloques de 30 minutos: uno de 45 o 60 minutos bloquea el horario siguiente y uno de 90 bloquea los dos siguientes.";

const ServiciosPage = () => {
  const servicios = useLoad(() => api.servicios(), []);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState<ServicioInput>(vacio);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [conflictos, setConflictos] = useState<ConflictoDeServicio[] | null>(null);
  const navigate = useNavigate();

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setErrorForm("");
    setAbierto(true);
  };

  const abrirEdicion = (servicio: Servicio) => {
    setEditando(servicio);
    setForm({ nombre: servicio.nombre, duracion_min: servicio.duracion_min, precio: String(Math.round(Number(servicio.precio))) });
    setErrorForm("");
    setAbierto(true);
  };

  const persistir = async (datos: ServicioInput, pendientes: number): Promise<boolean> => {
    setGuardando(true);
    setErrorForm("");
    try {
      if (editando) {
        await api.actualizarServicio(editando.id, datos);
        setAviso({
          tone: pendientes > 0 ? "error" : "success",
          text:
            pendientes > 0
              ? `Servicio actualizado. Quedan ${pendientes} ${pendientes === 1 ? "cita" : "citas"} con choque de horario: reagéndalas desde la agenda.`
              : "Servicio actualizado.",
        });
      } else {
        await api.crearServicio(datos);
        setAviso({ tone: "success", text: "Servicio creado." });
      }
      setAbierto(false);
      servicios.reload();
      return true;
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : "No se pudo guardar el servicio.");
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const cancelarCita = async (conflicto: ConflictoDeServicio) => {
    if (!window.confirm(`¿Cancelar la cita de ${conflicto.paciente} el ${formatFecha(conflicto.fecha)} a las ${conflicto.hora}?`)) {
      return;
    }
    try {
      await api.cancelarReserva(conflicto.id);
      setConflictos((actuales) => (actuales ? actuales.filter((c) => c.id !== conflicto.id) : actuales));
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : "No se pudo cancelar la cita.");
    }
  };

  const guardarConConflictos = async (revisarEnAgenda: boolean) => {
    const pendientes = conflictos ?? [];
    const datos = { ...form, nombre: form.nombre.trim() };
    const guardado = await persistir(datos, pendientes.length);
    if (!guardado) return;
    setConflictos(null);
    if (revisarEnAgenda && pendientes.length > 0) {
      const primero = pendientes[0];
      navigate(`/agenda?dentista=${primero.dentista_id}&fecha=${primero.fecha}`);
    }
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setErrorForm("Ingresa el nombre del servicio.");
      return;
    }
    if (form.precio === "" || Number(form.precio) < 0) {
      setErrorForm("Ingresa un precio válido.");
      return;
    }
    const datos = { ...form, nombre: form.nombre.trim() };
    if (editando && datos.duracion_min !== editando.duracion_min) {
      setGuardando(true);
      try {
        const { conflictos: encontrados } = await api.conflictosDeServicio(editando.id, datos.duracion_min);
        if (encontrados.length > 0) {
          setConflictos(encontrados);
          return;
        }
      } catch (error) {
        setErrorForm(error instanceof Error ? error.message : "No se pudo revisar las citas agendadas.");
        return;
      } finally {
        setGuardando(false);
      }
    }
    await persistir(datos, 0);
  };

  const lista = servicios.data ?? [];

  return (
    <>
      <PageHeader
        title="Servicios"
        subtitle="Prestaciones que ofrece la clínica, con su duración y valor"
        actions={
          <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
            Nuevo servicio
          </button>
        }
      />

      <section className="surface">
        {aviso && <Notice tone={aviso.tone}>{aviso.text}</Notice>}
        {servicios.loading ? (
          <Spinner />
        ) : servicios.error ? (
          <Notice tone="error">{servicios.error}</Notice>
        ) : lista.length === 0 ? (
          <EmptyState title="Aún no hay servicios" description="Crea el primer servicio para poder asignarlo a las reservas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[720px] table-fixed">
              <thead>
                <tr className="text-xs uppercase text-base-content/70">
                  <th>Servicio</th>
                  <th className="w-32">Duración</th>
                  <th className="w-44">Horarios que ocupa</th>
                  <th className="w-36">Precio</th>
                  <th className="w-24">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((servicio) => (
                  <tr key={servicio.id} className="hover">
                    <td className="truncate font-medium text-neutral" title={servicio.nombre}>
                      {servicio.nombre}
                    </td>
                    <td className="whitespace-nowrap">{formatDuracion(servicio.duracion_min)}</td>
                    <td className="whitespace-nowrap">{bloquesDe(servicio.duracion_min) === 1 ? "1 horario" : `${bloquesDe(servicio.duracion_min)} horarios seguidos`}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatPrecio(servicio.precio)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-xs w-16" onClick={() => abrirEdicion(servicio)}>
                          Editar
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

      <Modal open={abierto} title={editando ? "Editar servicio" : "Nuevo servicio"} onClose={() => setAbierto(false)}>
        <form onSubmit={guardar} className="space-y-3">
          <Field label="Nombre">
            {(id) => (
              <input id={id} className="input input-bordered w-full" maxLength={150} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            )}
          </Field>
          <Field label="Duración" help={ayudaDuracion}>
            {(id) => (
              <select
                id={id}
                className="select select-bordered w-full"
                value={form.duracion_min}
                onChange={(e) => setForm({ ...form, duracion_min: Number(e.target.value) })}
              >
                {duraciones.map((minutos) => (
                  <option key={minutos} value={minutos}>
                    {formatDuracion(minutos)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <p className="hint">
            Ocupará {bloquesDe(form.duracion_min) === 1 ? "1 horario" : `${bloquesDe(form.duracion_min)} horarios seguidos`} de la agenda.
          </p>
          <Field label="Precio (CLP)" help="Valor referencial: el pago se realiza en la consulta.">
            {(id) => (
              <input
                id={id}
                type="number"
                min={0}
                step={500}
                className="input input-bordered w-full"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            )}
          </Field>
          {errorForm && <Notice tone="error">{errorForm}</Notice>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {editando ? "Guardar cambios" : "Crear servicio"}
            </button>
          </div>
        </form>
      </Modal>

      <ConflictosServicioModal
        conflictos={conflictos}
        duracionActual={editando?.duracion_min ?? form.duracion_min}
        duracionNueva={form.duracion_min}
        guardando={guardando}
        onVolver={() => setConflictos(null)}
        onCancelarCita={cancelarCita}
        onGuardar={guardarConConflictos}
      />
    </>
  );
};

export default ServiciosPage;
