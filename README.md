# Clínica Dental · Frontend

[![CI](https://github.com/florenciaPenaSepulveda/dental-clinic-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/dental-clinic-frontend/actions/workflows/ci.yml)

Interfaz web de una clínica dental para reservar horas, ver la agenda del día y administrar pacientes. Consume la API REST del backend y está construida con React, Vite, TypeScript, Tailwind CSS y daisyUI.

## Repositorios del proyecto

| Repositorio | Descripción |
|---|---|
| [dental-clinic-backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend) | API REST de agenda y reservas (necesaria para usar la interfaz) |
| **dental-clinic-frontend** (este) | Interfaz web |

## Funcionalidades

- **Inicio:** dentistas y servicios con sus precios.
- **Reservar hora:** elige dentista, servicio y fecha; los horarios se muestran en verde (disponible), ámbar (solo sobrecupo) o gris (completo). El paciente se identifica por su RUT: si ya está registrado se muestran sus datos (sin listar a los demás pacientes) y, si no existe, se piden los datos necesarios para registrarlo en el mismo paso.
- **Ingreso por rol:** el público solo ve el inicio y la reserva. Con sesión iniciada, recepción y dentistas ven la Agenda y los Pacientes, y los pacientes con cuenta ven su historial. La sesión dura mientras la pestaña esté abierta. Un paciente activa su cuenta con su RUT y el correo registrado en la clínica.
- **Agenda semanal:** una semana por dentista con flechas para avanzar y retroceder. Cada horario muestra el detalle de su reserva, o permite agendar si está libre (incluye sobrecupos). Al abrir una reserva se puede cambiar el estado, el servicio, dejar observaciones internas, reprogramarla, cancelarla, ver el historial del paciente y gestionar sus archivos. La generación de horarios en bloques de 30 minutos está debajo del calendario.
- **Exámenes adjuntos:** al reservar (o desde la agenda) se pueden subir hasta 5 archivos PDF, JPG o PNG de hasta 5 MB. Solo se descargan con sesión, por quien tiene acceso a esa reserva.
- **Ficha clínica:** el dentista registra diagnóstico, procedimiento e indicaciones de cada atención. Recepción las lee; cada dentista ve solo a sus pacientes; cada paciente ve solo su propio historial con el profesional que lo atendió.
- **Equipo y cuentas:** recepción registra y edita dentistas, y crea o restablece las cuentas de acceso de dentistas y pacientes (usuario y contraseña temporal que se muestra una sola vez). Cada usuario cambia su contraseña en Mi cuenta.
- **Pacientes:** registro, búsqueda, edición y eliminación con validación de RUT (recepción) e historial por paciente. Los dentistas solo ven a quienes se atienden con ellos.

## Requisitos

- Node.js 24 LTS (ver `.nvmrc`)
- El backend en ejecución (ver el README de [dental-clinic-backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend)):

  ```
  python manage.py migrate
  python manage.py seed_data --demo
  python manage.py runserver
  ```

## Puesta en marcha

```
cp .env.example .env
npm install
npm run dev
```

Disponible en `http://localhost:5173`. La URL de la API se configura con `VITE_API_URL` (por defecto `http://localhost:8000/agenda`).

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas |
| `npm run test:cov` | Pruebas con cobertura (umbral del 80 %; actual 99 %) |

## Estructura

```
src/api/          cliente de la API y tipos
src/components/   diseño general y componentes compartidos
src/hooks/        carga de datos
src/lib/          validación de RUT y formato
src/pages/        Inicio, Reservar hora, Ingreso, Activar cuenta, Agenda, Pacientes, Equipo, Mi historial y Mi cuenta
```

## Autoría

Proyecto académico desarrollado en equipo; esta versión forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda).
