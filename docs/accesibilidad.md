# Accesibilidad

Objetivo: cumplir **WCAG 2.1 nivel AA** en todas las páginas, sin romper la interfaz ni los 157 tests existentes.

## Cómo se mide

| Qué | Cómo | Dónde |
| --- | --- | --- |
| Reglas de accesibilidad (etiquetas, roles, nombres, tablas…) | [axe-core](https://github.com/dequelabs/axe-core) sobre las 9 rutas de la app, con etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `best-practice` | [src/test/a11y.test.tsx](../src/test/a11y.test.tsx), corre con `npm test` |
| Comportamiento (título y foco al navegar, nombre del modal) | Tests con Testing Library | mismo archivo |
| Contraste de color | Cálculo de la razón de contraste WCAG con los colores del tema (`tailwind.config.js`) | tabla de abajo |

axe en jsdom no puede medir contraste (no hay layout ni estilos calculados), por eso la regla `color-contrast` está desactivada ahí y el contraste se calculó aparte.

## Antes y después

| Hallazgo | Antes | Después |
| --- | --- | --- |
| Cabeceras de tabla vacías (Pacientes, Equipo): un lector de pantalla leía una columna sin nombre | 2 violaciones axe | Cabecera "Acciones" visible solo para lectores de pantalla |
| Pie de página y textos secundarios (`base-content/60`) sobre blanco | 4.06 : 1 ❌ | 5.53 : 1 ✅ (se usa `/70`) |
| Enlaces del menú inactivos (`primary-content/80` sobre el primario) | 4.12 : 1 ❌ | 5.47 : 1 ✅ (blanco pleno) |
| Enlace del menú activo (fondo más claro) | 4.09 : 1 ❌ | 7.58 : 1 ✅ (fondo más oscuro en vez de más claro) |
| Modal sin nombre accesible | `<dialog>` sin etiqueta | `aria-labelledby` apuntando al título (`useId`) |
| Indicador de carga no anunciado | sin rol | `role="status"` y el spinner decorativo con `aria-hidden` |
| Cambio de página en la SPA: el título de la pestaña no cambiaba y el foco quedaba en el enlace pulsado | sin gestión | `document.title` por ruta y foco al `<main>` tras navegar |

Mínimo exigido por WCAG AA para texto normal: **4.5 : 1**.

## Qué ya estaba bien

- Enlace "Saltar al contenido" y `<main id="contenido">`.
- Campos con `<label>`, `autoComplete` correcto en el login.
- Errores con `role="alert"` y avisos con `role="status"`.
- Modales con `<dialog>` nativo: atrapa el foco, cierra con Esc y devuelve el foco al elemento que lo abrió, sin librerías.

## Verificación en un navegador real

Sobre la versión compilada (`npm run build` + `vite preview`) con Chrome:

| Prueba | Resultado |
| --- | --- |
| Lighthouse, categoría Accesibilidad (Inicio, Reservar, Ingresar, Activar cuenta) | **100 / 100** en las cuatro, con el contraste medido en el navegador |
| Reflow a 320 px (equivale a 400 % de zoom) y 640 px (200 %), WCAG 1.4.10 | Sin scroll horizontal (0 px de desborde) en las cuatro |
| Tamaño de objetivos (WCAG 2.2, 2.5.8: mínimo 24 × 24 px) | Todo cumple, salvo dos enlaces de 17 px de alto dentro de una frase ("Actívala aquí", "Ingresar"), que la norma exime por ser enlaces en línea |

Las páginas que requieren sesión (Agenda, Pacientes, Equipo, Mi cuenta, Mi historial) no se auditaron con Lighthouse porque necesitan la API en marcha; están cubiertas por axe-core (arriba) y por la corrección de contraste, que es global.

## Qué no se verificó (y por tanto no se afirma)

- Prueba con un lector de pantalla real (NVDA/VoiceOver): las pruebas automáticas solo detectan una parte de los problemas, y esto exige una persona escuchando la interfaz.
- Los errores de formulario no están asociados a su campo con `aria-describedby` / `aria-invalid`; se anuncian por `role="alert"`, pero no se enlazan al input.

## Cómo repetirlo

```bash
npm test                # incluye la auditoría axe de las 9 rutas
```
