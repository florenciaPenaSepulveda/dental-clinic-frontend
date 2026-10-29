# Guía de estilo

Las clases compartidas viven en `src/index.css`; el tema de colores, en `tailwind.config.js`. Cualquier pantalla nueva debe usar estas piezas en lugar de combinaciones propias.

## Tipografía

Fuente Inter. El texto base es `text-sm`.

| Uso | Clase | Tamaño y peso |
|---|---|---|
| Título de página (h1) | `page-title` | 24 px, semibold, color primario |
| Subtítulo de página | `page-subtitle` | 14 px, atenuado |
| Sección de página (h2) | `section-title` | 18 px, semibold |
| Subsección o título de estado vacío | `subsection-title` | 16 px, semibold |
| Título de ventana modal | `modal-title` | 18 px, semibold, color primario |
| Etiqueta de campo | `field-label` | 14 px, medium |
| Error de campo | `field-error` | 12 px, color de error |
| Ayuda, leyendas y notas | `hint` | 12 px, atenuado |

## Botones

El tamaño depende del lugar, no de la importancia.

| Lugar | Tamaño |
|---|---|
| Pie de ventana modal y llamada a la acción principal | normal |
| Envío de formularios de ancho completo | normal, `w-full` |
| Barras de herramientas, paginación y acciones dentro de una sección | `btn-sm` |
| Acciones en filas de tabla y celdas | `btn-xs` con `btn-ghost` |

| Rol | Clases |
|---|---|
| Principal | `btn btn-primary` |
| Secundario | `btn btn-outline btn-primary` |
| Cancelar, cerrar y acciones de tabla | `btn btn-ghost` |
| Destructivo | `btn btn-ghost btn-danger` |

Las acciones de una fila van dentro de `row-actions`, con ancho fijo por botón para que queden alineadas en todas las filas.

## Campos de formulario

Los campos de formularios y ventanas modales tienen tamaño normal. Solo los filtros de una barra de herramientas usan `-sm`, junto a botones `btn-sm`.

## Fechas

DD/MM/AAAA en todo el sistema, con `formatFecha`. La fecha larga con día de la semana (`formatFechaLarga`) se usa solo en el detalle de una reserva y en el mensaje de confirmación. Los campos de fecha usan `DateField`.

## Color

Solo colores del tema (`primary`, `neutral`, `success`, `warning`, `error`, `info` y las bases). No se usan colores sueltos de Tailwind.

## Ayuda contextual

Los campos que necesitan una explicación llevan un `?` junto a la etiqueta (`HelpTip`, o la prop `help` de `Field` y `DateField`): al pasar el mouse o enfocarlo con el teclado muestra el texto, y los lectores de pantalla lo leen como descripción. Las secciones con reglas más largas tienen un `?` (`HelpButton`) junto al título que abre una ventana con la explicación completa, como `AyudaGenerarModal`.
