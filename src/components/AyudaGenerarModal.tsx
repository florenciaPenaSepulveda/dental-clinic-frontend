import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AyudaGenerarModal = ({ open, onClose }: Props) => (
  <Modal open={open} title="Cómo funciona Generar horarios" onClose={onClose} wide>
    <div className="space-y-4">
      <section>
        <h4 className="subsection-title mb-1">¿Para qué sirve?</h4>
        <p>
          Crea los horarios libres de la agenda de un dentista. Los pacientes y la recepción solo pueden reservar en horarios que ya existen:
          si un día no tiene horarios generados, aparece vacío.
        </p>
      </section>

      <section>
        <h4 className="subsection-title mb-1">Los campos</h4>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Dentista:</strong> de quién es la agenda. Un dentista solo puede generar la suya; la recepción puede elegir a cualquiera.
          </li>
          <li>
            <strong>Desde el día:</strong> primer día en que se crean horarios. No puede ser anterior a hoy.
          </li>
          <li>
            <strong>Cantidad de días:</strong> cuántos días seguidos se generan, contando desde ese día. Los sábados y domingos también cuentan,
            así que para solo lunes a viernes conviene partir un lunes con 5 días.
          </li>
          <li>
            <strong>Hora inicial y hora final:</strong> el tramo de cada día. Se crean bloques de 30 minutos y el último termina a la hora
            final: con 08:00 a 12:00 la última cita empieza a las 11:30. La clínica atiende entre 08:00 y 18:00.
          </li>
        </ul>
      </section>

      <section>
        <h4 className="subsection-title mb-1">Un ejemplo</h4>
        <p>
          Desde el 02/11/2026, 5 días, de 08:00 a 12:00: se crean 8 horarios por día (08:00, 08:30 … 11:30), de lunes a viernes, es decir 40
          horarios en total.
        </p>
      </section>

      <section>
        <h4 className="subsection-title mb-1">Si repites la operación</h4>
        <p>
          No se duplica nada. Los horarios que ya existían se mantienen con sus reservas, y el mensaje te dice cuántos eran nuevos y cuántos ya
          estaban. Si algo falla (por ejemplo, una hora fuera del horario de atención), no se crea ningún horario de esa tanda.
        </p>
      </section>

      <section>
        <h4 className="subsection-title mb-1">Reservas</h4>
        <p>Cada horario generado admite una sola reserva. Cuando se ocupa, aparece como completo en la agenda y al reservar.</p>
      </section>
    </div>
    <div className="modal-action">
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        Cerrar
      </button>
    </div>
  </Modal>
);

export default AyudaGenerarModal;
