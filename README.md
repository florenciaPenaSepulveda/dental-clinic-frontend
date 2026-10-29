# Clínica Dental · Frontend

[![CI](https://github.com/florenciaPenaSepulveda/dental-clinic-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/dental-clinic-frontend/actions/workflows/ci.yml)

Interfaz web de una clínica dental para reservar horas, ver la agenda del día y administrar pacientes. Consume la API REST del backend y está construida con React, Vite, TypeScript, Tailwind CSS y daisyUI.

## Probar la demo

**https://dental-clinic-frontend-sjnv.onrender.com** (la API está en [dental-clinic-backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend))

| Rol | Usuario | Contraseña | Qué puedes probar |
|---|---|---|---|
| Recepción | `recepcion` | `Demo-h1eur-Clinica-6l8ax` | Agenda, pacientes, equipo, servicios y generación de horarios |
| Dentista | `dr.rojas` | `Demo-h1eur-Clinica-6l8ax` | Su agenda, sus pacientes y la ficha clínica de cada atención |
| Paciente | `14.000.000-0` (su RUT) | `Demo-h1eur-Clinica-6l8ax` | Reservar a su nombre y ver su historial |

Sin iniciar sesión también puedes **reservar una hora** desde "Reservar hora". Son cuentas de demostración con datos ficticios.

> **Los datos se reinician** cuando el servidor se duerme (unos 15 minutos sin uso) o se actualiza la demo, y la primera carga puede tardar hasta un minuto. Lo que crees (cuentas, reservas) no se conserva; las cuentas de arriba siempre vuelven a existir.

## Qué hace

- **Reservar hora** sin cuenta: dentista, servicio, fecha y horario; el RUT identifica al paciente.
- **Agenda semanal** por dentista: detalle de cada reserva, reagendar, cancelar y generar horarios.
- **Sobrecupos** manejados por recepción o por el propio dentista, con un límite por día y por fecha.
- **Duración de los servicios:** una cita larga bloquea los horarios siguientes, y al cambiar una duración se avisa de las citas que chocarían.
- **Roles:** recepción, dentistas y pacientes ven solo lo que les corresponde.
- **Ficha clínica**, exámenes adjuntos, cuentas de acceso y búsqueda de pacientes.

Detalle completo en [docs/funcionalidades.md](docs/funcionalidades.md).

## Inicio rápido

```
cp .env.example .env
npm install
npm run dev
```

Abre `http://localhost:5173`. Necesita Node.js 24 (ver `.nvmrc`) y el [backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend) en ejecución:

```
python manage.py migrate
python manage.py seed_data --demo
python manage.py runserver
```

La URL de la API se configura con `VITE_API_URL` (por defecto `http://localhost:8000/agenda`).

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas |
| `npm run test:cov` | Pruebas con cobertura (umbral del 80 %; actual 98 %) |

## Documentación

- [Funcionalidades en detalle](docs/funcionalidades.md)
- [Guía de estilo](docs/guia-de-estilo.md)
- [Accesibilidad](docs/accesibilidad.md)
- [Despliegue de la demo](docs/despliegue.md)

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
