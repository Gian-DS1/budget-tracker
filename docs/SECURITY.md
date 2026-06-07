# Seguridad — FinTrack

Resumen de las medidas de seguridad de la app y decisiones de diseño. Útil para
auditorías y para entender por qué ciertas configuraciones son intencionales.

## Cabeceras HTTP (vercel.json)

Aplicadas en el edge de Vercel a todas las respuestas:

| Cabecera | Valor | Propósito |
|----------|-------|-----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS |
| `X-Frame-Options` | `DENY` | Anti-clickjacking (legacy) |
| `Content-Security-Policy` | ver abajo | Restringe orígenes de recursos |
| `X-Content-Type-Options` | `nosniff` | Evita MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita fuga de referrer |
| `Permissions-Policy` | cámara/mic/geo/payment/usb/cohort deshabilitados | Restringe APIs del navegador |
| `Cross-Origin-Opener-Policy` | `same-origin` | Aísla el contexto de navegación |
| `Cross-Origin-Resource-Policy` | `same-origin` | Evita que otros orígenes lean recursos |
| `Access-Control-Allow-Origin` | el propio dominio (no `*`) | CORS no abierto |

### Cache
- **HTML / rutas SPA**: `no-store, no-cache, must-revalidate`. Las páginas de
  autenticación y los datos sensibles nunca se cachean en navegador ni proxies.
- **`/assets/*`** (JS/CSS con hash de contenido): `public, max-age=31536000, immutable`.
  Seguro porque el hash cambia si cambia el contenido.

### CSP — nota sobre `'unsafe-inline'` en estilos (INTENCIONAL)
`script-src` es estricto (`'self'`, **sin** `'unsafe-inline'`) — este es el vector
de XSS importante y está cerrado.

`style-src` mantiene `'unsafe-inline'` a propósito. Eliminarlo no es viable en
este SPA estático:
- `react-hot-toast` usa **goober** (CSS-in-JS), que inyecta un `<style>` en runtime.
- 30+ componentes usan atributos `style=` (React + framer-motion + recharts), que
  no admiten nonce.
- Generar nonces por request requeriría SSR; la app es estática en Vercel.

El riesgo residual es bajo: el CSS no ejecuta JavaScript. Si en el futuro se migra
a SSR o se elimina goober, se puede endurecer `style-src-elem`.

## Datos (Supabase)
- **Row Level Security activado** en todas las tablas (`supabase/schema.sql`), con
  política "solo mis filas" (`auth.uid() = user_id`) para usuarios autenticados.
- El rol `anon` no tiene privilegios sobre las tablas de datos.
- El cliente usa la **anon key** (pública por diseño); la protección real es RLS.
- Sesión en `sessionStorage` (no persiste tras cerrar el navegador).

## Backend (api/)
- `api/parse-pdf.js`: requiere **Bearer token** válido (verificado contra Supabase),
  limita el tamaño del PDF (~6MB, anti-DoS), sanitiza el texto extraído y devuelve
  **errores genéricos** al cliente (el detalle solo va a los logs del servidor).
- `api/rate.js`: solo `GET`; la API key de TasaReal es server-only (sin prefijo
  `VITE_`), nunca llega al bundle.

## Secretos
- `.env` está en `.gitignore`; solo se versiona `.env.example` (sin valores reales).
- Variables con prefijo `VITE_` se exponen al cliente (solo la URL y anon key de
  Supabase, que son públicas). El resto es server-only.
