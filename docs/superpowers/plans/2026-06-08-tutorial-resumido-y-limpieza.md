# Tutorial resumido (7 pasos) + limpieza del proyecto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir el tour guiado de FinTrack de 17 a 7 pasos enfocados en el núcleo (flujo del dinero + niveles de presupuesto), y dejar el proyecto limpio (documentación al día, sin código basura ni nits, scripts SQL de un solo uso archivados).

**Architecture:** El tour es declarativo: `src/stitch/tour/tourSteps.js` define los pasos y el motor (`TourProvider.jsx` + `Spotlight.jsx`) los renderiza navegando a `route`, esperando la `anchor` (`[data-tour="..."]`) e iluminándola. Solo se reescribe el array de pasos; el motor y las anclas del DOM **no se tocan** (todas las anclas usadas ya existen). La limpieza es de documentación (handoff, specs README, memoria) y nits de código quirúrgicos, más un `git mv` de scripts SQL de scratch.

**Tech Stack:** Vite 8 + React 19, React Router 7, Zustand 5, Tailwind v4, Framer Motion, Vitest. Windows + PowerShell. Comandos npm: `lint`, `build`, `test`.

---

## Contexto para quien ejecuta (lee esto primero)

- **Estás en la rama `chore/tutorial-resumido-y-limpieza`.** Verifícalo con `git branch --show-current`. Si no, haz `git checkout chore/tutorial-resumido-y-limpieza`. NO trabajes en `main`.
- El spec aprobado vive en `docs/superpowers/specs/2026-06-08-tutorial-resumido-y-limpieza-design.md`. Este plan lo implementa.
- **Idioma:** todo el copy de la app va en español, sentence-case, sin em dashes (—). Es una pauta dura del proyecto.
- La app es FinTrack, finanzas personales para República Dominicana. Ya está **en producción** en `main` (Vercel). El antiguo `handoff.md` dice lo contrario (que es una rama que no debe subir): eso es justo lo que este plan corrige.
- **No existe driver de navegador** para clics/hover automatizados. La verificación es: lint + build + test verdes, y el dev server sirviendo 200. La validación visual del tour queda para QA manual.
- Commits frecuentes, uno por tarea. Mensajes en español. Termina cada mensaje de commit con:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **No hagas push ni merge** a ningún remoto salvo orden explícita del usuario.

### Verificación base (corre esto ANTES de empezar, para conocer el punto de partida)

Run: `npm run lint`
Expected: termina sin listar errores (solo imprime el banner `> budget-tracker@0.0.0 lint` y `> eslint .`).

Run: `npm run test`
Expected: PASS, 126 tests (o más). Anota el número exacto que veas; al final debe ser el mismo.

Run: `npm run build`
Expected: build limpio, sin errores.

---

## Task 1: Reescribir el guión del tour (17 → 7 pasos)

**Files:**
- Modify (reemplazo total del array): `src/stitch/tour/tourSteps.js`

Contexto: el archivo exporta `export const TOUR_STEPS = [ ... ]`. Cada paso es un objeto con
`{ id, route, anchor, placement, padding?, title, body }`. `anchor: null` + `placement: 'center'`
muestra el globo centrado (sin recorte). Las anclas que usamos ya existen en el DOM (verificado):
`[data-tour="nav"]` (StitchShell), `[data-tour="ledger-new"]` (StitchLedger),
`[data-tour="budget-mode"]` (budget/BudgetShell), `[data-tour="budget-summary"]` (budget/BudgetZero),
`[data-tour="dashboard-grid"]` (StitchDashboard).

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Sustituye TODO el contenido de `src/stitch/tour/tourSteps.js` por exactamente esto:

```javascript
// Guión del tutorial guiado (product tour) de FinTrack.
//
// Cada paso es declarativo. El TourProvider navega a `route` (si difiere de la
// ruta actual), espera a que `anchor` exista en el DOM y el Spotlight lo ilumina
// mostrando el globo con `title` + `body`. Si `anchor` es null o no aparece, el
// paso se muestra centrado (sin recorte), útil para la intro y el cierre.
//
// `placement`: dónde se coloca el globo respecto al elemento iluminado
//   'top' | 'bottom' | 'left' | 'right' | 'center'. El Spotlight ajusta si no
//   cabe (clamp a viewport).
// `padding`: holgura (px) del halo alrededor del elemento. Default 8.
//
// Diseño del guión: 7 pasos, enfocados en el NÚCLEO (lo más difícil de entender):
// el flujo del dinero (transacciones → la categoría define el tipo) y los niveles
// de presupuesto. El patrimonio y las herramientas se mencionan de pasada; el
// usuario los descubre solo. Lenguaje: español sencillo, sentence-case, sin em
// dashes. Qué es · para qué sirve · cómo.

export const TOUR_STEPS = [
  // ── 1. Bienvenida ────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Bienvenido a FinTrack! 👋',
    body: 'Te muestro lo esencial en un minuto: cómo registrar tu dinero y cómo organizarlo con un presupuesto. Puedes salir cuando quieras con “Saltar”.',
  },

  // ── 2. Navegación ──────────────────────────────────────────────────────────────
  {
    id: 'nav',
    route: '/',
    anchor: '[data-tour="nav"]',
    placement: 'right',
    padding: 10,
    title: 'Tu menú',
    body: 'Desde aquí llegas a todo, en tres bloques: Principal (tu día a día), Patrimonio (lo que tienes y lo que debes) y Herramientas (calendario, reportes y categorías).',
  },

  // ── 3. Transacciones: el corazón (flujo del dinero) ──────────────────────────
  {
    id: 'ledger',
    route: '/transacciones',
    anchor: '[data-tour="ledger-new"]',
    placement: 'left',
    title: 'Registra tu dinero',
    body: 'Este es el corazón de la app. Con “Nueva transacción” anotas cada ingreso o gasto. No eliges si es ingreso o gasto: lo define la categoría que escojas. Y al escribir la descripción, la app sugiere la categoría sola.',
  },

  // ── 4. Presupuesto por niveles ───────────────────────────────────────────────
  {
    id: 'budget-levels',
    route: '/presupuesto',
    anchor: '[data-tour="budget-mode"]',
    placement: 'bottom',
    title: 'Tu presupuesto, por niveles',
    body: 'Tu presupuesto crece contigo. “Seguimiento” solo observa tus gastos; “50/30/20” reparte tu dinero en necesidades, gustos y ahorro; “Base cero” asigna cada peso a un sobre. Empieza simple y sube de nivel cuando quieras.',
  },

  // ── 5. Cuánto puedes gastar (integración sin duplicar) ───────────────────────
  {
    id: 'budget-spend',
    route: '/presupuesto',
    anchor: '[data-tour="budget-summary"]',
    placement: 'bottom',
    title: 'Cuánto puedes gastar',
    body: 'Aquí ves cuánto tienes comprometido (gastos fijos, ahorro y deudas) y cuánto te queda libre. Lo mejor: tus deudas, tarjetas y metas de ahorro se descuentan solas desde sus módulos, sin que las cuentes dos veces.',
  },

  // ── 6. Todo conectado (cierre conceptual) ────────────────────────────────────
  {
    id: 'connected',
    route: '/',
    anchor: '[data-tour="dashboard-grid"]',
    placement: 'center',
    title: 'Todo conectado',
    body: 'Todo lo que registras se conecta solo. Este resumen, el calendario de vencimientos y los reportes se llenan a partir de tus transacciones. No hay nada más que configurar: explora a tu ritmo.',
  },

  // ── 7. Cierre ────────────────────────────────────────────────────────────────
  {
    id: 'done',
    route: '/',
    anchor: null,
    placement: 'center',
    title: '¡Listo! 🎉',
    body: 'Ya conoces lo esencial. Empieza registrando tus primeros movimientos y arma tu presupuesto. ¿Quieres repetir el tutorial? Está en tu menú de cuenta, arriba a la derecha.',
  },
];
```

- [ ] **Step 2: Verificar que no quedaron referencias a ids de pasos borrados**

Los ids viejos eliminados son: `dashboard`, `ledger-intro`, `ledger-filters`, `ledger-bulk`,
`budget-mode` (como id de paso; el data-tour="budget-mode" SÍ se conserva), `budget-summary`
(idem), `vaults`, `debts`, `cards`, `calendar`, `reports`, `account`.

Run (PowerShell): `Select-String -Path src\stitch\tour\tourSteps.js -Pattern "ledger-intro|ledger-filters|ledger-bulk|'vaults'|'debts'|'cards'|'calendar'|'reports'|'account'"`
Expected: sin resultados (ninguna línea coincide).

Nota: no hace falta buscar fuera de `tourSteps.js`. Los ids de paso solo se usan dentro de este
array y como `key` de React en el Spotlight (que los lee del array). Las anclas `data-tour` en las
pantallas son independientes y NO se tocan.

- [ ] **Step 3: Lint + build para confirmar que el archivo es válido**

Run: `npm run lint`
Expected: sin errores.

Run: `npm run build`
Expected: build limpio.

- [ ] **Step 4: Verificación visual rápida en el dev server (opcional pero recomendado)**

Run (background): `npm run dev`
Luego abre http://localhost:5173. Si tienes sesión limpia (sin datos), el tour arranca solo a los
~0.7s; si no, ábrelo desde el avatar (arriba derecha) → "Ver tutorial". Comprueba que son 7 pasos
("Paso 1 de 7" … "Paso 7 de 7") y que navega entre Resumen, Transacciones y Presupuesto sin
quedarse en negro. Detén el server al terminar.

Si no puedes correr el navegador, omite este step (lint + build + test cubren la regresión).

- [ ] **Step 5: Commit**

```bash
git add src/stitch/tour/tourSteps.js
git commit -m "feat(tutorial): tour de 7 pasos enfocado en el nucleo

Reduce el tour guiado de 17 a 7 pasos: bienvenida, menu, registrar dinero
(la categoria define el tipo), presupuesto por niveles, cuanto puedes gastar
(integracion sin duplicar), todo conectado y cierre. Reusa las anclas
data-tour existentes; el motor del Spotlight no cambia.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Nit de código — ternario inútil en AccountMenu

**Files:**
- Modify: `src/stitch/AccountMenu.jsx` (~línea 90)

Contexto: el botón de cerrar sesión usa `name={demo ? 'logout' : 'logout'}` — ambas ramas
devuelven `'logout'`, así que el ternario no hace nada. El texto sí cambia con `demo` (eso se
queda); solo el `name` del ícono es redundante.

- [ ] **Step 1: Localizar la línea exacta**

Run (PowerShell): `Select-String -Path src\stitch\AccountMenu.jsx -Pattern "demo \? 'logout' : 'logout'"`
Expected: una coincidencia (la línea del `<MS name=... />` dentro del botón de cerrar sesión).

- [ ] **Step 2: Reemplazar el ternario por el valor literal**

Busca esta línea:
```jsx
            <MS name={demo ? 'logout' : 'logout'} className="!text-[18px]" />
```
Reemplázala por:
```jsx
            <MS name="logout" className="!text-[18px]" />
```
(Deja intacta la siguiente línea, `{demo ? 'Salir del demo' : 'Cerrar sesión'}` — ese ternario sí
es real.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/AccountMenu.jsx
git commit -m "refactor(cuenta): elimina ternario redundante en icono de cerrar sesion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Nit de código — indentación inconsistente en usePrefsStore

**Files:**
- Modify: `src/stores/usePrefsStore.js` (~líneas 90-94, bloque de opciones de `persist`)

Contexto: el objeto de opciones del middleware `persist` tiene indentación mezclada (2 y 6
espacios) en `name`, `storage` y `partialize`. Es solo formato; la lógica no cambia.

- [ ] **Step 1: Ver el bloque actual**

Run (PowerShell): `Get-Content src\stores\usePrefsStore.js | Select-Object -Skip 89 -First 6`
Expected: ves el bloque que abre con `name: 'fintrack-prefs-cache',` y dentro `storage:` y
`partialize:` con indentación irregular.

- [ ] **Step 2: Normalizar la indentación**

Busca este bloque (las líneas pueden tener espacios extra; cópialas con cuidado):
```javascript
    {
      name: 'fintrack-prefs-cache',
  storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen }),
    },
```
Reemplázalo por (todo a 6 espacios de indentación, consistente con `name`):
```javascript
    {
      name: 'fintrack-prefs-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen }),
    },
```

- [ ] **Step 3: Lint + test (prefs store tiene impacto en el arranque del tour)**

Run: `npm run lint`
Expected: sin errores.

Run: `npm run test`
Expected: PASS, mismo número de tests que en la verificación base.

- [ ] **Step 4: Commit**

```bash
git add src/stores/usePrefsStore.js
git commit -m "style(prefs): normaliza indentacion del bloque persist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Auditoría de comentarios obsoletos en src/

**Files:**
- Modify: cualquier archivo en `src/` cuyo comentario referencie artefactos ya borrados.

Contexto: tras el rediseño se borraron `src/App.jsx`, `src/pages/*`, `src/components/*`, la rama
`rebuild/stitch-pure`, `usePlanStore`, `StitchStrategy`. Algunos comentarios pueden mencionarlos y
confundir. Esta tarea es de bajo riesgo: solo se editan comentarios, nunca código ejecutable.

- [ ] **Step 1: Buscar comentarios con referencias sospechosas**

Run (PowerShell):
```powershell
Select-String -Path src\**\*.jsx,src\**\*.js -Pattern "rebuild/stitch-pure|src/pages|src/App\.jsx|usePlanStore|StitchStrategy|UI vieja|app vieja"
```
Expected: una lista (posiblemente vacía). Anota cada coincidencia.

- [ ] **Step 2: Evaluar y corregir SOLO comentarios**

Para cada coincidencia:
- Si está dentro de un comentario (`//` o `/* */`) y la referencia ya no aplica, reescríbelo para
  que sea correcto hoy, o bórralo si ya no aporta. Ejemplo: un comentario que diga "replica el flujo
  de src/App.jsx" puede quedar como "flujo de arranque de la app (auth, fetches, rutas)".
- Si la coincidencia está en código ejecutable (un string, un identificador), **NO la toques** en
  esta tarea (no debería haber ninguna; `usePlanStore`/`StitchStrategy` ya no se importan).
- Si la lista del Step 1 está vacía, marca esta tarea como completa sin cambios y pasa a la
  siguiente (no inventes ediciones).

Nota sobre `src/stitch/StitchApp.jsx`: su comentario de cabecera dice "Replica el flujo de
src/App.jsx". Reescríbelo a algo como:
```javascript
// StitchApp — raíz de la app (auth, fetches de stores, rutas protegidas,
// keep-alive, recurrentes) montando el shell + pantallas Stitch.
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit (solo si hubo cambios)**

```bash
git add -A src/
git commit -m "docs(codigo): actualiza comentarios que referencian artefactos borrados

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Si no hubo cambios, omite el commit y continúa.

---

## Task 5: Auditoría de bugs (revisión dirigida, sin refactors gratuitos)

**Files:**
- Solo lectura inicial. Modificar únicamente si se confirma un bug real:
  `src/stitch/tour/TourProvider.jsx`, `src/stitch/StitchShell.jsx`, `src/stores/usePrefsStore.js`.

Contexto: el spec pide auditar bugs/antipatrones pero **sin tocar código que funciona**. El sistema
del tour ya resolvió una carrera con OAuth (documentada en `StitchShell.jsx`). El objetivo aquí es
confirmar que el guión nuevo (Task 1) no reintrodujo problemas y revisar los puntos sensibles.

- [ ] **Step 1: Revisar los puntos sensibles del tour**

Lee y verifica (NO cambies nada todavía):
1. `src/stitch/tour/TourProvider.jsx` — `close()` hace `window.location.reload()` solo si
   `forcedDemoRef.current` es true (demo forzado por el tour para usuarios sin datos). Es
   intencional: recarga limpia los stores sembrados para volver a la cuenta real vacía. **No es un
   bug.** Déjalo.
2. `src/stitch/StitchShell.jsx` — `TourAutoStart` arranca el tour cuando `prefsLoaded === true` y
   `tutorialSeen === false`, con guard `fired` para una sola vez. El comentario explica la carrera
   con OAuth. **No es un bug.** Déjalo.
3. El guión nuevo no añade ids duplicados ni rutas inválidas (las rutas usadas — `/`,
   `/transacciones`, `/presupuesto` — existen en `StitchApp.jsx`). Confírmalo de un vistazo.

- [ ] **Step 2: Búsqueda de antipatrones comunes en src/**

Run (PowerShell):
```powershell
Select-String -Path src\**\*.jsx,src\**\*.js -Pattern "console\.log|console\.debug|console\.info|debugger|TODO|FIXME|XXX"
```
Expected: idealmente sin resultados. Los `console.error` gated tras `import.meta.env.DEV` son
correctos y NO aparecen en esta búsqueda. Si aparece un `console.log`/`debugger`/`TODO` real,
evalúalo: bórralo si es basura de depuración; si es un TODO legítimo, déjalo y anótalo en el reporte
final.

- [ ] **Step 3: Veredicto**

Si NO encontraste bugs reales (lo esperado), esta tarea no produce cambios de código. Anota en el
reporte final: "Auditoría de bugs: sin hallazgos accionables; el reload del demo forzado y la
carrera de prefsLoaded son intencionales y están documentados." No hagas commit.

Si SÍ encontraste un bug real, NO lo arregles a ciegas: primero escribe un test que lo reproduzca
(usa Vitest; mira `src/utils/calculations.test.js` como ejemplo de estilo), confírmalo en rojo,
arréglalo, confírmalo en verde, y commitea test+fix juntos. Si el bug no es testeable de forma
razonable, documéntalo en el reporte final y consulta antes de tocar.

---

## Task 6: Archivar scripts SQL de un solo uso en supabase/scratch/

**Files:**
- Create: `supabase/scratch/` (carpeta) + `supabase/scratch/README.md`
- Move (git mv): 12 archivos `.sql` de la raíz de `supabase/` a `supabase/scratch/`

Contexto: `supabase/` tiene ~25 `.sql`. `MIGRATIONS.md` documenta las migraciones reales
(idempotentes, parte del flujo de despliegue). Los scripts de diagnóstico/validación/ajuste de un
solo uso (atados a "tu tarjeta", "tu cifra real", o debugging puntual) ensucian la carpeta. Se
mueven a `scratch/` con `git mv` (preserva historial; reversible).

**Clasificación (verificada contra MIGRATIONS.md + cabeceras de los archivos):**

QUEDAN en `supabase/` (migraciones reales / reutilizables — NO mover):
`schema.sql`, `add_card_opening_balance.sql`, `add_card_payments_column.sql`,
`add_profiles_table.sql`, `add_savings_contributions.sql`, `add_savings_horizon.sql`,
`add_tutorial_seen.sql`, `add_vehiculo_categories.sql`, `advisor_fixes.sql`,
`cleanup_duplicate_categories.sql`, `migrate_card_catalog_identity.sql`,
`migrate_expense_to_variable.sql`, `MIGRATIONS.md`.

SE MUEVEN a `supabase/scratch/` (12 archivos — un solo uso / personales / diagnóstico):
`migrate_ccn_card_to_mastercard.sql`, `adjust_card_fine_tune.sql`, `adjust_card_paid_history.sql`,
`set_card_balance_final.sql`, `calc_exact_abono.sql`, `diagnose_card_balances.sql`,
`diagnose_card_balances_v2.sql`, `diagnose_full_picture.sql`, `diagnose_missing_open_cycle.sql`,
`diagnose_open_cycle_transactions.sql`, `validate_migration.sql`, `validate_migration_table.sql`.

- [ ] **Step 1: Confirmar que ningún archivo a mover está referenciado en docs/código**

Run (PowerShell):
```powershell
Select-String -Path README.md,supabase\MIGRATIONS.md,src\**\*.js,src\**\*.jsx -Pattern "migrate_ccn_card_to_mastercard|adjust_card_fine_tune|adjust_card_paid_history|set_card_balance_final|calc_exact_abono|diagnose_|validate_migration"
```
Expected: sin resultados. Si alguno aparece referenciado como migración requerida, NO lo muevas:
sácalo de la lista y anótalo. (No se espera ninguna coincidencia.)

- [ ] **Step 2: Crear la carpeta y su README**

Crea el archivo `supabase/scratch/README.md` con este contenido:

```markdown
# supabase/scratch — scripts históricos de un solo uso

Estos `.sql` **no son parte del esquema ni del flujo de migraciones**. Son scripts
puntuales que se usaron una vez para diagnosticar o ajustar datos de una cuenta
concreta durante el desarrollo (p. ej. cuadrar el saldo real de una tarjeta, migrar
una tarjeta específica, o inspeccionar ciclos). Se conservan por valor histórico.

- **No los corras** en una base nueva ni en producción sin entender exactamente qué
  hacen: varios fijan cifras o identidades específicas de una cuenta real.
- La fuente de verdad del esquema es `../schema.sql`. El orden y las notas de las
  migraciones reales están en `../MIGRATIONS.md`.

Si alguno de estos se vuelve una migración reutilizable, muévelo de vuelta a
`supabase/` y documéntalo en `MIGRATIONS.md`.
```

- [ ] **Step 3: Mover los 12 archivos con git mv**

Run (PowerShell, una sola tanda):
```powershell
git mv supabase/migrate_ccn_card_to_mastercard.sql supabase/scratch/
git mv supabase/adjust_card_fine_tune.sql supabase/scratch/
git mv supabase/adjust_card_paid_history.sql supabase/scratch/
git mv supabase/set_card_balance_final.sql supabase/scratch/
git mv supabase/calc_exact_abono.sql supabase/scratch/
git mv supabase/diagnose_card_balances.sql supabase/scratch/
git mv supabase/diagnose_card_balances_v2.sql supabase/scratch/
git mv supabase/diagnose_full_picture.sql supabase/scratch/
git mv supabase/diagnose_missing_open_cycle.sql supabase/scratch/
git mv supabase/diagnose_open_cycle_transactions.sql supabase/scratch/
git mv supabase/validate_migration.sql supabase/scratch/
git mv supabase/validate_migration_table.sql supabase/scratch/
```

- [ ] **Step 4: Verificar el resultado**

Run (PowerShell): `Get-ChildItem supabase\*.sql | Select-Object -ExpandProperty Name | Sort-Object`
Expected (exactamente estos 12, raíz de supabase/):
```
add_card_opening_balance.sql
add_card_payments_column.sql
add_profiles_table.sql
add_savings_contributions.sql
add_savings_horizon.sql
add_tutorial_seen.sql
add_vehiculo_categories.sql
advisor_fixes.sql
cleanup_duplicate_categories.sql
migrate_card_catalog_identity.sql
migrate_expense_to_variable.sql
schema.sql
```

Run (PowerShell): `Get-ChildItem supabase\scratch\*.sql | Measure-Object | Select-Object -ExpandProperty Count`
Expected: `12`

- [ ] **Step 5: Commit**

```bash
git add -A supabase/
git commit -m "chore(supabase): archiva scripts de un solo uso en scratch/

Mueve 12 scripts de diagnostico/validacion/ajuste puntual (no migraciones)
a supabase/scratch/ con un README que aclara su naturaleza. Las migraciones
reales y schema.sql quedan en la raiz. Reversible (git mv preserva historial).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Reescribir handoff.md (documento de arquitectura vigente)

**Files:**
- Modify (reemplazo total): `handoff.md` (raíz del repo)

Contexto: el `handoff.md` actual abre diciendo que el trabajo vive en `rebuild/stitch-pure`, que NO
debe subir a producción y que `origin/main` es "la app vieja". **Eso es falso hoy:** el rediseño ya
está en `main` y desplegándose en Vercel. Hay que reescribirlo como documento de arquitectura
vigente. Las **14 pautas de diseño** del doc viejo son el activo más valioso: consérvalas
íntegras. Quita el lenguaje de rama temporal y el historial de commits de la rama vieja.

- [ ] **Step 1: Reemplazar TODO el contenido de handoff.md por esto**

```markdown
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
  `screens/vaults/`, `screens/dashboard/`, `screens/reports/`, `screens/calendar/`,
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
- `tourSteps.js` — guión declarativo. **7 pasos** enfocados en el núcleo: bienvenida,
  menú, registrar dinero (la categoría define el tipo), presupuesto por niveles, cuánto
  puedes gastar (integración sin duplicar), todo conectado, cierre.
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
```

- [ ] **Step 2: Commit**

```bash
git add handoff.md
git commit -m "docs(handoff): reescribe como arquitectura vigente (app en produccion)

Elimina la premisa obsoleta de rama temporal 'no subir a produccion' (el
redisenio ya esta en main y desplegado). Conserva las 14 pautas de diseno,
actualiza el sistema de tutorial a 7 pasos y quita el historial de la rama vieja.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Corregir docs/specs/README.md (estado real de features)

**Files:**
- Modify: `docs/specs/README.md` (la tabla "Estado de cada feature" y la prosa cercana)

Contexto: la tabla marca PENDIENTE/PARCIAL features que **ya están entregadas** (verificado contra
`handoff.md` y el código en `screens/`). Lo único realmente pendiente son los sobres acumulativos en
la UI. Hay que actualizar la columna de estado y la nota de "qué falta".

- [ ] **Step 1: Leer el archivo completo para ubicar la tabla y la prosa**

Run: abre `docs/specs/README.md` y localiza la tabla markdown que empieza con
`| Feature | Spec | Lógica/BD | UI Stitch | Qué falta cablear |`.

- [ ] **Step 2: Reemplazar la tabla por esta versión actualizada**

Sustituye la tabla completa (desde la fila de encabezado `| Feature |...` hasta la última fila de
datos, inclusive) por:

```markdown
| Feature | Spec | Estado | Notas |
|---|---|---|---|
| Presupuesto: niveles (Seguimiento / 50-30-20 / Base cero) | `2026-05-28-presupuesto-base-cero-design.md` + `2026-06-niveles-progresivos-design.md` | **HECHO** | `screens/budget/` (BudgetShell + BudgetZero + Budget503020 + BudgetTracking). Preferencia `budgetLevel` en `usePrefsStore`. |
| Sobres acumulativos (sinking funds) | `2026-05-29-sobres-acumulativos-design.md` | **PENDIENTE (UI)** | Lógica lista: `getAccumulatedBalance` + columnas `is_accumulative`/`accumulation_start`. Falta el mini-modal por categoría en `screens/budget/BudgetZero.jsx`. Único pendiente real. |
| Tarjetas de crédito (ciclos, estado, aviso) | `2026-05-29-tarjetas-credito-design.md` | **HECHO** | `screens/cards/`. Aviso de pago próximo en Dashboard; selector de tarjeta en el form de Transacciones. |
| Abonos parciales en tarjetas | `2026-05-31-abonos-parciales-tarjetas-design.md` | **HECHO** | `getCardBalances` (billed/open/paid/prepago/arrastre), modal "Abonar", "Pagar todo", historial. |
| Tarjetas predefinidas + cashback | `2026-05-31-tarjetas-predefinidas-cashback-design.md` | **HECHO** | Catálogo en `src/data/creditCardCatalog.js`, `computeCashback`/`getLifetimeCashback`, editor de reglas, preview de cashback en Transacciones. |
```

- [ ] **Step 3: Ajustar la prosa que contradiga el nuevo estado**

Busca en el mismo archivo cualquier frase que afirme que la lógica está "PENDIENTE de exponer en la
UI" de forma general, o que liste como pendientes las features ya marcadas HECHO arriba. Reescríbela
para reflejar que **casi todo está implementado y expuesto; el único pendiente de UI son los sobres
acumulativos**. No borres la explicación histórica de por qué los specs referencian componentes
viejos (`src/pages/*`) — eso sigue siendo útil contexto.

- [ ] **Step 4: Commit**

```bash
git add docs/specs/README.md
git commit -m "docs(specs): actualiza estado de features al real (casi todo HECHO)

La tabla marcaba PENDIENTE/PARCIAL features ya entregadas (presupuesto por
niveles, tarjetas, abonos parciales, cashback). Unico pendiente real de UI:
sobres acumulativos en Presupuesto base cero.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Sincronizar la memoria del tutorial

**Files:**
- Create: `C:\Users\gianc\.claude\projects\c--Users-gianc-Documents-Proyectos-VScode-budget-tracker\memory\tutorial-tour-system.md`
- Modify: `C:\Users\gianc\.claude\projects\c--Users-gianc-Documents-Proyectos-VScode-budget-tracker\memory\MEMORY.md` (línea del tutorial)

Contexto: `MEMORY.md` indexa `tutorial-tour-system.md`, pero el archivo **no existe** (referencia
rota en la memoria persistente del asistente). Hay que crearlo con el estado correcto y refrescar el
hook del índice. Esta memoria es del asistente, no del repo; **NO se commitea a git** (vive fuera
del working tree, en `~/.claude/...`).

- [ ] **Step 1: Crear el archivo de memoria**

Crea `tutorial-tour-system.md` en la ruta de memoria con este contenido exacto:

```markdown
---
name: tutorial-tour-system
description: Sistema de tutorial/tour guiado de FinTrack — 7 pasos, spotlight propio, anclas data-tour.
metadata:
  type: project
---

El product tour de FinTrack vive en `src/stitch/tour/` (spotlight propio, no driver.js):
`tourSteps.js` (guión declarativo), `TourProvider.jsx` (orquestación + forzar demo si no
hay datos), `Spotlight.jsx` (capa visual en portal), `useTour.js` (hook).

Desde 2026-06-08 el guión tiene **7 pasos** enfocados en el núcleo (lo más difícil de
entender), no 17: bienvenida → menú → registrar dinero (la categoría define el tipo) →
presupuesto por niveles → cuánto puedes gastar (integración sin duplicar) → todo
conectado → cierre. El núcleo priorizado es el flujo del dinero y los niveles de
presupuesto; patrimonio y herramientas se mencionan de pasada.

Cada paso apunta a un `[data-tour="..."]` que ya existe en su pantalla (no crear anclas
nuevas al editar el guión). Auto-arranque la 1ª vez cuando `tutorialSeen === false` y
`prefsLoaded === true` (delay 700ms, en `TourAutoStart` de `StitchShell.jsx`). Si el
usuario no tiene datos, el tour fuerza el modo demo y lo revierte al cerrar. El flag
`tutorial_seen` se persiste en `profiles` (Supabase) con sesión y en caché local en demo.
Accesible siempre desde el menú de cuenta → "Ver tutorial".

Para resumir o reescribir el tour, editar SOLO `tourSteps.js`; el motor (Spotlight) no
cambia. Relacionado: [[stitch-design-conventions]], [[budget-progressive-levels]].
```

- [ ] **Step 2: Actualizar el hook en MEMORY.md**

En `MEMORY.md`, reemplaza la línea del tutorial:
```
- [Sistema de tutorial/tour](tutorial-tour-system.md) — product tour con spotlight propio en src/stitch/tour/; anclas data-tour, fuerza demo si no hay datos, flag tutorial_seen.
```
por:
```
- [Sistema de tutorial/tour](tutorial-tour-system.md) — product tour de 7 pasos (nucleo: flujo del dinero + niveles); spotlight propio en src/stitch/tour/; editar solo tourSteps.js.
```

- [ ] **Step 3: Verificar (no hay commit — la memoria está fuera de git)**

Confirma que el archivo existe:
Run (PowerShell): `Test-Path "$env:USERPROFILE\.claude\projects\c--Users-gianc-Documents-Proyectos-VScode-budget-tracker\memory\tutorial-tour-system.md"`
Expected: `True`

No hagas `git add` de estos archivos (no pertenecen al repo).

---

## Task 10: Verificación final completa

**Files:** ninguno (solo ejecución y reporte).

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: sin errores listados.

- [ ] **Step 2: Tests**

Run: `npm run test`
Expected: PASS, mismo número que en la verificación base (126 o el que anotaste). Si cambió, explica
por qué.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build limpio, sin errores.

- [ ] **Step 4: Dev server responde**

Run (background): `npm run dev`
Run: abre http://localhost:5173 y confirma que responde 200 (la landing o la app cargan). Detén el
server.

- [ ] **Step 5: Revisar el árbol de commits de la rama**

Run: `git log --oneline main..HEAD`
Expected: ves los commits de las tareas 1–8 (Task 9 no commitea; Task 5 puede no tener commit). El
spec (commit `04eace6`) también está. Algo como:
```
<hash> docs(specs): actualiza estado de features al real ...
<hash> docs(handoff): reescribe como arquitectura vigente ...
<hash> chore(supabase): archiva scripts de un solo uso en scratch/ ...
<hash> docs(codigo): actualiza comentarios ...        (si hubo cambios en Task 4)
<hash> style(prefs): normaliza indentacion del bloque persist ...
<hash> refactor(cuenta): elimina ternario redundante ...
<hash> feat(tutorial): tour de 7 pasos enfocado en el nucleo ...
<hash> docs(specs): diseño de tutorial resumido (7 pasos) + limpieza ...
```

- [ ] **Step 6: Reporte final al usuario**

Escribe un resumen honesto: qué se hizo (tour 17→7, docs reescritas, SQL archivado, nits), los
resultados REALES de lint/build/test (con números), el veredicto de la auditoría de bugs (Task 5),
y los pendientes que NO entran en este trabajo (sobres acumulativos en UI; validación visual del
tour en QA manual; correr a mano las migraciones `add_savings_contributions.sql` /
`add_savings_horizon.sql` / `add_tutorial_seen.sql` en Supabase si aún no se hizo). NO declares nada
"verificado" sin haber visto la salida verde.

- [ ] **Step 7: Preguntar por integración**

Pregunta al usuario si quiere abrir un PR o fusionar a `main` (recuerda: push/merge solo con orden
explícita). Si dice que sí, usa la skill `superpowers:finishing-a-development-branch`.

---

## Notas finales para quien ejecuta

- **Orden recomendado:** Task 1 (lo más importante) → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Las tareas
  son mayormente independientes; si una se complica, puedes reordenar, pero deja la verificación
  final (Task 10) para el final.
- **Si algo no coincide** con lo que describe el plan (un archivo cambió, una línea no está donde se
  dice), NO fuerces el cambio: investiga con `git log`/`Select-String`, y si hay duda real, para y
  pregunta. El plan se escribió contra el estado de la rama `chore/tutorial-resumido-y-limpieza` en
  el commit `04eace6`.
- **No reintroduzcas** los 17 pasos viejos ni crees anclas `data-tour` nuevas: el spec lo marca
  fuera de alcance.
- **No borres** SQL (solo se mueven a scratch). **No hagas** refactors de código que funcione.
```

