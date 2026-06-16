# Arquitectura — FinTrack

Documento técnico de referencia. FinTrack es una app web de presupuesto personal para
República Dominicana, **en producción** (rama `main`, desplegada en Vercel). Push a
`main` despliega; las migraciones SQL en `supabase/` se corren a mano en Supabase.

## Stack

Vite 8 + React 19, React Router 7, Zustand 5 (persist), Supabase (Postgres + Auth +
RLS), Recharts, Framer Motion, Material Symbols (íconos UI), JoyPixels v10 vía
emoji-toolkit (emojis de categoría), react-hot-toast.

Tailwind v4 vía `@tailwindcss/vite`; la config vive en CSS con `@theme` dentro de
`src/stitch/stitch.css` (NO hay `tailwind.config.js`). Cuidado: los tokens de spacing
(sm/md/lg/xl) hacen que utilidades de ancho homónimas (`max-w-md`, `max-w-xl`)
resuelvan a 8–40px; usar valores arbitrarios `max-w-[Nrem]` en su lugar.

## Estructura

`src/main.jsx` monta `src/stitch/StitchApp.jsx`. Toda la UI vive en `src/stitch/`:

- `StitchApp.jsx` — raíz: auth gate, fetches de stores, rutas protegidas, keep-alive,
  materialización de recurrentes.
- `StitchShell.jsx` — sidebar + header + outlet; monta el `TourProvider` y el
  auto-arranque del tutorial.
- `screens/` — una pantalla por ruta. Las pantallas con sub-componentes usan el patrón
  "shell delgado + carpeta `screens/<página>/`": la pantalla raíz orquesta (header +
  grid + estado de modales + toast Deshacer) y delega en sub-componentes + selectores
  PUROS testeables (`selectors.js` + `selectors.test.js`) + un `Ui.jsx` local con
  Modal/Field/FormActions. Ejemplos de referencia: `screens/cards/`, `screens/debts/`,
  `screens/vaults/`, `screens/dashboard/`, `screens/calendar/`,
  `screens/budget/`.
- `stores/` — estado global Zustand, uno por dominio.
- `utils/` — cálculos financieros, formato, ciclos de tarjeta, constantes.
- `data/` — categorías por defecto (RD) + autocategorización + catálogo de tarjetas.
- `lib/` — cliente de Supabase. `contexts/` — AuthContext.

## Componentes reutilizables clave

- `Emoji.jsx` — `<Emoji e="🏠" size={18} />`. Resuelve el codepoint con emoji-toolkit
  y sirve el PNG de JoyPixels desde el mirror `cdn.jsdelivr.net/gh/joypixels/...`
  (el path oficial está tras licencia). Fallback al emoji nativo.
- `DropdownPanel.jsx` — panel flotante compartido en PORTAL a `document.body`
  (position:fixed). Flip/align inteligente, no recorta dentro de modales. Lleva la
  clase `stitch-scroll` para que el scrollbar del tema lo alcance fuera de
  `.stitch-root`.
- `StitchSelect.jsx` / `StitchCategorySelect.jsx` — selects custom (reemplazan
  `<select>` nativo). El de categoría trae `<Emoji>` por opción + buscador fijo.
- `StitchDatePicker.jsx` — calendario custom (reemplaza `<input type=date>`). ISO local
  sin corrimiento UTC.
- `StitchCurrencyInput.jsx` — input de moneda con formateo de miles en vivo.
- `tour/` — sistema de tutorial guiado (ver sección dedicada).

## Sistema de tutorial guiado (product tour)

Tour con spotlight propio en `src/stitch/tour/`:
- `tourSteps.js` — guión declarativo. **8 pasos** enfocados en el núcleo: bienvenida,
  menú, registrar dinero (la categoría define el tipo), presupuesto por niveles, cuánto
  puedes gastar (integración sin duplicar), Mis finanzas (patrimonio unificado), todo
  conectado, cierre.
- `TourProvider.jsx` — orquesta paso actual, navegación entre rutas, persistencia de
  "ya visto", y "forzar demo" para usuarios sin datos (lo revierte al cerrar).
- `Spotlight.jsx` — capa visual en portal: oscurece la pantalla y deja un hueco
  iluminado sobre la `anchor` del paso, con globo de explicación. Anima con spring;
  respeta reduced-motion. Teclado: Esc=saltar, →/Enter=siguiente, ←=atrás.
- `useTour.js` — hook de acceso al contexto.

Anclas: cada paso apunta a un `[data-tour="..."]` que vive en la pantalla
correspondiente. Auto-arranque la 1ª vez (cuando `tutorialSeen === false` y
`prefsLoaded === true`, con delay de 700ms). Accesible siempre desde el menú de cuenta
→ "Ver tutorial". El flag `tutorial_seen` se persiste en la tabla `profiles` (Supabase)
con sesión, y en caché local en demo.

## Modo demo / QA

Flag sessionStorage `fintrack-demo-mode`, solo en localhost. Botón "Entrar como demo"
en `StitchAuth`. Siembra los stores Zustand en memoria sin tocar Supabase. Como en demo
NO hay sesión, las acciones de los stores (que escriben al backend) no surten efecto;
por eso `src/stitch/demoMode.js` expone mutadores en memoria por entidad
(`demoAddTransaction`, `demoAddCard`, etc.). **Toda página con alta/edición/borrado DEBE
ramificar** `if (isDemoActive()) demoXxx(); else await storeAction();` y mostrar el toast
manualmente en demo.

## PAUTAS DE DISEÑO Y LÓGICA — aplicar en TODAS las páginas sin excepción

1. Emojis: SIEMPRE `<Emoji e={...} size={n} />` (JoyPixels v10), nunca el emoji nativo
   crudo en el render. No usar emojis dentro de `<option>` nativo; usar
   StitchSelect/StitchCategorySelect.
2. Selects: nunca `<select>` nativo. Usar `StitchSelect` (genérico) o
   `StitchCategorySelect` (con emoji+buscador). Variante `compact` en barras de filtro
   (h-[34px]); variante normal en formularios.
3. Fechas: nunca `<input type=date>` nativo. Usar `StitchDatePicker`. Trabajar siempre
   en ISO local 'YYYY-MM-DD'; nunca toISOString (corre el día en GMT-4).
4. Montos de entrada: SIEMPRE `StitchCurrencyInput` (formateo de miles en vivo). Para
   mostrar montos: `formatCurrency` de utils/formatters.
5. Dropdowns/popovers: todos via `DropdownPanel` (portal, no recortan, flip/align). Si
   un panel tiene zona fija + zona scrollable (buscador), usar `scroll={false}` y
   gestionar el scroll solo en la lista interna. NUNCA permitir que un dropdown genere
   scroll en la página o cree su propia barra externa.
6. Scroll: el scrollbar del tema es global; no introducir scrollbars nativos blancos.
   Cualquier contenido renderizado en PORTAL (fuera de `.stitch-root`) DEBE llevar la
   clase `stitch-scroll`. Nunca scroll horizontal en dropdowns.
7. Animación (filosofía Emil Kowalski): ease-out `cubic-bezier(0.23,1,0.32,1)`
   (constante `EASE_OUT`), duraciones <300ms (paneles 0.16s), entrada con scale desde
   0.96 (nunca 0), origin-aware, press scale(0.97) en botones (global en CSS), respetar
   `prefers-reduced-motion` (usar `useReducedMotion`). No animar acciones de alta
   frecuencia.
8. Íconos: Material Symbols vía `<MS name="..." />`. Forzar tamaño con `!text-[Npx]`
   cuando la fuente los agrande de más. Mantener simetría de tamaño entre íconos
   adyacentes.
9. Tipografía/colores: usar tokens del tema (text-on-surface, text-text-muted,
   text-primary periwinkle, etc.). Chips/badges pequeños y discretos (8–10px). Un
   control con value vacío (placeholder/"Todos…") se muestra atenuado (text-text-muted).
10. Consistencia de altura: en barras de filtro todos los controles comparten altura
    (h-[34px]). En formularios, el ancho/alto de los campos de una misma fila coincide.
11. Idioma: TODO en español (UI, labels, toasts). Sentence-case en copy, sin em dashes.
12. Tipo de transacción: se DERIVA de la categoría (cat.type:
    income/fixed_expense/variable_expense/savings). No pedirlo a mano. El motor de
    presupuesto base-cero separa fixed_expense de variable_expense (ver
    `src/utils/calculations.js`).
13. Modo demo: toda página con alta/edición/borrado DEBE funcionar en demo vía
    mutadores en memoria de demoMode.js + toast manual.
14. Checkboxes: clase `.stitch-check` (caja oscura, check periwinkle), nunca el checkbox
    blanco nativo.

## Lógica de negocio y datos

La lógica financiera está implementada en `src/utils/` y los stores, con columnas
reales en Supabase. Los specs en `docs/specs/` describen esa lógica (presupuesto base
cero, sobres acumulativos, tarjetas, abonos parciales, cashback, niveles progresivos);
léelos por la LÓGICA y el modelo de datos. Estado de cada feature: `docs/specs/README.md`.

Migraciones SQL: `supabase/schema.sql` es la fuente de verdad (idempotente). El orden y
las notas de migración para bases existentes están en `supabase/MIGRATIONS.md`. Los
scripts de un solo uso (diagnóstico/ajustes personales) están archivados en
`supabase/scratch/`.

## Pendientes conocidos

- **Sobres acumulativos (sinking funds)** en Presupuesto base cero: la lógica
  (`getAccumulatedBalance`, columnas `is_accumulative`/`accumulation_start`) ya existe;
  falta exponer el mini-modal por categoría en `screens/budget/BudgetZero.jsx`. Ver
  `docs/specs/2026-05-29-sobres-acumulativos-design.md`.

## Verificación

`npm run lint` (0 errores), `npm run build` (limpio), `npm run test` (todos verdes).
Confirmar que el dev server sirve la app en http://localhost:5173.
