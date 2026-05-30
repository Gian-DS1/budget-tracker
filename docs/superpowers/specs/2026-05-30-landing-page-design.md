# Landing Page — FinTrack RD — Design Spec

> Estado: **diseño APROBADO por el usuario** (2026-05-30). Pendiente de implementar.
> Sesión pausada por costo. Retomar en sesión nueva: leer este spec y construir.

## Objetivo
Landing page moderna y animada para FinTrack RD (app de finanzas personales, RD),
que comunique "controla tu dinero y crece financieramente" y lleve al registro.

## Decisiones aprobadas (del brainstorming)
1. **Dónde vive:** integrada en la app como página **pública** para visitantes NO
   logueados. La raíz `/` muestra la LandingPage; los CTA llevan al flujo de auth
   existente. Mantener intacto el flujo de recuperación de contraseña
   (`isRecoveringPassword` sigue mostrando `AuthPage`).
2. **Alcance:** **completa** (multi-sección, estilo fintech profesional).
3. **Animaciones:** **Framer Motion** (instalar dep; verificar compat con React 19;
   si hay conflicto de peers, caer a CSS + IntersectionObserver y avisar).
4. **CTA:** "Crear cuenta / Iniciar sesión" → flujo de auth actual. Copy en
   **español**, presentar la app como **gratis y en beta**.

## Enfoque técnico
- **Routing (App.jsx):** para `!user && !isRecoveringPassword`, renderizar:
  - `/` → `LandingPage`
  - `*` → `AuthPage` (los CTA navegan a `/login` u otra ruta != "/")
  - Si `isRecoveringPassword` → seguir mostrando `AuthPage` en todo path.
- **Archivos propios (fácil de revertir):**
  - `src/pages/LandingPage.jsx` (compone las secciones)
  - `src/components/landing/*` (Navbar, Hero, ValueBar, Features, HowItWorks,
    Showcase, HealthScore, FinalCTA, Footer)
  - `src/styles/landing.css` (estilos dedicados; NO tocar `index.css`)
- **Estilo:** coherente con la marca — fondo oscuro `#0a0e1a`, acento esmeralda
  `#10b981`, tipografía **Inter** (ya cargada en index.html), glassmorphism, glows
  con gradiente. La landing es **dark por sí misma** (no depende del toggle de tema).
- **Responsive**, mobile-first. Respetar `prefers-reduced-motion`.
- **Accesibilidad:** contraste AA, foco visible, labels en botones/íconos (Lucide,
  no emojis como íconos estructurales), jerarquía de headings correcta.

## Secciones (orden vertical)
1. **Navbar** sticky (translúcida → sólida al hacer scroll): logo "FinTrack RD",
   enlaces ancla (Funciones, Cómo funciona), "Iniciar sesión" + botón "Crear cuenta".
2. **Hero:** titular potente ("Toma el control de tu dinero y crece financieramente"),
   subtítulo, badge "Gratis · En beta", CTA principal "Crear cuenta gratis" +
   secundario "Ver cómo funciona". Mockup animado del dashboard (tarjeta "Puedes
   gastar" + KPIs + mini-gráfico) flotando, con orbes de gradiente animados de fondo.
3. **Barra de valor:** chips — Base cero · RD$/US$ · Cashback de tarjetas · 100% en la nube.
4. **Funciones** (grid de 6, íconos Lucide, revelado escalonado al scroll):
   Presupuesto base cero · Transacciones + recurrentes · Tarjetas (ciclos + cashback)
   · Deudas (avalancha/bola de nieve) · Metas de ahorro · Reportes inteligentes.
5. **Cómo funciona** (3 pasos): Registra → Asigna (base cero) → Crece.
6. **Showcase:** bloque visual más grande (calendario/reportes) con narrativa de beneficio.
7. **Salud financiera:** destaca el score 0–100 con un visual tipo medidor
   ("tu salud financiera en un número") — conecta con la feature real ya implementada.
8. **CTA final:** banda con "Empieza hoy, gratis" + botón.
9. **Footer:** logo, enlaces, "Hecho en RD 🇩🇴", copyright.

## Animaciones (Framer Motion + CSS)
Entrada del hero escalonada; `whileInView` para revelar secciones al scroll; hover
con leve escala (0.95–1.05) en tarjetas/botones; mockup flotante; orbes de gradiente;
conteo animado de números. Duraciones 150–300ms micro / ≤400ms transiciones.
Respetar `prefers-reduced-motion`.

## Verificación al terminar
`npm run lint`, `npm run build` (y `npm run test -- --run` si se toca lógica).
Probar en navegador a 375px y desktop. Revert del rediseño visual = archivos propios.

## Notas de contexto del proyecto (para la sesión nueva)
- React 19 + Vite 8 (Rolldown), Zustand, Supabase, react-router v7.
- Tipografía ya migrada a Inter (UI) + JetBrains Mono tabular (montos).
- Tema oscuro `#0a0e1a`, acento `#10b981`, glassmorphism; design tokens en `src/index.css`.
- Feature real "Salud financiera" (score 0–100) ya existe en Reportes
  (`getFinancialHealthScore` en `src/utils/calculations.js`).
- `git` es de solo lectura para el asistente: el usuario hace commits/push.
