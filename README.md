# Clínica Dental · Frontend

Interfaz web de una clínica dental para reservar horas, ver la agenda del día y administrar pacientes. Consume la API REST del backend y está construida con React, Vite, TypeScript, Tailwind CSS y daisyUI.

## Repositorios del proyecto

| Repositorio | Descripción |
|---|---|
| [dental-clinic-backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend) | API REST de agenda y reservas (necesaria para usar la interfaz) |
| **dental-clinic-frontend** (este) | Interfaz web |

## Funcionalidades

- **Inicio:** dentistas y servicios con sus precios.
- **Reservar hora:** elige dentista, servicio y fecha; los horarios se muestran en verde (disponible), ámbar (solo sobrecupo) o gris (completo). Permite reservar para un paciente existente o registrar uno nuevo en el mismo paso.
- **Agenda:** reservas del día filtradas por dentista, cancelación de reservas y generación de horarios en bloques de 30 minutos.
- **Pacientes:** registro, búsqueda, edición y eliminación, con validación de RUT.

## Requisitos

- Node.js 24 LTS (ver `.nvmrc`)
- El backend en ejecución (ver el README de [dental-clinic-backend](https://github.com/florenciaPenaSepulveda/dental-clinic-backend)):

  ```
  python manage.py migrate
  python manage.py seed_data --generate-slots 7
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
src/pages/        Inicio, Reservar hora, Agenda y Pacientes
```

## Autoría

Proyecto académico desarrollado en equipo; esta versión forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda).
