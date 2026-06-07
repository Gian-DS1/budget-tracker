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

## Login con Google — marca en la pantalla de consentimiento

Al iniciar sesión con Google, la pantalla de consentimiento mostraba el subdominio
crudo de Supabase (`<ref>.supabase.co`) en vez de la marca de la app. Esto NO se
arregla en el código (`signInWithOAuth` en `src/contexts/AuthContext.jsx` solo
controla el `redirectTo` de vuelta). Se configura en Google Cloud Console.

### Mostrar "FinTrack" + logo (gratis, sin dominio propio)
1. [console.cloud.google.com](https://console.cloud.google.com) → seleccionar el
   proyecto donde están las credenciales OAuth (el del Client ID configurado en
   Supabase → Authentication → Providers → Google).
2. **APIs & Services → OAuth consent screen → Branding**:
   - App name: `FinTrack`
   - User support email + Developer contact email
   - App logo: subir el logo (cuadrado, ≤1MB) — opcional
   - Authorized domains: `vercel.app` (o el dominio propio cuando exista)
3. Guardar. La pantalla pasa a decir "FinTrack quiere acceder…".

**Notas:**
- El cambio de **nombre** aplica de inmediato y no requiere verificación con el
  scope básico de login (email/perfil).
- Subir **logo** puede disparar la verificación de Google (días/semanas). El nombre
  solo suele ir directo.
- En modo "Testing" no hay verificación pero limita a 100 usuarios; "Production"
  con scopes básicos normalmente va directo.

### Mostrar tu propio dominio en el callback (requiere dominio propio + pago)
Para que aparezca `auth.tudominio.do` en vez de `<ref>.supabase.co`:
1. Registrar un dominio propio.
2. Supabase → Custom Domains (add-on de pago, ~$10/mes): agregar `auth.tudominio.do`
   y configurar el CNAME en DNS.
3. Actualizar el callback en Google Cloud Console a
   `https://auth.tudominio.do/auth/v1/callback`.

> Nota: con el subdominio gratuito `*.vercel.app` esto no es posible (no controlas
> el DNS de `vercel.app`). Pendiente para cuando se registre un dominio propio.
