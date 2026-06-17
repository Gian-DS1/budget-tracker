# Security — FinTrack

A summary of the app's security measures and design decisions. Useful for audits
and for understanding why certain configurations are intentional.

## HTTP headers (vercel.json)

Applied at the Vercel edge to every response:

| Header | Value | Purpose |
|----------|-------|-----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS |
| `X-Frame-Options` | `DENY` | Anti-clickjacking (legacy) |
| `Content-Security-Policy` | see below | Restricts resource origins |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | camera/mic/geo/payment/usb/cohort disabled | Restricts browser APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents other origins from reading resources |
| `Access-Control-Allow-Origin` | the app's own domain (not `*`) | CORS not wide open |

### Cache
- **HTML / SPA routes**: `no-store, no-cache, must-revalidate`. Authentication
  pages and sensitive data are never cached in the browser or proxies.
- **`/assets/*`** (JS/CSS with content hashes): `public, max-age=31536000, immutable`.
  Safe because the hash changes whenever the content changes.

### CSP — note on `'unsafe-inline'` in styles (INTENTIONAL)
`script-src` is strict (`'self'`, **without** `'unsafe-inline'`) — this is the
important XSS vector and it is closed.

`style-src` keeps `'unsafe-inline'` on purpose. Removing it is not viable in this
static SPA:
- `react-hot-toast` uses **goober** (CSS-in-JS), which injects a `<style>` at runtime.
- 30+ components use `style=` attributes (React + framer-motion + recharts), which
  do not accept a nonce.
- Generating per-request nonces would require SSR; the app is static on Vercel.

The residual risk is low: CSS does not execute JavaScript. If the app later moves
to SSR or removes goober, `style-src-elem` can be hardened.

## Data (Supabase)
- **Row Level Security enabled** on every table (`supabase/schema.sql`), with a
  "only my rows" policy (`auth.uid() = user_id`) for authenticated users.
- The `anon` role has no privileges over the data tables.
- The client uses the **anon key** (public by design); the real protection is RLS.
- Session in `sessionStorage` (does not persist after the browser is closed).

## Backend (api/)
- `api/parse-pdf.js`: requires a valid **Bearer token** (verified against Supabase),
  limits the PDF size (~6MB, anti-DoS), sanitizes the extracted text, and returns
  **generic errors** to the client (the detail only goes to the server logs).

## Secrets
- `.env` is in `.gitignore`; only `.env.example` is versioned (without real values).
- Variables with the `VITE_` prefix are exposed to the client (only the Supabase URL
  and anon key, which are public). Everything else is server-only.

## Google sign-in — branding on the consent screen

When signing in with Google, the consent screen used to show Supabase's raw
subdomain (`<ref>.supabase.co`) instead of the app's brand. This is NOT fixed in
the code (`signInWithOAuth` in `src/contexts/AuthContext.jsx` only controls the
`redirectTo` on the way back). It is configured in the Google Cloud Console.

### Show "FinTrack" + logo (free, no custom domain)
1. [console.cloud.google.com](https://console.cloud.google.com) → select the
   project where the OAuth credentials live (the one with the Client ID configured
   in Supabase → Authentication → Providers → Google).
2. **APIs & Services → OAuth consent screen → Branding**:
   - App name: `FinTrack`
   - User support email + Developer contact email
   - App logo: upload the logo (square, ≤1MB) — optional
   - Authorized domains: `vercel.app` (or your own domain once you have one)
3. Save. The screen now reads "FinTrack wants to access…".

**Notes:**
- The **name** change applies immediately and does not require verification with the
  basic login scope (email/profile).
- Uploading a **logo** can trigger Google verification (days/weeks). The name alone
  usually goes through directly.
- In "Testing" mode there is no verification but it is limited to 100 users;
  "Production" with basic scopes normally goes through directly.

### Show your own domain in the callback (requires a custom domain + payment)
To make `auth.yourdomain.do` appear instead of `<ref>.supabase.co`:
1. Register your own domain.
2. Supabase → Custom Domains (paid add-on, ~$10/mo): add `auth.yourdomain.do`
   and configure the CNAME in DNS.
3. Update the callback in the Google Cloud Console to
   `https://auth.yourdomain.do/auth/v1/callback`.

> Note: with the free `*.vercel.app` subdomain this is not possible (you do not
> control `vercel.app`'s DNS). Pending until a custom domain is registered.
