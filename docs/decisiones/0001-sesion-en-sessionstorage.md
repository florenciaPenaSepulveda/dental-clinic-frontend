# 0001 · El token de sesión vive en `sessionStorage`

<!-- REVISAR (Florencia): el "Por qué" está deducido del código. Ajústalo con lo que realmente pensaste. -->

**Estado:** aceptada

## Contexto

La app es una SPA que habla con una API REST (Django) usando un token en la cabecera `Authorization`. Hay que guardar ese token en el navegador entre recargas de página. Se usa en una clínica: es muy probable que se inicie sesión en computadores compartidos (recepción) y que pacientes entren desde equipos ajenos.

## Decisión

Guardar la sesión en `sessionStorage` ([src/lib/session.ts](../../src/lib/session.ts)), no en `localStorage` ni en una cookie.

## Por qué

- La sesión muere al cerrar la pestaña: en un computador compartido nadie hereda la sesión del turno anterior.
- Sobrevive a recargas de la misma pestaña, así que no hay que volver a ingresar al refrescar.
- No requiere configurar cookies `SameSite`/CSRF en la API.

## Qué se pierde (tradeoff)

- No hay "mantener sesión iniciada": si se cierra la pestaña hay que ingresar de nuevo. Se prefirió seguridad sobre comodidad.
- Un script inyectado (XSS) podría leer el token, lo mismo que con `localStorage`. Una cookie `HttpOnly` lo evitaría, pero obliga a manejar CSRF y a servir front y API bajo el mismo sitio. La mitigación actual es no renderizar HTML crudo (React escapa por defecto).
- La sesión no se comparte entre pestañas.

## Alternativas descartadas

| Alternativa | Por qué no |
| --- | --- |
| `localStorage` | La sesión sobrevive al cierre del navegador: riesgo en equipos compartidos |
| Cookie `HttpOnly` | Mejor frente a XSS, pero exige CSRF y mismo sitio para front y API |
