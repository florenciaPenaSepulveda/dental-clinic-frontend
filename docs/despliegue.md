# Despliegue de la demostración

La demo se publica como *Static Site* en el plan gratuito de Render, junto con el backend (ver su documentación de despliegue). Muestra un aviso fijo arriba que indica que los datos son ficticios; el aviso solo aparece si se compila con `VITE_DEMO=true`, así que el desarrollo local y un despliegue real no lo muestran.

Los datos de la demo **se reinician**: el backend usa SQLite y el plan gratuito de Render borra el disco cuando el servicio se duerme (tras unos 15 minutos sin uso) o se redespliega. Es intencional: cada arranque carga de nuevo los datos de demostración, así que cualquier persona que pruebe la aplicación la encuentra ordenada. La primera visita tras un periodo de inactividad puede tardar hasta un minuto mientras el servidor despierta.

| Campo en Render | Valor |
|---|---|
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| `NODE_VERSION` | `24` |
| `VITE_API_URL` | `https://<tu-backend>.onrender.com/agenda` (sin `/` final) |
| `VITE_DEMO` | `true` |
| Rewrite | `/*` → `/index.html` (la aplicación es una SPA) |
